// content/detector.js
window.WriteFlow = window.WriteFlow || {};

const SENSITIVE_INPUT_TYPES = new Set(["password", "hidden", "file", "checkbox", "radio", "submit", "button", "range", "color"]);
const SENSITIVE_AUTOCOMPLETE = new Set(["cc-number", "cc-csc", "cc-exp", "cc-exp-month", "cc-exp-year", "one-time-code"]);
const SENSITIVE_NAME_HINTS = /card|cvv|cvc|ccnum|cc[-_]?number|security[-_ ]?code|ssn|social[-_ ]?security|passport|routing[-_ ]?number|iban|swift/i;

function isSensitiveField(el) {
  if (!el) return true;
  const type = (el.getAttribute("type") || "").toLowerCase();
  if (SENSITIVE_INPUT_TYPES.has(type)) return true;

  const autocomplete = (el.getAttribute("autocomplete") || "").toLowerCase();
  // Autocomplete may include a section token (for example
  // "section-checkout cc-number"), so an exact whole-string comparison
  // misses valid payment fields.
  if (autocomplete.split(/\s+/).some((token) => SENSITIVE_AUTOCOMPLETE.has(token))) return true;

  const name = `${el.name || ""} ${el.id || ""} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("placeholder") || ""}`;
  if (SENSITIVE_NAME_HINTS.test(name)) return true;

  if (el.disabled || el.readOnly || el.getAttribute("aria-readonly") === "true" || el.getAttribute("aria-disabled") === "true") return true;
  if (el.closest("[inert], .monaco-editor, .CodeMirror, .cm-editor")) return true;

  return false;
}

function isEditableCandidate(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();

  if (tag === "textarea") return !isSensitiveField(el);

  if (tag === "input") {
    const type = (el.getAttribute("type") || "text").toLowerCase();
    if (!["text", "email", "search", "url", "tel", ""].includes(type)) return false;
    return !isSensitiveField(el);
  }

  if (el.isContentEditable) {
    let root = el;
    while (root.parentElement?.isContentEditable) root = root.parentElement;
    return !isSensitiveField(root);
  }

  const role = el.getAttribute && el.getAttribute("role");
  if (role === "textbox") return !isSensitiveField(el);

  return false;
}

// Social editors often focus a nested span/paragraph rather than the element
// carrying contenteditable or role=textbox. Resolve the real editor through
// the composed event path first (works with open Shadow DOM), then ancestors.
function resolveEditableTarget(source) {
  let node = source?.composedPath?.()[0] || source?.target || source;
  while (node?.shadowRoot?.activeElement) node = node.shadowRoot.activeElement;
  while (node instanceof HTMLElement) {
    if (node.getAttribute('contenteditable') === 'false') return null;
    if (isEditableCandidate(node)) {
      while (node.isContentEditable && node.parentElement?.isContentEditable) node = node.parentElement;
      return isSensitiveField(node) ? null : node;
    }
    node = node.parentElement || node.getRootNode()?.host;
  }
  return null;
}

// Minimum field size to bother showing the trigger button on (avoids tiny
// search boxes / single-character inputs feeling cluttered).
function isFieldBigEnough(el) {
  const rect = el.getBoundingClientRect();
  return rect.width >= 60 && rect.height >= 18;
}

window.WriteFlow.Detector = {
  isEditableCandidate,
  isFieldBigEnough,
  isSensitiveField,

  /**
   * Wires up focusin/focusout listeners. Calls onFocus(el) / onBlur(el)
   * only for valid, non-sensitive, big-enough fields. Uses event
   * delegation on document instead of scanning the DOM, per spec section 8.
   */
  observe({ onFocus, onBlur }) {
    document.addEventListener(
      "focusin",
      (e) => {
        const el = resolveEditableTarget(e);
        if (isEditableCandidate(el) && isFieldBigEnough(el)) {
          onFocus(el);
        }
      },
      true
    );

    document.addEventListener(
      "focusout",
      (e) => {
        const el = resolveEditableTarget(e);
        if (isEditableCandidate(el)) {
          onBlur(el);
        }
      },
      true
    );
  },
  resolveEditableTarget
};
