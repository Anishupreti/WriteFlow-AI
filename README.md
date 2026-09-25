# WriteFlow AI

Current source version: **0.21.0**. This repository includes the extension source and developer tests. The sections below document its architecture and verification history; live-site coverage remains under evaluation.

## What WriteFlow does

WriteFlow is a Chrome extension with two parts. Both use your own AI provider key (OpenAI, Anthropic, Gemini, Groq or OpenRouter, or the no-key Mock provider for trying it out), and there is no WriteFlow server.

**1. Writing assistant.** It works inside the text box you are already typing in on Gmail, Outlook, LinkedIn, X, Slack, WhatsApp, Reddit and other supported sites:
- Rewrite, Shorten, Grammar and Translate selected text, with one-click Undo.
- Smart Reply reads the post, email thread or chat you are answering, so drafts fit the conversation.
- Style DNA and writing samples keep drafts sounding like you.

**2. Review Workspace.** Open it from the extension popup. It is for working through a long list of questions, risks or claims with AI help, such as a risk register, due diligence, a supplier or compliance review:
- Each item keeps every instruction and AI answer in order. Answers are never overwritten; a correction is a new round.
- Short instructions ("Explain", "Quantify", "Challenge") get full written answers, and each new round sees the earlier ones.
- Sources are linked to the exact answers they support. Marking a source disputed flags every item that relied on it.
- Right-click "Save selection to Review" captures text from any page, including an AI chat's conclusion, as a new item or as an answer on an existing one.
- Closing an item records the decision. *Export decisions* produces Markdown to paste into Notion or a wiki; JSON export is the full backup, and Excel registers can be imported.
- Everything is stored locally in your browser. Text goes to your AI provider only when you choose Ask AI.

The Review Workspace is **free for now**; see Free vs Pro below.

## Install for evaluation

Extract the release ZIP, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`. Reload existing site tabs after updating. No build/transpilation is required. Use Mock provider for a local, no-key trial. This is an evaluation build: authenticated live-site and packaged-extension acceptance remain outstanding.

## Architecture

The existing Manifest V3 structure and `window.WriteFlow` namespace remain intact:

- `content/detector.js`: delegated editor focus detection and sensitive-field exclusion.
- `content/adapters.js`: text editing, native input value setter, contenteditable insertion and Gmail line formatting.
- `content/context-dom.js`: composed-tree traversal, visibility and strict composer association.
- `content/platform-adapters.js`: 19 independent selector definitions behind one adapter contract. Each exposes detection, editor discovery, context/conversation extraction, audience hints, metadata and capabilities. Generic writing exposes no automatic context capability.
- `content/context-extractors.js`: compatibility facade for the existing UI.
- `services/context-model.js`: DOM-free normalization and serialization; a shared 6,000-character context budget and at most six prior messages. The target is preserved before allocating the remaining budget to recent messages. Serialization also caps labels and text together.
- `services/promptBuilder.js`: existing writing/social/email prompts consume normalized objects or manually pasted strings. DOM selectors never enter this layer.
- `content/ui.js`: existing Shadow DOM UI, generation/cancellation, reply/rewrite, result actions and per-field undo. Context-analysis caches remain in memory, now capped at 20 entries each. Active UI is checked every 250 ms for navigation/editor removal; this checks one field, not the whole page.
- `services/ai.js`: existing direct BYOK providers and one configured fallback, unchanged.
- `services/storage.js`, `services/license.js`, options, popup and service worker: retained local settings, Gumroad licensing and existing UI. Dynamically registered scripts get the new dependency order on upgrade.

## Context model

```js
{
  platform: 'linkedin', type: 'post_reply',
  author: { name: '', role: '' },
  content: { primaryText: '', parentText: '', quotedText: '' },
  conversation: [{ author: '', direction: 'unknown', text: '' }],
  metadata: { title: '', timestamp: '', url: '' }
}
```

Unknown metadata stays empty. Relationships are not inferred. URL metadata drops query strings and fragments and is not included in the prompt serialization. Context is read only when requested; gaining focus makes no AI request. Existing Pro analysis may call the provider after the user opens a reply panel.

Association must be an enclosing post/comment/thread, an explicit quote in the active email reply, or a single visible source in the same dialog. Missing/ambiguous markup returns `null`. There is no nearest-post, first-post, longest-text, or whole-document email fallback. This intentionally reduces automatic coverage when association cannot be established. Social reply panels retain manual paste; email falls back to writing.

## Verification matrix

**F = synthetic browser fixture passed, not live-site certification.** All platforms below have generic writing through the shared editor layer. No authenticated service was verified. Layout variants outside the selector contract may require manual context. New Priority 2/3 definitions are provisional and need real DOM snapshots before production claims.

| Platform | Writing | Context | Conversation | Smart Compose |
|---|---|---|---|---|
| LinkedIn | Shared editor F | F; nested reply | No | No |
| X/Twitter | Shared editor F | F; associated tweet/dialog | No | No |
| Facebook | Shared editor F | F; explicit body/comment hooks | No | No |
| Reddit | Shared editor F | F; composed-tree reply | No | No |
| YouTube | Shared editor F | F; associated video/comment | No | No |
| Gmail | Shared editor F | F; thread/explicit quote | F; scoped recent messages | No |
| Outlook | Shared editor F | F; thread/explicit quote | F; scoped recent messages | No |
| Slack | Shared editor F | F; scoped messages | F | No |
| WhatsApp | Shared editor F | F; active chat | F | No |
| Instagram | Shared editor F | F; provisional caption hooks | No | No |
| Threads | Shared editor F | F; provisional post hooks | No | No |
| TikTok | Shared editor F | F; provisional video hooks | No | No |
| Discord | Shared editor F | F; provisional chat container | F | No |
| Bluesky | Shared editor F | F; provisional feed hooks | No | No |
| Quora | Shared editor F | F; provisional answer hooks | No | No |
| Medium | Shared editor F | F; enclosing article only | No | No |
| Substack | Shared editor F | F; enclosing post only | No | No |
| Tumblr | Shared editor F | F; provisional post hooks | No | No |
| Pinterest | Shared editor F | F; provisional pin hooks | No | No |
| Other permitted sites | Shared editor F | Manual only | No | No |

Manifest coverage remains unchanged. Custom domains and domains absent from the original manifest require the existing per-site permission flow. Closed Shadow DOM and cross-origin frames are not supported. Editor discovery is lazy; `findEditors` is not a background full-page scan.

## Providers, privacy and licensing

OpenAI, Anthropic, Gemini, Groq, OpenRouter and Mock remain available. Real API calls go directly from the isolated content script to the chosen provider; fallback uses the user's configured second provider/key. No WriteFlow backend, account, analytics server or remote prompt store were added. The only permission added since then is `contextMenus` (0.19.0), for Review Workspace capture. Keys and writing samples stay in `chrome.storage.local`; keys are not added to host-page DOM. Selected writing/context and optional samples go to the chosen AI provider when generating. Pro verification separately contacts Gumroad, as before.

## Free vs Pro (accurate as of v0.21.0)

Generated by re-reading the actual gating in the code, not by memory — see CHANGELOG.md's Milestone 16 entries for exactly what changed and why. Re-checked for 0.21.0: the Review Workspace has no tier check.

**Free:**
- Rewrite, Shorten, Grammar (the three base writing commands)
- The allowlisted basic social reply strategies (see `FREE_SOCIAL_STYLE_IDS` in services/storage.js)
- Translation (fixed in Milestone 16, Batch 1 — was incorrectly Pro-locked before)
- Write It For Me (Milestone 3), all scenarios, all platforms — deliberately free, core writing functionality
- Style DNA: manual sliders/dropdowns (Milestone 4) — set your own profile by hand
- One active AI provider
- Review Workspace, all features (free for now; added in 0.19.0–0.21.0, no Pro gate in the code). Ask AI in the workspace uses your configured provider, including a fallback provider you already set up.

**Pro:**
- Full Smart Reply 2.0: context analysis, dynamic per-post reply strategies, audience detection + correction (Milestones 2, 5)
- Custom instructions and saved prompts
- Style DNA: automatic learning from your edits (Milestone 4, Batch 2) — gated in Milestone 16, Batch 2
- Backup/fallback provider setup (Milestone 16, Batch 1) — gated going forward; anyone who configured one before this gate existed keeps it working, only new setup is blocked for free accounts
- Multi-level comment-thread context (Milestone 6) is available to Pro accounts as part of the Smart Reply 2.0 analysis flow; the underlying extraction itself is not separately gated

Dynamic adjustment chips (Milestone 7) and the Natural Writing baseline (Milestone 8) are NOT tier-gated — available to whichever tier the underlying generation itself already belongs to. This was a deliberate scope decision at the time, not an oversight.

The local tier flag (`tier` in chrome.storage.local, set after Gumroad license verification) is not tamper-proof entitlement enforcement — this is an inherent trade-off of the BYOK, no-backend architecture (see the Known limitations section elsewhere in this README/CHANGELOG for the fuller discussion). Saved prompts (12), writing samples (3), and feedback metadata (100) retain their existing local caps.

**A known gap, stated plainly:** most of this README predates Milestones 2 through 16 (it's still titled "Milestone 1" above) and describes the codebase as it stood then — the architecture/context-model/verification-matrix sections above have NOT been kept current. CHANGELOG.md is the accurate, up-to-date record of everything built since. A full README rewrite covering the current architecture is worth doing before an actual store release, but wasn't attempted here to avoid claiming accuracy for a document this large without the same verification rigor applied to the rest of this milestone.

## Tests

`npm run build` runs syntax, package asset, version and static/dynamic script-order checks. Runtime production code has no npm dependencies.

`npm install` then `npx playwright install chromium` and `npm test` run browser tests. Set `CHROME_PATH` to a Chrome executable to test that installation. The test runner uses only synthetic local pages, mocked storage and mocked provider/license responses; it does not send paid AI requests or access real accounts.

For an interactive run without Playwright process launch: run `node tests/create-browser-harness.cjs`, then `python tests/serve.py`, and open `http://127.0.0.1:8765/tests/browser.html`. Results are saved in `tests/browser-results.json`. The preview controls apply the exact light/dark palette rules for inspection without changing browser/OS settings.

See `MILESTONE-1-REPORT.md` for measured results, known defects and outstanding acceptance work. Passing fixtures does not establish compatibility with every React editor, authenticated platform, real provider model, or Chrome extension integration.

## Review Workspace — milestone 1
Open **Review Workspace** in the popup, create a project, and add an item. On an HTTP(S) webpage select text and use **Save selection to Review** in the context menu. Review the capture and choose its project before saving. Capture works independently of automatic writing-site permissions. Captured URLs omit query strings/fragments/credentials; full original selected text is retained.

Items receive globally increasing R-IDs. Their statements and original captures remain fixed; changing Open/Pending/Closed appends a status event. IndexedDB transactions prevent concurrent tabs from losing saves or duplicating IDs. The new `contextMenus` permission enables explicit capture. This milestone made no AI calls; from 0.20.0, Ask AI sends a review round to the selected provider (see below). The workspace is available without a Pro gate in this evaluation milestone.

JSON export is a readable full record, not yet a restore workflow. AI review rounds, source dependencies, Excel import/export, deletion controls and restore are later milestones. Keep exports before uninstalling the extension.

## Review Workspace UI update — 0.19.1
A redesigned project sidebar, compact register rows, clickable status summaries, instant search by ID/text/source, guided empty states and an on-demand item form. Details open in a keyboard-accessible drawer, which fills narrow screens; Escape closes it and returns focus. Appearance supports System/Light/Dark, with the chosen project and item remembered locally. Press / outside form fields to focus search. Closing the item form retains unsaved text in the current page, with a leave-page warning; it is not an automatic draft backup.

Run `npm run test:review:ux` for the browser-page UX checks. See REVIEW-UI-REPORT.md for measured tests and remaining limitations.

## Review workflow 0.20.0
Review item details now include Explain, Quantify, Challenge and Custom rounds using the selected provider. Instructions are stored before sending and answers cannot overwrite earlier answers. Mock output is explicitly marked as demonstration. The entire local review record can be exported and restored from validated JSON. Sources can be linked to answered rounds, marked supported/disputed/withdrawn by the reviewer, and show affected items. An .xlsx import preview reads the first register sheet, retaining R-IDs and E/F review pairs. The workbook's separate Sources sheet is not imported in this release; see REVIEW-ROADMAP.md.

## Review decisions and capture — 0.21.0
- **Earlier rounds go to the model.** Ask AI now sends the item's earlier instructions and answers (oldest first, most recent kept within a 24,000-character budget), and names any source you marked disputed or withdrawn, so a later round can build on or correct an earlier one. The system prompt treats a few-word instruction as complete.
- **Longer answers.** Review answers use a 4,000-token output budget on Anthropic and Gemini (writing commands keep 1,000). OpenAI-compatible providers are unchanged.
- **Closing records a decision.** Moving an item to Closed asks for a few words. The note is stored on the status event, shown on the board and in the item, and kept when an item is reopened and closed again.
- **Capture as an answer.** A selection saved with “Save selection to Review” (for example, the conclusion of an AI chat) can be attached to an existing open or pending item as a new answered round, labelled *Captured — not verified* and linked to the page it came from.
- **Export decisions.** *Export decisions (Markdown)* downloads, and copies where allowed, a paste-ready summary of the project's closed items with their decisions, sources (disputed ones flagged) and linked conversations, for a shared page such as Notion. The JSON record remains the complete backup.

Run `npm run test:review:decisions` and `npm run test:review:decisions:browser`.
