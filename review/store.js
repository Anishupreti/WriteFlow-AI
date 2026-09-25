/* Local transactional review storage. No provider calls or shared setting writes. */
(() => {
  const statuses = ['open', 'pending', 'closed'];
  const dbReady = new Promise((resolve, reject) => {
    const request = indexedDB.open('writeflow-review', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  function blank() { return { version: 2, next: 1, projects: [], items: [], drafts: {}, sources: [] }; }
  async function access(change) {
    const db = await dbReady;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('state', change ? 'readwrite' : 'readonly');
      const store = tx.objectStore('state');
      const get = store.get('workspace'); let result; let failure;
      get.onsuccess = () => {
        try {
          const state = get.result || blank();
          result = change ? change(state) : state;
          if (change) store.put(state, 'workspace');
        } catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(failure || tx.error || new Error('Unable to save review data.'));
    });
  }
  function required(value, max) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('Please enter some text.');
    if (value.length > max) throw new Error(`Please use at most ${max.toLocaleString()} characters.`);
    return value.trim();
  }
  function cleanUrl(value) {
    try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) return ''; url.search = ''; url.hash = ''; url.username = ''; url.password = ''; return url.href; } catch { return ''; }
  }
  // Decision recorded by the latest close, or '' when the item is not closed.
  function decision(item) { if (item.status !== 'closed') return ''; for (let i = item.events.length - 1; i >= 0; i -= 1) if (item.events[i].status === 'closed') return item.events[i].note || ''; return ''; }
  globalThis.ReviewStore = {
    decision,
    read: () => access(),
    // Validation happens before the write transaction. One commit replaces the complete record.
    restore: raw => { const valid = ReviewBackup.validate(raw); return access(s => { for (const key of Object.keys(s)) delete s[key]; Object.assign(s, valid); return {projects: s.projects.length, items: s.items.length}; }); },
    importRows: (projectId, rows) => access(s => {
      if(!s.projects.some(p=>p.id===projectId))throw new Error('Choose a project.');
      if(!Array.isArray(rows)||!rows.length||rows.length>3000)throw new Error('Invalid import size.');
      const existing=new Set(s.items.map(i=>i.id));const original=new Set();let cursor=s.next;
      const imported=rows.map(row=>{
        const ref=required(row.id,80),statement=required(row.statement,50000);
        if(original.has(ref))throw new Error(`Duplicate imported ID: ${ref}`);original.add(ref);
        if(!statuses.includes(row.status))throw new Error(`Unknown status for ${ref}.`);
        if(!Array.isArray(row.rounds)||row.rounds.length>500)throw new Error('Too many review rounds.');
        let id;
        if(/^R-[0-9]{3,}$/.test(ref)){const num=Number(ref.slice(2));if(!Number.isSafeInteger(num)||num>=1000000000)throw new Error('Imported ID exceeds the supported range.');id=ref;cursor=Math.max(cursor,num+1);}else {do{id='R-'+String(cursor++).padStart(3,'0');}while(existing.has(id)||original.has(id));}
        if(existing.has(id))throw new Error(`ID ${id} already exists. Import into a new project or resolve the collision.`);
        existing.add(id);
        const now=new Date().toISOString();
        const rounds=row.rounds.map(pair=>({id:crypto.randomUUID(),mode:'custom',instruction:required(pair.instruction,5000),at:now,answer:pair.answer?{text:required(pair.answer,100000),at:now,provider:'Imported Excel',demonstration:false}:null}));
        const events=[{type:'created',at:now,status:'open'}];if(row.status!=='open')events.push({type:'status',at:now,from:'open',status:row.status});
        return {id,projectId,statement,status:row.status,createdAt:now,source:null,section:String(row.section||'').slice(0,200),importRef:ref,events,rounds};
      });
      s.next=Math.max(cursor,s.next);s.items.push(...imported);return {count:imported.length,ids:imported.map(i=>i.id)};
    }),
    source: (itemId, roundId, data) => access(s => {
      const item=s.items.find(i=>i.id===itemId);const round=item?.rounds?.find(r=>r.id===roundId);
      if (!round?.answer) throw new Error('Link evidence to a saved answer.');
      const source={id:crypto.randomUUID(),projectId:item.projectId,citation:required(data.citation,1000),proposition:required(data.proposition,3000),url:cleanUrl(data.url),status:'unchecked',links:[{itemId,roundId}],events:[{status:'unchecked',at:new Date().toISOString()}]};
      (s.sources ||= []).push(source);return source;
    }),
    linkSource: (id,itemId,roundId) => access(s => {
      const source=s.sources?.find(x=>x.id===id),item=s.items.find(i=>i.id===itemId),round=item?.rounds?.find(r=>r.id===roundId);
      if (!source || !round?.answer || source.projectId!==item.projectId) throw new Error('Source and answer must belong to the same project.');
      if (!source.links.some(l=>l.itemId===itemId&&l.roundId===roundId)) source.links.push({itemId,roundId}); return source;
    }),
    sourceStatus: (id,status) => access(s => {
      if (!['unchecked','supported','disputed','withdrawn'].includes(status)) throw new Error('Invalid evidence status.');
      const source=s.sources?.find(x=>x.id===id);if (!source) throw new Error('Source no longer exists.');
      if (source.status!==status) {source.status=status;source.events.push({status,at:new Date().toISOString()});}
      return source;
    }),
    ask: (itemId, mode, instruction) => access(s => {
      if (!['explain','quantify','challenge','custom'].includes(mode)) throw new Error('Invalid review action.');
      const item = s.items.find(i => i.id === itemId); if (!item) throw new Error('Item no longer exists.');
      const round = {id: crypto.randomUUID(), mode, instruction: required(instruction, 5000), at: new Date().toISOString(), answer: null};
      (item.rounds ||= []).push(round); return {round, item: {id:item.id, statement:item.statement, source:item.source}};
    }),
    answer: (itemId, roundId, data) => access(s => {
      const item = s.items.find(i => i.id === itemId); const round = item?.rounds?.find(r => r.id === roundId);
      if (!round) throw new Error('Instruction no longer exists.');
      if (round.answer) throw new Error('This instruction was already answered. Start a new round for a correction.');
      round.answer = {text: required(data.text,100000), at:new Date().toISOString(), provider: String(data.provider || '').slice(0,80), demonstration:data.demonstration === true};
      return round;
    }),
    project: name => access(s => { const project = { id: crypto.randomUUID(), name: required(name, 100) }; s.projects.push(project); return project; }),
    draft: data => access(s => { const id = crypto.randomUUID(); s.drafts[id] = { text: required(data.text, 50000), url: cleanUrl(data.url), title: String(data.title || '').slice(0, 300), at: new Date().toISOString() }; return id; }),
    discard: id => access(s => { delete s.drafts[id]; }),
    create: data => access(s => {
      if (!s.projects.some(p => p.id === data.projectId)) throw new Error('Choose a project first.');
      const statement = required(data.text, 50000);
      const draft = data.draftId ? s.drafts[data.draftId] : null;
      if (data.draftId && !draft) throw new Error('This capture was already saved or discarded.');
      if(s.next>=1000000000)throw new Error('Item sequence is full.');
      const now = new Date().toISOString();
      const item = { id: 'R-' + String(s.next++).padStart(3, '0'), projectId: data.projectId, statement, status: 'open', createdAt: now,
        source: draft ? { url: draft.url, title: draft.title, capturedAt: draft.at, originalText: draft.text } : null,
        events: [{ type: 'created', at: now, status: 'open' }], rounds: [] };
      s.items.push(item); if (draft) delete s.drafts[data.draftId]; return item;
    }),
    // Closing records the decision in a few words; the note lives on the
    // status event, so reopening and re-closing keeps every earlier decision.
    status: (id, status, note) => access(s => {
      if (!statuses.includes(status)) throw new Error('Invalid status.');
      const decision = status === 'closed' ? required(note, 500) : '';
      const item = s.items.find(i => i.id === id); if (!item) throw new Error('Item no longer exists.');
      if (item.status !== status) { item.events.push({ type: 'status', from: item.status, status, at: new Date().toISOString(), ...(decision ? {note: decision} : {}) }); item.status = status; }
      return item;
    }),
    // A captured selection (typically a chat answer) becomes a new answered
    // round on an existing item, keeping the page link for context.
    attach: (itemId, draftId, instruction) => access(s => {
      const draft = s.drafts[draftId]; if (!draft) throw new Error('This capture was already saved or discarded.');
      const item = s.items.find(i => i.id === itemId); if (!item) throw new Error('Choose an item to attach this capture to.');
      const now = new Date().toISOString();
      let host = ''; try { host = new URL(draft.url).hostname; } catch {}
      const round = {id: crypto.randomUUID(), mode: 'capture', instruction: required(instruction || 'Captured answer', 5000), at: now,
        answer: {text: draft.text, at: now, provider: (host ? 'Captured from ' + host : 'Captured selection').slice(0, 80), demonstration: false, url: draft.url, title: draft.title}};
      (item.rounds ||= []).push(round); delete s.drafts[draftId]; return {item, round};
    })
  };
})();
