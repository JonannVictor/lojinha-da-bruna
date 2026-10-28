"use client";

import { ArrowDown, ArrowUp, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { buttonStyles } from "@/components/button-link";
import type { ActionState } from "@/lib/admin/action-state";
import type { AdminCategory } from "@/lib/admin/catalog";
import { LIMITS } from "@/lib/admin/validation";
import { ActionButton } from "./action-button";
import { describedBy, Field, FormMessage, inputClass } from "./form-controls";
import { useActionForm } from "./use-action-form";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function CategoryForm({
  action,
  category,
  submitLabel,
  resetOnSuccess = false,
  onSaved,
}: {
  action: Action;
  category?: Pick<AdminCategory, "name" | "slug">;
  submitLabel: string;
  resetOnSuccess?: boolean;
  onSaved?: () => void;
}) {
  const { state, onSubmit, pending } = useActionForm(action);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status !== "success") return;
    if (resetOnSuccess) formRef.current?.reset();
    onSaved?.();
  }, [state, resetOnSuccess, onSaved]);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <Field id={`${id}-name`} label="Nome" error={errors.name}>
          <input
            id={`${id}-name`}
            name="name"
            required
            maxLength={LIMITS.categoryName}
            defaultValue={category?.name}
            className={inputClass}
            {...describedBy(`${id}-name`, errors.name)}
          />
        </Field>
        <Field
          id={`${id}-slug`}
          label="Endereço (slug)"
          hint="Opcional: gerado a partir do nome."
          error={errors.slug}
        >
          <input
            id={`${id}-slug`}
            name="slug"
            maxLength={LIMITS.categorySlug}
            defaultValue={category?.slug}
            className={inputClass}
            {...describedBy(`${id}-slug`, errors.slug, "hint")}
          />
        </Field>
        <button type="submit" disabled={pending} className={`${buttonStyles.primary} sm:mt-7`}>
          {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function CategoryRow({
  category,
  save,
  toggle,
  moveUp,
  moveDown,
  remove,
}: {
  category: AdminCategory;
  save: Action;
  toggle: Action;
  moveUp: Action | null;
  moveDown: Action | null;
  remove: Action;
}) {
  const [editing, setEditing] = useState(false);
  const count = category.product_count;

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{category.name}</p>
          <p className="text-xs text-muted">
            /{category.slug} · {count === 1 ? "1 produto" : `${count} produtos`}
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            category.is_active ? "bg-success-soft text-success" : "bg-surface-muted text-muted"
          }`}
        >
          {category.is_active ? "Ativa" : "Inativa"}
        </span>

        <div className="flex flex-wrap items-start gap-1.5">
          {moveUp && (
            <ActionButton action={moveUp} label={`Mover ${category.name} para cima`}>
              <ArrowUp aria-hidden className="size-3.5" />
            </ActionButton>
          )}
          {moveDown && (
            <ActionButton action={moveDown} label={`Mover ${category.name} para baixo`}>
              <ArrowDown aria-hidden className="size-3.5" />
            </ActionButton>
          )}
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            aria-expanded={editing}
            aria-label={editing ? "Cancelar edição" : `Editar ${category.name}`}
            className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent"
          >
            {editing ? <X aria-hidden className="size-3.5" /> : <Pencil aria-hidden className="size-3.5" />}
          </button>
          <ActionButton action={toggle}>{category.is_active ? "Desativar" : "Ativar"}</ActionButton>
          <ActionButton
            action={remove}
            label={`Excluir ${category.name}`}
            confirm={`Excluir a categoria “${category.name}”?`}
            className="hover:border-danger hover:text-danger"
          >
            <Trash2 aria-hidden className="size-3.5" />
          </ActionButton>
        </div>
      </div>

      {editing && (
        <div className="mt-4 rounded-xl bg-surface-muted/50 p-4">
          <CategoryForm action={save} category={category} submitLabel="Salvar" onSaved={() => setEditing(false)} />
        </div>
      )}
    </li>
  );
}
