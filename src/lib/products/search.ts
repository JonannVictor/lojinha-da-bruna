import type { Product, ProductFilters } from "./types";

/** Lowercase and strip accents so "perfumaria" matches "Perfumária". */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function filterProducts(
  products: Product[],
  { query, categorySlug, featuredOnly, limit }: ProductFilters = {},
): Product[] {
  const terms = query ? normalizeText(query).split(/\s+/).filter(Boolean) : [];

  const result = products.filter((product) => {
    if (!product.is_active) return false;
    if (featuredOnly && !product.is_featured) return false;
    if (categorySlug && product.category?.slug !== categorySlug) return false;
    if (terms.length === 0) return true;

    const haystack = normalizeText(
      [product.name, product.brand, product.description, product.category?.name]
        .filter(Boolean)
        .join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });

  return limit === undefined ? result : result.slice(0, limit);
}
