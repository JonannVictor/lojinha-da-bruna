import {
  availabilityLabel,
  getAvailability,
  type Availability,
} from "@/lib/products/availability";
import type { Product } from "@/lib/products/types";

const styles: Record<Availability, string> = {
  available: "bg-success-soft text-success",
  out_of_stock: "bg-danger-soft text-danger",
  price_pending: "bg-warning-soft text-warning",
  inactive: "bg-surface-muted text-muted",
};

export function AvailabilityBadge({ product }: { product: Product }) {
  const availability = getAvailability(product);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[availability]}`}
    >
      {availabilityLabel[availability]}
    </span>
  );
}
