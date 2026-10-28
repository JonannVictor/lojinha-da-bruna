import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { ImageManager } from "@/components/admin/image-manager";
import { AdminPageHeader, AdminSkeleton, Notice } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { getAdminProduct, listAdminCategories } from "@/lib/admin/catalog";
import { isUuid } from "@/lib/admin/validation";
import { requireAdmin } from "@/lib/auth/admin";
import { publicImageUrl } from "@/lib/products/images";
import { requireSupabaseConfig } from "@/lib/supabase/config";
import {
  deleteProductImage,
  makeMainProductImage,
  removeProduct,
  saveProduct,
  toggleProductActive,
  uploadProductImage,
} from "../actions";

export const metadata: Metadata = {
  title: "Editar produto",
};

export default function EditProductPage({ params, searchParams }: PageProps<"/admin/produtos/[id]">) {
  return (
    <>
      <Link href="/admin/produtos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-accent">
        <ChevronLeft aria-hidden className="size-4" />
        Produtos
      </Link>
      <Suspense fallback={<AdminSkeleton rows={5} label="Carregando produto…" />}>
        <EditProduct params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function EditProduct({ params, searchParams }: PageProps<"/admin/produtos/[id]">) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [product, categories, query] = await Promise.all([
    getAdminProduct(supabase, id),
    listAdminCategories(supabase),
    searchParams,
  ]);
  if (!product) notFound();

  const { url } = requireSupabaseConfig();
  const images = product.images.map((image) => ({
    ...image,
    url: publicImageUrl(url, image.path),
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

      {query.criado === "1" && (
        <Notice tone="success">Produto criado. Agora você pode adicionar as fotos abaixo.</Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <ProductForm
          action={saveProduct.bind(null, product.id)}
          categories={categories}
          product={product}
          submitLabel="Salvar alterações"
        />

        <div className="space-y-6">
          <ImageManager
            images={images}
            upload={uploadProductImage.bind(null, product.id)}
            remove={Object.fromEntries(
              images.map((image) => [image.path, deleteProductImage.bind(null, product.id, image.path)]),
            )}
            makeMain={Object.fromEntries(
              images.map((image) => [image.path, makeMainProductImage.bind(null, product.id, image.path)]),
            )}
          />

          <section aria-labelledby="status-produto" className="space-y-4 rounded-2xl border border-border bg-surface p-5">
            <h2 id="status-produto" className="font-semibold">
              Status e exclusão
            </h2>
            <div className="space-y-1">
              <ActionButton action={toggleProductActive.bind(null, product.id, !product.is_active)} showSuccess>
                {product.is_active ? "Desativar produto" : "Ativar produto"}
              </ActionButton>
              <p className="text-xs text-muted">Desativar esconde o produto da loja e preserva o histórico.</p>
            </div>
            <div className="space-y-1 border-t border-border pt-4">
              <ActionButton
                action={removeProduct.bind(null, product.id)}
                confirm={`Excluir “${product.name}” definitivamente? As fotos também serão apagadas.`}
                className="border-danger/40 text-danger hover:border-danger hover:text-danger"
              >
                Excluir produto
              </ActionButton>
              <p className="text-xs text-muted">
                Só é possível excluir produtos que nunca foram pedidos. Os demais devem ser desativados.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
