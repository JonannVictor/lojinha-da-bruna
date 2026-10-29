"use client";

import { Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { cart, useCartLines } from "@/lib/cart/cart-store";

/**
 * One-tap "add 1 unit" on a product card, with a short confirmation. Same
 * limits as the product page: never more than `maxQuantity` in the cart.
 */
export function QuickAdd({
  productId,
  productName,
  maxQuantity,
}: {
  productId: string;
  productName: string;
  maxQuantity: number;
}) {
  const inCart = useCartLines().find((l) => l.productId === productId)?.quantity ?? 0;
  const [added, setAdded] = useState(false);
  const full = inCart >= maxQuantity;

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 2200);
    return () => window.clearTimeout(timer);
  }, [added]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          cart.add(productId, 1, maxQuantity);
          setAdded(true);
        }}
        disabled={full && !added}
        aria-label={
          full && !added
            ? `${productName}: quantidade máxima já está no carrinho`
            : `Adicionar ${productName} ao carrinho`
        }
        title={full && !added ? "Quantidade máxima no carrinho" : added ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}
        // Sits in the card's price row, above the card-wide link (z-10).
        className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
          added
            ? "border-accent bg-accent text-accent-foreground"
            : "border-accent/25 bg-surface text-accent hover:border-accent hover:bg-accent hover:text-accent-foreground disabled:hover:border-accent/25 disabled:hover:bg-surface disabled:hover:text-accent"
        }`}
      >
        {added ? <Check aria-hidden className="size-4" /> : <Plus aria-hidden className="size-[1.125rem]" />}
      </button>
      <span aria-live="polite" className="sr-only">
        {added ? `${productName} adicionado ao carrinho.` : ""}
      </span>
    </>
  );
}
