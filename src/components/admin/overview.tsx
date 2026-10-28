import { ArrowRight } from "lucide-react";
import Link from "next/link";

// Dashboard blocks shared by the Supabase panel and the demo panel.

export function OverviewCards({
  cards,
  className = "sm:grid-cols-3",
}: {
  cards: { label: string; value: number; href: string }[];
  className?: string;
}) {
  return (
    <ul className={`grid gap-3 ${className}`}>
      {cards.map((card) => (
        <li key={card.label}>
          <Link
            href={card.href}
            className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent"
          >
            <span className="font-display text-3xl font-semibold">{card.value}</span>
            <span className="mt-1 flex items-center justify-between gap-2 text-sm text-muted">
              {card.label}
              <ArrowRight aria-hidden className="size-4 shrink-0" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CatalogPendencies({
  products,
  pricePending,
  withoutPhotos,
  outOfStock,
}: {
  products: number;
  pricePending: number;
  withoutPhotos: number;
  outOfStock: number;
}) {
  const pending = [
    { one: "produto ativo com preço a confirmar", many: "produtos ativos com preço a confirmar", value: pricePending },
    { one: "produto ativo sem foto", many: "produtos ativos sem foto", value: withoutPhotos },
    { one: "produto ativo esgotado", many: "produtos ativos esgotados", value: outOfStock },
  ].filter((item) => item.value > 0);

  return (
    <section aria-labelledby="pendencias" className="rounded-2xl border border-border bg-surface p-5">
      <h2 id="pendencias" className="font-semibold">
        Pendências do catálogo
      </h2>
      {pending.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          {products === 0
            ? "Nenhum produto cadastrado ainda. Comece pelo botão “Novo produto”."
            : "Nenhuma pendência nos produtos ativos."}
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5 text-sm">
          {pending.map((item) => (
            <li key={item.many}>
              <strong>{item.value}</strong> {item.value === 1 ? item.one : item.many}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
