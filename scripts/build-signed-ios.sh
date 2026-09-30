#!/usr/bin/env bash
set -euo pipefail
for key in IOS_CERTIFICATE_BASE64 IOS_CERTIFICATE_PASSWORD IOS_PROFILE_BASE64 IOS_TEAM_ID KEYCHAIN_PASSWORD; do
  if [ -z "${!key:-}" ]; then echo "::error::Missing GitHub Actions secret: $key. No installable IPA can be created without Apple signing."; exit 1; fi
done
printf '%s' "$IOS_CERTIFICATE_BASE64" | base64 --decode > "$RUNNER_TEMP/signing.p12"
printf '%s' "$IOS_PROFILE_BASE64" | base64 --decode > "$RUNNER_TEMP/profile.mobileprovision"
security create-keychain -p "$KEYCHAIN_PASSWORD" "$RUNNER_TEMP/whiteout-signing.keychain-db"
security set-keychain-settings -lut 21600 "$RUNNER_TEMP/whiteout-signing.keychain-db"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$RUNNER_TEMP/whiteout-signing.keychain-db"
security import "$RUNNER_TEMP/signing.p12" -P "$IOS_CERTIFICATE_PASSWORD" -A -t cert -f pkcs12 -k "$RUNNER_TEMP/whiteout-signing.keychain-db"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$RUNNER_TEMP/whiteout-signing.keychain-db"
security list-keychains -d user -s "$RUNNER_TEMP/whiteout-signing.keychain-db"
security cms -D -i "$RUNNER_TEMP/profile.mobileprovision" > "$RUNNER_TEMP/profile.plist"
UUID=$(/usr/libexec/PlistBuddy -c 'Print UUID' "$RUNNER_TEMP/profile.plist")
NAME=$(/usr/libexec/PlistBuddy -c 'Print Name' "$RUNNER_TEMP/profile.plist")
mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
cp "$RUNNER_TEMP/profile.mobileprovision" "$HOME/Library/MobileDevice/Provisioning Profiles/$UUID.mobileprovision"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -archivePath build/Whiteout.xcarchive DEVELOPMENT_TEAM="$IOS_TEAM_ID" CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY='Apple Distribution' PROVISIONING_PROFILE_SPECIFIER="$NAME" archive
EXPORT_METHOD=ad-hoc
xcodebuild -help > "$RUNNER_TEMP/xcode-help.txt" 2>&1 || true
if grep -q 'release-testing' "$RUNNER_TEMP/xcode-help.txt"; then EXPORT_METHOD=release-testing; fi
python3 scripts/export-options.py "$IOS_TEAM_ID" "$NAME" build/ExportOptions.plist "$EXPORT_METHOD"
xcodebuild -exportArchive -archivePath build/Whiteout.xcarchive -exportPath build/signed -exportOptionsPlist build/ExportOptions.plist
