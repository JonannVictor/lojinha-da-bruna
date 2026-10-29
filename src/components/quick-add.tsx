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
        title={full && !added ? "Quantidade máxima no carrinho" : "Adicionar ao carrinho"}
        className={`absolute right-2.5 bottom-2.5 z-10 flex h-10 items-center justify-center gap-1.5 rounded-full shadow-[0_6px_16px_-8px_rgb(53_39_42/0.45)] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 sm:right-3 sm:bottom-3 ${
          added
            ? "bg-accent px-3.5 text-xs font-semibold text-accent-foreground"
            : "w-10 bg-surface text-accent hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        {added ? (
          <>
            <Check aria-hidden className="size-4" />
            Adicionado
          </>
        ) : (
          <Plus aria-hidden className="size-[1.125rem]" />
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {added ? `${productName} adicionado ao carrinho.` : ""}
      </span>
    </>
  );
}
