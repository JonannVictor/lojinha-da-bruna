"use client";

import { useState } from "react";
import type { ProductImage as ProductImageType } from "@/lib/products/types";
import { ProductImage } from "./product-image";

/** Main photo plus clickable thumbnails when the product has more than one. */
export function ProductGallery({ images }: { images: ProductImageType[] }) {
  const [selected, setSelected] = useState(0);
  const current = images[Math.min(selected, images.length - 1)];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border shadow-card">
        <ProductImage image={current} sizes="(min-width: 1024px) 45vw, (min-width: 768px) 50vw, 100vw" priority />
      </div>
      {images.length > 1 && (
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-pressed={index === selected}
                aria-label={`Ver foto ${index + 1} de ${images.length}`}
                className={`block w-full overflow-hidden rounded-lg border-2 transition-colors ${
                  index === selected ? "border-accent" : "border-transparent hover:border-rose-light"
                }`}
              >
                <ProductImage image={image} sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
