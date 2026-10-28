"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { failure, success, type ActionState } from "@/lib/admin/action-state";
import {
  createProduct,
  deleteProduct,
  setProductActive,
  updateProduct,
  type MutationResult,
} from "@/lib/admin/catalog";
import {
  addProductImage,
  removeProductImage,
  setMainProductImage,
  type ImageResult,
} from "@/lib/admin/product-images";
import { isUuid, parseProductForm } from "@/lib/admin/validation";
import { requireAdmin } from "@/lib/auth/admin";

// Every action starts with requireAdmin(): the client can call any Server
// Action directly, so the check can't live only in the page that renders the
// form. Ids arrive from the client too and are validated before use.

const GENERIC_ERROR = "Não foi possível concluir a operação. Tente novamente.";

function storefrontChanged() {
  updateTag("products");
  refresh();
}

function mutationError(result: Exclude<MutationResult<unknown>, { ok: true }>): ActionState {
  switch (result.reason) {
    case "slug_taken":
      return failure("Já existe um produto com esse endereço.", { slug: "Escolha outro endereço (slug)." });
    case "not_found":
      return failure("Produto não encontrado. Ele pode ter sido excluído.");
    case "has_orders":
      return failure("Este produto já aparece em pedidos e não pode ser excluído. Desative-o.");
    default:
      return failure("Os dados foram recusados. Confira os campos e tente novamente.");
  }
}

async function guarded(run: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await run();
  } catch (error) {
    // redirect()/notFound() are control flow, not failures.
    if (error instanceof Error && "digest" in error) throw error;
    console.error("[admin] ação de produto falhou:", error instanceof Error ? error.message : error);
    return failure(GENERIC_ERROR);
  }
}

export async function saveProduct(
  productId: string | null,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (productId !== null && !isUuid(productId)) return failure("Produto inválido.");

  const parsed = parseProductForm(formData);
  if (!parsed.ok) return failure("Corrija os campos destacados.", parsed.errors);

  let createdId: string | null = null;
  const state = await guarded(async () => {
    if (productId === null) {
      const result = await createProduct(supabase, parsed.data);
      if (!result.ok) return mutationError(result);
      createdId = result.value.id;
      return success("Produto criado.");
    }
    const result = await updateProduct(supabase, productId, parsed.data);
    if (!result.ok) return mutationError(result);
    return success("Alterações salvas.");
  });

  if (state.status === "success") storefrontChanged();
  // New products continue on the edit page, where photos can be added.
  if (createdId) redirect(`/admin/produtos/${createdId}?criado=1`);
  return state;
}

export async function toggleProductActive(
  productId: string,
  nextActive: boolean,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(productId) || typeof nextActive !== "boolean") return failure("Produto inválido.");

  const state = await guarded(async () => {
    const result = await setProductActive(supabase, productId, nextActive);
    if (!result.ok) return mutationError(result);
    return success(nextActive ? "Produto ativado." : "Produto desativado.");
  });
  if (state.status === "success") storefrontChanged();
  return state;
}

export async function removeProduct(productId: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(productId)) return failure("Produto inválido.");

  const state = await guarded(async () => {
    const result = await deleteProduct(supabase, productId);
    if (!result.ok) return mutationError(result);
    return success("Produto excluído.");
  });
  if (state.status !== "success") return state;
  updateTag("products");
  redirect("/admin/produtos?excluido=1");
}

function imageState(result: ImageResult, message: string): ActionState {
  return result.ok ? success(message) : failure(result.error);
}

export async function uploadProductImage(
  productId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(productId)) return failure("Produto inválido.");

  const alt = String(formData.get("alt") ?? "");
  const state = await guarded(async () =>
    imageState(await addProductImage(supabase, productId, formData.get("photo"), alt), "Foto adicionada."),
  );
  if (state.status === "success") storefrontChanged();
  return state;
}

export async function deleteProductImage(
  productId: string,
  path: string,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(productId) || typeof path !== "string") return failure("Foto inválida.");

  const state = await guarded(async () =>
    imageState(await removeProductImage(supabase, productId, path), "Foto removida."),
  );
  if (state.status === "success") storefrontChanged();
  return state;
}

export async function makeMainProductImage(
  productId: string,
  path: string,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (!isUuid(productId) || typeof path !== "string") return failure("Foto inválida.");

  const state = await guarded(async () =>
    imageState(await setMainProductImage(supabase, productId, path), "Foto principal atualizada."),
  );
  if (state.status === "success") storefrontChanged();
  return state;
}
