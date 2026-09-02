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

  if (settings?.voiceName) {
    const match = cachedVoices.find(v => v.name === settings.voiceName);
    if (match) {
      utterance.voice = match;
    } else {
      console.warn(`[voiceEngine] Voice "${settings.voiceName}" not available on this device — using browser default`);
    }
  }

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

      if (settings?.voiceName) {
        const match = cachedVoices.find(v => v.name === settings.voiceName);
        if (match) utterance.voice = match;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // don't hang the queue on a playback error

      window.speechSynthesis.speak(utterance);
    });
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
