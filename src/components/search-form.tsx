"use client";

import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useId } from "react";

// Plain GET form: works before hydration and without JavaScript.
export function SearchFormFields({ defaultValue }: { defaultValue: string }) {
  const id = useId();
  return (
    <form action="/produtos" role="search" className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Buscar produtos
      </label>
      <input
        id={id}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Buscar produtos"
        className="h-11 w-full rounded-full border border-border bg-surface pr-12 pl-5 text-sm transition-colors placeholder:text-muted hover:border-rose-light focus:border-accent focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-accent transition-colors hover:bg-accent-soft"
      >
        <Search aria-hidden strokeWidth={1.8} className="size-4" />
      </button>
    </form>
  );
}

export function SearchForm() {
  const query = useSearchParams().get("q") ?? "";
  // key resets the uncontrolled input when the URL query changes.
  return <SearchFormFields key={query} defaultValue={query} />;
}
