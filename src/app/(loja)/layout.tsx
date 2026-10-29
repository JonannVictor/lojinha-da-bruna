import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Storefront chrome. The admin panel (/admin) has its own layout.
export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
