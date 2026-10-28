import type { Product } from "@/lib/products/types";
import { ProductCard } from "./product-card";

const gridClass = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className={gridClass}>
      {products.map((product) => (
        <li key={product.id} className="flex">
          <ProductCard product={product} />
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
          <li
            key={i}
            className="overflow-hidden rounded-2xl border border-border bg-surface"
          >
            <div className="aspect-square animate-pulse bg-surface-muted" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-1/3 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
