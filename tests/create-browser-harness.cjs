const fs=require('node:fs'), path=require('node:path');
const manifest=require('../manifest.json'),fixtures=require('./fixtures.cjs');
const stub=`window.settings={provider:'mock',tier:'free',enabled:true,showFloatingButton:true};
window.chrome={runtime:{id:'fixture',onMessage:{addListener(){}},sendMessage(){}},storage:{local:{async get(){return {...window.settings}},async set(v){Object.assign(window.settings,v)}},onChanged:{addListener(){}}}};`;
fs.writeFileSync(path.join(__dirname,'browser.html'),`<!doctype html><meta charset="utf-8"><title>WriteFlow fixture suite</title>
<style>body{font:15px system-ui;margin:24px}#fixture{position:fixed;top:20px;right:20px;width:440px;background:#eee;padding:20px}textarea,[contenteditable]{width:380px;min-height:80px}shreddit-post,shreddit-comment,ytd-watch-flexy,ytd-comment-renderer{display:block}pre{max-width:850px;white-space:pre-wrap}</style>
<h1>Running WriteFlow tests</h1><pre id="results"></pre><div id="fixture"></div><script>${stub}window.fixtureContracts=${JSON.stringify(fixtures)}</script>
${manifest.content_scripts[0].js.map(file=>`<script src="../${file}"></script>`).join('')}<script src="../services/license.js"></script>
<script src="browser-runner.js"></script>`);
