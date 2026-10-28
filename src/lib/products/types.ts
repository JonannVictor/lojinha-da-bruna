// Domain types for the catalog. Field names use snake_case so they map 1:1 to
// the future Supabase columns. See docs/decisoes.md for the rationale.

export type Category = {
  slug: string;
  name: string;
};

export type ProductImage = {
  url: string;
  alt: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  /** null while the owner has not confirmed a description. */
  description: string | null;
  /** Price in cents (BRL). null means "price pending confirmation". */
  price_cents: number | null;
  images: ProductImage[];
  category: Category | null;
  brand: string | null;
  /** null means stock is not tracked for this product. */
  stock_quantity: number | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductFilters = {
  query?: string;
  categorySlug?: string;
  featuredOnly?: boolean;
  limit?: number;
};
