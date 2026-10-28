"use client";

import { ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { buttonStyles } from "@/components/button-link";
import { idleState, type ActionState } from "@/lib/admin/action-state";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/products/images";
import { ActionButton } from "./action-button";
import { Field, FormMessage, inputClass } from "./form-controls";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

type Props = {
  images: { path: string; url: string; alt: string }[];
  upload: Action;
  remove: Record<string, Action>;
  makeMain: Record<string, Action>;
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // same as the server (MAX_IMAGE_BYTES)
const MAX_DIMENSION = 1600;

/**
 * Downscales large photos in the browser (phone pictures are often 4–10 MB)
 * and re-encodes them as WebP, falling back to JPEG. The server validates the
 * result again; this step is only for speed and for the upload size limit.
 */
async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_UPLOAD_BYTES) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await encode("image/webp");
  // Browsers without a WebP encoder silently return PNG.
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("encode");
  return jpeg;
}

export function ImageManager({ images, upload, remove, makeMain }: Props) {
  const [state, dispatch, pending] = useActionState(upload, idleState);
  const [clientError, setClientError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const busy = pending || preparing;
  const full = images.length >= MAX_IMAGES_PER_PRODUCT;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError(null);
    const form = event.currentTarget;
    const file = (form.elements.namedItem("photo") as HTMLInputElement).files?.[0];
    if (!file) return setClientError("Selecione uma foto.");
    if (!ACCEPTED.includes(file.type)) return setClientError("Formato não suportado. Envie JPG, PNG ou WebP.");
    if (file.size > MAX_SOURCE_BYTES) return setClientError("Arquivo grande demais (máximo 25 MB antes do ajuste).");

    setPreparing(true);
    let blob: Blob;
    try {
      blob = await prepareImage(file);
    } catch {
      setPreparing(false);
      return setClientError("Não foi possível ler esta imagem. Tente outra foto em JPG, PNG ou WebP.");
    }
    setPreparing(false);
    if (blob.size > MAX_UPLOAD_BYTES) return setClientError("A foto continua grande demais depois do ajuste.");

    const formData = new FormData();
    formData.set("photo", blob, "foto");
    formData.set("alt", String(new FormData(form).get("alt") ?? ""));
    startTransition(() => dispatch(formData));
    form.reset();
  }

  return (
    <section aria-labelledby="fotos" className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 id="fotos" className="font-semibold">
          Fotos
        </h2>
        <p className="mt-1 text-sm text-muted">
          A primeira foto é a principal. Até {MAX_IMAGES_PER_PRODUCT} fotos em JPG, PNG ou WebP. Sem fotos, a
          loja mostra “Foto em breve”.
        </p>
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field id="photo" label="Nova foto">
            <input
              id="photo"
              name="photo"
              type="file"
              accept={ACCEPTED.join(",")}
              required
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
