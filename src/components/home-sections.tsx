import { ArrowRight, PackageOpen } from "lucide-react";
import Link from "next/link";
import type { Category, Product } from "@/lib/products/types";
import { EmptyState } from "./empty-state";
import { ProductGrid } from "./product-grid";

// Home page sections, shared by the server page and the demo page.

export const FEATURED_LIMIT = 8;

// Background tones cycle through the categories, whatever their number.
const tones = [
  "bg-rose-light",
  "bg-surface-muted",
  "bg-accent-soft",
  "bg-surface border border-border",
];

export function CategoryLinks({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return <p className="mt-6 text-sm text-muted">As categorias estão sendo organizadas.</p>;
  }
  return (
    <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {categories.map((category, index) => (
        <li key={category.slug}>
          <Link
            href={`/produtos?categoria=${category.slug}`}
            className={`group relative flex h-36 flex-col justify-between overflow-hidden rounded-lg p-4 transition-colors sm:h-44 sm:p-6 ${tones[index % tones.length]} hover:bg-accent hover:text-accent-foreground`}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-12 -right-12 size-24 rounded-full border border-rose/60 transition-transform duration-500 group-hover:scale-110 group-hover:border-accent-foreground/30 sm:-top-14 sm:-right-14 sm:size-32"
            />
            <span aria-hidden className="text-xs font-semibold tracking-[0.18em] text-rose-strong group-hover:text-on-wine-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="relative">
              <span className="block font-display text-[1.6rem] leading-tight font-medium sm:text-3xl">
                {category.name}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-accent group-hover:text-accent-foreground">
                Ver produtos
                <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CategoriesSkeleton() {
  return (
    <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-lg bg-surface-muted sm:h-44" />
      ))}
    </div>
  );
}

export function FeaturedProductsView({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen aria-hidden strokeWidth={1.6} className="size-6" />}
        title="Novidades chegando"
        description="Os produtos estão sendo cadastrados. Volte em breve para conferir o catálogo."
      />
    );
  }
  return <ProductGrid products={products} />;
}
