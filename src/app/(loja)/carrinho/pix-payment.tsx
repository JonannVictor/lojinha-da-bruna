"use client";

import { Check, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";
import { buttonStyles } from "@/components/button-link";
import { formatPrice } from "@/lib/money";
import { buildPixPayload, type PixReceiver } from "@/lib/payments/pix";

/**
 * Static Pix QR Code with the products total, paid before the order is sent
 * on WhatsApp.
 */
export function PixPayment({ receiver, amountCents }: { receiver: PixReceiver; amountCents: number }) {
  const payload = useMemo(() => buildPixPayload(receiver, amountCents), [receiver, amountCents]);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(payload);
    } catch {
      // Clipboard blocked: the code stays visible in the field to copy by hand.
    }
  }

  return (
    <section aria-labelledby="pix-titulo" className="mt-5 rounded-xl border border-border bg-surface-muted p-4">
      <h3 id="pix-titulo" className="text-sm font-semibold">
        1. Pague com Pix
      </h3>
      <p className="mt-1 text-xs text-muted">
        Escaneie o QR Code no app do seu banco ou use o Pix copia e cola. Valor:{" "}
        <strong className="text-foreground">{formatPrice(amountCents)}</strong>
      </p>

      <div className="mx-auto mt-3 w-fit rounded-lg bg-white p-2.5">
        <QRCodeSVG
          value={payload}
          size={168}
          level="M"
          marginSize={0}
          role="img"
          aria-label={`QR Code Pix de ${formatPrice(amountCents)}`}
        />
      </div>

      <label htmlFor="pix-copia-e-cola" className="mt-3 block text-xs font-medium">
        Pix copia e cola
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="pix-copia-e-cola"
          readOnly
          value={payload}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-xs text-muted"
        />
        <button type="button" onClick={copy} className={`${buttonStyles.secondary} shrink-0 px-3 py-1.5 text-xs`}>
          {copied === payload ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
          {copied === payload ? "Copiado" : "Copiar"}
        </button>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied === payload ? "Código Pix copiado" : ""}
      </p>

      <p className="mt-3 text-xs text-muted">
        Recebedor: {receiver.name}. Confira o nome antes de confirmar o pagamento.
      </p>
      <p className="mt-3 text-sm font-semibold">2. Envie o pedido e o comprovante pelo WhatsApp</p>
    </section>
  );
}
