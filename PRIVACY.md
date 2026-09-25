# Privacy Policy — WriteFlow AI

Last updated: alongside each release; see the version at the top of this repository's [CHANGELOG](CHANGELOG.md) for the version this applies to.

## Summary

WriteFlow AI has no server, no account system, and no cloud storage. This document explains exactly what data the extension touches, where it goes, and where it doesn't.

## What WriteFlow stores, and where

All of the following is stored **only** in `chrome.storage.local` — a storage area private to your browser profile, on your device. None of it is transmitted to WriteFlow, because WriteFlow has no server to send it to.

- Your AI provider API key(s)
- Your provider and model preferences
- Your writing-style settings: manually entered writing samples, style notes, and your Style DNA profile
- Saved custom prompts
- Site preferences (sites you've disabled WriteFlow on, or manually enabled it for)
- Your Pro license status, and license key if entered
- Local usage counters (for your own reference; not sent anywhere)
- Thumbs up/down feedback on suggestions, if you give it — stored locally, never transmitted

Uninstalling the extension removes all of this, since it's stored in the extension's own local storage.

## What WriteFlow sends, and to whom

When you generate a suggestion, WriteFlow sends the relevant text (the content you're writing, plus the post/email context it read, if applicable) **directly from your browser to the AI provider you selected** — OpenAI, Anthropic, Google, Groq, or OpenRouter — using the API key you provided. This is a direct connection between your browser and that provider; WriteFlow's own infrastructure is not in the middle of it, because WriteFlow doesn't have any infrastructure of that kind.

What happens to that data once it reaches the provider is governed by that provider's own privacy policy and terms of service, not WriteFlow's — since WriteFlow doesn't operate the model or the servers running it.

The one exception: if you enter a Pro license key, that key is sent to Gumroad (the payment/licensing platform used) to verify it's valid. This is separate from and unrelated to your AI provider connections.

## What WriteFlow never does

- Never sends your writing, your API keys, or your settings to any WriteFlow-operated server, because none exists
- Never requires an account, login, or sign-up
- Never shares data with advertisers or third parties for marketing purposes
- Never posts, sends, or submits anything on a website automatically — every suggestion requires you to click Replace, Insert, or Copy yourself
- Never reads password fields, payment fields, or other fields flagged as sensitive by the page

## Permissions the extension requests, and why

- **Access to specific websites** (listed in the extension's manifest, or any site you individually enable via the popup): needed to detect text fields and show the WriteFlow icon there. WriteFlow does not request access to every website by default.
- **`storage`**: to save your settings locally, as described above.
- **`scripting`**: used only when you explicitly click "Enable WriteFlow here" on a site not already covered, to add WriteFlow to that specific site going forward.
- **Direct network access to each supported AI provider's API domain, and to Gumroad**: needed to send your generation requests and verify a Pro license, as described above.

## Your choices

- You can disable WriteFlow on any individual site from the popup.
- You can delete all locally stored WriteFlow data from Settings → "Delete all local data."
- You can reset your Style DNA profile independently, without affecting anything else, from Settings.
- You can turn off automatic Style DNA learning (Pro) at any time; it's off by default.
- You can remove your API key(s) at any time by clearing the field in Settings.

## Changes to this policy

If WriteFlow's architecture changes in a way that affects this policy (for example, if a server-backed feature were ever introduced), this document and the main README will be updated to reflect it before that change ships, and the CHANGELOG will note it explicitly.

## Contact

Questions about this policy can be raised via [Issues](../../issues) on this repository.

## Review Workspace (0.19.0)
Review projects, statements, selected text, source page titles, sanitised URLs and status history are stored locally in the extension's IndexedDB. Capture happens only through the selection context menu or manual entry. Source URLs omit credentials, query strings and fragments; selected text itself may contain sensitive data. This milestone made no AI or other network request; see 0.20.0 below for Ask AI. Discarding a pending capture removes it. Saved review items have no delete/restore controls in this evaluation milestone; removing the extension removes its local database. JSON export contains all projects, captures and history: store it privately. There is no cloud backup or cross-device sync.

### Review appearance preferences (0.19.1)
The workspace also stores the selected theme, project ID and item ID in localStorage within the extension. These interface preferences are local and are not sent to providers.

## Review analysis and import (0.20.0)
An .xlsx or JSON file selected by the user is parsed locally and is not uploaded to WriteFlow. When the user chooses Ask AI for a review round, the item statement, exact instruction and up to 4,000 characters of the captured excerpt, plus a source URL if present, are sent directly to the selected AI provider using the user's configured key. The provider's answer is saved locally beside the instruction. Source review status is a human-entered assessment. Mock generates a local demonstration answer and makes no provider request. Review JSON exports include all item text, rounds and source data; handle them as sensitive.

## Review decisions and capture (0.21.0)
Ask AI now also sends the item's earlier review rounds (instructions and answers, up to about 24,000 characters) and the citations of sources you marked disputed or withdrawn. A selection attached to an item as a captured answer is stored locally with its page title and sanitised URL; it is sent to the provider only as part of a later Ask AI round on that item. Decision notes are stored locally with the status history. *Export decisions* creates a Markdown file (and a clipboard copy where the browser allows) containing closed items, decisions, source citations and links; nothing is uploaded, but treat the export as sensitive when you share it.
