#!/usr/bin/env python3
"""Package a device App.app (or its ditto ZIP) as an unsigned, re-signable IPA."""
import argparse
import copy
import json
import os
from pathlib import Path, PurePosixPath
import plistlib
import stat
import struct
import zipfile


def check_macho(binary):
    if len(binary) < 32 or binary[:4] != b"\xcf\xfa\xed\xfe" or struct.unpack_from("<I", binary, 4)[0] != 0x0100000C:
        raise ValueError("Expected an arm64 Mach-O device executable.")
    cursor = 32
    device = False
    for _ in range(struct.unpack_from("<I", binary, 16)[0]):
        command, size = struct.unpack_from("<II", binary, cursor)
        if size < 8 or cursor + size > len(binary):
            raise ValueError("Invalid Mach-O load command.")
        if command == 0x32:
            device = struct.unpack_from("<I", binary, cursor + 8)[0] == 2
        if command in (0x21, 0x2C) and struct.unpack_from("<I", binary, cursor + 16)[0] != 0:
            raise ValueError("Encrypted binaries cannot be re-signed by this packaging flow.")
        cursor += size
    if not device:
        raise ValueError("Expected iOS device platform, not an arm64 simulator build.")


def check_app(read, names, prefix):
    info = plistlib.loads(read(prefix + "Info.plist"))
    if info.get("CFBundleSupportedPlatforms") != ["iPhoneOS"]:
        raise ValueError("An iPhoneOS device build is required; simulator builds cannot be installed.")
    executable = info["CFBundleExecutable"]
    if "/" in executable or "\\" in executable:
        raise ValueError("Invalid bundle executable name.")
    check_macho(read(prefix + executable))
    for name in names:
        if name.startswith(prefix + "Frameworks/") and name.endswith(".framework/Info.plist"):
            framework = plistlib.loads(read(name))
            check_macho(read(name[:-len("Info.plist")] + framework["CFBundleExecutable"]))
    for required in ("public/index.html", "public/arena-model.js", "public/assets/icon.png"):
        if prefix + required not in names:
            raise ValueError("Missing bundled game resource: " + required)
    return info


def package(source, output):
    output.parent.mkdir(parents=True, exist_ok=True)
    if source.is_dir():
        if source.suffix != ".app":
            raise ValueError("Input must be an App.app directory or a ZIP containing it.")
        entries = sorted(source.rglob("*"))
        names = {p.relative_to(source).as_posix() for p in entries}
        info = check_app(lambda name: (source / name).read_bytes(), names, "")
        root = "Payload/" + source.name + "/"
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as target:
            for path in entries:
                name = root + path.relative_to(source).as_posix()
                if path.is_symlink():
                    entry = zipfile.ZipInfo(name)
                    entry.create_system = 3
                    entry.external_attr = path.lstat().st_mode << 16
                    target.writestr(entry, os.readlink(path).encode(), zipfile.ZIP_DEFLATED)
                else:
                    target.write(path, name)
    else:
        with zipfile.ZipFile(source) as original:
            entries = [e for e in original.infolist() if not e.filename.startswith("__MACOSX/")]
            names = {e.filename for e in entries}
            roots = {PurePosixPath(n).parts[0] for n in names if n.endswith(".app/Info.plist")}
            if len(roots) != 1:
                raise ValueError("Expected exactly one top-level App.app in the archive.")
            root = roots.pop()
            prefix = root + "/"
            info = check_app(original.read, names, prefix)
            with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as target:
                for entry in entries:
                    parts = PurePosixPath(entry.filename).parts
                    if ".." in parts or entry.filename.startswith("/"):
                        raise ValueError("Invalid archive path.")
                    if entry.filename != root and not entry.filename.startswith(prefix):
                        continue
                    renamed = copy.copy(entry)
                    renamed.filename = "Payload/" + entry.filename
                    target.writestr(renamed, original.read(entry), zipfile.ZIP_DEFLATED)
    with zipfile.ZipFile(output) as ipa:
        if ipa.testzip() is not None:
            raise ValueError("IPA archive integrity check failed.")
        root = next(n[:-len("Info.plist")] for n in ipa.namelist() if n.endswith(".app/Info.plist"))
        check_app(ipa.read, set(ipa.namelist()), root)
        mode = ipa.getinfo(root + info["CFBundleExecutable"]).external_attr >> 16
        if not mode & stat.S_IXUSR:
            raise ValueError("Bundle executable permissions were lost.")
    print(json.dumps({"file": str(output), "bytes": output.stat().st_size,
                      "bundleId": info["CFBundleIdentifier"],
                      "version": info["CFBundleShortVersionString"],
                      "architecture": "arm64", "platform": "iPhoneOS", "signed": False}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.output.suffix != ".ipa":
        parser.error("Output must have the .ipa extension.")
    package(args.source, args.output)
