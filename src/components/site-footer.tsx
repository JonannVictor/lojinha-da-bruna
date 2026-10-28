import Link from "next/link";
import { storeConfig } from "@/config/store";

export function SiteFooter() {
  const { name, tagline, whatsappNumber, instagramUrl, city, businessHours } =
    storeConfig;
  const hasContact = whatsappNumber || instagramUrl || city || businessHours;

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-display text-lg font-semibold">{name}</p>
          <p className="mt-2 text-sm text-muted">{tagline}</p>
        </div>

        <nav aria-label="Rodapé">
          <h2 className="text-sm font-semibold">Navegação</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/" className="hover:text-accent">Início</Link></li>
            <li><Link href="/produtos" className="hover:text-accent">Produtos</Link></li>
            <li><Link href="/carrinho" className="hover:text-accent">Carrinho</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold">Contato</h2>
          {hasContact ? (
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {whatsappNumber && (
                <li>
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    className="hover:text-accent"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>
                </li>
              )}
              {instagramUrl && (
                <li>
                  <a
                    href={instagramUrl}
                    className="hover:text-accent"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Instagram
                  </a>
                </li>
              )}
              {city && <li>{city}</li>}
              {businessHours && <li>{businessHours}</li>}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Informações de contato em breve.
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted sm:px-6">
          As marcas exibidas pertencem aos seus respectivos titulares. A {name}{" "}
          é uma revendedora independente, sem vínculo oficial com os fabricantes.
        </p>
      </div>
    </footer>
  );
}
