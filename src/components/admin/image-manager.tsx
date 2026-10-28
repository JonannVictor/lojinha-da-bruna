"use client";

import { ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import {
  startTransition,
  useActionState,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { buttonStyles } from "@/components/button-link";
import { idleState, type ActionState } from "@/lib/admin/action-state";
import { ACCEPTED_IMAGE_TYPES, prepareImage, type ImageLimits } from "@/lib/admin/prepare-image";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/products/images";
import { ActionButton } from "./action-button";
import { Field, FormMessage, inputClass } from "./form-controls";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

type Props = {
  images: { path: string; url: string; alt: string }[];
  upload: Action;
  remove: Record<string, Action>;
  makeMain: Record<string, Action>;
  /** Smaller limits for the demo, where photos are kept in the browser. */
  limits?: ImageLimits & { maxImages: number };
  note?: ReactNode;
};

// Supabase uploads: under the server limit (MAX_IMAGE_BYTES) and Vercel's
// 4.5 MB request body limit.
const DEFAULT_LIMITS: ImageLimits & { maxImages: number } = {
  maxDimension: 1600,
  maxBytes: 4 * 1024 * 1024,
  maxImages: MAX_IMAGES_PER_PRODUCT,
};
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

export function ImageManager({ images, upload, remove, makeMain, limits = DEFAULT_LIMITS, note }: Props) {
  const [state, dispatch, pending] = useActionState(upload, idleState);
  const [clientError, setClientError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const busy = pending || preparing;
  const full = images.length >= limits.maxImages;

  // Object URLs keep the file in memory until revoked.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setClientError(null);
    const file = event.target.files?.[0];
    setPreview(file && ACCEPTED_IMAGE_TYPES.includes(file.type) ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError(null);
    const form = event.currentTarget;
    const file = (form.elements.namedItem("photo") as HTMLInputElement).files?.[0];
    if (!file) return setClientError("Selecione uma foto.");
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return setClientError("Formato não suportado. Envie JPG, PNG ou WebP.");
    if (file.size > MAX_SOURCE_BYTES) return setClientError("Arquivo grande demais (máximo 25 MB antes do ajuste).");

    setPreparing(true);
    let blob: Blob;
    try {
      blob = await prepareImage(file, limits);
    } catch {
      setPreparing(false);
      return setClientError("Não foi possível ler esta imagem. Tente outra foto em JPG, PNG ou WebP.");
    }
    setPreparing(false);
    if (blob.size > limits.maxBytes) {
      return setClientError(
        "A foto continua grande demais depois da compressão. Tente uma foto menor ou recortada, ou mantenha o produto sem foto por enquanto.",
      );
    }

    const formData = new FormData();
    formData.set("photo", blob, "foto");
    formData.set("alt", String(new FormData(form).get("alt") ?? ""));
    startTransition(() => dispatch(formData));
    form.reset();
    setPreview(null);
  }

  return (
    <section aria-labelledby="fotos" className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 id="fotos" className="font-semibold">
          Fotos
        </h2>
        <p className="mt-1 text-sm text-muted">
          A primeira foto é a principal. Até {limits.maxImages} fotos em JPG, PNG ou WebP. Sem fotos, a
          loja mostra “Foto em breve”.
        </p>
        {note}
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-3">
          {images.map((image, index) => (
            <li key={image.path} className="overflow-hidden rounded-xl border border-border">
              <div className="relative aspect-square bg-surface-muted">
                <Image src={image.url} alt={image.alt} fill sizes="(min-width: 640px) 25vw, 50vw" className="object-cover" />
                {index === 0 && (
                  <span className="absolute top-2 left-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                    Principal
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 p-2">
                {index > 0 && (
                  <ActionButton action={makeMain[image.path]} label="Tornar principal">
                    <Star aria-hidden className="size-3.5" />
                  </ActionButton>
                )}
                <ActionButton
                  action={remove[image.path]}
                  label="Remover foto"
                  confirm="Remover esta foto? O arquivo será excluído."
                  className="hover:border-danger hover:text-danger"
                >
                  <Trash2 aria-hidden className="size-3.5" />
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="text-sm text-muted">Limite de fotos atingido. Remova uma para adicionar outra.</p>
      ) : (
        // Stacked: the manager lives in a narrow side column on the edit page.
        <form onSubmit={onSubmit} className="grid gap-3">
          <Field id="photo" label="Nova foto">
            <input
              id="photo"
              name="photo"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              required
              onChange={onFileChange}
              className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-accent"
            />
          </Field>
          <Field id="alt" label="Descrição da foto (acessibilidade)">
            <input id="alt" name="alt" maxLength={200} placeholder="Ex.: frasco de frente" className={inputClass} />
          </Field>
          <button type="submit" disabled={busy} className={buttonStyles.primary}>
            {busy ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <ImagePlus aria-hidden className="size-4" />}
            {preparing ? "Preparando…" : pending ? "Enviando…" : "Enviar foto"}
          </button>
          {preview && (
            <figure>
              <div className="relative size-32 overflow-hidden rounded-xl border border-border bg-surface-muted">
                <Image src={preview} alt="Pré-visualização da foto selecionada" fill unoptimized className="object-cover" />
              </div>
              <figcaption className="mt-1 text-xs text-muted">
                Pré-visualização. A foto será reduzida e comprimida antes de salvar.
              </figcaption>
            </figure>
          )}
        </form>
      )}

      {clientError ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {clientError}
        </p>
      ) : (
        <FormMessage state={state} />
      )}
    </section>
  );
}
