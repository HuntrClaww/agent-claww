// Chat Log Store
//
// Phase 10 item 2: chat logs previously lived only in React state and
// vanished on every refresh. This persists messages per-thread to
// localStorage, following the same raw-key + size-cap conventions
// already established in characterStore.ts.
//
// A "thread" is keyed by mode + character, NOT by a session/date, so
// reopening the same character later restores that conversation:
//   - Generic Mode has exactly one thread: 'generic'
//   - Personality Mode has one thread per character: 'personality:<characterId>'
//
// Scoping note (flagged rather than silently decided): "New Chat"
// (handleNewChat in ChatWindow.tsx) only resets in-memory session
// state and returns to the character-select screen - it does NOT
// clear a thread's persisted history. Reselecting the same character
// restores its saved conversation. If a genuine "clear this
// conversation" affordance is wanted later, that's a separate,
// explicit feature (clearThread() below already exists for it) -
// distinct from "New Chat", which is really "switch conversations".

import type { Emotion } from './emotionDetect';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  citation?: string;
  emotion?: Emotion;
}

const STORAGE_PREFIX = 'stageego_chatlog_';

// Same reasoning as characterStore.ts's PORTRAIT_MAX_BYTES: localStorage
// caps out around 5-10MB total per origin, and now shares that budget
// with characters + portraits, so each thread gets a conservative cap.
// Oldest messages are dropped first once either limit is hit - recent
// context matters more than full history for a prototype like this.
const MAX_MESSAGES_PER_THREAD = 300;
const MAX_THREAD_BYTES = 800_000;

function storageKey(threadKey: string): string {
  return `${STORAGE_PREFIX}${threadKey}`;
}

/**
 * Loads a thread's saved messages. Returns an empty array if nothing
 * is saved yet or the stored value is corrupt - never throws, so
 * callers can treat "no history" and "load failed" the same way
 * (start fresh) without special-casing.
 */
export function loadThread(threadKey: string): Message[] {
  try {
    const raw = localStorage.getItem(storageKey(threadKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves a thread's messages, trimming from the oldest end first if
 * the thread exceeds either the message-count or byte-size cap.
 * Silently drops the save on quota errors (e.g. localStorage full)
 * rather than throwing mid-chat - persistence is a nice-to-have here,
 * not something that should ever interrupt sending a message.
 */
export function saveThread(threadKey: string, messages: Message[]): void {
  let trimmed = messages.length > MAX_MESSAGES_PER_THREAD
    ? messages.slice(messages.length - MAX_MESSAGES_PER_THREAD)
    : messages;

  let serialized = JSON.stringify(trimmed);
  while (serialized.length > MAX_THREAD_BYTES && trimmed.length > 1) {
    trimmed = trimmed.slice(1);
    serialized = JSON.stringify(trimmed);
  }

  try {
    localStorage.setItem(storageKey(threadKey), serialized);
  } catch (err) {
    console.warn(`[chatLogStore] Failed to save thread "${threadKey}" — continuing without persistence for this save:`, err);
  }
}

/**
 * Clears one thread's saved history. Not currently wired to any UI
 * button (see scoping note above) - exists for when that's wanted.
 */
export function clearThread(threadKey: string): void {
  localStorage.removeItem(storageKey(threadKey));
}

/** Builds the thread key for Personality Mode's per-character threads. */
export function personalityThreadKey(characterId: string): string {
  return `personality:${characterId}`;
}

/** Generic Mode has exactly one, unkeyed thread. */
export const GENERIC_THREAD_KEY = 'generic';
