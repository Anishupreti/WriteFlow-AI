// background/service-worker.js
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-writeflow") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "OPEN_WRITEFLOW" }).catch(() => {});
  }
});

// chrome.runtime.openOptionsPage() is NOT available inside content scripts
// (only a restricted subset of chrome.runtime is exposed there) \u2014 it only
// works from extension pages and the background service worker. Content
// scripts relay through this message instead.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (sender.id !== chrome.runtime.id) return;
  if (msg?.type === "OPEN_OPTIONS_PAGE") {
    chrome.runtime.openOptionsPage();
  }
});

// First-run onboarding: open Settings once on fresh install so a new user
// lands somewhere that explains what WriteFlow does, how the Mock provider
// lets them try it with zero setup, and that real generation sends text to
// their chosen third-party AI provider. Does not fire on updates \u2014 only
// on the initial install, matching the "reason" Chrome reports.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const scripts = await chrome.scripting.getRegisteredContentScripts();
  const js = chrome.runtime.getManifest().content_scripts[0].js;
  const updates = scripts.filter(script => script.id.startsWith('wf-dynamic-')).map(script => ({ id: script.id, js }));
  if (updates.length) await chrome.scripting.updateContentScripts(updates);
});
