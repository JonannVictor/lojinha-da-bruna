import { failure, type ActionState } from "./action-state";
import type { MutationResult } from "./catalog";

// Messages for expected write failures, shared by the Server Actions
// (Supabase) and the demo panel (localStorage), so both read the same.

type MutationFailure = Exclude<MutationResult<unknown>, { ok: true }>;

export function productMutationError(result: MutationFailure): ActionState {
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

export function categoryMutationError(result: MutationFailure): ActionState {
  switch (result.reason) {
    case "slug_taken":
      return failure("Já existe uma categoria com esse nome ou endereço.", {
        slug: "Escolha outro endereço (slug).",
      });
    case "not_found":
      return failure("Categoria não encontrada.");
    case "has_products":
      return failure("Esta categoria tem produtos. Mova-os para outra categoria ou desative-a.");
    default:
      return failure("Os dados foram recusados. Confira os campos e tente novamente.");
  }
}
