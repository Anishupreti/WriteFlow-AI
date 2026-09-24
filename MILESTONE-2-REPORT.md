# MILESTONE 2 REPORT

Source: user-uploaded `WriteFlow-AI-v0_16_0-milestone-1.zip`, built by a different AI coder from this project's v0.15.5 checkpoint. Delivered version: **0.16.2**. Scope: Smart Reply 2.0 (structured context analysis + compact metadata UI), built on top of that codebase after first fixing a severe regression discovered while debugging a "not working on any aspect" report.

## Unplanned work before Milestone 2: the 0.16.1 fix

Before Milestone 2 could be evaluated meaningfully, the reported "nothing works" issue needed root-causing. Found: `ContextDOM.associated()` (the function that finds which post a comment box belongs to) only succeeded for two narrow cases \u2014 the field is a literal DOM descendant of the post, or it's inside a `[role="dialog"]` with exactly one visible post. Neither matches how Reddit, Facebook, LinkedIn, X, etc. actually render (the comment box is a sibling of the post, not nested inside it), so context extraction returned `null` almost everywhere in real use, despite every fixture in `tests/fixtures.cjs` passing \u2014 because every one of those fixtures places the field literally inside the post tag.

Fixed by generalizing the dialog-only fallback into a scoped ancestor search: walk up from the field, and at each level check for exactly one visible post candidate in that scope; stop and return `null` (refuse to guess) the moment a scope contains more than one. Verified against three cases in a jsdom harness (polyfilled for `getClientRects`/`isContentEditable`, since jsdom implements neither): a normal single-post case, a deliberately ambiguous two-post case (must stay `null`), and a Facebook-shaped case with an existing comment nearby (must not grab the wrong text). All three passed. Full details in `CHANGELOG.md` under 0.16.1.

## Milestone 2 implemented

**2.1 \u2014 Context analysis, richer structured output.** `services/ai.js`'s `analyzeContext()` now returns `{ contentType, sentiment, audience, summary, replyStrategies }` instead of a bare array. The prompt (`services/promptBuilder.js`) asks the model for all five fields in one JSON object. `replyStrategies` is validated strictly (unchanged from before \u2014 throws on malformed output, and `content/ui.js` still falls back to the static per-platform list on any thrown error). The four metadata fields are sanitized independently and fail soft: a missing or malformed field just means its badge doesn't render, never a failed analysis. `sentiment` specifically is checked against an allow-list (Positive/Negative/Neutral/Mixed) so the model can't inject arbitrary text into that slot.

**2.2 \u2014 Dynamic response strategies.** Already substantially present before this milestone (built earlier in this project's history): the prompt asks the model for genuinely-differentiated reply angles specific to the actual post content, with explicit good/bad examples, rather than a fixed content-type \u2192 button-set lookup table. This milestone did not change that mechanism, since it already satisfies the intent (different posts get different, tailored options) more flexibly than a hardcoded per-content-type table would.

**2.3 \u2014 UI.** Added a compact, single-line metadata badge (e.g. "Product launch \u00b7 Positive \u00b7 Professional network") above the existing reply-strategy button list in the comment panel, shown only when analysis succeeds and at least one field is present. The one-sentence summary is attached as a hover tooltip rather than its own line, to honor the "keep the UI compact, no giant modal" requirement \u2014 the panel's footprint is unchanged.

## Files changed

- `services/promptBuilder.js` \u2014 `buildContextAnalysisPrompt` now requests the structured object
- `services/ai.js` \u2014 `analyzeContext` parses/validates/sanitizes the new shape; added `sanitizeAnalysisMeta`/`sanitizeMetaString`; mock provider's canned response updated to match
- `content/ui.js` \u2014 `openCommentPanel` tracks and caches the full analysis object (not just the reply-options array), renders the new badge row; added `.wf-context-badges` CSS
- `content/context-dom.js` \u2014 0.16.1 fix, `associated()`
- `manifest.json`, `package.json` \u2014 version bumps only
- `CHANGELOG.md` \u2014 this milestone's entry plus the 0.16.1 fix

## Tests added

None added this pass beyond the ad-hoc jsdom verification scripts used during development (not committed \u2014 this repo's real test suite is Playwright-based and needs a live Chromium binary I don't have network access to install here). This is a real gap: the 0.16.1 fix and Milestone 2's new response shape are both verified only by hand-rolled jsdom probes, not by anything checked into `tests/`.

## Tests run

- `node --check` on every modified file (all pass)
- Three jsdom scenarios for the 0.16.1 `associated()` fix (see above, all pass)
- One jsdom end-to-end run of `analyzeContext()` through the mock provider, confirming the new object shape
- Direct unit checks of `sanitizeAnalysisMeta`/`validateAnalyzedOptions`: valid metadata sanitized and length-capped correctly; an invalid sentiment value dropped rather than passed through; `null`/missing metadata handled without throwing; a missing `replyStrategies` array still throws (preserving the existing safe-fallback path)

## Platforms verified

None against a live browser \u2014 same limitation as the 0.16.1 fix and as this repo's own MILESTONE-1-REPORT.md already stated. Everything above is jsdom/synthetic-fixture verification.

## Existing bugs discovered

- The 0.16.1 context-association regression (see above)
- This repo's own fixture suite has a systematic blind spot: every social-platform fixture nests the field inside the post, so it can't catch the class of bug it just passed on 0.16.0

## Bugs fixed

- 0.16.1 context-association regression

## Remaining limitations

- No committed automated tests for either the 0.16.1 fix or Milestone 2's new response shape \u2014 recommend adding fixture cases with the field as a *sibling* of the post (not nested) to `tests/fixtures.cjs`, since that's the realistic case the current suite misses entirely.
- `analyzeEmailContext()` was not extended to the same structured shape (deliberate scope decision, see CHANGELOG).
- No live-browser/Playwright verification possible in this environment.
- Milestone 2.2 (dynamic strategies) relies on the model's own differentiation rather than a defined taxonomy per content type \u2014 works well in principle but isn't deterministic the way a hardcoded lookup table would be; worth watching in real use.

## Regression status

- Not run against this repo's real Playwright suite (no live Chromium available here) \u2014 please run `npm test` locally and report back.
- Manual/jsdom verification: PASS on everything checked above.

## Build status

- PASS (manifest valid, every modified file passes `node --check`)
