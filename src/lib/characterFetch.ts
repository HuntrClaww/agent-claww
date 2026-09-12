// Character Info Fetch Tool
// Used by Generic Mode ("be Sherlock") and Personality Mode character
// search/creation to pull real bio/personality data instead of relying
// purely on model memory.
//
// Sources queried (all CORS-friendly - work directly from the browser,
// no backend needed):
//   1. Fandom wikis   - deep bio, personality, relationships, quotes.
//                       Best for characters with an active fan wiki
//                       (most anime/game/franchise characters).
//   2. AniList         - structured anime/manga metadata + description.
//   3. MyAnimeList      - via the unofficial Jikan API. Thinnest, mostly
//      (Jikan)           metadata, used as an anime/manga-specific
//                        fallback when Fandom/AniList come up empty.
//   4. Wikipedia        - general-purpose, CORS-enabled via the
//                        `origin=*` MediaWiki search param + the REST
//                        summary endpoint. Best source for live-action
//                        characters, historical figures, or anything
//                        outside anime/game wikis Fandom doesn't cover.
//
// IMPORTANT SCOPE NOTE (2026-09-12): this is NOT a general web scraper.
// Browsers can't freely fetch arbitrary sites - most block cross-origin
// requests (CORS), and a client-side app like this one has no backend
// to proxy around that. These 4 sources were chosen specifically
// because each one explicitly supports CORS. A true "search any site
// on the internet" capability would need either a backend (Phase 9,
// currently deferred) or a paid search API - see webSearch.ts for that
// separate, opt-in capability.
//
// All results normalize into CharacterInfo/CharacterCandidate so
// callers don't care which source answered.

export interface CharacterInfo {
  name: string;
  source: string;            // e.g. "Fandom", "AniList", "Web Search"
  sourceUrl?: string;        // for the citation tag in the UI
  summary: string;           // short bio
  personality?: string;      // personality traits, as text
  background?: string;       // history/backstory
  confidence: 'high' | 'medium' | 'low';
  thumbnailUrl?: string;     // small preview image, when the source has one
}

/**
 * One source's hit, scored and ready to show as a pickable option.
 * Multiple candidates for the same searched name is the NORMAL,
 * expected outcome for a name that exists in more than one show/film/
 * game (e.g. several unrelated characters all named "Alex") - each
 * source's hit is kept separate rather than silently merged, since
 * merging two different fictional characters into one profile would
 * be actively wrong, not just imprecise. The person (or the calling
 * UI) picks which one is actually meant.
 */
export interface CharacterCandidate extends CharacterInfo {
  /**
   * 0-100 heuristic confidence that this candidate is a real, usable
   * match - NOT a measure of "is this definitely the character you
   * meant" across candidates. It's deliberately capped below 100:
   * this is pattern-matching over free-text search results, not a
   * verified identity match. Composed from: which source answered
   * (Fandom's wikis tend to be most reliable for character-specific
   * detail), whether the returned name closely matches the query,
   * how much content came back, and whether a thumbnail was found.
   */
  confidencePercent: number;
}

export interface CharacterSearchResult {
  query: string;
  /** Sorted best-first. Empty means all 4 sources came up empty. */
  candidates: CharacterCandidate[];
}

// --- Confidence scoring ----------------------------------------------

const SOURCE_BASE_SCORE: Record<string, number> = {
  Fandom: 40,
  Wikipedia: 32,
  AniList: 30,
  MyAnimeList: 20,
};

function scoreCandidate(name: string, queried: string, summary: string, hasThumbnail: boolean): number {
  let score = 0;
  score += 15; // base "a source found something at all"
  const normalizedName = name.trim().toLowerCase();
  const normalizedQuery = queried.trim().toLowerCase();
  if (normalizedName === normalizedQuery) {
    score += 20;
  } else if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) {
    score += 10;
  }
  if (summary.length > 400) score += 15;
  else if (summary.length > 150) score += 8;
  if (hasThumbnail) score += 10;
  return Math.min(95, score); // never claim certainty from a heuristic
}

// --- 1. Fandom -------------------------------------------------------

const FANDOM_SEARCH_API = (query: string) =>
  `https://community.fandom.com/api/v1/Search/List?query=${encodeURIComponent(query)}&limit=1&namespaces=0`;

async function fetchFromFandom(name: string): Promise<CharacterCandidate | null> {
  try {
    const res = await fetch(FANDOM_SEARCH_API(name));
    if (!res.ok) {
      console.warn(`[characterFetch] Fandom returned HTTP ${res.status} for "${name}"`);
      return null;
    }
    const data = await res.json();
    const top = data?.items?.[0];
    if (!top) {
      console.warn(`[characterFetch] Fandom: no results for "${name}"`);
      return null;
    }

    const summary = top.snippet?.replace(/<[^>]+>/g, '').trim() || '';
    const thumbnailUrl: string | undefined = typeof top.thumbnail === 'string' ? top.thumbnail : undefined;
    return {
      name: top.title || name,
      source: 'Fandom',
      sourceUrl: top.url,
      summary,
      confidence: 'high',
      thumbnailUrl,
      confidencePercent: SOURCE_BASE_SCORE.Fandom + scoreCandidate(top.title || name, name, summary, !!thumbnailUrl),
    };
  } catch (err) {
    console.warn(`[characterFetch] Fandom fetch failed for "${name}" (likely CORS):`, err);
    return null;
  }
}

// --- 2. AniList --------------------------------------------------------

const ANILIST_GRAPHQL = 'https://graphql.anilist.co';

async function fetchFromAniList(name: string): Promise<CharacterCandidate | null> {
  try {
    const query = `
      query ($search: String) {
        Character(search: $search) {
          name { full }
          description(asHtml: false)
          siteUrl
          image { large }
        }
      }
    `;
    const res = await fetch(ANILIST_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { search: name } }),
    });
    if (!res.ok) {
      console.warn(`[characterFetch] AniList returned HTTP ${res.status} for "${name}"`);
      return null;
    }
    const json = await res.json();
    const char = json?.data?.Character;
    if (!char) {
      console.warn(`[characterFetch] AniList: no character found for "${name}"`);
      return null;
    }

    const summary = (char.description || '').replace(/<[^>]+>/g, '').slice(0, 600);
    const thumbnailUrl: string | undefined = char.image?.large || undefined;
    const resolvedName = char.name?.full || name;
    return {
      name: resolvedName,
      source: 'AniList',
      sourceUrl: char.siteUrl,
      summary,
      confidence: 'medium',
      thumbnailUrl,
      confidencePercent: SOURCE_BASE_SCORE.AniList + scoreCandidate(resolvedName, name, summary, !!thumbnailUrl),
    };
  } catch (err) {
    console.warn(`[characterFetch] AniList fetch failed for "${name}":`, err);
    return null;
  }
}

// --- 3. MyAnimeList via Jikan (unofficial public API) -------------------

async function fetchFromJikan(name: string): Promise<CharacterCandidate | null> {
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(name)}&limit=1`
    );
    if (!res.ok) {
      console.warn(`[characterFetch] Jikan returned HTTP ${res.status} for "${name}"`);
      return null;
    }
    const json = await res.json();
    const char = json?.data?.[0];
    if (!char) {
      console.warn(`[characterFetch] Jikan: no character found for "${name}"`);
      return null;
    }

    const summary = (char.about || '').slice(0, 400);
    const thumbnailUrl: string | undefined = char.images?.jpg?.image_url || undefined;
    const resolvedName = char.name || name;
    return {
      name: resolvedName,
      source: 'MyAnimeList',
      sourceUrl: char.url,
      summary,
      confidence: 'low',
      thumbnailUrl,
      confidencePercent: SOURCE_BASE_SCORE.MyAnimeList + scoreCandidate(resolvedName, name, summary, !!thumbnailUrl),
    };
  } catch (err) {
    console.warn(`[characterFetch] Jikan fetch failed for "${name}":`, err);
    return null;
  }
}

// --- 4. Wikipedia --------------------------------------------------------
// Best source for live-action characters, real people, and anything
// outside anime/game wikis. Two calls: a search to resolve the closest
// matching page title, then the REST summary endpoint for the actual
// extract + thumbnail. Both support CORS - the `origin=*` param on the
// legacy search API and REST's own CORS headers are Wikipedia's own
// documented way of allowing browser-side callers, not a workaround.

async function fetchFromWikipedia(name: string): Promise<CharacterCandidate | null> {
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*&srlimit=1`
    );
    if (!searchRes.ok) {
      console.warn(`[characterFetch] Wikipedia search returned HTTP ${searchRes.status} for "${name}"`);
      return null;
    }
    const searchJson = await searchRes.json();
    const topTitle: string | undefined = searchJson?.query?.search?.[0]?.title;
    if (!topTitle) {
      console.warn(`[characterFetch] Wikipedia: no results for "${name}"`);
      return null;
    }

    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`
    );
    if (!summaryRes.ok) {
      console.warn(`[characterFetch] Wikipedia summary returned HTTP ${summaryRes.status} for "${topTitle}"`);
      return null;
    }
    const summaryJson = await summaryRes.json();
    const summary: string = summaryJson?.extract || '';
    if (!summary) return null;

    const thumbnailUrl: string | undefined = summaryJson?.thumbnail?.source || undefined;
    const resolvedName = summaryJson?.title || topTitle;
    return {
      name: resolvedName,
      source: 'Wikipedia',
      sourceUrl: summaryJson?.content_urls?.desktop?.page,
      summary,
      confidence: 'medium',
      thumbnailUrl,
      confidencePercent: SOURCE_BASE_SCORE.Wikipedia + scoreCandidate(resolvedName, name, summary, !!thumbnailUrl),
    };
  } catch (err) {
    console.warn(`[characterFetch] Wikipedia fetch failed for "${name}":`, err);
    return null;
  }
}

// --- Orchestration -------------------------------------------------------

/**
 * Queries all 4 sources concurrently and returns every hit as a
 * separate, scored candidate - sorted best first. Deliberately does
 * NOT try to merge same-named hits from different sources into one
 * profile: two sources returning different content for the same name
 * is exactly the "characters who share a full name" case, and merging
 * them would silently mix two different fictional people together.
 * The caller (a search UI) shows the candidates and lets the person
 * pick, same as picking a search result.
 *
 * onProgress, if given, is called once per source as it resolves (not
 * in a fixed order - whichever finishes first fires first) so a live
 * status UI can narrate real progress rather than a fake canned
 * sequence.
 */
export async function searchCharacterCandidates(
  name: string,
  onProgress?: (message: string) => void
): Promise<CharacterSearchResult> {
  const trimmed = name.trim();
  if (!trimmed) return { query: name, candidates: [] };

  const sources: [string, () => Promise<CharacterCandidate | null>][] = [
    ['Fandom', () => fetchFromFandom(trimmed)],
    ['Wikipedia', () => fetchFromWikipedia(trimmed)],
    ['AniList', () => fetchFromAniList(trimmed)],
    ['MyAnimeList', () => fetchFromJikan(trimmed)],
  ];

  onProgress?.(`Searching ${sources.length} sources for "${trimmed}"...`);

  const results = await Promise.allSettled(
    sources.map(async ([label, fn]) => {
      const result = await fn();
      onProgress?.(result ? `✓ ${label}: found a match` : `${label}: no match`);
      return result;
    })
  );

  const candidates = results
    .filter((r): r is PromiseFulfilledResult<CharacterCandidate | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((c): c is CharacterCandidate => c !== null && c.summary.length > 0)
    .sort((a, b) => b.confidencePercent - a.confidencePercent);

  onProgress?.(
    candidates.length > 0
      ? `Done — ${candidates.length} candidate${candidates.length === 1 ? '' : 's'} found`
      : 'Done — no matches in any source'
  );

  return { query: trimmed, candidates };
}

/**
 * Backward-compatible single-result lookup, used by callers that just
 * want "the best guess" without showing a picker (Generic Mode's "be
 * X" auto-switch, and the click-to-lookup word tooltip) - both existed
 * before the search/candidates system above and don't need it.
 */
export async function fetchCharacterInfo(name: string): Promise<CharacterInfo | null> {
  const { candidates } = await searchCharacterCandidates(name);
  return candidates[0] ?? null;
}

/**
 * Formats a CharacterInfo result into a short citation-style tag,
 * e.g. "via Fandom" - shown in the UI so users know when the AI is
 * reciting sourced info vs. generating in-character dialogue.
 */
export function citationTag(info: CharacterInfo): string {
  return `via ${info.source}`;
}
