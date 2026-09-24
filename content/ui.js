// content/ui.js
// All UI lives inside one Shadow DOM root so host page CSS can't break us
// and we can't break the host page, per spec section 12.
window.WriteFlow = window.WriteFlow || {};

const ICONS = {
  trigger: `<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>`,
  improve: `<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>`,
  rewrite: `<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>`,
  grammar: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
  professional: `<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>`,
  friendly: `<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>`,
  shorten: `<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>`,
  expand: `<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>`,
  simplify: `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`,
  lock: `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  bookmark: `<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>`
};

function svg(name, size = 16, strokeWidth = 1.6) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
}

const STYLES = `
:host {
  all: initial;
  --wf-ink: #16181A;
  --wf-bg: #FAFAF8;
  --wf-surface: #FFFFFF;
  --wf-muted: #5B6169;
  --wf-accent: #B5622C;
  --wf-accent-2: #D97F45;
  --wf-accent-ink: #FFFFFF;
  --wf-border: rgba(0,0,0,0.08);
  --wf-hover: rgba(0,0,0,0.045);
  --wf-shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
  --wf-shadow: 0 10px 28px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.06);
  --wf-shimmer-a: #ECEAE4;
  --wf-shimmer-b: #F5F3EE;
  --wf-pro-bg: #FBF0E6;
  --wf-pro-ink: #8A4A1E;
  --wf-pro-border: #EAD2B8;
}
@media (prefers-color-scheme: dark) {
  :host {
    --wf-ink: #F2F1ED;
    --wf-bg: #17181A;
    --wf-surface: #212224;
    --wf-muted: #9AA0A6;
    --wf-accent: #E0925C;
    --wf-accent-2: #EDAB7C;
    --wf-accent-ink: #201200;
    --wf-border: rgba(255,255,255,0.09);
    --wf-hover: rgba(255,255,255,0.055);
    --wf-shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
    --wf-shadow: 0 14px 34px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
    --wf-shimmer-a: #2C2D30;
    --wf-shimmer-b: #35363A;
    --wf-pro-bg: #2E2419;
    --wf-pro-ink: #E5B27E;
    --wf-pro-border: #4A3823;
  }
}
* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }

.wf-trigger {
  position: fixed; z-index: 2147483000; height: 30px; width: 30px; border-radius: 999px;
  background: linear-gradient(150deg, var(--wf-accent), var(--wf-accent-2));
  color: var(--wf-accent-ink); display: flex; align-items: center; justify-content: center;
  cursor: pointer; border: none; opacity: 0.82; box-shadow: var(--wf-shadow-sm);
  padding: 0; gap: 7px; overflow: hidden; white-space: nowrap;
  animation: wf-breathe 3.6s ease-in-out infinite;
  transition: opacity .15s ease, box-shadow .15s ease, transform .15s ease,
    width .3s cubic-bezier(.34,1.56,.64,1), height .18s cubic-bezier(.34,1.56,.64,1),
    top .18s cubic-bezier(.34,1.56,.64,1), left .3s cubic-bezier(.34,1.56,.64,1),
    border-radius .18s cubic-bezier(.34,1.56,.64,1), padding .3s cubic-bezier(.34,1.56,.64,1);
}
.wf-trigger:hover, .wf-trigger:focus-visible { opacity: 1; box-shadow: var(--wf-shadow); transform: translateY(-1px); animation: none; }
.wf-trigger.wf-expanded { width: 168px; padding: 0 12px 0 10px; justify-content: flex-start; opacity: 1; animation: none; }
.wf-trigger .wf-trigger-icon { flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.wf-trigger .wf-trigger-label {
  font-size: 12.5px; font-weight: 700; letter-spacing: -0.01em;
  opacity: 0; max-width: 0; overflow: hidden;
  transition: opacity .15s ease .05s, max-width .3s cubic-bezier(.34,1.56,.64,1);
}
.wf-trigger.wf-expanded .wf-trigger-label { opacity: 1; max-width: 140px; }
.wf-trigger.wf-expanding { animation: none; opacity: 1; border-radius: 14px; box-shadow: var(--wf-shadow); transform: none; pointer-events: none; padding: 0; }
.wf-trigger.wf-expanding .wf-trigger-icon, .wf-trigger.wf-expanding .wf-trigger-label { opacity: 0; transition: opacity .08s ease; }
@keyframes wf-breathe {
  0%, 100% { box-shadow: var(--wf-shadow-sm), 0 0 0 0 color-mix(in srgb, var(--wf-accent) 0%, transparent); }
  50% { box-shadow: var(--wf-shadow-sm), 0 0 0 5px color-mix(in srgb, var(--wf-accent) 14%, transparent); }
}

.wf-panel {
  position: fixed; z-index: 2147483001; width: 304px; background: var(--wf-surface);
  border-radius: 14px; box-shadow: var(--wf-shadow); border: 1px solid var(--wf-border);
  overflow: hidden; color: var(--wf-ink);
  opacity: 0; transform: translateY(4px);
  transition: opacity .12s ease-out, transform .12s ease-out;
}
.wf-panel.wf-shown { opacity: 1; transform: translateY(0); }
.wf-sr-only { position:absolute!important; width:1px!important; height:1px!important; padding:0!important; margin:-1px!important; overflow:hidden!important; clip:rect(0,0,0,0)!important; white-space:nowrap!important; border:0!important; }

.wf-panel-header {
  padding: 11px 14px; font-size: 11px; font-weight: 700; letter-spacing: .05em;
  color: var(--wf-muted); text-transform: uppercase; border-bottom: 1px solid var(--wf-border);
  display: flex; align-items: center; justify-content: space-between;
}
.wf-panel-tools { display:flex; align-items:center; gap:3px; margin:-5px -7px -5px 6px; }
.wf-panel-tools .wf-tier-pill { margin-right:4px; }
.wf-panel-tools .wf-icon-btn { width:25px; height:25px; font-size:16px; text-transform:none; }
.wf-tier-pill { font-size: 9.5px; font-weight: 700; letter-spacing: .03em; padding: 2px 7px; border-radius: 999px;
  background: var(--wf-pro-bg); color: var(--wf-pro-ink); border: 1px solid var(--wf-pro-border); text-transform: none; }
.wf-mode-switch { display:flex; padding:6px; gap:4px; border-bottom:1px solid var(--wf-border); }
.wf-mode-switch button { flex:1; border:0; border-radius:7px; padding:6px; cursor:pointer; color:var(--wf-muted); background:transparent; font-size:11.5px; font-weight:600; transition:transform .14s ease, box-shadow .14s ease, background .14s ease; }
.wf-mode-switch button:hover { transform:translateY(-1px); box-shadow:var(--wf-shadow-sm); }
.wf-mode-switch button[aria-selected="true"] { background:var(--wf-hover); color:var(--wf-ink); }
.wf-icon-btn { width:28px; height:28px; border:0; border-radius:7px; display:grid; place-items:center; cursor:pointer; color:var(--wf-muted); background:transparent; font-size:18px; line-height:1; }
.wf-icon-btn { transition:transform .14s ease, box-shadow .14s ease, background .14s ease; }
.wf-icon-btn:hover { background:var(--wf-hover); color:var(--wf-ink); transform:translateY(-1px); box-shadow:var(--wf-shadow-sm); }

.wf-cmd-list { padding: 9px; display: flex; flex-wrap: wrap; gap: 6px; align-items:center; }
.wf-cmd {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px; border-radius: 999px;
  background: var(--wf-bg); border: 1px solid var(--wf-border); cursor: pointer; text-align: left; color: var(--wf-ink);
  font-size: 12px; width: auto; box-shadow:var(--wf-shadow-sm);
  transition: background .14s ease, transform .14s ease, box-shadow .14s ease, border-color .14s ease;
}
.wf-cmd svg { flex-shrink: 0; color: var(--wf-muted); width:13px; height:13px; }
.wf-cmd span.wf-cmd-label { flex: 0 1 auto; white-space:nowrap; }
.wf-cmd:hover { background: var(--wf-hover); transform:translateY(-1px); box-shadow:var(--wf-shadow); }
.wf-cmd.wf-locked { color: var(--wf-pro-ink); opacity:.58; background:var(--wf-pro-bg); border-color:var(--wf-pro-border); }
.wf-cmd.wf-locked:hover { background: var(--wf-pro-bg); opacity:.72; }
.wf-lock-badge { display: flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 700; letter-spacing: .03em;
  color: var(--wf-pro-ink); background: transparent; border: 0; padding: 0; }
.wf-cmd:focus-visible, button:focus-visible, input:focus-visible {
  outline: 2px solid var(--wf-accent); outline-offset: 2px;
}

.wf-custom-row { display: flex; gap: 6px; padding: 4px 10px 10px; }
.wf-custom-input {
  flex: 1; font-size: 12.5px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--wf-border);
  background: var(--wf-bg); color: var(--wf-ink);
}
.wf-save-prompt-btn {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--wf-border);
  background: var(--wf-bg); color: var(--wf-muted); display: grid; place-items: center; cursor: pointer;
  transition: transform .14s ease, box-shadow .14s ease, background .14s ease, color .14s ease;
}
.wf-save-prompt-btn:hover { background: var(--wf-hover); color: var(--wf-accent); transform: translateY(-1px); box-shadow: var(--wf-shadow-sm); }
.wf-save-prompt-btn.wf-saved { color: var(--wf-accent); }
.wf-prompt-chips { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 10px 8px; }
.wf-wfm-scenarios { display: flex; flex-wrap: wrap; gap: 5px; padding: 10px 14px 4px; }
.wf-wfm-scenario { height: 26px; padding: 0 12px; border-radius: 999px; background: var(--wf-bg); border: 1px solid var(--wf-border); color: var(--wf-muted); font-size: 11.5px; font-weight: 600; cursor: pointer; transition: background .14s ease, color .14s ease, border-color .14s ease; }
.wf-wfm-scenario:hover { background: var(--wf-hover); }
.wf-wfm-scenario-active { background: var(--wf-accent); border-color: var(--wf-accent); color: var(--wf-accent-ink); }
.wf-prompt-chip {
  display: inline-flex; align-items: center; gap: 5px; max-width: 100%; height: 26px; padding: 0 4px 0 10px;
  border-radius: 999px; background: var(--wf-bg); border: 1px solid var(--wf-border); cursor: pointer;
  font-size: 11.5px; color: var(--wf-ink); transition: background .14s ease, border-color .14s ease;
}
.wf-prompt-chip:hover { background: var(--wf-hover); border-color: var(--wf-accent); }
.wf-prompt-chip span.wf-prompt-chip-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; }
.wf-prompt-chip-remove {
  flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%; border: none; background: transparent;
  color: var(--wf-muted); display: grid; place-items: center; cursor: pointer; font-size: 13px; line-height: 1;
}
.wf-prompt-chip-remove:hover { background: var(--wf-hover); color: var(--wf-ink); }

.wf-custom-go {
  background: linear-gradient(150deg, var(--wf-accent), var(--wf-accent-2));
  color: var(--wf-accent-ink); border: none; border-radius: 8px;
  padding: 0 12px; cursor: pointer; font-weight: 600; font-size: 12.5px; transition: transform .14s ease, box-shadow .14s ease;
  position:relative; overflow:hidden; isolation:isolate;
}
.wf-custom-go:hover { transform:translateY(-1px); box-shadow:var(--wf-shadow); }
.wf-custom-go::after { content:""; position:absolute; top:50%; left:50%; width:0; height:0; border-radius:50%; background:radial-gradient(circle, rgba(255,255,255,.42) 0 38%, rgba(255,255,255,0) 70%); transform:translate(-50%,-50%); opacity:0; pointer-events:none; }
.wf-custom-go:active::after { animation:wf-ripple .3s ease-out; }
.wf-translate-row { display:flex; gap:6px; padding:4px 10px 10px; }
.wf-translate-row select { flex:1; min-width:0; border:1px solid var(--wf-border); border-radius:8px; background:var(--wf-bg); color:var(--wf-ink); padding:8px; font-size:12px; }
.wf-context-fallback { padding:8px 10px 4px; }
.wf-context-fallback label { display:block; color:var(--wf-muted); font-size:11px; margin-bottom:5px; }
.wf-context-input { width:100%; min-height:64px; resize:vertical; border:1px solid var(--wf-border); border-radius:8px; background:var(--wf-bg); color:var(--wf-ink); padding:8px 9px; font-size:12px; line-height:1.4; }

.wf-body {
  padding: 12px 14px; font-size: 13px; line-height: 1.55; max-height: 220px; overflow-y: auto;
  white-space: pre-wrap; border-left: 3px solid var(--wf-accent); margin: 10px 14px; padding-left: 10px;
  animation: wf-fade-in .15s ease-out;
}
@keyframes wf-fade-in { from { opacity: 0; } to { opacity: 1; } }
.wf-word { display:inline-block; opacity:0; animation:wf-word-in .18s ease-out forwards; animation-delay:var(--wf-delay, 0ms); }
@keyframes wf-word-in { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
.wf-match { display:inline-flex; align-items:center; margin:10px 14px 0; padding:4px 8px; border-radius:999px; background:var(--wf-pro-bg); border:1px solid var(--wf-pro-border); color:var(--wf-pro-ink); font-size:10.5px; font-weight:650; }
.wf-context-badges-row { display: flex; align-items: center; gap: 6px; margin: 9px 14px 0; flex-wrap: wrap; }
.wf-context-badge-text { font-size: 11px; font-weight: 600; color: var(--wf-muted); letter-spacing: .01em; }
.wf-audience-select { font-size: 11px; font-weight: 650; color: var(--wf-accent); background: var(--wf-pro-bg); border: 1px solid var(--wf-pro-border); border-radius: 999px; padding: 2px 8px; cursor: pointer; max-width: 140px; }
.wf-diff-old { display:inline; text-decoration:line-through; text-decoration-thickness:1px; text-decoration-color:var(--wf-accent); animation:wf-diff-out .2s ease-in forwards; }
@keyframes wf-diff-out { from { opacity:1; } to { opacity:.15; } }

.wf-loading { min-height:76px; padding:18px 14px; display:flex; align-items:center; gap:12px; }
.wf-thinking-dots { display:flex; align-items:center; gap:4px; height:18px; }
.wf-thinking-dot { width:5px; height:5px; border-radius:50%; background:var(--wf-accent); animation:wf-thinking-arc .72s ease-in-out infinite; }
.wf-thinking-dot:nth-child(2) { animation-delay:.12s; }
.wf-thinking-dot:nth-child(3) { animation-delay:.24s; }
.wf-thinking-copy { color:var(--wf-muted); font-size:12.5px; }
@keyframes wf-thinking-arc { 0%,100% { transform:translateY(2px); opacity:.45; } 50% { transform:translateY(-3px); opacity:1; } }

.wf-error { padding: 12px 14px; font-size: 12.5px; color: #C4432A; }

.wf-actions { display: flex; align-items: center; gap: 8px; padding: 4px 14px 14px; }
.wf-adjustments { display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:0 14px 10px; color:var(--wf-muted); font-size:11px; }
.wf-adjustment { border:1px solid var(--wf-border); border-radius:999px; background:var(--wf-bg); color:var(--wf-ink); padding:5px 8px; cursor:pointer; font-size:11px; box-shadow:var(--wf-shadow-sm); transition:transform .14s ease, box-shadow .14s ease, background .14s ease; }
.wf-adjustment:hover { transform:translateY(-1px); box-shadow:var(--wf-shadow); background:var(--wf-hover); }
.wf-feedback { display:flex; align-items:center; gap:6px; padding:0 14px 10px; color:var(--wf-muted); font-size:11.5px; }
.wf-feedback button { width:28px; height:28px; border:1px solid var(--wf-border); border-radius:999px; background:var(--wf-bg); color:var(--wf-muted); cursor:pointer; font-size:14px; transition:transform .14s ease, box-shadow .14s ease, background .14s ease; }
.wf-feedback button:hover { transform:translateY(-1px); box-shadow:var(--wf-shadow-sm); background:var(--wf-hover); }
.wf-btn-primary {
  flex: 1; font-size: 13px; font-weight: 600; padding: 9px 0; border-radius: 8px; border: none;
  cursor: pointer; background: linear-gradient(150deg, var(--wf-accent), var(--wf-accent-2));
  color: var(--wf-accent-ink); transition: transform .14s ease, box-shadow .14s ease; box-shadow: var(--wf-shadow-sm);
  position:relative; overflow:hidden; isolation:isolate;
}
.wf-btn-primary::after { content:""; position:absolute; top:50%; left:50%; width:0; height:0; border-radius:50%; background:radial-gradient(circle, rgba(255,255,255,.42) 0 38%, rgba(255,255,255,0) 70%); transform:translate(-50%,-50%) scale(0); opacity:0; pointer-events:none; }
.wf-btn-primary:hover { transform:translateY(-1px); box-shadow:var(--wf-shadow); }
.wf-btn-primary:active::after { animation:wf-ripple .3s ease-out; }
@keyframes wf-ripple { 0% { width:0; height:0; opacity:.7; } 100% { width:240%; height:240%; opacity:0; transform:translate(-50%,-50%) scale(1); } }
.wf-btn-ghost {
  font-size: 12.5px; font-weight: 500; padding: 4px 2px; border-radius: 4px; border: none;
  cursor: pointer; background: transparent; color: var(--wf-muted); transition: color .14s ease, transform .14s ease, box-shadow .14s ease;
}
.wf-btn-ghost:hover { color: var(--wf-ink); transform:translateY(-1px); box-shadow:var(--wf-shadow-sm); }

.wf-upsell { padding: 16px 14px 14px; }
.wf-upsell-title { font-size: 13.5px; font-weight: 700; margin-bottom: 4px; }
.wf-upsell-desc { font-size: 12px; color: var(--wf-muted); line-height: 1.5; margin-bottom: 12px; }
@media (prefers-reduced-motion: reduce) {
  .wf-panel, .wf-trigger, .wf-trigger svg, .wf-cmd, .wf-icon-btn, .wf-mode-switch button,
  .wf-custom-go, .wf-btn-primary, .wf-btn-ghost, .wf-adjustment, .wf-word, .wf-diff-old, .wf-thinking-dot {
    animation: none !important; transition: none !important;
  }
  .wf-panel, .wf-trigger, .wf-cmd, .wf-icon-btn, .wf-mode-switch button,
  .wf-custom-go, .wf-btn-primary, .wf-btn-ghost, .wf-adjustment, .wf-word, .wf-diff-old { transform:none !important; }
  .wf-word, .wf-diff-old { opacity:1; }
  .wf-btn-primary::after, .wf-custom-go::after { display:none; }
  .wf-thinking-dot { opacity:.7; }
}
`;

function createShadowRoot() {
  const host = document.createElement("div");
  host.id = "writeflow-root";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = STYLES;
  shadow.appendChild(style);
  document.documentElement.appendChild(host);
  return shadow;
}

// Returns the caret's own rect inside a contenteditable, when there is one.
// This is what fixes positioning inside large editors like Gmail's compose
// body: without it we'd anchor to the bounding box of the ENTIRE editable
// region (which can be hundreds of px tall) instead of where the user is
// actually typing.
function getCaretRect(field) {
  try {
    if (!field.isContentEditable) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !field.contains(sel.anchorNode)) return null;
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);
    let rect = range.getClientRects()[0];
    if (!rect || (!rect.width && !rect.height)) {
      return null; // Measuring must never mutate a host editor.

    }
    return rect && (rect.width || rect.height) ? rect : null;
  } catch (e) {
    return null;
  }
}

// Real positioning engine (spec section 61): anchor to the caret when
// available (falling back to the field's own rect), measure the element's
// ACTUAL rendered size, flip above the anchor if there's no room below,
// and clamp both edges against the viewport using that real size \u2014 not
// a guessed constant. El must already be in the DOM (opacity can be 0)
// so getBoundingClientRect() reports its true footprint.
// Positions the small persistent trigger button. Deliberately NOT using
// the same "flip above if no room below" logic as the panel: that logic
// is designed for a popover anchored to a small point (like a caret), and
// applied to a trigger anchored to a whole FIELD's bounding box, it flips
// the trigger to sit ABOVE the entire field for any large field (Gmail's
// compose body, for instance) \u2014 confirmed via real browser testing to
// land the trigger overlapping unrelated content above the field entirely.
// Instead, the trigger always pins to the field's own top-right corner,
// clamped to the viewport.
function positionTrigger(field, el) {
  const fieldRect = field.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const margin = 6;
  const h = elRect.height;

  let top = fieldRect.top + margin;
  top = Math.max(margin, Math.min(top, window.innerHeight - h - margin));
  el.style.top = `${top}px`;

  // Right-edge anchor via CSS `right`, not `left` + measured width. This
  // is deliberate: reading el.getBoundingClientRect().width immediately
  // after toggling the class that drives the collapsed\u2194expanded width
  // transition does NOT reliably return the post-transition target when
  // it interrupts an already-running transition (confirmed via real
  // browser testing \u2014 a `left`-based version of this function silently
  // anchored to a stale width mid-transition, breaking click targeting
  // after a hover-expand). Anchoring with CSS `right` instead sidesteps
  // the race entirely: the browser keeps that edge stable through any
  // width transition on its own, no re-measurement required.
  const desiredRightEdge = Math.min(fieldRect.right - margin, window.innerWidth - margin);
  const rightCss = Math.max(margin, window.innerWidth - desiredRightEdge);
  el.style.left = "auto";
  el.style.right = `${rightCss}px`;
}

function positionElement(field, el, { useCaret = false } = {}) {
  const fieldRect = field.getBoundingClientRect();
  const caretRect = useCaret ? getCaretRect(field) : null;
  const anchor = caretRect || fieldRect;
  const margin = 10;

  const elRect = el.getBoundingClientRect();
  const w = elRect.width;
  const h = elRect.height;

  let top = anchor.bottom + 8;
  if (top + h > window.innerHeight - margin) {
    const above = anchor.top - h - 8;
    top = above > margin ? above : Math.max(margin, window.innerHeight - h - margin);
  }
  top = Math.max(margin, top);

  let left = anchor.left;
  if (left + w > window.innerWidth - margin) {
    left = window.innerWidth - w - margin;
  }
  left = Math.max(margin, left);

  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
}

window.WriteFlow.UI = (function () {
  const shadow = createShadowRoot();
  let trigger = null;
  let panel = null;
  let activeField = null;
  let triggerCollapseTimer = null;
  const undoByField = new WeakMap();
  // Milestone 4, Batch 2 (Style DNA): WeakMap so an entry never outlives
  // the field itself, and is auto-cleared if the field is removed from
  // the DOM before the user ever blurs it — no manual eviction needed.
  const pendingEditTracking = new WeakMap();
  let generation = null;
  let requestSequence = 0;
  let panelSequence = 0;
  let lifecycleTimer = null;
  let activeUrl = location.href;
  let lastFocusedBeforePanel = null;
  let thinkingTimer = null;
  const uiTimers = new Set();
  // Caches context-analysis results by postText for this page session so
  // closing and reopening the panel on the SAME post doesn't re-call
  // analysis. Not persisted \u2014 doesn't need to survive a reload.
  const contextAnalysisCache = new Map();
  // Deliberately separate from social analysis: identical text can appear in
  // a post and an email, but the valid response angles and privacy context are
  // different. Raw email text is retained only in this in-memory page cache.
  const emailContextAnalysisCache = new Map();

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  }

  function scheduleUI(callback, delay) {
    const timer = setTimeout(() => {
      uiTimers.delete(timer);
      callback();
    }, delay);
    uiTimers.add(timer);
    return timer;
  }

  function clearUITimers() {
    uiTimers.forEach(clearTimeout);
    uiTimers.clear();
  }

  function stopThinking() {
    if (thinkingTimer) clearInterval(thinkingTimer);
    thinkingTimer = null;
  }

  function removeTrigger() {
    clearTriggerCollapseTimer();
    if (trigger) trigger.remove();
    trigger = null;
  }
  function removePanel() {
    panelSequence++;
    cancelGeneration();
    clearUITimers();
    if (panel) panel.remove();
    panel = null;
    if (trigger) {
      trigger.hidden = false;
      trigger.classList.remove("wf-expanding");
      trigger.style.width = "";
      trigger.style.height = "";
      if (activeField?.isConnected) positionTrigger(activeField, trigger);
    }
    if (lastFocusedBeforePanel?.isConnected && document.activeElement === shadow.host) lastFocusedBeforePanel.focus({ preventScroll: true });
  }

  function cancelGeneration() {
    if (generation) generation.controller.abort();
    generation = null;
    stopThinking();
  }

  function closeAll() {
    removePanel();
    removeTrigger();
    activeField = null;
    clearInterval(lifecycleTimer);
    lifecycleTimer = null;
  }

  // Re-runs positioning against the panel/trigger's CURRENT rendered size.
  // Called after every content change (loading \u2192 suggestion \u2192 replaced
  // are all different heights) so the panel never drifts off-anchor or
  // overflows the viewport as its content grows or shrinks.
  //
  // Also closes everything if the field has scrolled entirely out of the
  // viewport \u2014 without this, the panel was found (via real browser
  // testing) to clamp to a fixed position near the top of the screen and
  // sit there floating, visually detached from any visible field, which
  // is confusing rather than useful.
  function reposition() {
    if (activeField && (!activeField.isConnected || location.href !== activeUrl)) {
      contextAnalysisCache.clear(); emailContextAnalysisCache.clear();
      closeAll(); return;
    }
    if (activeField) {
      const fieldRect = activeField.getBoundingClientRect();
      const outOfView = fieldRect.bottom < 0 || fieldRect.top > window.innerHeight;
      if (outOfView) {
        closeAll();
        return;
      }
    }
    if (trigger && activeField && !trigger.classList.contains("wf-expanding")) positionTrigger(activeField, trigger);
    if (panel && activeField) positionElement(activeField, panel, { useCaret: true });
  }

  function showPanelEl(el) {
    shadow.appendChild(el);
    reposition();
    const reduceMotion = prefersReducedMotion();
    const panelRect = el.getBoundingClientRect();
    if (!trigger || reduceMotion) {
      el.classList.add("wf-shown");
      return;
    }

    // The persistent trigger supplies the opening shell: it grows into the
    // measured panel footprint, then yields to the panel as its content fades
    // in during the back half of the 180ms transition.
    trigger.classList.add("wf-expanding");
    trigger.style.width = `${panelRect.width}px`;
    trigger.style.height = `${panelRect.height}px`;
    trigger.style.right = "auto";
    trigger.style.left = `${panelRect.left}px`;
    trigger.style.top = `${panelRect.top}px`;
    scheduleUI(() => {
      if (el.isConnected) el.classList.add("wf-shown");
    }, 90);
    scheduleUI(() => {
      if (trigger) trigger.hidden = true;
    }, 180);
  }

  function panelHeader(title, trailing = "") {
    return `<div class="wf-panel-header">
      <span>${escapeHtml(title)}</span>
      <span class="wf-panel-tools">
        ${trailing}
        <button class="wf-icon-btn wf-minimize" type="button" aria-label="Minimize WriteFlow" title="Minimize">−</button>
        <button class="wf-icon-btn wf-dismiss" type="button" aria-label="Close WriteFlow" title="Close">×</button>
      </span>
    </div>`;
  }

  function bindPanelControls() {
    if (!panel) return;
    panel.querySelector(".wf-minimize")?.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      removePanel();
    });
    panel.querySelector(".wf-dismiss")?.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAll();
    });
  }

  function watchField() {
    if (activeUrl !== location.href) { contextAnalysisCache.clear(); emailContextAnalysisCache.clear(); }
    activeUrl = location.href;
    if (!lifecycleTimer) lifecycleTimer = setInterval(() => {
      if (!trigger && !panel) { clearInterval(lifecycleTimer); lifecycleTimer = null; return; }
      reposition();
    }, 250);
  }

  function showTrigger(field) {
    if (field.getRootNode() === shadow) return;
    if (activeField === field && (trigger || panel)) return;
    if (activeField && activeField !== field) closeAll();
    removeTrigger();
    watchField();
    activeField = field;
    trigger = document.createElement("button");
    trigger.className = "wf-trigger";
    trigger.innerHTML = `<span class="wf-trigger-icon">${svg("trigger", 14, 1.75)}</span><span class="wf-trigger-label">Write with WriteFlow</span>`;
    trigger.title = "WriteFlow AI";
    trigger.setAttribute("aria-label", "Write with WriteFlow");
    shadow.appendChild(trigger);
    positionTrigger(field, trigger);

    // First appearance teaches new users what this is: expand to show the
    // label, hold briefly, then settle to a quiet branded dot. Hovering
    // re-expands it later if someone forgot. Never collapses while the
    // panel this trigger opens is itself open.
    expandTrigger();
    scheduleTriggerCollapse();

    trigger.addEventListener("mouseenter", () => {
      clearTriggerCollapseTimer();
      expandTrigger();
    });
    trigger.addEventListener("mouseleave", () => {
      if (!panel) scheduleTriggerCollapse(500);
    });

    trigger.addEventListener("mousedown", (e) => {
      e.preventDefault();
      clearTriggerCollapseTimer();
      openPanel(field);
    });
  }

  function expandTrigger() {
    if (!trigger) return;
    trigger.classList.add("wf-expanded");
    positionTrigger(activeField, trigger);
  }

  function collapseTrigger() {
    if (!trigger || panel) return;
    trigger.classList.remove("wf-expanded");
    positionTrigger(activeField, trigger);
  }

  function clearTriggerCollapseTimer() {
    if (triggerCollapseTimer) {
      clearTimeout(triggerCollapseTimer);
      triggerCollapseTimer = null;
    }
  }

  function scheduleTriggerCollapse(delay = 2200) {
    clearTriggerCollapseTimer();
    triggerCollapseTimer = setTimeout(collapseTrigger, delay);
  }

  async function openPanel(field, opts = {}) {
    removePanel();
    activeField = field;
    watchField();
    const opening = panelSequence;
    lastFocusedBeforePanel = field;
    const adapter = window.WriteFlow.AdapterRegistry.getAdapter(field);
    if (!adapter) return;

    // Hotkey "quick rewrite": when the shortcut is pressed while the user
    // has text selected, skip the command menu entirely and generate a
    // suggestion for that selection right away \u2014 the "press hotkey, get a
    // result, paste back inline" flow, not a menu the user has to navigate.
    // Falls through to the normal menu below when there's no selection,
    // since there's nothing unambiguous to act on yet.
    if (opts.quickRewrite) {
      const selected = adapter.getSelectedText(field);
      if (selected && selected.trim()) {
        const settings = await window.WriteFlow.Storage.getSettings();
        const command = ["improve", "professional", "friendly"].includes(settings.defaultTone) ? settings.defaultTone : "improve";
        panel = document.createElement("div");
        panel.className = "wf-panel";
        prepareDialog(panel, "WriteFlow writing actions");
        showPanelEl(panel);
        activateDialog(panel);
        runCommand(field, adapter, command, "", null, null);
        return;
      }
    }

    // Context-aware modes: branch on extractor.kind so email and social
    // don't collide \u2014 each gets its own command set and prompt builder.
    // A field with no matching extractor, or one that finds no context
    // text (e.g. a blank new-compose email), falls through to generic
    // rewrite mode below unchanged.
    const registry = window.WriteFlow.ContextExtractorRegistry;
    const extractor = !opts.rewriteOnly && registry && registry.getExtractor(location.hostname);
    const fieldHasText = !!(adapter.getText(field) || "").trim();
    if (extractor) {
      const contextText = await extractContextWithRetry(extractor, field);
      if (opening !== panelSequence || !field.isConnected) return;
      // Milestone 3, Batch 3: previously this always routed to
      // openCommentPanel for any "social" extractor, even when nothing was
      // extracted AND the field was blank \u2014 which forced people into the
      // "paste the post yourself" fallback UI when they might actually be
      // starting something with no post to reply to at all (a fresh
      // connection message, a new post, a recruiter reply). Now: still use
      // the comment panel whenever there's real context OR the person has
      // already started typing a reply (both are genuinely "replying to
      // something" situations); a genuinely blank field with nothing
      // detected falls through to Write It For Me below instead, same as
      // the email branch already did.
      if (extractor.kind === "social" && (contextText || fieldHasText)) {
        await openCommentPanel(field, adapter, contextText || "", extractor);
        return;
      }
      if (extractor.kind === "email" && contextText) {
        await openEmailPanel(field, adapter, contextText);
        return;
      }
    }

    // Milestone 3 (Write It For Me): a genuinely blank field has nothing
    // for the normal rewrite-focused menu below to act on — every command
    // in it (Improve, Shorten, Grammar…) requires existing text and would
    // just show "Nothing to rewrite". Route to a dedicated panel instead.
    // Only applies when nothing was already routed above (quickRewrite,
    // a context-aware social/email panel) — this is the generic fallback.
    // Reuses fieldHasText computed above rather than re-reading the field.
    if (!fieldHasText) {
      openWriteForMePanel(field, adapter, extractor ? extractor.id : null);
      return;
    }

    const isPro = await window.WriteFlow.Storage.isPro();
    const freeIds = window.WriteFlow.Storage.FREE_COMMAND_IDS;
    const { savedPrompts } = await window.WriteFlow.Storage.getSettings();
    if (opening !== panelSequence || !field.isConnected) return;

    panel = document.createElement("div");
    panel.className = "wf-panel";
    prepareDialog(panel, "WriteFlow writing actions");
    panel.innerHTML = `
      ${panelHeader("WriteFlow", isPro ? '<span class="wf-tier-pill">PRO</span>' : "")}
      <div class="wf-cmd-list">
        ${window.WriteFlow.Commands.filter((c) => c.id !== "custom" && c.id !== "translate")
          .map((c) => {
            const locked = !isPro && !freeIds.includes(c.id);
            return `<button class="wf-cmd${locked ? " wf-locked" : ""}" data-cmd="${c.id}" data-locked="${locked}">
              ${svg(c.id)}<span class="wf-cmd-label">${c.label}</span>
              ${locked ? `<span class="wf-lock-badge">${svg("lock", 9, 2)}PRO</span>` : ""}
            </button>`;
          })
          .join("")}
      </div>
      <div class="wf-translate-row">
        <select class="wf-language" aria-label="Translation language">
          <option value="English">English</option>
          <option value="Nepali">Nepali</option>
          <option value="Hindi">Hindi</option>
          <option value="Spanish">Spanish</option>
          <option value="French">French</option>
          <option value="German">German</option>
        </select>
        <!-- Milestone 16, Batch 1: translation is a spec-listed FREE-tier
             feature (was mistakenly Pro-locked before this milestone) --
             always enabled now, no lock state. -->
        <button class="wf-custom-go wf-translate" data-locked="false">Translate</button>
      </div>
      ${isPro && savedPrompts?.length ? `<div class="wf-prompt-chips" role="group" aria-label="Saved prompts">
        ${savedPrompts.map((p) => `
          <button class="wf-prompt-chip" data-prompt-id="${p.id}" title="${escapeHtml(p.text)}">
            <span class="wf-prompt-chip-text">${escapeHtml(p.text)}</span>
            <span class="wf-prompt-chip-remove" data-remove-id="${p.id}" role="button" aria-label="Remove saved prompt" tabindex="0">×</span>
          </button>`).join("")}
      </div>` : ""}
      <div class="wf-custom-row">
        <input class="wf-custom-input" placeholder="${isPro ? "Custom instruction\u2026" : "Custom instructions are Pro\u2026"}" ${isPro ? "" : "disabled"} />
        ${isPro ? `<button class="wf-save-prompt-btn" type="button" aria-label="Save this instruction for reuse">${svg("bookmark", 15)}</button>` : ""}
        <button class="wf-custom-go" data-locked="${!isPro}">Go</button>
      </div>
    `;
    showPanelEl(panel);
    bindPanelControls();
    activateDialog(panel);

    panel.querySelectorAll(".wf-cmd").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (btn.dataset.locked === "true") {
          renderUpsell();
          return;
        }
        runCommand(field, adapter, btn.dataset.cmd, null);
      });
    });

    const input = panel.querySelector(".wf-custom-input");
    const go = panel.querySelector(".wf-custom-row .wf-custom-go");
    const fire = () => {
      if (go.dataset.locked === "true") {
        renderUpsell();
        return;
      }
      if (input.value.trim()) runCommand(field, adapter, "custom", input.value.trim());
    };
    go.addEventListener("mousedown", (e) => {
      e.preventDefault();
      fire();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") fire();
      if (e.key === "Escape") removePanel();
    });

    const saveBtn = panel.querySelector(".wf-save-prompt-btn");
    if (saveBtn) {
      saveBtn.addEventListener("mousedown", async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        await window.WriteFlow.Storage.addSavedPrompt(text);
        saveBtn.classList.add("wf-saved");
        saveBtn.innerHTML = "✓";
        setTimeout(() => openPanel(field), 500); // brief confirmation, then refresh the chip row
      });
    }
    panel.querySelectorAll(".wf-prompt-chip").forEach((chip) => {
      chip.addEventListener("mousedown", (e) => {
        // The remove (×) control has its own handler below; don't also fire the chip.
        if (e.target.closest(".wf-prompt-chip-remove")) return;
        e.preventDefault();
        const saved = savedPrompts.find((p) => p.id === chip.dataset.promptId);
        if (saved) runCommand(field, adapter, "custom", saved.text);
      });
    });
    panel.querySelectorAll(".wf-prompt-chip-remove").forEach((removeBtn) => {
      const remove = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await window.WriteFlow.Storage.removeSavedPrompt(removeBtn.dataset.removeId);
        openPanel(field);
      };
      removeBtn.addEventListener("mousedown", remove);
      removeBtn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") remove(e); });
    });
    panel.querySelector(".wf-translate").addEventListener("mousedown", (e) => {
      e.preventDefault();
      if (e.currentTarget.dataset.locked === "true") return renderUpsell();
      runCommand(field, adapter, "translate", null, panel.querySelector(".wf-language").value);
    });
  }

  async function extractContextWithRetry(extractor, field) {
    let contextText = extractor.extractPostText(field);
    if (contextText) return contextText;

    // Social feeds frequently mount the editor one frame before the post text
    // around it. Retry briefly before asking the user to paste context.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    contextText = extractor.extractPostText(field);
    if (contextText) return contextText;

    await new Promise((resolve) => setTimeout(resolve, 120));
    return extractor.extractPostText(field);
  }

  // Milestone 4: comment-mode panel. All comment styles are Pro-only
  // (context-reading + generation is a meaningfully higher-value action
  // than rewriting text the user already typed, per the feature plan).
  const PLATFORM_LABELS = { twitter: "X/Twitter", linkedin: "LinkedIn", reddit: "Reddit", youtube: "YouTube", facebook: "Facebook", whatsapp: "WhatsApp Web", slack: "Slack" };

  async function openCommentPanel(field, adapter, postText, extractor) {
    const opening = panelSequence;
    const isPro = await window.WriteFlow.Storage.isPro();
    if (opening !== panelSequence || !field.isConnected) return;
    const host = window.WriteFlow.normalizeHost ? window.WriteFlow.normalizeHost(location.hostname) : location.hostname;
    const charLimit = window.WriteFlow.PlatformCharLimits[host] ||
      ({ twitter: 280, linkedin: 1250 }[extractor.id] || null);
    const platformLabel = PLATFORM_LABELS[extractor.id] || extractor.id;
    const freeSocialIds = window.WriteFlow.Storage.FREE_SOCIAL_STYLE_IDS;

    panel = document.createElement("div");
    panel.className = "wf-panel";
    prepareDialog(panel, "WriteFlow social reply actions");
    activateDialog(panel);

    // Pro + a real extracted post: try tailored, context-analyzed options
    // first. Free tier and posts needing manual paste stay on the fixed
    // per-platform list \u2014 free users can't unlock analyzed options
    // anyway, so there's no reason to spend an API call analyzing for them.
    let styles = window.WriteFlow.getCommentStyles(extractor.id);
    let usedAnalysis = false;
    let analysisMeta = null; // Milestone 2.1: { contentType, sentiment, audience, summary } for the badge row below
    const analysisCacheKey = `${extractor.id}\u0000${window.WriteFlow.ContextModel.serialize(postText)}`;

    if (isPro && postText) {
      if (contextAnalysisCache.has(analysisCacheKey)) {
        const cached = contextAnalysisCache.get(analysisCacheKey);
        styles = cached.replyStrategies;
        analysisMeta = cached;
        usedAnalysis = true;
      } else {
        panel.innerHTML = `
          ${panelHeader("Reading the post\u2026", '<span class="wf-tier-pill">PRO</span>')}
          <div class="wf-sr-only" role="status" aria-live="polite">Analyzing the post to suggest reply options</div>
          <div class="wf-loading">
            <div class="wf-thinking-dots" aria-hidden="true"><i class="wf-thinking-dot"></i><i class="wf-thinking-dot"></i><i class="wf-thinking-dot"></i></div>
            <div class="wf-thinking-copy">Reading the post\u2026</div>
          </div>`;
        showPanelEl(panel);
        bindPanelControls();
        reposition();
        try {
          const request = beginGeneration();
          const analyzed = await window.WriteFlow.AI.analyzeContext({ postText, platform: platformLabel, extractorId: extractor.id, signal: request.controller.signal });
          if (isCurrentRequest(request)) {
            styles = analyzed.replyStrategies;
            analysisMeta = analyzed;
            usedAnalysis = true;
            if (contextAnalysisCache.size >= 20) contextAnalysisCache.delete(contextAnalysisCache.keys().next().value);
            contextAnalysisCache.set(analysisCacheKey, analyzed);
            generation = null;
          }
        } catch (err) {
          // Deliberately silent: fall back to the static list below. The
          // user should never see an error state here \u2014 a failed
          // analysis call is not the same as a failed generation.
          if (opening === panelSequence) generation = null;
        }
        if (!panel || opening !== panelSequence) return; // Ignore a closed or superseded panel.
      }
    }

    panel.innerHTML = `
      ${panelHeader("Reply to this post", isPro ? `<span class="wf-tier-pill">PRO${usedAnalysis ? " \u00b7 tailored" : ""}</span>` : "")}
      <div class="wf-mode-switch" role="tablist">
        <button role="tab" aria-selected="true">Draft reply</button>
        <button role="tab" class="wf-rewrite-mode" aria-selected="false">Rewrite my text</button>
      </div>
      ${usedAnalysis && analysisMeta && (analysisMeta.contentType || analysisMeta.sentiment || analysisMeta.audience) ? `<div class="wf-context-badges-row"${analysisMeta.summary ? ` title="${escapeHtml(analysisMeta.summary)}"` : ""}>
        ${[analysisMeta.contentType, analysisMeta.sentiment].filter(Boolean).length ? `<span class="wf-context-badge-text">${[analysisMeta.contentType, analysisMeta.sentiment].filter(Boolean).map(escapeHtml).join(" \u00b7 ")}</span>` : ""}
        <select class="wf-audience-select" aria-label="Audience for this reply \u2014 correct it if this is wrong">
          <option value=""${!analysisMeta.audience ? " selected" : ""}>Set audience\u2026</option>
          ${(window.WriteFlow.AUDIENCE_CATEGORIES || []).map((cat) => `<option value="${cat}"${analysisMeta.audience === cat ? " selected" : ""}>${cat}</option>`).join("")}
        </select>
      </div>` : ""}
      ${postText ? "" : `<div class="wf-context-fallback"><label for="wf-context-input">Post text could not be detected. Paste it here:</label><textarea id="wf-context-input" class="wf-context-input" placeholder="Paste the post or comment you want to reply to\u2026"></textarea></div>`}
      <div class="wf-cmd-list">
        ${styles.map((s) => {
          // Analyzed options are Pro-only by construction (analysis never
          // runs for free-tier users), so they're never locked. Static
          // options keep the existing free/Pro split.
          const locked = !usedAnalysis && !isPro && !freeSocialIds.includes(s.id);
          return `<button class="wf-cmd${locked ? " wf-locked" : ""}" data-style="${escapeHtml(s.id)}" data-locked="${locked}">
            <span class="wf-cmd-label">${escapeHtml(s.label)}</span>
            ${locked ? `<span class="wf-lock-badge">${svg("lock", 9, 2)}PRO</span>` : ""}
          </button>`;
        }).join("")}
      </div>
    `;
    showPanelEl(panel);
    reposition();
    bindPanelControls();
    // Milestone 5, Batch 3: lets the person correct a wrong (or missing)
    // audience guess. Mutates analysisMeta directly rather than
    // reassigning it -- analysisMeta is the SAME object reference stored
    // in contextAnalysisCache a few lines above, so this also updates the
    // cache, and a cache hit later in this session reflects the
    // correction too. The next reply-style click (or a regenerate/
    // adjustment on an existing one) picks up the corrected value, since
    // runCommentCommand reads analysisMeta.audience at call time.
    const audienceSelect = panel.querySelector(".wf-audience-select");
    if (audienceSelect) {
      audienceSelect.addEventListener("change", () => {
        if (analysisMeta) analysisMeta.audience = audienceSelect.value;
      });
    }
    panel.querySelector(".wf-rewrite-mode").addEventListener("mousedown", (e) => {
      e.preventDefault();
      openRewritePanel(field);
    });

    panel.querySelectorAll(".wf-cmd").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (btn.dataset.locked === "true") {
          renderUpsell();
          return;
        }
        const context = postText || panel.querySelector("#wf-context-input")?.value.trim();
        if (!context) {
          const input = panel.querySelector("#wf-context-input");
          input?.focus();
          input?.setAttribute("aria-invalid", "true");
          return;
        }
        const styleDef = styles.find((s) => s.id === btn.dataset.style);
        // Milestone 5, Batch 2: thread the detected audience through to
        // actual generation -- previously this only affected which badge
        // was displayed above the button list, never reaching the model.
        runCommentCommand(field, adapter, btn.dataset.style, context, platformLabel, charLimit, extractor.id, styleDef, undefined, analysisMeta?.audience || "");
      });
    });
  }

  async function runCommentCommand(field, adapter, styleId, postText, platform, charLimit, extractorId, styleDef, adjustment, audience = "") {
    const request = beginGeneration();
    renderLoading(request);
    try {
      const result = await window.WriteFlow.AI.generateComment({ postText, style: styleId, platform, charLimit, extractorId, styleDef, adjustment, audience, signal: request.controller.signal });
      if (!isCurrentRequest(request)) return;
      // Comments always replace whatever's in the box -- this is drafting
      // a fresh reply, not inserting at a cursor position.
      const styleLabel = styleDef?.label || window.WriteFlow.getCommentStyles(extractorId).find((style) => style.id === styleId)?.label || "Reply";
      renderSuggestion(field, adapter, adapter.getText(field), result.text, false, (nextAdjustment) => runCommentCommand(field, adapter, styleId, postText, platform, charLimit, extractorId, styleDef, nextAdjustment, audience), `${styleLabel} style`, { mode: "comment", action: styleId }, result.usedFallback ? result.fallbackProviderLabel : null, result.hasCustomStyle);
    } catch (err) {
      if (err.name === "AbortError" || !isCurrentRequest(request)) return;
      renderError(err.message || "Something went wrong.");
    } finally {
      if (isCurrentRequest(request)) generation = null;
    }
  }

  // Email reply mode: scenario-based generation from the quoted original
  // email, parallel to comment mode. Also Pro-only, for the same reason
  // (context-reading + generation is higher-value than plain rewrite).
  async function openEmailPanel(field, adapter, originalEmail) {
    const opening = panelSequence;
    const isPro = await window.WriteFlow.Storage.isPro();
    if (opening !== panelSequence || !field.isConnected) return;

    panel = document.createElement("div");
    panel.className = "wf-panel";
    prepareDialog(panel, "WriteFlow email reply actions");
    activateDialog(panel);

    let scenarios = window.WriteFlow.EmailScenarios;
    let usedAnalysis = false;
    let analysisMeta = null; // Milestone 6, Batch 1: { contentType, sentiment, audience, summary }, mirrors openCommentPanel's analysisMeta
    const emailCacheKey = window.WriteFlow.ContextModel.serialize(originalEmail);
    if (isPro) {
      if (emailContextAnalysisCache.has(emailCacheKey)) {
        const cached = emailContextAnalysisCache.get(emailCacheKey);
        scenarios = cached.replyStrategies;
        analysisMeta = cached;
        usedAnalysis = true;
      } else {
        panel.innerHTML = `
          ${panelHeader("Reading the email…", '<span class="wf-tier-pill">PRO</span>')}
          <div class="wf-sr-only" role="status" aria-live="polite">Analyzing the email to suggest reply options</div>
          <div class="wf-loading">
            <div class="wf-thinking-dots" aria-hidden="true"><i class="wf-thinking-dot"></i><i class="wf-thinking-dot"></i><i class="wf-thinking-dot"></i></div>
            <div class="wf-thinking-copy">Reading the email…</div>
          </div>`;
        showPanelEl(panel);
        bindPanelControls();
        reposition();
        try {
          const request = beginGeneration();
          const analyzed = await window.WriteFlow.AI.analyzeEmailContext({ originalEmail, signal: request.controller.signal });
          if (isCurrentRequest(request)) {
            scenarios = analyzed.replyStrategies;
            analysisMeta = analyzed;
            usedAnalysis = true;
            if (emailContextAnalysisCache.size >= 20) emailContextAnalysisCache.delete(emailContextAnalysisCache.keys().next().value);
            emailContextAnalysisCache.set(emailCacheKey, analyzed);
            generation = null;
          }
        } catch (err) {
          // Analysis is an enhancement. Keep the fixed scenarios on any real
          // provider, network, parse, or shape failure without showing noise.
          if (opening === panelSequence) generation = null;
        }
        if (!panel || opening !== panelSequence) return;
      }
    }

    panel.innerHTML = `
      ${panelHeader("Reply to this email", isPro ? `<span class="wf-tier-pill">PRO${usedAnalysis ? " · tailored" : ""}</span>` : "")}
      <div class="wf-mode-switch" role="tablist">
        <button role="tab" aria-selected="true">Draft reply</button>
        <button role="tab" class="wf-rewrite-mode" aria-selected="false">Rewrite my text</button>
      </div>
      ${usedAnalysis && analysisMeta && (analysisMeta.contentType || analysisMeta.sentiment || analysisMeta.audience) ? `<div class="wf-context-badges-row"${analysisMeta.summary ? ` title="${escapeHtml(analysisMeta.summary)}"` : ""}>
        ${[analysisMeta.contentType, analysisMeta.sentiment].filter(Boolean).length ? `<span class="wf-context-badge-text">${[analysisMeta.contentType, analysisMeta.sentiment].filter(Boolean).map(escapeHtml).join(" · ")}</span>` : ""}
        <select class="wf-audience-select" aria-label="Audience for this reply — correct it if this is wrong">
          <option value=""${!analysisMeta.audience ? " selected" : ""}>Set audience…</option>
          ${(window.WriteFlow.AUDIENCE_CATEGORIES || []).map((cat) => `<option value="${cat}"${analysisMeta.audience === cat ? " selected" : ""}>${cat}</option>`).join("")}
        </select>
      </div>` : ""}
      <div class="wf-cmd-list">
        ${scenarios.map((s) => {
          const locked = !isPro;
          return `<button class="wf-cmd${locked ? " wf-locked" : ""}" data-scenario="${escapeHtml(s.id)}" data-locked="${locked}">
            <span class="wf-cmd-label">${escapeHtml(s.label)}</span>
            ${locked ? `<span class="wf-lock-badge">${svg("lock", 9, 2)}PRO</span>` : ""}
          </button>`;
        }).join("")}
      </div>
    `;
    showPanelEl(panel);
    bindPanelControls();
    // Milestone 6, Batch 1: same audience-correction wiring as
    // openCommentPanel (Milestone 5, Batch 3) -- mutates analysisMeta in
    // place, which also updates emailContextAnalysisCache since it holds
    // the same object reference.
    const audienceSelect = panel.querySelector(".wf-audience-select");
    if (audienceSelect) {
      audienceSelect.addEventListener("change", () => {
        if (analysisMeta) analysisMeta.audience = audienceSelect.value;
      });
    }
    panel.querySelector(".wf-rewrite-mode").addEventListener("mousedown", (e) => {
      e.preventDefault();
      openRewritePanel(field);
    });

    panel.querySelectorAll(".wf-cmd").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (btn.dataset.locked === "true") {
          renderUpsell();
          return;
        }
        const scenarioDef = scenarios.find((scenario) => scenario.id === btn.dataset.scenario);
        runEmailCommand(field, adapter, btn.dataset.scenario, originalEmail, scenarioDef, undefined, analysisMeta?.audience || "");
      });
    });
  }

  async function runEmailCommand(field, adapter, scenarioId, originalEmail, scenarioDef, adjustment, audience = "") {
    const request = beginGeneration();
    renderLoading(request);
    try {
      const result = await window.WriteFlow.AI.generateEmailReply({ originalEmail, scenario: scenarioId, scenarioDef, adjustment, audience, signal: request.controller.signal });
      if (!isCurrentRequest(request)) return;
      const scenarioLabel = scenarioDef?.label || window.WriteFlow.EmailScenarios.find((scenario) => scenario.id === scenarioId)?.label || "Email reply";
      renderSuggestion(field, adapter, adapter.getText(field), result.text, false, (nextAdjustment) => runEmailCommand(field, adapter, scenarioId, originalEmail, scenarioDef, nextAdjustment, audience), scenarioLabel, { mode: "email", action: scenarioId }, result.usedFallback ? result.fallbackProviderLabel : null, result.hasCustomStyle);
    } catch (err) {
      if (err.name === "AbortError" || !isCurrentRequest(request)) return;
      renderError(err.message || "Something went wrong.");
    } finally {
      if (isCurrentRequest(request)) generation = null;
    }
  }

  function renderUpsell() {
    if (!panel) return;
    panel.innerHTML = `
      ${panelHeader("Pro feature", '<span class="wf-tier-pill">PRO</span>')}
      <div class="wf-upsell">
        <div class="wf-upsell-title">Unlock every writing style</div>
        <div class="wf-upsell-desc">This style is part of WriteFlow Pro \u2014 a one-time payment, no subscription. Free plan includes Rewrite, Shorten and Fix grammar.</div>
        <div class="wf-actions" style="padding: 0;">
          <button class="wf-btn-primary" id="wf-upgrade">Open Settings to unlock</button>
        </div>
      </div>
    `;
    reposition();
    bindPanelControls();
    panel.querySelector("#wf-upgrade").addEventListener("mousedown", (e) => {
      e.preventDefault();
      // chrome.runtime.openOptionsPage() does not work from a content
      // script (restricted API surface) \u2014 relay through the background
      // service worker instead, which DOES have access to it.
      chrome.runtime.sendMessage({ type: "OPEN_OPTIONS_PAGE" });
      removePanel();
    });
  }

  function openRewritePanel(field) {
    return openPanel(field, { rewriteOnly: true });
  }

  function beginGeneration() {
    cancelGeneration();
    const request = { id: ++requestSequence, controller: new AbortController() };
    generation = request;
    return request;
  }

  function isCurrentRequest(request) {
    return generation?.id === request.id && !request.controller.signal.aborted && activeField?.isConnected && activeUrl === location.href;
  }

  async function runCommand(field, adapter, command, customPrompt, language, adjustment) {
    const selected = adapter.getSelectedText(field);
    const full = adapter.getText(field);
    const text = selected && selected.length > 0 ? selected : full;
    if (!text || !text.trim()) {
      renderError("Nothing to rewrite \u2014 type or select some text first.");
      return;
    }

    const request = beginGeneration();
    renderLoading(request);
    try {
      const result = await window.WriteFlow.AI.generate({ command, text, customPrompt, language, adjustment, signal: request.controller.signal });
      if (!isCurrentRequest(request)) return;
      const commandLabel = window.WriteFlow.Commands.find((item) => item.id === command)?.label || "Matches your request";
      renderSuggestion(field, adapter, text, result.text, selected && selected.length > 0, (nextAdjustment) => runCommand(field, adapter, command, customPrompt, language, nextAdjustment), matchLabelFor(command, commandLabel), { mode: "writing", action: command }, result.usedFallback ? result.fallbackProviderLabel : null, result.hasCustomStyle);
    } catch (err) {
      if (err.name === "AbortError" || !isCurrentRequest(request)) return;
      renderError(err.message || "Something went wrong.");
    } finally {
      if (isCurrentRequest(request)) generation = null;
    }
  }

  
  // Milestone 3 (Write It For Me), Batch 1: generic-only for now (no
  // platform-specific scenario presets yet — those land in later
  // batches). Mirrors runCommand's shape but has no existing text to
  // require or embed; the instruction the user types IS the content.
  async function runWriteForMe(field, adapter, instruction, scenarioDef, adjustment) {
    if (!instruction || !instruction.trim()) {
      renderError("Type what you want it to say first.");
      return;
    }
    const request = beginGeneration();
    renderLoading(request);
    try {
      const result = await window.WriteFlow.AI.generateFromInstruction({ instruction, scenarioDef, adjustment, signal: request.controller.signal });
      if (!isCurrentRequest(request)) return;
      renderSuggestion(field, adapter, "", result.text, false,
        (nextAdjustment) => runWriteForMe(field, adapter, instruction, scenarioDef, nextAdjustment),
        "Written from your instruction", { mode: "write-for-me", action: scenarioDef?.id || "generic" },
        result.usedFallback ? result.fallbackProviderLabel : null, result.hasCustomStyle);
    } catch (err) {
      if (err.name === "AbortError" || !isCurrentRequest(request)) return;
      renderError(err.message || "Something went wrong.");
    } finally {
      if (isCurrentRequest(request)) generation = null;
    }
  }

  // The panel shown for a genuinely blank field, instead of the normal
  // rewrite-focused command menu (which has nothing to act on here).
  function openWriteForMePanel(field, adapter, platformId) {
    const scenarios = (platformId && window.WriteFlow.WriteForMeScenarios[platformId]) || window.WriteFlow.WriteForMeScenarios.generic;
    panel = document.createElement("div");
    panel.className = "wf-panel";
    prepareDialog(panel, "WriteFlow write it for me");
    panel.innerHTML = `
      ${panelHeader("Write it for me")}
      <div class="wf-wfm-scenarios" role="group" aria-label="What kind of writing">
        ${scenarios.map((s, i) => `<button class="wf-wfm-scenario${i === 0 ? " wf-wfm-scenario-active" : ""}" data-scenario="${s.id}" aria-pressed="${i === 0}">${escapeHtml(s.label)}</button>`).join("")}
      </div>
      <div class="wf-custom-row" style="padding-top: 4px;">
        <textarea class="wf-custom-input wf-wfm-input" rows="3" placeholder="e.g. Ask Sarah if we can move tomorrow's meeting to Friday afternoon…" aria-label="What do you want it to say"></textarea>
      </div>
      <div class="wf-actions" style="padding: 0 14px 12px;">
        <button class="wf-btn-primary wf-wfm-generate" type="button">Generate</button>
      </div>
    `;
    showPanelEl(panel);
    bindPanelControls();
    activateDialog(panel);

    let activeScenario = scenarios[0];
    panel.querySelectorAll(".wf-wfm-scenario").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        activeScenario = scenarios.find((s) => s.id === btn.dataset.scenario) || null;
        panel.querySelectorAll(".wf-wfm-scenario").forEach((b) => {
          b.classList.toggle("wf-wfm-scenario-active", b === btn);
          b.setAttribute("aria-pressed", String(b === btn));
        });
      });
    });

    const input = panel.querySelector(".wf-wfm-input");
    const fire = () => runWriteForMe(field, adapter, input.value.trim(), activeScenario, null);
    panel.querySelector(".wf-wfm-generate").addEventListener("mousedown", (e) => {
      e.preventDefault();
      fire();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) fire();
      if (e.key === "Escape") removePanel();
    });
    requestAnimationFrame(() => input.focus());
  }

  function renderLoading(request) {
    if (!panel) return;
    stopThinking();
    const thinkingPhrases = ["Reading the room…", "Choosing words…", "Almost there…"];
    panel.innerHTML = `
      <div class="wf-panel-header"><span>Writing\u2026</span><button class="wf-icon-btn" id="wf-cancel" aria-label="Cancel generation">×</button></div>
      <div class="wf-sr-only" role="status" aria-live="polite">Generating a writing suggestion</div>
      <div class="wf-loading">
        <div class="wf-thinking-dots" aria-hidden="true"><i class="wf-thinking-dot"></i><i class="wf-thinking-dot"></i><i class="wf-thinking-dot"></i></div>
        <div class="wf-thinking-copy">${thinkingPhrases[0]}</div>
      </div>`;
    reposition();
    if (!prefersReducedMotion()) {
      let phraseIndex = 0;
      thinkingTimer = setInterval(() => {
        const copy = panel?.querySelector(".wf-thinking-copy");
        if (!copy) return stopThinking();
        phraseIndex = (phraseIndex + 1) % thinkingPhrases.length;
        copy.textContent = thinkingPhrases[phraseIndex];
      }, 1500);
    }
    panel.querySelector("#wf-cancel").addEventListener("mousedown", (e) => {
      e.preventDefault();
      if (isCurrentRequest(request)) cancelGeneration();
      removePanel();
    });
  }

  function renderError(message) {
    if (!panel) return;
    stopThinking();
    panel.innerHTML = `<div class="wf-error" role="alert" aria-live="assertive">${escapeHtml(message)}</div>
      <div class="wf-actions"><button class="wf-btn-primary" id="wf-close">Close</button></div>`;
    reposition();
    panel.querySelector("#wf-close").addEventListener("mousedown", (e) => {
      e.preventDefault();
      closeAll();
    });
  }

  // Milestone 7, Batch 1 (Dynamic Adjustment Chips). Full catalog from the
  // spec; sound_like_me is defined here but deliberately never auto-
  // selected yet -- it needs an async Style DNA lookup renderSuggestion
  // doesn't have, wired in Batch 2. add_humour is defined but also not
  // auto-selected -- appropriateness is too context-dependent to guess
  // safely with a cheap local heuristic; left in the catalog in case a
  // future batch adds a real signal for it.
  const ADJUSTMENT_CATALOG = {
    shorter: { label: "Shorter", instruction: "Make the response shorter while preserving key information." },
    more_casual: { label: "More casual", instruction: "Make the tone more casual and relaxed." },
    more_confident: { label: "More confident", instruction: "Make the tone more confident and assertive, without overstating anything." },
    more_professional: { label: "More professional", instruction: "Use a more formal, professional tone without changing the facts." },
    warmer: { label: "Warmer", instruction: "Make the tone warmer and more personable." },
    less_enthusiastic: { label: "Less enthusiastic", instruction: "Tone down the enthusiasm -- make it read as more measured and matter-of-fact." },
    add_humour: { label: "Add humour", instruction: "Add a light touch of humour where it fits naturally, without undermining the message." },
    remove_emojis: { label: "Remove emojis", instruction: "Remove all emoji from the response." },
    ask_a_question: { label: "Ask a question", instruction: "End with one genuine, specific question to invite a response." },
    make_punchier: { label: "Make punchier", instruction: "Make the response punchier and more direct -- tighten the wording, cut filler." },
    different_angle: { label: "Different angle", instruction: "Take a genuinely different angle while staying grounded in the same context." },
    // Milestone 8, Batch 2: this is now the explicit "Sound Natural"
    // feature -- strengthened from a generic "vary sentence rhythm" hint
    // into the full pattern-avoidance instruction the spec asks for.
    // Framed purely as writing quality; never mentions or implies AI
    // detection anywhere in this label or instruction, deliberately.
    sound_more_natural: { label: "Sound more natural", instruction: `${window.WriteFlow.NATURAL_WRITING_INSTRUCTION} This is the specific thing being asked for right now, so apply it more directly than a light touch: actively rewrite away from anything that reads as stiff or AI-generated, while keeping every fact and the actual meaning exactly intact.` },
    sound_like_me: { label: "Sound like me", instruction: "Match my personal writing style as closely as possible based on my writing samples and style preferences." }
  };

  // Cheap, local, synchronous signals only -- no extra AI call to decide
  // which chips to show (this project deliberately avoids automatic AI
  // requests beyond what the person asked for; see Milestone 20's cost-
  // control principle elsewhere in this project's history). Returns 3-5
  // chip definitions, most-relevant-first.
  function selectAdjustments(suggestionText, mode, hasCustomStyle = false) {
    const text = String(suggestionText || "");
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
    const hasQuestion = /\?/.test(text);
    const isShort = wordCount <= 12;

    const picks = [];
    if (wordCount >= 40) picks.push("shorter");
    else if (!isShort) picks.push("make_punchier");

    if (hasEmoji) picks.push("remove_emojis");

    // Milestone 7, Batch 2: only offer this once there's actually
    // something to personalize toward -- a chip promising to "sound like
    // you" when WriteFlow has never been told anything about how you
    // write would be an empty promise. Placed early (but not first) so it
    // gets real priority without always crowding out a length fix.
    if (hasCustomStyle) picks.push("sound_like_me");

    if (!hasQuestion && (mode === "comment" || mode === "email" || mode === "write-for-me")) picks.push("ask_a_question");

    if (mode === "email") picks.push("more_professional", "warmer");
    else if (mode === "comment") picks.push("more_casual", "warmer");
    else picks.push("sound_more_natural");

    picks.push("different_angle");

    const seen = new Set();
    const selected = picks.filter((id) => (seen.has(id) ? false : (seen.add(id), true))).slice(0, 5);
    const fallbackPool = ["different_angle", "sound_more_natural", "make_punchier", "more_confident", "less_enthusiastic"];
    for (const id of fallbackPool) {
      if (selected.length >= 3) break;
      if (!seen.has(id)) { selected.push(id); seen.add(id); }
    }
    return selected.map((id) => ({ id, ...ADJUSTMENT_CATALOG[id] }));
  }

  function renderSuggestion(field, adapter, originalText, suggestionText, wasSelection, regenerate, matchLabel = "Matches your style", feedbackContext = { mode: "writing", action: "unknown" }, usedFallbackLabel = null, hasCustomStyle = false) {
    if (!panel) return;
    stopThinking();
    panel.innerHTML = `
      ${panelHeader("Suggestion")}
      <div class="wf-sr-only" role="status" aria-live="polite">Suggestion ready</div>
      <div class="wf-match">✓ ${escapeHtml(matchLabel)}</div>
      ${usedFallbackLabel ? `<div class="wf-match" style="color: var(--wf-muted);">↻ Your primary provider didn't respond \u2014 used ${escapeHtml(usedFallbackLabel)} instead</div>` : ""}
      <div class="wf-body">${wordRevealHtml(suggestionText)}</div>
      <div class="wf-adjustments" aria-label="Regenerate with feedback">
        <span>Adjust:</span>
        ${selectAdjustments(suggestionText, feedbackContext?.mode, hasCustomStyle).map((adj) => `<button class="wf-adjustment" data-adjustment="${escapeHtml(adj.instruction)}">${escapeHtml(adj.label)}</button>`).join("")}
      </div>
      <div class="wf-actions">
        <button class="wf-btn-primary" id="wf-replace">Replace</button>
        <button class="wf-btn-ghost" id="wf-insert">Insert</button>
        <button class="wf-btn-ghost" id="wf-copy">Copy</button>
        <button class="wf-btn-ghost" id="wf-again">Regenerate</button>
      </div>
    `;
    reposition();
    bindPanelControls();
    panel.querySelectorAll(".wf-adjustment").forEach((button) => {
      button.addEventListener("mousedown", (e) => {
        e.preventDefault();
        regenerate(button.dataset.adjustment);
      });
    });
    panel.querySelector("#wf-replace").addEventListener("mousedown", (e) => {
      e.preventDefault();
      const fullBefore = adapter.getText(field);
      const commitReplacement = () => {
        undoByField.set(field, { adapter, fullBefore });
        if (wasSelection) adapter.insertText(field, suggestionText);
        else adapter.replaceText(field, suggestionText);
        // Milestone 4, Batch 2: record what WriteFlow actually inserted so
        // a later blur can compare it to what the person left it as.
        pendingEditTracking.set(field, suggestionText);
      };
      if (prefersReducedMotion()) {
        commitReplacement();
        renderReplaced("Replaced", feedbackContext);
        return;
      }

      panel.querySelectorAll("button").forEach((button) => { button.disabled = true; });
      const body = panel.querySelector(".wf-body");
      body.innerHTML = `<span class="wf-diff-old">${escapeHtml(originalText)}</span>`;
      scheduleUI(() => {
        if (!body.isConnected) return;
        commitReplacement();
        body.innerHTML = wordRevealHtml(suggestionText, 0);
        scheduleUI(() => renderReplaced("Replaced", feedbackContext), 200);
      }, 200);
    });
    panel.querySelector("#wf-insert").addEventListener("mousedown", (e) => {
      e.preventDefault();
      undoByField.set(field, { adapter, fullBefore: adapter.getText(field) });
      adapter.insertText(field, suggestionText);
      pendingEditTracking.set(field, suggestionText);
      renderReplaced("Inserted");
    });
    panel.querySelector("#wf-copy").addEventListener("mousedown", (e) => {
      e.preventDefault();
      const copyButton = e.currentTarget;
      navigator.clipboard.writeText(suggestionText).then(() => {
        copyButton.textContent = "Copied";
        setTimeout(() => { if (copyButton.isConnected) copyButton.textContent = "Copy"; }, 1200);
      }).catch(() => renderError("Could not access the clipboard. Select and copy the suggestion manually."));
    });
    panel.querySelector("#wf-again").addEventListener("mousedown", (e) => {
      e.preventDefault();
      regenerate();
    });
  }

  function renderReplaced(action = "Replaced", feedbackContext = null) {
    if (!panel) return;
    stopThinking();
    panel.innerHTML = `
      <div class="wf-body" role="status" aria-live="polite" style="border-left-color: var(--wf-muted); color: var(--wf-muted);">${action}.</div>
      ${feedbackContext ? `<div class="wf-feedback"><span>Did this sound like you?</span><button id="wf-feedback-up" aria-label="Good suggestion">👍</button><button id="wf-feedback-down" aria-label="Poor suggestion">👎</button></div>` : ""}
      <div class="wf-actions">
        <button class="wf-btn-ghost" id="wf-undo">Undo</button>
        <button class="wf-btn-ghost" id="wf-close3">Close</button>
      </div>
    `;
    reposition();
    if (feedbackContext) {
      const captureFeedback = async (rating) => {
        const controls = panel.querySelector(".wf-feedback");
        controls.querySelectorAll("button").forEach((button) => { button.disabled = true; });
        await window.WriteFlow.Storage.addFeedback({ ...feedbackContext, rating });
        controls.innerHTML = "<span>Thanks — feedback saved locally.</span>";
      };
      panel.querySelector("#wf-feedback-up").addEventListener("mousedown", (e) => { e.preventDefault(); captureFeedback("up"); });
      panel.querySelector("#wf-feedback-down").addEventListener("mousedown", (e) => { e.preventDefault(); captureFeedback("down"); });
    }
    panel.querySelector("#wf-undo").addEventListener("mousedown", (e) => {
      e.preventDefault();
      const undo = activeField && undoByField.get(activeField);
      if (undo) {
        undo.adapter.replaceText(activeField, undo.fullBefore);
        undoByField.delete(activeField);
      }
      removePanel();
    });
    panel.querySelector("#wf-close3").addEventListener("mousedown", (e) => {
      e.preventDefault();
      closeAll();
    });
  }

  // P0-1 fix (launch-readiness audit): the previous implementation used a
  // textContent -> innerHTML round-trip, which does NOT escape " or ' \u2014
  // confirmed via direct testing. That made it unsafe wherever output was
  // interpolated into an HTML ATTRIBUTE (e.g. data-style="${...}"), even at
  // call sites that were already calling this function expecting it to be
  // safe there. Replaced with explicit character escaping that covers both
  // text-node and attribute-value contexts, since HTML entities for quotes
  // are valid (and harmless) in text-node context too \u2014 there's no
  // correctness cost to escaping them everywhere.
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function wordRevealHtml(text, stagger = 15) {
    if (prefersReducedMotion()) return escapeHtml(text);
    let wordIndex = 0;
    return String(text).split(/(\s+)/).map((part) => {
      if (!part || /^\s+$/.test(part)) return escapeHtml(part);
      // 180ms word animation + <=210ms delay keeps even long suggestions
      // under the requested ~400ms total reveal window.
      const delay = Math.min(wordIndex++ * stagger, 210);
      return `<span class="wf-word" style="--wf-delay:${delay}ms">${escapeHtml(part)}</span>`;
    }).join("");
  }

  function matchLabelFor(command, label) {
    if (command === "grammar") return "Grammar checked";
    if (command === "professional" || command === "friendly") return `${label} tone`;
    if (command === "custom") return "Matches your request";
    if (command === "translate") return `${label} style`;
    return `${label} result`;
  }

  function prepareDialog(el, label) {
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "false");
    el.setAttribute("aria-label", label);
    el.tabIndex = -1;
  }

  function activateDialog(el) {
    const focusables = () => Array.from(el.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); removePanel(); return; }
      const items = focusables();
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && items.length) {
        const i = items.indexOf(shadow.activeElement);
        e.preventDefault();
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
      }
      if (e.key === "Tab" && items.length) {
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && shadow.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && shadow.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    requestAnimationFrame(() => (focusables()[0] || el).focus({ preventScroll: true }));
  }

  function handleScroll(e) {
    // Scrolling the host page should never leave a fixed WriteFlow card
    // floating over unrelated feed content. Collapse it to the trigger;
    // scrolling inside the suggestion body remains available.
    if (panel && !e.composedPath().includes(panel)) {
      removePanel();
      return;
    }
    reposition();
  }

  function handleOutsidePointer(e) {
    if (!panel) return;
    const path = e.composedPath();
    if (!path.includes(panel) && !path.includes(trigger)) removePanel();
  }

  window.addEventListener("scroll", handleScroll, true);
  window.addEventListener("resize", reposition);
  document.addEventListener("pointerdown", handleOutsidePointer, true);
  shadow.addEventListener('click', event => {
    if (event.detail !== 0) return;
    const button = event.target.closest?.('button');
    if (button && !button.disabled) button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  });

  // Milestone 4, Batch 2 (Style DNA): called on blur for EVERY field
  // (content/index.js passes every blurred element through, not just
  // ones with an active panel), so this is a cheap no-op check for the
  // vast majority of fields that were never given a WriteFlow suggestion.
  // Reads the field's current text itself — it doesn't need the panel
  // to still be open, since the person may have clicked Replace/Insert,
  // closed the panel, edited the text, then moved on much later.
  function checkFieldEdit(field) {
    if (!field || !pendingEditTracking.has(field)) return;
    const suggestionText = pendingEditTracking.get(field);
    pendingEditTracking.delete(field);
    const adapter = window.WriteFlow.AdapterRegistry.getAdapter(field);
    if (!adapter) return;
    const currentText = adapter.getText(field);
    window.WriteFlow.Storage.recordStyleEdit(suggestionText, currentText).catch(() => {});
  }

  return { showTrigger, removeTrigger, removePanel, closeAll, openPanel, checkFieldEdit };
})();
