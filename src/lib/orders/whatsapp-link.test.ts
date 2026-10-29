import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveWhatsappNumber } from "@/config/store";
import type { CartLine } from "@/lib/cart/cart";
import { summarizeCart } from "@/lib/cart/summary";
import { setProductActive, storefrontProducts, updateProduct } from "@/lib/demo/model";
import { createSeedState } from "@/lib/demo/seed";
import { formatPrice } from "@/lib/money";
import type { Product } from "@/lib/products/types";
import { buildCartWhatsappLink, buildProductWhatsappUrl } from "./whatsapp";

const NUMBER = "555481394629";
const STORE = "Lojinha da Bruna";
const ctx = { now: "2026-10-28T12:00:00.000Z", newId: () => "00000000-0000-4000-8000-000000000999" };

const state = createSeedState(new Date("2026-10-28T10:00:00.000Z"));
const products = storefrontProducts(state);
const byName = (start: string) => products.find((p) => p.name.startsWith(start))!;
const colonia = byName("Colônia"); // R$ 89,00, stock not tracked
const hidratante = byName("Hidratante"); // R$ 29,00, 8 in stock
const base = byName("Base"); // out of stock
const shampoo = byName("Shampoo"); // price pending

function link(lines: CartLine[], catalog: Product[] = products) {
  return buildCartWhatsappLink(NUMBER, STORE, summarizeCart(lines, catalog).items);
}

function decodedText(url: string): string {
  const { origin, pathname, searchParams } = new URL(url);
  expect(`${origin}${pathname}`).toBe(`https://wa.me/${NUMBER}`);
  return searchParams.get("text")!;
}

describe("number configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the official number unless a valid override is given", () => {
    expect(resolveWhatsappNumber(undefined)).toBe(NUMBER);
    expect(resolveWhatsappNumber("")).toBe(NUMBER);
    expect(resolveWhatsappNumber("abc")).toBe(NUMBER);
    expect(resolveWhatsappNumber("+55 (11) 98888-7777")).toBe("5511988887777");
  });

  it("storeConfig exposes the official number by default", async () => {
    vi.stubEnv("WHATSAPP_NUMBER", "");
    vi.resetModules();
    const { storeConfig } = await import("@/config/store");
    expect(storeConfig.whatsappNumber).toBe(NUMBER);
  });
});

describe("buildCartWhatsappLink", () => {
  it("points to the store number and lists items, quantities, prices and total", () => {
    const result = link([
      { productId: hidratante.id, quantity: 3 },
      { productId: colonia.id, quantity: 1 },
    ])!;
    expect(result.url.startsWith(`https://wa.me/${NUMBER}?text=`)).toBe(true);
    expect(result.totalCents).toBe(3 * 2900 + 8900);

    const text = decodedText(result.url);
    expect(text).toBe(result.message);
    expect(text).toBe(
      [
        "Olá, Bruna! Tudo bem?",
        "Gostaria de fazer um pedido pelo site da *Lojinha da Bruna*.",
        "",
        "*RESUMO DO PEDIDO*",
        "",
        "*1. Hidratante corporal*",
        "3 un. × R$ 29,00 = R$ 87,00",
        "",
        "*2. Colônia floral*",
        "1 un. × R$ 89,00 = R$ 89,00",
        "",
        "*Total dos produtos: R$ 176,00*",
        "_Valor referente apenas aos produtos. Entrega e forma de pagamento a combinar._",
        "",
        "Aguardo a confirmação da disponibilidade. Desde já, agradeço!",
      ].join("\n"),
    );
  });

  it("never claims the order is confirmed and invents no fees or payment terms", () => {
    const text = link([{ productId: colonia.id, quantity: 1 }])!.message.toLowerCase();
    expect(text).not.toMatch(/confirmado|frete|desconto|taxa|pix|cartão|parcela/);
    expect(text).toContain("aguardo a confirmação");
  });

  it("states the Pix payment of the products total when the QR Code is offered", () => {
    const lines = [{ productId: colonia.id, quantity: 2 }];
    const result = buildCartWhatsappLink(NUMBER, STORE, summarizeCart(lines, products).items, { pix: true })!;
    expect(result.message).toContain(
      `*Total dos produtos: ${formatPrice(17800)}*\n*Pagamento:* Pix de ${formatPrice(17800)} pelo QR Code do site. Envio o comprovante em seguida.\n_A entrega é combinada à parte._`,
    );
    expect(result.message).not.toContain("forma de pagamento a combinar");
    expect(result.message.toLowerCase()).not.toMatch(/confirmado|frete|desconto|taxa|cartão|parcela/);
  });

  it("encodes accents, line breaks and symbols for the URL", () => {
    const result = link([{ productId: colonia.id, quantity: 2 }])!;
    const query = result.url.split("?text=")[1];
    expect(query).not.toMatch(/[\s&#?ô]/);
    expect(query).toContain(encodeURIComponent("Colônia"));
    expect(query).toContain("%0A");
    expect(query).toBe(encodeURIComponent(result.message));
  });

  it("is null for an empty cart or when every item is unavailable", () => {
    expect(link([])).toBeNull();
    expect(
      link([
        { productId: base.id, quantity: 1 },
        { productId: shampoo.id, quantity: 2 },
        { productId: "produto-removido", quantity: 1 },
      ]),
    ).toBeNull();
  });

  it("leaves unavailable items out of the message and the total", () => {
    const result = link([
      { productId: base.id, quantity: 1 },
      { productId: hidratante.id, quantity: 1 },
      { productId: shampoo.id, quantity: 1 },
    ])!;
    expect(result.totalCents).toBe(2900);
    expect(result.message).toContain("Hidratante corporal");
    expect(result.message).not.toContain("Base líquida");
    expect(result.message).not.toContain("Shampoo");
  });

  it("uses current catalog data: new price, stock limit and deactivation", () => {
    const cart: CartLine[] = [
      { productId: hidratante.id, quantity: 20 }, // above the 8 in stock
      { productId: colonia.id, quantity: 1 },
    ];
    const seedHidratante = state.products.find((p) => p.id === hidratante.id)!;
    const edited = updateProduct(state, hidratante.id, { ...seedHidratante, price_cents: 3150 }, ctx);
    if (!edited.ok) throw new Error(edited.reason);
    const deactivated = setProductActive(edited.state, colonia.id, false, ctx);
    if (!deactivated.ok) throw new Error(deactivated.reason);

    const result = link(cart, storefrontProducts(deactivated.state))!;
    expect(result.message).toContain("8 un. × R$ 31,50 = R$ 252,00");
    expect(result.message).not.toContain("Colônia");
    expect(result.totalCents).toBe(8 * 3150);
  });
});
describe("buildProductWhatsappUrl", () => {
  it("starts a conversation about the product", () => {
    const text = decodedText(buildProductWhatsappUrl(NUMBER, STORE, { ...colonia, brand: "Marca X" }));
    expect(text).toBe(
      [
        "Olá, Bruna! Tudo bem?",
        "Vi no site da *Lojinha da Bruna* o produto abaixo e gostaria de mais informações:",
        "",
        "*Colônia floral*",
        "Marca: Marca X",
        "Preço no site: R$ 89,00",
        "",
        "Aguardo seu retorno. Desde já, agradeço!",
      ].join("\n"),
    );
  });

  it("never adds a test notice", () => {
    const text = decodedText(buildProductWhatsappUrl(NUMBER, STORE, colonia));
    expect(text.startsWith("Olá, Bruna!")).toBe(true);
    expect(text).not.toMatch(/demonstra|teste|fictíci/i);
  });

  it("omits the price when it is pending and the brand when missing", () => {
    const text = decodedText(buildProductWhatsappUrl(NUMBER, STORE, { ...shampoo, brand: null }));
    expect(text).toContain("*Shampoo nutritivo*\n\nAguardo seu retorno.");
    expect(text).not.toMatch(/Marca|Preço/);
  });

  it("strips WhatsApp formatting characters from product data", () => {
    const text = decodedText(buildProductWhatsappUrl(NUMBER, STORE, { ...colonia, name: "*Promo* _kit_" }));
    expect(text).toContain("\n*Promo kit*\n");
  });
});
