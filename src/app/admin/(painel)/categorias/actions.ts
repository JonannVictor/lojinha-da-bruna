"use server";

import { refresh, updateTag } from "next/cache";
import { failure, success, type ActionState } from "@/lib/admin/action-state";
import { categoryMutationError as mutationError } from "@/lib/admin/mutation-messages";
import {
  createCategory,
  deleteCategory,
  moveCategory,
  setCategoryActive,
  updateCategory,
  type MutationResult,
} from "@/lib/admin/catalog";
import { isUuid, parseCategoryForm } from "@/lib/admin/validation";
import { requireAdmin } from "@/lib/auth/admin";

const GENERIC_ERROR = "Não foi possível concluir a operação. Tente novamente.";

function storefrontChanged() {
  updateTag("categories");
  // Product pages embed the category name.
  updateTag("products");
  refresh();
}

async function run(action: () => Promise<MutationResult>, message: string): Promise<ActionState> {
  try {
    const result = await action();
    if (!result.ok) return mutationError(result);
  } catch (error) {
    console.error("[admin] ação de categoria falhou:", error instanceof Error ? error.message : error);
    return failure(GENERIC_ERROR);
  }
  storefrontChanged();
  return success(message);
}

export async function saveCategory(
  categoryId: string | null,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (categoryId !== null && !isUuid(categoryId)) return failure("Categoria inválida.");

  const parsed = parseCategoryForm(formData);
  if (!parsed.ok) return failure("Corrija os campos destacados.", parsed.errors);

  return categoryId === null
    ? run(() => createCategory(supabase, parsed.data), "Categoria criada.")
    : run(() => updateCategory(supabase, categoryId, parsed.data), "Categoria atualizada.");
}

export async function toggleCategoryActive(
  categoryId: string,
  nextActive: boolean,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(categoryId) || typeof nextActive !== "boolean") return failure("Categoria inválida.");
  return run(
    () => setCategoryActive(supabase, categoryId, nextActive),
    nextActive ? "Categoria ativada." : "Categoria desativada.",
  );
}

export async function moveCategoryAction(
  categoryId: string,
  direction: "up" | "down",
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(categoryId) || (direction !== "up" && direction !== "down")) {
    return failure("Categoria inválida.");
  }
  return run(() => moveCategory(supabase, categoryId, direction), "Ordem atualizada.");
}

export async function removeCategory(categoryId: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(categoryId)) return failure("Categoria inválida.");
  return run(() => deleteCategory(supabase, categoryId), "Categoria excluída.");
}
