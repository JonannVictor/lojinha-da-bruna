import { formatPrice } from "@/lib/money";

export function ProductPrice({
  cents,
  className = "",
}: {
  cents: number | null;
  className?: string;
}) {
  if (cents === null) {
    return <p className={`text-muted italic ${className}`}>Preço sob consulta</p>;
  }
  return <p className={`font-semibold tabular-nums ${className}`}>{formatPrice(cents)}</p>;
}
