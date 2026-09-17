// src/lib/voicePrefs.ts
//
// App-level voice preferences, as opposed to the per-character voice
// settings already stored on each SavedCharacter (voiceEngine.ts's
// VoiceSettings: which voice, pitch, rate for that specific character).
//
// The distinction matters: a character's voice is part of who they are
// and travels with them (including through the voice-package export).
// These are the user's own defaults and playback behaviour - how loud,
// whether replies auto-speak, how the mic behaves - and apply across
// every character. Arthur flagged that Settings had character
// management but nothing for TTS itself, which is this gap.

export interface VoicePrefs {
  /** Output volume for all speech, 0-1. Multiplies on top of the
   *  emotion-driven volume nudge in speakExpressive(), rather than
   *  replacing it. */
  volume: number;
  /** Default rate for characters with no rate of their own, 0.5-2. */
  defaultRate: number;
  /** Default pitch for characters with no pitch of their own, 0-2. */
  defaultPitch: number;
  /** Preferred system voice name used when a character specifies none. */
  defaultVoiceName: string;
  /** Skip asterisk actions and similar markup when speaking. */
  skipMarkup: boolean;
  /** Stop speaking as soon as the user starts typing. */
  interruptOnType: boolean;
  /** Passed straight to SpeechRecognition.continuous. */
  continuousListening: boolean;
  /** Send a dictated message automatically once a final result arrives,
   *  instead of leaving it in the box for review. */
  autoSendOnSilence: boolean;
}

// A "silence wait" duration was cut from here deliberately, not
// forgotten: the Web Speech API has no standard property for how long
// to wait before treating silence as the end of an utterance (only
// continuous/interimResults/lang/maxAlternatives are real, spec'd
// fields) - when the browser decides an utterance is final is an
// internal engine heuristic, not something JS can configure. A slider
// claiming to control it would have been a fake setting - exactly the
// "looks wired, isn't" trap this session kept finding. See Known Issue
// #16 for the actual early-cutoff bug, which is a different, harder
// problem than exposing a timeout that doesn't exist.

export const DEFAULT_VOICE_PREFS: VoicePrefs = {
  volume: 1,
  defaultRate: 1,
  defaultPitch: 1,
  defaultVoiceName: '',
  skipMarkup: true,
  interruptOnType: true,
  // Matches the hardcoded `recognition.continuous = true` this replaces
  // in voiceEngine.ts - default here must match prior real behavior, or
  // saving Settings without touching this toggle would silently change
  // how dictation behaves for everyone.
  continuousListening: true,
  autoSendOnSilence: false,
};

const KEY = 'app_voice_prefs_v1';

function clamp(n: unknown, lo: number, hi: number, fallback: number): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/** Field-by-field validated, so a partial or hand-edited value can't
 *  produce unusable playback settings (e.g. rate 0, which never speaks). */
export function loadVoicePrefs(): VoicePrefs {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { ...DEFAULT_VOICE_PREFS };
  }
  if (!raw) return { ...DEFAULT_VOICE_PREFS };

  try {
    const p = JSON.parse(raw) as Partial<VoicePrefs>;
    const d = DEFAULT_VOICE_PREFS;
    return {
      volume: clamp(p.volume, 0, 1, d.volume),
      defaultRate: clamp(p.defaultRate, 0.5, 2, d.defaultRate),
      defaultPitch: clamp(p.defaultPitch, 0, 2, d.defaultPitch),
      defaultVoiceName: typeof p.defaultVoiceName === 'string' ? p.defaultVoiceName : d.defaultVoiceName,
      skipMarkup: bool(p.skipMarkup, d.skipMarkup),
      interruptOnType: bool(p.interruptOnType, d.interruptOnType),
      continuousListening: bool(p.continuousListening, d.continuousListening),
      autoSendOnSilence: bool(p.autoSendOnSilence, d.autoSendOnSilence),
    };
  } catch {
    return { ...DEFAULT_VOICE_PREFS };
  }
}

/** Throws on quota so SettingsModal's own try/catch surfaces it, the
 *  same as every other setting saved in that handler. */
export function saveVoicePrefs(prefs: VoicePrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}
