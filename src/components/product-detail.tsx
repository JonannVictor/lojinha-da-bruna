import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { buildProductWhatsappUrl } from "@/lib/orders/whatsapp";
import { canPurchase, maxPurchasableQuantity } from "@/lib/products/availability";
import type { Product } from "@/lib/products/types";
import { AddToCart } from "./add-to-cart";
import { AvailabilityBadge } from "./availability-badge";
import { buttonStyles } from "./button-link";
import { ProductImage } from "./product-image";
import { ProductPrice } from "./product-price";

// Body of /produtos/[slug], shared by the server page and the demo page.
// The WhatsApp number comes from the server (storeConfig) as a prop.

export function ProductDetailView({
  product,
  whatsappNumber,
  storeName,
  demo = false,
}: {
  product: Product;
  whatsappNumber: string;
  storeName: string;
  /** Marks the WhatsApp message as a demonstration test. */
  demo?: boolean;
}) {
  const [mainImage, ...otherImages] = product.images;

  return (
    <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
      <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-border">
          <ProductImage
            image={mainImage}
            sizes="(min-width: 768px) 50vw, 100vw"
            priority
          />
        </div>
        {otherImages.length > 0 && (
          <ul className="grid grid-cols-4 gap-3">
            {otherImages.map((image) => (
              <li key={image.url} className="overflow-hidden rounded-xl border border-border">
                <ProductImage image={image} sizes="12vw" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        {product.brand && (
          <p className="text-sm tracking-wide text-muted uppercase">{product.brand}</p>
        )}
        <h1 className="mt-1 font-display text-3xl leading-tight font-semibold sm:text-4xl">
          {product.name}
        </h1>
        {product.category && (
          <p className="mt-2 text-sm text-muted">
            Categoria:{" "}
            <Link
              href={`/produtos?categoria=${product.category.slug}`}
              className="underline-offset-2 hover:text-accent hover:underline"
            >
              {product.category.name}
            </Link>
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ProductPrice cents={product.price_cents} className="text-2xl" />
          <AvailabilityBadge product={product} />
        </div>
        {product.stock_quantity !== null && product.stock_quantity > 0 && (
          <p className="mt-2 text-sm text-muted">
            {product.stock_quantity === 1
              ? "1 unidade disponível"
              : `${product.stock_quantity} unidades disponíveis`}
          </p>
        )}

        <div className="mt-6">
          <AddToCart
            productId={product.id}
            available={canPurchase(product)}
            maxQuantity={maxPurchasableQuantity(product)}
          />
        </div>

        <a
          href={buildProductWhatsappUrl(whatsappNumber, storeName, product, { demo })}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonStyles.secondary} mt-3`}
        >
          <MessageCircle aria-hidden className="size-4" />
          Tirar dúvidas pelo WhatsApp
          <span className="sr-only">(abre em nova aba)</span>
        </a>

        <section aria-labelledby="descricao" className="mt-8 border-t border-border pt-6">
          <h2 id="descricao" className="font-semibold">
            Descrição
          </h2>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">
            {product.description ?? "Descrição em breve."}
          </p>
        </section>
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div role="status" className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
      <span className="sr-only">Carregando produto…</span>
      <div aria-hidden className="aspect-square animate-pulse rounded-2xl bg-surface-muted" />
      <div aria-hidden className="space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
        <div className="h-9 w-3/4 animate-pulse rounded bg-surface-muted" />
        <div className="h-7 w-32 animate-pulse rounded bg-surface-muted" />
        <div className="h-11 w-full animate-pulse rounded-full bg-surface-muted" />
      </div>
    </div>
  );
}
