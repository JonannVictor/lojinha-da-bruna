import type { SupabaseClient } from "@supabase/supabase-js";
import { parseStoredImages, type StoredImage } from "@/lib/products/images";
import { normalizeText } from "@/lib/products/search";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/supabase/config";
import {
  isCheckViolation,
  isForeignKeyViolation,
  isUniqueViolation,
  logSupabaseError,
  toDataSourceError,
} from "@/lib/supabase/errors";
import type { CategoryInput, ProductInput } from "./validation";

// Admin catalog operations. They receive the session-bound client returned by
// requireAdmin(), so every statement runs as the signed-in admin and RLS has
// the final word. Expected failures (slug in use, product with orders...)
// come back as typed results; unexpected ones are logged and thrown.

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  position: number;
  product_count: number;
};

export type AdminProduct = ProductInput & {
  id: string;
  images: StoredImage[];
  category_name: string | null;
  created_at: string;
  updated_at: string;
};

export type MutationResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; reason: "slug_taken" | "not_found" | "has_orders" | "has_products" | "invalid" };

const ADMIN_PRODUCT_COLUMNS =
  "id, name, slug, description, brand, category_id, price_cents, stock_quantity, images, is_active, is_featured, created_at, updated_at, category:categories(name)";

type AdminProductRow = Omit<AdminProduct, "images" | "category_name"> & {
  images: unknown;
  category: { name: string } | { name: string }[] | null;
};

function mapAdminProduct(row: AdminProductRow): AdminProduct {
  const category = Array.isArray(row.category) ? row.category[0] : row.category;
  const { category: _omit, ...rest } = row;
  void _omit;
  return { ...rest, images: parseStoredImages(row.images), category_name: category?.name ?? null };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export type ProductStatusFilter = "all" | "active" | "inactive";

export async function listAdminProducts(
  client: SupabaseClient,
  { query = "", status = "all" }: { query?: string; status?: ProductStatusFilter } = {},
): Promise<AdminProduct[]> {
  let request = client.from("products").select(ADMIN_PRODUCT_COLUMNS).order("updated_at", { ascending: false });
  if (status !== "all") request = request.eq("is_active", status === "active");
  const { data, error } = await request;
  if (error) throw toDataSourceError("listar produtos (painel)", error);

  const products = (data as unknown as AdminProductRow[]).map(mapAdminProduct);
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return products;
  // Accent-insensitive search, same rules as the storefront search.
  return products.filter((product) => {
    const haystack = normalizeText(
      [product.name, product.brand, product.slug, product.category_name].filter(Boolean).join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });
}

export async function getAdminProduct(client: SupabaseClient, id: string): Promise<AdminProduct | null> {
  const { data, error } = await client.from("products").select(ADMIN_PRODUCT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toDataSourceError("buscar produto (painel)", error);
  return data ? mapAdminProduct(data as unknown as AdminProductRow) : null;
}

function writeFailure(context: string, error: { code?: string; message?: string }): MutationResult<never> {
  if (isUniqueViolation(error)) return { ok: false, reason: "slug_taken" };
  if (isForeignKeyViolation(error)) return { ok: false, reason: "invalid" };
  if (isCheckViolation(error)) return { ok: false, reason: "invalid" };
  throw toDataSourceError(context, error);
}

export async function createProduct(
  client: SupabaseClient,
  input: ProductInput,
): Promise<MutationResult<{ id: string }>> {
  const { data, error } = await client.from("products").insert(input).select("id").single();
  if (error) return writeFailure("criar produto", error);
  return { ok: true, value: { id: (data as { id: string }).id } };
}

export async function updateProduct(
  client: SupabaseClient,
  id: string,
  input: ProductInput,
): Promise<MutationResult> {
  const { data, error } = await client.from("products").update(input).eq("id", id).select("id");
  if (error) return writeFailure("editar produto", error);
  // RLS hides rows the user can't change: 0 rows means "not found" for them.
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };
  return { ok: true, value: undefined };
}

export async function setProductActive(
  client: SupabaseClient,
  id: string,
  isActive: boolean,
): Promise<MutationResult> {
  const { data, error } = await client.from("products").update({ is_active: isActive }).eq("id", id).select("id");
  if (error) throw toDataSourceError("alterar status do produto", error);
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };
  return { ok: true, value: undefined };
}

/**
 * Deletes a product that has never been ordered. With order history the
 * database refuses (FK restrict) and the caller should deactivate it instead.
 */
export async function deleteProduct(client: SupabaseClient, id: string): Promise<MutationResult> {
  const { data, error } = await client.from("products").delete().eq("id", id).select("id, images");
  if (error) {
    if (isForeignKeyViolation(error)) return { ok: false, reason: "has_orders" };
    throw toDataSourceError("excluir produto", error);
  }
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };

  // The row is gone, so no page references these files anymore. A failure
  // here leaves orphan files, never broken images.
  const paths = parseStoredImages((data[0] as { images: unknown }).images).map((image) => image.path);
  if (paths.length > 0) {
    const { error: storageError } = await client.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
    if (storageError) logSupabaseError("remover fotos do produto excluído", storageError);
  }
  return { ok: true, value: undefined };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listAdminCategories(client: SupabaseClient): Promise<AdminCategory[]> {
  const { data, error } = await client
    .from("categories")
    .select("id, name, slug, is_active, position, products(count)")
    .order("position")
    .order("name");
  if (error) throw toDataSourceError("listar categorias (painel)", error);

  type Row = Omit<AdminCategory, "product_count"> & { products: { count: number }[] | null };
  return (data as unknown as Row[]).map(({ products, ...category }) => ({
    ...category,
    product_count: products?.[0]?.count ?? 0,
  }));
}

export async function createCategory(
  client: SupabaseClient,
  input: CategoryInput,
): Promise<MutationResult> {
  // New categories go to the end of the list.
  const { data: last, error: lastError } = await client
    .from("categories")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw toDataSourceError("criar categoria", lastError);
  const position = Math.min(((last as { position: number } | null)?.position ?? 0) + 10, 10000);

  const { error } = await client.from("categories").insert({ ...input, position });
  if (error) return writeFailure("criar categoria", error);
  return { ok: true, value: undefined };
}

export async function updateCategory(
  client: SupabaseClient,
  id: string,
  input: CategoryInput,
): Promise<MutationResult> {
  const { data, error } = await client.from("categories").update(input).eq("id", id).select("id");
  if (error) return writeFailure("editar categoria", error);
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };
  return { ok: true, value: undefined };
}

export async function setCategoryActive(
  client: SupabaseClient,
  id: string,
  isActive: boolean,
): Promise<MutationResult> {
  const { data, error } = await client.from("categories").update({ is_active: isActive }).eq("id", id).select("id");
  if (error) throw toDataSourceError("alterar status da categoria", error);
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };
  return { ok: true, value: undefined };
}

/** Swaps the position of a category with its neighbour (up or down). */
export async function moveCategory(
  client: SupabaseClient,
  id: string,
  direction: "up" | "down",
): Promise<MutationResult> {
  const categories = await listAdminCategories(client);
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return { ok: false, reason: "not_found" };
  const neighbour = categories[direction === "up" ? index - 1 : index + 1];
  if (!neighbour) return { ok: true, value: undefined };

  // Renumber everything in steps of 10, so equal positions can't stall a move.
  const reordered = [...categories];
  reordered[index] = neighbour;
  reordered[direction === "up" ? index - 1 : index + 1] = categories[index];
  for (const [i, category] of reordered.entries()) {
    const position = (i + 1) * 10;
    if (category.position === position) continue;
    const { error } = await client.from("categories").update({ position }).eq("id", category.id);
    if (error) throw toDataSourceError("reordenar categorias", error);
  }
  return { ok: true, value: undefined };
}

export async function deleteCategory(client: SupabaseClient, id: string): Promise<MutationResult> {
  const { data, error } = await client.from("categories").delete().eq("id", id).select("id");
  if (error) {
    if (isForeignKeyViolation(error)) return { ok: false, reason: "has_products" };
    throw toDataSourceError("excluir categoria", error);
  }
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };
  return { ok: true, value: undefined };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export type CatalogOverview = {
  products: number;
  active: number;
  pricePending: number;
  withoutPhotos: number;
  outOfStock: number;
  categories: number;
};

export async function getCatalogOverview(client: SupabaseClient): Promise<CatalogOverview> {
  const [products, categories] = await Promise.all([
    client.from("products").select("is_active, price_cents, stock_quantity, images"),
    client.from("categories").select("id", { count: "exact", head: true }),
  ]);
  if (products.error) throw toDataSourceError("resumo do catálogo", products.error);
  if (categories.error) throw toDataSourceError("resumo do catálogo", categories.error);

  type Row = { is_active: boolean; price_cents: number | null; stock_quantity: number | null; images: unknown };
  const rows = (products.data ?? []) as Row[];
  return {
    products: rows.length,
    active: rows.filter((r) => r.is_active).length,
    pricePending: rows.filter((r) => r.is_active && r.price_cents === null).length,
    withoutPhotos: rows.filter((r) => r.is_active && parseStoredImages(r.images).length === 0).length,
    outOfStock: rows.filter((r) => r.is_active && r.stock_quantity === 0).length,
    categories: categories.count ?? 0,
  };
}
