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
      className="relative -mr-2 flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent-soft hover:text-accent"
    >
      <ShoppingBag aria-hidden strokeWidth={1.6} className="size-[1.375rem]" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute top-0.5 right-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-[1.125rem] font-bold text-accent-foreground ring-2 ring-background"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
