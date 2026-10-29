import type { Product } from "@/lib/products/types";
import { ProductCard } from "./product-card";

const gridClass = "grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4";

/** `priorityCount`: how many leading photos are above the fold on load. */
export function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  return (
    <ul className={gridClass}>
      {products.map((product, index) => (
        <li key={product.id} className="flex">
          <ProductCard product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Carregando produtos…</span>
      <ul aria-hidden className={gridClass}>
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <div className="aspect-square animate-pulse rounded-md bg-surface-muted" />
            <div className="space-y-2 pt-4">
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-1/4 animate-pulse rounded bg-surface-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
