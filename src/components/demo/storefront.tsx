"use client";

import { SearchX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ButtonLink } from "@/components/button-link";
import { CatalogResults, CatalogSkeleton } from "@/components/catalog-results";
import { EmptyState } from "@/components/empty-state";
import {
  CategoriesSkeleton,
  CategoryLinks,
  FEATURED_LIMIT,
  FeaturedProductsView,
} from "@/components/home-sections";
import { ProductDetailSkeleton, ProductDetailView } from "@/components/product-detail";
import { ProductGridSkeleton } from "@/components/product-grid";
import { storefrontCategories, storefrontProducts } from "@/lib/demo/model";
import { useDemoSnapshot } from "@/lib/demo/store";
import { filterProducts } from "@/lib/products/search";

// Storefront pages in demo mode. Same components and the same filtering rules
// as the server pages; the data comes from the browser (see lib/demo/store).

function useStorefront() {
  const snapshot = useDemoSnapshot();
  const state = snapshot?.state;
  return useMemo(
    () => (state ? { products: storefrontProducts(state), categories: storefrontCategories(state) } : null),
    [state],
  );
}

export function DemoCategories() {
  const store = useStorefront();
  if (!store) return <CategoriesSkeleton />;
  return <CategoryLinks categories={store.categories} />;
}

export function DemoFeaturedProducts() {
  const store = useStorefront();
  if (!store) return <ProductGridSkeleton count={4} />;
  const featured = filterProducts(store.products, { featuredOnly: true, limit: FEATURED_LIMIT });
  // No product marked as featured: fall back to the first active ones.
  const products = featured.length > 0 ? featured : filterProducts(store.products, { limit: FEATURED_LIMIT });
  return <FeaturedProductsView products={products} />;
}

export function DemoCatalog() {
  const store = useStorefront();
  const params = useSearchParams();
  if (!store) return <CatalogSkeleton />;

  const query = params.get("q")?.trim() ?? "";
  const activeCategory = store.categories.find((c) => c.slug === params.get("categoria")?.trim());
  const products = filterProducts(store.products, {
    query: query || undefined,
    categorySlug: activeCategory?.slug,
  });
  return (
    <CatalogResults
      categories={store.categories}
      activeCategory={activeCategory}
      query={query}
      products={products}
    />
  );
}

export function DemoProductDetail({
  slug,
  whatsappNumber,
  storeName,
}: {
  slug: string;
  whatsappNumber: string;
  storeName: string;
}) {
  const store = useStorefront();
  if (!store) return <ProductDetailSkeleton />;

  // Inactive products are not in the list, exactly like the public store.
  const product = store.products.find((p) => p.slug === slug);
  if (!product) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={<SearchX aria-hidden className="size-6" />}
          title="Produto não encontrado"
          description="Este produto não existe ou não está disponível na loja."
          action={<ButtonLink href="/produtos">Ver produtos</ButtonLink>}
        />
      </div>
    );
  }
  return <ProductDetailView product={product} whatsappNumber={whatsappNumber} storeName={storeName} />;
}
