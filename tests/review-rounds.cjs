const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {indexedDB}=require('fake-indexeddb');
const context=vm.createContext({indexedDB,crypto:require('node:crypto').webcrypto,URL});
for(const f of ['review/backup.js','review/store.js']) vm.runInContext(fs.readFileSync(f,'utf8'),context);
const store=context.ReviewStore,backup=context.ReviewBackup;
(async()=>{
 const p=await store.project('Review');const item=await store.create({projectId:p.id,text:'Projected costs'});
 const first=await store.ask(item.id,'quantify','Quantify');const second=await store.ask(item.id,'challenge','Challenge');
 await store.answer(item.id,first.round.id,{text:'Missing rate. No estimate yet.',provider:'Mock',demonstration:true});
 await store.answer(item.id,second.round.id,{text:'Alternative assumption depends on contract.',provider:'Mock'});
 await assert.rejects(store.answer(item.id,first.round.id,{text:'silently replace'}),/already answered/);
 const correction=await store.ask(item.id,'quantify','Quantify using the newly supplied rate');
 await store.answer(item.id,correction.round.id,{text:'100 units × £3 = £300.',provider:'Mock'});
 const snapshot=await store.read();assert.deepEqual(snapshot.items[0].rounds.map(r=>r.instruction),['Quantify','Challenge','Quantify using the newly supplied rate']);assert.equal(snapshot.items[0].rounds[0].answer.text,'Missing rate. No estimate yet.');
 const old=JSON.parse(JSON.stringify(snapshot));old.version=1;old.items.forEach(i=>delete i.rounds);
 const v1=backup.validate(old);assert.equal(v1.items[0].rounds.length,0);
 for(const mutation of [d=>d.next=1,d=>d.items[0].projectId='unknown',d=>d.items[0].rounds[1].id=d.items[0].rounds[0].id,d=>d.items[0].events[0].status='closed',d=>d.items[0].rounds[0].mode='evil']){
  const data=JSON.parse(JSON.stringify(snapshot));mutation(data);assert.throws(()=>backup.validate(data));assert.equal(JSON.stringify(await store.read()),JSON.stringify(snapshot));
 }
 const duplicate=JSON.parse(JSON.stringify(snapshot));duplicate.items.push(duplicate.items[0]);assert.throws(()=>backup.validate(duplicate));
 await store.create({projectId:p.id,text:'Remove by restoring backup'});
 await store.restore(snapshot);const result=await store.read();assert.equal(result.items.length,1);assert.equal(result.items[0].rounds.length,3);
 await store.restore(old);const migrated=await store.read();assert.equal(migrated.version,2);assert.equal(migrated.items[0].rounds.length,0);
 console.log('PASS: concurrent instructions answer their original IDs; answered rounds resist overwrite; correction preserves history; validation rejects broken references/IDs/events; v1 migration; atomic restore.');
})().catch(e=>{console.error(e);process.exitCode=1});
