import type { Metadata } from "next";
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
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold">Seu carrinho</h1>
      {isDemoMode() ? (
        <DemoCartView checkout={whatsapp} pix={storeConfig.pix} />
      ) : (
        <CartView checkout={checkout} pix={storeConfig.pix} />
      )}
    </div>
  );
}
