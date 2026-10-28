import type { Product } from "./types";

/** Upper bound per cart line when stock is not tracked. */
export const MAX_QUANTITY_PER_ITEM = 20;

export type Availability =
  | "available"
  | "out_of_stock"
  | "price_pending"
  | "inactive";

export function getAvailability(product: Product): Availability {
  if (!product.is_active) return "inactive";
  if (product.stock_quantity !== null && product.stock_quantity <= 0) {
    return "out_of_stock";
  }
  // A product without a confirmed price can't be sold: the order total
  // would be unknown.
  if (product.price_cents === null) return "price_pending";
  return "available";
}

export function canPurchase(product: Product): boolean {
  return getAvailability(product) === "available";
}

export function maxPurchasableQuantity(product: Product): number {
  if (!canPurchase(product)) return 0;
  if (product.stock_quantity === null) return MAX_QUANTITY_PER_ITEM;
  return Math.min(product.stock_quantity, MAX_QUANTITY_PER_ITEM);
}

export const availabilityLabel: Record<Availability, string> = {
  available: "Disponível",
  out_of_stock: "Esgotado",
  price_pending: "Preço a confirmar",
  inactive: "Indisponível",
};
