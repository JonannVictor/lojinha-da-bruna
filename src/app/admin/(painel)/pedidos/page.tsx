import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DemoOrderList } from "@/components/demo/admin-orders";
import { isDemoMode } from "@/lib/demo/mode";

export const metadata: Metadata = {
  title: "Pedidos",
};

// Only the demo has an orders screen for now. Managing real orders (stock
// write-off, cancellation) is a later stage; see docs/decisoes.md.
export default function AdminOrdersPage() {
  if (!isDemoMode()) notFound();
  return (
    <>
      <AdminPageHeader
        title="Pedidos de demonstração"
        description="Pedidos fictícios, apenas para mostrar como o painel funciona. Nenhum é real, e a loja não recebe pedidos nesta demonstração."
      />
      <DemoOrderList />
    </>
  );
}
