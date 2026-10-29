"use client";

import { AlertCircle, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buttonStyles, ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { ProductImage } from "@/components/product-image";
import { QuantityInput } from "@/components/quantity-input";
import type { CartLine } from "@/lib/cart/cart";
import { cart, useCartLines } from "@/lib/cart/cart-store";
import { summarizeCart, type CartItem } from "@/lib/cart/summary";
import { storefrontProducts } from "@/lib/demo/model";
import { useDemoSnapshot } from "@/lib/demo/store";
import { formatPrice } from "@/lib/money";
import type { PixReceiver } from "@/lib/payments/pix";
import { availabilityLabel, getAvailability } from "@/lib/products/availability";
import type { Product } from "@/lib/products/types";
import { getCartProducts } from "./actions";
import { CheckoutForm } from "./checkout-form";
import { PixPayment } from "./pix-payment";
import { WhatsappCheckout } from "./whatsapp-checkout";

/**
 * "order": the order is saved in Supabase first (CheckoutForm).
 * "whatsapp": WhatsApp opens directly with the cart (no Supabase, or demo).
 */
export type Checkout =
  | { kind: "order" }
  | { kind: "whatsapp"; number: string; storeName: string };

type Fetched =
  | { key: string; status: "ok"; products: Product[] }
  | { key: string; status: "error" };

/** Keeps stored quantities within the current stock. */
function clampToStock(products: Product[]) {
  const { items } = summarizeCart(cart.lines(), products);
  for (const item of items) {
    if (item.purchasable && item.line.quantity > item.maxQuantity) {
      cart.setQuantity(item.line.productId, item.maxQuantity, item.maxQuantity);
    }
  }
}

/** Cart validated against the server catalog (Supabase). */
export function CartView({ checkout, pix }: { checkout: Checkout; pix: PixReceiver | null }) {
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
        clampToStock(products);
      })
      .catch(() => {
        if (!cancelled) setFetched({ key: idsKey, status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey, attempt]);

  // Prices or stock may change while the tab is in the background: read them
  // again when the customer comes back, before the WhatsApp message is used.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetch]);

  if (lines.length === 0) return <EmptyCart />;

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

  return (
    <CartContents
      lines={lines}
      products={fetched.products}
      checkout={checkout}
      pix={pix}
      onCartChanged={refetch}
    />
  );
}

/**
 * Demo mode: the cart is checked against the catalog kept in the browser,
 * which is always current (also across tabs).
 */
export function DemoCartView({ checkout, pix }: { checkout: Checkout; pix: PixReceiver | null }) {
  const lines = useCartLines();
  const state = useDemoSnapshot()?.state;
  const products = useMemo(() => (state ? storefrontProducts(state) : null), [state]);

  useEffect(() => {
    if (products) clampToStock(products);
  }, [products, lines]);

  if (lines.length === 0) return <EmptyCart />;
  if (!products) return <CartSkeleton />;
  return <CartContents lines={lines} products={products} checkout={checkout} pix={pix} onCartChanged={() => {}} />;
}

function EmptyCart() {
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

function CartContents({
  lines,
  products,
  checkout,
  pix,
  onCartChanged,
}: {
  lines: CartLine[];
  products: Product[];
  checkout: Checkout;
  pix: PixReceiver | null;
  onCartChanged: () => void;
}) {
  const { items, subtotalCents, hasUnavailable } = summarizeCart(lines, products);
  // Saving an order requires every item available, so the QR Code is only
  // offered when the order can actually be sent.
  const canSend = subtotalCents > 0 && (checkout.kind === "whatsapp" || !hasUnavailable);

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
          <dt className="text-sm text-muted">Total dos produtos</dt>
          <dd className="text-lg font-semibold">{formatPrice(subtotalCents)}</dd>
        </dl>
        {hasUnavailable && (
          <p className="mt-3 text-xs text-warning">
            Itens indisponíveis não entram no total nem no pedido.
          </p>
        )}
        <p className="mt-4 text-xs text-muted">
          {pix
            ? "O valor corresponde apenas aos produtos. A entrega é combinada com a Bruna pelo WhatsApp, que também confirma a disponibilidade."
            : "O valor corresponde apenas aos produtos. Entrega e pagamento são combinados com a Bruna pelo WhatsApp, que também confirma a disponibilidade."}
        </p>
        {pix && canSend && <PixPayment receiver={pix} amountCents={subtotalCents} />}
        {checkout.kind === "order" ? (
          <CheckoutForm
            lines={items
              .filter((item) => item.purchasable)
              .map((item) => ({
                productId: item.line.productId,
                quantity: Math.min(item.line.quantity, item.maxQuantity),
              }))}
            disabled={hasUnavailable || subtotalCents === 0}
            onCartChanged={onCartChanged}
          />
        ) : (
          <WhatsappCheckout
            items={items}
            number={checkout.number}
            storeName={checkout.storeName}
            pix={pix !== null}
          />
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
                  ? `${availabilityLabel[getAvailability(product)]}: este item não entra no pedido.`
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
