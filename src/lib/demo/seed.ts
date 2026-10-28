import { initialCategories } from "@/lib/products/categories";
import { DEMO_STATE_VERSION, type DemoOrder, type DemoProduct, type DemoState } from "./model";

// Initial demo data. Every product, price, stock value and order below is
// FICTITIOUS, made only to show how the store works: none of them is a
// product sold by Bruna. Names end in "(exemplo)", the brand is "Marca
// fictícia" and there are no photos, so nothing passes as a real item. The
// categories come from the project brief.

export const DEMO_DESCRIPTION =
  "Produto fictício, criado apenas para demonstrar a loja. Não está à venda.";

const DEMO_BRAND = "Marca fictícia";

/** Stable ids (valid UUIDs) keep carts and links working across resets. */
const categoryId = (n: number) => `de000000-0000-4000-8000-00000000000${n}`;
const productId = (n: number) => `de000000-0000-4000-8000-1000000000${String(n).padStart(2, "0")}`;
const orderId = (n: number) => `de000000-0000-4000-8000-2000000000${String(n).padStart(2, "0")}`;

type SeedProduct = {
  name: string;
  slug: string;
  category: number;
  price_cents: number | null;
  stock_quantity: number | null;
  is_active?: boolean;
  is_featured?: boolean;
};

const products: SeedProduct[] = [
  { name: "Paleta de sombras (exemplo)", slug: "exemplo-paleta-de-sombras", category: 1, price_cents: 4500, stock_quantity: 6, is_featured: true },
  { name: "Colônia floral (exemplo)", slug: "exemplo-colonia-floral", category: 2, price_cents: 8900, stock_quantity: null, is_featured: true },
  { name: "Hidratante corporal (exemplo)", slug: "exemplo-hidratante-corporal", category: 3, price_cents: 2900, stock_quantity: 8, is_featured: true },
  { name: "Necessaire de viagem (exemplo)", slug: "exemplo-necessaire-de-viagem", category: 4, price_cents: 3900, stock_quantity: 3, is_featured: true },
  { name: "Body splash (exemplo)", slug: "exemplo-body-splash", category: 2, price_cents: 3500, stock_quantity: 12 },
  // Out of stock: shown, but can't be bought.
  { name: "Base líquida (exemplo)", slug: "exemplo-base-liquida", category: 1, price_cents: 5900, stock_quantity: 0 },
  // Price to be confirmed: shown, but can't be bought.
  { name: "Shampoo nutritivo (exemplo)", slug: "exemplo-shampoo-nutritivo", category: 3, price_cents: null, stock_quantity: 5 },
  // Inactive: visible only in the panel.
  { name: "Kit presente (exemplo)", slug: "exemplo-kit-presente", category: 4, price_cents: 7900, stock_quantity: 2, is_active: false },
];

function minutesBefore(now: Date, minutes: number): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

export function createSeedState(now: Date = new Date()): DemoState {
  const seededProducts: DemoProduct[] = products.map((p, index) => {
    // One minute apart, so "newest first" keeps the list order above.
    const timestamp = minutesBefore(now, index + 1);
    return {
      id: productId(index + 1),
      name: p.name,
      slug: p.slug,
      description: DEMO_DESCRIPTION,
      brand: DEMO_BRAND,
      category_id: categoryId(p.category),
      price_cents: p.price_cents,
      stock_quantity: p.stock_quantity,
      is_active: p.is_active ?? true,
      is_featured: p.is_featured ?? false,
      images: [],
      created_at: timestamp,
      updated_at: timestamp,
    };
  });

  const item = (n: number, quantity: number) => {
    const product = seededProducts[n - 1];
    return {
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price_cents: product.price_cents!,
    };
  };

  const orders: DemoOrder[] = [
    {
      id: orderId(1),
      code: "DEMO-003",
      customer_name: "Cliente de demonstração 3",
      status: "pending",
      created_at: minutesBefore(now, 90),
      items: [item(3, 2), item(2, 1)],
    },
    {
      id: orderId(2),
      code: "DEMO-002",
      customer_name: "Cliente de demonstração 2",
      status: "confirmed",
      created_at: minutesBefore(now, 60 * 26),
      items: [item(1, 1)],
    },
    {
      id: orderId(3),
      code: "DEMO-001",
      customer_name: "Cliente de demonstração 1",
      status: "fulfilled",
      created_at: minutesBefore(now, 60 * 72),
      items: [item(5, 3), item(4, 1)],
    },
  ];

  return {
    version: DEMO_STATE_VERSION,
    categories: initialCategories.map((c, index) => ({
      id: categoryId(index + 1),
      name: c.name,
      slug: c.slug,
      is_active: true,
      position: (index + 1) * 10,
    })),
    products: seededProducts,
    orders,
    activity: [],
  };
}
