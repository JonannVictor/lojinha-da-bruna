import type { Metadata } from "next";
import { isCheckoutEnabled } from "@/lib/orders/place-order";
import { CartView } from "./cart-view";

export const metadata: Metadata = {
  title: "Carrinho",
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold">Seu carrinho</h1>
      {/* Disabled until the WhatsApp number and Supabase keys are configured. */}
      <CartView checkoutEnabled={isCheckoutEnabled()} />
    </div>
  );
}
