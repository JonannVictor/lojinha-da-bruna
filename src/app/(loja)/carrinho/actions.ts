"use server";

import { parseCheckoutForm } from "@/lib/orders/checkout";
import { isCheckoutEnabled, placeOrder } from "@/lib/orders/place-order";
import { getProductsByIds } from "@/lib/products/repository";
import type { Product } from "@/lib/products/types";

const MAX_CART_LINES = 50;

/**
 * Returns the current catalog data for the products in the browser cart, so
 * prices and availability always come from the server, never from storage.
 */
export async function getCartProducts(ids: unknown): Promise<Product[]> {
  if (!Array.isArray(ids)) return [];
  const valid = ids
    .filter((id): id is string => typeof id === "string" && id.length <= 100)
    .slice(0, MAX_CART_LINES);
  return getProductsByIds(valid);
}

export type CheckoutState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string | undefined>; refreshCart?: boolean }
  | { status: "success"; whatsappUrl: string };

/**
 * Saves the order (prices, stock and availability re-checked in the
 * database) and only then returns the WhatsApp link. Refuses everything
 * while checkout is disabled (WhatsApp number not configured).
 */
export async function submitOrder(_state: CheckoutState, formData: FormData): Promise<CheckoutState> {
  if (!isCheckoutEnabled()) {
    return { status: "error", message: "A finalização de pedidos ainda não está disponível." };
  }

  const parsed = parseCheckoutForm(formData);
  if (!parsed.ok) {
    return {
      status: "error",
      message: parsed.errors.cart ?? "Confira os dados destacados.",
      fieldErrors: parsed.errors,
    };
  }

  try {
    const result = await placeOrder(parsed.data);
    if (!result.ok) {
      return { status: "error", message: result.message, refreshCart: result.reason === "unavailable" };
    }
    return { status: "success", whatsappUrl: result.whatsappUrl };
  } catch (error) {
    console.error("[pedido] falha ao registrar:", error instanceof Error ? error.message : error);
    return { status: "error", message: "Não foi possível registrar o pedido agora. Tente novamente em instantes." };
  }
}
