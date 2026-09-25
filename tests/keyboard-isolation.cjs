// Host pages such as Facebook run document-level keyboard shortcuts that
// cancel single-key presses (or pull focus into their own composer) when
// document.activeElement is not an input. Inside WriteFlow's Shadow DOM the
// page only sees the shadow host <div>, so without isolation those handlers
// swallow letters typed into WriteFlow's own inputs.
const {chromium}=require('playwright');const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','manifest.json'),'utf8'));
const page_html=`<!doctype html><meta charset="utf-8"><body>
<textarea id="composer" style="width:400px;height:80px;margin:120px 40px">Draft about the launch</textarea>
<div id="page-composer" contenteditable="true" style="width:300px;height:40px;margin:40px"></div>
<script>
window.settings={provider:'mock',tier:'pro',onboardingComplete:true,hasSeenWelcome:true};
window.chrome={runtime:{id:'fixture',onMessage:{addListener(){}},sendMessage(){}},storage:{local:{async get(){return {...window.settings}},async set(v){Object.assign(window.settings,v)}},onChanged:{addListener(){}}}};
window.hijacked=[];
// Facebook-style shortcut layer: single printable keys outside an editable
// are shortcuts; the page cancels them and pulls focus to its composer.
document.addEventListener('keydown',e=>{
  const a=document.activeElement;const editable=a&&(a.matches('input,textarea')||a.isContentEditable);
  if(editable||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key.length===1||e.key==='ArrowUp'||e.key==='ArrowDown'){window.hijacked.push(e.key);e.preventDefault();}
});
document.addEventListener('keypress',e=>{const a=document.activeElement;if(!(a.matches('input,textarea')||a.isContentEditable))e.preventDefault();});
</script>
${manifest.content_scripts[0].js.map(f=>`<script src="/${f}"></script>`).join('')}`;
(async()=>{const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/fixture.html'){res.setHeader('Content-Type','text/html');res.end(page_html);return;}const f=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(f));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/fixture.html`);await page.waitForFunction(()=>window.WriteFlow?.UI);
  const typed='jklm /?qwerty';
  const active=()=>page.evaluate(()=>{const s=document.querySelector('#writeflow-root').shadowRoot;return s.activeElement?.className||'';});
  // Single-line custom instruction input in the rewrite panel.
  await page.evaluate(()=>WriteFlow.UI.openPanel(document.querySelector('#composer'),{rewriteOnly:true}));
  await page.waitForFunction(()=>document.querySelector('#writeflow-root').shadowRoot.querySelector('.wf-custom-input'));
  await page.evaluate(()=>document.querySelector('#writeflow-root').shadowRoot.querySelector('.wf-custom-input').focus());
  await page.keyboard.type(typed);
  const custom=await page.evaluate(()=>document.querySelector('#writeflow-root').shadowRoot.querySelector('.wf-custom-input').value);
  assert.equal(custom,typed,'letters were swallowed in the custom instruction input');
  // Multi-line Write-it-for-me textarea: arrows must move the caret, not focus.
  await page.evaluate(()=>{WriteFlow.UI.closeAll();const c=document.querySelector('#composer');c.value='';});
  await page.evaluate(()=>WriteFlow.UI.openPanel(document.querySelector('#composer')));
  await page.waitForFunction(()=>document.querySelector('#writeflow-root').shadowRoot.querySelector('.wf-wfm-input'));
  await page.evaluate(()=>document.querySelector('#writeflow-root').shadowRoot.querySelector('.wf-wfm-input').focus());
  await page.keyboard.type('line one');await page.keyboard.press('Shift+Enter');await page.keyboard.type('line two');
  await page.keyboard.press('ArrowUp');assert.match(await active(),/wf-wfm-input/,'ArrowUp moved focus out of the textarea');
  await page.keyboard.type('!');
  const wfm=await page.evaluate(()=>document.querySelector('#writeflow-root').shadowRoot.querySelector('.wf-wfm-input').value);
  assert.equal(wfm.split('\n').length,2);assert.ok(wfm.includes('!')&&wfm.endsWith('line two'),`caret did not move up: ${JSON.stringify(wfm)}`);
  // Arrow navigation between buttons still works when a button has focus.
  await page.evaluate(()=>document.querySelector('#writeflow-root').shadowRoot.querySelector('.wf-wfm-scenario').focus());
  const before=await active();await page.keyboard.press('ArrowDown');assert.notEqual(await active(),before,'arrow navigation between buttons stopped working');
  // The page's own shortcuts are unaffected outside WriteFlow.
  await page.evaluate(()=>{WriteFlow.UI.closeAll();document.querySelector('#page-composer').blur();document.body.focus();window.hijacked=[];});
  await page.keyboard.press('j');assert.deepEqual(await page.evaluate(()=>window.hijacked),['j']);
  const hijackedInside=await page.evaluate(()=>window.hijacked.length);assert.equal(hijackedInside,1);
  assert.deepEqual(errors,[]);
  console.log('PASS: page shortcut handlers never see keys typed in WriteFlow inputs; arrows move the caret in text fields and still navigate buttons; page shortcuts unaffected outside WriteFlow.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
