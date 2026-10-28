import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminSkeleton({ rows = 4, label = "Carregando…" }: { rows?: number; label?: string }) {
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden className="h-16 animate-pulse rounded-2xl bg-surface" />
      ))}
    </div>
  );
}

export function Notice({ tone, children }: { tone: "success" | "warning"; children: ReactNode }) {
  const styles = tone === "success" ? "bg-success-soft text-success" : "bg-warning-soft text-warning";
  return (
    <p role="status" className={`mb-6 rounded-xl px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}
