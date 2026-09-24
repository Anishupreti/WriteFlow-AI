// content/adapters.js
// TextFieldAdapter: { canHandle, getText, getSelectedText, replaceText, insertText, focus }
window.WriteFlow = window.WriteFlow || {};

function escapeHtmlForInsert(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Gmail's compose/reply editor represents each line as its own <div> (an
// empty line is <div><br></div>), NOT as literal "\n" characters in a text
// node. Setting textContent or inserting a raw text node (what the generic
// adapters below do) collapses every line break, which is the "ransom
// note" formatting bug reported by testers. Converting the AI's output to
// real HTML and using execCommand("insertHTML") lets the browser build
// that same per-line DOM structure itself, matching what a native paste
// produces and what Gmail's own JS expects to see.
function textToLineHtml(text) {
  return String(text)
    .split("\n")
    .map((line) => `<div>${line.length ? escapeHtmlForInsert(line) : "<br>"}</div>`)
    .join("");
}

const GmailAdapter = {
  id: "gmail",
  canHandle: (el) =>
    location.hostname.endsWith("mail.google.com") &&
    !!el?.isContentEditable &&
    el.getAttribute?.("role") === "textbox" &&
    /message body/i.test(el.getAttribute?.("aria-label") || ""),
  getText: (el) => el.innerText || "",
  getSelectedText(el) {
    const sel = window.getSelection();
    return sel && sel.rangeCount && el.contains(sel.anchorNode) && el.contains(sel.focusNode) ? sel.toString() : "";
  },
  replaceText(el, text) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("insertHTML", false, textToLineHtml(text));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  },
  insertText(el, text) {
    el.focus();
    document.execCommand("insertHTML", false, textToLineHtml(text));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  },
  focus: (el) => el.focus()
};

function setNativeValue(el, value) {
  const prototype = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(el, value);
}

const TextareaAdapter = {
  id: "textarea",
  canHandle: (el) => el.tagName === "TEXTAREA" || (el.tagName === "INPUT"),
  getText: (el) => el.value || "",
  getSelectedText: (el) => el.value.substring(el.selectionStart ?? 0, el.selectionEnd ?? 0),
  replaceText(el, text) {
    setNativeValue(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  },
  insertText(el, text) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    setNativeValue(el, el.value.slice(0, start) + text + el.value.slice(end));
    el.setSelectionRange(start + text.length, start + text.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  },
  focus: (el) => el.focus()
};

const ContentEditableAdapter = {
  id: "contenteditable",
  canHandle: (el) => !!el.isContentEditable,
  getText: (el) => el.innerText || "",
  getSelectedText(el) {
    const sel = window.getSelection();
    return sel && sel.rangeCount && el.contains(sel.anchorNode) && el.contains(sel.focusNode) ? sel.toString() : "";
  },
  replaceText(el, text) {
    el.focus();
    // Select all content inside this editable root, then replace.
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("insertText", false, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  },
  insertText(el, text) {
    el.focus();
    document.execCommand("insertText", false, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  },
  focus: (el) => el.focus()
};

const RoleTextboxAdapter = {
  id: "role-textbox",
  canHandle: (el) => el.getAttribute?.("role") === "textbox",
  getText: (el) => el.innerText || el.textContent || "",
  getSelectedText: ContentEditableAdapter.getSelectedText,
  replaceText(el, text) {
    el.focus();
    el.textContent = text;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  },
  insertText(el, text) {
    el.focus();
    const sel = window.getSelection();
    if (sel?.rangeCount && el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
    } else {
      el.append(document.createTextNode(text));
    }
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  },
  focus: (el) => el.focus()
};

const ADAPTERS = [GmailAdapter, TextareaAdapter, ContentEditableAdapter, RoleTextboxAdapter];

window.WriteFlow.AdapterRegistry = {
  getAdapter(el) {
    return ADAPTERS.find((a) => a.canHandle(el)) || null;
  }
};
