import type { SupabaseClient } from "@supabase/supabase-js";
import { toDataSourceError } from "@/lib/supabase/errors";
import { toProductImages } from "./images";
import type { Category, Product } from "./types";

// Storefront queries against Supabase. They receive the client as an argument
// (the anonymous one in production code), so tests can pass a fake. Every
// query filters is_active explicitly, on top of the RLS policy that already
// hides inactive rows from anon.

export const PRODUCT_COLUMNS =
  "id, name, slug, description, brand, price_cents, stock_quantity, images, is_active, is_featured, created_at, updated_at, category:categories(slug, name)";

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  price_cents: number | null;
  stock_quantity: number | null;
  images: unknown;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  category: Category | Category[] | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

function integerOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export function mapProductRow(row: ProductRow, supabaseUrl: string): Product {
  // PostgREST returns a to-one embed as an object; accept an array defensively.
  const category = Array.isArray(row.category) ? (row.category[0] ?? null) : row.category;
  const price = integerOrNull(row.price_cents);
  const stock = integerOrNull(row.stock_quantity);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description?.trim() ? row.description : null,
    brand: row.brand?.trim() ? row.brand : null,
    // A non-positive price is treated as "to be confirmed": never sellable.
    price_cents: price !== null && price > 0 ? price : null,
    stock_quantity: stock !== null && stock < 0 ? 0 : stock,
    images: toProductImages(supabaseUrl, row.images, row.name),
    category: category ? { slug: category.slug, name: category.name } : null,
    is_active: row.is_active === true,
    is_featured: row.is_featured === true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchActiveProducts(
  client: SupabaseClient,
  supabaseUrl: string,
): Promise<Product[]> {
  const { data, error } = await client
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw toDataSourceError("listar produtos", error);
  return (data as unknown as ProductRow[]).map((row) => mapProductRow(row, supabaseUrl));
}

export async function fetchActiveProductBySlug(
  client: SupabaseClient,
  supabaseUrl: string,
  slug: string,
): Promise<Product | null> {
  if (!slug || slug.length > 140) return null;
  const { data, error } = await client
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw toDataSourceError("buscar produto", error);
  return data ? mapProductRow(data as unknown as ProductRow, supabaseUrl) : null;
}

/**
 * Current data for the given ids. Inactive or unknown products are simply
 * absent from the result; the cart shows them as no longer available.
 */
export async function fetchActiveProductsByIds(
  client: SupabaseClient,
  supabaseUrl: string,
  ids: string[],
): Promise<Product[]> {
  // Malformed ids would make Postgres reject the whole query.
  const valid = [...new Set(ids.filter(isUuid))];
  if (valid.length === 0) return [];
  const { data, error } = await client
    .from("products")
    .select(PRODUCT_COLUMNS)
    .in("id", valid)
    .eq("is_active", true);
  if (error) throw toDataSourceError("validar carrinho", error);
  return (data as unknown as ProductRow[]).map((row) => mapProductRow(row, supabaseUrl));
}

export async function fetchActiveCategories(client: SupabaseClient): Promise<Category[]> {
  const { data, error } = await client
    .from("categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("position")
    .order("name");
  if (error) throw toDataSourceError("listar categorias", error);
  return (data as Category[]).map(({ slug, name }) => ({ slug, name }));
}
