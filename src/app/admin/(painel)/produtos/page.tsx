import { ImageOff, PackageOpen, Pencil, Plus, Search, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { inputClass } from "@/components/admin/form-controls";
import { AdminPageHeader, AdminSkeleton, Notice } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { listAdminProducts, type AdminProduct, type ProductStatusFilter } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/auth/admin";
import { formatPrice } from "@/lib/money";
import { publicImageUrl } from "@/lib/products/images";
import { requireSupabaseConfig } from "@/lib/supabase/config";
import { toggleProductActive } from "./actions";

export const metadata: Metadata = {
  title: "Produtos",
};

const statusOptions: { value: ProductStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/produtos">) {
  return (
    <>
      <AdminPageHeader
        title="Produtos"
        action={
          <ButtonLink href="/admin/produtos/novo">
            <Plus aria-hidden className="size-4" />
            Novo produto
          </ButtonLink>
        }
      />
      <Suspense fallback={<AdminSkeleton label="Carregando produtos…" />}>
        <ProductList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ProductList({ searchParams }: Pick<PageProps<"/admin/produtos">, "searchParams">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const query = first(params.q).slice(0, 100);
  const rawStatus = first(params.status);
  const status = statusOptions.some((o) => o.value === rawStatus) ? (rawStatus as ProductStatusFilter) : "all";

  const products = await listAdminProducts(supabase, { query, status });
  const { url } = requireSupabaseConfig();
  const isFiltered = Boolean(query) || status !== "all";

  return (
    <>
      {params.excluido === "1" && <Notice tone="success">Produto excluído.</Notice>}

      <form role="search" className="mb-5 flex flex-wrap gap-2">
        <label htmlFor="busca" className="sr-only">
          Buscar produtos
        </label>
        <input
          id="busca"
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Nome, marca ou categoria"
          className={`${inputClass} max-w-xs flex-1`}
        />
        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <select id="status" name="status" defaultValue={status} className={`${inputClass} w-auto`}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 text-sm font-semibold hover:border-accent hover:text-accent">
          <Search aria-hidden className="size-4" />
          Buscar
        </button>
      </form>

      <p className="mb-3 text-sm text-muted" aria-live="polite">
        {products.length === 1 ? "1 produto." : `${products.length} produtos.`}
      </p>

      {products.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={<SearchX aria-hidden className="size-6" />}
            title="Nenhum produto encontrado"
            description="Tente outro termo ou limpe os filtros."
            action={<ButtonLink href="/admin/produtos" variant="secondary">Limpar filtros</ButtonLink>}
          />
        ) : (
          <EmptyState
            icon={<PackageOpen aria-hidden className="size-6" />}
            title="Nenhum produto cadastrado"
            description="Cadastre o primeiro produto com os dados confirmados pela Bruna."
            action={<ButtonLink href="/admin/produtos/novo">Novo produto</ButtonLink>}
          />
        )
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {products.map((product) => (
            <ProductRow key={product.id} product={product} supabaseUrl={url} />
          ))}
        </ul>
      )}
    </>
  );
}

function ProductRow({ product, supabaseUrl }: { product: AdminProduct; supabaseUrl: string }) {
  const photo = product.images[0];
  return (
    <li className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:gap-4 sm:p-4">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-muted">
        {photo ? (
          <Image src={publicImageUrl(supabaseUrl, photo.path)} alt="" fill sizes="56px" className="object-cover" />
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
          <span className="text-muted">
            {product.stock_quantity === null ? "Estoque não controlado" : `Estoque: ${product.stock_quantity}`}
          </span>
        </p>
      </div>

      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            product.is_active ? "bg-success-soft text-success" : "bg-surface-muted text-muted"
          }`}
        >
          {product.is_active ? "Ativo" : "Inativo"}
        </span>
        <ActionButton action={toggleProductActive.bind(null, product.id, !product.is_active)}>
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
