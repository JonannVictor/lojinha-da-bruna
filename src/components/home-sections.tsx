import { ArrowRight, PackageOpen } from "lucide-react";
import Link from "next/link";
import type { Category, Product } from "@/lib/products/types";
import { EmptyState } from "./empty-state";
import { ProductGrid } from "./product-grid";

// Home page sections, shared by the server page and the demo page.

export const FEATURED_LIMIT = 8;

export function CategoryLinks({ categories }: { categories: Category[] }) {
  return (
    <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {categories.map((category) => (
        <li key={category.slug}>
          <Link
            href={`/produtos?categoria=${category.slug}`}
            className="flex h-full items-center justify-between gap-2 rounded-2xl border border-border bg-surface px-4 py-5 font-medium transition-colors hover:border-accent hover:text-accent"
          >
            {category.name}
            <ArrowRight aria-hidden className="size-4 shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CategoriesSkeleton() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-muted" />
      ))}
    </div>
  );
}

export function FeaturedProductsView({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen aria-hidden className="size-6" />}
        title="Novidades chegando"
        description="Os produtos estão sendo cadastrados. Volte em breve para conferir o catálogo."
      />
    );
  }
  return <ProductGrid products={products} />;
}
