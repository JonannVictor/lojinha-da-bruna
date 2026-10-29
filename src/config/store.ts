// Commercial information shown in the storefront. Every field marked as
// pending is null until the owner confirms it — never fill it with guesses.
// See docs/configuracao.md.

import { resolvePixReceiver } from "@/lib/payments/pix";

/**
 * Official number that receives the orders (+55 54 8139-4629), digits only:
 * country code 55 + area code 54 + number. To change it, edit this line.
 * WHATSAPP_NUMBER can override it per environment (e.g. a test number).
 */
const STORE_WHATSAPP_NUMBER = "555481394629";

/**
 * Pix that receives the payments: the cart shows a QR Code with the products
 * total. Pending confirmation by the owner; while all three are null the QR
 * Code is hidden and messages say payment is arranged in the chat.
 * - key: CPF/CNPJ, e-mail, random key, or phone WITH +55 ("+5554981394629");
 * - receiverName: account holder, as the bank shows it;
 * - city: the holder's city.
 */
const STORE_PIX = {
  key: null as string | null,
  receiverName: null as string | null,
  city: null as string | null,
};

/** Keeps digits only and requires country code + area code (e.g. 55 + DDD). */
export function parseWhatsappNumber(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 12 && digits.length <= 13 ? digits : null;
}

/** The override when it is a valid number; otherwise the official one. */
export function resolveWhatsappNumber(override: string | undefined): string {
  return parseWhatsappNumber(override) ?? STORE_WHATSAPP_NUMBER;
}

export const storeConfig = {
  name: "Lojinha da Bruna",
  tagline: "Beleza, perfumaria, cuidados pessoais e variedades",
  /** Read on the server only; pages pass it to client components as a prop. */
  whatsappNumber: resolveWhatsappNumber(process.env.WHATSAPP_NUMBER),
  /** null until STORE_PIX is filled in. */
  pix: resolvePixReceiver(STORE_PIX),
  /** Pending confirmation by the owner. */
  instagramUrl: null as string | null,
  /** Pending confirmation by the owner. */
  city: null as string | null,
  /** Pending confirmation by the owner. */
  businessHours: null as string | null,
};
