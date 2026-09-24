// Advisory, no-completion-cost API key checks. A failed models-list request
// does not prove generation will fail, so callers must still save the key.
window.WriteFlow = window.WriteFlow || {};

window.WriteFlow.KeyValidator = (function () {
  async function readFailure(response, provider) {
    const body = await response.text().catch(() => "");
    throw new Error(`${provider} verification returned ${response.status}: ${body.slice(0, 180) || response.statusText}`);
  }

  async function validate(provider, apiKey) {
    if (provider === "mock") return { valid: true, message: "Mock mode needs no API key." };
    if (!apiKey?.trim()) return { valid: false, message: "No API key entered. The setting was still saved." };

    let response;
    if (provider === "openai") {
      response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey.trim()}` }
      });
    } else if (provider === "anthropic") {
      response = await fetch("https://api.anthropic.com/v1/models?limit=1", {
        headers: {
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        }
      });
    } else if (provider === "gemini") {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(apiKey.trim())}`);
    } else if (provider === "groq") {
      response = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey.trim()}` }
      });
    } else if (provider === "openrouter") {
      response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${apiKey.trim()}` }
      });
    } else {
      return { valid: false, message: "Unknown AI provider. The setting was still saved." };
    }

    if (!response.ok) await readFailure(response, providerName(provider));
    return { valid: true, message: `${providerName(provider)} key verified.` };
  }

  function providerName(provider) {
    return ({ openai: "OpenAI", anthropic: "Anthropic", gemini: "Gemini", groq: "Groq", openrouter: "OpenRouter" })[provider] || provider;
  }

  return { validate };
})();
