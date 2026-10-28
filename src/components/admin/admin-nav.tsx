import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/admin/actions";
import { storeConfig } from "@/config/store";
import { AdminNavLinks, ActiveAdminNavLinks } from "./admin-nav-links";

export function AdminNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/admin" className="font-display text-lg font-semibold whitespace-nowrap">
          {storeConfig.name}
          <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 align-middle font-sans text-xs font-semibold text-accent">
            Painel
          </span>
        </Link>

        <nav aria-label="Painel" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {/* The current path is request data: highlight streams in after the shell. */}
          <Suspense fallback={<AdminNavLinks pathname={null} />}>
            <ActiveAdminNavLinks />
          </Suspense>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted hover:bg-surface hover:text-foreground"
          >
            Ver loja
            <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only">(abre em nova aba)</span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted hover:bg-danger-soft hover:text-danger"
            >
              <LogOut aria-hidden className="size-4" />
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
