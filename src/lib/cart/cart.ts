// Pure cart operations. The cart only stores product ids and quantities;
// names, prices and stock always come from the catalog (server), so a stale
// browser copy can never dictate what is charged.

export type CartLine = {
  productId: string;
  quantity: number;
};

function clamp(quantity: number, max: number): number {
  return Math.max(0, Math.min(Math.floor(quantity), max));
}

export function addItem(
  lines: CartLine[],
  productId: string,
  quantity: number,
  maxQuantity: number,
): CartLine[] {
  const current = lines.find((l) => l.productId === productId)?.quantity ?? 0;
  return setQuantity(lines, productId, current + quantity, maxQuantity);
}

/** Sets the quantity of a line, clamped to [0, maxQuantity]. 0 removes it. */
export function setQuantity(
  lines: CartLine[],
  productId: string,
  quantity: number,
  maxQuantity: number,
): CartLine[] {
  const next = clamp(quantity, maxQuantity);
  if (next === 0) return removeItem(lines, productId);
  if (!lines.some((l) => l.productId === productId)) {
    return [...lines, { productId, quantity: next }];
  }
  return lines.map((l) =>
    l.productId === productId ? { ...l, quantity: next } : l,
  );
}

export function removeItem(lines: CartLine[], productId: string): CartLine[] {
  return lines.filter((l) => l.productId !== productId);
}

export function countItems(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

/** Validates data read from storage; anything malformed is dropped. */
export function parseCart(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: CartLine[] = [];
  for (const item of raw as Partial<CartLine>[]) {
    const { productId, quantity } = item ?? {};
    if (
      typeof productId === "string" &&
      typeof quantity === "number" &&
      Number.isInteger(quantity) &&
      quantity > 0 &&
      !lines.some((l) => l.productId === productId)
    ) {
      lines.push({ productId, quantity });
    }
  }
  return lines;
}
