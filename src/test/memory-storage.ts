import type { StorageLike } from "@/lib/demo/storage";

/** localStorage stand-in for tests, with an optional quota and failure modes. */
export class MemoryStorage implements StorageLike {
  readonly data = new Map<string, string>();
  /** Max characters per value; above it setItem throws QuotaExceededError. */
  quota = Infinity;
  /** Simulates a browser that blocks site data. */
  blocked = false;

  getItem(key: string): string | null {
    if (this.blocked) throw new DOMException("blocked", "SecurityError");
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.blocked) throw new DOMException("blocked", "SecurityError");
    if (value.length > this.quota) throw new DOMException("full", "QuotaExceededError");
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    if (this.blocked) throw new DOMException("blocked", "SecurityError");
    this.data.delete(key);
  }
}
