import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { storeConfig } from "@/config/store";
import { CartLink } from "./cart-link";
import { MobileMenu } from "./mobile-menu";
import { SearchForm, SearchFormFields } from "./search-form";
import { ActiveStoreNavLinks, StoreNavLinks } from "./store-nav";

// Returns siblings (not one wrapper) so the main row can stick to the top of
// the page while the announcement and the phone search row scroll away.
export function SiteHeader() {
  const search = (
    <Suspense fallback={<SearchFormFields defaultValue="" />}>
      <SearchForm />
    </Suspense>
  );
  const whatsappUrl = `https://wa.me/${storeConfig.whatsappNumber}`;

  return (
    <>
      <p className="bg-accent px-4 py-2 text-center text-[0.75rem] leading-5 tracking-wide text-accent-foreground">
        Finalize seu pedido com a Bruna pelo WhatsApp
      </p>

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="container-page relative flex h-16 items-center gap-3 md:h-20 md:gap-8">
          <MobileMenu>
            <Suspense fallback={<StoreNavLinks pathname={null} layout="stack" />}>
              <ActiveStoreNavLinks layout="stack" />
            </Suspense>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex min-h-11 items-center gap-2 text-sm font-semibold text-accent"
            >
              <MessageCircle aria-hidden className="size-4" />
              Atendimento pelo WhatsApp
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </MobileMenu>

          <Link
            href="/"
            className="font-display text-[1.6rem] leading-none font-semibold tracking-tight whitespace-nowrap text-accent max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2 md:text-[2rem]"
          >
            {storeConfig.name}
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-7 md:flex">
            <Suspense fallback={<StoreNavLinks pathname={null} />}>
              <ActiveStoreNavLinks />
            </Suspense>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden w-56 md:block lg:w-72">{search}</div>
            <CartLink />
          </div>
        </div>
      </header>

      <div className="container-page border-b border-border bg-background pt-1 pb-3 md:hidden">{search}</div>
    </>
  );
}
