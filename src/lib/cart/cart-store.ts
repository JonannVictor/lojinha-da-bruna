"use client";

import { useSyncExternalStore } from "react";
import {
  addItem,
  parseCart,
  removeItem,
  setQuantity,
  type CartLine,
} from "./cart";

// Browser-persisted cart (localStorage), shared across components through
// useSyncExternalStore. The server snapshot is always empty, so the first
// render matches the server HTML and the stored cart appears after hydration.

const STORAGE_KEY = "lojinha-da-bruna:cart:v1";
const EMPTY: CartLine[] = [];

let snapshot: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (snapshot === null) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      snapshot = raw ? parseCart(JSON.parse(raw)) : EMPTY;
    } catch {
      snapshot = EMPTY;
    }
  }
  return snapshot;
}

function write(lines: CartLine[]) {
  snapshot = lines;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Storage full or blocked (private mode): keep the in-memory cart.
  }
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  snapshot = null; // another tab changed the cart
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function useCartLines(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const cart = {
  lines: read,
  add(productId: string, quantity: number, maxQuantity: number) {
    write(addItem(read(), productId, quantity, maxQuantity));
  },
  setQuantity(productId: string, quantity: number, maxQuantity: number) {
    write(setQuantity(read(), productId, quantity, maxQuantity));
  },
  remove(productId: string) {
    write(removeItem(read(), productId));
  },
  /** Empties the cart after the order is saved. */
  clear() {
    write(EMPTY);
  },
};
