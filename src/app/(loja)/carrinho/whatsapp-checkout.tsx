import { Info, MessageCircle } from "lucide-react";
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
  demo,
}: {
  items: CartItem[];
  number: string;
  storeName: string;
  demo: boolean;
}) {
  const link = buildCartWhatsappLink(number, storeName, items);

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
            enviar. O pedido só é confirmado pela Bruna na conversa.
          </p>
        ) : (
          <p className="text-warning">
            Nenhum item disponível para finalizar. Remova os itens indisponíveis
            ou adicione outros produtos.
          </p>
        )}
        {demo && (
          <p className="flex gap-2 rounded-xl bg-warning-soft px-3 py-2.5 text-warning">
            <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            Demonstração: os produtos são fictícios, mas o link abre o WhatsApp
            real da loja. Envie a mensagem apenas em testes combinados com a
            Bruna.
          </p>
        )}
      </div>
    </div>
  );
}
