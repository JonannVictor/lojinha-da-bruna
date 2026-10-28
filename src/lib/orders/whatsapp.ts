import { formatPrice } from "@/lib/money";

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
