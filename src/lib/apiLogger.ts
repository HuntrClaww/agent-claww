// API Performance & Error Logging
//
// A local-only, per-browser-profile log of every AI provider request
// the app makes: latency, success/failure, rough size, and provider.
// Lives entirely in IndexedDB on the user's own device - nothing here
// is ever sent anywhere. Purpose: let the user (or a Claude session
// helping debug) answer "which provider is slow", "where are errors
// happening", and "am I about to hit a rate limit" without digging
// through devtools network tab by hand.
//
// Deliberately NOT a billing/credits tracker - providers don't expose
// real account balance to client-side calls (see sessionBudget.ts for
// the token-estimate heuristic this reuses). This is call-level
// telemetry only: did it succeed, how long did it take, what broke.
//
// Multi-user note: this is one IndexedDB per browser profile, so it's
// already naturally scoped per-device. If StageEgo ever gets real
// multi-user accounts (Supabase auth is partially wired - see
// characterStore.ts), this store should stay local-only and NOT sync
// to a shared backend table without a deliberate opt-in, since raw
// request logs can be more revealing than the user expects.

import { estimateTokens } from './sessionBudget';

const DB_NAME = 'stageego_api_logs';
const DB_VERSION = 1;
const STORE_NAME = 'requests';
const RETENTION_DAYS = 7;

export type LogProvider = 'anthropic' | 'openai' | 'gemini';
export type LogStatus = 'success' | 'error' | 'cancelled';

export interface APILogEntry {
  id: string;
  timestamp: number;
  provider: LogProvider;
  model?: string;
  streaming: boolean;
  status: LogStatus;
  latencyMs: number;
  promptTokensEst: number;
  responseTokensEst: number;
  httpStatus?: number;
  errorMessage?: string;
}

export interface LogStats {
  totalCalls: number;
  successCount: number;
  errorCount: number;
  cancelledCount: number;
  avgLatencyMs: number;
  byProvider: Record<string, { calls: number; errors: number; avgLatencyMs: number }>;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openLogDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/**
 * Records one completed API call. Fire-and-forget by design - logging
 * must never be able to break or delay the actual chat flow, so every
 * failure here is swallowed silently (falling back to console.warn
 * only, matching the [characterFetch]-style visible-but-non-blocking
 * pattern already used elsewhere in this codebase).
 */
export async function recordAPICall(entry: Omit<APILogEntry, 'id'>): Promise<void> {
  try {
    const db = await openLogDB();
    const full: APILogEntry = {
      ...entry,
      id: `${entry.timestamp}-${Math.random().toString(36).slice(2, 9)}`,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).add(full);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    // Best-effort prune, not awaited by the caller - keeps writes fast.
    pruneOldLogs().catch(() => {});
  } catch (err) {
    console.warn('[apiLogger] failed to record call', err);
  }
}

/** Helper for the common case: time a call and record it in one go. */
export function startTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

/** Rough token estimate for a prompt string, reusing the existing ~4 chars/token heuristic. */
export function estimatePromptTokens(userMessage: string, extraContext?: string, historyChars = 0): number {
  return estimateTokens(userMessage) + estimateTokens(extraContext ?? '') + estimateTokens('x'.repeat(historyChars));
}

async function pruneOldLogs(): Promise<void> {
  const db = await openLogDB();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const index = tx.objectStore(STORE_NAME).index('timestamp');
    const range = IDBKeyRange.upperBound(cutoff);
    index.openCursor(range).onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Returns the most recent N log entries, newest first. */
export async function getRecentLogs(limit = 100): Promise<APILogEntry[]> {
  try {
    const db = await openLogDB();
    return await new Promise<APILogEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index('timestamp');
      const results: APILogEntry[] = [];
      index.openCursor(null, 'prev').onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value as APILogEntry);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[apiLogger] failed to read logs', err);
    return [];
  }
}

/** Aggregate stats across whatever's currently retained (up to RETENTION_DAYS old). */
export async function getLogStats(): Promise<LogStats> {
  const logs = await getRecentLogs(10_000);
  const stats: LogStats = {
    totalCalls: logs.length,
    successCount: 0,
    errorCount: 0,
    cancelledCount: 0,
    avgLatencyMs: 0,
    byProvider: {},
  };
  let latencySum = 0;
  for (const log of logs) {
    if (log.status === 'success') stats.successCount++;
    else if (log.status === 'error') stats.errorCount++;
    else stats.cancelledCount++;
    latencySum += log.latencyMs;

    const p = (stats.byProvider[log.provider] ??= { calls: 0, errors: 0, avgLatencyMs: 0 });
    p.calls++;
    if (log.status === 'error') p.errors++;
    p.avgLatencyMs += log.latencyMs;
  }
  stats.avgLatencyMs = logs.length ? Math.round(latencySum / logs.length) : 0;
  for (const p of Object.values(stats.byProvider)) {
    p.avgLatencyMs = p.calls ? Math.round(p.avgLatencyMs / p.calls) : 0;
  }
  return stats;
}

export async function clearAllLogs(): Promise<void> {
  const db = await openLogDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function exportLogsAsJSON(): Promise<string> {
  const logs = await getRecentLogs(10_000);
  return JSON.stringify(logs, null, 2);
}
