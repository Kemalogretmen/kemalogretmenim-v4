/* Build an explicit public directory: Git-based Netlify builds don't apply
   the CLI's .netlifyignore when publishing the repository root. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.publish');
const excluded = new Set([
  'node_modules', 'mobile-app', 'aquarium-app', 'tmp', 'docs', 'tests',
  'tools', 'scripts', 'netlify', 'supabase', 'downloads',
  'assets.zip', 'js.zip', 'siteyi-yerelde-calistir.command', 'vscode-ile-ac.command',
  'package.json', 'package-lock.json', 'netlify.toml', 'KURULUM.md', 'firebase.json', 'capacitor.config.json'
]);
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
let files = 0;
function copy(from, to, top = false) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || (top && excluded.has(entry.name)) || /\.(sql|command|log|zip)$/i.test(entry.name)) continue;
    const source = path.join(from, entry.name), target = path.join(to, entry.name);
    if (entry.isDirectory()) { fs.mkdirSync(target, { recursive: true }); copy(source, target); }
    else if (entry.isFile()) { fs.copyFileSync(source, target); files++; }
  }
}
copy(root, output, true);
if (!fs.existsSync(path.join(output, 'index.html'))) throw new Error('Missing homepage');
console.log('Public web build ready: ' + files + ' files');
