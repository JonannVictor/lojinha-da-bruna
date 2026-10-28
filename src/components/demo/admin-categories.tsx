"use client";

import { Tags } from "lucide-react";
import { CategoryForm, CategoryRow } from "@/components/admin/category-editor";
import { AdminSkeleton } from "@/components/admin/page-header";
import { EmptyState } from "@/components/empty-state";
import { adminCategories } from "@/lib/demo/model";
import { useDemoSnapshot } from "@/lib/demo/store";
import { demoActions } from "./admin-common";

export function DemoCategoryManager() {
  const snapshot = useDemoSnapshot();
  if (!snapshot) return <AdminSkeleton label="Carregando categorias…" />;
  const categories = adminCategories(snapshot.state);

  return (
    <div className="space-y-6">
      <section aria-labelledby="nova-categoria" className="rounded-2xl border border-border bg-surface p-5">
        <h2 id="nova-categoria" className="mb-4 font-semibold">
          Nova categoria
        </h2>
        <CategoryForm action={demoActions.saveCategory(null)} submitLabel="Adicionar" resetOnSuccess />
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
              save={demoActions.saveCategory(category.id)}
              toggle={demoActions.toggleCategory(category.id, !category.is_active)}
              moveUp={index > 0 ? demoActions.moveCategory(category.id, "up") : null}
              moveDown={index < categories.length - 1 ? demoActions.moveCategory(category.id, "down") : null}
              remove={demoActions.deleteCategory(category.id)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
