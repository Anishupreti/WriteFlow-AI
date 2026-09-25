const {chromium}=require('playwright');
const path=require('node:path'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=require('node:http').createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const engine=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:[]});
 const browser=await engine.newContext();
 try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:1000});await page.goto(`${base}/review/review.html`);
 await page.locator('.welcome').waitFor();await page.screenshot({path:path.join(__dirname,'review-welcome.png')});
 const projectId=await page.evaluate(async()=>{
 const p=await ReviewStore.project('Supplier due diligence');
 const records=[
 ['Confirm the supplier’s delivery commitment for the December launch.','open','Delivery schedule'],
 ['Quantify the cost of a two-week fulfilment delay.','open','Cost assumptions'],
 ['Check whether the liability cap covers our expected order value.','open','Supplier agreement'],
 ['Request evidence of the supplier’s quality control process.','pending','Quality assurance'],
 ['Confirm the escalation contact for missed deliveries.','pending','Support policy'],
 ['Resolve the duplicate requirement for monthly reporting.','closed','Reporting requirements']];
 for(const [text,status,title] of records){const draftId=await ReviewStore.draft({text,url:'https://example.com/supplier-review',title});const item=await ReviewStore.create({projectId:p.id,draftId,text});await ReviewStore.status(item.id,status,status==='closed'?'Duplicate of R-001':undefined);}
 await ReviewStore.draft({text:'New evidence: the supplier lists a different dispatch window in its latest terms.',url:'https://example.com/terms',title:'Terms'});
 return p.id;
 });
 await page.reload();await page.locator('.item').first().waitFor();
 assert.equal(await page.locator('.item').count(),6);
 await page.locator('#search').fill('liability');assert.equal(await page.locator('.item').count(),1);
 await page.locator('[data-filter=pending]').click();assert.equal(await page.locator('.item').count(),0);await page.getByRole('heading',{name:'No matching items.'}).waitFor();
 await page.locator('#clear-filters').click();assert.equal(await page.locator('.item').count(),6);
 await page.locator('[data-filter=pending]').click();assert.equal(await page.locator('.item').count(),2);
 await page.locator('[data-filter=all]').click();
 await page.locator('#search').fill('R-003');assert.equal(await page.locator('.item').count(),1);await page.locator('#clear-filters').click();
 await page.locator('.item').first().click();await page.locator('dialog[open]').waitFor();
 for(let i=0;i<9;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('#detail').contains(document.activeElement)),true);}
 await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'});
 await page.waitForFunction(()=>document.activeElement.classList.contains('item'));
 await page.reload();await page.locator('.item[aria-pressed=true]').waitFor();
 await page.locator('#new-item').click();await page.locator('#statement').fill('Unsaved note');await page.locator('#hide-composer').click();await page.locator('#new-item').click();assert.equal(await page.locator('#statement').inputValue(),'Unsaved note');await page.locator('#statement').fill('');await page.locator('#hide-composer').click();
 await page.locator('#theme').selectOption('dark');await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.locator('.item').first().waitFor();await page.screenshot({path:path.join(__dirname,'review-desktop-dark.png'),fullPage:true});
 await page.locator('#theme').selectOption('light');
 await page.locator('.item').nth(2).click();await page.screenshot({path:path.join(__dirname,'review-detail.png')});await page.keyboard.press('Escape');
 await page.screenshot({path:path.join(__dirname,'review-desktop.png'),fullPage:true});
 const second=await page.evaluate(()=>ReviewStore.project('Another review'));await page.reload();await page.locator('#project').selectOption(second.id);await page.reload();assert.equal(await page.locator('#project').inputValue(),second.id);await page.locator('.welcome').waitFor();
 await page.locator('#project').selectOption(projectId);await page.locator('.item').first().waitFor();
 await page.locator('.wordmark').focus();await page.keyboard.press('/');assert.equal(await page.evaluate(()=>document.activeElement.id),'search');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(__dirname,'review-mobile.png'),fullPage:true});
 await page.locator('.item').first().click();const box=await page.locator('#detail').boundingBox();assert.ok(box.width<=390&&box.x>=0);await page.screenshot({path:path.join(__dirname,'review-mobile-detail.png')});await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.item').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 assert.deepEqual(errors,[]);
 console.log('PASS: search text/ID; combined status filters; empty states; native-dialog focus containment and Escape return; remembered project and item; hidden composer retains text; theme persistence; keyboard shortcut; responsive detail drawer; reduced motion; screenshots; no page errors.');
 }finally{await engine.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
