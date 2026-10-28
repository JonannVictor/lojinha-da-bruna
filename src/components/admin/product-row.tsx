import { ImageOff, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ActionState } from "@/lib/admin/action-state";
import { formatPrice } from "@/lib/money";
import { ActionButton } from "./action-button";

// One product in the panel list (Supabase and demo modes).

export type ProductRowData = {
  id: string;
  name: string;
  brand: string | null;
  category_name: string | null;
  price_cents: number | null;
  stock_quantity: number | null;
  is_active: boolean;
};

export function ProductRow({
  product,
  imageUrl,
  toggle,
}: {
  product: ProductRowData;
  imageUrl: string | null;
  /** Activates or deactivates the product. */
  toggle: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:gap-4 sm:p-4">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-muted">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <ImageOff aria-hidden className="absolute inset-0 m-auto size-5 text-muted opacity-60" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link href={`/admin/produtos/${product.id}`} className="font-medium hover:text-accent">
          {product.name}
        </Link>
        <p className="truncate text-xs text-muted">
          {[product.brand, product.category_name ?? "Sem categoria"].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span className={product.price_cents === null ? "text-warning" : ""}>
            {product.price_cents === null ? "Preço a confirmar" : formatPrice(product.price_cents)}
          </span>
          <span className={product.stock_quantity === 0 ? "text-danger" : "text-muted"}>
            {product.stock_quantity === null
              ? "Estoque não controlado"
              : product.stock_quantity === 0
                ? "Esgotado"
                : `Estoque: ${product.stock_quantity}`}
          </span>
        </p>
      </div>

      <div className="flex w-full items-start justify-end gap-2 sm:w-auto">
        <span
          className={`mt-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            product.is_active ? "bg-success-soft text-success" : "bg-surface-muted text-muted"
          }`}
        >
          {product.is_active ? "Ativo" : "Inativo"}
        </span>
        <ActionButton action={toggle} showSuccess>
          {product.is_active ? "Desativar" : "Ativar"}
        </ActionButton>
        <Link
          href={`/admin/produtos/${product.id}`}
          aria-label={`Editar ${product.name}`}
          className="inline-flex size-8 items-center justify-center rounded-full border border-border hover:border-accent hover:text-accent"
        >
          <Pencil aria-hidden className="size-3.5" />
        </Link>
      </div>
    </li>
  );
}
