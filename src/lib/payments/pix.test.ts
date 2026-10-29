import { describe, expect, it } from "vitest";
import { buildPixPayload, parsePixKey, resolvePixReceiver } from "./pix";

const receiver = { key: "123e4567-e12b-12d1-a456-426655440000", name: "Fulano de Tal", city: "BRASILIA" };

describe("buildPixPayload", () => {
  it("matches the example of the Banco Central BR Code manual", () => {
    expect(buildPixPayload(receiver, null)).toBe(
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
    );
  });

  it("includes the amount with two decimals before the country field", () => {
    const payload = buildPixPayload(receiver, 17600);
    expect(payload).toContain("53039865406176.005802BR");
    expect(buildPixPayload(receiver, 5)).toContain("54040.05");
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  });
});

describe("parsePixKey", () => {
  it("normalizes each kind of key", () => {
    expect(parsePixKey(" Bruna@Exemplo.com ")).toBe("bruna@exemplo.com");
    expect(parsePixKey("123.456.789-09")).toBe("12345678909");
    expect(parsePixKey("12.345.678/0001-95")).toBe("12345678000195");
    expect(parsePixKey("+55 (54) 98139-4629")).toBe("+5554981394629");
    expect(parsePixKey("123E4567-E12B-12D1-A456-426655440000")).toBe(receiver.key);
  });

  it("rejects malformed keys", () => {
    expect(parsePixKey("")).toBeNull();
    expect(parsePixKey("1234")).toBeNull();
    expect(parsePixKey("+1 555 0100")).toBeNull();
  });
});

describe("resolvePixReceiver", () => {
  it("is null while nothing is configured", () => {
    expect(resolvePixReceiver({ key: null, receiverName: null, city: null })).toBeNull();
  });

  it("strips accents and truncates name and city", () => {
    expect(
      resolvePixReceiver({ key: "+5554981394629", receiverName: "Bruna Conceição de Araújo Lima", city: "São José dos Pinhais" }),
    ).toEqual({ key: "+5554981394629", name: "Bruna Conceicao de Araujo", city: "Sao Jose dos Pi" });
  });

  it("throws on a partial or invalid configuration", () => {
    expect(() => resolvePixReceiver({ key: "abc", receiverName: "Bruna", city: "Passo Fundo" })).toThrow(/Pix/);
    expect(() => resolvePixReceiver({ key: "+5554981394629", receiverName: null, city: null })).toThrow(/Pix/);
  });
});
