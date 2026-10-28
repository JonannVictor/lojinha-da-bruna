import { ArrowRight, PackageOpen } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { ProductGrid, ProductGridSkeleton } from "@/components/product-grid";
import { storeConfig } from "@/config/store";
import { listCategories, listProducts } from "@/lib/products/repository";

const FEATURED_LIMIT = 8;

export default function HomePage() {
  return (
    <>
      <section className="border-b border-border bg-accent-soft/60">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-medium tracking-wide text-accent uppercase">
            Loja multimarcas
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl">
            {storeConfig.name}
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
            {storeConfig.tagline}. Escolha seus produtos, monte o carrinho e
            envie o pedido para a Bruna pelo WhatsApp.
          </p>
          <ButtonLink href="/produtos" className="mt-8">
            Ver produtos
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        </div>
      </section>

      <section
        aria-labelledby="categorias"
        className="mx-auto max-w-6xl px-4 pt-12 sm:px-6"
      >
        <h2 id="categorias" className="font-display text-2xl font-semibold">
          Categorias
        </h2>
        <Suspense fallback={<CategoriesSkeleton />}>
          <Categories />
        </Suspense>
      </section>

      <section
        aria-labelledby="destaques"
        className="mx-auto max-w-6xl px-4 pt-12 sm:px-6"
      >
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="destaques" className="font-display text-2xl font-semibold">
            Destaques
          </h2>
          <Link
            href="/produtos"
            className="text-sm font-medium text-accent hover:text-accent-hover"
          >
            Ver todos
          </Link>
        </div>
        <Suspense fallback={<ProductGridSkeleton count={4} />}>
          <FeaturedProducts />
        </Suspense>
      </section>
    </>
  );
}

async function Categories() {
  const categories = await listCategories();
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

function CategoriesSkeleton() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-muted" />
      ))}
    </div>
  );
}

async function FeaturedProducts() {
  const featured = await listProducts({ featuredOnly: true, limit: FEATURED_LIMIT });
  // No product marked as featured yet: fall back to the first active ones.
  const products =
    featured.length > 0 ? featured : await listProducts({ limit: FEATURED_LIMIT });

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
