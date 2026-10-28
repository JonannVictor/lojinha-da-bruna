"use client";

import { AlertCircle, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { buttonStyles, ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { ProductImage } from "@/components/product-image";
import { QuantityInput } from "@/components/quantity-input";
import { cart, useCartLines } from "@/lib/cart/cart-store";
import { summarizeCart, type CartItem } from "@/lib/cart/summary";
import { formatPrice } from "@/lib/money";
import { availabilityLabel, getAvailability } from "@/lib/products/availability";
import type { Product } from "@/lib/products/types";
import { getCartProducts } from "./actions";
import { CheckoutForm } from "./checkout-form";

type Fetched =
  | { key: string; status: "ok"; products: Product[] }
  | { key: string; status: "error" };

export function CartView({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  const lines = useCartLines();
  const idsKey = lines.map((l) => l.productId).sort().join(",");
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    getCartProducts(idsKey.split(","))
      .then((products) => {
        if (cancelled) return;
        setFetched({ key: idsKey, status: "ok", products });
        // Keep stored quantities within the current stock.
        const { items } = summarizeCart(cart.lines(), products);
        for (const item of items) {
          if (item.purchasable && item.line.quantity > item.maxQuantity) {
            cart.setQuantity(item.line.productId, item.maxQuantity, item.maxQuantity);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setFetched({ key: idsKey, status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey, attempt]);

  if (lines.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={<ShoppingBag aria-hidden className="size-6" />}
          title="Seu carrinho está vazio"
          description="Explore o catálogo e adicione os produtos que você deseja."
          action={<ButtonLink href="/produtos">Ver produtos</ButtonLink>}
        />
      </div>
    );
  }

  if (fetched?.key !== idsKey) return <CartSkeleton />;

  if (fetched.status === "error") {
    return (
      <div role="alert" className="mt-6">
        <EmptyState
          icon={<AlertCircle aria-hidden className="size-6" />}
          title="Não foi possível carregar o carrinho"
          description="Verifique sua conexão e tente novamente."
          action={
            <button
              type="button"
              className={buttonStyles.primary}
              onClick={refetch}
            >
              Tentar novamente
            </button>
          }
        />
      </div>
    );
  }

  const { items, subtotalCents, hasUnavailable } = summarizeCart(lines, fetched.products);

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {items.map((item) => (
          <CartRow key={item.line.productId} item={item} />
        ))}
      </ul>

      <aside
        aria-labelledby="resumo"
        className="rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24"
      >
        <h2 id="resumo" className="font-display text-xl font-semibold">
          Resumo
        </h2>
        <dl className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <dt className="text-sm text-muted">Subtotal</dt>
          <dd className="text-lg font-semibold">{formatPrice(subtotalCents)}</dd>
        </dl>
        {hasUnavailable && (
          <p className="mt-3 text-xs text-warning">
            Itens indisponíveis não entram no subtotal.
          </p>
        )}
        <p className="mt-4 text-xs text-muted">
          O pedido é confirmado pela Bruna pelo WhatsApp, após a verificação
          da disponibilidade.
        </p>
        {checkoutEnabled ? (
          <CheckoutForm
            lines={items
              .filter((item) => item.purchasable)
              .map((item) => ({
                productId: item.line.productId,
                quantity: Math.min(item.line.quantity, item.maxQuantity),
              }))}
            disabled={hasUnavailable || subtotalCents === 0}
            onCartChanged={refetch}
          />
        ) : (
          <>
            <button
              type="button"
              disabled
              aria-describedby="finalizar-em-breve"
              className={`${buttonStyles.primary} mt-5 w-full`}
            >
              Finalizar pelo WhatsApp
            </button>
            <p id="finalizar-em-breve" className="mt-2 text-center text-xs text-muted">
              A finalização do pedido estará disponível em breve.
            </p>
          </>
        )}
        <Link
          href="/produtos"
          className="mt-4 block text-center text-sm font-medium text-accent hover:text-accent-hover"
        >
          Continuar comprando
        </Link>
      </aside>
    </div>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const { line, product, purchasable, maxQuantity, totalCents } = item;
  const name = product?.name ?? "Produto não encontrado";

  return (
    <li className="flex gap-4 p-4">
      <div className="w-20 shrink-0 overflow-hidden rounded-xl border border-border sm:w-24">
        <ProductImage image={product?.images[0]} sizes="96px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {product ? (
              <Link
                href={`/produtos/${product.slug}`}
                className="font-medium hover:text-accent"
              >
                {name}
              </Link>
            ) : (
              <p className="font-medium">{name}</p>
            )}
            {purchasable && product?.price_cents != null && (
              <p className="text-sm text-muted">
                {formatPrice(product.price_cents)} cada
              </p>
            )}
            {!purchasable && (
              <p className="mt-1 text-sm text-danger">
                {product
                  ? `${availabilityLabel[getAvailability(product)]}: remova este item para continuar.`
                  : "Este item não está mais no catálogo."}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => cart.remove(line.productId)}
            aria-label={`Remover ${name} do carrinho`}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        </div>

        {purchasable && (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
            <QuantityInput
              value={Math.min(line.quantity, maxQuantity)}
              max={maxQuantity}
              onChange={(value) => cart.setQuantity(line.productId, value, maxQuantity)}
              label={`Quantidade de ${name}`}
            />
            <p className="font-semibold">{formatPrice(totalCents)}</p>
          </div>
        )}
      </div>
    </li>
  );
}

function CartSkeleton() {
  return (
    <div role="status" className="mt-6 space-y-3">
      <span className="sr-only">Carregando carrinho…</span>
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} aria-hidden className="h-28 animate-pulse rounded-2xl bg-surface-muted" />
      ))}
    </div>
  );
}
