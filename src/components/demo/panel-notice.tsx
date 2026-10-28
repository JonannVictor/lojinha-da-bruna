"use client";

import { AlertTriangle, FlaskConical, LoaderCircle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { cart } from "@/lib/cart/cart-store";
import { demoRepository, useDemoSnapshot } from "@/lib/demo/store";
import { STORAGE_ERROR_MESSAGE } from "@/lib/demo/admin-actions";
import { storageUsagePercent } from "./admin-common";

type Feedback = { tone: "success" | "error"; message: string } | null;

/** Discreet notice shown on every panel page in demo mode, with the reset. */
export function DemoPanelNotice() {
  const snapshot = useDemoSnapshot();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function restore() {
    const confirmed = window.confirm(
      "Restaurar os dados de demonstração? Todos os produtos, categorias, fotos e status de pedidos alterados neste navegador serão descartados, e o carrinho será esvaziado.",
    );
    if (!confirmed) return;
    setBusy(true);
    const result = await demoRepository.reset();
    setBusy(false);
    if (result.ok) {
      cart.clear();
      setFeedback({ tone: "success", message: "Dados de demonstração restaurados." });
    } else {
      setFeedback({ tone: "error", message: STORAGE_ERROR_MESSAGE });
    }
  }

  return (
    <div className="mb-6 space-y-2">
      <div
        role="note"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-warning/25 bg-warning-soft/60 px-4 py-3 text-xs text-warning sm:text-sm"
      >
        <FlaskConical aria-hidden className="size-4 shrink-0" />
        {/* min-w pushes the button to its own line on phones. */}
        <p className="min-w-56 flex-1">
          <strong className="font-semibold">Modo demonstração.</strong> Os dados são fictícios e as alterações
          ficam armazenadas apenas neste navegador: outras pessoas e outros aparelhos continuam vendo os dados
          iniciais. O painel não exige login: não use este modo para dados reais.
          {snapshot?.persistent && (
            <span className="text-warning/80">
              {" "}
              Armazenamento local usado:{" "}
              {storageUsagePercent(snapshot.size) < 1 ? "menos de 1%" : `${storageUsagePercent(snapshot.size)}%`}.
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={restore}
          disabled={busy || !snapshot}
          className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-surface px-3 py-1.5 text-xs font-semibold text-warning transition-colors hover:border-warning disabled:opacity-50"
        >
          {busy ? <LoaderCircle aria-hidden className="size-3.5 animate-spin" /> : <RotateCcw aria-hidden className="size-3.5" />}
          Restaurar dados iniciais
        </button>
      </div>

      {snapshot?.issue === "corrupted" && (
        <Warning>
          Os dados salvos neste navegador estavam ilegíveis e foram substituídos pelos dados iniciais de demonstração.
        </Warning>
      )}
      {snapshot?.issue === "unavailable" && (
        <Warning>
          Este navegador bloqueou o armazenamento local (comum em janelas anônimas). As alterações valem só até
          recarregar ou fechar a página.
        </Warning>
      )}

      <p aria-live="polite" className="empty:hidden">
        {feedback && (
          <span
            className={`block rounded-xl px-4 py-2.5 text-sm ${
              feedback.tone === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
            }`}
          >
            {feedback.message}
          </span>
        )}
      </p>
    </div>
  );
}

function Warning({ children }: { children: string }) {
  return (
    <p role="alert" className="flex gap-2 rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}
