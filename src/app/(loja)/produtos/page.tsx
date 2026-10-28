import { PackageOpen, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { ProductGrid, ProductGridSkeleton } from "@/components/product-grid";
import { listCategories, listProducts } from "@/lib/products/repository";
import type { Category } from "@/lib/products/types";

export const metadata: Metadata = {
  title: "Produtos",
};

type SearchParams = PageProps<"/produtos">["searchParams"];

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default function CatalogPage({ searchParams }: PageProps<"/produtos">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold">Produtos</h1>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
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
  const isFiltered = Boolean(query || activeCategory);

  return (
    <>
      <CategoryFilter categories={categories} active={activeCategory} query={query} />

      <p className="mt-6 mb-4 text-sm text-muted" aria-live="polite">
        {query && <>Resultados para “{query}”. </>}
        {products.length === 1
          ? "1 produto encontrado."
          : `${products.length} produtos encontrados.`}
      </p>

      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : isFiltered ? (
        <EmptyState
          icon={<SearchX aria-hidden className="size-6" />}
          title="Nenhum produto encontrado"
          description="Tente buscar por outro termo ou ver todas as categorias."
          action={
            <ButtonLink href="/produtos" variant="secondary">
              Ver todos os produtos
            </ButtonLink>
          }
        />
      ) : (
        <EmptyState
          icon={<PackageOpen aria-hidden className="size-6" />}
          title="Catálogo em preparação"
          description="Ainda não há produtos cadastrados. Volte em breve!"
        />
      )}
    </>
  );
}

function CategoryFilter({
  categories,
  active,
  query,
}: {
  categories: Category[];
  active: Category | undefined;
  query: string;
}) {
  function href(slug?: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (slug) params.set("categoria", slug);
    const qs = params.toString();
    return qs ? `/produtos?${qs}` : "/produtos";
  }

  const chip = (selected: boolean) =>
    `inline-flex whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
      selected
        ? "border-accent bg-accent text-accent-foreground"
        : "border-border bg-surface hover:border-accent hover:text-accent"
    }`;

  return (
    <nav aria-label="Categorias" className="-mx-4 mt-5 overflow-x-auto px-4">
      <ul className="flex gap-2 pb-1">
        <li>
          <Link href={href()} className={chip(!active)} aria-current={!active ? "page" : undefined}>
            Todas
          </Link>
        </li>
        {categories.map((category) => {
          const selected = category.slug === active?.slug;
          return (
            <li key={category.slug}>
              <Link
                href={href(category.slug)}
                className={chip(selected)}
                aria-current={selected ? "page" : undefined}
              >
                {category.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function CatalogSkeleton() {
  return (
    <div className="mt-5">
      <div className="mb-8 flex gap-2" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-surface-muted" />
        ))}
      </div>
      <ProductGridSkeleton />
    </div>
  );
}
