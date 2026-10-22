"""Prévia local com suporte a HTTP Range para o vídeo. python3 serve.py"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os,re
ROOT=Path(__file__).resolve().parent
DIST=ROOT/'dist'
if not DIST.exists():
    raise SystemExit('Execute python3 build.py antes da prévia.')
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(DIST),**kwargs)
    def send_head(self):
        path=self.translate_path(self.path)
        if os.path.isfile(path) and self.headers.get('Range'):
            size=os.path.getsize(path)
            match=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers['Range'])
            if match:
                start=int(match[1]);end=min(int(match[2]) if match[2] else size-1,size-1)
                if start>=size or end<start:
                    self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.end_headers();return None
                file=open(path,'rb');file.seek(start)
                self.send_response(206);self.send_header('Content-Type',self.guess_type(path));self.send_header('Accept-Ranges','bytes');self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Content-Length',str(end-start+1));self.end_headers();self.remaining=end-start+1;return file
        self.remaining=None
        return super().send_head()
    def copyfile(self,source,outputfile):
        if self.remaining is None:return super().copyfile(source,outputfile)
        remaining=self.remaining
        while remaining:
            block=source.read(min(65536,remaining))
            if not block:break
            outputfile.write(block);remaining-=len(block)
print('Prévia do pacote de publicação: http://localhost:8080')
ThreadingHTTPServer(('127.0.0.1',8080),Handler).serve_forever()
