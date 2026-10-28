import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddToCart } from "@/components/add-to-cart";
import { AvailabilityBadge } from "@/components/availability-badge";
import { ProductImage } from "@/components/product-image";
import { ProductPrice } from "@/components/product-price";
import {
  canPurchase,
  maxPurchasableQuantity,
} from "@/lib/products/availability";
import { getProductBySlug } from "@/lib/products/repository";

export async function generateMetadata({
  params,
}: PageProps<"/produtos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.name,
    description: product.description ?? undefined,
  };
}

export default function ProductPage({ params }: PageProps<"/produtos/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/produtos"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Voltar para produtos
      </Link>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetail params={params} />
      </Suspense>
    </div>
  );
}

async function ProductDetail({
  params,
}: Pick<PageProps<"/produtos/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

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

function ProductSkeleton() {
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
