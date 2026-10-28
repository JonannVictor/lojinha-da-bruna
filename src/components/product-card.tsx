import Link from "next/link";
import type { Product } from "@/lib/products/types";
import { AvailabilityBadge } from "./availability-badge";
import { ProductImage } from "./product-image";
import { ProductPrice } from "./product-price";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-accent/40">
      <ProductImage
        image={product.images[0]}
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
      />
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        {product.brand && (
          <p className="text-xs tracking-wide text-muted uppercase">
            {product.brand}
          </p>
        )}
        <h3 className="text-sm leading-snug font-medium sm:text-base">
          <Link
            href={`/produtos/${product.slug}`}
            className="after:absolute after:inset-0 group-hover:text-accent"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <ProductPrice cents={product.price_cents} className="text-sm sm:text-base" />
          <AvailabilityBadge product={product} />
        </div>
      </div>
    </article>
  );
}
