const {chromium}=require('playwright');const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{const root=path.resolve(__dirname,'..');const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const context=await browser.newContext({acceptDownloads:true});
 try{const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.chrome={storage:{local:{get:async()=>({provider:'mock'}),set:async()=>{}}}};});
 const url=`http://127.0.0.1:${server.address().port}/review/review.html`;await page.goto(url);
 await page.locator('#project-name').fill('Supplier review');await page.locator('#project-form button').click();
 await page.locator('#statement').fill('Liability cap covers expected order value');await page.locator('#save-item').click();await page.locator('.item').first().click();
 // A second round is generated with the first round as context.
 await page.getByRole('button',{name:'Ask AI'}).click();await page.waitForFunction(()=>document.querySelectorAll('.round-entry .answer-label').length===1);
 await page.locator('#review-mode').selectOption('quantify');await page.locator('#review-instruction').fill('Quantify');await page.getByRole('button',{name:'Ask AI'}).click();
 await page.getByText('Earlier rounds supplied as context: 1').waitFor();
 // Closing asks for a decision and will not close without one.
 await page.locator('#item-status').selectOption('closed');await page.locator('#decision-note').waitFor();
 await page.locator('#decision-save').click();let state=await page.evaluate(()=>ReviewStore.read());assert.equal(state.items[0].status,'open');
 await page.locator('#decision-note').fill('Accepted: cap is 2x annual fees');await page.locator('#decision-save').click();
 await page.waitForFunction(()=>document.querySelector('.closed .item'));await page.locator('.decision').getByText('Accepted: cap is 2x annual fees').waitFor();
 assert.match(await page.locator('.timeline').innerText(),/open → closed · “Accepted: cap is 2x annual fees”/);
 assert.match(await page.locator('.closed .item').innerText(),/Decision: Accepted: cap is 2x annual fees/);
 // Cancelling the close restores the previous status without a change.
 await page.locator('#item-status').selectOption('pending');await page.waitForFunction(()=>document.querySelector('.pending .item'));
 await page.locator('#item-status').selectOption('closed');await page.getByRole('button',{name:'Cancel'}).click();assert.equal(await page.locator('#item-status').inputValue(),'pending');
 await page.locator('#item-status').selectOption('closed');await page.locator('#decision-note').fill('Accepted again');await page.locator('#decision-save').click();await page.waitForFunction(()=>document.querySelector('.closed .item'));
 await page.locator('#close-detail').click();
 // A captured chat answer attaches to an existing open item.
 await page.locator('#new-item').click();await page.locator('#statement').fill('Dispatch window is five days');await page.locator('#save-item').click();await page.locator('.open .item').waitFor();
 const draftId=await page.evaluate(()=>ReviewStore.draft({text:'Chat conclusion: dispatch is 5 business days.',url:'https://claude.ai/chat/abc-123',title:'Dispatch chat'}));
 await page.goto(url+'#draft='+draftId);await page.locator('#attach-draft').waitFor();
 assert.deepEqual(await page.locator('#attach-item option').evaluateAll(o=>o.map(x=>x.value)),['R-002']);
 await page.locator('#attach-note').fill('Quantify');await page.getByRole('button',{name:'Attach as answer'}).click();
 await page.locator('#detail .answer-label').filter({hasText:'CAPTURED — NOT VERIFIED'}).waitFor();
 assert.equal(await page.locator('#detail .capture-link').getAttribute('href'),'https://claude.ai/chat/abc-123');
 state=await page.evaluate(()=>ReviewStore.read());assert.equal(state.items[1].rounds[0].instruction,'Quantify');assert.equal(Object.keys(state.drafts).length,0);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.setViewportSize({width:1280,height:900});
 await page.locator('#close-detail').click();
 // Decisions export is paste-ready Markdown.
 const dl=page.waitForEvent('download');await page.locator('#export-decisions').click();const file=await dl;assert.equal(file.suggestedFilename(),'supplier-review-decisions.md');
 const md=fs.readFileSync(await file.path(),'utf8');assert.match(md,/# Supplier review — decisions/);assert.match(md,/\*\*Decision:\*\* Accepted again/);assert.doesNotMatch(md,/## R-002/);
 assert.match(await page.locator('footer').innerText(),/AI is called only when you choose Ask AI/);
 assert.deepEqual(errors,[]);console.log('PASS: second round receives earlier context; close requires decision, cancel restores status, decision shown on board/detail/timeline; capture attaches to open item with link; mobile width; decisions Markdown export; no page errors.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
