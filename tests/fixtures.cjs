// Synthetic, minimal selector contracts. These are NOT live-site snapshots.
const field = '<textarea id="editor" aria-label="Reply">Draft stays private</textarea>';
const social = (tag, attrs, body, comment = '') => `<${tag} ${attrs}>${body}${comment}${field}</${tag}>`;
module.exports = [
  ['linkedin','www.linkedin.com', social('article','data-urn="urn:li:activity:1"','<div class="feed-shared-text">TARGET</div>','<div class="comments-comment-item"><div class="comments-comment-item__main-content">UNRELATED COMMENT</div></div>')],
  ['twitter','x.com',social('article','data-testid="tweet"','<div data-testid="tweetText">TARGET</div>')],
  ['facebook','www.facebook.com',social('div','role="article"','<div data-ad-rendering-role="story_message">TARGET</div>','<div role="article" aria-label="Comment by Pat"><div data-ad-rendering-role="comment_message">UNRELATED COMMENT</div></div>')],
  ['reddit','www.reddit.com',social('shreddit-post','post-title="TARGET"','<div slot="text-body">Body</div>')],
  ['youtube','www.youtube.com',social('ytd-watch-flexy','','<h1>TARGET</h1>')],
  ['gmail','mail.google.com',social('div','data-thread-id="thread"','<div data-message-id="one"><span class="gD">Sarah</span><div data-message-body>EARLIER</div></div><div data-message-id="two"><div data-message-body>TARGET</div></div>')],
  ['outlook','outlook.office.com',social('div','data-convid="thread"','<div data-email-message><div data-message-body>EARLIER</div></div><div data-email-message><div data-message-body>TARGET</div></div>')],
  ['slack','app.slack.com',social('div','data-qa="channel_view"','<div data-qa="message_container"><div data-qa="message-text">EARLIER</div></div><div data-qa="message_container"><div data-qa="message-text">TARGET</div></div>')],
  ['whatsapp','web.whatsapp.com',social('div','id="main"','<div class="message-out"><span class="selectable-text">EARLIER</span></div><div class="message-in"><div data-pre-plain-text="[10:00] Sarah: "><span class="selectable-text">TARGET</span></div></div>')],
  ['instagram','www.instagram.com',social('article','','<h1>TARGET</h1>')],
  ['threads','www.threads.net',social('div','data-pressable-container="true"','<div data-testid="post-text">TARGET</div>')],
  ['tiktok','www.tiktok.com',social('div','data-e2e="browse-video"','<div data-e2e="browse-video-desc">TARGET</div>')],
  ['discord','discord.com',social('div','class="chatContent_fixture"','<ol data-list-id="chat-messages"><li id="chat-messages-1"><div id="message-content-1">EARLIER</div></li><li id="chat-messages-2"><div id="message-content-2">TARGET</div></li></ol>')],
  ['bluesky','bsky.app',social('div','data-testid="feedItem-by-alice"','<div data-testid="postText">TARGET</div>')],
  ['quora','www.quora.com',social('div','class="q-box qu-borderAll"','<div class="q-text qu-display--block">TARGET</div>')],
  ['medium','medium.com',social('article','','<section>TARGET</section>')],
  ['substack','example.substack.com',social('article','','<div class="available-content"><div class="body">TARGET</div></div>')],
  ['tumblr','www.tumblr.com',social('article','data-id="1"','<div data-testid="post-content">TARGET</div>')],
  ['pinterest','www.pinterest.com',social('div','data-test-id="pin"','<div data-test-id="pin-description">TARGET</div>')]
];
