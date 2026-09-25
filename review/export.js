/* Decisions export: a paste-ready Markdown summary of one project, meant for
   a shared page (Notion, a wiki, an email). The JSON record stays the
   complete backup; this is the readable view for other people. */
(() => {
  const line = value => String(value || '').replace(/\s+/g, ' ').trim();
  const quote = value => String(value || '').trim().split('\n').map(x => '> ' + x).join('\n');
  const day = value => String(value || '').slice(0, 10);
  function closedAt(item) { for (let i = item.events.length - 1; i >= 0; i -= 1) if (item.events[i].status === 'closed') return item.events[i].at; return ''; }
  function decisionsMarkdown(state, projectId, now = new Date()) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) throw new Error('Choose a project first.');
    const items = state.items.filter(i => i.projectId === projectId);
    const closed = items.filter(i => i.status === 'closed').sort((a, b) => a.id.localeCompare(b.id, undefined, {numeric: true}));
    const count = status => items.filter(i => i.status === status).length;
    const out = [`# ${line(project.name)} — decisions`, '',
      `Exported ${day(now.toISOString())} from WriteFlow Review. ${closed.length} closed · ${count('pending')} pending · ${count('open')} open.`, ''];
    if (!closed.length) out.push('_No closed items yet._', '');
    for (const item of closed) {
      const decision = ReviewStore.decision(item);
      out.push(`## ${item.id}${item.section ? ' · ' + line(item.section) : ''}`, '', quote(item.statement), '',
        `**Decision:** ${decision ? line(decision) : '_not recorded (closed before decisions were required)_'}  `,
        `**Closed:** ${day(closedAt(item))} · **Rounds:** ${(item.rounds || []).length}`);
      if (item.source?.url) out.push(`**Captured from:** [${line(item.source.title) || item.source.url}](${item.source.url})`);
      const sources = (state.sources || []).filter(src => src.links.some(l => l.itemId === item.id));
      if (sources.length) {
        out.push('', '**Sources relied on:**');
        for (const src of sources) {
          const flag = ['disputed', 'withdrawn'].includes(src.status) ? ' ⚠️' : '';
          out.push(`- ${line(src.citation)} — ${line(src.proposition)} _(${src.status}${flag})_${src.url ? ` · [link](${src.url})` : ''}`);
        }
      }
      const captured = (item.rounds || []).filter(r => r.mode === 'capture' && r.answer?.url);
      if (captured.length) {
        out.push('', '**Linked conversations:**');
        for (const r of captured) out.push(`- [${line(r.answer.title) || r.answer.url}](${r.answer.url}) — ${line(r.instruction)}`);
      }
      out.push('');
    }
    return out.join('\n');
  }
  globalThis.ReviewExport = {decisionsMarkdown};
})();
