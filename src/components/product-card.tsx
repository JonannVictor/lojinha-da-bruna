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
    <article className="group relative flex w-full flex-col">
      <div className="relative overflow-hidden rounded-md">
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
        {purchasable && (
          <QuickAdd
            productId={product.id}
            productName={product.name}
            maxQuantity={maxPurchasableQuantity(product)}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3 sm:pt-4">
        {label && <p className="eyebrow truncate">{label}</p>}
        <h3 className="mt-1 line-clamp-2 text-sm leading-snug font-medium sm:text-[0.9375rem]">
          {/* The link covers the whole card; the quick-add button sits above it. */}
          <Link
            href={`/produtos/${product.slug}`}
            className="transition-colors after:absolute after:inset-0 group-hover:text-accent"
          >
            {product.name}
          </Link>
        </h3>
        <ProductPrice
          cents={product.price_cents}
          className={`mt-auto pt-2 ${product.price_cents === null ? "text-sm" : "text-[0.9375rem] sm:text-base"}`}
        />
      </div>
    </article>
  );
}
