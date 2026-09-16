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
  /** Speak AI replies automatically as they arrive. */
  autoSpeak: boolean;
  /** Output volume for all speech, 0-1. */
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
  /** Keep the mic open for another phrase after a result. */
  continuousListening: boolean;
  /** Send a dictated message automatically once speech ends. */
  autoSendOnSilence: boolean;
  /** How long to wait for silence before ending dictation, in ms. */
  silenceTimeout: number;
}

export const DEFAULT_VOICE_PREFS: VoicePrefs = {
  autoSpeak: false,
  volume: 1,
  defaultRate: 1,
  defaultPitch: 1,
  defaultVoiceName: '',
  skipMarkup: true,
  interruptOnType: true,
  continuousListening: false,
  autoSendOnSilence: false,
  silenceTimeout: 1500,
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
      autoSpeak: bool(p.autoSpeak, d.autoSpeak),
      volume: clamp(p.volume, 0, 1, d.volume),
      defaultRate: clamp(p.defaultRate, 0.5, 2, d.defaultRate),
      defaultPitch: clamp(p.defaultPitch, 0, 2, d.defaultPitch),
      defaultVoiceName: typeof p.defaultVoiceName === 'string' ? p.defaultVoiceName : d.defaultVoiceName,
      skipMarkup: bool(p.skipMarkup, d.skipMarkup),
      interruptOnType: bool(p.interruptOnType, d.interruptOnType),
      continuousListening: bool(p.continuousListening, d.continuousListening),
      autoSendOnSilence: bool(p.autoSendOnSilence, d.autoSendOnSilence),
      silenceTimeout: clamp(p.silenceTimeout, 500, 5000, d.silenceTimeout),
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
