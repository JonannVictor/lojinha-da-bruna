"use client";

import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useId } from "react";

// Plain GET form: works before hydration and without JavaScript.
export function SearchFormFields({ defaultValue }: { defaultValue: string }) {
  const id = useId();
  return (
    <form action="/produtos" role="search" className="relative w-full max-w-md">
      <label htmlFor={id} className="sr-only">
        Buscar produtos
      </label>
      <input
        id={id}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Buscar produtos ou marcas"
        className="w-full rounded-full border border-border bg-surface py-2.5 pr-11 pl-4 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-accent-soft hover:text-accent"
      >
        <Search aria-hidden className="size-4" />
      </button>
    </form>
  );
}

export function SearchForm() {
  const query = useSearchParams().get("q") ?? "";
  // key resets the uncontrolled input when the URL query changes.
  return <SearchFormFields key={query} defaultValue={query} />;
}
