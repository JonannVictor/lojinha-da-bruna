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
        title="Pedidos"
        description="Acompanhe os pedidos e atualize o status de cada um."
      />
      <DemoOrderList />
    </>
  );
}
