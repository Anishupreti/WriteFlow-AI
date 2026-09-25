const $ = id => document.getElementById(id);
const statuses = ['open', 'pending', 'closed'];
let state, projectId = '', selectedId = '', draftId = '', busy = false, filter = 'all', noticeTimer;
function preference(key, value) { try { if (value === undefined) return localStorage.getItem('wf-review-ui-' + key); localStorage.setItem('wf-review-ui-' + key, value); } catch {} }
projectId = preference('project') || ''; selectedId = preference('item') || '';
function node(tag, text, className) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; return e; }
function message(text, error = false) { if ($('detail').open && $('detail-notice')) { $('detail-notice').textContent = text; $('detail-notice').setAttribute('role', error ? 'alert' : 'status'); return; } clearTimeout(noticeTimer); $('message').textContent = text; $('message').setAttribute('role', error ? 'alert' : 'status'); if (!error) noticeTimer = setTimeout(() => { $('message').textContent = ''; }, 6000); }
async function run(action) { if (busy) return; busy = true; document.body.setAttribute('aria-busy', 'true'); $('save-item').disabled = true; try { await action(); } catch (error) { message(error.message || 'Unable to save. Your text has been kept.', true); } finally { busy = false; document.body.removeAttribute('aria-busy'); $('save-item').disabled = !projectId; } }
function date(value) { return new Date(value).toLocaleString(undefined, {dateStyle:'medium',timeStyle:'short'}); }
function sourceName(item) { try { return new URL(item.source.url).hostname; } catch { return 'Added manually'; } }
function openComposer() { if (!projectId) { $('project-create').open = true; $('project-name').focus(); return; } $('item-form').hidden = false; $('statement').focus(); }
function persistSelection() { preference('project', projectId); preference('item', selectedId); }
function closeDetail() { if ($('detail').open) $('detail').close(); }
// Keep keyboard navigation within the drawer, including wraparound.
$('detail').addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = [...$('detail').querySelectorAll('button:not(:disabled), select:not(:disabled), a[href], summary')].filter(el => el.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
$('detail').addEventListener('close', () => { const row = Array.from(document.querySelectorAll('.item')).find(el => el.dataset.id === selectedId); if (row) row.focus(); else $('search').focus(); });
function setFilter(next) { filter = next; renderBoard(); }
function renderBoard() {
  const items = state.items.filter(i => i.projectId === projectId);
  const query = $('search').value.trim().toLocaleLowerCase();
  const matches = items.filter(i => (filter === 'all' || i.status === filter) && `${i.id} ${i.statement} ${i.source?.title || ''} ${i.source?.url || ''}`.toLocaleLowerCase().includes(query));
  $('total-count').textContent = items.length;
  for (const status of statuses) $(status + '-count').textContent = items.filter(i => i.status === status).length;
  document.querySelectorAll('[data-filter]').forEach(b => { const active = b.dataset.filter === filter; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  $('count').textContent = `${matches.length} of ${items.length} items`;
  $('clear-filters').hidden = filter === 'all' && !query;
  $('board').replaceChildren();
  if (!items.length || !matches.length) {
    const empty = node('section', undefined, 'welcome');
    empty.append(node('span', !items.length ? '✧' : '⌕', 'empty-mark'));
    empty.append(node('h2', !projectId ? 'Start with one project.' : !items.length ? 'Every review starts with a question.' : 'No matching items.'));
    empty.append(node('p', !projectId ? 'Give your review a name. Then collect questions, claims and evidence in one place.' : !items.length ? 'Add your first item, or select text on a webpage and choose “Save selection to Review”.' : 'Try a different phrase or clear your filters to see the complete register.'));
    const action = node('button', !projectId ? 'Create your first project' : !items.length ? '+ Add your first item' : 'Clear filters', 'primary');
    action.onclick = !items.length ? openComposer : clearFilters; empty.append(action); $('board').append(empty); return;
  }
  for (const status of statuses) {
    if (filter !== 'all' && filter !== status) continue;
    const list = matches.filter(i => i.status === status); if (query && !list.length) continue;
    const section = node('section', undefined, `group ${status}`); const heading = node('h3'); heading.append(node('i', undefined, `dot ${status}`), node('span', `${status} · ${list.length}`)); section.append(heading);
    for (const item of list) {
      const b = node('button', undefined, 'item'); b.dataset.id = item.id; b.setAttribute('aria-pressed', String(item.id === selectedId)); b.setAttribute('aria-haspopup', 'dialog');
      const copy = node('span', undefined, 'item-copy'); copy.append(node('span', item.statement, 'item-text'), node('small', `${item.section ? item.section+' · ' : ''}${item.importRef && item.importRef!==item.id ? item.importRef+' · ' : ''}${sourceName(item)} · ${new Date(item.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`));
      const arrow = node('span', '›', 'chevron'); arrow.setAttribute('aria-hidden', 'true'); b.append(node('strong', item.id), copy, arrow);
      b.onclick = () => { selectedId = item.id; persistSelection(); renderBoard(); renderDetail(item); $('detail').showModal(); }; section.append(b);
    }
    if (!list.length) section.append(node('p', `No ${status} items.`, 'empty')); $('board').append(section);
  }
}
async function refresh() {
  state = await ReviewStore.read();
  if (!state.projects.some(p => p.id === projectId)) projectId = state.projects[0]?.id || '';
  $('project').replaceChildren(...state.projects.map(p => { const o = node('option', p.name); o.value = p.id; return o; }));
  if (!projectId) { const placeholder = node('option', 'Create your first project'); placeholder.value = ''; $('project').append(placeholder); }
  $('project').value = projectId; $('project').disabled = !projectId; $('save-item').disabled = busy || !projectId; $('new-item').disabled = !projectId;
  $('project-title').textContent = state.projects.find(p => p.id === projectId)?.name || 'A clear place to start.';
  $('project-description').textContent = projectId ? 'Keep the questions, evidence and decisions together.' : 'Create a project to bring your questions and evidence together.';
  if (!projectId) $('project-create').open = true;
  if (!state.items.some(i => i.id === selectedId && i.projectId === projectId)) selectedId = '';
  persistSelection(); renderBoard(); renderEvidenceAlert();
  $('drafts').replaceChildren(); const drafts = Object.entries(state.drafts); $('draft-count').textContent = drafts.length;
  for (const [id, draft] of drafts) { const d = node('div', undefined, 'draft'); const b = node('button', undefined, 'secondary'); b.append(node('span', draft.text.slice(0, 90)), node('small', 'Review capture →')); b.onclick = () => loadDraft(id); d.append(b); $('drafts').append(d); }
  if (!drafts.length) $('drafts').append(node('div', 'Nothing waiting. Highlight text on a webpage and right-click to save it here.', 'capture-empty'));
}
function renderEvidenceAlert() {
  const flagged=(state.sources||[]).filter(x=>x.projectId===projectId && ['disputed','withdrawn'].includes(x.status));
  const ids=new Set(flagged.flatMap(x=>x.links.map(l=>l.itemId))); const banner=$('evidence-alert');
  banner.hidden=!flagged.length;banner.replaceChildren();
  if(flagged.length){banner.append(node('strong',`${flagged.length} disputed or withdrawn source${flagged.length===1?'':'s'} affect ${ids.size} item${ids.size===1?'':'s'}.`));
    const links=node('div',undefined,'affected-links');
    for(const id of [...ids].slice(0,20)){const b=node('button',id,'secondary');b.onclick=()=>{clearFilters();const row=Array.from(document.querySelectorAll('.item')).find(el=>el.dataset.id===id);row?.click();};links.append(b);}banner.append(links);
    if(ids.size>20)banner.append(node('span',`And ${ids.size-20} more affected items. Search by item ID.`,'hint'));
  }
}
function loadDraft(id) {
  const d = state.drafts[id]; if (!d) return;
  if ($('statement').value.trim() && draftId !== id && !confirm('Replace the unsaved text in the item form?')) return;
  draftId = id; $('statement').value = d.text; $('capture-label').textContent = 'Review captured selection'; $('source-preview').textContent = d.url ? `Source: ${d.url}` : 'No public source URL'; $('cancel-draft').hidden = false;
  $('item-form').hidden = false; if (!projectId) { $('project-create').open = true; message('Create a project, then save your captured selection.'); $('project-name').focus(); } else $('statement').focus();
}
function resetDraft() { draftId = ''; $('statement').value = ''; $('capture-label').textContent = 'New review item'; $('source-preview').textContent = ''; $('cancel-draft').hidden = true; history.replaceState(null, '', location.pathname); }
function renderDetail(item) {
  const focusedId = $('detail').contains(document.activeElement) ? document.activeElement.id : '';
  $('detail').replaceChildren();
  const top = node('div', undefined, 'detail-top'); top.append(node('span', item.id)); const close = node('button', '×', 'icon-button'); close.setAttribute('aria-label', 'Close item details'); close.id = 'close-detail'; close.onclick = closeDetail; top.append(close); $('detail').append(top);
  const content = node('div', undefined, 'detail-content'); const notice = node('p', '', 'detail-notice'); notice.id = 'detail-notice'; notice.setAttribute('role', 'status'); content.append(notice); const title = node('h2', 'Review item'); title.id = 'detail-title'; content.append(title, node('div', item.statement, 'statement'));
  const statusSection = node('section', undefined, 'detail-section'); const label = node('label', 'Review status'); label.htmlFor = 'item-status'; const select = node('select'); select.id = 'item-status';
  for (const status of statuses) { const o = node('option', status[0].toUpperCase() + status.slice(1)); o.value = status; select.append(o); } select.value = item.status;
  select.onchange = () => run(async () => { const next = select.value; select.disabled = true; try { const updated = await ReviewStore.status(item.id, next); await refresh(); renderDetail(updated); message(`${item.id} moved to ${next}.`); } catch (error) { select.value = item.status; throw error; } finally { select.disabled = false; } });
  statusSection.append(label, select, node('p', 'Each status change is added to the history below.', 'hint')); content.append(statusSection);
  const source = node('section', undefined, 'detail-section'); source.append(node('h3', 'Source & original capture'));
  if (item.source) { if (item.source.url) { const a = node('a', item.source.title || item.source.url); a.href = item.source.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; source.append(a); } source.append(node('p', `Captured ${date(item.source.capturedAt)}`, 'hint')); const details = node('details'); details.append(node('summary', 'Read original selection'), node('pre', item.source.originalText)); source.append(details); }
  else source.append(node('p', 'Added manually. No webpage source was captured.', 'hint')); content.append(source);
  const roundsSection = node('section', undefined, 'detail-section'); roundsSection.append(node('h3', 'Review rounds'));
  const roundForm = node('form', undefined, 'round-form');
  const modeLabel = node('label', 'Review action'); modeLabel.htmlFor = 'review-mode'; const mode = node('select'); mode.id='review-mode';
  for (const name of ['explain','quantify','challenge','custom']) { const option=node('option',name[0].toUpperCase()+name.slice(1));option.value=name;mode.append(option); }
  const promptLabel=node('label','Your instruction');promptLabel.htmlFor='review-instruction';
  const prompt=node('textarea');prompt.id='review-instruction';prompt.maxLength=5000;prompt.rows=2;prompt.required=true;prompt.placeholder='A few words are enough, e.g. “Quantify”.';prompt.value='Explain';
  mode.onchange=()=>{ if (['Explain','Quantify','Challenge','Custom'].includes(prompt.value)) prompt.value=mode.options[mode.selectedIndex].text; };
  const go=node('button','Ask AI','primary');go.type='submit';
  roundForm.append(modeLabel,mode,promptLabel,prompt,go,node('p','The instruction is saved before a provider request. A failed request stays pending so you can retry it. Captured sources are not independently verified.','hint'));
  roundForm.onsubmit=e=>{e.preventDefault();run(async()=>{
    const request=await ReviewStore.ask(item.id,mode.value,prompt.value);
    await refresh();if ($('detail').open && selectedId===item.id) renderDetail(state.items.find(i=>i.id===item.id));
    await generateRound(request.item,request.round);
  });}; roundsSection.append(roundForm);
  const rounds=item.rounds || []; if (!rounds.length) roundsSection.append(node('p','No review rounds yet. Start with Explain or write a short instruction.','hint'));
  for (const round of [...rounds].reverse()) {
    const entry=node('article',undefined,'round-entry');const header=node('div',undefined,'round-head');header.append(node('strong',round.mode.toUpperCase()),node('small',date(round.at)));entry.append(header,node('p',round.instruction,'round-instruction'));
    if (round.answer) { entry.append(node('span',round.answer.demonstration?'MOCK DEMONSTRATION':'ANSWER SAVED','answer-label'),node('div',round.answer.text,'answer-text'),node('small',`${round.answer.provider || 'Provider'} · ${date(round.answer.at)}`)); }
    else { const retry=node('button','Generate pending answer','secondary');retry.type='button';retry.onclick=()=>run(()=>generateRound({id:item.id,statement:item.statement,source:item.source},round));entry.append(node('p','Waiting for an answer. This instruction is preserved.','hint'),retry); }
    roundsSection.append(entry);
  }
  content.append(roundsSection);
  const sourcesSection=node('section',undefined,'detail-section');sourcesSection.append(node('h3','Sources & dependency checks'));
  const linked=(state.sources||[]).filter(x=>x.links.some(l=>l.itemId===item.id));
  if (!linked.length) sourcesSection.append(node('p','No evidence linked yet. Answers remain unverified until you review and add their sources.','hint'));
  for(const src of linked){
    const card=node('article',undefined,'source-entry');card.append(node('strong',src.citation),node('p',`Supports: ${src.proposition}`,'hint'));
    if(src.url){const anchor=node('a',src.url);anchor.href=src.url;anchor.target='_blank';anchor.rel='noopener noreferrer';card.append(anchor);}
    const refs=node('p',`Linked to ${src.links.map(l=>l.itemId).join(', ')} · ${src.events.length} review state${src.events.length===1?'':'s'}`,'hint');card.append(refs);
    const sourceLabel=node('label','Evidence review status');sourceLabel.htmlFor=`source-${src.id}`;const select=node('select');select.id=`source-${src.id}`;
    for(const name of ['unchecked','supported','disputed','withdrawn']){const option=node('option',name[0].toUpperCase()+name.slice(1));option.value=name;select.append(option);}select.value=src.status;
    select.onchange=()=>run(async()=>{const next=select.value;await ReviewStore.sourceStatus(src.id,next);await refresh();if($('detail').open)renderDetail(state.items.find(i=>i.id===item.id));message(`Source marked ${next}. ${next==='disputed'||next==='withdrawn'?'Linked items need review.':''}`);});
    card.append(sourceLabel,select);sourcesSection.append(card);
  }
  const answered=rounds.filter(r=>r.answer);
  if(answered.length){
    const form=node('form',undefined,'round-form');const roundLabel=node('label','Answer this source supports');roundLabel.htmlFor='source-round';const picker=node('select');picker.id='source-round';for(const r of answered){const option=node('option',`${r.mode} · ${r.instruction.slice(0,80)}`);option.value=r.id;picker.append(option);}
    const citationLabel=node('label','Source citation');citationLabel.htmlFor='source-citation';const citation=node('input');citation.id='source-citation';citation.maxLength=1000;citation.placeholder='Document, section or page';citation.required=true;
    const propositionLabel=node('label','Exact proposition supported');propositionLabel.htmlFor='source-proposition';const proposition=node('textarea');proposition.id='source-proposition';proposition.maxLength=3000;proposition.rows=2;proposition.placeholder='What does this source actually establish?';proposition.required=true;
    const urlLabel=node('label','URL (optional)');urlLabel.htmlFor='source-url';const urlInput=node('input');urlInput.id='source-url';urlInput.type='url';urlInput.placeholder='https://…';
    const add=node('button','Add source','secondary');add.type='submit';form.append(roundLabel,picker,citationLabel,citation,propositionLabel,proposition,urlLabel,urlInput,add);
    form.onsubmit=e=>{e.preventDefault();run(async()=>{await ReviewStore.source(item.id,picker.value,{citation:citation.value,proposition:proposition.value,url:urlInput.value});await refresh();if($('detail').open)renderDetail(state.items.find(i=>i.id===item.id));message('Source added as unchecked. Review it before marking it supported.');});};
    sourcesSection.append(form);
    const available=(state.sources||[]).filter(x=>x.projectId===item.projectId&&!x.links.some(l=>l.itemId===item.id&&l.roundId===picker.value));
    if(available.length){const linkForm=node('form',undefined,'round-form');const existingLabel=node('label','Link an existing project source');existingLabel.htmlFor='existing-source';const existing=node('select');existing.id='existing-source';for(const src of available){const option=node('option',src.citation);option.value=src.id;existing.append(option);}const linkBtn=node('button','Link to selected answer','secondary');linkBtn.type='submit';linkForm.append(existingLabel,existing,linkBtn);linkForm.onsubmit=e=>{e.preventDefault();run(async()=>{await ReviewStore.linkSource(existing.value,item.id,picker.value);await refresh();if($('detail').open)renderDetail(state.items.find(i=>i.id===item.id));message('Source linked to this answer.');});};sourcesSection.append(linkForm);}
  }
  content.append(sourcesSection);
  const historySection = node('section', undefined, 'detail-section'); historySection.append(node('h3', 'Activity history')); const ol = node('ol', undefined, 'timeline');
  for (const event of [...item.events].reverse()) { const li = node('li', event.type === 'created' ? 'Item created · Open' : `${event.from} → ${event.status}`); const time = node('time', date(event.at)); time.dateTime = event.at; li.append(time); ol.append(li); } historySection.append(ol); content.append(historySection); $('detail').append(content);
  if (focusedId && $(focusedId)) $(focusedId).focus();
}
async function generateRound(item,round) {
  const result=await window.WriteFlow.AI.generateReview({item,round});
  await ReviewStore.answer(item.id,round.id,result);
  await refresh();
  if ($('detail').open && selectedId===item.id) renderDetail(state.items.find(i=>i.id===item.id));
  message(result.demonstration ? 'Mock demonstration saved. No sources were checked.' : 'Answer saved to this instruction.');
}
function clearFilters() { filter = 'all'; $('search').value = ''; renderBoard(); $('search').focus(); }
$('search').oninput = renderBoard;
$('clear-filters').onclick = clearFilters;
document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => setFilter(b.dataset.filter));
$('new-item').onclick = openComposer;
$('hide-composer').onclick = () => { $('item-form').hidden = true; $('new-item').focus(); if ($('statement').value.trim()) message('Your unsaved text is kept here. Reopen New item to continue.'); };
$('project-form').onsubmit = e => { e.preventDefault(); run(async () => { const p = await ReviewStore.project($('project-name').value); projectId = p.id; selectedId = ''; filter = 'all'; $('search').value = ''; $('project-name').value = ''; $('project-create').open = false; await refresh(); message('Project created. Add your first item.'); openComposer(); }); };
$('project').onchange = () => { projectId = $('project').value; selectedId = ''; filter = 'all'; $('search').value = ''; persistSelection(); closeDetail(); refresh().catch(e => message(e.message, true)); };
$('item-form').onsubmit = e => { e.preventDefault(); run(async () => { const item = await ReviewStore.create({projectId, text: $('statement').value, draftId}); selectedId = item.id; resetDraft(); $('item-form').hidden = true; filter = 'all'; $('search').value = ''; await refresh(); message(`${item.id} saved. Original text preserved.`); const row = Array.from(document.querySelectorAll('.item')).find(el => el.dataset.id === item.id); row?.focus(); }); };
$('cancel-draft').onclick = () => { if (!confirm('Discard this captured selection? This cannot be undone.')) return; run(async () => { await ReviewStore.discard(draftId); resetDraft(); $('item-form').hidden = true; await refresh(); $('new-item').focus(); message('Capture discarded.'); }); };
$('excel-file').onchange=async e=>{
  const file=e.target.files?.[0]; if(!file)return;
  try{
    const rows=ReviewExcel.parse(await file.arrayBuffer());
    const preview=$('excel-preview');preview.replaceChildren();preview.hidden=false;
    preview.append(node('strong',`${rows.length} items ready to import`),node('p',`First: ${rows[0].id} · ${rows[0].statement.slice(0,80)}`,'hint'),node('p','Imports the first worksheet only. A–D become item ID/status/section/statement; E/F pairs become oldest-to-newest review history. Existing items are kept.','hint'));
    const button=node('button','Import into current project','primary');button.disabled=!projectId;button.onclick=()=>run(async()=>{
      const result=await ReviewStore.importRows(projectId,rows);preview.hidden=true;preview.replaceChildren();await refresh();message(`${result.count} items imported into this project.`);
    });preview.append(button);
  }catch(error){message(error.message||'Could not read Excel file. No items were added.',true);$('excel-preview').hidden=true;}
  finally{e.target.value='';}
};
$('restore-file').onchange = async e => {
  const file=e.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 15*1024*1024) throw new Error('Backup exceeds the 15 MB restore limit.');
    const data=JSON.parse(await file.text()); const valid=ReviewBackup.validate(data);
    const current=await ReviewStore.read();
    if (!confirm(`Restore ${valid.projects.length} projects and ${valid.items.length} items? This replaces your current ${current.items.length} items. Export your current record first if you need it.`)) return;
    if ($('statement').value.trim() && !confirm('The unsaved item form will be cleared. Continue?')) return;
    closeDetail(); const restored=await ReviewStore.restore(valid);
    projectId=''; selectedId=''; filter='all'; $('search').value=''; resetDraft(); $('item-form').hidden=true; await refresh();
    message(`Restored ${restored.projects} projects and ${restored.items} items.`);
  } catch (error) { message(error.message || 'Unable to read backup. No data was changed.',true); }
  finally { e.target.value=''; }
};
$('export').onclick = () => run(async () => { const data = await ReviewStore.read(); const url = URL.createObjectURL(new Blob([JSON.stringify({format:'writeflow-review-record',exportedAt:new Date().toISOString(),...data},null,2)],{type:'application/json'})); const a = node('a'); a.href = url; a.download = 'writeflow-review-record.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); message('Record exported. Keep it somewhere safe.'); });
function setTheme(theme) { if (!['light','dark','system'].includes(theme)) theme = 'system'; $('theme').value = theme; if (theme === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme; preference('theme',theme); }
setTheme(preference('theme') || 'system'); $('theme').onchange = () => setTheme($('theme').value);
window.addEventListener('keydown', e => { if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !$('detail').open && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) { e.preventDefault(); $('search').focus(); } });
window.addEventListener('focus', () => { if (!$('detail').open) refresh().catch(e => message(e.message, true)); });
window.addEventListener('beforeunload', e => { if ($('statement').value.trim() || $('project-name').value.trim()) { e.preventDefault(); e.returnValue = ''; } });
function loadHash() { const id = new URLSearchParams(location.hash.slice(1)).get('draft'); if (id) loadDraft(id); if (location.hash === '#capture-error') message('Selection could not be saved. Copy the text and paste it here to try again.',true); }
refresh().then(loadHash).catch(e => message(e.message,true));
window.addEventListener('hashchange', () => refresh().then(loadHash).catch(e => message(e.message,true)));
