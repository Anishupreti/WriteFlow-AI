const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {indexedDB}=require('fake-indexeddb');
const ctx=vm.createContext({indexedDB,crypto:require('node:crypto').webcrypto,URL});
for(const file of ['review/backup.js','review/store.js','review/export.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const {ReviewStore,ReviewBackup,ReviewExport}=ctx;
(async()=>{
 // Closing requires a decision; reopening and re-closing keeps both notes.
 const p=await ReviewStore.project('Supplier review');
 const item=await ReviewStore.create({projectId:p.id,text:'Liability cap covers expected order value'});
 await assert.rejects(ReviewStore.status(item.id,'closed'),/enter some text/);
 await assert.rejects(ReviewStore.status(item.id,'closed','  '));
 let s=await ReviewStore.read();assert.equal(s.items[0].status,'open');assert.equal(s.items[0].events.length,1);
 await ReviewStore.status(item.id,'closed','Accepted: cap is 2x annual fees');
 s=await ReviewStore.read();assert.equal(ReviewStore.decision(s.items[0]),'Accepted: cap is 2x annual fees');
 await ReviewStore.status(item.id,'open');s=await ReviewStore.read();assert.equal(ReviewStore.decision(s.items[0]),'');
 await ReviewStore.status(item.id,'closed','Rejected: cap excludes data loss');
 s=await ReviewStore.read();assert.equal(ReviewStore.decision(s.items[0]),'Rejected: cap excludes data loss');
 assert.deepEqual(s.items[0].events.filter(e=>e.note).map(e=>e.note),['Accepted: cap is 2x annual fees','Rejected: cap excludes data loss']);

 // A captured chat answer becomes an answered round on an existing item.
 const other=await ReviewStore.create({projectId:p.id,text:'Dispatch window is five days'});
 const draftId=await ReviewStore.draft({text:'The chat concluded dispatch is 5 business days.',url:'https://claude.ai/chat/abc-123?x=1',title:'Dispatch chat'});
 await assert.rejects(ReviewStore.attach('R-999',draftId,'Explain'),/Choose an item/);
 const attached=await ReviewStore.attach(other.id,draftId,'');
 assert.equal(attached.round.mode,'capture');assert.equal(attached.round.instruction,'Captured answer');
 assert.equal(attached.round.answer.url,'https://claude.ai/chat/abc-123');assert.equal(attached.round.answer.provider,'Captured from claude.ai');
 s=await ReviewStore.read();assert.equal(Object.keys(s.drafts).length,0);
 await assert.rejects(ReviewStore.attach(other.id,draftId,'again'),/already saved/);
 await assert.rejects(ReviewStore.answer(other.id,attached.round.id,{text:'overwrite'}),/already answered/);
 const long=await ReviewStore.draft({text:'x',url:'https://'+'a'.repeat(90)+'.example.com/',title:''});
 assert.ok((await ReviewStore.attach(other.id,long,'')).round.answer.provider.length<=80);

 // Notes and captured rounds survive backup validation and restore.
 await ReviewStore.source(other.id,attached.round.id,{citation:'Supplier terms §4',proposition:'Dispatch within 5 business days',url:'https://example.com/terms'});
 const backup=JSON.parse(JSON.stringify({format:'writeflow-review-record',...await ReviewStore.read()}));
 const valid=ReviewBackup.validate(backup);
 assert.equal(valid.items[0].events.at(-1).note,'Rejected: cap excludes data loss');
 assert.equal(valid.items[1].rounds[0].answer.url,'https://claude.ai/chat/abc-123');
 await ReviewStore.restore(backup);s=await ReviewStore.read();assert.equal(ReviewStore.decision(s.items[0]),'Rejected: cap excludes data loss');
 const bad=JSON.parse(JSON.stringify(backup));bad.items[1].rounds[0].answer.url='javascript:alert(1)';assert.throws(()=>ReviewBackup.validate(bad),/source URL/);
 const badNote=JSON.parse(JSON.stringify(backup));badNote.items[0].events[1].note='x'.repeat(501);assert.throws(()=>ReviewBackup.validate(badNote),/decision note/);

 // Decisions export: closed items only, with decision, sources and links.
 await ReviewStore.status(other.id,'closed','Accepted');
 await ReviewStore.status(other.id,'open');await ReviewStore.status(other.id,'pending');
 const third=await ReviewStore.create({projectId:p.id,text:'Line one\nLine two'});await ReviewStore.status(third.id,'closed','Merged into R-001');
 const src=(await ReviewStore.read()).sources[0];await ReviewStore.sourceStatus(src.id,'disputed');await ReviewStore.status(other.id,'closed','Accepted with caveat');
 const md=ReviewExport.decisionsMarkdown(await ReviewStore.read(),p.id,new Date('2026-09-25T10:00:00Z'));
 assert.match(md,/^# Supplier review — decisions/);assert.match(md,/Exported 2026-09-25/);assert.match(md,/3 closed · 0 pending · 0 open/);
 assert.match(md,/## R-001\n\n> Liability cap covers expected order value\n\n\*\*Decision:\*\* Rejected: cap excludes data loss/);
 assert.match(md,/> Line one\n> Line two/);assert.match(md,/\*\*Decision:\*\* Merged into R-001/);
 assert.match(md,/Supplier terms §4 — Dispatch within 5 business days _\(disputed ⚠️\)_ · \[link\]\(https:\/\/example.com\/terms\)/);
 assert.match(md,/\[Dispatch chat\]\(https:\/\/claude.ai\/chat\/abc-123\)/);
 assert.ok(md.indexOf('## R-001')<md.indexOf('## R-002')&&md.indexOf('## R-002')<md.indexOf('## R-003'));
 const snapshot=await ReviewStore.read();assert.throws(()=>ReviewExport.decisionsMarkdown(snapshot,'missing'),/Choose a project/);

 // Review prompt: terse instructions are complete; earlier rounds and flagged sources are included.
 const fetches=[];const settings={provider:'anthropic',apiKeys:{anthropic:'k',gemini:'g'}};
 const win={WriteFlow:{Storage:{getSettings:async()=>settings,incrementUsage:()=>{}}}};
 const actx=vm.createContext({window:win,URL,DOMException,setTimeout,clearTimeout,navigator:{onLine:true},console,
   fetch:async(url,init)=>{fetches.push({url,body:JSON.parse(init.body)});return {ok:true,json:async()=>url.includes('anthropic')?{content:[{text:'Analysis'}]}:{candidates:[{content:{parts:[{text:'Analysis'}]}}]}};}});
 vm.runInContext(fs.readFileSync('services/ai.js','utf8'),actx);const AI=win.WriteFlow.AI;
 const history=[{mode:'explain',instruction:'Explain',answer:'The cap is 2x fees under reg 12.',flaggedSources:[{citation:'Reg 12',status:'withdrawn'}]},{mode:'quantify',instruction:'Quantify',answer:'Exposure is 40,000.',flaggedSources:[]}];
 const {system,user}=AI.buildReviewPrompt({id:'R-001',statement:'Cap covers exposure',source:null,history},{mode:'challenge',instruction:'Does this apply?'});
 assert.match(system,/complete instruction/);assert.match(system,/never ask the reviewer to elaborate/);assert.match(system,/do not silently restate/);
 assert.match(user,/Round 1 \(explain\) instruction: Explain\nAnswer: The cap is 2x fees under reg 12.\nSource marked withdrawn by reviewer: Reg 12/);
 assert.ok(user.indexOf('Round 1')<user.indexOf('Round 2'));assert.match(user,/Instruction: Does this apply\?/);
 const many=Array.from({length:10},(_,i)=>({mode:'custom',instruction:'Step '+(i+1),answer:'y'.repeat(5000)}));
 const trimmed=AI.buildReviewPrompt({id:'R-002',statement:'s',history:many},{mode:'custom',instruction:'Next'}).user;
 assert.match(trimmed,/Round 10 \(custom\)/);assert.doesNotMatch(trimmed,/Round 1 \(custom\)/);assert.match(trimmed,/earlier rounds omitted for length/);
 assert.doesNotMatch(AI.buildReviewPrompt({id:'R-003',statement:'s'},{mode:'explain',instruction:'Explain'}).user,/Earlier rounds/);
 // Review answers get a larger output budget than writing commands.
 const answer=await AI.generateReview({item:{id:'R-001',statement:'Cap',history},round:{mode:'quantify',instruction:'Quantify'}});
 assert.equal(answer.text,'Analysis');assert.equal(fetches[0].body.max_tokens,4000);assert.match(fetches[0].body.messages[0].content,/Round 2 \(quantify\)/);
 settings.provider='gemini';await AI.generateReview({item:{id:'R-001',statement:'Cap'},round:{mode:'explain',instruction:'Explain'}});
 assert.equal(fetches[1].body.generationConfig.maxOutputTokens,4000);
 settings.provider='mock';assert.match((await AI.generateReview({item:{id:'R-1',statement:'s',history},round:{mode:'explain',instruction:'Explain'}})).text,/Earlier rounds supplied as context: 2/);
 console.log('PASS: close requires decision; reopen/re-close keeps both notes; capture attaches as answered round with link; no reuse/overwrite; backup/restore keeps notes and captures; decisions Markdown; review prompt carries earlier rounds and flagged sources with newest kept; 4000-token review budget.');
})().catch(e=>{console.error(e);process.exitCode=1});
