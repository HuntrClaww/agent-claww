// Mixed-language / unusual-word flagging (Phase 6.5 Part 1)
//
// SCOPE - read this before touching or trusting this module:
// Browser SpeechRecognition takes a single `lang` and cannot natively
// transcribe genuinely code-switched speech (e.g. an English sentence
// with a Spanish phrase dropped in) - Chrome's API doesn't expose a
// multi-language decode mode. This module does NOT fix that.
//
// What it actually does: scans a FINAL transcript (or typed text) for
// words that aren't in a common-word list for the active language, and
// flags them as "unusual" - things worth a second glance because they
// might be a mistranscribed word, a name, or a foreign-language term
// that slipped in. It never silently changes anything; flags are
// advisory only, for the user to notice and optionally look into.
//
// This WILL flag plenty of legitimate, correctly-heard English words
// that just aren't common enough to be in the bundled list - that's
// expected and fine, since this is a "worth a glance" filter, not a
// spellchecker or a correctness judgment.

// A compact list of common English words/function words. Deliberately
// not exhaustive - covers the words frequent enough that flagging them
// would just be noise. Anything not here gets flagged, which includes
// both genuinely unusual words AND plenty of everyday words this list
// doesn't happen to include. Lowercase only; comparisons are
// case-insensitive.
const COMMON_WORDS_EN = new Set([
  'a','about','above','after','again','all','also','am','an','and','any','are',
  'around','as','at','back','bad','be','because','been','before','being','best',
  'better','big','but','by','call','came','can','cannot','come','could','day',
  'did','do','does','doing','done','down','each','even','ever','every','feel',
  'feeling','few','find','first','for','found','from','get','give','go','going',
  'gone','good','got','great','had','has','have','having','he','hello','her',
  'here','hers','herself','hey','hi','him','himself','his','how','however','i',
  'if','in','into','is','it','its','itself','just','keep','know','last','let',
  'like','little','long','look','looking','made','make','making','man','many',
  'may','me','mean','might','more','most','much','must','my','myself','need',
  'never','new','no','not','nothing','now','of','off','ok','okay','old','on',
  'once','one','only','or','other','our','ours','out','over','own','people',
  'please','put','really','right','said','same','saw','say','saying','see',
  'seem','seemed','seeing','set','she','should','since','so','some','something',
  'sorry','still','such','sure','take','tell','than','thank','thanks','that',
  'the','their','them','then','there','these','they','thing','think','this',
  'those','though','through','time','to','today','too','try','trying','two',
  'under','until','up','us','use','used','very','want','wanted','was','way',
  'we','well','went','were','what','when','where','which','while','who','why',
  'will','with','without','wont','would','yeah','yes','yet','you','your',
  'yours','yourself',
  // roleplay/chat-specific common words worth exempting
  'ok','yep','nope','gonna','wanna','gotta','kinda','sorta','lol','haha','hmm',
  'um','uh','oh','ah','wow','okay','alright','cool','sure','fine','love','hate',
  'happy','sad','angry','excited','tired','okay','maybe','probably','definitely',
]);

export interface FlaggedToken {
  token: string;   // the exact text as it appeared (original casing)
  start: number;   // char offset into the source string
  end: number;      // exclusive end offset
}

/**
 * Scans text for words not present in the common-word list (or an
 * extra allowlist, e.g. known character names). Returns flagged tokens
 * with their original position, so callers can highlight them in place
 * without altering the source text.
 *
 * Skips: very short tokens (<=2 chars, catches most abbreviations/
 * initials), purely numeric tokens, and anything in the allowlist
 * (case-insensitive).
 */
export function flagUnusualTokens(text: string, extraAllow: string[] = []): FlaggedToken[] {
  if (!text) return [];

  const allow = new Set(extraAllow.map(w => w.toLowerCase()));
  const flagged: FlaggedToken[] = [];

  // Matches runs of letters/apostrophes (so "don't" stays one token),
  // Unicode-aware so accented characters count as letters rather than
  // splitting the word.
  const wordPattern = /[\p{L}][\p{L}']*/gu;
  let match: RegExpExecArray | null;

  while ((match = wordPattern.exec(text)) !== null) {
    const token = match[0];
    const lower = token.toLowerCase();
    if (token.length <= 2) continue;
    if (COMMON_WORDS_EN.has(lower)) continue;
    if (allow.has(lower)) continue;
    flagged.push({ token, start: match.index, end: match.index + token.length });
  }

  return flagged;
}

/**
 * Pulls likely proper nouns (capitalized words) out of free text, for
 * building an allowlist from a character's name/bio/personality/
 * background so their own name and in-universe terms don't get
 * repeatedly flagged. Best-effort heuristic, not a real NER pass -
 * over-inclusion here is fine (it just means fewer false-positive
 * flags), under-inclusion just means those terms get flagged like any
 * other unusual word.
 */
export function extractKnownProperNouns(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\b[A-Z][a-z']{2,}\b/g) || [];
  return Array.from(new Set(matches));
}
