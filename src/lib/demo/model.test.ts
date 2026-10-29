import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ProductInput } from "@/lib/admin/validation";
import { filterProducts } from "@/lib/products/search";
import {
  addProductImage,
  adminCategories,
  adminProducts,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  DEMO_IMAGE_DIR,
  MAX_DEMO_IMAGES_PER_PRODUCT,
  moveCategory,
  orderSubtotal,
  parseDemoState,
  removeProductImage,
  setCategoryActive,
  setMainProductImage,
  setOrderStatus,
  setProductActive,
  storefrontCategories,
  storefrontProducts,
  summarize,
  updateCategory,
  updateProduct,
  type Change,
  type ChangeContext,
  type DemoState,
} from "./model";
import { createSeedState } from "./seed";

let counter = 0;
function ctx(now = "2026-10-28T12:00:00.000Z"): ChangeContext {
  return { now, newId: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}` };
}

function ok<T>(change: Change<T>): { state: DemoState; value: T } {
  if (!change.ok) throw new Error(`expected success, got ${change.reason}`);
  return change;
}

const seed = () => createSeedState(new Date("2026-10-28T10:00:00.000Z"));
const PIXEL = "data:image/png;base64,iVBORw0KGgo=";

function input(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: "Sabonete teste",
    slug: "sabonete-teste",
    description: null,
    brand: "Marca teste",
    category_id: null,
    price_cents: 1500,
    stock_quantity: 4,
    is_active: true,
    is_featured: false,
    ...overrides,
  };
}

describe("seed", () => {
  it("reads like the final store, names no brand and is pictured by bundled photos", () => {
    const state = seed();
    expect(state.products.length).toBeGreaterThan(0);
    for (const product of state.products) {
      expect(`${product.name} ${product.description}`).not.toMatch(/exemplo|fictíci|demonstra/i);
      expect(product.brand).toBeNull();
      expect(product.images).toHaveLength(1);
      const [image] = product.images;
      expect(image.url.startsWith(`${DEMO_IMAGE_DIR}/`)).toBe(true);
      expect(image.alt).toMatch(/^Foto /);
      expect(existsSync(join(process.cwd(), "public", image.url))).toBe(true);
    }
    expect(state.orders.every((o) => o.code.startsWith("PED-") && !/demonstra/i.test(o.customer_name))).toBe(true);
  });

  it("has eight complete products, seven of them in the storefront", () => {
    const state = seed();
    const categoryIds = new Set(state.categories.map((c) => c.id));
    expect(state.products).toHaveLength(8);
    for (const product of state.products) {
      expect(product.slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(product.description!.length).toBeGreaterThan(20);
      expect(categoryIds.has(product.category_id!)).toBe(true);
    }
    // Only "Shampoo" has no price (shown as "Preço sob consulta") and only "Kit presente" is inactive.
    expect(state.products.filter((p) => p.price_cents === null).map((p) => p.slug)).toEqual(["shampoo-nutritivo"]);
    const visible = storefrontProducts(state);
    expect(visible).toHaveLength(7);
    expect(visible.every((p) => p.category !== null)).toBe(true);
  });

  it("orders reference seed products with their prices", () => {
    const state = seed();
    for (const item of state.orders.flatMap((o) => o.items)) {
      const product = state.products.find((p) => p.id === item.product_id);
      expect(product?.price_cents).toBe(item.unit_price_cents);
    }
  });
});

describe("products", () => {
  it("creates a product that shows up in the storefront, newest first", () => {
    const category = seed().categories[1];
    const { state, value } = ok(createProduct(seed(), input({ category_id: category.id }), ctx("2030-01-01T00:00:00.000Z")));
    const storefront = storefrontProducts(state);
    expect(storefront[0].id).toBe(value.id);
    expect(storefront[0].category).toEqual({ slug: category.slug, name: category.name });
    expect(state.activity[0].message).toContain("Sabonete teste");
  });

  it("rejects a duplicated slug and an unknown category", () => {
    const state = seed();
    expect(createProduct(state, input({ slug: state.products[0].slug }), ctx())).toEqual({ ok: false, reason: "slug_taken" });
    expect(createProduct(state, input({ category_id: "00000000-0000-4000-8000-999999999999" }), ctx())).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("edits a product and the storefront reflects the change", () => {
    const base = seed();
    const target = base.products[0];
    const { state } = ok(updateProduct(base, target.id, input({ name: "Nome editado", slug: target.slug, price_cents: 999 }), ctx()));
    const shown = storefrontProducts(state).find((p) => p.id === target.id)!;
    expect(shown.name).toBe("Nome editado");
    expect(shown.price_cents).toBe(999);
    // Editing keeps its own slug without a conflict, but not another product's.
    expect(updateProduct(base, target.id, input({ slug: base.products[1].slug }), ctx())).toEqual({
      ok: false,
      reason: "slug_taken",
    });
    expect(updateProduct(base, "missing", input(), ctx())).toEqual({ ok: false, reason: "not_found" });
  });

  it("deactivated products disappear from the storefront but stay in the panel", () => {
    const base = seed();
    const target = base.products[0];
    const { state } = ok(setProductActive(base, target.id, false, ctx()));
    expect(storefrontProducts(state).some((p) => p.id === target.id)).toBe(false);
    expect(adminProducts(state).some((p) => p.id === target.id)).toBe(true);
    const { state: again } = ok(setProductActive(state, target.id, true, ctx()));
    expect(storefrontProducts(again).some((p) => p.id === target.id)).toBe(true);
  });

  it("refuses to delete a product that appears in orders", () => {
    const base = seed();
    const ordered = base.orders[0].items[0].product_id;
    expect(deleteProduct(base, ordered, ctx())).toEqual({ ok: false, reason: "has_orders" });
    const { state, value } = ok(createProduct(base, input(), ctx()));
    expect(ok(deleteProduct(state, value.id, ctx())).state.products.some((p) => p.id === value.id)).toBe(false);
  });

  it("manages photos: add, main photo, remove and per-product limit", () => {
    let state = seed();
    const id = state.products[0].id;
    for (let i = state.products[0].images.length; i < MAX_DEMO_IMAGES_PER_PRODUCT; i++) {
      state = ok(addProductImage(state, id, { url: PIXEL, alt: `foto ${i}` }, ctx())).state;
    }
    expect(addProductImage(state, id, { url: PIXEL, alt: "" }, ctx())).toEqual({ ok: false, reason: "invalid" });
    const [first, second] = state.products[0].images;
    state = ok(setMainProductImage(state, id, second.id, ctx())).state;
    expect(state.products[0].images[0].id).toBe(second.id);
    state = ok(removeProductImage(state, id, first.id, ctx())).state;
    expect(state.products[0].images.map((i) => i.id)).not.toContain(first.id);
    expect(storefrontProducts(state).find((p) => p.id === id)!.images[0].url).toBe(PIXEL);
  });

  it("only accepts data: image URLs", () => {
    const state = seed();
    const id = state.products[0].id;
    expect(addProductImage(state, id, { url: "javascript:alert(1)", alt: "" }, ctx())).toEqual({ ok: false, reason: "invalid" });
    expect(addProductImage(state, id, { url: "https://example.com/a.jpg", alt: "" }, ctx())).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});

describe("panel filters", () => {
  it("filters by name, category and status", () => {
    const state = seed();
    const perfumaria = state.categories.find((c) => c.slug === "perfumaria")!;

    expect(adminProducts(state, { query: "colonia" }).map((p) => p.name)).toEqual(["Colônia floral"]);
    expect(adminProducts(state, { category: perfumaria.id }).every((p) => p.category_id === perfumaria.id)).toBe(true);
    expect(adminProducts(state, { status: "inactive" }).map((p) => p.name)).toEqual(["Kit presente"]);
    expect(adminProducts(state, { status: "active" }).every((p) => p.is_active)).toBe(true);
    expect(adminProducts(state, { category: "none" })).toEqual([]);
    expect(adminProducts(state, { query: "colonia", status: "inactive" })).toEqual([]);
  });

  it("storefront search ignores accents and inactive products", () => {
    const products = storefrontProducts(seed());
    expect(filterProducts(products, { query: "COLONIA" }).map((p) => p.name)).toEqual(["Colônia floral"]);
    expect(filterProducts(products, { query: "kit presente" })).toEqual([]);
    expect(filterProducts(products, { categorySlug: "beleza" }).every((p) => p.category?.slug === "beleza")).toBe(true);
  });
});

describe("categories", () => {
  it("creates, renames, reorders and deactivates", () => {
    let state = ok(createCategory(seed(), { name: "Acessórios", slug: "acessorios" }, ctx())).state;
    expect(storefrontCategories(state).at(-1)).toEqual({ slug: "acessorios", name: "Acessórios" });

    const created = state.categories.find((c) => c.slug === "acessorios")!;
    state = ok(updateCategory(state, created.id, { name: "Bijuterias", slug: "bijuterias" }, ctx())).state;
    state = ok(moveCategory(state, created.id, "up", ctx())).state;
    const names = storefrontCategories(state).map((c) => c.name);
    expect(names.indexOf("Bijuterias")).toBe(names.length - 2);

    state = ok(setCategoryActive(state, created.id, false, ctx())).state;
    expect(storefrontCategories(state).some((c) => c.slug === "bijuterias")).toBe(false);
    expect(adminCategories(state).find((c) => c.id === created.id)?.is_active).toBe(false);
  });

  it("rejects duplicate names or slugs, ignoring case and accents", () => {
    const state = seed();
    expect(createCategory(state, { name: "PERFUMÁRIA", slug: "outro" }, ctx())).toEqual({ ok: false, reason: "slug_taken" });
    expect(createCategory(state, { name: "Outro", slug: "beleza" }, ctx())).toEqual({ ok: false, reason: "slug_taken" });
  });

  it("an inactive category hides its label but not its products", () => {
    const base = seed();
    const beleza = base.categories.find((c) => c.slug === "beleza")!;
    const state = ok(setCategoryActive(base, beleza.id, false, ctx())).state;
    const product = storefrontProducts(state).find((p) => p.name.startsWith("Paleta"));
    expect(product).toBeDefined();
    expect(product?.category).toBeNull();
  });

  it("refuses to delete a category with products and counts them", () => {
    const state = seed();
    const beleza = adminCategories(state).find((c) => c.slug === "beleza")!;
    expect(beleza.product_count).toBe(2);
    expect(deleteCategory(state, beleza.id, ctx())).toEqual({ ok: false, reason: "has_products" });
    const withEmpty = ok(createCategory(state, { name: "Vazia", slug: "vazia" }, ctx())).state;
    const empty = withEmpty.categories.find((c) => c.slug === "vazia")!;
    expect(ok(deleteCategory(withEmpty, empty.id, ctx())).state.categories).toHaveLength(state.categories.length);
  });
});

describe("orders and summary", () => {
  it("summarizes the demo data without inventing numbers", () => {
    const state = seed();
    const summary = summarize(state);
    expect(summary.products).toBe(state.products.length);
    expect(summary.active + summary.inactive).toBe(state.products.length);
    expect(summary.inactive).toBe(1);
    expect(summary.orders).toBe(3);
    expect(summary.outOfStock).toBe(1);
    expect(summary.pricePending).toBe(1);
  });

  it("changes an order status and computes the subtotal", () => {
    const base = seed();
    const order = base.orders[0];
    expect(orderSubtotal(order)).toBe(2 * 2900 + 8900);
    const state = ok(setOrderStatus(base, order.id, "confirmed", ctx())).state;
    expect(state.orders[0].status).toBe("confirmed");
    expect(setOrderStatus(base, order.id, "shipped" as never, ctx())).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("parseDemoState", () => {
  it("accepts its own output", () => {
    const state = seed();
    expect(parseDemoState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("rejects the wrong shape or version", () => {
    expect(parseDemoState(null)).toBeNull();
    expect(parseDemoState([])).toBeNull();
    expect(parseDemoState({ ...seed(), version: 99 })).toBeNull();
    expect(parseDemoState({ version: 1, products: "x", categories: [], orders: [] })).toBeNull();
  });

  it("moves images stored before the photos from the old drawings to the photos", () => {
    const state = seed();
    const raw = JSON.parse(JSON.stringify(state));
    raw.products[0].images = [
      { id: "old", url: `${DEMO_IMAGE_DIR}/paleta-de-sombras.webp`, alt: "Ilustração de uma paleta" },
      { id: "up", url: PIXEL, alt: "foto enviada" },
    ];

    const images = parseDemoState(raw)!.products[0].images;
    expect(images).toEqual([
      { id: "old", url: `${DEMO_IMAGE_DIR}/paleta-de-sombras-foto.webp`, alt: "" },
      { id: "up", url: PIXEL, alt: "foto enviada" },
    ]);
    expect(existsSync(join(process.cwd(), "public", images[0].url))).toBe(true);
  });

  it("drops malformed records one by one", () => {
    const state = seed();
    const raw = JSON.parse(JSON.stringify(state));
    raw.products[0].price_cents = -5;
    raw.products[1].images = [
      { id: "x", url: "javascript:alert(1)", alt: "" },
      { id: "y", url: PIXEL, alt: "ok" },
      { id: "z", url: `${DEMO_IMAGE_DIR}/../../x.webp`, alt: "" },
      { id: "w", url: "https://example.com/demo/produtos/a.webp", alt: "" },
    ];
    raw.products[2].category_id = "categoria-que-nao-existe";
    raw.products.push({ ...raw.products[3] }); // duplicated id
    raw.categories.push({ nonsense: true });
    raw.orders[0].items.push({ product_id: "a", product_name: "b", quantity: 0, unit_price_cents: 1 });

    const parsed = parseDemoState(raw)!;
    expect(parsed.products).toHaveLength(state.products.length - 1);
    expect(parsed.products.find((p) => p.id === state.products[1].id)!.images).toEqual([{ id: "y", url: PIXEL, alt: "ok" }]);
    expect(parsed.products.find((p) => p.id === state.products[2].id)!.category_id).toBeNull();
    expect(parsed.categories).toHaveLength(state.categories.length);
    expect(parsed.orders[0].items).toHaveLength(state.orders[0].items.length);
  });
});
