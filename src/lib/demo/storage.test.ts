import { describe, expect, it } from "vitest";
import { MemoryStorage } from "@/test/memory-storage";
import { createSeedState } from "./seed";
import {
  DEMO_BACKUP_KEY,
  DEMO_STORAGE_BUDGET,
  DEMO_STORAGE_KEY,
  loadDemoState,
  saveDemoState,
} from "./storage";

const now = new Date("2026-10-28T10:00:00.000Z");

describe("loadDemoState", () => {
  it("starts from the seed when nothing is stored", () => {
    const result = loadDemoState(new MemoryStorage(), now);
    expect(result.issue).toBeNull();
    expect(result.state).toEqual(createSeedState(now));
  });

  it("reads back what was saved", () => {
    const storage = new MemoryStorage();
    const state = createSeedState(now);
    state.products[0].name = "Alterado";
    expect(saveDemoState(storage, state).ok).toBe(true);
    const result = loadDemoState(storage, new Date());
    expect(result.issue).toBeNull();
    expect(result.state.products[0].name).toBe("Alterado");
  });

  it("recovers from invalid JSON, keeping a copy of the bad data", () => {
    const storage = new MemoryStorage();
    storage.setItem(DEMO_STORAGE_KEY, "{not json");
    const result = loadDemoState(storage, now);
    expect(result.issue).toBe("corrupted");
    expect(result.state).toEqual(createSeedState(now));
    expect(storage.getItem(DEMO_BACKUP_KEY)).toBe("{not json");
    // The seed replaces the bad data, so the next load is clean.
    expect(loadDemoState(storage, now).issue).toBeNull();
  });

  it("recovers from valid JSON with the wrong shape", () => {
    const storage = new MemoryStorage();
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: 1, products: 3 }));
    expect(loadDemoState(storage, now).issue).toBe("corrupted");
  });

  it("works in memory when storage is blocked or missing", () => {
    const storage = new MemoryStorage();
    storage.blocked = true;
    expect(loadDemoState(storage, now).issue).toBe("unavailable");
    expect(loadDemoState(null, now).issue).toBe("unavailable");
  });
});

describe("saveDemoState", () => {
  it("reports a full storage instead of throwing", () => {
    const storage = new MemoryStorage();
    storage.quota = 100;
    expect(saveDemoState(storage, createSeedState(now))).toEqual({ ok: false, reason: "storage_full" });
    expect(storage.getItem(DEMO_STORAGE_KEY)).toBeNull();
  });

  it("refuses data above the budget before touching storage", () => {
    const storage = new MemoryStorage();
    const state = createSeedState(now);
    state.products[0].description = "x".repeat(DEMO_STORAGE_BUDGET);
    expect(saveDemoState(storage, state)).toEqual({ ok: false, reason: "storage_full" });
  });

  it("reports other storage errors", () => {
    const storage = new MemoryStorage();
    storage.blocked = true;
    expect(saveDemoState(storage, createSeedState(now))).toEqual({ ok: false, reason: "storage_error" });
  });
});
