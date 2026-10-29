"use client";

import { Check, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCartLines, cart } from "@/lib/cart/cart-store";
import { buttonStyles } from "./button-link";
import { QuantityInput } from "./quantity-input";

type Props = {
  productId: string;
  available: boolean;
  /** Max units purchasable (stock or per-item limit). */
  maxQuantity: number;
};

export function AddToCart({ productId, available, maxQuantity }: Props) {
  const inCart =
    useCartLines().find((l) => l.productId === productId)?.quantity ?? 0;
  const remaining = Math.max(0, maxQuantity - inCart);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!available) {
    return (
      <p className="rounded-md border border-border bg-surface-muted px-4 py-3.5 text-sm text-foreground/80">
        Este produto não está disponível para compra no momento.
      </p>
    );
  }

  const chosen = Math.min(quantity, Math.max(remaining, 1));

  function handleAdd() {
    cart.add(productId, chosen, maxQuantity);
    setAdded(true);
    setQuantity(1);
  }

  return (
    <div className="space-y-3">
      {remaining > 0 ? (
        <div className="flex items-center gap-3">
          <QuantityInput
            value={chosen}
            max={remaining}
            onChange={(value) => {
              setQuantity(value);
              setAdded(false);
            }}
            label="Quantidade a adicionar"
          />
          <button type="button" onClick={handleAdd} className={`${buttonStyles.primary} min-h-12 flex-1 whitespace-nowrap max-[400px]:px-4 max-[400px]:[&>svg]:hidden`}>
            <ShoppingBag aria-hidden className="size-4" />
            Adicionar ao carrinho
          </button>
        </div>
      ) : (
        <p className="rounded-md bg-accent-soft px-4 py-3.5 text-sm text-foreground/80">
          Você já adicionou a quantidade máxima disponível deste produto.
        </p>
      )}

      <p aria-live="polite" className="text-sm empty:sr-only">
        {added && (
          <span className="inline-flex flex-wrap items-center gap-1.5 text-success">
            <Check aria-hidden className="size-4" />
            Adicionado ao carrinho.{" "}
            <Link href="/carrinho" className="font-semibold text-accent underline underline-offset-4 hover:text-accent-hover">
              Ver carrinho
            </Link>
          </span>
        )}
      </p>
    </div>
  );
}
