import { describe, expect, it } from "vitest";
import { summarizeCart } from "../cart/summary";
import {
  canPurchase,
  getAvailability,
  MAX_QUANTITY_PER_ITEM,
  maxPurchasableQuantity,
} from "./availability";
import { demoProducts } from "./demo-data";
import { filterProducts } from "./search";
import type { Product } from "./types";

const base = demoProducts[0];
const make = (fields: Partial<Product>): Product => ({ ...base, ...fields });

describe("availability", () => {
  it("is available with confirmed price and stock", () => {
    const product = make({ price_cents: 1000, stock_quantity: 3 });
    expect(getAvailability(product)).toBe("available");
    expect(maxPurchasableQuantity(product)).toBe(3);
  });

  it("blocks purchase when out of stock, inactive or price pending", () => {
    expect(canPurchase(make({ stock_quantity: 0 }))).toBe(false);
    expect(canPurchase(make({ is_active: false }))).toBe(false);
    expect(getAvailability(make({ price_cents: null }))).toBe("price_pending");
    expect(maxPurchasableQuantity(make({ stock_quantity: 0 }))).toBe(0);
  });

  it("uses the per-item limit when stock is not tracked", () => {
    expect(maxPurchasableQuantity(make({ stock_quantity: null }))).toBe(
      MAX_QUANTITY_PER_ITEM,
    );
  });
});

describe("filterProducts", () => {
  it("never returns inactive products", () => {
    expect(filterProducts(demoProducts).every((p) => p.is_active)).toBe(true);
  });

  it("matches queries ignoring case and accents", () => {
    const products = [make({ id: "x", name: "Sérum Facial" })];
    expect(filterProducts(products, { query: "serum" })).toHaveLength(1);
    expect(filterProducts(products, { query: "SÉRUM fac" })).toHaveLength(1);
    expect(filterProducts(products, { query: "perfume" })).toHaveLength(0);
  });

  it("filters by category and limit", () => {
    const result = filterProducts(demoProducts, { categorySlug: "beleza" });
    expect(result.every((p) => p.category?.slug === "beleza")).toBe(true);
    expect(filterProducts(demoProducts, { limit: 2 })).toHaveLength(2);
  });
});

describe("summarizeCart", () => {
  it("uses server prices, clamps to stock and skips unavailable items", () => {
    const a = make({ id: "a", price_cents: 1500, stock_quantity: 2 });
    const b = make({ id: "b", stock_quantity: 0 });
    const { items, subtotalCents, hasUnavailable } = summarizeCart(
      [
        { productId: "a", quantity: 5 },
        { productId: "b", quantity: 1 },
        { productId: "gone", quantity: 1 },
      ],
      [a, b],
    );
    expect(subtotalCents).toBe(3000);
    expect(hasUnavailable).toBe(true);
    expect(items.map((i) => i.purchasable)).toEqual([true, false, false]);
    expect(items[2].product).toBeNull();
  });
});
