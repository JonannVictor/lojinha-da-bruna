import { PRODUCT_IMAGES_BUCKET } from "@/lib/supabase/config";
import type { ProductImage } from "./types";

// Photos live in the Supabase Storage bucket "product-images", under
// products/<product id>/<random name>.<ext>. The database stores only the
// path and alt text; the public URL is derived here. Anything that doesn't
// match the expected shape is dropped, so a bad row never renders a broken
// <img> in the storefront.

export type StoredImage = {
  path: string;
  alt: string;
};

export const MAX_IMAGES_PER_PRODUCT = 8;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const IMAGE_PATH = new RegExp(`^products/${UUID}/[A-Za-z0-9_-]{1,80}\\.(jpg|jpeg|png|webp)$`);

export function isValidImagePath(path: string, productId?: string): boolean {
  if (!IMAGE_PATH.test(path)) return false;
  return productId === undefined || path.startsWith(`products/${productId}/`);
}

export function parseStoredImages(raw: unknown): StoredImage[] {
  if (!Array.isArray(raw)) return [];
  const images: StoredImage[] = [];
  for (const item of raw as Partial<StoredImage>[]) {
    if (
      item &&
      typeof item.path === "string" &&
      isValidImagePath(item.path) &&
      !images.some((image) => image.path === item.path)
    ) {
      images.push({ path: item.path, alt: typeof item.alt === "string" ? item.alt : "" });
    }
  }
  return images.slice(0, MAX_IMAGES_PER_PRODUCT);
}

export function publicImageUrl(supabaseUrl: string, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${encoded}`;
}

export function toProductImages(
  supabaseUrl: string,
  raw: unknown,
  productName: string,
): ProductImage[] {
  return parseStoredImages(raw).map(({ path, alt }) => ({
    url: publicImageUrl(supabaseUrl, path),
    alt: alt.trim() || productName,
  }));
}
