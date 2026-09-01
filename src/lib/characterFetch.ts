// Character Info Fetch Tool
// Used by Generic Mode ("be Sherlock") and Personality Mode character creation
// to pull real bio/personality data instead of relying purely on model memory.
//
// Source priority (richest -> thinnest):
//   1. Fandom wikis        - deep bio, personality, relationships, quotes
//   2. AniList              - structured anime/manga metadata + description
//   3. Anime-Planet          - similar, secondary fallback
//   4. MyAnimeList (Jikan)  - thinnest, mostly metadata
//   5. General web search    - live-action/human characters, anything else
//
// All results normalize into CharacterInfo so callers don't care which
// source answered.

export interface CharacterInfo {
  name: string;
  source: string;            // e.g. "Fandom", "AniList", "Web Search"
  sourceUrl?: string;        // for the citation tag in the UI
  summary: string;           // short bio
  personality?: string;      // personality traits, as text
  background?: string;       // history/backstory
  confidence: 'high' | 'medium' | 'low';
}

// Fandom's cross-wiki search API (returns JSON with article snippets)
const FANDOM_SEARCH_API = (query: string) =>
  `https://community.fandom.com/api/v1/Search/List?query=${encodeURIComponent(query)}&limit=1&namespaces=0`;

const ANILIST_GRAPHQL = 'https://graphql.anilist.co';

// --- 1. Fandom -------------------------------------------------------

async function fetchFromFandom(name: string): Promise<CharacterInfo | null> {
  try {
    const res = await fetch(FANDOM_SEARCH_API(name));
    if (!res.ok) {
      console.warn(`[characterFetch] Fandom returned HTTP ${res.status} for "${name}" — falling back`);
      return null;
    }
    const data = await res.json();
    const top = data?.items?.[0];
    if (!top) {
      console.warn(`[characterFetch] Fandom: no results for "${name}" — falling back`);
      return null;
    }

    return {
      name,
      source: 'Fandom',
      sourceUrl: top.url,
      summary: top.snippet?.replace(/<[^>]+>/g, '').trim() || '',
      confidence: 'high',
    };
  } catch (err) {
    console.warn(`[characterFetch] Fandom fetch failed for "${name}" (likely CORS):`, err, '— falling back to AniList');
    return null;
  }
}

// --- 2. AniList --------------------------------------------------------

async function fetchFromAniList(name: string): Promise<CharacterInfo | null> {
  try {
    const query = `
      query ($search: String) {
        Character(search: $search) {
          name { full }
          description(asHtml: false)
          siteUrl
        }
      }
    `;
    const res = await fetch(ANILIST_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { search: name } }),
    });
    if (!res.ok) {
      console.warn(`[characterFetch] AniList returned HTTP ${res.status} for "${name}" — falling back`);
      return null;
    }
    const json = await res.json();
    const char = json?.data?.Character;
    if (!char) {
      console.warn(`[characterFetch] AniList: no character found for "${name}" — falling back`);
      return null;
    }

    return {
      name: char.name?.full || name,
      source: 'AniList',
      sourceUrl: char.siteUrl,
      summary: (char.description || '').slice(0, 600),
      confidence: 'medium',
    };
  } catch (err) {
    console.warn(`[characterFetch] AniList fetch failed for "${name}":`, err, '— falling back to Jikan');
    return null;
  }
}

// --- 3. MyAnimeList via Jikan (unofficial public API) -------------------

async function fetchFromJikan(name: string): Promise<CharacterInfo | null> {
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(name)}&limit=1`
    );
    if (!res.ok) {
      console.warn(`[characterFetch] Jikan returned HTTP ${res.status} for "${name}" — all sources exhausted`);
      return null;
    }
    const json = await res.json();
    const char = json?.data?.[0];
    if (!char) {
      console.warn(`[characterFetch] Jikan: no character found for "${name}" — all sources exhausted`);
      return null;
    }

    return {
      name: char.name || name,
      source: 'MyAnimeList',
      sourceUrl: char.url,
      summary: (char.about || '').slice(0, 400),
      confidence: 'low',
    };
  } catch (err) {
    console.warn(`[characterFetch] Jikan fetch failed for "${name}":`, err, '— all sources exhausted, falling back to model knowledge');
    return null;
  }
}

// --- Orchestration -------------------------------------------------------

/**
 * Attempts sources in priority order, returns the first usable hit.
 * Non-anime / live-action characters will likely fall through all three
 * and return null — caller should fall back to web_search or model
 * knowledge in that case, flagged as lower confidence.
 */
export async function fetchCharacterInfo(name: string): Promise<CharacterInfo | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  console.log(`[characterFetch] Starting fetch chain for "${trimmed}"`);

  const fandom = await fetchFromFandom(trimmed);
  if (fandom && fandom.summary) {
    console.log(`[characterFetch] ✓ Resolved "${trimmed}" from Fandom`);
    return fandom;
  }

  const anilist = await fetchFromAniList(trimmed);
  if (anilist && anilist.summary) {
    console.log(`[characterFetch] ✓ Resolved "${trimmed}" from AniList`);
    return anilist;
  }

  const jikan = await fetchFromJikan(trimmed);
  if (jikan && jikan.summary) {
    console.log(`[characterFetch] ✓ Resolved "${trimmed}" from Jikan/MAL`);
    return jikan;
  }

  console.warn(`[characterFetch] ✗ All sources exhausted for "${trimmed}" — caller should use model knowledge only`);
  return null;
}

/**
 * Formats a CharacterInfo result into a short citation-style tag,
 * e.g. "via Fandom" - shown in the UI so users know when the AI is
 * reciting sourced info vs. generating in-character dialogue.
 */
export function citationTag(info: CharacterInfo): string {
  return `via ${info.source}`;
}
