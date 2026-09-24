window.WriteFlow = window.WriteFlow || {};
window.WriteFlow.ContextDOM = (() => {
  const parent = node => node?.parentElement || node?.getRootNode?.()?.host || null;
  function closest(node, selector) {
    for (; node; node = parent(node)) if (node.matches?.(selector)) return node;
    return null;
  }
  function queryAll(root, selector) {
    if (!root) return [];
    const results = [...root.querySelectorAll(selector)];
    for (const node of root.querySelectorAll('*')) if (node.shadowRoot) results.push(...queryAll(node.shadowRoot, selector));
    return [...new Set(results)];
  }
  function visible(node) {
    if (!node?.isConnected || !node.getClientRects().length) return false;
    for (let el = node; el; el = parent(el)) {
      if (el.hidden || el.getAttribute?.('aria-hidden') === 'true') return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return true;
  }
  function text(node, field) {
    if (!node || !visible(node) || node === field || node.contains?.(field)) return '';
    const parts = [];
    const excluded = 'button, input, textarea, [contenteditable], [role="textbox"], script, style';
    function visit(el) {
      if (el.nodeType === Node.TEXT_NODE) { parts.push(el.textContent); return; }
      if (!(el instanceof Element) || el.matches(excluded) || !visible(el)) return;
      for (const child of el.childNodes) visit(child);
    }
    visit(node);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }
  function body(scope, selector, ownerSelector, field) {
    return queryAll(scope, selector).find(node => {
      const owner = closest(node, ownerSelector);
      return (!owner || owner === scope) && text(node, field);
    }) || null;
  }
  function associated(field, selector) {
    const direct = closest(field, selector);
    if (direct) return direct;
    // The field isn't a literal descendant of the post (the normal case
    // for most feed layouts: a top-level "write a comment" box sits near
    // the post as a sibling, not nested inside it). Walk up from the
    // field, and at each ancestor level check whether that scope contains
    // exactly one visible match \u2014 this generalizes the old dialog-only
    // fallback to any reasonably-scoped wrapper (a feed item card, an
    // article wrapper) without searching the whole document unscoped.
    // An unscoped "nearest match anywhere on the page" search is exactly
    // what previously caused a real bug elsewhere: a comment box grabbing
    // an unrelated user's comment instead of the actual post. If a scope
    // ever contains more than one candidate, stop and return null rather
    // than guess which one is relevant.
    for (let scope = parent(field); scope; scope = parent(scope)) {
      const candidates = queryAll(scope, selector).filter(visible);
      if (candidates.length === 1) return candidates[0];
      if (candidates.length > 1) return null;
    }
    return null;
  }
  const hostMatches = (host, domain) => host === domain || host.endsWith('.' + domain);
  return { parent, closest, queryAll, visible, text, body, associated, hostMatches };
})();
