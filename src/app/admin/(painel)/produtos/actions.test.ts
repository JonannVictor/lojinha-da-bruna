import { beforeEach, describe, expect, it, vi } from "vitest";
import { idleState } from "@/lib/admin/action-state";
import { createFakeClient } from "@/test/fake-supabase";

// Server Actions are public endpoints: anyone can POST to them without using
// the admin UI. These tests make sure each one checks the admin session
// before touching the database, and validates what the client sends.

class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`redirect:${url}`);
  }
}

const auth = vi.hoisted(() => ({ allowed: false, client: null as unknown }));
const cache = vi.hoisted(() => ({ updateTag: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));
vi.mock("next/cache", () => cache);
vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: async () => {
    if (!auth.allowed) throw new RedirectError("/admin/login");
    return { session: { userId: "u", email: null }, supabase: auth.client };
  },
}));

const actions = await import("./actions");

const ID = "11111111-1111-4111-8111-111111111111";

function form(fields: Record<string, string | Blob>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  auth.allowed = false;
  cache.updateTag.mockClear();
});

describe("without an admin session", () => {
  it.each([
    ["saveProduct (create)", () => actions.saveProduct(null, idleState, form({ name: "X", price: "10" }))],
    ["saveProduct (edit)", () => actions.saveProduct(ID, idleState, form({ name: "X" }))],
    ["toggleProductActive", () => actions.toggleProductActive(ID, true)],
    ["removeProduct", () => actions.removeProduct(ID)],
    ["uploadProductImage", () => actions.uploadProductImage(ID, idleState, form({ alt: "" }))],
    ["deleteProductImage", () => actions.deleteProductImage(ID, `products/${ID}/a.webp`)],
    ["makeMainProductImage", () => actions.makeMainProductImage(ID, `products/${ID}/a.webp`)],
  ])("%s redirects to login and never reaches the database", async (_name, run) => {
    const fake = createFakeClient();
    auth.client = fake.client;
    await expect(run()).rejects.toMatchObject({ url: "/admin/login" });
    expect(fake.calls).toEqual([]);
    expect(fake.uploads).toEqual([]);
    expect(cache.updateTag).not.toHaveBeenCalled();
  });
});

describe("as admin", () => {
  beforeEach(() => {
    auth.allowed = true;
  });

  it("rejects tampered ids before querying", async () => {
    const fake = createFakeClient();
    auth.client = fake.client;
    expect((await actions.toggleProductActive("1 or 1=1", true)).status).toBe("error");
    expect((await actions.saveProduct("x", idleState, form({ name: "X" }))).status).toBe("error");
    expect(fake.calls).toEqual([]);
  });

  it("returns field errors without writing invalid data", async () => {
    const fake = createFakeClient();
    auth.client = fake.client;
    const state = await actions.saveProduct(null, idleState, form({ name: "", price: "-1" }));
    expect(state.status).toBe("error");
    expect(state.fieldErrors).toHaveProperty("name");
    expect(state.fieldErrors).toHaveProperty("price_cents");
    expect(fake.calls).toEqual([]);
  });

  it("creates a product, refreshes the storefront and opens the edit page", async () => {
    const fake = createFakeClient({ query: () => ({ data: { id: ID }, error: null }) });
    auth.client = fake.client;
    await expect(actions.saveProduct(null, idleState, form({ name: "Novo", price: "12,50" }))).rejects.toMatchObject({
      url: `/admin/produtos/${ID}?criado=1`,
    });
    expect(cache.updateTag).toHaveBeenCalledWith("products");
  });

  it("saves edits and reports success", async () => {
    const fake = createFakeClient({ query: () => ({ data: [{ id: ID }], error: null }) });
    auth.client = fake.client;
    const state = await actions.saveProduct(ID, idleState, form({ name: "Editado", stock_quantity: "2" }));
    expect(state).toEqual({ status: "success", message: "Alterações salvas." });
  });

  it("explains why a product with orders can't be deleted", async () => {
    const fake = createFakeClient({ query: () => ({ data: null, error: { code: "23503" } }) });
    auth.client = fake.client;
    const state = await actions.removeProduct(ID);
    expect(state.status).toBe("error");
    expect(state.message).toMatch(/Desative-o/);
  });

  it("hides unexpected database errors behind a generic message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fake = createFakeClient({
      query: () => ({ data: null, error: { code: "08006", message: "connection to db.abc.supabase.co failed" } }),
    });
    auth.client = fake.client;
    const state = await actions.toggleProductActive(ID, false);
    expect(state).toEqual({ status: "error", message: "Não foi possível concluir a operação. Tente novamente." });
  });
});
