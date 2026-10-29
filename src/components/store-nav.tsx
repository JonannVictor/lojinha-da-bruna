"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Início", exact: true },
  { href: "/produtos", label: "Produtos", exact: false },
  { href: "/carrinho", label: "Carrinho", exact: false },
] as const;

/** Main storefront links. `layout` switches between the header row and the mobile menu. */
export function StoreNavLinks({
  pathname,
  layout = "row",
}: {
  pathname: string | null;
  layout?: "row" | "stack";
}) {
  // The header row already has the cart icon next to it.
  const shown = layout === "row" ? links.filter((link) => link.href !== "/carrinho") : links;
  return shown.map(({ href, label, exact }) => {
    const active = pathname !== null && (exact ? pathname === href : pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={
          layout === "row"
            ? `relative py-2 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-left after:bg-accent after:transition-transform ${
                active
                  ? "text-accent after:scale-x-100"
                  : "text-foreground/80 after:scale-x-0 hover:text-accent hover:after:scale-x-100"
              }`
            : `flex items-center justify-between border-b border-border py-4 font-display text-2xl ${
                active ? "text-accent" : "text-foreground hover:text-accent"
              }`
        }
      >
        {label}
      </Link>
    );
  });
}

export function ActiveStoreNavLinks({ layout }: { layout?: "row" | "stack" }) {
  return <StoreNavLinks pathname={usePathname()} layout={layout} />;
}
