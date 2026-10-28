"use client";

import { ChevronDown, ReceiptText } from "lucide-react";
import { useState } from "react";
import { inputClass } from "@/components/admin/form-controls";
import { AdminSkeleton } from "@/components/admin/page-header";
import { EmptyState } from "@/components/empty-state";
import { STORAGE_ERROR_MESSAGE, STORAGE_FULL_MESSAGE } from "@/lib/demo/admin-actions";
import { orderStatusLabel, orderSubtotal, type DemoOrder, type OrderStatus } from "@/lib/demo/model";
import { demoRepository, useDemoSnapshot } from "@/lib/demo/store";
import { formatPrice } from "@/lib/money";
import { formatDateTime, orderStatusStyles } from "./admin-common";

const statuses = Object.keys(orderStatusLabel) as OrderStatus[];

export function DemoOrderList() {
  const snapshot = useDemoSnapshot();
  if (!snapshot) return <AdminSkeleton label="Carregando pedidos…" />;

  const orders = [...snapshot.state.orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptText aria-hidden className="size-6" />}
        title="Nenhum pedido de exemplo"
        description="Restaure os dados iniciais para ver os pedidos de demonstração."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </ul>
  );
}

function OrderCard({ order }: { order: DemoOrder }) {
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const selectId = `status-${order.id}`;

  async function changeStatus(status: OrderStatus) {
    const result = await demoRepository.setOrderStatus(order.id, status);
    setFeedback(
      result.ok
        ? { tone: "success", message: "Status atualizado (apenas nesta demonstração)." }
        : {
            tone: "error",
            message:
              result.reason === "storage_full"
                ? STORAGE_FULL_MESSAGE
                : result.reason === "storage_error"
                  ? STORAGE_ERROR_MESSAGE
                  : "Pedido não encontrado.",
          },
    );
  }

  return (
    <li className="rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {order.code}
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
              Demonstração
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusStyles[order.status]}`}>
              {orderStatusLabel[order.status]}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {order.customer_name} · {formatDateTime(order.created_at)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Subtotal</p>
          <p className="text-lg font-semibold">{formatPrice(orderSubtotal(order))}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-border px-4 py-3 sm:px-5">
        <div className="space-y-1">
          <label htmlFor={selectId} className="block text-xs font-medium">
            Status do pedido {order.code}
          </label>
          <select
            id={selectId}
            value={order.status}
            onChange={(e) => changeStatus(e.target.value as OrderStatus)}
            className={`${inputClass} w-auto py-2`}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {orderStatusLabel[status]}
              </option>
            ))}
          </select>
        </div>
        <p aria-live="polite" className="pb-2 text-xs empty:hidden">
          {feedback && (
            <span className={feedback.tone === "success" ? "text-success" : "text-danger"}>{feedback.message}</span>
          )}
        </p>
      </div>

      <details className="group border-t border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium hover:text-accent sm:px-5 [&::-webkit-details-marker]:hidden">
          {order.items.length === 1 ? "1 item" : `${order.items.length} itens`}
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="overflow-x-auto px-4 pb-4 sm:px-5">
          <table className="w-full min-w-[28rem] text-sm">
            <caption className="sr-only">Itens do pedido {order.code}</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th scope="col" className="py-2 font-medium">Produto</th>
                <th scope="col" className="py-2 text-right font-medium">Qtd.</th>
                <th scope="col" className="py-2 text-right font-medium">Unitário</th>
                <th scope="col" className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.product_id} className="border-b border-border/60">
                  <td className="py-2 pr-3">{item.product_name}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{formatPrice(item.unit_price_cents)}</td>
                  <td className="py-2 text-right">{formatPrice(item.quantity * item.unit_price_cents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3} className="pt-3 text-right font-medium">
                  Subtotal
                </th>
                <td className="pt-3 text-right font-semibold">{formatPrice(orderSubtotal(order))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </details>
    </li>
  );
}
