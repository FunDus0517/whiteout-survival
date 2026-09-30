"""Static local preview; no third party dependency."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import socket
import functools

ROOT = Path(__file__).resolve().parent
PORT = 8765

if __name__ == '__main__':
    print('余烬 WHITEOUT')
    print(f'电脑打开：http://localhost:{PORT}')
    try:
        addresses = socket.gethostbyname_ex(socket.gethostname())[2]
        for address in addresses:
            if not address.startswith('127.'):
                print(f'同 Wi-Fi 手机可尝试：http://{address}:{PORT}')
    except OSError:
        pass
    print('保持窗口运行；关闭窗口即停止。按 Ctrl+C 停止。')
    handler = functools.partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    try:
        ThreadingHTTPServer(('0.0.0.0', PORT), handler).serve_forever()
    except KeyboardInterrupt:
        print('\n已停止。')
    except OSError as error:
        print(f'无法启动：{error}。可直接双击 index.html 游玩。')
