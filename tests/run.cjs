// One shared suite for headless Playwright and the interactive browser harness.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const { chromium }=require('playwright');
require('./create-browser-harness.cjs');
const root=path.resolve(__dirname,'..');
(async()=>{
  const server=http.createServer((req,res)=>{
    if(req.method==='POST'&&req.url==='/test-results') {req.resume();res.end('OK');return;}
    const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'text/plain');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/tests/browser.html`);
    await page.waitForFunction(()=>window.testResults,{},{timeout:60000});
    const result=await page.evaluate(()=>window.testResults);
    result.engine=browser.version();result.pageErrors=errors;
    fs.writeFileSync(path.join(__dirname,'playwright-results.json'),JSON.stringify(result,null,2));
    result.results.forEach(test=>console.log(test.status,test.name,test.error||''));
    if(errors.length||result.results.some(r=>r.status!=='PASS'))process.exitCode=1;
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
