import {
  availabilityLabel,
  getAvailability,
  type Availability,
} from "@/lib/products/availability";
import type { Product } from "@/lib/products/types";

const styles: Record<Availability, string> = {
  available: "bg-success-soft text-success",
  out_of_stock: "bg-surface text-foreground",
  price_pending: "bg-warning-soft text-warning",
  inactive: "bg-surface-muted text-foreground/80",
};

export function AvailabilityBadge({ product }: { product: Product }) {
  const availability = getAvailability(product);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] leading-none font-semibold tracking-wide uppercase ${styles[availability]}`}
    >
      {availabilityLabel[availability]}
    </span>
  );
}
