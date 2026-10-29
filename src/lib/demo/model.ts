import type { AdminCategory, MutationResult } from "@/lib/admin/catalog";
import type { CategoryInput, ProductInput } from "@/lib/admin/validation";
import { normalizeText } from "@/lib/products/search";
import type { Category, Product } from "@/lib/products/types";

// Demo catalog kept in the browser. Everything here is pure: operations take
// the current state and return a new one, so the same rules run in the store,
// in the tests and in every page. Field names follow the Supabase schema
// (ProductInput, AdminCategory, order statuses), which keeps the panel
// components identical in both modes.

export const DEMO_STATE_VERSION = 1;
export const MAX_DEMO_IMAGES_PER_PRODUCT = 3;
const MAX_ACTIVITY = 30;

/** Folder in public/ with the photos of the initial products. */
export const DEMO_IMAGE_DIR = "/demo/produtos";

export type DemoImage = {
  id: string;
  /**
   * data:image/... URL (compressed in the browser before saving), or one of
   * the bundled photos under DEMO_IMAGE_DIR.
   */
  url: string;
  alt: string;
};

export type DemoCategory = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  position: number;
};

export type DemoProduct = ProductInput & {
  id: string;
  images: DemoImage[];
  created_at: string;
  updated_at: string;
};

export type OrderStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  fulfilled: "Finalizado",
  cancelled: "Cancelado",
};

export type DemoOrderItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
};

/** Fictitious order shown in the panel. No real order is ever created. */
export type DemoOrder = {
  id: string;
  code: string;
  customer_name: string;
  status: OrderStatus;
  created_at: string;
  items: DemoOrderItem[];
};

export type DemoActivity = {
  id: string;
  at: string;
  message: string;
};

export type DemoState = {
  version: typeof DEMO_STATE_VERSION;
  categories: DemoCategory[];
  products: DemoProduct[];
  orders: DemoOrder[];
  activity: DemoActivity[];
};

export type ChangeContext = {
  now: string;
  newId: () => string;
};

type Failure = Exclude<MutationResult, { ok: true }>;
export type Change<T = void> = { ok: true; state: DemoState; value: T } | Failure;

const fail = (reason: Failure["reason"]): Failure => ({ ok: false, reason });

function done<T>(state: DemoState, value: T, ctx: ChangeContext, message: string): Change<T> {
  const entry = { id: ctx.newId(), at: ctx.now, message };
  return { ok: true, state: { ...state, activity: [entry, ...state.activity].slice(0, MAX_ACTIVITY) }, value };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

function slugTaken(products: DemoProduct[], slug: string, exceptId?: string): boolean {
  return products.some((p) => p.slug === slug && p.id !== exceptId);
}

function unknownCategory(state: DemoState, categoryId: string | null): boolean {
  return categoryId !== null && !state.categories.some((c) => c.id === categoryId);
}

function updateProductById(
  state: DemoState,
  id: string,
  update: (product: DemoProduct) => DemoProduct,
): DemoState | null {
  if (!state.products.some((p) => p.id === id)) return null;
  return { ...state, products: state.products.map((p) => (p.id === id ? update(p) : p)) };
}

export function createProduct(state: DemoState, input: ProductInput, ctx: ChangeContext): Change<{ id: string }> {
  if (unknownCategory(state, input.category_id)) return fail("invalid");
  if (slugTaken(state.products, input.slug)) return fail("slug_taken");
  const product: DemoProduct = { ...input, id: ctx.newId(), images: [], created_at: ctx.now, updated_at: ctx.now };
  return done({ ...state, products: [product, ...state.products] }, { id: product.id }, ctx, `Produto criado: “${input.name}”.`);
}

export function updateProduct(state: DemoState, id: string, input: ProductInput, ctx: ChangeContext): Change {
  if (unknownCategory(state, input.category_id)) return fail("invalid");
  if (slugTaken(state.products, input.slug, id)) return fail("slug_taken");
  const next = updateProductById(state, id, (p) => ({ ...p, ...input, updated_at: ctx.now }));
  if (!next) return fail("not_found");
  return done(next, undefined, ctx, `Produto editado: “${input.name}”.`);
}

export function setProductActive(state: DemoState, id: string, isActive: boolean, ctx: ChangeContext): Change {
  const product = state.products.find((p) => p.id === id);
  if (!product) return fail("not_found");
  const next = updateProductById(state, id, (p) => ({ ...p, is_active: isActive, updated_at: ctx.now }))!;
  return done(next, undefined, ctx, `Produto ${isActive ? "ativado" : "desativado"}: “${product.name}”.`);
}

/** Same rule as the database: a product that appears in orders is only deactivated. */
export function deleteProduct(state: DemoState, id: string, ctx: ChangeContext): Change {
  const product = state.products.find((p) => p.id === id);
  if (!product) return fail("not_found");
  if (state.orders.some((o) => o.items.some((item) => item.product_id === id))) return fail("has_orders");
  return done(
    { ...state, products: state.products.filter((p) => p.id !== id) },
    undefined,
    ctx,
    `Produto excluído: “${product.name}”.`,
  );
}

export function addProductImage(
  state: DemoState,
  productId: string,
  image: { url: string; alt: string },
  ctx: ChangeContext,
): Change {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return fail("not_found");
  if (!isDataImageUrl(image.url) || product.images.length >= MAX_DEMO_IMAGES_PER_PRODUCT) return fail("invalid");
  const added = { id: ctx.newId(), url: image.url, alt: image.alt.trim().slice(0, 200) };
  const next = updateProductById(state, productId, (p) => ({ ...p, images: [...p.images, added], updated_at: ctx.now }))!;
  return done(next, undefined, ctx, `Foto adicionada: “${product.name}”.`);
}

export function removeProductImage(state: DemoState, productId: string, imageId: string, ctx: ChangeContext): Change {
  const product = state.products.find((p) => p.id === productId);
  if (!product?.images.some((image) => image.id === imageId)) return fail("not_found");
  const next = updateProductById(state, productId, (p) => ({
    ...p,
    images: p.images.filter((image) => image.id !== imageId),
    updated_at: ctx.now,
  }))!;
  return done(next, undefined, ctx, `Foto removida: “${product.name}”.`);
}

export function setMainProductImage(state: DemoState, productId: string, imageId: string, ctx: ChangeContext): Change {
  const product = state.products.find((p) => p.id === productId);
  const image = product?.images.find((i) => i.id === imageId);
  if (!product || !image) return fail("not_found");
  const next = updateProductById(state, productId, (p) => ({
    ...p,
    images: [image, ...p.images.filter((i) => i.id !== imageId)],
    updated_at: ctx.now,
  }))!;
  return done(next, undefined, ctx, `Foto principal alterada: “${product.name}”.`);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

function categoryConflict(categories: DemoCategory[], input: CategoryInput, exceptId?: string): boolean {
  const name = normalizeText(input.name);
  return categories.some((c) => c.id !== exceptId && (c.slug === input.slug || normalizeText(c.name) === name));
}

function sortedCategories(categories: DemoCategory[]): DemoCategory[] {
  return [...categories].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "pt-BR"));
}

export function createCategory(state: DemoState, input: CategoryInput, ctx: ChangeContext): Change {
  if (categoryConflict(state.categories, input)) return fail("slug_taken");
  const position = Math.max(0, ...state.categories.map((c) => c.position)) + 10;
  const category: DemoCategory = { id: ctx.newId(), ...input, is_active: true, position };
  return done({ ...state, categories: [...state.categories, category] }, undefined, ctx, `Categoria criada: “${input.name}”.`);
}

export function updateCategory(state: DemoState, id: string, input: CategoryInput, ctx: ChangeContext): Change {
  if (!state.categories.some((c) => c.id === id)) return fail("not_found");
  if (categoryConflict(state.categories, input, id)) return fail("slug_taken");
  return done(
    { ...state, categories: state.categories.map((c) => (c.id === id ? { ...c, ...input } : c)) },
    undefined,
    ctx,
    `Categoria editada: “${input.name}”.`,
  );
}

export function setCategoryActive(state: DemoState, id: string, isActive: boolean, ctx: ChangeContext): Change {
  const category = state.categories.find((c) => c.id === id);
  if (!category) return fail("not_found");
  return done(
    { ...state, categories: state.categories.map((c) => (c.id === id ? { ...c, is_active: isActive } : c)) },
    undefined,
    ctx,
    `Categoria ${isActive ? "ativada" : "desativada"}: “${category.name}”.`,
  );
}

export function moveCategory(state: DemoState, id: string, direction: "up" | "down", ctx: ChangeContext): Change {
  const ordered = sortedCategories(state.categories);
  const index = ordered.findIndex((c) => c.id === id);
  if (index === -1) return fail("not_found");
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) return { ok: true, state, value: undefined };
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  const categories = ordered.map((c, i) => ({ ...c, position: (i + 1) * 10 }));
  return done({ ...state, categories }, undefined, ctx, `Ordem das categorias alterada.`);
}

export function deleteCategory(state: DemoState, id: string, ctx: ChangeContext): Change {
  const category = state.categories.find((c) => c.id === id);
  if (!category) return fail("not_found");
  if (state.products.some((p) => p.category_id === id)) return fail("has_products");
  return done(
    { ...state, categories: state.categories.filter((c) => c.id !== id) },
    undefined,
    ctx,
    `Categoria excluída: “${category.name}”.`,
  );
}

// ---------------------------------------------------------------------------
// Orders (fictitious)
// ---------------------------------------------------------------------------

export function setOrderStatus(state: DemoState, id: string, status: OrderStatus, ctx: ChangeContext): Change {
  const order = state.orders.find((o) => o.id === id);
  if (!order || !(status in orderStatusLabel)) return fail("not_found");
  return done(
    { ...state, orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)) },
    undefined,
    ctx,
    `Pedido ${order.code}: status alterado para “${orderStatusLabel[status]}”.`,
  );
}

export function orderSubtotal(order: DemoOrder): number {
  return order.items.reduce((sum, item) => sum + item.quantity * item.unit_price_cents, 0);
}

// ---------------------------------------------------------------------------
// Views: what the storefront and the panel read
// ---------------------------------------------------------------------------

/** Storefront shape. An inactive category hides its label, as with Supabase. */
export function toStorefrontProduct(state: DemoState, product: DemoProduct): Product {
  const category = state.categories.find((c) => c.id === product.category_id && c.is_active);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price_cents: product.price_cents,
    images: product.images.map((image) => ({ url: image.url, alt: image.alt || product.name })),
    category: category ? { slug: category.slug, name: category.name } : null,
    brand: product.brand,
    stock_quantity: product.stock_quantity,
    is_active: product.is_active,
    is_featured: product.is_featured,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

/** Active products only, newest first (same order as the Supabase source). */
export function storefrontProducts(state: DemoState): Product[] {
  return state.products
    .filter((p) => p.is_active)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((p) => toStorefrontProduct(state, p));
}

export function storefrontCategories(state: DemoState): Category[] {
  return sortedCategories(state.categories)
    .filter((c) => c.is_active)
    .map(({ slug, name }) => ({ slug, name }));
}

export function adminCategories(state: DemoState): AdminCategory[] {
  return sortedCategories(state.categories).map((c) => ({
    ...c,
    product_count: state.products.filter((p) => p.category_id === c.id).length,
  }));
}

export type DemoAdminProduct = DemoProduct & { category_name: string | null };

export type DemoProductFilters = {
  query?: string;
  /** "all", "none" (no category) or a category id. */
  category?: string;
  status?: "all" | "active" | "inactive";
};

export function adminProducts(
  state: DemoState,
  { query = "", category = "all", status = "all" }: DemoProductFilters = {},
): DemoAdminProduct[] {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  const names = new Map(state.categories.map((c) => [c.id, c.name]));
  return state.products
    .filter((p) => status === "all" || p.is_active === (status === "active"))
    .filter((p) => category === "all" || (category === "none" ? p.category_id === null : p.category_id === category))
    .filter((p) => {
      if (terms.length === 0) return true;
      const haystack = normalizeText([p.name, p.brand].filter(Boolean).join(" "));
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((p) => ({ ...p, category_name: p.category_id ? (names.get(p.category_id) ?? null) : null }));
}

export type DemoSummary = {
  products: number;
  active: number;
  inactive: number;
  categories: number;
  orders: number;
  pendingOrders: number;
  pricePending: number;
  withoutPhotos: number;
  outOfStock: number;
};

export function summarize(state: DemoState): DemoSummary {
  const active = state.products.filter((p) => p.is_active);
  return {
    products: state.products.length,
    active: active.length,
    inactive: state.products.length - active.length,
    categories: state.categories.length,
    orders: state.orders.length,
    pendingOrders: state.orders.filter((o) => o.status === "pending").length,
    pricePending: active.filter((p) => p.price_cents === null).length,
    withoutPhotos: active.filter((p) => p.images.length === 0).length,
    outOfStock: active.filter((p) => p.stock_quantity === 0).length,
  };
}

// ---------------------------------------------------------------------------
// Parsing data read from storage
// ---------------------------------------------------------------------------

const DATA_IMAGE = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/;

export function isDataImageUrl(value: unknown): value is string {
  return typeof value === "string" && DATA_IMAGE.test(value);
}

const BUNDLED_IMAGE = new RegExp(String.raw`^${DEMO_IMAGE_DIR}/[a-z0-9-]{1,60}\.webp$`);

/** Uploaded photo or bundled photo: the only URLs read from storage. */
export function isDemoImageUrl(value: unknown): value is string {
  return isDataImageUrl(value) || (typeof value === "string" && BUNDLED_IMAGE.test(value));
}

type Raw = Record<string, unknown>;

const isObject = (value: unknown): value is Raw => typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown): value is string => typeof value === "string";
const nonEmpty = (value: unknown): value is string => str(value) && value.trim().length > 0;
const intOrNull = (value: unknown, min: number): value is number | null =>
  value === null || (Number.isSafeInteger(value) && (value as number) >= min);

function parseCategory(raw: unknown): DemoCategory | null {
  if (!isObject(raw)) return null;
  const { id, name, slug, is_active, position } = raw;
  if (!nonEmpty(id) || !nonEmpty(name) || !nonEmpty(slug) || typeof is_active !== "boolean") return null;
  return { id, name, slug, is_active, position: Number.isFinite(position) ? (position as number) : 0 };
}

// The initial products were pictured by drawings until their photos arrived
// under new names (so no image cache serves an old drawing). A stored state
// still pointing to a drawing gets the photo; the drawing's alt text no longer
// applies, so the storefront falls back to the product name.
const RETIRED_DRAWING = new RegExp(
  String.raw`^${DEMO_IMAGE_DIR}/(paleta-de-sombras|colonia-floral|hidratante-corporal|necessaire-de-viagem|body-splash|base-liquida|shampoo-nutritivo|kit-presente)\.webp$`,
);

function parseImage(raw: unknown): DemoImage | null {
  if (!isObject(raw) || !nonEmpty(raw.id) || !isDemoImageUrl(raw.url)) return null;
  const drawing = RETIRED_DRAWING.exec(raw.url);
  if (drawing) return { id: raw.id, url: `${DEMO_IMAGE_DIR}/${drawing[1]}-foto.webp`, alt: "" };
  return { id: raw.id, url: raw.url, alt: str(raw.alt) ? raw.alt : "" };
}

function parseProduct(raw: unknown, categoryIds: Set<string>): DemoProduct | null {
  if (!isObject(raw)) return null;
  const r = raw;
  if (!nonEmpty(r.id) || !nonEmpty(r.name) || !nonEmpty(r.slug)) return null;
  if (!intOrNull(r.price_cents, 1) || !intOrNull(r.stock_quantity, 0)) return null;
  if (typeof r.is_active !== "boolean" || typeof r.is_featured !== "boolean") return null;
  if (!str(r.created_at) || !str(r.updated_at)) return null;
  const images = Array.isArray(r.images)
    ? r.images.map(parseImage).filter((i): i is DemoImage => i !== null).slice(0, MAX_DEMO_IMAGES_PER_PRODUCT)
    : [];
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: nonEmpty(r.description) ? r.description : null,
    brand: nonEmpty(r.brand) ? r.brand : null,
    // A category that no longer exists is dropped instead of breaking the page.
    category_id: str(r.category_id) && categoryIds.has(r.category_id) ? r.category_id : null,
    price_cents: r.price_cents,
    stock_quantity: r.stock_quantity,
    is_active: r.is_active,
    is_featured: r.is_featured,
    images,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function parseOrder(raw: unknown): DemoOrder | null {
  if (!isObject(raw)) return null;
  const { id, code, customer_name, status, created_at, items } = raw;
  if (!nonEmpty(id) || !nonEmpty(code) || !str(customer_name) || !str(created_at) || !Array.isArray(items)) return null;
  if (!str(status) || !(status in orderStatusLabel)) return null;
  const parsedItems: DemoOrderItem[] = [];
  for (const item of items) {
    if (
      isObject(item) &&
      str(item.product_id) &&
      str(item.product_name) &&
      Number.isSafeInteger(item.quantity) &&
      (item.quantity as number) > 0 &&
      Number.isSafeInteger(item.unit_price_cents) &&
      (item.unit_price_cents as number) > 0
    ) {
      parsedItems.push({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity as number,
        unit_price_cents: item.unit_price_cents as number,
      });
    }
  }
  return { id, code, customer_name, status: status as OrderStatus, created_at, items: parsedItems };
}

function parseActivity(raw: unknown): DemoActivity | null {
  if (!isObject(raw) || !nonEmpty(raw.id) || !str(raw.at) || !str(raw.message)) return null;
  return { id: raw.id, at: raw.at, message: raw.message };
}

function uniqueBy<T>(items: (T | null)[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item): item is T => {
    if (item === null || seen.has(key(item))) return false;
    seen.add(key(item));
    return true;
  });
}

/**
 * Validates a state read from storage. Returns null when the overall shape is
 * wrong (another version, edited by hand...). Malformed entries inside a
 * valid state are dropped one by one, so one bad record doesn't lose the rest.
 */
export function parseDemoState(raw: unknown): DemoState | null {
  if (!isObject(raw) || raw.version !== DEMO_STATE_VERSION) return null;
  const { categories, products, orders, activity } = raw;
  if (!Array.isArray(categories) || !Array.isArray(products) || !Array.isArray(orders)) return null;

  const parsedCategories = uniqueBy(categories.map(parseCategory), (c) => c.id);
  const categoryIds = new Set(parsedCategories.map((c) => c.id));
  const parsedProducts = uniqueBy(
    uniqueBy(products.map((p) => parseProduct(p, categoryIds)), (p) => p.id),
    (p) => p.slug,
  );
  return {
    version: DEMO_STATE_VERSION,
    categories: parsedCategories,
    products: parsedProducts,
    orders: uniqueBy(orders.map(parseOrder), (o) => o.id),
    activity: Array.isArray(activity)
      ? uniqueBy(activity.map(parseActivity), (a) => a.id).slice(0, MAX_ACTIVITY)
      : [],
  };
}
