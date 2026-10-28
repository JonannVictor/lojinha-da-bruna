"use client";

import { useSyncExternalStore } from "react";
import type { MutationResult } from "@/lib/admin/catalog";
import type { CategoryInput, ProductInput } from "@/lib/admin/validation";
import * as model from "./model";
import type { Change, ChangeContext, DemoState, OrderStatus } from "./model";
import { createSeedState } from "./seed";
import {
  clearDemoState,
  DEMO_STORAGE_KEY,
  loadDemoState,
  saveDemoState,
  serialize,
  type LoadIssue,
  type StorageLike,
} from "./storage";

// Single access point to the demo catalog in the browser. The storefront and
// the panel read the same snapshot (useDemoSnapshot) and every change goes
// through `repository`, so both always show the same data, also across tabs
// (storage event). The server snapshot is null: pages render a skeleton on
// the server and on the first client render, then the stored data, which
// avoids hydration mismatches and never touches localStorage on the server.
//
// CatalogRepository is asynchronous on purpose: an implementation backed by
// Supabase (Server Actions) can replace the local one without changing the
// components that call it.

export type StorageFailure = { ok: false; reason: "storage_full" | "storage_error" };
export type RepositoryResult<T = void> = MutationResult<T> | StorageFailure;

export interface CatalogRepository {
  createProduct(input: ProductInput): Promise<RepositoryResult<{ id: string }>>;
  updateProduct(id: string, input: ProductInput): Promise<RepositoryResult>;
  setProductActive(id: string, isActive: boolean): Promise<RepositoryResult>;
  deleteProduct(id: string): Promise<RepositoryResult>;
  addProductImage(productId: string, image: { url: string; alt: string }): Promise<RepositoryResult>;
  removeProductImage(productId: string, imageId: string): Promise<RepositoryResult>;
  setMainProductImage(productId: string, imageId: string): Promise<RepositoryResult>;
  createCategory(input: CategoryInput): Promise<RepositoryResult>;
  updateCategory(id: string, input: CategoryInput): Promise<RepositoryResult>;
  setCategoryActive(id: string, isActive: boolean): Promise<RepositoryResult>;
  moveCategory(id: string, direction: "up" | "down"): Promise<RepositoryResult>;
  deleteCategory(id: string): Promise<RepositoryResult>;
  setOrderStatus(id: string, status: OrderStatus): Promise<RepositoryResult>;
  /** Discards every change and restores the initial demo data. */
  reset(): Promise<RepositoryResult>;
}

export type DemoSnapshot = {
  state: DemoState;
  issue: LoadIssue;
  /** false when the browser blocks localStorage: changes live in memory. */
  persistent: boolean;
  /** Characters used in localStorage by the demo data. */
  size: number;
};

/** RFC 4122 v4. crypto.randomUUID only exists on HTTPS/localhost. */
export function randomUuid(): string {
  const c = globalThis.crypto;
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = c.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type StoreOptions = {
  getStorage: () => StorageLike | null;
  now?: () => Date;
  newId?: () => string;
};

export function createDemoStore({ getStorage, now = () => new Date(), newId = randomUuid }: StoreOptions) {
  let snapshot: DemoSnapshot | null = null;
  let storage: StorageLike | null = null;
  const listeners = new Set<() => void>();

  function getSnapshot(): DemoSnapshot {
    if (snapshot === null) {
      storage = getStorage();
      const loaded = loadDemoState(storage, now());
      snapshot = { ...loaded, persistent: loaded.issue !== "unavailable" };
    }
    return snapshot;
  }

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function onStorage(event: StorageEvent) {
    // Another tab changed (or cleared) the demo data: read it again.
    if (event.key !== DEMO_STORAGE_KEY && event.key !== null) return;
    snapshot = null;
    emit();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1 && typeof window !== "undefined") window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    };
  }

  function commit(state: DemoState, issue: LoadIssue): StorageFailure | null {
    const current = getSnapshot();
    let size = serialize(state).length;
    if (current.persistent && storage) {
      // Written before updating the screen: if the browser refuses, nothing changes.
      const saved = saveDemoState(storage, state);
      if (!saved.ok) return { ok: false, reason: saved.reason };
      size = saved.size;
    }
    snapshot = { ...current, state, issue, size };
    emit();
    return null;
  }

  function apply<T>(run: (state: DemoState, ctx: ChangeContext) => Change<T>): Promise<RepositoryResult<T>> {
    const current = getSnapshot();
    const change = run(current.state, { now: now().toISOString(), newId });
    if (!change.ok) return Promise.resolve(change);
    const failure = change.state === current.state ? null : commit(change.state, current.issue);
    return Promise.resolve(failure ?? { ok: true, value: change.value });
  }

  const repository: CatalogRepository = {
    createProduct: (input) => apply((s, ctx) => model.createProduct(s, input, ctx)),
    updateProduct: (id, input) => apply((s, ctx) => model.updateProduct(s, id, input, ctx)),
    setProductActive: (id, isActive) => apply((s, ctx) => model.setProductActive(s, id, isActive, ctx)),
    deleteProduct: (id) => apply((s, ctx) => model.deleteProduct(s, id, ctx)),
    addProductImage: (productId, image) => apply((s, ctx) => model.addProductImage(s, productId, image, ctx)),
    removeProductImage: (productId, imageId) => apply((s, ctx) => model.removeProductImage(s, productId, imageId, ctx)),
    setMainProductImage: (productId, imageId) =>
      apply((s, ctx) => model.setMainProductImage(s, productId, imageId, ctx)),
    createCategory: (input) => apply((s, ctx) => model.createCategory(s, input, ctx)),
    updateCategory: (id, input) => apply((s, ctx) => model.updateCategory(s, id, input, ctx)),
    setCategoryActive: (id, isActive) => apply((s, ctx) => model.setCategoryActive(s, id, isActive, ctx)),
    moveCategory: (id, direction) => apply((s, ctx) => model.moveCategory(s, id, direction, ctx)),
    deleteCategory: (id) => apply((s, ctx) => model.deleteCategory(s, id, ctx)),
    setOrderStatus: (id, status) => apply((s, ctx) => model.setOrderStatus(s, id, status, ctx)),
    async reset() {
      getSnapshot();
      if (storage) {
        try {
          clearDemoState(storage);
        } catch {
          // Blocked storage: the in-memory reset below still applies.
        }
      }
      return commit(createSeedState(now()), null) ?? { ok: true, value: undefined };
    },
  };

  return { getSnapshot, subscribe, repository };
}

function browserStorage(): StorageLike | null {
  try {
    // Throws when the browser blocks site data (some private modes).
    return window.localStorage;
  } catch {
    return null;
  }
}

const demoStore = createDemoStore({ getStorage: browserStorage });

export const demoRepository: CatalogRepository = demoStore.repository;

/** null on the server and during hydration: render a loading state. */
export function useDemoSnapshot(): DemoSnapshot | null {
  return useSyncExternalStore(demoStore.subscribe, demoStore.getSnapshot, () => null);
}
