// Each selector contract is isolated here. Synthetic fixtures do not prove
// support for every authenticated layout; unknown layouts fail closed.
window.WriteFlow = window.WriteFlow || {};
window.WriteFlow.PlatformRegistry = (() => {
  const D = window.WriteFlow.ContextDOM, M = window.WriteFlow.ContextModel;
  const definitions = [
    { id: 'linkedin', domains: ['linkedin.com'], post: '[data-urn^="urn:li:activity"], [data-id^="urn:li:activity"], [data-activity-urn], article.main-feed-activity-card, .feed-shared-update-v2', body: '[data-test-id="main-feed-activity-card__commentary"], [data-ad-preview="message"], .feed-shared-text, .update-components-text, .feed-shared-update-v2__description, p.attributed-text-segment-list__content', comment: '.comments-comment-item, [data-test-id="comment-item"], [aria-label^="Comment by"]', commentBody: '.comments-comment-item__main-content, .comments-comment-item__inline-show-more-text, .comment__text', author: '.update-components-actor__name, .comments-post-meta__name-text' },
    { id: 'twitter', domains: ['x.com', 'twitter.com'], post: 'article[data-testid="tweet"]', body: '[data-testid="tweetText"]', author: '[data-testid="User-Name"]' },
    { id: 'facebook', domains: ['facebook.com'], post: '[role="article"], [data-pagelet^="FeedUnit"]', body: '[data-ad-rendering-role="story_message"], [data-ad-comet-preview="message"], [data-ad-preview="message"], [data-testid="post_message"]', comment: '[data-commentid], [role="article"][aria-label^="Comment by"]', commentBody: '[data-ad-rendering-role="comment_message"]' },
    { id: 'reddit', domains: ['reddit.com'], post: 'shreddit-post, .thing.link', body: '[slot="text-body"], .usertext-body .md', title: 'a.title', titleAttribute: 'post-title', comment: 'shreddit-comment, .thing.comment, [data-testid="comment"]', commentBody: '[slot="comment"], [slot="comment-body"], [data-testid="comment-body"], .usertext-body .md' },
    { id: 'youtube', domains: ['youtube.com'], post: 'ytd-watch-flexy', body: '#description-inline-expander', title: 'h1 yt-formatted-string, h1', comment: 'ytd-comment-view-model, ytd-comment-renderer', commentBody: '#content-text' },
    { id: 'gmail', domains: ['mail.google.com'], kind: 'email', scope: '[role="dialog"], .nH.if, [data-thread-id]', message: '[data-message-id], .adn.ads', body: '[data-message-body], .a3s.aiL, .ii.gt', author: '.gD, [email]', quote: '.gmail_quote, blockquote[type="cite"]' },
    { id: 'outlook', domains: ['outlook.live.com', 'outlook.office.com', 'outlook.office365.com'], kind: 'email', scope: '[role="dialog"], [data-convid]', message: '[data-email-message]', body: '[data-message-body], .allowTextSelection', author: '.ms-Persona-primaryText', quote: 'blockquote[type="cite"], blockquote' },
    { id: 'slack', domains: ['app.slack.com'], kind: 'chat', scope: '[data-qa="thread_view"], .p-thread_view, [data-qa="channel_view"], .p-workspace__primary_view', message: '[data-qa="message_container"]', body: '[data-qa="message-text"], [data-qa="message_content"]', author: '[data-qa="message_sender_name"]' },
    { id: 'whatsapp', domains: ['web.whatsapp.com'], kind: 'chat', scope: '#main', message: '.message-in, .message-out', body: '[data-testid="msg-text"], .selectable-text', author: '[data-pre-plain-text]', outgoing: '.message-out' },
    { id: 'instagram', domains: ['instagram.com'], post: 'article', body: 'h1', comment: 'li[data-comment-id]', commentBody: '[data-comment-text]' },
    { id: 'threads', domains: ['threads.net'], post: '[data-pressable-container="true"]', body: '[data-testid="post-text"]' },
    { id: 'tiktok', domains: ['tiktok.com'], post: '[data-e2e="browse-video"]', body: '[data-e2e="browse-video-desc"]', comment: '[data-e2e="comment-item"]', commentBody: '[data-e2e="comment-level-1"], [data-e2e="comment-level-2"]' },
    { id: 'discord', domains: ['discord.com'], kind: 'chat', scope: '[class*="chatContent"]', message: '[id^="chat-messages-"]', body: '[id^="message-content-"]', author: '[id^="message-username-"]' },
    { id: 'bluesky', domains: ['bsky.app'], post: '[data-testid^="feedItem-by-"]', body: '[data-testid="postText"]' },
    { id: 'quora', domains: ['quora.com'], post: '.q-box.qu-borderAll', body: '.q-text.qu-display--block', comment: '[data-comment-id]', commentBody: '.q-text' },
    { id: 'medium', domains: ['medium.com'], post: 'article', body: 'section', title: 'h1' },
    { id: 'substack', domains: ['substack.com'], post: 'article, .single-post', body: '.available-content .body, .body.markup', title: 'h1', comment: '.comment', commentBody: '.comment-body' },
    { id: 'tumblr', domains: ['tumblr.com'], post: 'article[data-id]', body: '[data-testid="post-content"]' },
    { id: 'pinterest', domains: ['pinterest.com'], post: '[data-test-id="pin"]', body: '[data-test-id="pin-description"]', title: '[data-test-id="pin-title"]' }
  ];
  function extract(def, field) {
    if (!field?.isConnected || !window.WriteFlow.Detector.isEditableCandidate(field)) return null;
    const result = { platform: def.id, type: def.kind === 'email' ? 'email_reply' : def.kind === 'chat' ? 'chat_reply' : 'post_reply', content: {}, metadata: {} };
    if (def.message) {
      const quote = def.quote && D.queryAll(field, def.quote).find(D.visible);
      if (quote) result.content.primaryText = D.text(quote);
      else {
        const scope = D.closest(field, def.scope);
        if (!scope) return null;
        const messages = D.queryAll(scope, def.message).filter(node => D.visible(node) && !node.contains(field) && D.closest(node, def.scope) === scope);
        const items = messages.map(node => {
          const authorNode = def.author && D.queryAll(node, def.author)[0];
          const author = def.id === 'whatsapp' ? (authorNode?.getAttribute('data-pre-plain-text') || '').match(/\]\s*(.*?):\s*$/)?.[1] || '' : D.text(authorNode);
          return { text: D.text(D.body(node, def.body, def.message, field), field), author,
            direction: def.outgoing ? (node.matches(def.outgoing) ? 'outgoing' : 'incoming') : 'unknown' };
        }).filter(item => item.text).slice(-6);
        const latest = items.pop();
        if (!latest) return null;
        result.content.primaryText = latest.text;
        result.author = { name: latest.author };
        result.conversation = items;
      }
    } else {
      const comment = def.comment && D.closest(field, def.comment);
      const post = D.associated(field, def.post);
      const ownerSelector = [def.post, def.comment].filter(Boolean).join(',');
      const postBody = post && D.body(post, def.body, ownerSelector, field);
      const title = post && ((def.titleAttribute && post.getAttribute(def.titleAttribute)) || (def.title && D.text(D.queryAll(post, def.title)[0])) || '');
      const postText = [title, D.text(postBody, field)].filter(Boolean).join('\n');
      if (comment) {
        result.type = 'comment_reply';
        result.content.primaryText = D.text(D.body(comment, def.commentBody, ownerSelector, field), field);
        if (!result.content.primaryText) return null;
        // Milestone 6, Batch 3a: walk the FULL ancestor chain of nested
        // comments (reply-to-a-reply-to-a-reply), not just one parent
        // level. Capped at 5 levels to bound cost/prompt size on deeply
        // nested threads (matches the 6-message cap used for def.message
        // platforms elsewhere). ancestors is built nearest-first by the
        // walk itself; the nearest one becomes parentText (unchanged,
        // backward-compatible single-level behavior), and anything
        // FURTHER back becomes the conversation array, reversed to
        // oldest-first to match the ordering def.message platforms use.
        const ancestors = [];
        let cursor = comment;
        for (let depth = 0; depth < 5; depth += 1) {
          const outer = D.closest(D.parent(cursor), def.comment);
          if (!outer) break;
          const text = D.text(D.body(outer, def.commentBody, ownerSelector, field), field);
          if (text) {
            const authorNode = def.author && D.queryAll(outer, def.author)[0];
            ancestors.push({ text, author: D.text(authorNode), direction: 'unknown' });
          }
          cursor = outer;
        }
        // Fixed after testing: originally split off the nearest ancestor
        // into parentText and the rest into conversation, but
        // ContextModel.serialize() always renders parentText BEFORE the
        // conversation array -- which put the nearest (most recent)
        // ancestor ahead of genuinely older ones in the serialized
        // output, backwards from actual chronological order. Simpler and
        // correct: when there's any ancestor at all, the whole chain goes
        // into conversation (oldest-first); parentText only falls back to
        // the post itself when there's no ancestor comment to walk to.
        if (ancestors.length) {
          result.conversation = ancestors.slice().reverse();
        } else {
          result.content.parentText = postText;
        }
      } else result.content.primaryText = postText;
      const source = comment || post;
      result.author = { name: def.author && source ? D.text(D.queryAll(source, def.author)[0]) : '' };
      result.metadata.title = title;
    }
    if (!result.content.primaryText) return null;
    result.metadata.url = location.origin + location.pathname;
    return M.normalize(result);
  }
  const adapters = definitions.map(def => ({
    id: def.id, kind: def.kind === 'email' ? 'email' : 'social',
    detect: (hostname = location.hostname) => def.domains.some(domain => D.hostMatches(hostname.toLowerCase(), domain)),
    capabilities: Object.freeze({ writing: true, contextualReply: true, conversationContext: !!(def.message || def.comment), smartCompose: false }), // Milestone 6, Batch 3a: comment-based platforms can now provide real multi-level conversation data too, not just message-based ones
    findEditors: (scope = document) => D.queryAll(scope, 'textarea, input, [contenteditable], [role="textbox"]').map(node => window.WriteFlow.Detector.resolveEditableTarget(node)).filter((node, i, all) => node && D.visible(node) && all.indexOf(node) === i),
    extractContext: field => extract(def, field), extractConversation: field => extract(def, field)?.conversation || [],
    getAudienceHints: () => [],
    getPlatformMetadata: () => ({ id: def.id, verification: 'synthetic-fixtures-only', liveVerified: false })
  }));
  const generic = { id: 'generic', kind: 'writing', detect: () => true,
    capabilities: Object.freeze({ writing: true, contextualReply: false, conversationContext: false, smartCompose: false }),
    findEditors: adapters[0].findEditors, extractContext: () => null, extractConversation: () => [], getAudienceHints: () => [],
    getPlatformMetadata: () => ({ id: 'generic', verification: 'synthetic-fixtures-only', liveVerified: false }) };
  return { adapters: Object.freeze(adapters), getAdapter: (hostname = location.hostname) => adapters.find(adapter => adapter.detect(hostname)) || generic };
})();
