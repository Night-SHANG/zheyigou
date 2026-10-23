"""Standard-library launcher. Paths with spaces are supported."""
import functools, http.server, pathlib, socketserver, threading, webbrowser
ROOT=pathlib.Path(__file__).resolve().parent.parent
handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT))
with socketserver.TCPServer(('127.0.0.1',0),handler) as server:
    url=f'http://127.0.0.1:{server.server_address[1]}/'
    print('Game is ready:',url,flush=True)
    threading.Timer(.5,lambda:webbrowser.open(url)).start()
    try:server.serve_forever()
    except KeyboardInterrupt:pass
