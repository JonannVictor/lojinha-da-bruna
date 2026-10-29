import { ChevronRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { buildProductWhatsappUrl } from "@/lib/orders/whatsapp";
import { canPurchase, maxPurchasableQuantity } from "@/lib/products/availability";
import type { Product } from "@/lib/products/types";
import { AddToCart } from "./add-to-cart";
import { AvailabilityBadge } from "./availability-badge";
import { buttonStyles } from "./button-link";
import { ProductGallery } from "./product-gallery";
import { ProductPrice } from "./product-price";

// Body of /produtos/[slug], shared by the server page and the demo page.
// The WhatsApp number comes from the server (storeConfig) as a prop.

export function ProductDetailView({
  product,
  whatsappNumber,
  storeName,
}: {
  product: Product;
  whatsappNumber: string;
  storeName: string;
}) {
  return (
    <>
      <nav aria-label="Trilha de navegação" className="text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-accent">Início</Link></li>
          <Separator />
          <li><Link href="/produtos" className="hover:text-accent">Produtos</Link></li>
          {product.category && (
            <>
              <Separator />
              <li>
                <Link href={`/produtos?categoria=${product.category.slug}`} className="hover:text-accent">
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <Separator />
          <li aria-current="page" className="max-w-[16rem] truncate text-foreground">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="md:sticky md:top-28 md:self-start">
          <ProductGallery images={product.images} />
        </div>

        <div className="md:pt-2">
          {(product.brand ?? product.category) && (
            <p className="eyebrow">{product.brand ?? product.category?.name}</p>
          )}
          <h1 className="mt-2 font-display text-4xl leading-[1.08] font-medium text-balance sm:text-5xl">
            {product.name}
          </h1>

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

          <div className="mt-7 border-t border-border pt-7">
            <AddToCart
              productId={product.id}
              available={canPurchase(product)}
              maxQuantity={maxPurchasableQuantity(product)}
            />

            <a
              href={buildProductWhatsappUrl(whatsappNumber, storeName, product)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonStyles.secondary} mt-3 w-full`}
            >
              <MessageCircle aria-hidden className="size-4" />
              Tirar dúvidas pelo WhatsApp
              <span className="sr-only">(abre em nova aba)</span>
            </a>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              O pedido é finalizado em uma conversa com a Bruna pelo WhatsApp, que
              confirma a disponibilidade e combina a entrega.
            </p>
          </div>

          <section aria-labelledby="descricao" className="mt-8 border-t border-border pt-7">
            <h2 id="descricao" className="font-display text-2xl font-medium">
              Descrição
            </h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed whitespace-pre-line text-foreground/80">
              {product.description ?? "Descrição em breve."}
            </p>
            {(product.category || product.brand) && (
              <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                {product.category && (
                  <>
                    <dt className="text-muted">Categoria</dt>
                    <dd>
                      <Link
                        href={`/produtos?categoria=${product.category.slug}`}
                        className="underline-offset-4 hover:text-accent hover:underline"
                      >
                        {product.category.name}
                      </Link>
                    </dd>
                  </>
                )}
                {product.brand && (
                  <>
                    <dt className="text-muted">Marca</dt>
                    <dd>{product.brand}</dd>
                  </>
                )}
              </dl>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Separator() {
  return (
    <li aria-hidden className="text-rose">
      <ChevronRight className="size-3" />
    </li>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Carregando produto…</span>
      <div aria-hidden className="h-4 w-56 animate-pulse rounded bg-surface-muted" />
      <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div aria-hidden className="aspect-square animate-pulse rounded-md bg-surface-muted" />
        <div aria-hidden className="space-y-4 md:pt-2">
          <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
          <div className="h-12 w-3/4 animate-pulse rounded bg-surface-muted" />
          <div className="h-7 w-32 animate-pulse rounded bg-surface-muted" />
          <div className="h-11 w-full animate-pulse rounded-full bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}
