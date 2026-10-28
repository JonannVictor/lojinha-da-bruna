"use client";

import { LoaderCircle } from "lucide-react";
import { startTransition, useActionState, useEffect, type FormEvent, type InputHTMLAttributes } from "react";
import { buttonStyles } from "@/components/button-link";
import { cart } from "@/lib/cart/cart-store";
import type { CartLine } from "@/lib/cart/cart";
import { submitOrder, type CheckoutState } from "./actions";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none aria-invalid:border-danger";

/**
 * Collects the customer's details and submits the order. The browser sends
 * only product ids and quantities; the server validates and prices them.
 */
export function CheckoutForm({
  lines,
  disabled,
  onCartChanged,
}: {
  lines: CartLine[];
  disabled: boolean;
  onCartChanged: () => void;
}) {
  const [state, dispatch, pending] = useActionState<CheckoutState, FormData>(submitOrder, { status: "idle" });
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  useEffect(() => {
    if (state.status === "success") {
      // The order is saved: empty the cart and hand over to WhatsApp.
      cart.clear();
      window.location.assign(state.whatsappUrl);
    } else if (state.status === "error" && state.refreshCart) {
      onCartChanged();
    }
  }, [state, onCartChanged]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("cart", JSON.stringify(lines));
    startTransition(() => dispatch(formData));
  }

  const field = (name: string, label: string, props: InputHTMLAttributes<HTMLInputElement>) => (
    <div className="space-y-1">
      <label htmlFor={`checkout-${name}`} className="block text-xs font-medium">
        {label}
      </label>
      <input
        id={`checkout-${name}`}
        name={name}
        className={inputClass}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `checkout-${name}-error` : undefined}
        {...props}
      />
      {errors[name] && (
        <p id={`checkout-${name}-error`} className="text-xs text-danger">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 space-y-3">
      {field("customerName", "Seu nome", { autoComplete: "name", required: true, maxLength: 120 })}
      {field("customerPhone", "Telefone com DDD (opcional)", { autoComplete: "tel", inputMode: "tel", maxLength: 30 })}
      {field("deliveryAddress", "Endereço para entrega (opcional)", { autoComplete: "street-address", maxLength: 500 })}

      <p aria-live="polite" className="text-xs empty:hidden">
        {state.status === "error" && <span className="text-danger">{state.message}</span>}
      </p>

      <button
        type="submit"
        disabled={disabled || pending || state.status === "success"}
        className={`${buttonStyles.primary} w-full`}
      >
        {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        {pending ? "Registrando pedido…" : "Finalizar pelo WhatsApp"}
      </button>
    </form>
  );
}
