// Character Store
//
// Implements the immutable-creation model:
//   - Creating a character is a ONE-TIME snapshot. Once saved, its core
//     personality/behavior/background fields are frozen - no editing.
//   - The only allowed mutation is deletion.
//   - To "evolve" a character, the user creates a NEW character and may
//     optionally paste curated snippets from an old one as seed context
//     via forkedFrom + seedContext. This is manual and deliberate, never
//     automatic inheritance.
//   - Live session drift (Off-Script mode learning/developing) never
//     writes back here - it only ever affects the in-memory chat, not
//     the saved definition.
//
// Storage: localStorage, following the same raw-key + 'profileUpdated'-
// style event convention already used by UserProfileModal/Sidebar.

export type BehaviorMode = 'true-to-character' | 'off-script';

export interface SavedCharacter {
  id: string;
  name: string;
  behavior: BehaviorMode;
  summary?: string;       // fetched or user-provided bio, frozen at creation
  personality?: string;
  background?: string;
  source?: string;        // e.g. "Fandom", "AniList", "user-provided"
  forkedFrom?: string;    // id of the character this was forked from, if any
  seedContext?: string;   // curated snippets pasted in when forking (capped)
  createdAt: number;
}

const STORAGE_KEY = 'stageego_characters';
const SEED_CONTEXT_MAX_CHARS = 2000; // keeps forks a curated seed, not a full history dump

function readAll(): SavedCharacter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(characters: SavedCharacter[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  window.dispatchEvent(new Event('charactersUpdated'));
}

export function listCharacters(): SavedCharacter[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function getCharacter(id: string): SavedCharacter | undefined {
  return readAll().find(c => c.id === id);
}

/**
 * Creates a new character. This is the ONLY way a character's core
 * fields get set - there is deliberately no updateCharacter().
 */
export function createCharacter(input: Omit<SavedCharacter, 'id' | 'createdAt' | 'seedContext'> & {
  seedContext?: string;
}): SavedCharacter {
  const character: SavedCharacter = {
    ...input,
    seedContext: input.seedContext?.slice(0, SEED_CONTEXT_MAX_CHARS),
    id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };

  const all = readAll();
  all.push(character);
  writeAll(all);
  return character;
}

/**
 * Deletion is the only supported mutation on an existing character.
 */
export function deleteCharacter(id: string): void {
  const all = readAll().filter(c => c.id !== id);
  writeAll(all);
}

export const SEED_CONTEXT_LIMIT = SEED_CONTEXT_MAX_CHARS;
