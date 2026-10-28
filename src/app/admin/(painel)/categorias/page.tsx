import { Tags } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryForm, CategoryRow } from "@/components/admin/category-editor";
import { AdminPageHeader, AdminSkeleton } from "@/components/admin/page-header";
import { DemoCategoryManager } from "@/components/demo/admin-categories";
import { EmptyState } from "@/components/empty-state";
import { listAdminCategories } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/auth/admin";
import { isDemoMode } from "@/lib/demo/mode";
import {
  moveCategoryAction,
  removeCategory,
  saveCategory,
  toggleCategoryActive,
} from "./actions";

export const metadata: Metadata = {
  title: "Categorias",
};

export default function AdminCategoriesPage() {
  return (
    <>
      <AdminPageHeader
        title="Categorias"
        description="A ordem abaixo é a ordem em que as categorias aparecem na loja. Categorias inativas ficam ocultas."
      />
      {isDemoMode() ? (
        <DemoCategoryManager />
      ) : (
        <Suspense fallback={<AdminSkeleton label="Carregando categorias…" />}>
          <Categories />
        </Suspense>
      )}
    </>
  );
}

async function Categories() {
  const { supabase } = await requireAdmin();
  const categories = await listAdminCategories(supabase);

  return (
    <div className="space-y-6">
      <section aria-labelledby="nova-categoria" className="rounded-2xl border border-border bg-surface p-5">
        <h2 id="nova-categoria" className="mb-4 font-semibold">
          Nova categoria
        </h2>
        <CategoryForm action={saveCategory.bind(null, null)} submitLabel="Adicionar" resetOnSuccess />
      </section>

      {categories.length === 0 ? (
        <EmptyState
          icon={<Tags aria-hidden className="size-6" />}
          title="Nenhuma categoria"
          description="Crie a primeira categoria no formulário acima."
        />
      ) : (
        <ol className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {categories.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              save={saveCategory.bind(null, category.id)}
              toggle={toggleCategoryActive.bind(null, category.id, !category.is_active)}
              moveUp={index > 0 ? moveCategoryAction.bind(null, category.id, "up") : null}
              moveDown={index < categories.length - 1 ? moveCategoryAction.bind(null, category.id, "down") : null}
              remove={removeCategory.bind(null, category.id)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
