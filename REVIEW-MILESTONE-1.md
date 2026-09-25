# WriteFlow AI 0.19.0 — Review Workspace milestone 1

## Included
- Popup shortcut to a full-tab local workspace.
- Right-click selected webpage text → Save selection to Review.
- Capture preview, project selection, original quoted text and sanitised source URL.
- Projects, permanent R-IDs, Open/Pending/Closed groups and appended status history.
- Transactional IndexedDB saves and full JSON record export.
- Light/dark and narrow-screen layouts; no review provider calls or backend.

## Try it
Extract this archive. In chrome://extensions enable Developer mode and choose Load unpacked, selecting the folder containing manifest.json. Open WriteFlow's popup → Review Workspace. Create a project and item. On a normal webpage select text, right-click and choose Save selection to Review, then save it into a project. Select a saved item to move its status and inspect its history.

This adds the contextMenus permission. Loading a separate unpacked copy may have a different extension identity from your existing installation and will not inherit its settings. Do not uninstall an existing copy to try this build. Export review data before uninstalling.

## Validation actually performed
- Build checks: passed (JavaScript syntax, manifest assets, script registration order, matching version).
- Node tests using simulated IndexedDB and DOM: passed. Covered 30 concurrent writes across two clients, unique IDs, status history, original capture, URL sanitisation, duplicate rejection, invalid-operation rollback, reopening data, safe rendering and status interactions.
- Chromium 153 browser-page fixture: passed. Used real IndexedDB, project/item UI, 12 concurrent saves across tabs, capture preview and provenance, duplicate rejection, rollback, reload persistence, JSON download, narrow viewport and no page errors. Desktop/light and narrow/dark screenshots inspected.
- Full extension loading/context-menu clicking could not be completed with the available headless-shell browser. The extension integration test is included as tests/review.cjs and remains outstanding on full Chrome.
- Existing writing suite: 34/39 checks passed. The identical five failures also occur in the unmodified uploaded 0.18.1 archive under the same browser: nested reply/open Shadow DOM ownership; LinkedIn, Facebook and YouTube nested reply ownership; modal/underlying feed isolation. This update is not a fix for those existing issues.

## Scope and limitations
This is an evaluation build, not a store-ready release. No AI review commands or instruction/answer rounds yet. No source dependency graph, Excel import/export, cloud sync, item deletion or backup restore yet. Export is a readable full JSON record, not a working import/restore feature. Status history is application-level history, not a tamper-proof audit system. Source URLs omit query strings and fragments, so some sources may require navigation to locate the exact passage. The original selected text is preserved.

## Next milestone
Add Explain/Quantify/Challenge instructions and append-only answers, bound to immutable instruction IDs and item IDs. Keep each late provider response tied to the original instruction and visibly distinguish mock output.
