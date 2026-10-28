import { failure, success, type ActionState } from "@/lib/admin/action-state";
import { categoryMutationError, productMutationError } from "@/lib/admin/mutation-messages";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/admin/prepare-image";
import { parseCategoryForm, parseProductForm } from "@/lib/admin/validation";
import { MAX_DEMO_IMAGES_PER_PRODUCT } from "./model";
import type { CatalogRepository, RepositoryResult, StorageFailure } from "./store";

// Demo counterparts of the panel's Server Actions: same signature
// ((state, formData) => ActionState), same validation (parseProductForm...)
// and same messages, so ProductForm, CategoryForm, ImageManager and
// ActionButton are reused without changes. They write to a repository
// instead of calling the server.

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;
type Failure = Exclude<RepositoryResult, { ok: true }>;

export const STORAGE_FULL_MESSAGE =
  "O armazenamento deste navegador está cheio e a alteração não foi salva. Remova fotos de outros produtos de demonstração ou restaure os dados iniciais.";
export const PHOTO_STORAGE_FULL_MESSAGE =
  "Não há espaço no armazenamento deste navegador para esta foto. Alternativas: use uma foto menor ou recortada, remova fotos de outros produtos de demonstração ou mantenha o produto sem foto (a loja mostra “Foto em breve”).";
export const STORAGE_ERROR_MESSAGE =
  "O navegador não permitiu salvar os dados de demonstração. Verifique se o armazenamento de sites está liberado e tente novamente.";

function isStorageFailure(result: Failure): result is StorageFailure {
  return result.reason === "storage_full" || result.reason === "storage_error";
}

function toState(
  result: RepositoryResult<unknown>,
  message: string,
  onError: (result: Exclude<Failure, StorageFailure>) => ActionState,
): ActionState {
  if (result.ok) return success(message);
  if (isStorageFailure(result)) {
    return failure(result.reason === "storage_full" ? STORAGE_FULL_MESSAGE : STORAGE_ERROR_MESSAGE);
  }
  return onError(result);
}

/** Encodes a photo as a data: URL, the only way to keep it in localStorage. */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

export function createDemoAdminActions(repository: CatalogRepository) {
  return {
    saveProduct(productId: string | null, onCreated?: (id: string) => void): Action {
      return async (_state, formData) => {
        const parsed = parseProductForm(formData);
        if (!parsed.ok) return failure("Corrija os campos destacados.", parsed.errors);
        if (productId === null) {
          const result = await repository.createProduct(parsed.data);
          if (result.ok) onCreated?.(result.value.id);
          return toState(result, "Produto criado.", productMutationError);
        }
        return toState(await repository.updateProduct(productId, parsed.data), "Alterações salvas.", productMutationError);
      };
    },

    toggleProduct(productId: string, nextActive: boolean): Action {
      return async () =>
        toState(
          await repository.setProductActive(productId, nextActive),
          nextActive ? "Produto ativado." : "Produto desativado.",
          productMutationError,
        );
    },

    deleteProduct(productId: string, onDeleted?: () => void): Action {
      return async () => {
        const result = await repository.deleteProduct(productId);
        if (result.ok) onDeleted?.();
        return toState(result, "Produto excluído.", productMutationError);
      };
    },

    uploadImage(productId: string): Action {
      return async (_state, formData) => {
        const photo = formData.get("photo");
        if (!(photo instanceof Blob) || photo.size === 0) return failure("Selecione uma foto.");
        if (!ACCEPTED_IMAGE_TYPES.includes(photo.type)) return failure("Formato não suportado. Envie JPG, PNG ou WebP.");
        const result = await repository.addProductImage(productId, {
          url: await blobToDataUrl(photo),
          alt: String(formData.get("alt") ?? ""),
        });
        if (!result.ok && result.reason === "storage_full") return failure(PHOTO_STORAGE_FULL_MESSAGE);
        return toState(result, "Foto adicionada.", (error) =>
          error.reason === "invalid"
            ? failure(`Limite de ${MAX_DEMO_IMAGES_PER_PRODUCT} fotos por produto na demonstração.`)
            : productMutationError(error),
        );
      };
    },

    removeImage(productId: string, imageId: string): Action {
      return async () =>
        toState(await repository.removeProductImage(productId, imageId), "Foto removida.", productMutationError);
    },

    makeMainImage(productId: string, imageId: string): Action {
      return async () =>
        toState(
          await repository.setMainProductImage(productId, imageId),
          "Foto principal atualizada.",
          productMutationError,
        );
    },

    saveCategory(categoryId: string | null): Action {
      return async (_state, formData) => {
        const parsed = parseCategoryForm(formData);
        if (!parsed.ok) return failure("Corrija os campos destacados.", parsed.errors);
        return categoryId === null
          ? toState(await repository.createCategory(parsed.data), "Categoria criada.", categoryMutationError)
          : toState(
              await repository.updateCategory(categoryId, parsed.data),
              "Categoria atualizada.",
              categoryMutationError,
            );
      };
    },

    toggleCategory(categoryId: string, nextActive: boolean): Action {
      return async () =>
        toState(
          await repository.setCategoryActive(categoryId, nextActive),
          nextActive ? "Categoria ativada." : "Categoria desativada.",
          categoryMutationError,
        );
    },

    moveCategory(categoryId: string, direction: "up" | "down"): Action {
      return async () =>
        toState(await repository.moveCategory(categoryId, direction), "Ordem atualizada.", categoryMutationError);
    },

    deleteCategory(categoryId: string): Action {
      return async () =>
        toState(await repository.deleteCategory(categoryId), "Categoria excluída.", categoryMutationError);
    },
  };
}
