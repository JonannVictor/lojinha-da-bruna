import { afterEach, describe, expect, it, vi } from "vitest";
import { argsOf, createFakeClient, type QueryCall, type Result } from "@/test/fake-supabase";
import {
  addProductImage,
  detectImageKind,
  MAX_IMAGE_BYTES,
  removeProductImage,
  setMainProductImage,
  validateImageFile,
} from "./product-images";

const ID = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const RANDOM = "33333333-3333-4333-8333-333333333333";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const WEBP = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")];

const file = (bytes: number[], type = "image/png", size?: number) =>
  new File([new Uint8Array(size ?? bytes.length).map((_, i) => bytes[i] ?? 0)], "foto", { type });

const imagePath = (name: string, product = ID) => `products/${product}/${name}.webp`;

/** Product row read → update result. */
function productStore(images: { path: string; alt: string }[], update: Result = { data: [{ id: ID }], error: null }) {
  return (call: QueryCall): Result =>
    call.ops[0].method === "select" ? { data: { images }, error: null } : update;
}

afterEach(() => vi.restoreAllMocks());

describe("image validation", () => {
  it("recognises JPEG, PNG and WebP by their signature", () => {
    expect(detectImageKind(new Uint8Array(JPEG))?.extension).toBe("jpg");
    expect(detectImageKind(new Uint8Array(PNG))?.extension).toBe("png");
    expect(detectImageKind(new Uint8Array(WEBP))?.extension).toBe("webp");
    expect(detectImageKind(new Uint8Array(Buffer.from("<svg onload=alert(1)>")))).toBeNull();
  });

  it("ignores the declared MIME type: a renamed file is rejected", async () => {
    const fake = file([...Buffer.from("<?php echo 1; ?>")], "image/png");
    expect(await validateImageFile(fake)).toEqual({
      ok: false,
      error: "Formato não suportado. Envie JPG, PNG ou WebP.",
    });
  });

  it("enforces the size limit and requires a file", async () => {
    expect((await validateImageFile(file(PNG, "image/png", MAX_IMAGE_BYTES + 1))).ok).toBe(false);
    expect((await validateImageFile(file(PNG, "image/png", MAX_IMAGE_BYTES))).ok).toBe(true);
    expect((await validateImageFile(null)).ok).toBe(false);
    expect((await validateImageFile("texto")).ok).toBe(false);
    expect((await validateImageFile(new File([], "vazio"))).ok).toBe(false);
  });
});

describe("addProductImage", () => {
  it("uploads to a fresh path inside the product folder, never overwriting", async () => {
    const fake = createFakeClient({ query: productStore([]) });
    const result = await addProductImage(fake.client, ID, file(WEBP, "image/webp"), " Frente ", () => RANDOM);
    expect(result).toEqual({ ok: true });
    expect(fake.uploads).toHaveLength(1);
    expect(fake.uploads[0].path).toBe(`products/${ID}/${RANDOM}.webp`);
    expect(fake.uploads[0].options).toMatchObject({ upsert: false, contentType: "image/webp" });
    // Storage first, then the database row.
    expect(fake.log).toEqual(["db:products:select", "storage:product-images:upload", "db:products:update"]);
    expect(argsOf(fake.calls[1], "update")).toEqual([{ images: [{ path: `products/${ID}/${RANDOM}.webp`, alt: "Frente" }] }]);
  });

  it("removes the uploaded file when the database update fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fake = createFakeClient({ query: productStore([], { data: null, error: { code: "42501" } }) });
    const result = await addProductImage(fake.client, ID, file(PNG), "", () => RANDOM);
    expect(result.ok).toBe(false);
    expect(fake.removals).toEqual([[`products/${ID}/${RANDOM}.png`]]);
  });

  it("does not touch the database when the upload is refused", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fake = createFakeClient({
      query: productStore([]),
      upload: () => ({ error: { message: "new row violates row-level security policy" } }),
    });
    const result = await addProductImage(fake.client, ID, file(PNG), "");
    expect(result).toEqual({ ok: false, error: "Não foi possível enviar a foto. Tente novamente." });
    expect(fake.log).not.toContain("db:products:update");
  });

  it("rejects invalid files before uploading anything", async () => {
    const fake = createFakeClient({ query: productStore([]) });
    expect((await addProductImage(fake.client, ID, file([1, 2, 3]), "")).ok).toBe(false);
    expect(fake.uploads).toEqual([]);
  });

  it("limits the number of photos per product", async () => {
    const full = Array.from({ length: 8 }, (_, i) => ({ path: imagePath(`f${i}`), alt: "" }));
    const fake = createFakeClient({ query: productStore(full) });
    expect((await addProductImage(fake.client, ID, file(PNG), "")).ok).toBe(false);
    expect(fake.uploads).toEqual([]);
  });

  it("fails cleanly for unknown products", async () => {
    const fake = createFakeClient({ query: () => ({ data: null, error: null }) });
    expect(await addProductImage(fake.client, ID, file(PNG), "")).toEqual({ ok: false, error: "Produto não encontrado." });
    expect(fake.uploads).toEqual([]);
  });
});

describe("removing and reordering photos", () => {
  const a = { path: imagePath("a"), alt: "" };
  const b = { path: imagePath("b"), alt: "" };

  it("updates the product before deleting the file (no broken image in between)", async () => {
    const fake = createFakeClient({ query: productStore([a, b]) });
    expect(await removeProductImage(fake.client, ID, a.path)).toEqual({ ok: true });
    expect(fake.log).toEqual(["db:products:select", "db:products:update", "storage:product-images:remove"]);
    expect(argsOf(fake.calls[1], "update")).toEqual([{ images: [b] }]);
  });

  it("keeps the file when the product update fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fake = createFakeClient({ query: productStore([a], { data: null, error: { code: "42501" } }) });
    expect((await removeProductImage(fake.client, ID, a.path)).ok).toBe(false);
    expect(fake.removals).toEqual([]);
  });

  it("refuses paths of another product or outside the bucket layout", async () => {
    const fake = createFakeClient({ query: productStore([a]) });
    expect((await removeProductImage(fake.client, ID, imagePath("x", OTHER))).ok).toBe(false);
    expect((await removeProductImage(fake.client, ID, `products/${ID}/../${OTHER}/a.webp`)).ok).toBe(false);
    expect((await removeProductImage(fake.client, ID, "products/x.webp")).ok).toBe(false);
    expect(fake.calls).toEqual([]);
  });

  it("moves the chosen photo to the first position", async () => {
    const fake = createFakeClient({ query: productStore([a, b]) });
    expect(await setMainProductImage(fake.client, ID, b.path)).toEqual({ ok: true });
    expect(argsOf(fake.calls[1], "update")).toEqual([{ images: [b, a] }]);
  });
});
