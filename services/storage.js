// services/storage.js
// Wraps chrome.storage. API key lives in storage.local ONLY (never .sync),
// so it never leaves the user's machine via Google's sync servers.
window.WriteFlow = window.WriteFlow || {};

window.WriteFlow.Storage = (function () {
  const DEFAULTS = {
    enabled: true,
    showFloatingButton: true,
    defaultTone: "professional",
    theme: "system",
    provider: "mock", // 'openai' | 'anthropic' | 'gemini' | 'groq' | 'openrouter' | 'mock'; decision: retain zero-key first-run demo
    mockFailureMode: "", // test harness only: '', '400', '429', '500', '500-once', or 'network'
    apiKey: "", // deprecated single-key field, kept for backward compatibility \u2014 see apiKeys below
    apiKeys: {}, // { openai, anthropic, gemini, groq, openrouter } \u2014 lets a backup provider's key
                 // persist even while a different provider is selected as primary
    fallbackProvider: "", // '' | provider id; tried automatically if the primary provider's call fails
    writingSamples: [], // 2-3 user-provided examples used only when building prompts
    styleNotes: "", // optional plain-language guidance such as "short, casual sentences"
    feedbackLog: [], // capture-only signal for future style learning; never sent automatically
    siteBlocklist: [], // hostnames where WriteFlow is disabled
    usage: { count: 0, resetAt: null }, // local-only display counter, not enforced
    tier: "free", // 'free' | 'pro' \u2014 set by a verified license, never trust blindly elsewhere
    licenseKey: "",
    licenseVerifiedAt: null,
    hasSeenWelcome: false, // legacy dismissed-once flag from the old welcome banner; treated as "onboarding complete" for upgrades, see migration below
    onboardingComplete: false, // true once the wizard is finished or explicitly skipped
    onboardingStep: 1, // 1-5, lets a partially-completed wizard resume instead of restarting
    onboardingProvider: "", // provider picked mid-wizard, before a key is validated/saved
    savedPrompts: [], // { id, text } — reusable custom instructions, shown as one-click chips (Pro feature, same gate as custom instructions)

    // Milestone 4 (Style DNA), Batch 1: a local-only writing-preference
    // profile, supplementing (not replacing) the manual writingSamples/
    // styleNotes above. Numeric fields are 0-1 (0.5 = neutral/no signal);
    // categorical fields are "minimal"|"medium"|"warm" for greeting/
    // signoff style, "short"|"medium"|"long" for sentence length, and
    // "simple"|"medium"|"rich" for vocabulary complexity ("medium" =
    // neutral for all three). This is preference metadata, not a claim
    // about the person's personality. Never leaves the device; nothing
    // here is sent anywhere except as part of a normal generation prompt,
    // same as writingSamples/styleNotes already are.
    styleDNA: {
      brevity: 0.5,
      formality: 0.5,
      warmth: 0.5,
      emojiFrequency: 0.5,
      contractionPreference: 0.5,
      sentenceLength: "medium",
      vocabularyComplexity: "medium",
      greetingStyle: "medium",
      signoffStyle: "medium"
    },
    styleDNASamples: 0, // how many learning signals have been folded in; 0 = still at neutral defaults, never learned from — gates whether styleDNA is injected into prompts at all
    styleDNALearningEnabled: false // Milestone 4.2 opt-in, default OFF per spec ("default behaviour must respect privacy"); added now so Batch 2/3 don't need another migration
  };

  // Commands available on the free tier. Everything else in
  // window.WriteFlow.Commands requires tier === 'pro'.
  const FREE_COMMAND_IDS = ["rewrite", "shorten", "grammar"];
  const FREE_SOCIAL_STYLE_IDS = ["agree_add_value", "ask_question", "congratulate_insight", "professional_question", "praise_content", "follow_up_question", "supportive", "check_in", "acknowledge_message", "quick_answer", "answer_directly", "clarify_work"];

  async function getSettings() {
    const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
    const merged = { ...DEFAULTS, ...stored, apiKeys: { ...DEFAULTS.apiKeys, ...(stored.apiKeys || {}) } };
    // Backward compat: older installs only ever wrote the single `apiKey`
    // field for whichever provider was selected at the time. Fold it into
    // apiKeys so it survives switching the primary provider and can be used
    // as a fallback key too.
    if (merged.apiKey && !merged.apiKeys[merged.provider]) {
      merged.apiKeys[merged.provider] = merged.apiKey;
    }
    // Migration: installs from before the wizard existed already dismissed
    // the old welcome banner via hasSeenWelcome. Don't force them through a
    // new wizard they never asked for.
    if (merged.hasSeenWelcome && !stored.onboardingComplete) {
      merged.onboardingComplete = true;
    }
    return merged;
  }

  async function setSettings(partial) {
    await chrome.storage.local.set(partial);
    return getSettings();
  }

  async function isSiteBlocked(hostname) {
    const { siteBlocklist } = await getSettings();
    return siteBlocklist.includes(hostname);
  }

  async function toggleSiteBlock(hostname) {
    const { siteBlocklist } = await getSettings();
    const next = siteBlocklist.includes(hostname)
      ? siteBlocklist.filter((h) => h !== hostname)
      : [...siteBlocklist, hostname];
    await setSettings({ siteBlocklist: next });
    return next;
  }

  async function incrementUsage() {
    const { usage } = await getSettings();
    const next = { count: (usage.count || 0) + 1, resetAt: usage.resetAt };
    await setSettings({ usage: next });
    return next;
  }

  async function addFeedback(entry) {
    const { feedbackLog } = await getSettings();
    const safeEntry = {
      rating: entry?.rating === "down" ? "down" : "up",
      mode: String(entry?.mode || "writing").slice(0, 32),
      action: String(entry?.action || "unknown").slice(0, 64),
      createdAt: new Date().toISOString()
    };
    const next = [...(Array.isArray(feedbackLog) ? feedbackLog : []), safeEntry].slice(-100);
    await setSettings({ feedbackLog: next });
    return safeEntry;
  }

  async function isPro() {
    const { tier } = await getSettings();
    return tier === "pro";
  }

  async function addSavedPrompt(text) {
    const trimmed = String(text || "").trim().slice(0, 300);
    if (!trimmed) return getSettings();
    const { savedPrompts } = await getSettings();
    const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    // Cap at 12 so the chip row stays usable rather than turning into a
    // second scrollable menu on top of the command list.
    const next = [{ id, text: trimmed }, ...(Array.isArray(savedPrompts) ? savedPrompts : [])].slice(0, 12);
    await setSettings({ savedPrompts: next });
    return getSettings();
  }

  async function removeSavedPrompt(id) {
    const { savedPrompts } = await getSettings();
    const next = (Array.isArray(savedPrompts) ? savedPrompts : []).filter((p) => p.id !== id);
    await setSettings({ savedPrompts: next });
    return next;
  }

  // Milestone 4, Batch 2 (Style DNA: learn from accepted edits). `before`
  // is always a WriteFlow-generated suggestion the person accepted
  // (Replace/Insert), never arbitrary page content — callers only ever
  // invoke this from that specific flow. No-ops entirely when the opt-in
  // setting is off, which is the default; this function never runs
  // unless the person turned it on.
  const STYLE_DNA_STEP = 0.08; // small and deliberate: many edits should be needed to swing the profile
  async function recordStyleEdit(beforeText, afterText) {
    const settings = await getSettings();
    if (!settings.styleDNALearningEnabled) return settings;
    const learner = window.WriteFlow.StyleLearning;
    const signals = learner && learner.computeSignals(beforeText, afterText);
    if (!signals) return settings;

    const dna = { ...settings.styleDNA };
    ["brevity", "formality", "warmth", "emojiFrequency", "contractionPreference"].forEach((key) => {
      if (signals[key]) {
        const current = typeof dna[key] === "number" ? dna[key] : 0.5;
        dna[key] = Math.max(0, Math.min(1, current + signals[key] * STYLE_DNA_STEP));
      }
    });
    // Categorical fields are derived from their related numeric nudge's
    // direction rather than tracked independently — keeps the learning
    // model simple. vocabularyComplexity has no cheap, reliable signal
    // here and is intentionally left for manual adjustment only.
    if (signals.brevity) dna.sentenceLength = dna.brevity >= 0.65 ? "short" : dna.brevity <= 0.35 ? "long" : "medium";
    if (signals.greetingStyle) dna.greetingStyle = signals.greetingStyle > 0 ? "warm" : "minimal";
    if (signals.signoffStyle) dna.signoffStyle = signals.signoffStyle > 0 ? "warm" : "minimal";

    await setSettings({ styleDNA: dna, styleDNASamples: (settings.styleDNASamples || 0) + 1 });
    return getSettings();
  }

  async function resetStyleDNA() {
    await setSettings({ styleDNA: { ...DEFAULTS.styleDNA }, styleDNASamples: 0 });
    return getSettings();
  }

  return { getSettings, setSettings, isSiteBlocked, toggleSiteBlock, incrementUsage, addFeedback, isPro, addSavedPrompt, removeSavedPrompt, recordStyleEdit, resetStyleDNA, FREE_COMMAND_IDS, FREE_SOCIAL_STYLE_IDS };
})();
