// Commercial information shown in the storefront. Every field marked as
// pending is null until the owner confirms it — never fill it with guesses.
// See docs/configuracao.md.

/** Keeps digits only and requires country code + area code (e.g. 55 + DDD). */
export function parseWhatsappNumber(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 12 && digits.length <= 13 ? digits : null;
}

export const storeConfig = {
  name: "Lojinha da Bruna",
  tagline: "Beleza, perfumaria, cuidados pessoais e variedades",
  /** Pending: provided via the WHATSAPP_NUMBER environment variable. */
  whatsappNumber: parseWhatsappNumber(process.env.WHATSAPP_NUMBER),
  /** Pending confirmation by the owner. */
  instagramUrl: null as string | null,
  /** Pending confirmation by the owner. */
  city: null as string | null,
  /** Pending confirmation by the owner. */
  businessHours: null as string | null,
};
