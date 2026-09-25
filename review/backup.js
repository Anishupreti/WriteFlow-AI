/* Validate untrusted JSON before an atomic restore. Never execute or merge input objects. */
(() => {
  const statuses = ['open', 'pending', 'closed'];
  const modes = ['explain', 'quantify', 'challenge', 'custom'];
  const str = (v, max, label, optional = false) => {
    if (optional && (v === undefined || v === null)) return '';
    if (typeof v !== 'string' || v.length > max || (!optional && !v.trim())) throw new Error(`Invalid ${label}.`);
    return v;
  };
  const list = (value, max, label) => { if (!Array.isArray(value) || value.length > max) throw new Error(`Invalid ${label}.`); return value; };
  const timestamp = (v, label) => { const x = str(v, 48, label); if (Number.isNaN(Date.parse(x))) throw new Error(`Invalid ${label}.`); return x; };
  const url = v => { const x = str(v, 2200, 'source URL', true); if (!x) return ''; try { const u = new URL(x); if (!['http:','https:'].includes(u.protocol) || u.username || u.password) throw 0; return x; } catch { throw new Error('Invalid source URL.'); } };
  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('This file is not a review backup.');
    if (input.format !== undefined && input.format !== 'writeflow-review-record') throw new Error('Unknown backup format.');
    if (![1,2].includes(input.version)) throw new Error('Unsupported backup version.');
    const projects = list(input.projects, 2000, 'projects').map(p => ({id: str(p?.id, 80, 'project ID'), name: str(p.name,100,'project name')}));
    const ids = new Set(projects.map(p => p.id)); if (ids.size !== projects.length) throw new Error('Duplicate project ID.');
    const items = list(input.items, 20000, 'items').map(i => {
      const id = str(i?.id, 32, 'item ID'); if (!/^R-[0-9]{3,}$/.test(id) || !ids.has(i.projectId)) throw new Error('Invalid item reference.');
      if (!statuses.includes(i.status)) throw new Error('Invalid item status.');
      const events = list(i.events, 10000, 'status events').map(e => {
        if (!['created','status'].includes(e?.type) || !statuses.includes(e.status)) throw new Error('Invalid status event.');
        if (e.type === 'status' && !statuses.includes(e.from)) throw new Error('Invalid previous status.');
        return { type: e.type, at: timestamp(e.at, 'event date'), status: e.status, ...(e.type === 'status' ? {from: e.from} : {}) };
      });
      if (!events.length || events[0].type !== 'created' || events[0].status !== 'open') throw new Error('Incomplete status history.');
      let current = 'open'; for (const e of events.slice(1)) { if (e.type !== 'status' || e.from !== current || e.status === current) throw new Error('Inconsistent status history.'); current=e.status; }
      if (current !== i.status) throw new Error('Item status does not match its history.');
      let source = null; if (i.source !== null && i.source !== undefined) source = {url:url(i.source.url),title:str(i.source.title,300,'source title',true),capturedAt:timestamp(i.source.capturedAt,'capture date'),originalText:str(i.source.originalText,50000,'original capture')};
      const rounds = list(i.rounds ?? [], 3000, 'review rounds').map(r => {
        if (!r || !modes.includes(r.mode)) throw new Error('Invalid review action.');
        let answer = null;
        if (r.answer !== null && r.answer !== undefined) answer = {text:str(r.answer.text,100000,'review answer'),at:timestamp(r.answer.at,'answer date'),provider:str(r.answer.provider,80,'provider',true),demonstration:r.answer.demonstration === true};
        return {id:str(r.id,80,'round ID'),mode:r.mode,instruction:str(r.instruction,5000,'instruction'),at:timestamp(r.at,'instruction date'),answer};
      });
      if (new Set(rounds.map(r=>r.id)).size !== rounds.length) throw new Error('Duplicate round ID.');
      return {id,projectId:i.projectId,statement:str(i.statement,50000,'statement'),status:i.status,createdAt:timestamp(i.createdAt,'created date'),source,events,rounds,section:str(i.section,200,'section',true),importRef:str(i.importRef,80,'import reference',true)};
    });
    if (new Set(items.map(i=>i.id)).size !== items.length) throw new Error('Duplicate item ID.');
    const drafts = Object.create(null);
    if (!input.drafts || typeof input.drafts !== 'object' || Array.isArray(input.drafts)) throw new Error('Invalid captures.');
    const entries=Object.entries(input.drafts); if (entries.length>5000) throw new Error('Too many captures.');
    for (const [id,d] of entries) drafts[str(id,80,'capture ID')]={text:str(d.text,50000,'capture text'),url:url(d.url),title:str(d.title,300,'capture title',true),at:timestamp(d.at,'capture date')};
    if (!Number.isSafeInteger(input.next) || input.next<1 || input.next>1000000000) throw new Error('Invalid item sequence.');
    const maxId=items.reduce((m,i)=>Math.max(m,Number(i.id.slice(2))),0);
    if (input.next<=maxId) throw new Error('Item sequence would reuse an existing ID.');
    const sources=list(input.sources ?? [],10000,'sources').map(source=>{
      if (!source || !ids.has(source.projectId) || !['unchecked','supported','disputed','withdrawn'].includes(source.status)) throw new Error('Invalid source status or project.');
      const links=list(source.links,10000,'source links').map(l=>{
        const item=items.find(i=>i.id===l?.itemId);if (!item || item.projectId!==source.projectId || !item.rounds.some(r=>r.id===l.roundId && r.answer)) throw new Error('Source refers to a missing answer.');
        return {itemId:l.itemId,roundId:l.roundId};
      });
      if (!links.length || new Set(links.map(l=>l.itemId+'|'+l.roundId)).size!==links.length) throw new Error('Invalid source links.');
      const events=list(source.events,1000,'source history').map(e=>{
        if (!['unchecked','supported','disputed','withdrawn'].includes(e?.status)) throw new Error('Invalid source event.');
        return {status:e.status,at:timestamp(e.at,'source event date')};
      });
      if (!events.length || events[0].status!=='unchecked' || events.at(-1).status!==source.status) throw new Error('Source history does not match its status.');
      return {id:str(source.id,80,'source ID'),projectId:source.projectId,citation:str(source.citation,1000,'citation'),proposition:str(source.proposition,3000,'supported proposition'),url:url(source.url),status:source.status,links,events};
    });
    if (new Set(sources.map(x=>x.id)).size!==sources.length) throw new Error('Duplicate source ID.');
    return {version:2,next:input.next,projects,items,drafts,sources};
  }
  globalThis.ReviewBackup = {validate};
})();
