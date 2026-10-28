import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeClient, has } from "@/test/fake-supabase";
import { DataSourceError } from "@/lib/supabase/errors";
import { parseStoredImages, publicImageUrl, toProductImages } from "./images";
import {
  fetchActiveCategories,
  fetchActiveProductBySlug,
  fetchActiveProducts,
  fetchActiveProductsByIds,
  mapProductRow,
  type ProductRow,
} from "./supabase-source";

const URL_BASE = "https://abc.supabase.co";
const ID = "11111111-1111-4111-8111-111111111111";

const row = (fields: Partial<ProductRow> = {}): ProductRow => ({
  id: ID,
  name: "Produto",
  slug: "produto",
  description: "Texto",
  brand: "Marca",
  price_cents: 1990,
  stock_quantity: 3,
  images: [],
  is_active: true,
  is_featured: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  category: { slug: "beleza", name: "Beleza" },
  ...fields,
});

afterEach(() => vi.restoreAllMocks());

describe("reading active products", () => {
  it("filters is_active explicitly, on top of RLS", async () => {
    const fake = createFakeClient({ query: () => ({ data: [row()], error: null }) });
    const products = await fetchActiveProducts(fake.client, URL_BASE);
    expect(products).toHaveLength(1);
    expect(fake.calls[0].table).toBe("products");
    expect(has(fake.calls[0], "eq", "is_active", true)).toBe(true);
  });

  it("maps rows to the storefront Product shape", () => {
    const product = mapProductRow(row({ description: "  ", brand: "" }), URL_BASE);
    expect(product).toMatchObject({
      id: ID,
      price_cents: 1990,
      description: null,
      brand: null,
      category: { slug: "beleza", name: "Beleza" },
      images: [],
    });
  });

  it("treats a missing or non-positive price as 'to be confirmed'", () => {
    expect(mapProductRow(row({ price_cents: null }), URL_BASE).price_cents).toBeNull();
    expect(mapProductRow(row({ price_cents: 0 }), URL_BASE).price_cents).toBeNull();
    expect(mapProductRow(row({ price_cents: -5 }), URL_BASE).price_cents).toBeNull();
  });

  it("looks a product up by slug among active ones only", async () => {
    const fake = createFakeClient({ query: () => ({ data: null, error: null }) });
    expect(await fetchActiveProductBySlug(fake.client, URL_BASE, "inativo")).toBeNull();
    expect(has(fake.calls[0], "eq", "slug", "inativo")).toBe(true);
    expect(has(fake.calls[0], "eq", "is_active", true)).toBe(true);
  });

  it("drops malformed ids before querying the cart products", async () => {
    const fake = createFakeClient({ query: () => ({ data: [row()], error: null }) });
    await fetchActiveProductsByIds(fake.client, URL_BASE, [ID, "demo-01", "1; drop", ID]);
    expect(has(fake.calls[0], "in", "id", [ID])).toBe(true);
    expect(has(fake.calls[0], "eq", "is_active", true)).toBe(true);

    const none = createFakeClient();
    expect(await fetchActiveProductsByIds(none.client, URL_BASE, ["x"])).toEqual([]);
    expect(none.calls).toHaveLength(0);
  });

  it("lists active categories in their configured order", async () => {
    const fake = createFakeClient({ query: () => ({ data: [{ slug: "a", name: "A" }], error: null }) });
    expect(await fetchActiveCategories(fake.client)).toEqual([{ slug: "a", name: "A" }]);
    expect(has(fake.calls[0], "eq", "is_active", true)).toBe(true);
    expect(has(fake.calls[0], "order", "position")).toBe(true);
  });
});

describe("Supabase errors", () => {
  it("throw a generic DataSourceError instead of returning an empty catalog", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fake = createFakeClient({
      query: () => ({ data: null, error: { code: "PGRST301", message: "JWT expired at host db.abc.supabase.co" } }),
    });
    const promise = fetchActiveProducts(fake.client, URL_BASE);
    await expect(promise).rejects.toBeInstanceOf(DataSourceError);
    // The message shown to callers carries no connection details.
    await expect(promise).rejects.toThrow(/^Falha ao acessar os dados \(listar produtos\)\.$/);
    expect(log).toHaveBeenCalledOnce();
  });

  it("also cover network failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fake = createFakeClient({ query: () => ({ data: null, error: { message: "TypeError: fetch failed" } }) });
    await expect(fetchActiveCategories(fake.client)).rejects.toBeInstanceOf(DataSourceError);
  });
});

describe("product images", () => {
  const path = `products/${ID}/a1b2.webp`;

  it("build public URLs from the stored path", () => {
    expect(publicImageUrl(URL_BASE, path)).toBe(
      `${URL_BASE}/storage/v1/object/public/product-images/products/${ID}/a1b2.webp`,
    );
  });

  it("drop malformed entries so the storefront never renders broken images", () => {
    expect(
      parseStoredImages([
        { path, alt: "Frente" },
        { path, alt: "duplicada" },
        { path: "https://evil.example/x.png", alt: "" },
        { path: `products/${ID}/../../x.webp` },
        { path: `products/${ID}/script.svg` },
        "texto",
        null,
      ]),
    ).toEqual([{ path, alt: "Frente" }]);
    expect(parseStoredImages({ path })).toEqual([]);
  });

  it("fall back to the product name as alt text", () => {
    expect(toProductImages(URL_BASE, [{ path, alt: " " }], "Sérum")[0].alt).toBe("Sérum");
  });

  it("products without photos keep an empty list", () => {
    expect(mapProductRow(row({ images: null }), URL_BASE).images).toEqual([]);
  });
});
