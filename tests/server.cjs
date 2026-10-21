// Local range-capable static server for isolated browser tests.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
module.exports = root => {
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.avif':'image/avif', '.webp':'image/webp', '.jpg':'image/jpeg', '.mp3':'audio/mpeg', '.wav':'audio/wav' };
return http.createServer((req, res) => {
  const uri = new URL(req.url, 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(uri.pathname));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  let target = file;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    if (!uri.pathname.endsWith('/')) { res.writeHead(301, { Location:uri.pathname+'/'+uri.search }).end(); return; }
    target = path.join(target, 'index.html');
  }
  if (!fs.existsSync(target)) { res.writeHead(404).end('Not found'); return; }
  const size=fs.statSync(target).size;
  res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Accept-Ranges','bytes');
  const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
  if (range) {
    const start=Number(range[1]),end=Math.min(size-1,range[2]?Number(range[2]):size-1);
    res.writeHead(206, {'Content-Range':`bytes ${start}-${end}/${size}`, 'Content-Length':end-start+1});
    fs.createReadStream(target,{start,end}).pipe(res);
  } else { res.setHeader('Content-Length',size); fs.createReadStream(target).pipe(res); }
});
};
