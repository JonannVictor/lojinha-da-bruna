import { MessageCircle } from "lucide-react";
import { buttonStyles } from "@/components/button-link";
import type { CartItem } from "@/lib/cart/summary";
import { buildCartWhatsappLink } from "@/lib/orders/whatsapp";

/**
 * Opens WhatsApp with the cart already written, for the customer to review
 * and send. A plain link (new tab), so the browser's usual behavior applies
 * and nothing is sent or saved by the site.
 */
export function WhatsappCheckout({
  items,
  number,
  storeName,
  pix,
}: {
  items: CartItem[];
  number: string;
  storeName: string;
  /** Pix QR Code shown above: the message says it was paid that way. */
  pix: boolean;
}) {
  const link = buildCartWhatsappLink(number, storeName, items, { pix });

  return (
    <div className="mt-5 space-y-3">
      {link ? (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby="whatsapp-ajuda"
          className={`${buttonStyles.primary} w-full`}
        >
          <MessageCircle aria-hidden className="size-4" />
          Finalizar pedido pelo WhatsApp
          <span className="sr-only">(abre em nova aba)</span>
        </a>
      ) : (
        <button
          type="button"
          disabled
          aria-describedby="whatsapp-ajuda"
          className={`${buttonStyles.primary} w-full`}
        >
          <MessageCircle aria-hidden className="size-4" />
          Finalizar pedido pelo WhatsApp
        </button>
      )}

      <div id="whatsapp-ajuda" className="space-y-2 text-xs text-muted">
        {link ? (
          <p>
            O WhatsApp será aberto com a mensagem pronta para você revisar e
            enviar{pix && ". Mande o comprovante do Pix na mesma conversa"}. O
            pedido só é confirmado pela Bruna na conversa.
          </p>
        ) : (
          <p className="text-warning">
            Nenhum item disponível para finalizar. Remova os itens indisponíveis
            ou adicione outros produtos.
          </p>
        )}
      </div>
    </div>
  );
}
