const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const repo = path.resolve(__dirname, '../..');
const inputs = new Map();
function read(file) {
  const data = fs.readFileSync(path.join(repo, file));
  inputs.set(file, crypto.createHash('sha256').update(data).digest('hex'));
  return data;
}
const mime = { '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };
const dataUrls = new Map();
function dataUrl(file) {
  if (!dataUrls.has(file)) dataUrls.set(file, `data:${mime[path.extname(file)] || 'application/octet-stream'};base64,${read(file).toString('base64')}`);
  return dataUrls.get(file);
}
function assetPath(url, source) {
  const clean = url.split(/[?#]/)[0];
  if (/^(?:[a-z]+:|\/\/|#)/i.test(clean)) throw new Error('Unexpected external agenda asset: ' + url);
  const file = clean.startsWith('/') ? clean.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(source), clean));
  if (file.startsWith('../') || path.isAbsolute(file)) throw new Error('Agenda asset escapes repository: ' + url);
  return file;
}
function inlineCss(css, source) {
  return css.replace(/url\(["']?assets\/ogretmen-ajandasi-hero\.png["']?\)/g, 'none').replace(/@import\s+(?:url\([^)]*\)|['"][^'"]+['"])[^;]*;/gi, '')
    .replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g, (all, quote, url) => /^(?:data:|blob:|#)/i.test(url) ? all : `url("${dataUrl(assetPath(url, source))}")`);
}
const escapeScript = js => js.replace(/<\/script/gi, '<\\/script');
const inlineScript = (js, attr = '') => `<script${attr}>${escapeScript(js)}</script>`;
const htmlAttribute = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inheritedOrigin = js => js.replace(/window\.location\.origin/g, '(window.origin || window.location.origin)');
const strippedScripts = new Set(['js/site-theme.js', 'js/site.js', 'js/site-data.js', 'js/user-auth.js', 'js/user-config.js']);
const cdnScripts = new Map([
  ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'mobile-app/vendor/agenda/xlsx.full.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'ogretmen-ajandasi/vendor/html2canvas.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'mobile-app/vendor/agenda/jspdf.umd.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'mobile-app/vendor/agenda/jszip.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', 'mobile-app/vendor/agenda/mammoth.browser.min.js'],
]);
function bundle(file) {
  let html = read(file).toString('utf8');
  if (file.endsWith('/ders-programi.html')) html = html
    .replace('Yüklediğiniz planlar tarayıcıya kaydedilir.', 'Planların bu cihazda korunur ve öğretmen hesabınla buluta eşitlenir.')
    .replace('Dosyayı buraya sürükleyin', 'Dosya seçin');
  const scope = file.endsWith('/ders-programi.html') ? 'CHILD' : 'PARENT';
  html = html.replace('<head>', `<head><!--KEMAL_${scope}_HEAD_START-->`).replace('</head>', `<!--KEMAL_${scope}_HEAD_END--></head>`);
  const bodyEnd = html.lastIndexOf('</body>');
  if (bodyEnd < 0) throw new Error('Agenda document has no body');
  html = html.slice(0, bodyEnd) + `<!--KEMAL_${scope}_BODY_END-->` + html.slice(bodyEnd);
  if (scope === 'PARENT') html = html.replace('<body>', '<body data-kemal-shortcut-dock="off">');
  // Protect both external and inline scripts before parsing CSS/img markup. Vendor
  // libraries contain HTML strings which must not be mistaken for document tags.
  const scripts = [];
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (all, attributes, js) => {
    const match = /\bsrc="([^"]+)"/i.exec(attributes);
    if (match) {
      const url = match[1];
      const resolved = cdnScripts.get(url) || assetPath(url, file);
      const source = ({ 'ogretmen-ajandasi/vendor/xlsx.full.min.js': 'mobile-app/vendor/agenda/xlsx.full.min.js', 'ogretmen-ajandasi/vendor/jspdf.umd.min.js': 'mobile-app/vendor/agenda/jspdf.umd.min.js' })[resolved] || resolved;
      if (strippedScripts.has(source)) return '';
      if (!['js/platform-icons.js', 'ogretmen-ajandasi/app.js', 'ogretmen-ajandasi/resmi-tatiller-veri.js', 'ogretmen-ajandasi/resmi-tatiller.js', ...cdnScripts.values()].includes(source)) throw new Error('Unexpected agenda script: ' + url);
      const shared = { 'mobile-app/vendor/agenda/xlsx.full.min.js': 'XLSX', 'ogretmen-ajandasi/vendor/html2canvas.min.js': 'html2canvas', 'mobile-app/vendor/agenda/jspdf.umd.min.js': 'jspdf' }[source];
      scripts.push(file.endsWith('/ders-programi.html') && shared
        ? inlineScript(`window.${shared}=window.parent.${shared};`, ` data-kemal-shared-vendor="${shared}"`)
        : inlineScript(inheritedOrigin(read(source).toString('utf8')), ` data-kemal-source="${source}"`));
    } else scripts.push(inlineScript(inheritedOrigin(js), attributes));
    return `<!--KEMAL_SCRIPT_${scripts.length - 1}-->`;
  });
  html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/gi, (all, url) => {
    const source = assetPath(url, file);
    if (['css/style.css', 'css/shortcut-dock.css', 'css/theme-control.css'].includes(source)) return '';
    return `<style data-kemal-source="${source}">${inlineCss(read(source).toString('utf8'), source)}</style>`;
  });
  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (all, attributes, css) => `<style${attributes}>${inlineCss(css, file)}</style>`);
  html = html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/gi, (all, before, url, after) => before + dataUrl(assetPath(url, file)) + after);
  html = html.replace(/<link\b[^>]*\brel="(?:icon|preconnect|dns-prefetch)"[^>]*>/gi, '');
  if (/<script\b[^>]+\bsrc=|<link\b[^>]+\brel="stylesheet"|@import\s/i.test(html)) throw new Error('Agenda has an unbundled dependency: ' + file);
  html = html.replace(/<!--KEMAL_SCRIPT_(\d+)-->/g, (all, index) => scripts[Number(index)]);
  return html;
}

let planner = bundle('ogretmen-ajandasi/ders-programi.html');
planner = planner.replace('<!--KEMAL_CHILD_HEAD_END-->', '<style data-kemal-mobile-planner>' + read('mobile-app/vendor/agenda/planner-mobile.css').toString('utf8') + '</style>');
planner = planner.replace('<!--KEMAL_CHILD_BODY_END-->', inlineScript(read('mobile-app/vendor/agenda/planner-mobile.js').toString('utf8'), ' data-kemal-mobile-planner'));
// srcdoc inherits its parent's storage/security origin. Copy only document UI
// metadata; credentials and the auth adapter stay in the trusted parent bootstrap.
planner = planner.replace('<!--KEMAL_CHILD_HEAD_START-->', inlineScript(`(function(){try{var root=window.parent.document;var meta=root.querySelector('meta[name="kemal-native-agenda"]');if(meta){var copy=document.createElement('meta');copy.name=meta.name;copy.content=meta.content;document.head.appendChild(copy);}document.documentElement.classList.add('kemal-native');document.documentElement.dataset.kemalNativeModule='teacher-agenda';var activityPath=root.documentElement.dataset.kemalActivityPath||'';var queryAt=activityPath.indexOf('?');document.documentElement.dataset.kemalActivityPath='/ogretmen-ajandasi/ders-programi.html'+(queryAt<0?'':activityPath.slice(queryAt));document.documentElement.dataset.theme=root.documentElement.dataset.theme||'light';}catch(error){}})();`, ' data-kemal-agenda-child-bootstrap'));

let html = bundle('ogretmen-ajandasi/index.html');
let frameCount = 0;
html = html.replace(/(<iframe\b[^>]*\bid="lessonPlannerFrame"[^>]*?)\bsrc="ders-programi.html"/g, (all, before) => {
  frameCount++;
  return before + `srcdoc="${htmlAttribute(planner)}"`;
});
if (frameCount !== 1) throw new Error('Expected exactly one bundled lesson planner frame');
const supabaseSource = fs.existsSync(path.join(repo, 'mobile-app/node_modules/@supabase/supabase-js/dist/umd/supabase.js'))
  ? 'mobile-app/node_modules/@supabase/supabase-js/dist/umd/supabase.js' : 'js/vendor/supabase-2.118.0.min.js';
html = html.replace('<!--KEMAL_PARENT_HEAD_START-->', inlineScript(read(supabaseSource).toString('utf8'), ' data-kemal-source="supabase"') + '<script data-kemal-agenda-bootstrap>__KEMAL_AGENDA_BOOTSTRAP__</script>');
html = html.replace('<!--KEMAL_PARENT_HEAD_END-->', '<style data-kemal-agenda-shell>' + read('mobile-app/vendor/agenda/agenda-mobile.css').toString('utf8') + '</style>');
const licenses = ['jszip', 'mammoth', 'xlsx', 'jspdf'].map(name => `<template data-kemal-third-party-license="${name}">${htmlAttribute(read('mobile-app/vendor/agenda/' + name + '-LICENSE').toString('utf8'))}</template>`).join('');
html = html.replace('<!--KEMAL_PARENT_BODY_END-->', licenses);
if (require('../node_modules/linkedom').parseHTML(html).document.querySelector('iframe[src]')) throw new Error('Agenda contains a remote frame');
const output = '// Generated by scripts/build-agenda.cjs; do not edit.\n'
  + 'export const agendaDocumentSource = ' + JSON.stringify(html) + ';\n'
  + 'export const agendaInputHashes = ' + JSON.stringify(Object.fromEntries([...inputs].sort())) + ';\n';
const destination = path.join(repo, 'mobile-app/src/platform/agendaDocumentSource.ts');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output) throw new Error('Run npm run agenda:generate');
} else fs.writeFileSync(destination, output);
console.log(`Bundled agenda: ${Math.round(Buffer.byteLength(html) / 1024)} KB, ${inputs.size} source assets`);
