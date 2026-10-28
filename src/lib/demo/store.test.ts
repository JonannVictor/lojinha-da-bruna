import { describe, expect, it, vi } from "vitest";
import { addItem, setQuantity } from "@/lib/cart/cart";
import { summarizeCart } from "@/lib/cart/summary";
import { MemoryStorage } from "@/test/memory-storage";
import { createDemoAdminActions, PHOTO_STORAGE_FULL_MESSAGE, STORAGE_FULL_MESSAGE } from "./admin-actions";
import { adminProducts, storefrontProducts } from "./model";
import { createSeedState } from "./seed";
import { DEMO_STORAGE_KEY } from "./storage";
import { createDemoStore, randomUuid } from "./store";

const idle = { status: "idle" } as const;
const now = () => new Date("2026-10-28T12:00:00.000Z");

function setup(storage = new MemoryStorage()) {
  const store = createDemoStore({ getStorage: () => storage, now });
  return { storage, store, actions: createDemoAdminActions(store.repository) };
}

function productForm(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

describe("demo store", () => {
  it("persists a product created in the panel across page reloads", async () => {
    const { storage, store, actions } = setup();
    const category = store.getSnapshot().state.categories[0];
    const created = vi.fn();

    const state = await actions.saveProduct(null, created)(
      idle,
      productForm({
        name: "Batom teste",
        brand: "Marca X",
        category_id: category.id,
        price: "19,90",
        stock_quantity: "3",
        description: "Descrição",
        is_active: "on",
      }),
    );
    expect(state).toEqual({ status: "success", message: "Produto criado." });
    const id = created.mock.calls[0][0] as string;

    // A new store over the same storage = the page after a refresh.
    const reloaded = createDemoStore({ getStorage: () => storage, now });
    const product = storefrontProducts(reloaded.getSnapshot().state).find((p) => p.id === id);
    expect(product).toMatchObject({
      name: "Batom teste",
      slug: "batom-teste",
      price_cents: 1990,
      stock_quantity: 3,
      category: { slug: category.slug, name: category.name },
    });
  });

  it("validates required fields like the server does", async () => {
    const { store, actions } = setup();
    const before = store.getSnapshot();
    const state = await actions.saveProduct(null)(idle, productForm({ name: "", price: "abc" }));
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.name).toBeDefined();
    expect(state.fieldErrors?.price_cents).toBeDefined();
    expect(store.getSnapshot()).toBe(before);
  });

  it("edits, deactivates and reactivates; the storefront follows the panel", async () => {
    const { store, actions } = setup();
    const target = store.getSnapshot().state.products[0];

    const edited = await actions.saveProduct(target.id)(
      idle,
      productForm({ name: "Nome novo", slug: target.slug, price: "10", stock_quantity: "", is_active: "on" }),
    );
    expect(edited.status).toBe("success");
    let shown = storefrontProducts(store.getSnapshot().state).find((p) => p.id === target.id);
    expect(shown).toMatchObject({ name: "Nome novo", price_cents: 1000, stock_quantity: null, category: null });

    await actions.toggleProduct(target.id, false)(idle, new FormData());
    shown = storefrontProducts(store.getSnapshot().state).find((p) => p.id === target.id);
    expect(shown).toBeUndefined();
    expect(adminProducts(store.getSnapshot().state, { status: "inactive" }).map((p) => p.id)).toContain(target.id);

    await actions.toggleProduct(target.id, true)(idle, new FormData());
    expect(storefrontProducts(store.getSnapshot().state).some((p) => p.id === target.id)).toBe(true);
  });

  it("notifies subscribers on every change", async () => {
    const { store } = setup();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await store.repository.setProductActive(store.getSnapshot().state.products[0].id, false);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("restores the initial demo data", async () => {
    const { storage, store, actions } = setup();
    const first = store.getSnapshot().state.products[0];
    await actions.toggleProduct(first.id, false)(idle, new FormData());
    await actions.saveCategory(null)(idle, productForm({ name: "Nova" }));

    expect((await store.repository.reset()).ok).toBe(true);
    expect(store.getSnapshot().state).toEqual(createSeedState(now()));
    expect(JSON.parse(storage.getItem(DEMO_STORAGE_KEY)!)).toEqual(createSeedState(now()));
  });

  it("leaves the data untouched when the browser storage is full", async () => {
    const { storage, store, actions } = setup();
    const target = store.getSnapshot().state.products[0];
    // Make the first write succeed, then shrink the quota.
    await store.repository.setProductActive(target.id, true);
    await store.repository.setProductActive(target.id, false);
    const saved = storage.getItem(DEMO_STORAGE_KEY);
    const before = store.getSnapshot();
    storage.quota = 10;

    const result = await actions.toggleProduct(target.id, true)(idle, new FormData());
    expect(result).toEqual({ status: "error", message: STORAGE_FULL_MESSAGE });
    expect(store.getSnapshot()).toBe(before);
    expect(storage.getItem(DEMO_STORAGE_KEY)).toBe(saved);
  });

  it("stores photos as data URLs and explains when there is no room", async () => {
    const { storage, store, actions } = setup();
    const id = store.getSnapshot().state.products[0].id;
    const photo = () => {
      const form = new FormData();
      form.set("photo", new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), "foto");
      form.set("alt", "Frasco");
      return form;
    };

    expect(await actions.uploadImage(id)(idle, photo())).toEqual({ status: "success", message: "Foto adicionada." });
    const image = store.getSnapshot().state.products[0].images[0];
    expect(image).toMatchObject({ url: "data:image/png;base64,iVBORw==", alt: "Frasco" });

    storage.quota = 10;
    expect(await actions.uploadImage(id)(idle, photo())).toEqual({ status: "error", message: PHOTO_STORAGE_FULL_MESSAGE });
    expect(store.getSnapshot().state.products[0].images).toHaveLength(1);

    const form = new FormData();
    form.set("photo", new Blob(["GIF89a"], { type: "image/gif" }), "x.gif");
    expect((await actions.uploadImage(id)(idle, form)).status).toBe("error");
  });

  it("keeps working in memory when storage is blocked", async () => {
    const storage = new MemoryStorage();
    storage.blocked = true;
    const { store } = setup(storage);
    expect(store.getSnapshot()).toMatchObject({ issue: "unavailable", persistent: false });
    const target = store.getSnapshot().state.products[0];
    expect((await store.repository.setProductActive(target.id, false)).ok).toBe(true);
    expect(store.getSnapshot().state.products[0].is_active).toBe(false);
  });

  it("refuses to delete products present in demo orders and categories with products", async () => {
    const { store, actions } = setup();
    const { orders, categories } = store.getSnapshot().state;
    const deleted = await actions.deleteProduct(orders[0].items[0].product_id)(idle, new FormData());
    expect(deleted.message).toMatch(/pedidos/);
    const removed = await actions.deleteCategory(categories[0].id)(idle, new FormData());
    expect(removed.message).toMatch(/tem produtos/);
  });
});

describe("cart with demo products", () => {
  it("computes subtotals and blocks unavailable items", async () => {
    const { store } = setup();
    const products = storefrontProducts(store.getSnapshot().state);
    const hidratante = products.find((p) => p.name.startsWith("Hidratante"))!; // R$ 29,00, 8 in stock
    const base = products.find((p) => p.name.startsWith("Base"))!; // out of stock
    const shampoo = products.find((p) => p.name.startsWith("Shampoo"))!; // price pending

    let lines = addItem([], hidratante.id, 2, 8);
    lines = setQuantity(lines, hidratante.id, 3, 8);
    lines = [...lines, { productId: base.id, quantity: 1 }, { productId: shampoo.id, quantity: 1 }];

    const summary = summarizeCart(lines, products);
    expect(summary.subtotalCents).toBe(3 * 2900);
    expect(summary.hasUnavailable).toBe(true);
    expect(summary.items.filter((i) => i.purchasable).map((i) => i.line.productId)).toEqual([hidratante.id]);
  });

  it("a product deactivated in the panel leaves the cart subtotal", async () => {
    const { store } = setup();
    const target = storefrontProducts(store.getSnapshot().state).find((p) => p.name.startsWith("Hidratante"))!;
    const lines = [{ productId: target.id, quantity: 2 }];
    expect(summarizeCart(lines, storefrontProducts(store.getSnapshot().state)).subtotalCents).toBe(5800);

    await store.repository.setProductActive(target.id, false);
    const summary = summarizeCart(lines, storefrontProducts(store.getSnapshot().state));
    expect(summary.subtotalCents).toBe(0);
    expect(summary.items[0].product).toBeNull();
  });
});

describe("randomUuid", () => {
  it("produces v4 UUIDs, also without crypto.randomUUID (plain HTTP)", () => {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(randomUuid()).toMatch(pattern);
    const original = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      expect(randomUuid()).toMatch(pattern);
    } finally {
      Object.defineProperty(globalThis.crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});
