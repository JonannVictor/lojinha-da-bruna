"use server";

import { getProductsByIds } from "@/lib/products/repository";
import type { Product } from "@/lib/products/types";

const MAX_CART_LINES = 50;

/**
 * Returns the current catalog data for the products in the browser cart, so
 * prices and availability always come from the server, never from storage.
 */
export async function getCartProducts(ids: unknown): Promise<Product[]> {
  if (!Array.isArray(ids)) return [];
  const valid = ids
    .filter((id): id is string => typeof id === "string" && id.length <= 100)
    .slice(0, MAX_CART_LINES);
  return getProductsByIds(valid);
}
