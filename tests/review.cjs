const {chromium}=require('playwright');
const path=require('node:path'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const browser=await chromium.launchPersistentContext('',{headless:true,channel:'chromium',...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 try{
 const worker=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker');
 const id=new URL(worker.url()).host, page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`chrome-extension://${id}/review/review.html`);
 await page.locator('#project-name').fill('Supplier review'); await page.locator('#project-form button').click();
 await page.locator('#project-title').filter({hasText:'Supplier review'}).waitFor();
 await page.locator('#statement').fill('<img src=x onerror=alert(1)> Delivery promise'); await page.locator('#save-item').click();
 await page.locator('.item').waitFor(); await page.locator('.item').click(); assert.equal(await page.locator('.item img').count(),0);
 await page.locator('#item-status').selectOption('pending'); await page.waitForFunction(()=>document.querySelector('.pending .item'));
 await page.locator('#item-status').selectOption('closed'); await page.locator('#decision-note').fill('Accepted'); await page.locator('#decision-save').click(); await page.waitForFunction(()=>document.querySelector('.closed .item'));
 let state=await page.evaluate(()=>ReviewStore.read()); assert.equal(state.items[0].events.length,3);assert.equal(state.items[0].id,'R-001');
 await page.locator('#close-detail').click();
 const projectId=state.projects[0].id;
 const page2=await browser.newPage();await page2.goto(page.url()); await page2.waitForFunction(()=>globalThis.ReviewStore);
 await Promise.all(Array.from({length:12},(_,i)=>(i%2?page:page2).evaluate(({projectId,i})=>ReviewStore.create({projectId,text:`Concurrent ${i}`}),{projectId,i})));
 state=await page.evaluate(()=>ReviewStore.read());assert.equal(state.items.length,13);assert.equal(new Set(state.items.map(i=>i.id)).size,13);
 const draftId=await worker.evaluate(()=>ReviewStore.draft({text:'Original quoted evidence',url:'https://user:pass@example.com/product?token=private#section',title:'Product'}));
 await page.goto(`chrome-extension://${id}/review/review.html#draft=${draftId}`);await page.waitForFunction(()=>document.querySelector('#statement').value==='Original quoted evidence');
 await page.locator('#statement').fill('Delivery claim to investigate');await page.locator('#save-item').click();await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('R-014 saved'));
 state=await page.evaluate(()=>ReviewStore.read());assert.equal(state.items[13].source.url,'https://example.com/product');assert.equal(state.items[13].source.originalText,'Original quoted evidence');assert.equal(state.items[13].statement,'Delivery claim to investigate');assert.equal(Object.keys(state.drafts).length,0);
 const duplicate=await page.evaluate(async({projectId,draftId})=>{try{await ReviewStore.create({projectId,draftId,text:'Duplicate'});return false;}catch{return true;}},{projectId,draftId});assert.equal(duplicate,true);
 const before=JSON.stringify(await page.evaluate(()=>ReviewStore.read()));
 const invalid=await page.evaluate(async()=>{try{await ReviewStore.status('R-001','nonsense');return false;}catch{return true;}});assert.equal(invalid,true);assert.equal(JSON.stringify(await page.evaluate(()=>ReviewStore.read())),before);
 await page.reload();await page.locator('.item').first().waitFor();assert.equal(await page.locator('.item').count(),14);
 const download=page.waitForEvent('download');await page.locator('#export').click();const file=await (await download).path();assert.equal(JSON.parse(fs.readFileSync(file)).items.length,14);
 await page.screenshot({path:path.join(__dirname,'review-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(__dirname,'review-mobile.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.emulateMedia({colorScheme:'dark'});await page.screenshot({path:path.join(__dirname,'review-dark.png'),fullPage:true});
 assert.deepEqual(errors,[]); console.log('PASS: real extension load; projects/items; XSS-safe display; status history; 12 concurrent writes; source sanitisation and provenance; duplicate capture prevention; failed mutation rollback; reload persistence; JSON export; responsive layout; no page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
