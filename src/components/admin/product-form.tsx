"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { buttonStyles } from "@/components/button-link";
import type { ActionState } from "@/lib/admin/action-state";
import { centsToInput, LIMITS, slugify, type ProductInput } from "@/lib/admin/validation";
import { describedBy, Field, FormMessage, inputClass } from "./form-controls";
import { useActionForm } from "./use-action-form";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: { id: string; name: string; is_active: boolean }[];
  product?: ProductInput;
  submitLabel: string;
};

export function ProductForm({ action, categories, product, submitLabel }: Props) {
  const { state, onSubmit, pending } = useActionForm(action);
  const errors = state.fieldErrors ?? {};
  // The slug follows the name until it's edited by hand (or the product exists).
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(product));

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Informações</h2>

        <div className="sm:col-span-2">
          <Field id="name" label="Nome do produto" error={errors.name}>
            <input
              id="name"
              name="name"
              required
              maxLength={LIMITS.productName}
              defaultValue={product?.name}
              onChange={(e) => !slugEdited && setSlug(slugify(e.target.value))}
              className={inputClass}
              {...describedBy("name", errors.name)}
            />
          </Field>
        </div>

        <Field
          id="slug"
          label="Endereço na loja (slug)"
          hint="Aparece em /produtos/… — letras minúsculas, números e hífens."
          error={errors.slug}
        >
          <input
            id="slug"
            name="slug"
            maxLength={LIMITS.productSlug}
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value);
            }}
            className={inputClass}
            {...describedBy("slug", errors.slug, "hint")}
          />
        </Field>

        <Field id="brand" label="Marca" hint="Opcional." error={errors.brand}>
          <input
            id="brand"
            name="brand"
            maxLength={LIMITS.brand}
            defaultValue={product?.brand ?? ""}
            className={inputClass}
            {...describedBy("brand", errors.brand, "hint")}
          />
        </Field>

        <Field id="category_id" label="Categoria" error={errors.category_id}>
          <select
            id="category_id"
            name="category_id"
            defaultValue={product?.category_id ?? ""}
            className={inputClass}
            {...describedBy("category_id", errors.category_id)}
          >
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.is_active ? "" : " (inativa)"}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field
            id="description"
            label="Descrição"
            hint="Opcional. Sem descrição, a loja mostra “Descrição em breve”."
            error={errors.description}
          >
            <textarea
              id="description"
              name="description"
              rows={5}
              maxLength={LIMITS.description}
              defaultValue={product?.description ?? ""}
              className={inputClass}
              {...describedBy("description", errors.description, "hint")}
            />
          </Field>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Preço e estoque</h2>

        <Field
          id="price"
          label="Preço (R$)"
          hint="Ex.: 29,90. Em branco = preço a confirmar (o produto não pode ser comprado)."
          error={errors.price_cents}
        >
          <input
            id="price"
            name="price"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={centsToInput(product?.price_cents ?? null)}
            className={inputClass}
            {...describedBy("price", errors.price_cents, "hint")}
          />
        </Field>

        <Field
          id="stock_quantity"
          label="Estoque"
          hint="Em branco = estoque não controlado. 0 = esgotado."
          error={errors.stock_quantity}
        >
          <input
            id="stock_quantity"
            name="stock_quantity"
            inputMode="numeric"
            defaultValue={product?.stock_quantity ?? ""}
            className={inputClass}
            {...describedBy("stock_quantity", errors.stock_quantity, "hint")}
          />
        </Field>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Visibilidade</h2>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={product?.is_active ?? false}
            className="mt-0.5 size-4 accent-accent"
          />
          <span>
            <span className="font-medium">Ativo na loja</span>
            <span className="block text-muted">Produtos inativos não aparecem na loja e não podem ser comprados.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="is_featured"
            defaultChecked={product?.is_featured ?? false}
            className="mt-0.5 size-4 accent-accent"
          />
          <span>
            <span className="font-medium">Destaque na página inicial</span>
          </span>
        </label>
      </section>

      <FormMessage state={state} />

      <button type="submit" disabled={pending} className={`${buttonStyles.primary} w-full sm:w-auto`}>
        {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        {pending ? "Salvando…" : submitLabel}
      </button>
    </form>
  );
}
