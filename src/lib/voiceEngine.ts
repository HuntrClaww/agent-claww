/**
 * voiceEngine.ts
 *
 * Thin wrapper around the browser's native Web Speech API
 * (SpeechSynthesis). Zero cost, zero signup, zero dependency -
 * see HANDOVER.md Phase 6 for the free-tier research behind this
 * choice.
 *
 * Voices are loaded asynchronously by the browser and can arrive
 * after page load, so getAvailableVoices() waits for the
 * `voiceschanged` event on first call if the list isn't populated yet.
 */

import type { VoiceSettings } from './characterStore';
import type { Emotion } from './emotionDetect';

// Minimal ambient types for the Web Speech API's SpeechRecognition -
// not part of TypeScript's default DOM lib. Only the members this
// file actually uses are declared.
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesReady = false;

function loadVoices(): SpeechSynthesisVoice[] {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (voices.length > 0) {
    cachedVoices = voices;
    voicesReady = true;
  }
  return voices;
}

/**
 * Returns the list of voices available on this device/browser.
 * Resolves once the browser has actually populated the list -
 * on first page load this can be empty until `voiceschanged` fires.
 */
export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);

  const existing = loadVoices();
  if (voicesReady && existing.length > 0) return Promise.resolve(existing);

  return new Promise(resolve => {
    const handler = () => {
      const voices = loadVoices();
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(voices);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // Safety timeout - some browsers never fire voiceschanged reliably
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(loadVoices());
    }, 1000);
  });
}

/** True if this browser supports speech synthesis at all. */
export function isVoiceSupported(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * Resolves the best available SpeechSynthesisVoice for the given
 * settings. Voice names are NOT portable across platforms (confirmed:
 * mostly stable across browsers, but Android/iOS/iPadOS/macOS diverge -
 * see HANDOVER.md Phase 6 research). So this tries, in order:
 *   1. Exact name match (works when on the same browser/device the
 *      voice was saved on, or on platforms where names do line up)
 *   2. Same language match (e.g. saved as "en-GB" - find any installed
 *      voice with that exact lang tag)
 *   3. Same language family (e.g. saved "en-GB" but only "en-US" is
 *      installed - better than a totally unrelated language)
 *   4. undefined - caller falls through to the browser's own default
 *      voice for the utterance, which is still coherent, just not the
 *      specific voice that was chosen originally
 *
 * Logs which tier it landed on so voice mismatches are diagnosable
 * rather than silent.
 */
export function pickBestVoice(settings?: VoiceSettings): SpeechSynthesisVoice | undefined {
  if (!settings?.voiceName && !settings?.lang) return undefined;

  if (settings.voiceName) {
    const exact = cachedVoices.find(v => v.name === settings.voiceName);
    if (exact) return exact;
  }

  if (settings.lang) {
    const sameLang = cachedVoices.find(v => v.lang === settings.lang);
    if (sameLang) {
      console.warn(`[voiceEngine] Voice "${settings.voiceName}" not found — matched by exact language "${settings.lang}" instead: "${sameLang.name}"`);
      return sameLang;
    }

    const family = settings.lang.split('-')[0];
    const sameFamily = cachedVoices.find(v => v.lang.split('-')[0] === family);
    if (sameFamily) {
      console.warn(`[voiceEngine] Voice "${settings.voiceName}" not found — matched by language family "${family}" instead: "${sameFamily.name}" (${sameFamily.lang})`);
      return sameFamily;
    }
  }

  console.warn(`[voiceEngine] Voice "${settings.voiceName}" not available on this device and no language match found — using browser default`);
  return undefined;
}


/**
 * Speaks a single piece of text using the given voice settings.
 * Cancels any currently-playing utterance first, so calls don't
 * queue up and overlap - the caller (ChatWindow) owns sequencing
 * for multi-sentence playback via speakQueue().
 */
export function speak(text: string, settings?: VoiceSettings): void {
  if (!isVoiceSupported() || !text.trim()) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = settings?.pitch ?? 1;
  utterance.rate = settings?.rate ?? 1;

  const resolvedVoice = pickBestVoice(settings);
  if (resolvedVoice) utterance.voice = resolvedVoice;

  window.speechSynthesis.speak(utterance);
}

/**
 * Speaks a queue of text chunks in order, waiting for each to finish
 * before starting the next. Used for sentence-boundary streaming
 * playback so speech can start before the full AI response has
 * finished generating.
 */
export async function speakQueue(chunks: string[], settings?: VoiceSettings): Promise<void> {
  if (!isVoiceSupported()) return;

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    await new Promise<void>(resolve => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.pitch = settings?.pitch ?? 1;
      utterance.rate = settings?.rate ?? 1;

      const resolvedVoice = pickBestVoice(settings);
      if (resolvedVoice) utterance.voice = resolvedVoice;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // don't hang the queue on a playback error

      window.speechSynthesis.speak(utterance);
    });
  }
}

// --- Prosody / pacing (emotion-aware expressive speech) --------------
//
// Web Speech API has no SSML support, so there's no way to mark up
// "pause here" or "say this angrily" directly. What IS controllable
// per-utterance is pitch, rate, and volume - and the JS side fully
// controls timing between utterances. So expressive speech here means:
//   1. Split text into small clauses at punctuation boundaries
//   2. Insert a timed silence after each clause, sized to the
//      punctuation (comma = short pause, period = longer, ellipsis =
//      longest) and scaled by the character's current emotion
//   3. Nudge pitch/rate/volume per emotion on top of the character's
//      own base voice settings, rather than overriding them
//
// This is a real, audible improvement over flat monotone TTS, but it
// is NOT the same as neural prosody modeling (what Claude/ChatGPT/
// Gemini voice mode use server-side) - it's punctuation- and
// emotion-driven heuristics, entirely client-side and free.

interface ProsodyProfile {
  pitchMul: number;  // multiplies the character's base pitch
  rateMul: number;   // multiplies the character's base rate
  pauseMul: number;  // multiplies the punctuation-driven pause length
  volume: number;    // 0 - 1, absolute (not a multiplier)
}

// Tuned by feel, not measurement - these are heuristic starting points
// meant to be adjusted based on how they actually sound in practice.
const EMOTION_PROSODY: Record<Emotion, ProsodyProfile> = {
  neutral:     { pitchMul: 1.00, rateMul: 1.00, pauseMul: 1.00, volume: 1.00 },
  happy:       { pitchMul: 1.12, rateMul: 1.08, pauseMul: 0.85, volume: 1.00 },
  sad:         { pitchMul: 0.85, rateMul: 0.82, pauseMul: 1.30, volume: 0.85 },
  angry:       { pitchMul: 1.05, rateMul: 1.25, pauseMul: 0.60, volume: 1.00 },
  surprised:   { pitchMul: 1.25, rateMul: 1.10, pauseMul: 0.90, volume: 1.00 },
  confused:    { pitchMul: 0.95, rateMul: 0.85, pauseMul: 1.15, volume: 0.95 },
  embarrassed: { pitchMul: 1.08, rateMul: 0.90, pauseMul: 1.10, volume: 0.80 },
  thinking:    { pitchMul: 0.92, rateMul: 0.78, pauseMul: 1.40, volume: 0.90 },
  romantic:    { pitchMul: 0.95, rateMul: 0.80, pauseMul: 1.25, volume: 0.85 },
  fearful:     { pitchMul: 1.15, rateMul: 1.15, pauseMul: 0.75, volume: 0.90 },
};

interface ProsodyChunk {
  text: string;
  pauseAfterMs: number;
}

/** Base pause length in ms for a given trailing punctuation mark. */
function basePauseForPunctuation(trailing: string): number {
  if (trailing.includes('...') || trailing.includes('\u2026')) return 550;
  if (/[.!?]/.test(trailing)) return 380;
  if (/[,;:]/.test(trailing)) return 150;
  return 80; // default small gap so back-to-back clauses don't run together
}

/**
 * Splits text into small clause-level chunks at punctuation boundaries
 * (commas, semicolons, colons, sentence-enders, ellipses), and computes
 * a pause duration after each based on the punctuation type and the
 * given emotion's pacing profile.
 */
export function buildProsodyPlan(text: string, emotion: Emotion = 'neutral'): ProsodyChunk[] {
  const cleaned = text.trim();
  if (!cleaned) return [];

  const profile = EMOTION_PROSODY[emotion] ?? EMOTION_PROSODY.neutral;

  // Capture each clause together with its trailing punctuation
  const raw = cleaned.match(/[^,;:.!?]+(?:\.\.\.|[,;:.!?])*/g) ?? [cleaned];

  return raw
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const trailingMatch = part.match(/(\.\.\.|[,;:.!?]+)$/);
      const trailing = trailingMatch ? trailingMatch[0] : '';
      const pauseAfterMs = Math.round(basePauseForPunctuation(trailing) * profile.pauseMul);
      return { text: part, pauseAfterMs };
    });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Speaks text with emotion-aware pacing: clause-level chunking, timed
 * pauses sized to punctuation and scaled by emotion, and pitch/rate/
 * volume nudged per emotion on top of the character's own base voice
 * settings (never replacing them - a character's identity stays intact,
 * emotion just colors the delivery).
 *
 * This is the function ChatWindow should use for AI responses instead
 * of the plain speakQueue(), once an emotion has been detected.
 */
export async function speakExpressive(
  text: string,
  settings?: VoiceSettings,
  emotion: Emotion = 'neutral'
): Promise<void> {
  if (!isVoiceSupported()) return;

  const profile = EMOTION_PROSODY[emotion] ?? EMOTION_PROSODY.neutral;
  const basePitch = settings?.pitch ?? 1;
  const baseRate = settings?.rate ?? 1;

  const effectivePitch = clamp(basePitch * profile.pitchMul, 0, 2);
  const effectiveRate = clamp(baseRate * profile.rateMul, 0.1, 10);
  const effectiveVolume = clamp(profile.volume, 0, 1);

  const plan = buildProsodyPlan(text, emotion);

  for (const chunk of plan) {
    await new Promise<void>(resolve => {
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      utterance.pitch = effectivePitch;
      utterance.rate = effectiveRate;
      utterance.volume = effectiveVolume;

      const resolvedVoice = pickBestVoice(settings);
      if (resolvedVoice) utterance.voice = resolvedVoice;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });

    if (chunk.pauseAfterMs > 0) {
      await new Promise<void>(resolve => setTimeout(resolve, chunk.pauseAfterMs));
    }
  }
}

/** Stops any currently playing or queued speech immediately. */
export function stopSpeaking(): void {
  if (!isVoiceSupported()) return;
  window.speechSynthesis.cancel();
}

/** True if speech is currently playing. */
export function isSpeaking(): boolean {
  return isVoiceSupported() && window.speechSynthesis.speaking;
}

/**
 * Splits AI response text into sentence-boundary chunks for streaming
 * playback. Kept simple and dependency-free - splits on '.', '!', '?'
 * followed by whitespace, while trying not to break on common
 * abbreviations (Mr., Dr., etc.) or decimal numbers.
 */
export function splitIntoSentences(text: string): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];

  // Negative lookbehind for common abbreviations/initials/decimals is not
  // supported consistently enough across targets, so we use a simpler
  // heuristic: split on sentence-ending punctuation followed by a space
  // and a capital letter or end of string.
  const matches = cleaned.match(/[^.!?]+[.!?]+(?=\s+[A-Z]|\s*$)|[^.!?]+$/g);
  return matches ? matches.map(s => s.trim()).filter(Boolean) : [cleaned];
}

// --- Mic input (SpeechRecognition) -----------------------------------
// Also browser-native, also $0. Chrome/Edge support this well; Firefox
// support is inconsistent, so isMicSupported() should always be checked
// before showing a mic control.

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** True if this browser supports speech-to-text mic input. */
export function isMicSupported(): boolean {
  return getRecognitionCtor() !== null;
}

let activeRecognition: SpeechRecognition | null = null;

/**
 * Starts listening on the mic and streams back partial + final
 * transcripts via the callback. Returns a stop function the caller
 * invokes to end listening early (e.g. user releases push-to-talk).
 *
 * Only one recognition session runs at a time - starting a new one
 * stops any prior session first.
 */
export function startListening(
  onResult: (transcript: string, isFinal: boolean) => void,
  onEnd?: () => void
): () => void {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    console.warn('[voiceEngine] SpeechRecognition not supported in this browser');
    onEnd?.();
    return () => {};
  }

  stopListening(); // only one session at a time

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let finalTranscript = '';
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) finalTranscript += result[0].transcript;
      else interimTranscript += result[0].transcript;
    }
    if (finalTranscript) onResult(finalTranscript, true);
    else if (interimTranscript) onResult(interimTranscript, false);
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    console.warn('[voiceEngine] SpeechRecognition error:', event.error);
  };

  recognition.onend = () => {
    activeRecognition = null;
    onEnd?.();
  };

  activeRecognition = recognition;
  recognition.start();

  return stopListening;
}

/** Stops the current mic listening session, if any. */
export function stopListening(): void {
  if (activeRecognition) {
    activeRecognition.stop();
    activeRecognition = null;
  }
}

// --- Voice package export/import (portability) ------------------------
//
// IMPORTANT — what this is and isn't: a browser cannot install a new
// TTS voice onto a device. The Web Speech API only reads whatever
// voices the OS already has installed; there is no web API to add one.
// (Confirmed via research — see HANDOVER.md Phase 6.) So "exporting a
// voice" here means exporting the character's PORTABLE SETTINGS
// (which voice was selected + its language + pitch/rate), not the
// voice itself. On import, pickBestVoice() re-resolves those settings
// against whatever voices actually exist on the importing device -
// exact match if the same voice happens to be installed there, else
// the graceful language-based fallback.

export interface VoicePackage {
  formatVersion: 1;
  characterName?: string;
  voiceName?: string;
  lang?: string;
  pitch: number;
  rate: number;
}

/** Builds a portable voice package object from a character's voice settings. */
export function exportVoicePackage(settings: VoiceSettings, characterName?: string): VoicePackage {
  return {
    formatVersion: 1,
    characterName,
    voiceName: settings.voiceName,
    lang: settings.lang,
    pitch: settings.pitch,
    rate: settings.rate,
  };
}

/**
 * Triggers a browser download of a character's voice settings as a
 * .json file the user can save, share, or re-import later (including
 * on a different device/browser).
 */
export function downloadVoicePackage(settings: VoiceSettings, characterName?: string): void {
  const pkg = exportVoicePackage(settings, characterName);
  const json = JSON.stringify(pkg, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (characterName || 'character').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  a.href = url;
  a.download = `${safeName || 'character'}-voice.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses a voice package JSON string back into VoiceSettings. Returns
 * null (rather than throwing) on malformed input, so the caller can
 * show a friendly error instead of crashing the import flow.
 */
export function parseVoicePackage(jsonText: string): VoiceSettings | null {
  try {
    const parsed = JSON.parse(jsonText) as Partial<VoicePackage>;
    if (typeof parsed.pitch !== 'number' || typeof parsed.rate !== 'number') {
      console.warn('[voiceEngine] Voice package missing required pitch/rate fields');
      return null;
    }
    if (parsed.pitch < 0 || parsed.pitch > 2 || parsed.rate < 0.1 || parsed.rate > 10) {
      console.warn('[voiceEngine] Voice package pitch/rate out of valid range');
      return null;
    }
    return {
      voiceName: typeof parsed.voiceName === 'string' ? parsed.voiceName : undefined,
      lang: typeof parsed.lang === 'string' ? parsed.lang : undefined,
      pitch: parsed.pitch,
      rate: parsed.rate,
    };
  } catch (err) {
    console.warn('[voiceEngine] Failed to parse voice package:', err);
    return null;
  }
}
