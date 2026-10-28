import Link from "next/link";
import { Suspense } from "react";
import { storeConfig } from "@/config/store";
import { CartLink } from "./cart-link";
import { SearchForm, SearchFormFields } from "./search-form";

export function SiteHeader() {
  const search = (
    <Suspense fallback={<SearchFormFields defaultValue="" />}>
      <SearchForm />
    </Suspense>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight whitespace-nowrap text-foreground sm:text-2xl"
        >
          {storeConfig.name}
        </Link>

        <div className="hidden flex-1 md:block">{search}</div>

        <nav aria-label="Principal" className="ml-auto flex items-center gap-1">
          <Link
            href="/produtos"
            className="rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-surface-muted hover:text-foreground"
          >
            Produtos
          </Link>
          <CartLink />
        </nav>
      </div>
      <div className="px-4 pb-3 md:hidden">{search}</div>
    </header>
  );
}
