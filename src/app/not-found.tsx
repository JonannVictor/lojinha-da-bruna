import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Root 404: renders outside the (loja) layout, so it brings the store chrome.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <EmptyState
            icon={<SearchX aria-hidden className="size-6" />}
            title="Página não encontrada"
            description="O produto ou a página que você procura não existe ou não está mais disponível."
            action={<ButtonLink href="/produtos">Ver produtos</ButtonLink>}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
