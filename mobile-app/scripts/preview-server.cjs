const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const directory = path.resolve(__dirname, '../dist');
const port = 8884;
if (!fs.existsSync(path.join(directory, 'index.html'))) {
  console.error('Önce npm run build:web komutunu çalıştırın.');
  process.exit(1);
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); }
  catch { response.writeHead(400).end(); return; }
  let file = path.resolve(directory, '.' + pathname);
  if (file !== directory && !file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
  if (file === directory) file = path.join(directory, 'index.html');
  if (!fs.existsSync(file) && !path.extname(file)) file = path.join(directory, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404).end(); return; }
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  if (request.method === 'HEAD') response.end();
  else fs.createReadStream(file).pipe(response);
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? '8884 portu kullanımda. Önizleme zaten açık olabilir.' : error.message); process.exit(1); });
server.listen(port, '127.0.0.1', () => console.log('Önizleme hazır: http://127.0.0.1:8884/today\nKapatmak için Ctrl+C.'));
