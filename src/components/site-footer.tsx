import Link from "next/link";
import type { ReactNode } from "react";
import { storeConfig } from "@/config/store";

export function SiteFooter() {
  const { name, tagline, whatsappNumber, instagramUrl, city, businessHours } =
    storeConfig;

  return (
    <footer className="mt-20 bg-accent-hover text-rose-light sm:mt-28">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-16">
        <div className="max-w-sm">
          <p className="font-display text-3xl font-semibold text-accent-foreground">{name}</p>
          <p className="mt-3 text-sm leading-relaxed">{tagline}.</p>
          <p className="mt-2 text-sm leading-relaxed text-on-wine-muted">
            Escolha pelo site e finalize o pedido em uma conversa com a Bruna.
          </p>
        </div>

        <nav aria-label="Rodapé">
          <FooterHeading>Navegação</FooterHeading>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><FooterLink href="/">Início</FooterLink></li>
            <li><FooterLink href="/produtos">Produtos</FooterLink></li>
            <li><FooterLink href="/carrinho">Carrinho</FooterLink></li>
          </ul>
        </nav>

        <div>
          <FooterHeading>Atendimento</FooterHeading>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <FooterLink href={`https://wa.me/${whatsappNumber}`} external>
                WhatsApp
              </FooterLink>
            </li>
            {instagramUrl && (
              <li>
                <FooterLink href={instagramUrl} external>
                  Instagram
                </FooterLink>
              </li>
            )}
            {city && <li>{city}</li>}
            {businessHours && <li>{businessHours}</li>}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs leading-relaxed text-on-wine-muted sm:flex-row sm:justify-between sm:gap-8">
          <p className="shrink-0">© {name}</p>
          <p className="sm:text-right">
            As marcas exibidas pertencem aos seus respectivos titulares. A {name}{" "}
            é uma revendedora independente, sem vínculo oficial com os fabricantes.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[0.6875rem] font-semibold tracking-[0.18em] text-accent-foreground uppercase">
      {children}
    </h2>
  );
}

function FooterLink({ href, external, children }: { href: string; external?: boolean; children: ReactNode }) {
  const className =
    "underline-offset-4 transition-colors hover:text-accent-foreground hover:underline";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
