import { initialCategories } from "@/lib/products/categories";
import { DEMO_IMAGE_DIR, DEMO_STATE_VERSION, type DemoOrder, type DemoProduct, type DemoState } from "./model";

// Initial catalog of the demo mode. The products, prices, stock values and
// orders below are placeholders written to read like the final store; they
// are not confirmed by Bruna and must be replaced by the real catalog. No
// brand is named, and the pictures are illustrations made for the store (in
// public/demo/produtos). The categories come from the project brief.

/** Stable ids (valid UUIDs) keep carts and links working across resets. */
const categoryId = (n: number) => `de000000-0000-4000-8000-00000000000${n}`;
const productId = (n: number) => `de000000-0000-4000-8000-1000000000${String(n).padStart(2, "0")}`;
const imageId = (n: number) => `de000000-0000-4000-8000-3000000000${String(n).padStart(2, "0")}`;
const orderId = (n: number) => `de000000-0000-4000-8000-2000000000${String(n).padStart(2, "0")}`;

type SeedProduct = {
  name: string;
  slug: string;
  category: number;
  price_cents: number | null;
  stock_quantity: number | null;
  is_active?: boolean;
  is_featured?: boolean;
  description: string;
  /** File in public/demo/produtos and its alt text. */
  image: { file: string; alt: string };
};

const products: SeedProduct[] = [
  { name: "Paleta de sombras", slug: "paleta-de-sombras", category: 1, price_cents: 4500, stock_quantity: 6, is_featured: true,
    description: "Paleta com nove sombras em tons nude, rosados e terrosos, com acabamentos matte e cintilante. Combina com maquiagens do dia a dia e produções para a noite.",
    image: { file: "paleta-de-sombras", alt: "Ilustração de uma paleta com nove sombras em tons nude, rosados e terrosos, com pincel" } },
  { name: "Colônia floral", slug: "colonia-floral", category: 2, price_cents: 8900, stock_quantity: null, is_featured: true,
    description: "Colônia de fragrância floral suave e delicada, para usar todos os dias.",
    image: { file: "colonia-floral", alt: "Ilustração de um frasco de vidro com colônia rosada e uma flor ao lado" } },
  { name: "Hidratante corporal", slug: "hidratante-corporal", category: 3, price_cents: 2900, stock_quantity: 8, is_featured: true,
    description: "Loção hidratante de rápida absorção e textura leve, que deixa a pele macia e perfumada. Frasco com válvula pump.",
    image: { file: "hidratante-corporal", alt: "Ilustração de um frasco de hidratante com válvula pump e um pote de creme aberto" } },
  { name: "Necessaire de viagem", slug: "necessaire-de-viagem", category: 4, price_cents: 3900, stock_quantity: 3, is_featured: true,
    description: "Necessaire matelassê com zíper dourado, com espaço para maquiagem e itens de cuidados pessoais. Prática para a bolsa ou para viagens.",
    image: { file: "necessaire-de-viagem", alt: "Ilustração de uma necessaire matelassê com zíper dourado e um batom ao lado" } },
  { name: "Body splash", slug: "body-splash", category: 2, price_cents: 3500, stock_quantity: 12,
    description: "Body splash de fragrância cítrica e refrescante, para borrifar no corpo ao longo do dia.",
    image: { file: "body-splash", alt: "Ilustração de um frasco spray de body splash cítrico borrifando, com uma fatia de toranja" } },
  // Out of stock: shown, but can't be bought.
  { name: "Base líquida", slug: "base-liquida", category: 1, price_cents: 5900, stock_quantity: 0,
    description: "Base líquida de cobertura média e acabamento natural, que uniformiza o tom da pele com leveza.",
    image: { file: "base-liquida", alt: "Ilustração de um frasco de base líquida bege com tampa preta, uma amostra espalhada e uma esponja" } },
  // Price to be confirmed: shown, but can't be bought.
  { name: "Shampoo nutritivo", slug: "shampoo-nutritivo", category: 3, price_cents: null, stock_quantity: 5,
    description: "Shampoo de limpeza suave que ajuda a nutrir os fios e realçar o brilho. Para uso diário.",
    image: { file: "shampoo-nutritivo", alt: "Ilustração de um frasco de shampoo cor de mel com tampa flip-top e bolhas de espuma" } },
  // Inactive: visible only in the panel.
  { name: "Kit presente", slug: "kit-presente", category: 4, price_cents: 7900, stock_quantity: 2, is_active: false,
    description: "Caixa de presente com perfume e cartão, pronta para presentear em datas especiais.",
    image: { file: "kit-presente", alt: "Ilustração de uma caixa de presente com laço rosa, um cartão e um frasco de perfume" } },
];

/** Name and description of an initial product, for page metadata. */
export function findSeedProduct(slug: string): { name: string; description: string } | null {
  const product = products.find((p) => p.slug === slug && (p.is_active ?? true));
  return product ? { name: product.name, description: product.description } : null;
}

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
      description: p.description,
      brand: null,
      category_id: categoryId(p.category),
      price_cents: p.price_cents,
      stock_quantity: p.stock_quantity,
      is_active: p.is_active ?? true,
      is_featured: p.is_featured ?? false,
      images: [{ id: imageId(index + 1), url: `${DEMO_IMAGE_DIR}/${p.image.file}.webp`, alt: p.image.alt }],
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
      code: "PED-003",
      customer_name: "Ana Paula Ribeiro",
      status: "pending",
      created_at: minutesBefore(now, 90),
      items: [item(3, 2), item(2, 1)],
    },
    {
      id: orderId(2),
      code: "PED-002",
      customer_name: "Carla Mendes",
      status: "confirmed",
      created_at: minutesBefore(now, 60 * 26),
      items: [item(1, 1)],
    },
    {
      id: orderId(3),
      code: "PED-001",
      customer_name: "Juliana Rocha",
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
