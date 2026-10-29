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

// Messages use WhatsApp formatting: *bold* for headings, names and totals,
// _italic_ for notes. Asterisks and underscores in product or customer text
// would toggle that formatting, so they are removed from interpolated values.

function plain(text: string): string {
  return text.replace(/[*_~]/g, "").trim();
}

type ItemLine = { name: string; quantity: number; unitPriceCents: number; lineTotalCents?: number };

function itemBlocks(items: ItemLine[]): string[] {
  return items.flatMap((item, index) => [
    `*${index + 1}. ${plain(item.name)}*`,
    `${item.quantity} un. × ${formatPrice(item.unitPriceCents)} = ${formatPrice(item.lineTotalCents ?? item.quantity * item.unitPriceCents)}`,
    "",
  ]);
}

export function buildOrderMessage(order: SavedOrder): string {
  const lines = [
    "Olá, Bruna! Tudo bem?",
    `Gostaria de confirmar o pedido *#${orderReference(order.id)}*, feito pelo site.`,
    "",
    "*RESUMO DO PEDIDO*",
    "",
    ...itemBlocks(order.items),
    `*Subtotal: ${formatPrice(order.subtotalCents)}*`,
    "",
    "*DADOS DO CLIENTE*",
    `Nome: ${plain(order.customerName)}`,
  ];
  if (order.deliveryAddress) lines.push(`Endereço: ${plain(order.deliveryAddress)}`);
  lines.push("", "Aguardo a confirmação. Desde já, agradeço!");
  return lines.join("\n");
}

export function buildWhatsappUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// ---------------------------------------------------------------------------
// Direct link from the cart (no order saved by the site)
// ---------------------------------------------------------------------------

/**
 * First line of every message sent from the demonstration: the link opens
 * the store's real WhatsApp, so Bruna must be able to tell a test apart from
 * a real order even if it is sent by mistake.
 */
export const DEMO_MESSAGE_HEADER =
  "[DEMONSTRAÇÃO] Mensagem de teste: os produtos são fictícios e este não é um pedido real.";

type MessageOptions = { demo?: boolean };

function withDemoHeader(lines: string[], demo: boolean): string[] {
  return demo ? [DEMO_MESSAGE_HEADER, "", ...lines] : lines;
}

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
  { demo = false }: MessageOptions = {},
): { url: string; message: string; totalCents: number } | null {
  const lines = items.flatMap((item) => {
    if (!item.purchasable || !item.product || item.product.price_cents === null) return [];
    const quantity = Math.min(item.line.quantity, item.maxQuantity);
    if (quantity <= 0) return [];
    return [{ name: item.product.name, quantity, unitPriceCents: item.product.price_cents }];
  });
  if (lines.length === 0) return null;

  const totalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const message = withDemoHeader([
    "Olá, Bruna! Tudo bem?",
    `Gostaria de fazer um pedido pelo site da *${plain(storeName)}*.`,
    "",
    "*RESUMO DO PEDIDO*",
    "",
    ...itemBlocks(lines),
    `*Total dos produtos: ${formatPrice(totalCents)}*`,
    "_Valor referente apenas aos produtos. Entrega e forma de pagamento a combinar._",
    "",
    "Aguardo a confirmação da disponibilidade. Desde já, agradeço!",
  ], demo).join("\n");

  return { url: buildWhatsappUrl(number, message), message, totalCents };
}

/** First message about one product, from the product page. */
export function buildProductWhatsappUrl(
  number: string,
  storeName: string,
  product: Pick<Product, "name" | "brand" | "price_cents">,
  { demo = false }: MessageOptions = {},
): string {
  const lines = [
    "Olá, Bruna! Tudo bem?",
    `Vi no site da *${plain(storeName)}* o produto abaixo e gostaria de mais informações:`,
    "",
    `*${plain(product.name)}*`,
  ];
  if (product.brand) lines.push(`Marca: ${plain(product.brand)}`);
  if (product.price_cents !== null) lines.push(`Preço no site: ${formatPrice(product.price_cents)}`);
  lines.push("", "Aguardo seu retorno. Desde já, agradeço!");
  return buildWhatsappUrl(number, withDemoHeader(lines, demo).join("\n"));
}
