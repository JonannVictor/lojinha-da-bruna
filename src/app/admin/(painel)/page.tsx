import { ArrowRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminPageHeader, AdminSkeleton } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/button-link";
import { getCatalogOverview } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: "Início",
};

export default function AdminHomePage() {
  return (
    <>
      <AdminPageHeader
        title="Painel"
        description="Resumo do catálogo da loja."
        action={
          <ButtonLink href="/admin/produtos/novo">
            <Plus aria-hidden className="size-4" />
            Novo produto
          </ButtonLink>
        }
      />
      <Suspense fallback={<AdminSkeleton rows={2} label="Carregando resumo…" />}>
        <Overview />
      </Suspense>
    </>
  );
}

async function Overview() {
  const { supabase, session } = await requireAdmin();
  const overview = await getCatalogOverview(supabase);

  const cards = [
    { label: "Produtos cadastrados", value: overview.products, href: "/admin/produtos" },
    { label: "Ativos na loja", value: overview.active, href: "/admin/produtos?status=active" },
    { label: "Categorias", value: overview.categories, href: "/admin/categorias" },
  ];
  const pending = [
    { label: "ativos com preço a confirmar", value: overview.pricePending },
    { label: "ativos sem foto", value: overview.withoutPhotos },
    { label: "ativos esgotados", value: overview.outOfStock },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {session.email && <p className="text-sm text-muted">Conectada como {session.email}.</p>}

      <ul className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <li key={card.label}>
            <Link
              href={card.href}
              className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent"
            >
              <span className="font-display text-3xl font-semibold">{card.value}</span>
              <span className="mt-1 flex items-center justify-between text-sm text-muted">
                {card.label}
                <ArrowRight aria-hidden className="size-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="pendencias" className="rounded-2xl border border-border bg-surface p-5">
        <h2 id="pendencias" className="font-semibold">
          Pendências do catálogo
        </h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            {overview.products === 0
              ? "Nenhum produto cadastrado ainda. Comece pelo botão “Novo produto”."
              : "Nenhuma pendência nos produtos ativos."}
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {pending.map((item) => (
              <li key={item.label}>
                <strong>{item.value}</strong> {item.value === 1 ? "produto" : "produtos"} {item.label}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
