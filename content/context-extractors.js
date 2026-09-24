// Compatibility facade: normalized context, no DOM logic in prompts or UI.
window.WriteFlow = window.WriteFlow || {};
window.WriteFlow.normalizeHost = host => String(host || '').toLowerCase().replace(/^www\./, '');
window.WriteFlow.PlatformCharLimits = { 'twitter.com': 280, 'x.com': 280, 'linkedin.com': 1250 };
window.WriteFlow.ContextUtils = { capContext: value => window.WriteFlow.ContextModel.serialize(value), CONTEXT_CHAR_LIMIT: 6000 };
window.WriteFlow.ContextExtractorRegistry = {
  getExtractor(hostname) {
    const adapter = window.WriteFlow.PlatformRegistry.getAdapter(hostname);
    return adapter.capabilities.contextualReply ? { ...adapter, extractPostText: adapter.extractContext } : null;
  }
};
