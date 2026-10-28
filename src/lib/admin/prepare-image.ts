// Browser-only image preparation used before saving a product photo.

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ImageLimits = {
  /** Longest side, in pixels, after resizing. */
  maxDimension: number;
  /** Size limit of the prepared file, in bytes. */
  maxBytes: number;
};

const QUALITIES = [0.85, 0.7, 0.55];

/**
 * Downscales large photos (phone pictures are often 4–10 MB) and re-encodes
 * them as WebP, falling back to JPEG, lowering the quality step by step until
 * the result fits `maxBytes`. The returned blob may still be larger than the
 * limit: the caller checks and explains. Throws when the file can't be read.
 */
export async function prepareImage(file: File, { maxDimension, maxBytes }: ImageLimits): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= maxBytes) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  let result: Blob | null = null;
  for (const quality of QUALITIES) {
    const webp = await encode("image/webp", quality);
    // Browsers without a WebP encoder silently return PNG.
    result = webp && webp.type === "image/webp" ? webp : await encode("image/jpeg", quality);
    if (!result) throw new Error("encode");
    if (result.size <= maxBytes) break;
  }
  return result!;
}
