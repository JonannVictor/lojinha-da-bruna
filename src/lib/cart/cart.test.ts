import { describe, expect, it } from "vitest";
import { addItem, countItems, parseCart, removeItem, setQuantity } from "./cart";

describe("cart", () => {
  it("adds a new line and accumulates quantity on the same product", () => {
    let lines = addItem([], "a", 2, 10);
    lines = addItem(lines, "a", 3, 10);
    expect(lines).toEqual([{ productId: "a", quantity: 5 }]);
  });

  it("never exceeds the max quantity", () => {
    const lines = addItem([{ productId: "a", quantity: 4 }], "a", 3, 5);
    expect(lines).toEqual([{ productId: "a", quantity: 5 }]);
  });

  it("does not add anything when max is 0 (unavailable product)", () => {
    expect(addItem([], "a", 1, 0)).toEqual([]);
  });

  it("removes the line when quantity goes to 0", () => {
    expect(setQuantity([{ productId: "a", quantity: 2 }], "a", 0, 10)).toEqual([]);
  });

  it("removes and counts items", () => {
    const lines = [
      { productId: "a", quantity: 2 },
      { productId: "b", quantity: 3 },
    ];
    expect(countItems(lines)).toBe(5);
    expect(removeItem(lines, "a")).toEqual([{ productId: "b", quantity: 3 }]);
  });

  it("drops malformed data read from storage", () => {
    expect(parseCart("x")).toEqual([]);
    expect(
      parseCart([
        { productId: "a", quantity: 1 },
        { productId: "a", quantity: 2 },
        { productId: "b", quantity: -1 },
        { productId: "c", quantity: 1.5 },
        { productId: 3, quantity: 1 },
        null,
      ]),
    ).toEqual([{ productId: "a", quantity: 1 }]);
  });
});
