import { normalizeText } from "@/lib/products/search";

// Server-side validation of admin forms. The limits mirror the database
// constraints (supabase/migrations), so a value accepted here is also
// accepted by Postgres, and the user gets a field-level message instead of a
// generic database error.

export const LIMITS = {
  productName: 120,
  productSlug: 140,
  brand: 80,
  description: 5000,
  categoryName: 60,
  categorySlug: 80,
  maxPriceCents: 9_999_999,
  maxStock: 100_000,
} as const;

export type ProductInput = {
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  category_id: string | null;
  price_cents: number | null;
  stock_quantity: number | null;
  is_active: boolean;
  is_featured: boolean;
};

export type CategoryInput = {
  name: string;
  slug: string;
};

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export type ParseResult<T, K extends string> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors<K> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** "Sérum Facial 30 ml" → "serum-facial-30-ml" */
export function slugify(text: string): string {
  return normalizeText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Parses a price typed in Brazilian format into cents.
 * "" → null (price to be confirmed); "12,90", "1.234,56", "R$ 12", "12.5" → cents.
 * Returns "invalid" for anything else (letters, negatives, 3+ decimals, zero).
 */
export function parsePriceToCents(raw: string): number | null | "invalid" {
  const value = raw.replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (value === "") return null;

  let normalized: string;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(value)) {
    normalized = value.replace(/\./g, "").replace(",", "."); // 1.234,56
  } else if (/^\d+(,\d{1,2})?$/.test(value)) {
    normalized = value.replace(",", "."); // 1234,56
  } else if (/^\d+(\.\d{1,2})?$/.test(value)) {
    normalized = value; // 1234.56
  } else {
    return "invalid";
  }

  const [units, decimals = ""] = normalized.split(".");
  const cents = Number(units) * 100 + Number(decimals.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0) return "invalid";
  return cents;
}

/** Whole, non-negative quantity. "" → null (stock not tracked). */
export function parseStock(raw: string): number | null | "invalid" {
  if (raw === "") return null;
  if (!/^\d+$/.test(raw)) return "invalid";
  const value = Number(raw);
  return value <= LIMITS.maxStock ? value : "invalid";
}

export function centsToInput(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

type ProductField = keyof ProductInput;

export function parseProductForm(formData: FormData): ParseResult<ProductInput, ProductField> {
  const errors: FieldErrors<ProductField> = {};

  const name = text(formData, "name");
  if (!name) errors.name = "Informe o nome do produto.";
  else if (name.length > LIMITS.productName) errors.name = `Use no máximo ${LIMITS.productName} caracteres.`;

  const slug = text(formData, "slug") || slugify(name);
  if (!slug) errors.slug = "Informe o endereço (slug) do produto.";
  else if (!SLUG.test(slug)) errors.slug = "Use apenas letras minúsculas sem acento, números e hífens.";
  else if (slug.length > LIMITS.productSlug) errors.slug = `Use no máximo ${LIMITS.productSlug} caracteres.`;

  const description = text(formData, "description");
  if (description.length > LIMITS.description) {
    errors.description = `Use no máximo ${LIMITS.description} caracteres.`;
  }

  const brand = text(formData, "brand");
  if (brand.length > LIMITS.brand) errors.brand = `Use no máximo ${LIMITS.brand} caracteres.`;

  const categoryId = text(formData, "category_id");
  if (categoryId && !isUuid(categoryId)) errors.category_id = "Categoria inválida.";

  const price = parsePriceToCents(text(formData, "price"));
  if (price === "invalid") errors.price_cents = "Informe um valor maior que zero, como 29,90.";
  else if (price !== null && price > LIMITS.maxPriceCents) errors.price_cents = "Valor acima do permitido.";

  const stock = parseStock(text(formData, "stock_quantity"));
  if (stock === "invalid") {
    errors.stock_quantity = `Informe um número inteiro entre 0 e ${LIMITS.maxStock}, ou deixe em branco.`;
  }

  const isActive = formData.get("is_active") === "on";
  // A product can be published without a price ("preço a confirmar"): it is
  // shown but can't be bought. That's the Etapa 1 behavior, kept on purpose.

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name,
      slug,
      description: description || null,
      brand: brand || null,
      category_id: categoryId || null,
      price_cents: price as number | null,
      stock_quantity: stock as number | null,
      is_active: isActive,
      is_featured: formData.get("is_featured") === "on",
    },
  };
}

export function parseCategoryForm(formData: FormData): ParseResult<CategoryInput, keyof CategoryInput> {
  const errors: FieldErrors<keyof CategoryInput> = {};

  const name = text(formData, "name");
  if (!name) errors.name = "Informe o nome da categoria.";
  else if (name.length > LIMITS.categoryName) errors.name = `Use no máximo ${LIMITS.categoryName} caracteres.`;

  const slug = text(formData, "slug") || slugify(name);
  if (!slug) errors.slug = "Informe o endereço (slug) da categoria.";
  else if (!SLUG.test(slug)) errors.slug = "Use apenas letras minúsculas sem acento, números e hífens.";
  else if (slug.length > LIMITS.categorySlug) errors.slug = `Use no máximo ${LIMITS.categorySlug} caracteres.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { name, slug } };
}
