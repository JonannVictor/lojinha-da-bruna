import { describe, expect, it } from "vitest";
import {
  centsToInput,
  parseCategoryForm,
  parsePriceToCents,
  parseProductForm,
  parseStock,
  slugify,
} from "./validation";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parsePriceToCents", () => {
  it.each([
    ["29,90", 2990],
    ["29.90", 2990],
    ["29,9", 2990],
    ["29", 2900],
    ["R$ 1.234,56", 123456],
    ["1.234", 123400],
    ["0,01", 1],
  ])("parses %s", (raw, cents) => {
    expect(parsePriceToCents(raw)).toBe(cents);
  });

  it("treats an empty value as 'price to be confirmed'", () => {
    expect(parsePriceToCents("")).toBeNull();
    expect(parsePriceToCents("  ")).toBeNull();
  });

  it.each(["-10", "0", "0,00", "abc", "12,345", "1,2,3", "1e3", "12.3.4,5"])("rejects %s", (raw) => {
    expect(parsePriceToCents(raw)).toBe("invalid");
  });

  it("round-trips to the form format", () => {
    expect(centsToInput(2990)).toBe("29,90");
    expect(centsToInput(null)).toBe("");
  });
});

describe("parseStock", () => {
  it("accepts whole non-negative numbers and blank (not tracked)", () => {
    expect(parseStock("")).toBeNull();
    expect(parseStock("0")).toBe(0);
    expect(parseStock("12")).toBe(12);
  });

  it.each(["-1", "1.5", "abc", "100001"])("rejects %s", (raw) => {
    expect(parseStock(raw)).toBe("invalid");
  });
});

describe("slugify", () => {
  it("removes accents, spaces and symbols", () => {
    expect(slugify("  Sérum Facial — 30 ml! ")).toBe("serum-facial-30-ml");
    expect(slugify("Ação & Reação")).toBe("acao-reacao");
  });
});

describe("parseProductForm", () => {
  it("accepts a complete product", () => {
    const result = parseProductForm(
      form({
        name: " Sérum Facial ",
        slug: "",
        brand: "Marca X",
        category_id: "11111111-1111-4111-8111-111111111111",
        price: "49,90",
        stock_quantity: "4",
        description: "Hidratante",
        is_active: "on",
      }),
    );
    expect(result).toEqual({
      ok: true,
      data: {
        name: "Sérum Facial",
        slug: "serum-facial",
        brand: "Marca X",
        category_id: "11111111-1111-4111-8111-111111111111",
        price_cents: 4990,
        stock_quantity: 4,
        description: "Hidratante",
        is_active: true,
        is_featured: false,
      },
    });
  });

  it("keeps optional fields null (price to confirm, untracked stock)", () => {
    const result = parseProductForm(form({ name: "Produto" }));
    expect(result.ok && result.data).toMatchObject({
      price_cents: null,
      stock_quantity: null,
      brand: null,
      description: null,
      category_id: null,
      is_active: false,
    });
  });

  it("reports each invalid field", () => {
    const result = parseProductForm(
      form({
        name: "",
        slug: "Com Espaço",
        category_id: "não-é-uuid",
        price: "-3",
        stock_quantity: "-1",
        brand: "x".repeat(81),
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["brand", "category_id", "name", "price_cents", "slug", "stock_quantity"].sort(),
      );
    }
  });

  it("rejects prices above the database limit", () => {
    const result = parseProductForm(form({ name: "Caro", price: "100.000,00" }));
    expect(result.ok).toBe(false);
  });
});

describe("parseCategoryForm", () => {
  it("derives the slug from the name", () => {
    expect(parseCategoryForm(form({ name: "Cuidados pessoais" }))).toEqual({
      ok: true,
      data: { name: "Cuidados pessoais", slug: "cuidados-pessoais" },
    });
  });

  it("requires a name and a valid slug", () => {
    const result = parseCategoryForm(form({ name: "", slug: "Inválido!" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveProperty("name");
  });
});
