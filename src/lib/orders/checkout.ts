import { parseCart, type CartLine } from "@/lib/cart/cart";
import { MAX_QUANTITY_PER_ITEM } from "@/lib/products/availability";

// Validation of the checkout form. The cart sent by the browser is only a
// list of product ids and quantities; prices, names and availability are
// resolved by public.create_order in the database.

export const MAX_ORDER_LINES = 50;

export type CheckoutInput = {
  customerName: string;
  customerPhone: string | null;
  deliveryAddress: string | null;
  lines: CartLine[];
};

export type CheckoutField = "customerName" | "customerPhone" | "deliveryAddress" | "cart";

export type CheckoutParse =
  | { ok: true; data: CheckoutInput }
  | { ok: false; errors: Partial<Record<CheckoutField, string>> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function parseCheckoutForm(formData: FormData): CheckoutParse {
  const errors: Partial<Record<CheckoutField, string>> = {};

  const customerName = text(formData, "customerName");
  if (customerName.length < 2 || customerName.length > 120) {
    errors.customerName = "Informe seu nome (2 a 120 caracteres).";
  }

  const customerPhone = text(formData, "customerPhone");
  const phoneDigits = customerPhone.replace(/\D/g, "");
  if (
    customerPhone &&
    (!/^[\d\s()+-]+$/.test(customerPhone) || phoneDigits.length < 10 || phoneDigits.length > 13 || customerPhone.length > 30)
  ) {
    errors.customerPhone = "Informe o telefone com DDD, ou deixe em branco.";
  }

  const deliveryAddress = text(formData, "deliveryAddress");
  if (deliveryAddress.length > 500) errors.deliveryAddress = "Use no máximo 500 caracteres.";

  let lines: CartLine[] = [];
  try {
    const raw = text(formData, "cart");
    lines = raw.length <= 10_000 ? parseCart(JSON.parse(raw)) : [];
  } catch {
    lines = [];
  }
  lines = lines.filter(
    (line) => UUID.test(line.productId) && line.quantity <= MAX_QUANTITY_PER_ITEM,
  );
  if (lines.length === 0) errors.cart = "Seu carrinho está vazio.";
  else if (lines.length > MAX_ORDER_LINES) errors.cart = "Seu carrinho tem itens demais.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      customerName,
      customerPhone: customerPhone || null,
      deliveryAddress: deliveryAddress || null,
      lines,
    },
  };
}
