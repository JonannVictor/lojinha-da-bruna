"use client";

import { ExternalLink, PackageOpen, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { inputClass } from "@/components/admin/form-controls";
import { ImageManager } from "@/components/admin/image-manager";
import { AdminPageHeader, AdminSkeleton, Notice } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { ProductRow } from "@/components/admin/product-row";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { adminCategories, adminProducts, type DemoProductFilters } from "@/lib/demo/model";
import { useDemoSnapshot } from "@/lib/demo/store";
import { DEMO_IMAGE_LIMITS, demoActions } from "./admin-common";

type Status = NonNullable<DemoProductFilters["status"]>;

const statusOptions: { value: Status; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

export function DemoProductList({
  initialQuery,
  initialStatus,
  deleted,
}: {
  initialQuery: string;
  initialStatus: string;
  deleted: boolean;
}) {
  const snapshot = useDemoSnapshot();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<Status>(
    statusOptions.find((o) => o.value === initialStatus)?.value ?? "all",
  );

  if (!snapshot) return <AdminSkeleton label="Carregando produtos…" />;

  const categories = adminCategories(snapshot.state);
  const products = adminProducts(snapshot.state, { query, category, status });
  const isFiltered = Boolean(query.trim()) || category !== "all" || status !== "all";

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setStatus("all");
  }

  return (
    <>
      {deleted && <Notice tone="success">Produto excluído.</Notice>}

      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-5 flex flex-wrap gap-2">
        <label htmlFor="busca" className="sr-only">
          Buscar por nome ou marca
        </label>
        <input
          id="busca"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 100))}
          placeholder="Buscar por nome ou marca"
          className={`${inputClass} min-w-48 flex-1 sm:max-w-xs`}
        />
        <label htmlFor="categoria" className="sr-only">
          Categoria
        </label>
        <select
          id="categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`${inputClass} w-auto`}
        >
          <option value="all">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.is_active ? "" : " (inativa)"}
            </option>
          ))}
          <option value="none">Sem categoria</option>
        </select>
        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className={`${inputClass} w-auto`}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {isFiltered && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl px-3 text-sm font-medium text-accent hover:text-accent-hover"
          >
            Limpar filtros
          </button>
        )}
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
            action={
              <button type="button" onClick={clearFilters} className="font-semibold text-accent hover:text-accent-hover">
                Limpar filtros
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={<PackageOpen aria-hidden className="size-6" />}
            title="Nenhum produto cadastrado"
            description="Cadastre o primeiro produto ou restaure os dados iniciais."
            action={<ButtonLink href="/admin/produtos/novo">Novo produto</ButtonLink>}
          />
        )
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              imageUrl={product.images[0]?.url ?? null}
              toggle={demoActions.toggleProduct(product.id, !product.is_active)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

export function DemoNewProduct() {
  const snapshot = useDemoSnapshot();
  const router = useRouter();
  if (!snapshot) return <AdminSkeleton rows={3} label="Carregando formulário…" />;

  return (
    <ProductForm
      action={demoActions.saveProduct(null, (id) => router.push(`/admin/produtos/${id}?criado=1`))}
      categories={adminCategories(snapshot.state)}
      submitLabel="Criar produto"
    />
  );
}

export function DemoProductEditor({ id, created }: { id: string; created: boolean }) {
  const snapshot = useDemoSnapshot();
  const router = useRouter();
  if (!snapshot) return <AdminSkeleton rows={5} label="Carregando produto…" />;

  const product = snapshot.state.products.find((p) => p.id === id);
  if (!product) {
    return (
      <EmptyState
        icon={<SearchX aria-hidden className="size-6" />}
        title="Produto não encontrado"
        description="Ele pode ter sido excluído ou os dados iniciais foram restaurados."
        action={<ButtonLink href="/admin/produtos">Voltar para produtos</ButtonLink>}
      />
    );
  }

  const images = product.images.map((image) => ({
    path: image.id,
    url: image.url,
    alt: image.alt || product.name,
  }));

  return (
    <>
      <AdminPageHeader
        title={product.name}
        description={product.is_active ? "Ativo na loja." : "Inativo: não aparece na loja."}
        action={
          product.is_active ? (
            <Link
              href={`/produtos/${product.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
            >
              Ver na loja
              <ExternalLink aria-hidden className="size-3.5" />
              <span className="sr-only">(abre em nova aba)</span>
            </Link>
          ) : undefined
        }
      />

      {created && <Notice tone="success">Produto criado. Agora você pode adicionar as fotos abaixo.</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <ProductForm
          action={demoActions.saveProduct(product.id)}
          categories={adminCategories(snapshot.state)}
          product={product}
          submitLabel="Salvar alterações"
        />

        <div className="space-y-6">
          <ImageManager
            images={images}
            upload={demoActions.uploadImage(product.id)}
            remove={Object.fromEntries(images.map((i) => [i.path, demoActions.removeImage(product.id, i.path)]))}
            makeMain={Object.fromEntries(images.map((i) => [i.path, demoActions.makeMainImage(product.id, i.path)]))}
            limits={DEMO_IMAGE_LIMITS}
            note={
              <p className="mt-2 rounded-xl bg-surface-muted px-3 py-2 text-xs text-muted">
                As fotos ficam salvas só neste navegador, reduzidas para cerca de 800 px. Use apenas
                fotos que você pode mostrar; elas não são enviadas a nenhum servidor.
              </p>
            }
          />

          <section aria-labelledby="status-produto" className="space-y-4 rounded-2xl border border-border bg-surface p-5">
            <h2 id="status-produto" className="font-semibold">
              Status e exclusão
            </h2>
            <div className="space-y-1">
              <ActionButton action={demoActions.toggleProduct(product.id, !product.is_active)} showSuccess>
                {product.is_active ? "Desativar produto" : "Ativar produto"}
              </ActionButton>
              <p className="text-xs text-muted">Desativar esconde o produto da loja e preserva o histórico.</p>
            </div>
            <div className="space-y-1 border-t border-border pt-4">
              <ActionButton
                action={demoActions.deleteProduct(product.id, () => router.push("/admin/produtos?excluido=1"))}
                confirm={`Excluir “${product.name}” definitivamente? As fotos também serão apagadas.`}
                className="border-danger/40 text-danger hover:border-danger hover:text-danger"
              >
                Excluir produto
              </ActionButton>
              <p className="text-xs text-muted">
                Só é possível excluir produtos que não aparecem em pedidos. Os demais devem ser desativados.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
