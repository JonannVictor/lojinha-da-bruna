import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-surface px-6 py-14 text-center shadow-card sm:py-20">
      {icon && (
        // Icon in a fine rose ring, the same motif as the store's arch.
        <div className="mb-6 rounded-full border border-rose-light p-2">
          <div className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
            {icon}
          </div>
        </div>
      )}
      <h2 className="font-display text-[1.75rem] leading-tight font-medium text-balance sm:text-4xl">{title}</h2>
      {description && (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">{description}</p>
      )}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
