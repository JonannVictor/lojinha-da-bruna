import { AdminNav } from "@/components/admin/admin-nav";
import { DemoPanelNotice } from "@/components/demo/panel-notice";
import { isDemoMode } from "@/lib/demo/mode";

// Chrome of the authenticated area. It reads no session on purpose: each
// page checks requireAdmin() itself (inside <Suspense>), and so does every
// Server Action. A layout check alone would not protect the actions.
export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <AdminNav />
      <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {isDemoMode() && <DemoPanelNotice />}
        {children}
      </main>
    </>
  );
}
