import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { readSupabaseConfig } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/public-client";
import { initialCategories } from "./categories";
import { demoProducts } from "./demo-data";
import { filterProducts } from "./search";
import {
  fetchActiveCategories,
  fetchActiveProductBySlug,
  fetchActiveProducts,
  fetchActiveProductsByIds,
} from "./supabase-source";
import type { Category, Product, ProductFilters } from "./types";

// Single entry point for catalog data. Pages and components only call the
// functions below and don't know where the data comes from.
//
// Supabase errors are thrown (DataSourceError), never turned into an empty
// list: the page shows the error boundary instead of a misleading "no
// products" message.

export type CatalogSource = "empty" | "demo" | "supabase";

export function getCatalogSource(): CatalogSource {
  const requested = process.env.CATALOG_SOURCE;
  // Fictitious products must never reach the production store.
  if (requested === "demo" && process.env.VERCEL_ENV !== "production") return "demo";
  if (requested === "empty") return "empty";
  return readSupabaseConfig() ? "supabase" : "empty";
}

function supabaseUrl(): string {
  // getCatalogSource() returned "supabase", so the config exists.
  return readSupabaseConfig()!.url;
}

async function activeProducts(): Promise<Product[]> {
  switch (getCatalogSource()) {
    case "demo":
      return demoProducts.filter((p) => p.is_active);
    case "supabase":
      return fetchActiveProducts(createPublicClient(), supabaseUrl());
    case "empty":
      return [];
  }
}

export async function listProducts(filters?: ProductFilters): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  return filterProducts(await activeProducts(), filters);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  if (getCatalogSource() === "supabase") {
    return fetchActiveProductBySlug(createPublicClient(), supabaseUrl(), slug);
  }
  return (await activeProducts()).find((p) => p.slug === slug) ?? null;
}

/** Fresh read (no cache): used to validate cart contents against the source. */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (getCatalogSource() === "supabase") {
    return fetchActiveProductsByIds(createPublicClient(), supabaseUrl(), ids);
  }
  const wanted = new Set(ids);
  return getCatalogSource() === "demo" ? demoProducts.filter((p) => wanted.has(p.id)) : [];
}

export async function listCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  if (getCatalogSource() === "supabase") {
    return fetchActiveCategories(createPublicClient());
  }
  return initialCategories;
}
