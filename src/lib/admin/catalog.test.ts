import { afterEach, describe, expect, it, vi } from "vitest";
import { argsOf, createFakeClient, has } from "@/test/fake-supabase";
import { DataSourceError } from "@/lib/supabase/errors";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  listAdminProducts,
  moveCategory,
  setProductActive,
  updateProduct,
} from "./catalog";
import type { ProductInput } from "./validation";

const ID = "11111111-1111-4111-8111-111111111111";

const input: ProductInput = {
  name: "Produto",
  slug: "produto",
  description: null,
  brand: null,
  category_id: null,
  price_cents: 1000,
  stock_quantity: null,
  is_active: false,
  is_featured: false,
};

afterEach(() => vi.restoreAllMocks());

describe("creating and editing products", () => {
  it("inserts the validated fields and returns the new id", async () => {
    const fake = createFakeClient({ query: () => ({ data: { id: ID }, error: null }) });
    expect(await createProduct(fake.client, input)).toEqual({ ok: true, value: { id: ID } });
    expect(argsOf(fake.calls[0], "insert")).toEqual([input]);
  });

  it("reports a slug already in use", async () => {
    const fake = createFakeClient({ query: () => ({ data: null, error: { code: "23505" } }) });
    expect(await createProduct(fake.client, input)).toEqual({ ok: false, reason: "slug_taken" });
  });

  it("reports values refused by a database constraint", async () => {
    const fake = createFakeClient({ query: () => ({ data: null, error: { code: "23514" } }) });
    expect(await updateProduct(fake.client, ID, input)).toEqual({ ok: false, reason: "invalid" });
  });

  it("updates only the given product", async () => {
    const fake = createFakeClient({ query: () => ({ data: [{ id: ID }], error: null }) });
    expect(await updateProduct(fake.client, ID, input)).toEqual({ ok: true, value: undefined });
    expect(has(fake.calls[0], "eq", "id", ID)).toBe(true);
  });

  it("treats 0 affected rows (RLS or deleted) as not found", async () => {
    const fake = createFakeClient({ query: () => ({ data: [], error: null }) });
    expect(await updateProduct(fake.client, ID, input)).toEqual({ ok: false, reason: "not_found" });
    expect(await setProductActive(fake.client, ID, true)).toEqual({ ok: false, reason: "not_found" });
  });

  it("throws on unexpected database errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fake = createFakeClient({ query: () => ({ data: null, error: { code: "08006", message: "conn" } }) });
    await expect(createProduct(fake.client, input)).rejects.toBeInstanceOf(DataSourceError);
  });
});

describe("deleting products", () => {
  it("refuses when the product has order history (keeps it for deactivation)", async () => {
    const fake = createFakeClient({ query: () => ({ data: null, error: { code: "23503" } }) });
    expect(await deleteProduct(fake.client, ID)).toEqual({ ok: false, reason: "has_orders" });
    expect(fake.removals).toEqual([]);
  });

  it("removes the photos after the row is gone", async () => {
    const path = `products/${ID}/a.webp`;
    const fake = createFakeClient({ query: () => ({ data: [{ id: ID, images: [{ path, alt: "" }] }], error: null }) });
    expect(await deleteProduct(fake.client, ID)).toEqual({ ok: true, value: undefined });
    expect(fake.log).toEqual(["db:products:delete", "storage:product-images:remove"]);
    expect(fake.removals).toEqual([[path]]);
  });
});

describe("admin product search", () => {
  it("matches name, brand and category ignoring accents", async () => {
    const rows = [
      { id: "1", name: "Sérum", brand: null, slug: "serum", images: [], category: { name: "Beleza" } },
      { id: "2", name: "Perfume", brand: "Marca", slug: "perfume", images: [], category: null },
    ];
    const fake = createFakeClient({ query: () => ({ data: rows, error: null }) });
    expect((await listAdminProducts(fake.client, { query: "serum" })).map((p) => p.id)).toEqual(["1"]);
    expect((await listAdminProducts(fake.client, { query: "beleza" })).map((p) => p.id)).toEqual(["1"]);
    const inactive = createFakeClient({ query: () => ({ data: [], error: null }) });
    await listAdminProducts(inactive.client, { status: "inactive" });
    expect(has(inactive.calls[0], "eq", "is_active", false)).toBe(true);
  });
});

describe("categories", () => {
  it("appends new categories at the end", async () => {
    const fake = createFakeClient({
      query: (call) => (call.ops[0].method === "select" ? { data: { position: 40 }, error: null } : { data: null, error: null }),
    });
    await createCategory(fake.client, { name: "Nova", slug: "nova" });
    expect(argsOf(fake.calls[1], "insert")).toEqual([{ name: "Nova", slug: "nova", position: 50 }]);
  });

  it("refuses to delete a category that still has products", async () => {
    const fake = createFakeClient({ query: () => ({ data: null, error: { code: "23503" } }) });
    expect(await deleteCategory(fake.client, ID)).toEqual({ ok: false, reason: "has_products" });
  });

  it("swaps a category with its neighbour", async () => {
    const list = [
      { id: "a", name: "A", slug: "a", is_active: true, position: 10, products: [] },
      { id: "b", name: "B", slug: "b", is_active: true, position: 20, products: [] },
      { id: "c", name: "C", slug: "c", is_active: true, position: 30, products: [] },
    ];
    const fake = createFakeClient({
      query: (call) => (call.ops[0].method === "select" ? { data: list, error: null } : { data: null, error: null }),
    });
    await moveCategory(fake.client, "c", "up");
    const updates = fake.calls
      .filter((call) => call.ops[0].method === "update")
      .map((call) => [argsOf(call, "eq")?.[1], (argsOf(call, "update")?.[0] as { position: number }).position]);
    expect(updates).toEqual([
      ["c", 20],
      ["b", 30],
    ]);
  });
});
