import {
  canPurchase,
  maxPurchasableQuantity,
} from "@/lib/products/availability";
import type { Product } from "@/lib/products/types";
import type { CartLine } from "./cart";

export type CartItem = {
  line: CartLine;
  /** null when the product no longer exists in the catalog. */
  product: Product | null;
  purchasable: boolean;
  maxQuantity: number;
  /** Line total in cents; 0 for items that can't be purchased. */
  totalCents: number;
};

/** Joins cart lines with server data. Unavailable items don't count. */
export function summarizeCart(lines: CartLine[], products: Product[]) {
  const byId = new Map(products.map((p) => [p.id, p]));

  const items: CartItem[] = lines.map((line) => {
    const product = byId.get(line.productId) ?? null;
    const purchasable = product !== null && canPurchase(product);
    const quantity = purchasable
      ? Math.min(line.quantity, maxPurchasableQuantity(product))
      : 0;
    return {
      line,
      product,
      purchasable,
      maxQuantity: product ? maxPurchasableQuantity(product) : 0,
      totalCents: purchasable ? quantity * (product.price_cents ?? 0) : 0,
    };
  });

  return {
    items,
    subtotalCents: items.reduce((sum, item) => sum + item.totalCents, 0),
    hasUnavailable: items.some((item) => !item.purchasable),
  };
}
