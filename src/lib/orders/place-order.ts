import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { storeConfig } from "@/config/store";
import { getCatalogSource } from "@/lib/products/repository";
import { logSupabaseError, toDataSourceError } from "@/lib/supabase/errors";
import { createServiceClient } from "@/lib/supabase/service-client";
import type { CheckoutInput } from "./checkout";
import { buildOrderMessage, buildWhatsappUrl, type SavedOrder } from "./whatsapp";

// Order creation. Saving the order before opening WhatsApp is only possible
// when the Supabase catalog and the server secret key exist. Otherwise (no
// Supabase yet, or demo mode) the cart opens WhatsApp directly with the cart
// contents (buildCartWhatsappLink) and nothing is persisted by the site.

export function isCheckoutEnabled(): boolean {
  return getCatalogSource() === "supabase" && Boolean(process.env.SUPABASE_SECRET_KEY?.trim());
}

export type PlaceOrderResult =
  | { ok: true; orderId: string; whatsappUrl: string }
  | { ok: false; reason: "disabled" | "unavailable" | "invalid" | "error"; message: string };

const UNAVAILABLE = new Set(["product_unavailable", "price_pending", "insufficient_stock"]);
const INVALID = new Set(["invalid_customer", "invalid_items", "duplicate_item", "invalid_quantity"]);

/**
 * Persists the order through public.create_order (one transaction: either the
 * order and all its items are saved, or nothing is) and only then builds the
 * WhatsApp link from the saved data.
 */
export async function placeOrder(
  input: CheckoutInput,
  client: SupabaseClient | null = isCheckoutEnabled() ? createServiceClient() : null,
  whatsappNumber: string | null = storeConfig.whatsappNumber,
): Promise<PlaceOrderResult> {
  if (!client || !whatsappNumber) {
    return {
      ok: false,
      reason: "disabled",
      message: "A finalização de pedidos ainda não está disponível.",
    };
  }

  const { data, error } = await client.rpc("create_order", {
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_delivery_address: input.deliveryAddress,
    p_items: input.lines.map((line) => ({ product_id: line.productId, quantity: line.quantity })),
  });

  if (error) {
    if (error.code === "P0001" && UNAVAILABLE.has(error.message)) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Alguns itens mudaram de preço ou disponibilidade. Revise o carrinho e tente novamente.",
      };
    }
    if (error.code === "P0001" && INVALID.has(error.message)) {
      return { ok: false, reason: "invalid", message: "Confira os dados do pedido e tente novamente." };
    }
    logSupabaseError("criar pedido", error);
    return {
      ok: false,
      reason: "error",
      message: "Não foi possível registrar o pedido agora. Tente novamente em instantes.",
    };
  }

  const created = (Array.isArray(data) ? data[0] : data) as
    | { order_id: string; subtotal_cents: number | string }
    | undefined;
  if (!created?.order_id) {
    console.error("[supabase] criar pedido: resposta sem order_id");
    return { ok: false, reason: "error", message: "Não foi possível registrar o pedido agora." };
  }

  const order = await loadSavedOrder(client, created.order_id);
  return {
    ok: true,
    orderId: order.id,
    whatsappUrl: buildWhatsappUrl(whatsappNumber, buildOrderMessage(order)),
  };
}

async function loadSavedOrder(client: SupabaseClient, orderId: string): Promise<SavedOrder> {
  const { data, error } = await client
    .from("orders")
    .select(
      "id, customer_name, delivery_address, subtotal_cents, order_items(product_name, quantity, unit_price_cents, line_total_cents)",
    )
    .eq("id", orderId)
    .single();
  if (error) throw toDataSourceError("ler pedido criado", error);

  type Row = {
    id: string;
    customer_name: string;
    delivery_address: string | null;
    subtotal_cents: number | string;
    order_items: { product_name: string; quantity: number; unit_price_cents: number; line_total_cents: number }[];
  };
  const row = data as unknown as Row;
  return {
    id: row.id,
    customerName: row.customer_name,
    deliveryAddress: row.delivery_address,
    subtotalCents: Number(row.subtotal_cents),
    items: row.order_items
      .map((item) => ({
        name: item.product_name,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        lineTotalCents: item.line_total_cents,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  };
}
