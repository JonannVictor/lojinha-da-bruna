import { parseDemoState, type DemoState } from "./model";
import { createSeedState } from "./seed";

// Reading and writing the demo state in localStorage. Browsers give each site
// roughly 5 million characters there (less in some private modes), shared by
// every key, and may refuse writes at any time. So: every access is guarded,
// the state is written in one piece (a failed write leaves the previous copy
// intact), and the size is checked against a budget below that limit before
// writing.

// v2: the initial catalog was renamed (no more "(exemplo)" products), so data
// saved under v1 is dropped instead of showing the old names.
export const DEMO_STORAGE_KEY = "lojinha-da-bruna:demo:v2";
/** Where unreadable data is kept, instead of being silently discarded. */
export const DEMO_BACKUP_KEY = `${DEMO_STORAGE_KEY}:corrompido`;
/** Earlier keys, removed on load to free their space (photos can be large). */
const LEGACY_KEYS = ["lojinha-da-bruna:demo:v1", "lojinha-da-bruna:demo:v1:corrompido"];
/** Characters (UTF-16 code units), leaving room for the cart and other keys. */
export const DEMO_STORAGE_BUDGET = 4_000_000;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * "corrupted": the saved data was unreadable and the initial data was loaded.
 * "unavailable": the browser blocks storage; changes last until the page closes.
 */
export type LoadIssue = "corrupted" | "unavailable" | null;

export type LoadResult = { state: DemoState; issue: LoadIssue; size: number };

export type SaveResult = { ok: true; size: number } | { ok: false; reason: "storage_full" | "storage_error" };

export function serialize(state: DemoState): string {
  return JSON.stringify(state);
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: number }).code;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    code === 22 ||
    code === 1014
  );
}

export function saveDemoState(storage: StorageLike, state: DemoState): SaveResult {
  const data = serialize(state);
  if (data.length > DEMO_STORAGE_BUDGET) return { ok: false, reason: "storage_full" };
  try {
    storage.setItem(DEMO_STORAGE_KEY, data);
    return { ok: true, size: data.length };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? "storage_full" : "storage_error" };
  }
}

export function loadDemoState(storage: StorageLike | null, now: Date = new Date()): LoadResult {
  const seed = () => createSeedState(now);
  if (!storage) {
    const state = seed();
    return { state, issue: "unavailable", size: serialize(state).length };
  }

  let raw: string | null;
  try {
    for (const key of LEGACY_KEYS) storage.removeItem(key);
    raw = storage.getItem(DEMO_STORAGE_KEY);
  } catch {
    const state = seed();
    return { state, issue: "unavailable", size: serialize(state).length };
  }

  if (raw !== null) {
    let parsed: DemoState | null = null;
    try {
      parsed = parseDemoState(JSON.parse(raw));
    } catch {
      parsed = null;
    }
    if (parsed) return { state: parsed, issue: null, size: raw.length };

    // Keep a copy of what couldn't be read, then start over from the seed.
    try {
      storage.setItem(DEMO_BACKUP_KEY, raw);
    } catch {
      // No room for the copy: the warning shown to the user still applies.
    }
    const state = seed();
    const saved = saveDemoState(storage, state);
    return { state, issue: "corrupted", size: saved.ok ? saved.size : serialize(state).length };
  }

  const state = seed();
  return { state, issue: null, size: serialize(state).length };
}

export function clearDemoState(storage: StorageLike): void {
  storage.removeItem(DEMO_STORAGE_KEY);
  storage.removeItem(DEMO_BACKUP_KEY);
}
