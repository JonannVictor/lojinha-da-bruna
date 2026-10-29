import { PackageOpen, SearchX, X } from "lucide-react";
import Link from "next/link";
import type { Category, Product } from "@/lib/products/types";
import { ButtonLink } from "./button-link";
import { EmptyState } from "./empty-state";
import { ProductGrid, ProductGridSkeleton } from "./product-grid";

// Body of /produtos: category chips, result count and grid (or empty state).
// Rendered by the server catalog and by the demo catalog alike.

function catalogHref(query: string, slug?: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (slug) params.set("categoria", slug);
  const qs = params.toString();
  return qs ? `/produtos?${qs}` : "/produtos";
}

export function CatalogResults({
  categories,
  activeCategory,
  query,
  products,
}: {
  categories: Category[];
  activeCategory: Category | undefined;
  query: string;
  products: Product[];
}) {
  const isFiltered = Boolean(query || activeCategory);

  return (
    <>
      <CategoryFilter categories={categories} active={activeCategory} query={query} />

      <div className="mt-6 mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-4">
        {/* A heading, so the product names (h3) follow the page h1 in order. */}
        <h2 className="text-sm font-normal text-muted" aria-live="polite">
          {query && <>Resultados para “{query}”. </>}
          {products.length === 1
            ? "1 produto encontrado."
            : `${products.length} produtos encontrados.`}
        </h2>
        {query && (
          <Link
            href={catalogHref("", activeCategory?.slug)}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
          >
            <X aria-hidden className="size-3.5" />
            Limpar busca
          </Link>
        )}
      </div>

      {products.length > 0 ? (
        // First row on desktop, first two rows on mobile.
        <ProductGrid products={products} priorityCount={4} />
      ) : isFiltered ? (
        <EmptyState
          icon={<SearchX aria-hidden strokeWidth={1.6} className="size-6" />}
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
          icon={<PackageOpen aria-hidden strokeWidth={1.6} className="size-6" />}
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
  const chip = (selected: boolean) =>
    `inline-flex h-10 items-center whitespace-nowrap rounded-full border px-5 text-sm font-medium transition-colors ${
      selected
        ? "border-accent bg-accent text-accent-foreground"
        : "border-border bg-surface text-foreground/85 hover:border-accent hover:text-accent"
    }`;

  return (
    <nav
      aria-label="Categorias"
      className="-mx-4 mt-8 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex gap-2 pb-1">
        <li>
          <Link href={catalogHref(query)} className={chip(!active)} aria-current={!active ? "page" : undefined}>
            Todas
          </Link>
        </li>
        {categories.map((category) => {
          const selected = category.slug === active?.slug;
          return (
            <li key={category.slug}>
              <Link
                href={catalogHref(query, category.slug)}
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

export function CatalogSkeleton() {
  return (
    <div className="mt-8">
      <div className="mb-14 flex gap-2" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-10 w-24 animate-pulse rounded-full bg-surface-muted" />
        ))}
      </div>
      <ProductGridSkeleton />
    </div>
  );
}
