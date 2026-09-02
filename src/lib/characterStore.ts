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

import type { Emotion } from './emotionDetect';

export type BehaviorMode = 'true-to-character' | 'off-script';

// Voice settings for Phase 6 (Web Speech API) - stores which browser
// system voice to use plus pitch/rate tuning. voiceName is matched
// against SpeechSynthesisVoice.name at playback time; if that exact
// voice isn't available on the current device, playback falls back to
// the browser's default voice rather than failing.
export interface VoiceSettings {
  voiceName?: string; // SpeechSynthesisVoice.name, e.g. "Google UK English Male"
  pitch: number;       // 0 - 2, default 1
  rate: number;         // 0.1 - 10, default 1
}

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
  portraitUrl?: string;   // data URL for the character's default/neutral portrait
  emotionPortraits?: Partial<Record<Emotion, string>>; // optional per-emotion art, sparse - unset emotions fall back to portraitUrl
  themeColor?: string;    // hex accent color (e.g. "#f472b6") applied when this character's chat is active
  voiceSettings?: VoiceSettings; // Phase 6: optional per-character voice, falls back to browser default if unset
  createdAt: number;
}

const STORAGE_KEY = 'stageego_characters';
const SEED_CONTEXT_MAX_CHARS = 2000; // keeps forks a curated seed, not a full history dump
// localStorage typically caps out around 5-10MB total across the whole origin,
// so a single portrait must stay small. 500KB base64 (~375KB actual image) is
// a reasonable ceiling for a prototype - a real backend would use object
// storage instead and lift this entirely.
const PORTRAIT_MAX_BYTES = 500_000;
// Emotion slots are optional extras stacked on top of the default portrait,
// so each one gets a tighter cap to keep a fully-loaded character reasonable
// (10 emotions x 150KB = 1.5MB max, on top of the 500KB default portrait).
const EMOTION_PORTRAIT_MAX_BYTES = 150_000;

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
 *
 * Throws if a portraitUrl is provided but exceeds PORTRAIT_MAX_BYTES -
 * callers should validate with isPortraitSizeOk() before calling this
 * so they can show a friendly error instead of a thrown exception.
 */
export function createCharacter(input: Omit<SavedCharacter, 'id' | 'createdAt' | 'seedContext'> & {
  seedContext?: string;
}): SavedCharacter {
  if (input.portraitUrl && !isPortraitSizeOk(input.portraitUrl)) {
    throw new Error(`Portrait image is too large (max ${Math.round(PORTRAIT_MAX_BYTES / 1000)}KB).`);
  }
  if (input.themeColor && !isValidHexColor(input.themeColor)) {
    throw new Error('Theme color must be a valid hex color (e.g. #f472b6).');
  }
  if (input.voiceSettings && !isValidVoiceSettings(input.voiceSettings)) {
    throw new Error('Voice pitch must be 0-2 and rate must be 0.1-10.');
  }
  if (input.emotionPortraits) {
    for (const [emotion, dataUrl] of Object.entries(input.emotionPortraits)) {
      if (dataUrl && !isEmotionPortraitSizeOk(dataUrl)) {
        throw new Error(`${emotion} portrait is too large (max ${EMOTION_PORTRAIT_MAX_KB}KB).`);
      }
    }
  }

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
 * Guards against non-hex strings ever reaching a CSS variable, since
 * themeColor is injected directly into inline styles by the chat UI.
 */
export function isValidHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

/**
 * Guards voiceSettings against out-of-range values before they reach
 * SpeechSynthesisUtterance, which silently clamps rather than erroring -
 * we'd rather catch a bad value here than have it default-clamp silently.
 */
export function isValidVoiceSettings(v: VoiceSettings): boolean {
  return v.pitch >= 0 && v.pitch <= 2 && v.rate >= 0.1 && v.rate <= 10;
}

/**
 * Checks whether a data URL is small enough to safely store. Call this
 * before createCharacter() so the UI can reject an oversized image with
 * a clear message rather than a caught exception.
 */
export function isPortraitSizeOk(dataUrl: string): boolean {
  return dataUrl.length <= PORTRAIT_MAX_BYTES;
}

export const PORTRAIT_MAX_KB = Math.round(PORTRAIT_MAX_BYTES / 1000);

/**
 * Checks whether a data URL is small enough to store as an emotion slot
 * image (tighter cap than the default portrait - see EMOTION_PORTRAIT_MAX_BYTES).
 */
export function isEmotionPortraitSizeOk(dataUrl: string): boolean {
  return dataUrl.length <= EMOTION_PORTRAIT_MAX_BYTES;
}

export const EMOTION_PORTRAIT_MAX_KB = Math.round(EMOTION_PORTRAIT_MAX_BYTES / 1000);

/**
 * Resolves the image to show for a given emotion: the matching emotion
 * slot if the character has one, otherwise the default portrait.
 */
export function resolvePortraitForEmotion(character: SavedCharacter, emotion: Emotion): string | undefined {
  return character.emotionPortraits?.[emotion] || character.portraitUrl;
}

/**
 * Deletion is the only supported mutation on an existing character.
 */
export function deleteCharacter(id: string): void {
  const all = readAll().filter(c => c.id !== id);
  writeAll(all);
}

export const SEED_CONTEXT_LIMIT = SEED_CONTEXT_MAX_CHARS;
