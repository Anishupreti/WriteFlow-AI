const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
for (const dir of ['content','services','popup','options','background']) {
  for (const file of fs.readdirSync(path.join(root,dir)).filter(x => x.endsWith('.js'))) {
    new vm.Script(fs.readFileSync(path.join(root,dir,file),'utf8'), { filename: `${dir}/${file}` });
  }
}
for (const file of [...manifest.content_scripts[0].js, manifest.background.service_worker, manifest.action.default_popup, manifest.options_page, ...Object.values(manifest.icons)]) {
  if (!fs.existsSync(path.join(root,file))) throw new Error('Missing packaged file: '+file);
}
const popup = fs.readFileSync(path.join(root,'popup/popup.js'),'utf8');
const files = JSON.parse(popup.match(/const CONTENT_SCRIPT_FILES = (\[[\s\S]*?\]);/)[1]);
if (JSON.stringify(files) !== JSON.stringify(manifest.content_scripts[0].js)) throw new Error('Dynamic script order differs');
if (manifest.version !== require('../package.json').version) throw new Error('Version mismatch');
console.log('PASS: JavaScript syntax, manifest assets, script registration order, version');
