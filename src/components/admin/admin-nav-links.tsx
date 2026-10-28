"use client";

import { LayoutDashboard, Package, Tags } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/admin/produtos", label: "Produtos", icon: Package, exact: false },
  { href: "/admin/categorias", label: "Categorias", icon: Tags, exact: false },
] as const;

export function AdminNavLinks({ pathname }: { pathname: string | null }) {
  return links.map(({ href, label, icon: Icon, exact }) => {
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

export function ActiveAdminNavLinks() {
  return <AdminNavLinks pathname={usePathname()} />;
}
