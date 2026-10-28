import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { initialCategories } from "./categories";
import { demoProducts } from "./demo-data";
import { filterProducts } from "./search";
import type { Category, Product, ProductFilters } from "./types";

// Single entry point for catalog data. Pages and components only call the
// functions below, so swapping the source for Supabase later changes this
// file and nothing in the UI.

export type CatalogSource = "empty" | "demo";

export function getCatalogSource(): CatalogSource {
  if (process.env.CATALOG_SOURCE !== "demo") return "empty";
  // Fictitious products must never reach the production store.
  if (process.env.VERCEL_ENV === "production") return "empty";
  return "demo";
}

function allProducts(): Product[] {
  return getCatalogSource() === "demo" ? demoProducts : [];
}

export async function listProducts(filters?: ProductFilters): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  return filterProducts(allProducts(), filters);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  return allProducts().find((p) => p.slug === slug && p.is_active) ?? null;
}

/** Fresh read (no cache): used to validate cart contents against the source. */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const wanted = new Set(ids);
  return allProducts().filter((p) => wanted.has(p.id));
}

export async function listCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  return initialCategories;
}
