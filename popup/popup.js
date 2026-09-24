// popup/popup.js
const KEYS = ["enabled", "apiKey", "provider", "usage", "siteBlocklist", "tier"];
const USAGE_DISPLAY_CAP = 30; // visual reference point for the progress bar only, not an enforced limit

// Must mirror manifest.json's content_scripts[0].js exactly \u2014 this is the
// same script list, just registered dynamically for a site the user opts
// into at runtime instead of one baked into the static manifest.
const CONTENT_SCRIPT_FILES = [
  "services/storage.js",
  "services/style-learning.js",
  "services/context-model.js",
  "services/promptBuilder.js",
  "services/ai.js",
  "content/detector.js",
  "content/adapters.js",
  "content/context-dom.js",
  "content/platform-adapters.js",
  "content/context-extractors.js",
  "content/ui.js",
  "content/index.js"
];

async function getSettings() {
  return chrome.storage.local.get(KEYS);
}

function currentTabOrigin(tab) {
  if (!tab?.url) return null;
  try {
    const u = new URL(tab.url);
    if (!/^https?:$/.test(u.protocol)) return null; // can't run on chrome://, about:, etc.
    return u;
  } catch (_) {
    return null;
  }
}

async function refresh() {
  const s = await getSettings();
  const isPro = s.tier === "pro";
  const provider = s.provider || "mock";

  document.getElementById("enabled-toggle").checked = s.enabled !== false;
  document.getElementById("status-text").textContent = s.enabled !== false ? "Active" : "Disabled";

  const count = s.usage?.count || 0;
  document.getElementById("usage-count").textContent = `${count} generation${count === 1 ? "" : "s"}`;
  const pct = Math.min(100, Math.round((count / USAGE_DISPLAY_CAP) * 100));
  document.getElementById("usage-fill").style.width = `${pct}%`;

  document.getElementById("no-key-warning").style.display = provider === "mock" || s.apiKey ? "none" : "block";

  document.getElementById("tier-badge").textContent = isPro ? "PRO" : "FREE";
  document.getElementById("tier-badge").className = `tier-pill ${isPro ? "pro" : "free"}`;
  document.getElementById("upgrade-banner").style.display = isPro ? "none" : "block";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = currentTabOrigin(tab);
  const permissionCard = document.getElementById("site-permission-card");
  const disableSiteLink = document.getElementById("disable-site");

  if (!url) {
    permissionCard.style.display = "none";
    disableSiteLink.style.display = "none";
    return;
  }

  const origin = `${url.origin}/*`;
  const hasAccess = await chrome.permissions.contains({ origins: [origin] });

  if (!hasAccess) {
    // WriteFlow has no host permission here at all yet \u2014 the "enable/
    // disable" blocklist toggle is meaningless until that's granted.
    permissionCard.style.display = "block";
    disableSiteLink.style.display = "none";
    return;
  }

  permissionCard.style.display = "none";
  disableSiteLink.style.display = "block";
  const host = url.hostname;
  const blocked = (s.siteBlocklist || []).includes(host);
  if (blocked && s.enabled !== false) document.getElementById("status-text").textContent = "Disabled here";
  disableSiteLink.textContent = blocked ? "Enable on this site" : "Disable on this site";
}

document.getElementById("enabled-toggle").addEventListener("change", async (e) => {
  await chrome.storage.local.set({ enabled: e.target.checked });
  refresh();
});

document.getElementById("open-options").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

document.getElementById("upgrade-link").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

document.getElementById("enable-site").addEventListener("click", async (e) => {
  e.preventDefault();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = currentTabOrigin(tab);
  if (!url) return;

  const origin = `${url.origin}/*`;
  const granted = await chrome.permissions.request({ origins: [origin] });
  if (!granted) return;

  // Register a persistent dynamic content script for this origin so
  // WriteFlow keeps working here on future visits/reloads, not just once.
  const id = `wf-dynamic-${url.hostname}`;
  const already = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
  if (!already.length) {
    await chrome.scripting.registerContentScripts([{
      id,
      matches: [origin],
      js: CONTENT_SCRIPT_FILES,
      runAt: "document_idle"
    }]);
  }

  await chrome.tabs.reload(tab.id);
  window.close();
});

document.getElementById("disable-site").addEventListener("click", async (e) => {
  e.preventDefault();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  let host;
  try { host = new URL(tab.url).hostname; } catch (_) { return; }
  if (!host) return;
  const s = await getSettings();
  const list = s.siteBlocklist || [];
  const next = list.includes(host) ? list.filter((h) => h !== host) : [...list, host];
  await chrome.storage.local.set({ siteBlocklist: next });
  refresh();
});

refresh();
