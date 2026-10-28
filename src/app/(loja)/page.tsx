import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/button-link";
import { DemoCategories, DemoFeaturedProducts } from "@/components/demo/storefront";
import {
  CategoriesSkeleton,
  CategoryLinks,
  FEATURED_LIMIT,
  FeaturedProductsView,
} from "@/components/home-sections";
import { ProductGridSkeleton } from "@/components/product-grid";
import { storeConfig } from "@/config/store";
import { isDemoMode } from "@/lib/demo/mode";
import { listCategories, listProducts } from "@/lib/products/repository";

export default function HomePage() {
  const demo = isDemoMode();
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
          {demo ? <DemoCategories /> : <Categories />}
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
          {demo ? <DemoFeaturedProducts /> : <FeaturedProducts />}
        </Suspense>
      </section>
    </>
  );
}

async function Categories() {
  return <CategoryLinks categories={await listCategories()} />;
}

async function FeaturedProducts() {
  const featured = await listProducts({ featuredOnly: true, limit: FEATURED_LIMIT });
  // No product marked as featured yet: fall back to the first active ones.
  const products =
    featured.length > 0 ? featured : await listProducts({ limit: FEATURED_LIMIT });
  return <FeaturedProductsView products={products} />;
}
