const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const origin = process.argv[2];
const root = path.resolve(process.argv[3] || '.publish');
if (!origin || new URL(origin).protocol !== 'https:') throw Error('An HTTPS production origin is required');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile()) files.push(file);
  }
}
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function response(route, method = 'GET') {
  let last;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await fetch(new URL(route, origin), { method, signal: AbortSignal.timeout(20000) });
      if (result.status >= 500 && !attempt) continue;
      return result;
    } catch (error) { last = error; }
  }
  throw last;
}
(async () => {
  walk(root);
  let next = 0, checked = 0;
  const errors = [];
  // Bounded concurrency avoids overloading the origin or the local connection.
  async function worker() {
    while (next < files.length) {
      const file = files[next++], route = '/' + path.relative(root, file).split(path.sep).map(encodeURIComponent).join('/');
      try {
        const res = await response(route, 'HEAD');
        if (res.status !== 200) errors.push({ route, status: res.status });
        const type = res.headers.get('content-type') || '';
        if (/\.m?js$/.test(route) && !/javascript/.test(type)) errors.push({ route, type });
        if (/\.css$/.test(route) && !/text\/css/.test(type)) errors.push({ route, type });
        if (/\.wasm$/.test(route) && !/application\/wasm/.test(type)) errors.push({ route, type });
        checked++;
      } catch (error) { errors.push({ route, error: error.message }); }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  const critical = [
    'js/home-release.js', 'css/site-release-notes.css', 'js/site-release-notes.js',
    'js/smartboard-icons.js', 'js/smartboard-pdf.js', 'js/smartboard-pdf-views.js',
    'js/smartboard-pdf-interactions.js', 'js/smartboard-pdf-writer.js',
    'css/smartboard-pdf.css', 'css/smartboard-pdf-reading.css',
    'ogretmen/smartboard-offline-sw.js', 'ogretmen/smartboard-offline-assets.js',
    'vendor/smartboard-pdf/pdf.min.mjs', 'vendor/smartboard-pdf/pdf.worker.min.mjs',
    'js/hucre-laboratuvari.js', 'css/poster-yazici.css'
  ];
  for (const file of critical) {
    const res = await response('/' + file);
    if (res.status !== 200 || hash(Buffer.from(await res.arrayBuffer())) !== hash(fs.readFileSync(path.join(root, file)))) errors.push({ route: file, error: 'Release content mismatch' });
  }
  const home = await (await response('/')).text();
  if (!home.includes('home-release.js?v=20261124-release')) errors.push({ route: '/', error: 'Homepage version not published' });
  const ads = await response('/ads.txt');
  if (ads.status !== 200 || !/^google\.com, pub-\d{16}, DIRECT, f08c47fec0942fa0\s*$/.test(await ads.text())) errors.push({ route: '/ads.txt', error: 'Verification function unavailable' });
  console.log(JSON.stringify({ origin, files: files.length, checked, verifiedChecksums: critical.length, errors }, null, 2));
  if (errors.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
