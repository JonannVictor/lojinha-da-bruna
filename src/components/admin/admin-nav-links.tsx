"use client";

import { LayoutDashboard, Package, ReceiptText, Tags } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/admin/produtos", label: "Produtos", icon: Package, exact: false },
  { href: "/admin/categorias", label: "Categorias", icon: Tags, exact: false },
] as const;

/** Only the demo has an orders screen for now. */
const ordersLink = { href: "/admin/pedidos", label: "Pedidos", icon: ReceiptText, exact: false } as const;

export function AdminNavLinks({ pathname, showOrders = false }: { pathname: string | null; showOrders?: boolean }) {
  return (showOrders ? [...links, ordersLink] : links).map(({ href, label, icon: Icon, exact }) => {
    const active = pathname !== null && (exact ? pathname === href : pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap ${
          active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface hover:text-foreground"
        }`}
      >
        <Icon aria-hidden className="size-4" />
        {label}
      </Link>
    );
  });
}

export function ActiveAdminNavLinks({ showOrders }: { showOrders?: boolean }) {
  return <AdminNavLinks pathname={usePathname()} showOrders={showOrders} />;
}
