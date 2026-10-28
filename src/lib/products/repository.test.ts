import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

const { getCatalogSource, getProductsByIds, listProducts } = await import("./repository");

afterEach(() => vi.unstubAllEnvs());

function env(values: Record<string, string>) {
  for (const key of ["NEXT_PUBLIC_DEMO_MODE", "CATALOG_SOURCE", "VERCEL_ENV", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) {
    vi.stubEnv(key, values[key] ?? "");
  }
}

const supabase = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

describe("getCatalogSource", () => {
  it("is empty when nothing is configured (production keeps an empty catalog)", () => {
    env({});
    expect(getCatalogSource()).toBe("empty");
    env({ VERCEL_ENV: "production" });
    expect(getCatalogSource()).toBe("empty");
  });

  it("uses Supabase when its variables exist", () => {
    env(supabase);
    expect(getCatalogSource()).toBe("supabase");
  });

  it("never serves fictitious products in production", () => {
    env({ CATALOG_SOURCE: "demo", VERCEL_ENV: "production" });
    expect(getCatalogSource()).toBe("empty");
    env({ CATALOG_SOURCE: "demo", VERCEL_ENV: "production", ...supabase });
    expect(getCatalogSource()).toBe("supabase");
    env({ CATALOG_SOURCE: "demo", VERCEL_ENV: "preview", ...supabase });
    expect(getCatalogSource()).toBe("demo");
  });

  it("demo mode never reads Supabase, even when it is configured", () => {
    env({ NEXT_PUBLIC_DEMO_MODE: "true", ...supabase });
    expect(getCatalogSource()).toBe("demo");
    env({ NEXT_PUBLIC_DEMO_MODE: "false", ...supabase });
    expect(getCatalogSource()).toBe("supabase");
  });

  it("can be forced empty", () => {
    env({ CATALOG_SOURCE: "empty", ...supabase });
    expect(getCatalogSource()).toBe("empty");
  });
});

describe("demo source", () => {
  it("lists only active products and still reports inactive ones in the cart", async () => {
    env({ CATALOG_SOURCE: "demo" });
    const products = await listProducts();
    expect(products.every((p) => p.is_active)).toBe(true);
    const cartProducts = await getProductsByIds(["demo-07"]);
    expect(cartProducts).toHaveLength(1);
    expect(cartProducts[0].is_active).toBe(false);
  });
});
