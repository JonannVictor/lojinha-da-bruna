import type { CartItem } from "@/lib/cart/summary";
import { formatPrice } from "@/lib/money";
import type { Product } from "@/lib/products/types";

// WhatsApp message for an order that is ALREADY saved in the database. Every
// value comes from the persisted order (server prices), never from the cart.

export type SavedOrder = {
  id: string;
  customerName: string;
  deliveryAddress: string | null;
  subtotalCents: number;
  items: { name: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
};

/** Short, human-friendly reference for the order (first 8 hex digits). */
export function orderReference(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function buildOrderMessage(order: SavedOrder): string {
  const lines = [
    `Olá, Bruna! Quero confirmar o pedido ${orderReference(order.id)}.`,
    "",
    ...order.items.map(
      (item) => `• ${item.quantity}× ${item.name} — ${formatPrice(item.lineTotalCents)}`,
    ),
    "",
    `Subtotal: ${formatPrice(order.subtotalCents)}`,
    `Nome: ${order.customerName}`,
  ];
  if (order.deliveryAddress) lines.push(`Endereço: ${order.deliveryAddress}`);
  return lines.join("\n");
}

export function buildWhatsappUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// ---------------------------------------------------------------------------
// Direct link from the cart (no order saved by the site)
// ---------------------------------------------------------------------------

/**
 * Builds the WhatsApp link with the cart contents. Only purchasable items go
 * into the message, with the quantity and price of the current catalog data
 * (summarizeCart already clamps quantities to the stock). Returns null when
 * nothing can be ordered: empty cart or every item unavailable.
 *
 * The message only REQUESTS the order: the customer reviews and sends it,
 * and Bruna confirms availability, delivery and payment in the chat.
 */
export function buildCartWhatsappLink(
  number: string,
  storeName: string,
  items: CartItem[],
): { url: string; message: string; totalCents: number } | null {
  const lines = items.flatMap((item) => {
    if (!item.purchasable || !item.product || item.product.price_cents === null) return [];
    const quantity = Math.min(item.line.quantity, item.maxQuantity);
    if (quantity <= 0) return [];
    return [{ name: item.product.name, quantity, unitPriceCents: item.product.price_cents }];
  });
  if (lines.length === 0) return null;

  const totalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const message = [
    `Olá, Bruna! Gostaria de fazer um pedido na ${storeName}:`,
    "",
    ...lines.flatMap((line, index) => [
      `${index + 1}. ${line.name}`,
      `   Quantidade: ${line.quantity}`,
      `   Preço unitário: ${formatPrice(line.unitPriceCents)}`,
      `   Subtotal: ${formatPrice(line.quantity * line.unitPriceCents)}`,
    ]),
    "",
    `Total dos produtos: ${formatPrice(totalCents)}`,
    "",
    "O valor acima corresponde apenas aos produtos. Entrega e pagamento a combinar.",
    "Aguardo a confirmação da disponibilidade.",
  ].join("\n");

  return { url: buildWhatsappUrl(number, message), message, totalCents };
}

/** First message about one product, from the product page. */
export function buildProductWhatsappUrl(
  number: string,
  storeName: string,
  product: Pick<Product, "name" | "brand" | "price_cents">,
): string {
  const name = product.brand ? `“${product.name}” (${product.brand})` : `“${product.name}”`;
  const lines = [`Olá, Bruna! Vi na ${storeName} o produto ${name} e gostaria de mais informações.`];
  if (product.price_cents !== null) lines.push(`Preço no site: ${formatPrice(product.price_cents)}.`);
  return buildWhatsappUrl(number, lines.join("\n"));
}
