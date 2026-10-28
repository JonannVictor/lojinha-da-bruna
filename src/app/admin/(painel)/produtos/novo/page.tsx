import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminPageHeader, AdminSkeleton } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { listAdminCategories } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/auth/admin";
import { saveProduct } from "../actions";

export const metadata: Metadata = {
  title: "Novo produto",
};

export default function NewProductPage() {
  return (
    <>
      <Link href="/admin/produtos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-accent">
        <ChevronLeft aria-hidden className="size-4" />
        Produtos
      </Link>
      <AdminPageHeader
        title="Novo produto"
        description="Depois de salvar, você poderá adicionar as fotos."
      />
      <Suspense fallback={<AdminSkeleton rows={3} label="Carregando formulário…" />}>
        <NewProductForm />
      </Suspense>
    </>
  );
}

async function NewProductForm() {
  const { supabase } = await requireAdmin();
  const categories = await listAdminCategories(supabase);
  return (
    <ProductForm
      action={saveProduct.bind(null, null)}
      categories={categories}
      submitLabel="Criar produto"
    />
  );
}
