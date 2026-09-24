// content/index.js — Milestone 1-3 entry point
(async function () {
  const settings = await window.WriteFlow.Storage.getSettings();
  let currentSettings = settings;
  let blocked = await window.WriteFlow.Storage.isSiteBlocked(location.hostname);

  window.WriteFlow.Detector.observe({
    onFocus(el) {
      if (currentSettings.enabled && !blocked && currentSettings.showFloatingButton) {
        window.WriteFlow.UI.showTrigger(el);
      }
    },
    onBlur(el) {
      // Milestone 4, Batch 2 (Style DNA): fires for every blurred field,
      // not just ones with an active trigger/panel \u2014 checkFieldEdit is a
      // cheap no-op unless this specific field was just given a WriteFlow
      // suggestion the person accepted (Replace/Insert).
      window.WriteFlow.UI.checkFieldEdit(el);
      // Small delay so a click on the trigger/panel (which steals focus
      // via mousedown+preventDefault) doesn't get raced by blur removal.
      setTimeout(() => {
        const active = window.WriteFlow.Detector.resolveEditableTarget(document.activeElement);
        if (!active || !window.WriteFlow.Detector.isEditableCandidate(active)) {
          window.WriteFlow.UI.removeTrigger();
        }
      }, 120);
    }
  });

  // Keyboard shortcut relay from background (Ctrl/Cmd+Shift+Space)
  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (sender.id !== chrome.runtime.id) return;
    if (msg?.type === "OPEN_WRITEFLOW") {
      const active = window.WriteFlow.Detector.resolveEditableTarget(document.activeElement);
      if (currentSettings.enabled && !blocked && active && window.WriteFlow.Detector.isEditableCandidate(active)) {
        window.WriteFlow.UI.openPanel(active, { quickRewrite: true });
      }
    }
  });

  chrome.storage.onChanged.addListener(async (_changes, area) => {
    if (area !== "local") return;
    currentSettings = await window.WriteFlow.Storage.getSettings();
    blocked = await window.WriteFlow.Storage.isSiteBlocked(location.hostname);
    if (!currentSettings.enabled || blocked || !currentSettings.showFloatingButton) {
      window.WriteFlow.UI.closeAll();
    }
  });
})();
