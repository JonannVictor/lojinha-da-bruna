import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isValidImagePath,
  MAX_IMAGES_PER_PRODUCT,
  parseStoredImages,
  type StoredImage,
} from "@/lib/products/images";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/supabase/config";
import { logSupabaseError, toDataSourceError } from "@/lib/supabase/errors";

// Product photo management. Upload order guarantees the storefront never
// points at a missing file:
//   add:    upload file → append path to products.images (file removed if the
//           database update fails);
//   remove: drop path from products.images → delete file (a failed delete
//           only leaves an orphan file, never a broken image).

// The bucket accepts 5 MB, but uploads go through a Server Action and Vercel
// caps request bodies at 4.5 MB. The browser resizes photos before sending
// (components/admin/image-manager.tsx), so real uploads stay well below this.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_ALT_LENGTH = 200;

export type ImageKind = { extension: "jpg" | "png" | "webp"; contentType: string };

/** Identifies the format by its signature bytes, not by name or MIME type. */
export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  const starts = (...signature: number[]) => signature.every((byte, i) => bytes[i] === byte);
  if (starts(0xff, 0xd8, 0xff)) return { extension: "jpg", contentType: "image/jpeg" };
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return { extension: "png", contentType: "image/png" };
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { extension: "webp", contentType: "image/webp" };
  }
  return null;
}

export type ImageValidation =
  | { ok: true; bytes: Uint8Array; kind: ImageKind }
  | { ok: false; error: string };

export async function validateImageFile(file: unknown): Promise<ImageValidation> {
  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, error: "Selecione uma foto." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "A foto deve ter no máximo 4 MB." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectImageKind(bytes);
  if (!kind) {
    return { ok: false, error: "Formato não suportado. Envie JPG, PNG ou WebP." };
  }
  return { ok: true, bytes, kind };
}

export type ImageResult = { ok: true } | { ok: false; error: string };

async function readImages(client: SupabaseClient, productId: string): Promise<StoredImage[] | null> {
  const { data, error } = await client.from("products").select("images").eq("id", productId).maybeSingle();
  if (error) throw toDataSourceError("ler fotos do produto", error);
  return data ? parseStoredImages((data as { images: unknown }).images) : null;
}

async function writeImages(client: SupabaseClient, productId: string, images: StoredImage[]) {
  const { data, error } = await client.from("products").update({ images }).eq("id", productId).select("id");
  if (error) {
    logSupabaseError("gravar fotos do produto", error);
    return false;
  }
  return Boolean(data && data.length > 0);
}

export async function addProductImage(
  client: SupabaseClient,
  productId: string,
  file: unknown,
  alt: string,
  randomName: () => string = () => crypto.randomUUID(),
): Promise<ImageResult> {
  const validation = await validateImageFile(file);
  if (!validation.ok) return validation;

  const images = await readImages(client, productId);
  if (images === null) return { ok: false, error: "Produto não encontrado." };
  if (images.length >= MAX_IMAGES_PER_PRODUCT) {
    return { ok: false, error: `Cada produto pode ter até ${MAX_IMAGES_PER_PRODUCT} fotos.` };
  }

  // A fresh random name per upload: nothing is ever overwritten.
  const path = `products/${productId}/${randomName()}.${validation.kind.extension}`;
  const storage = client.storage.from(PRODUCT_IMAGES_BUCKET);
  const { error: uploadError } = await storage.upload(path, validation.bytes, {
    contentType: validation.kind.contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) {
    logSupabaseError("enviar foto", uploadError);
    return { ok: false, error: "Não foi possível enviar a foto. Tente novamente." };
  }

  const saved = await writeImages(client, productId, [
    ...images,
    { path, alt: alt.trim().slice(0, MAX_ALT_LENGTH) },
  ]);
  if (!saved) {
    const { error: cleanupError } = await storage.remove([path]);
    if (cleanupError) logSupabaseError("desfazer envio de foto", cleanupError);
    return { ok: false, error: "Não foi possível salvar a foto no produto. Tente novamente." };
  }
  return { ok: true };
}

export async function removeProductImage(
  client: SupabaseClient,
  productId: string,
  path: string,
): Promise<ImageResult> {
  // Only files of this product can be removed through this product.
  if (!isValidImagePath(path, productId)) return { ok: false, error: "Foto inválida." };
  const images = await readImages(client, productId);
  if (images === null) return { ok: false, error: "Produto não encontrado." };
  if (!images.some((image) => image.path === path)) return { ok: false, error: "Foto não encontrada." };

  const saved = await writeImages(client, productId, images.filter((image) => image.path !== path));
  if (!saved) return { ok: false, error: "Não foi possível remover a foto. Tente novamente." };

  const { error } = await client.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
  if (error) logSupabaseError("excluir arquivo de foto", error);
  return { ok: true };
}

export async function setMainProductImage(
  client: SupabaseClient,
  productId: string,
  path: string,
): Promise<ImageResult> {
  if (!isValidImagePath(path, productId)) return { ok: false, error: "Foto inválida." };
  const images = await readImages(client, productId);
  if (images === null) return { ok: false, error: "Produto não encontrado." };
  const main = images.find((image) => image.path === path);
  if (!main) return { ok: false, error: "Foto não encontrada." };

  const saved = await writeImages(client, productId, [main, ...images.filter((image) => image !== main)]);
  return saved ? { ok: true } : { ok: false, error: "Não foi possível atualizar a foto principal." };
}
