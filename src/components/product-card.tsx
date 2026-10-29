import Link from "next/link";
import { canPurchase, maxPurchasableQuantity } from "@/lib/products/availability";
import type { Product } from "@/lib/products/types";
import { AvailabilityBadge } from "./availability-badge";
import { ProductImage } from "./product-image";
import { ProductPrice } from "./product-price";
import { QuickAdd } from "./quick-add";

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const purchasable = canPurchase(product);
  const label = product.brand ?? product.category?.name;

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-[box-shadow,border-color] duration-300 hover:border-rose-light hover:shadow-lift">
      <div className="relative">
        <ProductImage
          image={product.images[0]}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          hoverZoom
        />
        {/* "Disponível" is the norm: only the exceptions get a label. */}
        {!purchasable && (
          <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3">
            <AvailabilityBadge product={product} />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-4">
        {label && <p className="eyebrow">{label}</p>}
        <h3 className="mt-1 line-clamp-2 font-display text-[1.1875rem] leading-[1.2] font-semibold sm:text-[1.375rem]">
          {/* The link covers the whole card; the quick-add button sits above it. */}
          <Link
            href={`/produtos/${product.slug}`}
            className="transition-colors after:absolute after:inset-0 after:rounded-lg group-hover:text-accent"
          >
            {product.name}
          </Link>
        </h3>
        {/* Price and button share one row, at the bottom of every card. */}
        <div className="mt-auto flex min-h-10 items-center justify-between gap-2 pt-3">
          <ProductPrice
            cents={product.price_cents}
            className={product.price_cents === null ? "text-xs sm:text-sm" : "text-[0.9375rem] text-accent sm:text-base"}
          />
          {purchasable && (
            <QuickAdd
              productId={product.id}
              productName={product.name}
              maxQuantity={maxPurchasableQuantity(product)}
            />
          )}
        </div>
      </div>
    </article>
  );
}
