import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { storeConfig } from "@/config/store";
import { isDemoMode } from "@/lib/demo/mode";
import { isCheckoutEnabled } from "@/lib/orders/place-order";
import { CartView, DemoCartView, type Checkout } from "./cart-view";

export const metadata: Metadata = {
  title: "Carrinho",
};

export default function CartPage() {
  const whatsapp = { kind: "whatsapp", number: storeConfig.whatsappNumber, storeName: storeConfig.name } as const;
  // With Supabase the order is saved before WhatsApp opens; without it (or in
  // demo mode) WhatsApp opens directly with the cart contents.
  const checkout: Checkout = isCheckoutEnabled() ? { kind: "order" } : whatsapp;

  return (
    <div className="container-page pt-8 sm:pt-12">
      <PageIntro eyebrow="Carrinho" title="Seu carrinho">
        Confira os itens e finalize o pedido com a Bruna pelo WhatsApp.
      </PageIntro>
      {isDemoMode() ? (
        <DemoCartView checkout={whatsapp} pix={storeConfig.pix} />
      ) : (
        <CartView checkout={checkout} pix={storeConfig.pix} />
      )}
    </div>
  );
}
