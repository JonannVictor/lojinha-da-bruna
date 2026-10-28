import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";

// notFound() inside the store (e.g. unknown product): rendered within the
// (loja) layout, which already provides the header and footer.
export default function StoreNotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <EmptyState
        icon={<SearchX aria-hidden className="size-6" />}
        title="Página não encontrada"
        description="O produto ou a página que você procura não existe ou não está mais disponível."
        action={<ButtonLink href="/produtos">Ver produtos</ButtonLink>}
      />
    </div>
  );
}
