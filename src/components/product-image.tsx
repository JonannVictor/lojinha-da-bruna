import { ImageOff } from "lucide-react";
import Image from "next/image";
import type { ProductImage as ProductImageType } from "@/lib/products/types";

type Props = {
  image: ProductImageType | undefined;
  sizes: string;
  /** Visible on load (likely the LCP): fetch right away, with high priority. */
  priority?: boolean;
  /** Slight zoom while a parent `.group` is hovered (product cards). */
  hoverZoom?: boolean;
};

/** Square product photo, or a neutral placeholder when there is no photo. */
export function ProductImage({ image, sizes, priority, hoverZoom }: Props) {
  return (
    <div className="relative aspect-square overflow-hidden bg-surface-muted">
      {image ? (
        <Image
          src={image.url}
          alt={image.alt}
          fill
          sizes={sizes}
          loading={priority ? "eager" : undefined}
          fetchPriority={priority ? "high" : undefined}
          className={`object-cover ${
            hoverZoom ? "transition-transform duration-700 ease-out group-hover:scale-[1.04]" : ""
          }`}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-foreground/70">
          <ImageOff aria-hidden strokeWidth={1.4} className="size-7 text-rose" />
          <span className="text-xs tracking-wide">Foto em breve</span>
        </div>
      )}
    </div>
  );
}
