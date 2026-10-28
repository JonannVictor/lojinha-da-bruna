import { ImageOff } from "lucide-react";
import Image from "next/image";
import type { ProductImage as ProductImageType } from "@/lib/products/types";

type Props = {
  image: ProductImageType | undefined;
  sizes: string;
  priority?: boolean;
};

/** Square product photo, or a neutral placeholder when there is no photo. */
export function ProductImage({ image, sizes, priority }: Props) {
  return (
    <div className="relative aspect-square overflow-hidden bg-surface-muted">
      {image ? (
        <Image
          src={image.url}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
          <ImageOff aria-hidden className="size-8 opacity-60" />
          <span className="text-xs">Foto em breve</span>
        </div>
      )}
    </div>
  );
}
