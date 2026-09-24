// services/style-learning.js
// Milestone 4, Batch 2 (Style DNA: learn from accepted edits). Pure
// functions only \u2014 no chrome.* access, no storage access, no side
// effects. Given the WriteFlow-generated suggestion text and what the
// user actually left it as, returns small directional signals for
// services/storage.js's recordStyleEdit() to apply. Deliberately narrow:
// every signal here is derived only from comparing WriteFlow's own
// output to what the user kept, never from arbitrary page content.
window.WriteFlow = window.WriteFlow || {};
window.WriteFlow.StyleLearning = (function () {
  const CONTRACTIONS = /\b\w+'(t|s|re|ve|ll|d|m)\b/gi;
  const CORPORATE_PHRASES = [
    /\bleverage\b/i, /\bsynergy\b/i, /\bcircle back\b/i, /\bper my last email\b/i,
    /\bmoving forward\b/i, /\bat the end of the day\b/i, /\bideate\b/i, /\btouch base\b/i,
    /\breach out\b/i, /\bcirca\b/i, /\bbandwidth\b/i
  ];
  const GREETING = /^\s*(hi|hello|hey|dear|good (morning|afternoon|evening))\b/i;
  const SIGNOFF = /(best|regards|thanks|thank you|cheers|sincerely|talk soon)[,!]?\s*[\w\s]{0,25}$/i; // allows a trailing name, e.g. "Best, Sam"
  // Common emoji ranges; not exhaustive, doesn't need to be for a rough frequency signal.
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
  // A meaningful step, not noise from formatting/punctuation-only edits.
  const SENTENCE_LENGTH_THRESHOLD = 3;
  const CONTRACTION_RATE_THRESHOLD = 0.03;

  function avgSentenceLength(text) {
    const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    if (!sentences.length) return 0;
    const words = sentences.reduce((sum, s) => sum + s.split(/\s+/).filter(Boolean).length, 0);
    return words / sentences.length;
  }
  function countMatches(text, re) {
    return (text.match(re) || []).length;
  }

  /**
   * @param {string} before the suggestion WriteFlow actually generated
   * @param {string} after what the field held when the user moved on
   * @returns {object|null} directional signals in [-1, 1] per field, or
   *   null if there's nothing meaningfully different to learn from
   */
  function computeSignals(before, after) {
    const b = String(before || "");
    const a = String(after || "");
    if (!b.trim() || !a.trim() || b === a) return null;

    const signals = {};

    const lenB = avgSentenceLength(b);
    const lenA = avgSentenceLength(a);
    if (lenB > 0 && Math.abs(lenA - lenB) >= SENTENCE_LENGTH_THRESHOLD) {
      signals.brevity = lenA < lenB ? 1 : -1;
    }

    const wordsB = b.split(/\s+/).filter(Boolean).length || 1;
    const wordsA = a.split(/\s+/).filter(Boolean).length || 1;
    const contractionRateB = countMatches(b, CONTRACTIONS) / wordsB;
    const contractionRateA = countMatches(a, CONTRACTIONS) / wordsA;
    if (Math.abs(contractionRateA - contractionRateB) >= CONTRACTION_RATE_THRESHOLD) {
      signals.contractionPreference = contractionRateA > contractionRateB ? 1 : -1;
    }

    const corporateB = CORPORATE_PHRASES.some((re) => re.test(b));
    const corporateA = CORPORATE_PHRASES.some((re) => re.test(a));
    if (corporateB && !corporateA) signals.formality = -1; // removed jargon reads as more direct
    else if (!corporateB && corporateA) signals.formality = 1;

    const greetB = GREETING.test(b);
    const greetA = GREETING.test(a);
    if (greetB !== greetA) signals.greetingStyle = greetA ? 1 : -1;

    const signB = SIGNOFF.test(b);
    const signA = SIGNOFF.test(a);
    if (signB !== signA) signals.signoffStyle = signA ? 1 : -1;

    const emojiB = countMatches(b, EMOJI);
    const emojiA = countMatches(a, EMOJI);
    if (emojiB !== emojiA) signals.emojiFrequency = emojiA > emojiB ? 1 : -1;

    return Object.keys(signals).length ? signals : null;
  }

  return { computeSignals };
})();
