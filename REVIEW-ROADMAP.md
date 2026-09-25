# WriteFlow Review: development roadmap

## Release 0.20.0 — local review workflow (implemented)
- Preserve one immutable instruction and at most one answer per round. Explain, Quantify, Challenge and Custom commands use the existing BYOK providers; Mock is explicitly labelled as a demonstration. A failed request leaves the round pending and retryable. Correct an answer by starting another round.
- Store citation, exact proposition, status, status history and answer-round links. Disputed/withdrawn sources show affected item counts. Source status is a reviewer judgement, not automatic verification.
- Restore exported JSON after schema, ID, relationship, chronology and size validation, then replace the local record in one transaction. Supports previous version 1 backups.
- Import the *first worksheet* of an .xlsx register: item ID/status/section/statement in A–D, and adjacent instruction/answer pairs from E onward. Pair history on the sheet reads newest to oldest; imported rounds are stored oldest to newest. A preview precedes an atomic import. Existing items remain; collisions reject the import. Other workbook sheets are ignored.

Acceptance gates: no answer overwrites; two delayed responses match their own instruction IDs; invalid backups leave existing data untouched; duplicate Excel IDs reject without partial imports; imported R-IDs remain stable; disputed source links identify affected items; source URL and selected text remain local unless the user requests AI analysis.

## Release 0.21.0 — decisions and capture (implemented)
- Earlier rounds and flagged sources are sent with each Ask AI request; larger review output budget.
- Closing requires a decision note; decisions export as Markdown for shared pages.
- Captured selections attach to existing items as answered rounds.

## Next: source-sheet migration and export
- Import the workbook's second Sources sheet. Preview citation/proposition/item-number mappings and let the user choose the exact answer round for each relationship. Never infer a round from an item ID alone. Identify unresolved sources explicitly.
- Export a human-readable .xlsx register and Sources sheet as an additional format, preserving the history ordering and stable IDs. Keep JSON as the complete backup format.
- Add visible review badges and convenient navigation from a disputed source to each affected answer.

## Then: reliability and release
- Verify provider responses and context-menu capture in an installed extension on full Chrome, including real site layouts.
- Review limits, large-project performance, import on real user workbooks, keyboard/a11y, privacy copy and licence/product-tier decision.
- Resolve the existing writing-suite context failures separately before claiming production readiness.
