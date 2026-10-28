"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { countItems } from "@/lib/cart/cart";
import { useCartLines } from "@/lib/cart/cart-store";

export function CartLink() {
  const count = countItems(useCartLines());
  const label =
    count === 0
      ? "Carrinho vazio"
      : `Carrinho com ${count} ${count === 1 ? "item" : "itens"}`;

  return (
    <Link
      href="/carrinho"
      aria-label={label}
      className="relative flex size-10 items-center justify-center rounded-full text-foreground hover:bg-surface-muted"
    >
      <ShoppingBag aria-hidden className="size-5" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] leading-5 font-semibold text-accent-foreground"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
