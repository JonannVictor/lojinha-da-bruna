"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, type ReactNode } from "react";
import { idleState, type ActionState } from "@/lib/admin/action-state";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  /** Accessible name when the visible content is only an icon. */
  label?: string;
  /** Asks for confirmation before running (destructive actions). */
  confirm?: string;
  className?: string;
  /** Show the success message too (errors are always shown). */
  showSuccess?: boolean;
};

const baseClass =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50";

/** A single-button form bound to a Server Action, with inline feedback. */
export function ActionButton({ action, children, label, confirm, className = "", showSuccess }: Props) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className="inline-flex flex-col items-start gap-1"
    >
      <button
        type="submit"
        disabled={pending}
        aria-label={label}
        title={label}
        className={`${baseClass} ${className}`}
      >
        {pending ? <LoaderCircle aria-hidden className="size-3.5 animate-spin" /> : children}
      </button>
      <span aria-live="polite" className="text-xs empty:hidden">
        {state.status === "error" && <span className="text-danger">{state.message}</span>}
        {showSuccess && state.status === "success" && <span className="text-success">{state.message}</span>}
      </span>
    </form>
  );
}
