const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const root = path.resolve(process.argv[2] || '.publish');
const errors = [], files = [];
let references = 0, scripts = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(name);
    else if (entry.isFile()) files.push(name);
  }
}
function checkReference(value, source) {
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return;
  const raw = value.split(/[?#]/)[0];
  if (!raw || raw.startsWith('/.netlify/functions/') || /^\/(?:sinav|okuma)\//.test(raw)) return;
  references++;
  const name = path.resolve(raw.startsWith('/') ? root : path.dirname(source), '.' + (raw.startsWith('/') ? raw : '/' + raw));
  let resolved;
  try { resolved = decodeURIComponent(name); } catch (_) { resolved = name; }
  const exists = [resolved, resolved + '.html', path.join(resolved, 'index.html')].some(f => fs.existsSync(f));
  if (!exists && raw !== '/ads.txt' && raw !== '/akilli-tahtam') errors.push(path.relative(root, source) + ': missing ' + value);
}
function parseScript(source, file, module = false) {
  scripts++;
  try {
    if (module) new vm.SourceTextModule(source, { identifier: file });
    else new vm.Script(source, { filename: file });
  } catch (error) { errors.push(file + ': ' + error.message); }
}
walk(root);
for (const file of files) {
  if (/\.(?:html|css|[cm]?js)$/.test(file)) {
    const source = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.html')) {
      const { document } = parseHTML(source);
      for (const node of document.querySelectorAll('script[src],link[href],img[src],audio[src],video[src],source[src],iframe[src],a[href]')) {
        checkReference(node.getAttribute('src') || node.getAttribute('href'), file);
      }
      for (const [i, node] of Array.from(document.querySelectorAll('script:not([src])')).entries()) {
        if (!node.type || /^(?:module|text\/javascript|application\/javascript)$/.test(node.type)) parseScript(node.textContent, path.relative(root, file) + ':inline-' + i, node.type === 'module');
      }
    } else if (file.endsWith('.css')) {
      for (const match of source.matchAll(/url\(\s*['"]?([^\s)'";]+)['"]?\s*\)/g)) checkReference(match[1], file);
    } else {
      const module = file.endsWith('.mjs') || /^(?:import|export)\s/m.test(source) || /\bimport\.meta\b/.test(source);
      parseScript(source, path.relative(root, file), module);
    }
  }
  if (/\.(?:sql|log|zip|command|env)$/.test(file) || /\/(?:node_modules|mobile-app|aquarium-app|tests|docs|scripts|\.git)\//.test(path.relative(root, file))) errors.push('Non-public file: ' + file);
}
console.log(JSON.stringify({ files: files.length, references, scripts, errors }, null, 2));
if (errors.length) process.exitCode = 1;
