// Pure, DOM-free contract shared by extraction and prompting.
window.WriteFlow = window.WriteFlow || {};
window.WriteFlow.ContextModel = (() => {
  const LIMIT = 6000;
  const clean = (value, max = LIMIT) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
  function normalize(input = {}) {
    let remaining = LIMIT;
    const take = value => { const text = clean(value, remaining); remaining -= text.length; return text; };
    const primaryText = take(input.content?.primaryText);
    const parentText = take(input.content?.parentText);
    const quotedText = take(input.content?.quotedText);
    const conversation = (Array.isArray(input.conversation) ? input.conversation : []).slice(-6).reverse().map(message => ({
      author: clean(message.author, 120), direction: ['incoming', 'outgoing'].includes(message.direction) ? message.direction : 'unknown', text: take(message.text)
    })).filter(message => message.text).reverse();
    return {
      platform: clean(input.platform || 'generic', 32), type: clean(input.type || 'post_reply', 32),
      author: { name: clean(input.author?.name, 120), role: clean(input.author?.role, 120) },
      content: { primaryText, parentText, quotedText }, conversation,
      metadata: { title: clean(input.metadata?.title, 200), timestamp: clean(input.metadata?.timestamp, 80), url: clean(input.metadata?.url, 500) }
    };
  }
  function serialize(input) {
    if (!input || typeof input !== 'object') return String(input || '').trim().slice(0, LIMIT);
    const value = normalize(input), parts = [];
    if (value.content.parentText) parts.push(`[Parent post]\n${value.content.parentText}`);
    value.conversation.forEach(message => parts.push(`[Earlier message; ${message.direction}] ${message.author}\n${message.text}`));
    if (value.content.quotedText) parts.push(`[Quoted text]\n${value.content.quotedText}`);
    if (value.content.primaryText) parts.push(`[${value.type}; reply target] ${value.author.name}\n${value.content.primaryText}`);
    return parts.join('\n\n').slice(-LIMIT);
  }
  return { normalize, serialize, LIMIT };
})();
