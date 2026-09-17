/**
 * voiceStorage.ts
 *
 * Local persistence for Voice Lab profiles - a recorded/uploaded clip
 * plus the FX chain applied to it, associated with a character.
 *
 * WHY INDEXEDDB, NOT localStorage: localStorage is already the size
 * bottleneck behind the character-portrait quota issues (Known Issue
 * #21's fix, and SettingsModal's #21/#22-era quota guard) - it's a
 * synchronous, string-only store with a small (typically ~5-10MB)
 * total budget. A single voice clip's raw PCM easily runs to several
 * hundred KB to a few MB. IndexedDB is the browser's actual
 * general-purpose storage for exactly this: async, structured-clone
 * (stores a Float32Array directly, no base64 string bloat), and a
 * quota that scales with available disk rather than a fixed small cap.
 *
 * WHAT THIS IS HONESTLY, AND ISN'T: this is storage on THIS device, in
 * THIS browser. It is not "public cloud storage synced to every device
 * the user owns" - StageEgo has no connected backend/storage bucket
 * right now (Supabase exists as an unused client wrapper, per Known
 * Issue #20; this session couldn't even confirm whether a Supabase
 * project exists for this app, since that check needs the user's own
 * connector approval, not something this session could grant itself).
 * Wiring real cross-device cloud sync is a genuine, separate
 * infrastructure decision - it needs a storage bucket, an auth flow
 * users actually go through, and someone deciding who pays for it. So
 * profiles saved here also export as a single downloadable file (WAV +
 * a settings JSON side-car, bundled as one .json with the audio
 * base64-embedded) - a real, working way to move a voice to another
 * device by hand today, without pretending that's the same thing as
 * automatic sync.
 */

import type { VoiceFXParams } from './voiceFX';

export interface VoiceProfile {
  id: string;
  characterId: string | null; // null = not tied to a specific character
  name: string;
  sampleRate: number;
  pcm: Float32Array;
  fxParams: VoiceFXParams;
  createdAt: number;
}

/** What actually gets written to disk in an export file - PCM as base64
 *  instead of a raw Float32Array, since JSON can't hold binary directly. */
interface VoiceProfileFile {
  formatVersion: 1;
  name: string;
  sampleRate: number;
  pcmBase64: string;
  fxParams: VoiceFXParams;
  createdAt: number;
}

const DB_NAME = 'stageego_voice_lab';
const DB_VERSION = 1;
const STORE = 'profiles';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available in this browser'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('characterId', 'characterId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open voice profile database'));
  });
}

export async function saveVoiceProfile(profile: VoiceProfile): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(profile);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save voice profile'));
    // A quota rejection surfaces here as tx.onerror/onabort depending on
    // the browser - both paths reject, so the caller's try/catch (Voice
    // Lab's save handler) always sees it rather than a silent no-op.
    tx.onabort = () => reject(tx.error ?? new Error('Voice profile save was aborted (likely storage full)'));
  });
  db.close();
}

export async function listVoiceProfiles(characterId?: string | null): Promise<VoiceProfile[]> {
  const db = await openDb();
  const results = await new Promise<VoiceProfile[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    // IndexedDB indexes cannot contain null/undefined keys - a record
    // saved with characterId: null is silently excluded from the
    // 'characterId' index (not an error, just absent from it), so
    // querying the index for null always returns empty even when a
    // matching record genuinely exists in the store. Found by testing
    // an actual save -> close -> reopen cycle in a real browser, not
    // visible from code review: the write succeeded and the record was
    // directly confirmed in the object store, but the index-based read
    // right after came back empty. Falling back to a full scan +
    // in-memory filter whenever characterId isn't a real, truthy id
    // sidesteps this entirely; the index is still used for the common
    // case of a specific character's own profiles, worth the leaner
    // query there.
    if (characterId) {
      const req = store.index('characterId').getAll(characterId);
      req.onsuccess = () => resolve(req.result as VoiceProfile[]);
      req.onerror = () => reject(req.error ?? new Error('Failed to list voice profiles'));
    } else {
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result as VoiceProfile[];
        resolve(characterId === undefined ? all : all.filter(p => p.characterId === characterId));
      };
      req.onerror = () => reject(req.error ?? new Error('Failed to list voice profiles'));
    }
  });
  db.close();
  return results.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteVoiceProfile(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to delete voice profile'));
  });
  db.close();
}

/** Rough estimate of space used vs available, for an honest "storage is
 *  getting full" indicator rather than a silent failure once it hits
 *  the limit. Not all browsers implement this - returns null when not. */
export async function estimateStorage(): Promise<{ usedMB: number; quotaMB: number } | null> {
  if (!('storage' in navigator) || !navigator.storage.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (usage === undefined || quota === undefined) return null;
    return { usedMB: usage / (1024 * 1024), quotaMB: quota / (1024 * 1024) };
  } catch {
    return null;
  }
}

function bufferToBase64(buf: Float32Array): string {
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  let binary = '';
  const chunkSize = 0x8000; // avoid call-stack blowups from one giant apply()
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): Float32Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

/** Bundles a profile into one downloadable .json file (audio embedded as
 *  base64) - the honest stand-in for cloud sync: a real file the user can
 *  move to another device by hand, AirDrop, email, a shared drive, etc. */
export function exportVoiceProfile(profile: VoiceProfile): Blob {
  const file: VoiceProfileFile = {
    formatVersion: 1,
    name: profile.name,
    sampleRate: profile.sampleRate,
    pcmBase64: bufferToBase64(profile.pcm),
    fxParams: profile.fxParams,
    createdAt: profile.createdAt,
  };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

export function parseVoiceProfileFile(jsonText: string): Omit<VoiceProfile, 'id' | 'characterId'> | null {
  try {
    const parsed = JSON.parse(jsonText) as Partial<VoiceProfileFile>;
    if (typeof parsed.pcmBase64 !== 'string' || typeof parsed.sampleRate !== 'number' || !parsed.fxParams) {
      return null;
    }
    return {
      name: typeof parsed.name === 'string' ? parsed.name : 'Imported voice',
      sampleRate: parsed.sampleRate,
      pcm: base64ToBuffer(parsed.pcmBase64),
      fxParams: parsed.fxParams,
      createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
    };
  } catch {
    return null;
  }
}
