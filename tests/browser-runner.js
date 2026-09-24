// Browser-native fixture suite. Run from the local test server, never a live site.
(async () => {
  const results = [], errors = [];
  window.addEventListener('error', e => errors.push(e.message));
  const output = document.querySelector('#results');
  const fixture = document.querySelector('#fixture');
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
  async function test(name, fn) {
    try { await fn(); results.push({name,status:'PASS'}); }
    catch(e) { results.push({name,status:'FAIL',error:e.message}); }
    output.textContent = results.map(r=>`${r.status}: ${r.name}${r.error?' — '+r.error:''}`).join('\n');
  }
  for (const [id,host,html] of window.fixtureContracts) await test(id+' association + isolation + dynamic DOM', () => {
    fixture.innerHTML=html.replaceAll('TARGET','WRONG NEARBY POST').replaceAll('id="editor"','id="other-editor"').replace('id="main"','id="other-main"')+html;
    const a=WriteFlow.PlatformRegistry.getAdapter(host),field=fixture.querySelector('#editor');
    const v=a.extractContext(field),s=WriteFlow.ContextModel.serialize(v);
    assert(a.id===id,'wrong platform'); assert(v?.content.primaryText.includes('TARGET'),'target missing');
    assert(!s.includes('WRONG')&&!s.includes('Draft stays private')&&!s.includes('UNRELATED COMMENT'),'unrelated content');
    assert(WriteFlow.buildCommentPrompt({postText:v}).user.includes('TARGET'),'normalized prompt missing');
    const detached=document.createElement('textarea');fixture.append(detached);
    assert(a.extractContext(detached)===null,'unassociated composer captured context');
    field.parentElement.outerHTML=field.parentElement.outerHTML.replaceAll('TARGET','NEW TARGET');
    assert(a.extractContext(fixture.querySelector('#editor')).content.primaryText.includes('NEW TARGET'),'stale context');
  });
  await test('nested reply and open Shadow DOM editor',()=>{
    fixture.innerHTML='<shreddit-post post-title="POST"><shreddit-comment><div slot="comment">OUTER</div><shreddit-comment><div slot="comment">TARGET</div><div id="host"></div></shreddit-comment></shreddit-comment></shreddit-post>';
    const root=fixture.querySelector('#host').attachShadow({mode:'open'});
    root.innerHTML='<div contenteditable="true"><p><span>Draft</span></p></div>';
    const field=WriteFlow.Detector.resolveEditableTarget(root.querySelector('span'));
    const v=WriteFlow.PlatformRegistry.getAdapter('reddit.com').extractContext(field);
    assert(field.tagName==='DIV','nested editor root');assert(v.content.primaryText==='TARGET'&&v.content.parentText==='OUTER','nested context ownership');
  });
  for(const [host,html] of [
    ['linkedin.com','<article data-urn="urn:li:activity:1"><div class="feed-shared-text">POST</div><div class="comments-comment-item"><div class="comments-comment-item__main-content">OUTER</div><div class="comments-comment-item"><div class="comments-comment-item__main-content">TARGET</div><textarea></textarea></div></div></article>'],
    ['facebook.com','<div role="article"><div data-ad-preview="message">POST</div><div data-commentid="1"><div data-ad-rendering-role="comment_message">OUTER</div><div data-commentid="2"><div data-ad-rendering-role="comment_message">TARGET</div><textarea></textarea></div></div></div>'],
    ['youtube.com','<ytd-watch-flexy><h1>POST</h1><ytd-comment-renderer><div id="content-text">OUTER</div><ytd-comment-renderer><div id="content-text">TARGET</div><textarea></textarea></ytd-comment-renderer></ytd-comment-renderer></ytd-watch-flexy>']
  ]) await test(host+' nested reply ownership',()=>{
    fixture.innerHTML=html;const v=WriteFlow.PlatformRegistry.getAdapter(host).extractContext(fixture.querySelector('textarea'));
    assert(v.type==='comment_reply'&&v.content.primaryText==='TARGET'&&v.content.parentText==='OUTER','nested target mismatch');
  });
  await test('modal ambiguity and underlying feed isolation',()=>{
    fixture.innerHTML='<article data-testid="tweet"><div data-testid="tweetText">WRONG</div></article><div role="dialog"><textarea></textarea></div>';
    const a=WriteFlow.PlatformRegistry.getAdapter('x.com'),field=fixture.querySelector('textarea'),dialog=fixture.querySelector('[role="dialog"]');
    assert(a.extractContext(field)===null,'underlying feed captured');
    dialog.insertAdjacentHTML('afterbegin','<article data-testid="tweet"><div data-testid="tweetText">TARGET</div></article>');
    assert(a.extractContext(field).content.primaryText==='TARGET','unique modal source');
    dialog.prepend(fixture.querySelector('article').cloneNode(true));assert(a.extractContext(field)===null,'ambiguous modal');
  });
  await test('email new compose isolation and explicit quote',()=>{
    fixture.innerHTML='<div data-thread-id="old"><div data-message-id="1"><div data-message-body>PRIVATE OTHER THREAD</div></div></div><div role="dialog"><div contenteditable="true" id="editor"></div></div>';
    const a=WriteFlow.PlatformRegistry.getAdapter('mail.google.com'),f=fixture.querySelector('#editor');
    assert(a.extractContext(f)===null,'new compose captured other thread');
    f.innerHTML='Draft<blockquote type="cite">TARGET</blockquote>';
    assert(a.extractContext(f).content.primaryText==='TARGET','explicit quote lost');
  });
  await test('hidden source excluded',()=>{
    fixture.innerHTML='<article data-testid="tweet"><div data-testid="tweetText" hidden>SECRET</div><textarea></textarea></article>';
    assert(WriteFlow.PlatformRegistry.getAdapter('x.com').extractContext(fixture.querySelector('textarea'))===null,'hidden text read');
    fixture.innerHTML='<article data-testid="tweet"><div data-testid="tweetText">TARGET<span style="display:none">SECRET</span></div><textarea></textarea></article>';
    assert(WriteFlow.PlatformRegistry.getAdapter('x.com').extractContext(fixture.querySelector('textarea')).content.primaryText==='TARGET','CSS-hidden child read');
  });
  await test('sensitive controls and disabled editing',()=>{
    fixture.innerHTML='<input type="password"><input autocomplete="section-pay cc-number"><textarea readonly></textarea><div role="textbox" aria-readonly="true"></div>';
    assert([...fixture.children].every(el=>!WriteFlow.Detector.isEditableCandidate(el)),'sensitive editor accepted');
  });
  await test('native setter + input event + selection isolation',()=>{
    fixture.innerHTML='<textarea>before</textarea><div contenteditable="true">inside</div><p>outside</p>';
    const el=fixture.querySelector('textarea');let tracked='before',events=0;
    const desc=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
    Object.defineProperty(el,'value',{get(){return desc.get.call(this)},set(v){tracked=v;desc.set.call(this,v)}});
    el.addEventListener('input',()=>events++);WriteFlow.AdapterRegistry.getAdapter(el).replaceText(el,'after');
    assert(el.value==='after'&&tracked==='before'&&events===1,'framework setter');
    const range=document.createRange();range.selectNodeContents(fixture.querySelector('p'));getSelection().removeAllRanges();getSelection().addRange(range);
    const ce=fixture.querySelector('[contenteditable]');assert(WriteFlow.AdapterRegistry.getAdapter(ce).getSelectedText(ce)==='','outside selection captured');getSelection().removeAllRanges();
  });
  await test('budget + hostile hostname + capability contracts',()=>{
    const M=WriteFlow.ContextModel,v=M.normalize({content:{primaryText:'a'.repeat(9000)},conversation:[{text:'b'.repeat(9000)}]});
    assert(M.serialize(v).length<=6000,'budget exceeded');
    assert(!WriteFlow.PlatformRegistry.getAdapter('evil-linkedin.com').capabilities.contextualReply,'host boundary');
    assert(WriteFlow.PlatformRegistry.adapters.every(a=>!a.capabilities.smartCompose),'unimplemented capability');
  });
  await test('all writing commands and provider retry/fallback',async()=>{
    for(const command of WriteFlow.Commands) assert(WriteFlow.buildWritingPrompt({command:command.id,text:'hello'}).user.includes('hello'),'writing command missing');
    await chrome.storage.local.set({provider:'mock',mockFailureMode:'500-once'});
    assert((await WriteFlow.AI.generate({command:'rewrite',text:'hello'})).text.includes('Hello'),'retry failed');
    await chrome.storage.local.set({provider:'openai',apiKeys:{openai:'test',groq:'test'},fallbackProvider:'groq',mockFailureMode:''});
    const originalFetch=window.fetch;
    window.fetch=async url=>url.includes('openai.com')?new Response('{}',{status:401}):new Response(JSON.stringify({choices:[{message:{content:'Fallback result'}}]}));
    try { const v=await WriteFlow.AI.generate({command:'rewrite',text:'hello'});assert(v.usedFallback&&v.text==='Fallback result','fallback');
      let rejected=false;try{await WriteFlow.AI.analyzeContext({postText:'x'})}catch{rejected=true}assert(rejected,'malformed analysis accepted');
    } finally {window.fetch=originalFetch;await chrome.storage.local.set({provider:'mock',mockFailureMode:'',fallbackProvider:''});}
  });
  await test('five provider request/response contracts and error propagation',async()=>{
    const originalFetch=window.fetch;
    try {
      for(const provider of ['openai','anthropic','gemini','groq','openrouter']) {
        await chrome.storage.local.set({provider,apiKeys:{[provider]:'fixture-key'},fallbackProvider:''});
        let request;
        window.fetch=async(url,options)=>{request={url,options};return new Response(JSON.stringify(provider==='anthropic'?{content:[{text:'OK'}]}:provider==='gemini'?{candidates:[{content:{parts:[{text:'OK'}]}}]}:{choices:[{message:{content:'OK'}}]}))};
        assert((await WriteFlow.AI.generate({command:'rewrite',text:'test'})).text==='OK',provider+' response');
        assert(request.options.method==='POST'&&request.options.body.includes('test'),provider+' request');
        window.fetch=async()=>new Response('{}',{status:401});let rejected=false;
        try{await WriteFlow.AI.generate({command:'rewrite',text:'test'})}catch{rejected=true}assert(rejected,provider+' invalid key ignored');
      }
      for(const status of [429,503]) {
        window.fetch=async()=>new Response('{}',{status});let rejected=false;
        try{await WriteFlow.AI.generate({command:'rewrite',text:'test'})}catch{rejected=true}assert(rejected,'status '+status+' ignored');
      }
    } finally {window.fetch=originalFetch;await chrome.storage.local.set({provider:'mock',mockFailureMode:'',fallbackProvider:''});}
  });
  await test('contenteditable replacement, insertion and Gmail line breaks',()=>{
    fixture.innerHTML='<div contenteditable="true" role="textbox">old</div>';
    const field=fixture.firstElementChild,adapter=WriteFlow.AdapterRegistry.getAdapter(field);
    adapter.replaceText(field,'first\nsecond');assert(field.innerText.includes('second'),'contenteditable replacement');
    const range=document.createRange();range.selectNodeContents(field);range.collapse(false);getSelection().removeAllRanges();getSelection().addRange(range);
    adapter.insertText(field,' tail');assert(field.innerText.includes('tail'),'contenteditable insertion');
    GmailAdapter.replaceText(field,'Hello\n\nSarah');assert(field.querySelectorAll('div').length===3,'Gmail line structure');
    getSelection().removeAllRanges();WriteFlow.UI.closeAll();
  });
  await test('local settings migration, saved prompts, feedback and licence responses',async()=>{
    await chrome.storage.local.set({provider:'openai',apiKey:'legacy-fixture',apiKeys:{},hasSeenWelcome:true,onboardingComplete:false});
    const settings=await WriteFlow.Storage.getSettings();assert(settings.apiKeys.openai==='legacy-fixture'&&settings.onboardingComplete,'migration');
    await WriteFlow.Storage.addSavedPrompt('Keep it brief');assert((await WriteFlow.Storage.getSettings()).savedPrompts[0].text==='Keep it brief','saved prompt');
    const feedback=await WriteFlow.Storage.addFeedback({rating:'up',text:'DO NOT STORE'});assert(!JSON.stringify(feedback).includes('DO NOT STORE'),'feedback stores text');
    const original=window.fetch;
    try {
      window.fetch=async()=>new Response(JSON.stringify({success:true,purchase:{refunded:true}}));assert(!(await WriteFlow.License.verify('fixture')).valid,'refunded licence');
      window.fetch=async()=>new Response(JSON.stringify({success:true,purchase:{}}));assert((await WriteFlow.License.verify('fixture')).valid,'valid licence');
    } finally {window.fetch=original;await chrome.storage.local.set({provider:'mock',apiKey:'',apiKeys:{},savedPrompts:[]});}
  });
  await test('UI rewrite replace insert undo and removal',async()=>{
    fixture.innerHTML='<textarea id="editor">hello world</textarea>';
    const field=fixture.querySelector('textarea');field.focus();WriteFlow.UI.showTrigger(field);
    await WriteFlow.UI.openPanel(field,{rewriteOnly:true});
    const shadow=document.querySelector('#writeflow-root').shadowRoot;
    const click=selector=>{const el=shadow.querySelector(selector);assert(el,'missing '+selector);el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));};
    click('[data-cmd="rewrite"]');await pause(650);click('#wf-replace');await pause(500);
    assert(field.value.includes('Mock rewrite'),'replace failed');click('#wf-undo');assert(field.value==='hello world','undo failed');
    await WriteFlow.UI.openPanel(field,{rewriteOnly:true});click('[data-cmd="rewrite"]');await pause(650);click('#wf-insert');assert(field.value.includes('Mock rewrite'),'insert failed');click('#wf-undo');
    WriteFlow.UI.showTrigger(field);field.remove();await pause(350);assert(!shadow.querySelector('.wf-trigger')&&!shadow.querySelector('.wf-panel'),'orphan UI');
  });
  await test('SPA navigation cleanup and trigger uniqueness',async()=>{
    fixture.innerHTML='<textarea>draft</textarea>';const f=fixture.querySelector('textarea');WriteFlow.UI.showTrigger(f);WriteFlow.UI.showTrigger(f);
    const shadow=document.querySelector('#writeflow-root').shadowRoot;assert(shadow.querySelectorAll('.wf-trigger').length===1,'duplicate trigger');
    await WriteFlow.UI.openPanel(f,{rewriteOnly:true});history.pushState({},'','#navigation');await pause(350);assert(!shadow.querySelector('.wf-panel'),'stale SPA panel');
    history.replaceState({},'','#');
  });
  await test('context UI receives normalized payload without object-string corruption',async()=>{
    fixture.innerHTML='<textarea>draft</textarea>';const field=fixture.querySelector('textarea');
    const original=WriteFlow.ContextExtractorRegistry.getExtractor;
    WriteFlow.ContextExtractorRegistry.getExtractor=()=>({id:'linkedin',kind:'social',extractPostText:()=>WriteFlow.ContextModel.normalize({platform:'linkedin',content:{primaryText:'TARGET'}})});
    try {
      await WriteFlow.UI.openPanel(field);
      const shadow=document.querySelector('#writeflow-root').shadowRoot;
      shadow.querySelector('[data-style="congratulate_insight"]').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await pause(650);
      assert(shadow.querySelector('.wf-body').textContent.includes('TARGET'),'reply target missing');
      assert(!shadow.querySelector('.wf-body').textContent.includes('[object Object]'),'object corrupted');
    } finally {WriteFlow.ContextExtractorRegistry.getExtractor=original;WriteFlow.UI.closeAll();}
  });
  await test('rapid open-close during delayed extraction never reopens panel',async()=>{
    fixture.innerHTML='<textarea>draft</textarea>';const field=fixture.querySelector('textarea');
    const original=WriteFlow.ContextExtractorRegistry.getExtractor;
    WriteFlow.ContextExtractorRegistry.getExtractor=()=>({id:'linkedin',kind:'social',extractPostText:()=>null});
    try {const opening=WriteFlow.UI.openPanel(field);WriteFlow.UI.closeAll();await opening;
      assert(!document.querySelector('#writeflow-root').shadowRoot.querySelector('.wf-panel'),'stale opening');
    } finally {WriteFlow.ContextExtractorRegistry.getExtractor=original;}
  });
  await test('keyboard activation, light and dark palette, viewport and scroll',async()=>{
    fixture.innerHTML='<textarea>draft</textarea>';const field=fixture.querySelector('textarea');
    await WriteFlow.UI.openPanel(field,{rewriteOnly:true});
    const shadow=document.querySelector('#writeflow-root').shadowRoot,button=shadow.querySelector('[data-cmd="rewrite"]');
    button.click();await pause(650);assert(shadow.querySelector('#wf-replace'),'keyboard click did not generate');
    const sheet=shadow.querySelector('style').sheet;
    const dark=[...sheet.cssRules].find(rule=>rule.conditionText==='(prefers-color-scheme: dark)');
    const theme=document.createElement('style');shadow.append(theme);
    for(const rule of [sheet.cssRules[0],dark.cssRules[0]]) {
      theme.textContent=rule.cssText;
      const panel=shadow.querySelector('.wf-panel'),rect=panel.getBoundingClientRect();
      assert(getComputedStyle(panel).backgroundColor!=='rgba(0, 0, 0, 0)','missing theme background');
      assert(rect.left>=0&&rect.right<=innerWidth+1,'panel outside viewport');
    }
    theme.remove();window.dispatchEvent(new Event('scroll'));assert(!shadow.querySelector('.wf-panel'),'scroll left panel open');WriteFlow.UI.closeAll();
  });
  await test('console errors',()=>assert(!errors.length,errors.join('; ')));
  window.testResults={browser:navigator.userAgent,results};
  document.querySelector('h1').textContent=`WriteFlow: ${results.filter(r=>r.status==='PASS').length}/${results.length} tests passed`;
  await fetch('/test-results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(window.testResults)});
  fixture.innerHTML='<label for="preview-editor">Writing preview (local mock only)</label><textarea id="preview-editor">Thanks for the update. Could we discuss the next steps tomorrow?</textarea><button id="preview-open">Open WriteFlow preview</button><button id="preview-light">Light palette</button><button id="preview-dark">Dark palette</button>';
  document.querySelector('#preview-open').onclick=()=>WriteFlow.UI.openPanel(document.querySelector('#preview-editor'),{rewriteOnly:true});
  const shadow=document.querySelector('#writeflow-root').shadowRoot, sheet=shadow.querySelector('style').sheet;
  const override=document.createElement('style');shadow.append(override);
  document.querySelector('#preview-light').onclick=()=>{override.textContent=sheet.cssRules[0].cssText};
  document.querySelector('#preview-dark').onclick=()=>{override.textContent=[...sheet.cssRules].find(r=>r.conditionText==='(prefers-color-scheme: dark)').cssRules[0].cssText};
})();
