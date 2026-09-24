from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
os.chdir(Path(__file__).resolve().parents[1])
class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/test-results':
            self.send_error(404)
            return
        data = self.rfile.read(min(int(self.headers['Content-Length']), 1000000))
        Path('tests/browser-results.json').write_bytes(data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'OK')
print('Local fixtures: http://127.0.0.1:8765/tests/browser.html', flush=True)
ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
