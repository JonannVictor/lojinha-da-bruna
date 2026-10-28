import { describe, expect, it } from "vitest";
import { MemoryStorage } from "@/test/memory-storage";
import { adminProducts, storefrontProducts } from "./model";
import { DEMO_STORAGE_KEY } from "./storage";
import { createDemoStore } from "./store";

// The public demonstration must show the catalog to anyone who opens it,
// with nothing saved beforehand in their browser. Each MemoryStorage below
// is one browser.

const now = () => new Date("2026-10-28T12:00:00.000Z");

const VISIBLE = [
  "Paleta de sombras (exemplo)",
  "Colônia floral (exemplo)",
  "Hidratante corporal (exemplo)",
  "Necessaire de viagem (exemplo)",
  "Body splash (exemplo)",
  "Base líquida (exemplo)",
  "Shampoo nutritivo (exemplo)",
];

function storefrontNames(storage: MemoryStorage | null) {
  const store = createDemoStore({ getStorage: () => storage, now });
  return storefrontProducts(store.getSnapshot().state).map((p) => p.name);
}

describe("first visit to the demonstration", () => {
  it("a new browser sees the seven active example products, in order", () => {
    expect(storefrontNames(new MemoryStorage())).toEqual(VISIBLE);
  });

  it("the inactive example product exists only in the panel", () => {
    const store = createDemoStore({ getStorage: () => new MemoryStorage(), now });
    const panel = adminProducts(store.getSnapshot().state).map((p) => p.name);
    expect(panel).toHaveLength(8);
    expect(panel).toContain("Kit presente (exemplo)");
    expect(storefrontNames(new MemoryStorage())).not.toContain("Kit presente (exemplo)");
  });

  it("does not depend on other keys the browser already has (cart, other apps)", () => {
    const storage = new MemoryStorage();
    storage.setItem("lojinha-da-bruna:cart:v1", "[]");
    storage.setItem("outro-site", "x");
    expect(storefrontNames(storage)).toEqual(VISIBLE);
  });

  it("still shows the catalog when storage is blocked, missing or unreadable", () => {
    const blocked = new MemoryStorage();
    blocked.blocked = true;
    expect(storefrontNames(blocked)).toEqual(VISIBLE);
    expect(storefrontNames(null)).toEqual(VISIBLE);

    const corrupted = new MemoryStorage();
    corrupted.setItem(DEMO_STORAGE_KEY, "{não é json");
    expect(storefrontNames(corrupted)).toEqual(VISIBLE);
  });
});

describe("data shared by the store and the panel", () => {
  it("a change made in the panel shows in the store of the same browser only", async () => {
    const browser = new MemoryStorage();
    const panel = createDemoStore({ getStorage: () => browser, now });
    const target = panel.getSnapshot().state.products.find((p) => p.name.startsWith("Body splash"))!;
    expect((await panel.repository.setProductActive(target.id, false)).ok).toBe(true);

    // The store page opened afterwards in the same browser reads the change.
    expect(storefrontNames(browser)).not.toContain("Body splash (exemplo)");
    expect(storefrontNames(browser)).toHaveLength(6);

    // Anyone else (another browser or device) still gets the initial data.
    expect(storefrontNames(new MemoryStorage())).toEqual(VISIBLE);
  });
});
