import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogResults, CatalogSkeleton } from "@/components/catalog-results";
import { DemoCatalog } from "@/components/demo/storefront";
import { PageIntro } from "@/components/page-intro";
import { isDemoMode } from "@/lib/demo/mode";
import { listCategories, listProducts } from "@/lib/products/repository";

export const metadata: Metadata = {
  title: "Produtos",
};

type SearchParams = PageProps<"/produtos">["searchParams"];

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default function CatalogPage({ searchParams }: PageProps<"/produtos">) {
  return (
    <div className="container-page pt-8 sm:pt-12">
      <PageIntro eyebrow="Catálogo" title="Produtos">
        Beleza, perfumaria, cuidados pessoais e variedades. Adicione ao carrinho
        e finalize o pedido com a Bruna pelo WhatsApp.
      </PageIntro>
      <Suspense fallback={<CatalogSkeleton />}>
        {isDemoMode() ? <DemoCatalog /> : <Catalog searchParams={searchParams} />}
      </Suspense>
    </div>
  );
}

async function Catalog({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = firstValue(params.q);
  const categorySlug = firstValue(params.categoria);

  const categories = await listCategories();
  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const products = await listProducts({
    query: query || undefined,
    categorySlug: activeCategory?.slug,
  });

  return (
    <CatalogResults
      categories={categories}
      activeCategory={activeCategory}
      query={query}
      products={products}
    />
  );
}
