import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeClient } from "@/test/fake-supabase";
import { parseCheckoutForm } from "./checkout";
import { buildOrderMessage, buildWhatsappUrl, orderReference } from "./whatsapp";

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

const { isCheckoutEnabled, placeOrder } = await import("./place-order");

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const ORDER = "abcdef12-3456-4789-8abc-def012345678";
const NUMBER = "5511999990000";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const validInput = {
  customerName: "Ana",
  customerPhone: null,
  deliveryAddress: null,
  lines: [{ productId: A, quantity: 2 }],
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("parseCheckoutForm", () => {
  it("accepts name, optional phone and address, and the cart lines", () => {
    const result = parseCheckoutForm(
      form({
        customerName: "  Ana   Souza ",
        customerPhone: "(11) 99999-0000",
        deliveryAddress: "",
        cart: JSON.stringify([{ productId: A, quantity: 2 }, { productId: B, quantity: 1 }]),
      }),
    );
    expect(result).toEqual({
      ok: true,
      data: {
        customerName: "Ana Souza",
        customerPhone: "(11) 99999-0000",
        deliveryAddress: null,
        lines: [{ productId: A, quantity: 2 }, { productId: B, quantity: 1 }],
      },
    });
  });

  it("ignores any price sent by the browser", () => {
    const result = parseCheckoutForm(
      form({ customerName: "Ana", cart: JSON.stringify([{ productId: A, quantity: 1, price_cents: 1 }]) }),
    );
    expect(result.ok && result.data.lines).toEqual([{ productId: A, quantity: 1 }]);
  });

  it.each([
    ["negative quantity", [{ productId: A, quantity: -1 }]],
    ["zero quantity", [{ productId: A, quantity: 0 }]],
    ["fractional quantity", [{ productId: A, quantity: 1.5 }]],
    ["above the per-item limit", [{ productId: A, quantity: 21 }]],
    ["non-uuid id", [{ productId: "demo-01", quantity: 1 }]],
    ["empty cart", []],
  ])("rejects a cart with %s", (_label, lines) => {
    const result = parseCheckoutForm(form({ customerName: "Ana", cart: JSON.stringify(lines) }));
    expect(result.ok).toBe(false);
  });

  it("rejects malformed JSON, missing name and invalid phone", () => {
    const result = parseCheckoutForm(form({ customerName: "A", customerPhone: "abc", cart: "{oops" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["cart", "customerName", "customerPhone"]);
  });
});

describe("WhatsApp message", () => {
  const order = {
    id: ORDER,
    customerName: "Ana",
    deliveryAddress: "Rua A, 1",
    subtotalCents: 5980,
    items: [{ name: "Sérum", quantity: 2, unitPriceCents: 2990, lineTotalCents: 5980 }],
  };

  it("lists the saved items, subtotal and reference", () => {
    const message = buildOrderMessage(order);
    expect(orderReference(ORDER)).toBe("ABCDEF12");
    expect(message).toContain("pedido *#ABCDEF12*");
    expect(message).toMatch(/\*1\. Sérum\*\n2 un\. × R\$\s29,90 = R\$\s59,80\n/);
    expect(message).toMatch(/\*Subtotal: R\$\s59,80\*/);
    expect(message).toContain("Nome: Ana");
    expect(message).toContain("Endereço: Rua A, 1");
  });

  it("encodes the message in the wa.me link", () => {
    const url = buildWhatsappUrl(NUMBER, "Olá & tchau\n");
    expect(url).toBe(`https://wa.me/${NUMBER}?text=Ol%C3%A1%20%26%20tchau%0A`);
  });
});

describe("placeOrder", () => {
  it("saving orders is off without Supabase and refuses without a number", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(isCheckoutEnabled()).toBe(false);

    const fake = createFakeClient();
    const result = await placeOrder(validInput, fake.client, null);
    expect(result).toMatchObject({ ok: false, reason: "disabled" });
    expect(fake.rpcCalls).toEqual([]);
  });

  it("persists through create_order and builds the link from the saved order", async () => {
    const fake = createFakeClient({
      rpc: () => ({ data: [{ order_id: ORDER, subtotal_cents: 5980 }], error: null }),
      query: () => ({
        data: {
          id: ORDER,
          customer_name: "Ana",
          delivery_address: null,
          subtotal_cents: 5980,
          order_items: [{ product_name: "Sérum", quantity: 2, unit_price_cents: 2990, line_total_cents: 5980 }],
        },
        error: null,
      }),
    });
    const result = await placeOrder(validInput, fake.client, NUMBER);

    expect(fake.rpcCalls).toEqual([
      {
        name: "create_order",
        args: {
          p_customer_name: "Ana",
          p_customer_phone: null,
          p_delivery_address: null,
          p_items: [{ product_id: A, quantity: 2 }],
        },
      },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.orderId).toBe(ORDER);
      expect(decodeURIComponent(result.whatsappUrl)).toContain("*1. Sérum*");
      expect(result.whatsappUrl.startsWith(`https://wa.me/${NUMBER}?text=`)).toBe(true);
    }
  });

  it.each(["product_unavailable", "price_pending", "insufficient_stock"])(
    "asks the customer to review the cart on %s",
    async (code) => {
      const fake = createFakeClient({ rpc: () => ({ data: null, error: { code: "P0001", message: code } }) });
      expect(await placeOrder(validInput, fake.client, NUMBER)).toMatchObject({ ok: false, reason: "unavailable" });
    },
  );

  it("does not leak database errors to the customer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fake = createFakeClient({
      rpc: () => ({ data: null, error: { code: "08006", message: "could not connect to server db.abc" } }),
    });
    const result = await placeOrder(validInput, fake.client, NUMBER);
    expect(result).toEqual({
      ok: false,
      reason: "error",
      message: "Não foi possível registrar o pedido agora. Tente novamente em instantes.",
    });
  });
});
