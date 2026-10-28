import { PackageOpen, Plus, Search, SearchX } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { inputClass } from "@/components/admin/form-controls";
import { AdminPageHeader, AdminSkeleton, Notice } from "@/components/admin/page-header";
import { ProductRow } from "@/components/admin/product-row";
import { ButtonLink } from "@/components/button-link";
import { DemoProductList } from "@/components/demo/admin-products";
import { EmptyState } from "@/components/empty-state";
import { listAdminProducts, type ProductStatusFilter } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/auth/admin";
import { isDemoMode } from "@/lib/demo/mode";
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
        {isDemoMode() ? <DemoProducts searchParams={searchParams} /> : <ProductList searchParams={searchParams} />}
      </Suspense>
    </>
  );
}

async function DemoProducts({ searchParams }: Pick<PageProps<"/admin/produtos">, "searchParams">) {
  const params = await searchParams;
  return (
    <DemoProductList
      initialQuery={first(params.q).slice(0, 100)}
      initialStatus={first(params.status)}
      deleted={params.excluido === "1"}
    />
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
            <ProductRow
              key={product.id}
              product={product}
              imageUrl={product.images[0] ? publicImageUrl(url, product.images[0].path) : null}
              toggle={toggleProductActive.bind(null, product.id, !product.is_active)}
            />
          ))}
        </ul>
      )}
    </>
  );
}
