"use client";

import { ArrowRight, History, ReceiptText } from "lucide-react";
import Link from "next/link";
import { CatalogPendencies, OverviewCards } from "@/components/admin/overview";
import { AdminSkeleton } from "@/components/admin/page-header";
import { orderStatusLabel, orderSubtotal, summarize } from "@/lib/demo/model";
import { useDemoSnapshot } from "@/lib/demo/store";
import { formatPrice } from "@/lib/money";
import { formatDateTime, orderStatusStyles } from "./admin-common";

const RECENT_ORDERS = 3;
const RECENT_ACTIVITY = 6;

/** Every number comes from the demo data in this browser. */
export function DemoDashboard() {
  const snapshot = useDemoSnapshot();
  if (!snapshot) return <AdminSkeleton rows={3} label="Carregando resumo…" />;

  const { state } = snapshot;
  const summary = summarize(state);
  const recentOrders = [...state.orders]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, RECENT_ORDERS);
  const activity = state.activity.slice(0, RECENT_ACTIVITY);

  return (
    <div className="space-y-6">
      <OverviewCards
        className="grid-cols-2 lg:grid-cols-4"
        cards={[
          { label: "Produtos cadastrados", value: summary.products, href: "/admin/produtos" },
          { label: "Ativos na loja", value: summary.active, href: "/admin/produtos?status=active" },
          { label: "Inativos", value: summary.inactive, href: "/admin/produtos?status=inactive" },
          { label: "Pedidos de demonstração", value: summary.orders, href: "/admin/pedidos" },
        ]}
      />

      <CatalogPendencies
        products={summary.products}
        pricePending={summary.pricePending}
        withoutPhotos={summary.withoutPhotos}
        outOfStock={summary.outOfStock}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="pedidos-recentes" className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="pedidos-recentes" className="flex items-center gap-2 font-semibold">
              <ReceiptText aria-hidden className="size-4 text-muted" />
              Pedidos de exemplo
            </h2>
            <Link href="/admin/pedidos" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover">
              Ver todos
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>
          <p className="mt-1 text-xs text-muted">Fictícios: nenhum deles é uma venda real.</p>
          {recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nenhum pedido de exemplo.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{order.code}</p>
                    <p className="text-xs text-muted">
                      {order.customer_name} · {formatDateTime(order.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusStyles[order.status]}`}>
                      {orderStatusLabel[order.status]}
                    </span>
                    <span className="font-semibold">{formatPrice(orderSubtotal(order))}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="atividade" className="rounded-2xl border border-border bg-surface p-5">
          <h2 id="atividade" className="flex items-center gap-2 font-semibold">
            <History aria-hidden className="size-4 text-muted" />
            Atividade recente
          </h2>
          <p className="mt-1 text-xs text-muted">Alterações feitas neste navegador durante a demonstração.</p>
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Nenhuma alteração ainda. Cadastre ou edite um produto para vê-la aqui.
            </p>
          ) : (
            <ol className="mt-3 space-y-2.5">
              {activity.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <p>{entry.message}</p>
                  <p className="text-xs text-muted">{formatDateTime(entry.at)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
