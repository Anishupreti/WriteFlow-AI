// options/options.js
const KEYS = ["provider", "apiKey", "apiKeys", "fallbackProvider", "defaultTone", "showFloatingButton", "siteBlocklist", "tier", "licenseKey", "writingSamples", "styleNotes", "hasSeenWelcome", "onboardingComplete", "onboardingStep", "onboardingProvider", "styleDNA", "styleDNASamples", "styleDNALearningEnabled"];

// Mirrors services/storage.js's DEFAULTS.styleDNA — options.js has no
// access to that module (it talks to chrome.storage.local directly), so
// this is duplicated deliberately rather than shared.
const NEUTRAL_STYLE_DNA = {
  brevity: 0.5, formality: 0.5, warmth: 0.5, emojiFrequency: 0.5, contractionPreference: 0.5,
  sentenceLength: "medium", vocabularyComplexity: "medium", greetingStyle: "medium", signoffStyle: "medium"
};
const DNA_SLIDER_FIELDS = ["brevity", "formality", "warmth", "emojiFrequency"]; // conversational is derived, not its own field — see wiring below


function parseWritingSamples(value) {
  return String(value || "").split(/\n\s*\n/).map((sample) => sample.trim()).filter(Boolean).slice(0, 3);
}

const BUY_URL = "https://anishup.gumroad.com/l/writeflow-ai";
const API_KEY_URLS = {
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  gemini: "https://aistudio.google.com/apikey",
  groq: "https://console.groq.com/keys",
  openrouter: "https://openrouter.ai/keys"
};
const PROVIDER_LABELS = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
  groq: "Groq",
  openrouter: "OpenRouter"
};

const PROVIDER_NOTES = {
  gemini: "Free, no credit card needed",
  groq: "Free, no credit card needed, very fast",
  openrouter: "Free tier, no credit card needed",
  openai: "Paid — needs a card on file",
  anthropic: "Paid — needs a card on file"
};

const PROVIDER_INSTRUCTIONS = {
  gemini: "Click the button below, sign in with your Google account, then click \u201cCreate API key.\u201d Copy the key it shows you and come back here.",
  groq: "Click the button below, sign in (a free account takes a few seconds to create), then click \u201cCreate API Key.\u201d Copy it and come back here.",
  openrouter: "Click the button below, sign in, then click \u201cCreate Key.\u201d Copy it and come back here.",
  openai: "Click the button below, sign in to your OpenAI account, then click \u201c+ Create new secret key.\u201d Copy it immediately \u2014 OpenAI only shows it once.",
  anthropic: "Click the button below, sign in to your Anthropic console, then click \u201cCreate Key.\u201d Copy it and come back here."
};

// Recommended (free) providers are listed first so a novice's eye lands
// there without needing to be told which one to pick.
const ONBOARDING_PROVIDER_ORDER = ["gemini", "groq", "openrouter", "openai", "anthropic"];

// Interactive first-run wizard shown in place of the old static welcome
// banner. Walks a non-technical user through picking a provider, getting a
// key from that provider's own site, pasting it back, and validating it
// with the existing KeyValidator before saving anything.
const Onboarding = (function () {
  let step = 1;
  let provider = "";

  function els() {
    return {
      overlay: document.getElementById("ob-overlay"),
      live: document.getElementById("ob-live"),
      progress: document.getElementById("ob-progress")
    };
  }

  async function persist(partial) {
    await chrome.storage.local.set(partial);
  }

  function showStep(n) {
    step = n;
    for (let i = 1; i <= 5; i += 1) {
      document.getElementById(`ob-step-${i}`).style.display = i === n ? "block" : "none";
    }
    els().progress.querySelectorAll("span").forEach((dot) => {
      dot.classList.toggle("ob-done", Number(dot.dataset.step) <= n);
    });
    const heading = document.querySelector(`#ob-step-${n} .ob-title`);
    els().live.textContent = heading ? `Step ${n} of 5: ${heading.textContent}` : "";
    if (heading) requestAnimationFrame(() => heading.setAttribute("tabindex", "-1") || heading.focus());
    persist({ onboardingStep: n });
  }

  function renderProviderList() {
    const list = document.getElementById("ob-provider-list");
    list.innerHTML = "";
    ONBOARDING_PROVIDER_ORDER.forEach((id) => {
      const isFree = id === "gemini" || id === "groq" || id === "openrouter";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ob-provider";
      btn.innerHTML = `
        <span>
          <span class="ob-provider-name">${PROVIDER_LABELS[id]}</span>
          <div class="ob-provider-note">${PROVIDER_NOTES[id]}</div>
        </span>
        ${isFree ? '<span class="ob-badge">FREE</span>' : ""}
      `;
      btn.addEventListener("click", () => selectProvider(id));
      list.appendChild(btn);
    });
  }

  function selectProvider(id) {
    provider = id;
    persist({ onboardingProvider: id });
    document.getElementById("ob-step3-title").textContent = `Get your ${PROVIDER_LABELS[id]} key`;
    document.getElementById("ob-step3-instructions").textContent = PROVIDER_INSTRUCTIONS[id] || "";
    document.getElementById("ob-provider-name-btn").textContent = PROVIDER_LABELS[id];
    document.getElementById("ob-key-input").value = "";
    document.getElementById("ob-continue-3").disabled = true;
    showStep(3);
  }

  function openProviderPage() {
    window.open(API_KEY_URLS[provider] || "https://aistudio.google.com/apikey", "_blank", "noopener");
  }

  async function testKey() {
    const key = document.getElementById("ob-key-input").value.trim();
    showStep(4);
    const statusEl = document.getElementById("ob-key-status");
    const useAnywayBtn = document.getElementById("ob-use-anyway");
    const continueBtn = document.getElementById("ob-continue-4");
    useAnywayBtn.style.display = "none";
    continueBtn.style.display = "none";
    statusEl.className = "ob-key-status ob-show ob-checking";
    statusEl.innerHTML = `<span class="ob-spinner"></span> Checking your key with ${PROVIDER_LABELS[provider]}…`;

    let result;
    try {
      result = await window.WriteFlow.KeyValidator.validate(provider, key);
    } catch (error) {
      result = { valid: false, message: `${error.message} We can still save it \u2014 some providers restrict what this check can see.` };
    }

    if (result.valid) {
      await saveAndAdvance(key);
      return;
    }

    statusEl.className = "ob-key-status ob-show ob-warn";
    statusEl.textContent = result.message || "That key didn't verify, but it may still work.";
    useAnywayBtn.style.display = "inline-block";
    useAnywayBtn.onclick = () => saveAndAdvance(key);
  }

  async function saveAndAdvance(key) {
    const existing = await chrome.storage.local.get(["apiKeys"]);
    const nextApiKeys = { ...(existing.apiKeys || {}), [provider]: key };
    await persist({ provider, apiKey: key, apiKeys: nextApiKeys });

    const statusEl = document.getElementById("ob-key-status");
    statusEl.className = "ob-key-status ob-show ob-ok";
    statusEl.innerHTML = `<span>✓</span> Saved \u2014 ${PROVIDER_LABELS[provider]} is ready to go.`;
    document.getElementById("ob-use-anyway").style.display = "none";
    const continueBtn = document.getElementById("ob-continue-4");
    continueBtn.style.display = "inline-block";
    continueBtn.onclick = () => showStep(5);
  }

  async function skip() {
    await persist({ provider: "mock", onboardingComplete: true, hasSeenWelcome: true });
    close();
    await load();
  }

  async function finish() {
    await persist({ onboardingComplete: true, hasSeenWelcome: true });
    close();
    await load();
  }

  function close() {
    els().overlay.style.display = "none";
    document.getElementById("settings-content").setAttribute("aria-hidden", "false");
  }

  function bind() {
    renderProviderList();
    document.getElementById("ob-start").addEventListener("click", () => showStep(2));
    document.getElementById("ob-skip-1").addEventListener("click", skip);
    document.getElementById("ob-skip-2").addEventListener("click", skip);
    document.getElementById("ob-skip-3").addEventListener("click", skip);
    document.getElementById("ob-back-3").addEventListener("click", () => showStep(2));
    document.getElementById("ob-back-4").addEventListener("click", () => showStep(3));
    document.getElementById("ob-open-provider").addEventListener("click", openProviderPage);
    document.getElementById("ob-key-input").addEventListener("input", (e) => {
      document.getElementById("ob-continue-3").disabled = !e.target.value.trim();
    });
    document.getElementById("ob-continue-3").addEventListener("click", testKey);
    document.getElementById("ob-finish").addEventListener("click", finish);
    document.getElementById("ob-overlay").addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focusables = Array.from(els().overlay.querySelectorAll("button, input:not([disabled])")).filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  let bound = false;
  function open(resumeStep, resumeProvider) {
    if (!bound) { bind(); bound = true; }
    document.getElementById("settings-content").setAttribute("aria-hidden", "true");
    els().overlay.style.display = "flex";
    provider = resumeProvider || "";
    // Resuming into step 3+ without a remembered provider selection would
    // strand the wizard with no provider to show \u2014 fall back to step 2.
    const target = resumeStep >= 3 && !provider ? 2 : (resumeStep || 1);
    if (provider && target >= 3) selectProvider(provider);
    showStep(target === 4 ? 3 : target); // never resume paused mid-validation; re-show the key entry instead
  }

  return { open };
})();

function updateProviderUI() {
  const provider = document.getElementById("provider").value;
  const link = document.getElementById("get-api-key");
  const keyInput = document.getElementById("apiKey");
  link.href = API_KEY_URLS[provider] || "https://aistudio.google.com/apikey";
  link.style.display = provider === "mock" ? "none" : "inline-block";
  keyInput.disabled = provider === "mock";
  keyInput.placeholder = provider === "mock" ? "No key needed in Mock mode" : `Paste your ${PROVIDER_LABELS[provider] || provider} API key…`;
  const status = document.getElementById("apikey-status");
  status.textContent = "";
  status.className = "help";
}

function updateFallbackUI() {
  const fallbackProvider = document.getElementById("fallbackProvider").value;
  const link = document.getElementById("get-fallback-api-key");
  const keyInput = document.getElementById("fallbackApiKey");
  const row = document.getElementById("fallback-key-row");
  row.style.display = fallbackProvider ? "block" : "none";
  link.href = API_KEY_URLS[fallbackProvider] || "https://aistudio.google.com/apikey";
  keyInput.placeholder = `Paste your ${PROVIDER_LABELS[fallbackProvider] || fallbackProvider} API key…`;
  document.getElementById("fallback-apikey-status").textContent = "";
}

async function load() {
  const s = await chrome.storage.local.get(KEYS);
  const apiKeys = s.apiKeys || {};
  document.getElementById("provider").value = s.provider || "mock";
  document.getElementById("apiKey").value = apiKeys[s.provider] || s.apiKey || "";
  document.getElementById("fallbackProvider").value = s.fallbackProvider || "";
  document.getElementById("fallbackApiKey").value = apiKeys[s.fallbackProvider] || "";
  document.getElementById("defaultTone").value = s.defaultTone || "professional";
  document.getElementById("showFloatingButton").checked = s.showFloatingButton !== false;
  document.getElementById("licenseKey").value = s.licenseKey || "";
  document.getElementById("styleNotes").value = s.styleNotes || "";
  document.getElementById("writingSamples").value = Array.isArray(s.writingSamples) ? s.writingSamples.join("\n\n") : "";
  document.getElementById("buy-link").href = BUY_URL;
  loadStyleDNA(s.styleDNA || NEUTRAL_STYLE_DNA, s.styleDNASamples || 0, s.styleDNALearningEnabled === true);
  renderTier(s.tier === "pro");
  renderBlocklist(s.siteBlocklist || []);
  updateProviderUI();
  updateFallbackUI();

  const onboardingComplete = s.hasSeenWelcome ? true : !!s.onboardingComplete;
  document.getElementById("settings-content").setAttribute("aria-hidden", onboardingComplete ? "false" : "true");
  if (onboardingComplete) {
    document.getElementById("ob-overlay").style.display = "none";
  } else {
    Onboarding.open(s.onboardingStep || 1, s.onboardingProvider || "");
  }
}

function renderTier(isPro) {
  document.getElementById("tier-badge").textContent = isPro ? "PRO" : "FREE";
  document.getElementById("tier-badge").className = `tier-pill ${isPro ? "pro" : "free"}`;
  document.getElementById("pro-card-title").textContent = isPro ? "WriteFlow Pro" : "Upgrade to Pro";
  document.getElementById("pro-card-badge").style.display = isPro ? "inline-block" : "none";
  document.getElementById("license-input-row").style.display = isPro ? "none" : "flex";
  document.getElementById("buy-link").style.display = isPro ? "none" : "inline-block";

  // Milestone 16, Batch 1: Backup Provider setup is Pro-only. Controls
  // are disabled (not hidden) for free accounts so someone who already
  // configured one before this gate existed can still SEE their current
  // setup -- only further changes are blocked. The runtime fallback
  // logic itself (services/ai.js) is untouched, so an existing
  // configuration keeps working exactly as before.
  document.getElementById("backup-provider-lock-badge").style.display = isPro ? "none" : "inline-block";
  document.getElementById("backup-provider-upsell").style.display = isPro ? "none" : "block";
  document.getElementById("fallbackProvider").disabled = !isPro;
  document.getElementById("fallbackApiKey").disabled = !isPro;
  document.getElementById("save-fallback").disabled = !isPro;

  // Milestone 16, Batch 2: Style DNA's manual sliders stay free; only the
  // automatic learning toggle is gated.
  document.getElementById("style-dna-learning-lock-badge").style.display = isPro ? "none" : "inline-block";
  document.getElementById("style-dna-learning-upsell").style.display = isPro ? "none" : "block";
  const learningCheckbox = document.getElementById("styleDNALearningEnabled");
  learningCheckbox.disabled = !isPro;
  if (!isPro) learningCheckbox.checked = false; // a downgrade from Pro shouldn't leave this silently still on
}

function renderBlocklist(list) {
  const ul = document.getElementById("blocklist");
  const empty = document.getElementById("blocklist-empty");
  ul.innerHTML = "";
  empty.style.display = list.length ? "none" : "block";
  list.forEach((host) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${host}</span>`;
    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.addEventListener("click", async () => {
      const s = await chrome.storage.local.get(["siteBlocklist"]);
      const next = (s.siteBlocklist || []).filter((h) => h !== host);
      await chrome.storage.local.set({ siteBlocklist: next });
      renderBlocklist(next);
    });
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

// Milestone 4, Batch 3 (Style DNA settings UI). Sets slider/select values
// only — no listeners here, since load() can run more than once (e.g.
// after "Delete all local data") and re-attaching listeners each time
// would stack duplicates.
function loadStyleDNA(dna, samples, learningEnabled) {
  document.getElementById("styleDNALearningEnabled").checked = learningEnabled;
  DNA_SLIDER_FIELDS.forEach((field) => {
    const pct = Math.round((typeof dna[field] === "number" ? dna[field] : 0.5) * 100);
    document.getElementById(`dna-${field}`).value = pct;
    document.getElementById(`dna-${field}-value`).textContent = `${pct}%`;
  });
  // Conversational is displayed as the inverse of Formal — there is no
  // separately-tracked "conversational" field in styleDNA (see the linked
  // input handler below for why they're kept in sync live).
  const conversationalPct = 100 - Math.round((typeof dna.formality === "number" ? dna.formality : 0.5) * 100);
  document.getElementById("dna-conversational").value = conversationalPct;
  document.getElementById("dna-conversational-value").textContent = `${conversationalPct}%`;

  ["sentenceLength", "vocabularyComplexity", "greetingStyle", "signoffStyle"].forEach((field) => {
    document.getElementById(`dna-${field}`).value = dna[field] || "medium";
  });

  const note = document.getElementById("styleDNA-samples-note");
  note.textContent = samples > 0
    ? `Learned from ${samples} edit${samples === 1 ? "" : "s"}, plus any manual changes.`
    : "Not customized yet — drag a slider or turn on \u201cLearn from my edits\u201d above.";
}

// One-time wiring (not inside loadStyleDNA, so it only attaches once):
// each slider updates its own readout live, and Formal/Conversational
// stay visually inverse-linked as either one is dragged. Setting
// .value programmatically does not fire another "input" event, so this
// can't loop.
document.querySelectorAll(".wf-dna-row input[type=range]").forEach((slider) => {
  slider.addEventListener("input", () => {
    document.getElementById(`${slider.id}-value`).textContent = `${slider.value}%`;
    if (slider.id === "dna-formality") {
      const inverse = 100 - Number(slider.value);
      document.getElementById("dna-conversational").value = inverse;
      document.getElementById("dna-conversational-value").textContent = `${inverse}%`;
    } else if (slider.id === "dna-conversational") {
      const inverse = 100 - Number(slider.value);
      document.getElementById("dna-formality").value = inverse;
      document.getElementById("dna-formality-value").textContent = `${inverse}%`;
    }
  });
});

document.getElementById("backup-provider-upgrade-link").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("pro-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("style-dna-learning-upgrade-link").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("pro-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("reset-style-dna").addEventListener("click", async () => {
  const statusEl = document.getElementById("reset-style-dna-status");
  if (!confirm("Reset your Style DNA to neutral defaults? This can't be undone.")) return;
  await chrome.storage.local.set({ styleDNA: { ...NEUTRAL_STYLE_DNA }, styleDNASamples: 0 });
  loadStyleDNA(NEUTRAL_STYLE_DNA, 0, document.getElementById("styleDNALearningEnabled").checked);
  statusEl.textContent = "Style DNA reset.";
  statusEl.className = "help";
  setTimeout(() => (statusEl.textContent = ""), 1800);
});

document.getElementById("provider").addEventListener("change", () => {
  // A key for one provider should never be accidentally tested or saved as
  // another provider's key. The previously saved key remains untouched until
  // Save is clicked.
  document.getElementById("apiKey").value = "";
  updateProviderUI();
});

document.getElementById("save").addEventListener("click", async () => {
  const saveButton = document.getElementById("save");
  const provider = document.getElementById("provider").value;
  const apiKey = document.getElementById("apiKey").value.trim();
  const keyStatus = document.getElementById("apikey-status");

  // Save first: validation is advisory and must never discard the user's key.
  const existing = await chrome.storage.local.get(["apiKeys"]);
  const nextApiKeys = { ...(existing.apiKeys || {}), [provider]: apiKey };
  const nextStyleDNA = {};
  DNA_SLIDER_FIELDS.forEach((field) => {
    nextStyleDNA[field] = Number(document.getElementById(`dna-${field}`).value) / 100;
  });
  // contractionPreference has no slider (no natural single-word label for
  // it in the 5-bar mockup) — preserved from whatever learning has set it
  // to, or neutral if never touched, rather than silently reset on every
  // save of unrelated settings.
  nextStyleDNA.contractionPreference = (await chrome.storage.local.get(["styleDNA"])).styleDNA?.contractionPreference ?? 0.5;
  ["sentenceLength", "vocabularyComplexity", "greetingStyle", "signoffStyle"].forEach((field) => {
    nextStyleDNA[field] = document.getElementById(`dna-${field}`).value;
  });

  // appendStyleContext (services/promptBuilder.js) only injects styleDNA
  // into prompts when styleDNASamples > 0 — that gate exists to skip an
  // untouched, all-neutral profile, but it doesn't know the difference
  // between "never touched" and "manually set, just never auto-learned
  // from an edit". A manual change here needs to count too, or dragging
  // these sliders would silently do nothing.
  const dnaChangedFromNeutral = Object.keys(NEUTRAL_STYLE_DNA).some((key) => String(nextStyleDNA[key]) !== String(NEUTRAL_STYLE_DNA[key]));
  const priorSamples = (await chrome.storage.local.get(["styleDNASamples"])).styleDNASamples || 0;

  await chrome.storage.local.set({
    provider,
    apiKey, // kept in sync for backward compatibility; apiKeys is the source of truth going forward
    apiKeys: nextApiKeys,
    defaultTone: document.getElementById("defaultTone").value,
    showFloatingButton: document.getElementById("showFloatingButton").checked,
    styleNotes: document.getElementById("styleNotes").value.trim(),
    writingSamples: parseWritingSamples(document.getElementById("writingSamples").value),
    styleDNA: nextStyleDNA,
    styleDNASamples: dnaChangedFromNeutral ? Math.max(priorSamples, 1) : priorSamples,
    // Defense in depth, mirroring the same pattern used for Backup
    // Provider above: the checkbox is already disabled+unchecked for
    // free accounts via renderTier(), but don't rely on that alone.
    styleDNALearningEnabled: (await chrome.storage.local.get(["tier"])).tier === "pro"
      ? document.getElementById("styleDNALearningEnabled").checked
      : false
  });
  const status = document.getElementById("save-status");
  status.textContent = "Saved.";
  status.className = "status";

  saveButton.disabled = true;
  saveButton.textContent = "Verifying…";
  keyStatus.textContent = "Checking this key with the selected provider…";
  keyStatus.className = "help";
  try {
    const result = await window.WriteFlow.KeyValidator.validate(provider, apiKey);
    keyStatus.textContent = result.message;
    keyStatus.className = result.valid ? "help ok" : "help warn";
  } catch (error) {
    keyStatus.textContent = `${error.message} The key was saved anyway; model permissions can differ.`;
    keyStatus.className = "help warn";
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save";
    setTimeout(() => (status.textContent = ""), 1800);
  }
});

document.getElementById("fallbackProvider").addEventListener("change", () => {
  document.getElementById("fallbackApiKey").value = "";
  updateFallbackUI();
});

document.getElementById("save-fallback").addEventListener("click", async () => {
  const saveButton = document.getElementById("save-fallback");
  // Defense in depth: the button is already disabled for free accounts via
  // renderTier(), but check directly too rather than relying solely on
  // that -- consistent with how locked commands elsewhere in this
  // codebase (content/ui.js) check data-locked explicitly rather than
  // trusting only a disabled attribute.
  const currentTier = await chrome.storage.local.get(["tier"]);
  if (currentTier.tier !== "pro") return;
  const fallbackProvider = document.getElementById("fallbackProvider").value;
  const fallbackApiKey = document.getElementById("fallbackApiKey").value.trim();
  const status = document.getElementById("save-fallback-status");
  const keyStatus = document.getElementById("fallback-apikey-status");

  const existing = await chrome.storage.local.get(["apiKeys"]);
  const nextApiKeys = { ...(existing.apiKeys || {}) };
  if (fallbackProvider) nextApiKeys[fallbackProvider] = fallbackApiKey;

  await chrome.storage.local.set({ fallbackProvider, apiKeys: nextApiKeys });
  status.textContent = "Saved.";
  status.className = "status";
  setTimeout(() => (status.textContent = ""), 1800);

  if (!fallbackProvider) {
    keyStatus.textContent = "";
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "Verifying…";
  keyStatus.textContent = "Checking this key with the selected provider…";
  keyStatus.className = "help";
  try {
    const result = await window.WriteFlow.KeyValidator.validate(fallbackProvider, fallbackApiKey);
    keyStatus.textContent = result.message;
    keyStatus.className = result.valid ? "help ok" : "help warn";
  } catch (error) {
    keyStatus.textContent = `${error.message} The key was saved anyway; model permissions can differ.`;
    keyStatus.className = "help warn";
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save backup provider";
  }
});

document.getElementById("verify-license").addEventListener("click", async () => {
  const btn = document.getElementById("verify-license");
  const key = document.getElementById("licenseKey").value.trim();
  const statusEl = document.getElementById("license-status");

  btn.disabled = true;
  btn.textContent = "Verifying\u2026";
  statusEl.textContent = "";
  statusEl.className = "help";

  const result = await window.WriteFlow.License.verify(key);

  btn.disabled = false;
  btn.textContent = "Verify";

  if (result.valid) {
    await chrome.storage.local.set({ tier: "pro", licenseKey: key });
    statusEl.textContent = "License verified \u2014 Pro features unlocked.";
    statusEl.className = "help";
    renderTier(true);
  } else {
    statusEl.textContent = result.error || "Couldn't verify that license.";
    statusEl.className = "help err";
  }
});

load();

document.getElementById("clear-feedback").addEventListener("click", async () => {
  const statusEl = document.getElementById("privacy-action-status");
  if (!confirm("Clear your local feedback history? This can't be undone.")) return;
  await chrome.storage.local.set({ feedbackLog: [] });
  statusEl.textContent = "Feedback history cleared.";
  statusEl.className = "help";
});

document.getElementById("delete-all-data").addEventListener("click", async () => {
  const statusEl = document.getElementById("privacy-action-status");
  if (!confirm("Delete ALL WriteFlow data from this browser \u2014 API key, writing samples, style notes, feedback history, disabled sites, and license? This can't be undone and can't be recovered.")) return;
  await chrome.storage.local.clear();
  statusEl.textContent = "All local data deleted. Reloading\u2026";
  statusEl.className = "help";
  await load(); // onboardingComplete is back to its default (false), so load() reopens the wizard
});
