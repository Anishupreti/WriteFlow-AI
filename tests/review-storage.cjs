const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {indexedDB}=require('fake-indexeddb');
function store(){const ctx=vm.createContext({indexedDB,crypto:require('node:crypto').webcrypto,URL});vm.runInContext(fs.readFileSync('review/store.js','utf8'),ctx);return ctx.ReviewStore;}
(async()=>{
const a=store(),b=store(),p=await a.project('Supplier review');
const items=await Promise.all(Array.from({length:30},(_,i)=>(i%2?a:b).create({projectId:p.id,text:'Issue '+i})));
assert.equal(new Set(items.map(i=>i.id)).size,30);assert.equal((await a.read()).items.length,30);
await a.status('R-001','pending');await assert.rejects(b.status('R-001','closed'));await b.status('R-001','closed','Resolved');let s=await a.read();assert.equal(s.items[0].events.length,3);assert.equal(s.items[0].statement,'Issue 0');
const draftId=await a.draft({text:'Original evidence',url:'https://u:p@example.com/path?secret=x#part',title:'Source'});
const i=await b.create({projectId:p.id,draftId,text:'User statement'});assert.equal(i.source.originalText,'Original evidence');assert.equal(i.source.url,'https://example.com/path');assert.equal(i.id,'R-031');
await assert.rejects(a.create({projectId:p.id,draftId,text:'Duplicate'}));
const snapshot=JSON.stringify(await a.read());await assert.rejects(a.status('R-001','invalid'));await assert.rejects(a.create({projectId:'bad',text:'Invalid project'}));await assert.rejects(a.create({projectId:p.id,text:' '}));assert.equal(JSON.stringify(await a.read()),snapshot);
const dangerous=await a.draft({text:'x',url:'javascript:alert(1)'});assert.equal((await a.read()).drafts[dangerous].url,'');await a.discard(dangerous);
assert.equal((await store().read()).items.length,31);
const {JSDOM}=require('jsdom');const dom=new JSDOM(fs.readFileSync('review/review.html','utf8'),{runScripts:'outside-only',url:'https://extension.test/review/review.html'});
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;}; dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new dom.window.Event('close'));}; dom.window.ReviewStore=a;dom.window.confirm=()=>true;dom.window.eval(fs.readFileSync('review/review.js','utf8'));
const tick=()=>new Promise(r=>setTimeout(r,80));await tick();assert.equal(dom.window.document.querySelectorAll('.item').length,31);
await a.create({projectId:p.id,text:'<img src=x onerror=alert(1)>'});dom.window.dispatchEvent(new dom.window.Event('focus'));await tick();assert.equal(dom.window.document.querySelectorAll('.item img').length,0);
dom.window.document.querySelector('.open .item').click();await tick();const select=dom.window.document.querySelector('#item-status');assert.ok(select);select.value='pending';select.dispatchEvent(new dom.window.Event('change'));await tick();assert.equal(dom.window.document.querySelectorAll('.pending .item').length,1);
dom.window.close();console.log('PASS: 30 concurrent writes; stable IDs; status history; original provenance; URL sanitisation; duplicate rejection; rollback; reopen; DOM rendering and status interaction. Simulated IndexedDB/DOM, not Chrome.');
})().catch(e=>{console.error(e);process.exitCode=1});
