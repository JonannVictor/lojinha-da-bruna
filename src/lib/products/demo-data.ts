import { initialCategories } from "./categories";
import type { Product } from "./types";

// FICTITIOUS records used only to exercise the interface in development and
// preview environments (CATALOG_SOURCE=demo). They are not real products,
// have no photos on purpose and are never served in production.
// See getCatalogSource() in repository.ts.

const [beleza, perfumaria, cuidados, variedades] = initialCategories;
const timestamp = "2026-01-01T00:00:00.000Z";

function demo(
  n: number,
  fields: Pick<Product, "category" | "price_cents" | "stock_quantity"> &
    Partial<Pick<Product, "is_active" | "is_featured" | "description">>,
): Product {
  const code = String(n).padStart(2, "0");
  return {
    id: `demo-${code}`,
    name: `Produto de demonstração ${code}`,
    slug: `produto-demonstracao-${code}`,
    description:
      "Texto de demonstração. Este item é fictício e não está à venda.",
    images: [],
    brand: "Marca de demonstração",
    is_active: true,
    is_featured: false,
    created_at: timestamp,
    updated_at: timestamp,
    ...fields,
  };
}

export const demoProducts: Product[] = [
  demo(1, { category: beleza, price_cents: 1000, stock_quantity: 5, is_featured: true }),
  demo(2, { category: perfumaria, price_cents: 2000, stock_quantity: null, is_featured: true }),
  demo(3, { category: cuidados, price_cents: 3000, stock_quantity: 0, is_featured: true }),
  demo(4, { category: variedades, price_cents: null, stock_quantity: 3, is_featured: true }),
  demo(5, { category: beleza, price_cents: 4000, stock_quantity: 1, description: null }),
  demo(6, { category: perfumaria, price_cents: 5000, stock_quantity: 2 }),
  // Inactive: must never appear in the storefront.
  demo(7, { category: variedades, price_cents: 6000, stock_quantity: 10, is_active: false }),
];
