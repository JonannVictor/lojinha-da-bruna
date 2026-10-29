import { ExternalLink, Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogPendencies, OverviewCards } from "@/components/admin/overview";
import { AdminPageHeader, AdminSkeleton } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/button-link";
import { DemoDashboard } from "@/components/demo/admin-dashboard";
import { getCatalogOverview } from "@/lib/admin/catalog";
import { requireAdmin } from "@/lib/auth/admin";
import { isDemoMode } from "@/lib/demo/mode";

export const metadata: Metadata = {
  title: "Início",
};

export default function AdminHomePage() {
  const demo = isDemoMode();
  return (
    <>
      <AdminPageHeader
        title="Painel"
        description="Resumo do catálogo da loja."
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/" target="_blank" variant="secondary">
              Ver loja
              <ExternalLink aria-hidden className="size-3.5" />
              <span className="sr-only">(abre em nova aba)</span>
            </ButtonLink>
            <ButtonLink href="/admin/produtos/novo">
              <Plus aria-hidden className="size-4" />
              Novo produto
            </ButtonLink>
          </div>
        }
      />
      {demo ? (
        <DemoDashboard />
      ) : (
        <Suspense fallback={<AdminSkeleton rows={2} label="Carregando resumo…" />}>
          <Overview />
        </Suspense>
      )}
    </>
  );
}

async function Overview() {
  const { supabase, session } = await requireAdmin();
  const overview = await getCatalogOverview(supabase);

  return (
    <div className="space-y-6">
      {session.email && <p className="text-sm text-muted">Conectada como {session.email}.</p>}
      <OverviewCards
        cards={[
          { label: "Produtos cadastrados", value: overview.products, href: "/admin/produtos" },
          { label: "Ativos na loja", value: overview.active, href: "/admin/produtos?status=active" },
          { label: "Categorias", value: overview.categories, href: "/admin/categorias" },
        ]}
      />
      <CatalogPendencies
        products={overview.products}
        pricePending={overview.pricePending}
        withoutPhotos={overview.withoutPhotos}
        outOfStock={overview.outOfStock}
      />
    </div>
  );
}
