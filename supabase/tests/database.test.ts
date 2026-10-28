import { beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "./support/database";

// Runs the real migration files against an in-process Postgres and checks the
// access model: what anon, an ordinary signed-in user, an administrator and
// the server (service_role) can and cannot do.

let t: TestDatabase;
let adminId: string;
let userId: string;
let categoryId: string;
let activeId: string;
let inactiveId: string;
let pendingPriceId: string;
let lowStockId: string;

type Row = Record<string, unknown>;

async function insertProduct(fields: Row): Promise<string> {
  const columns = Object.keys(fields);
  const { rows } = await t.db.query<{ id: string }>(
    `insert into public.products (${columns.join(", ")})
     values (${columns.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
    Object.values(fields).map((v) => (typeof v === "object" && v !== null ? JSON.stringify(v) : v)),
  );
  return rows[0].id;
}

async function rejects(promise: Promise<unknown>, pattern: RegExp) {
  await expect(promise).rejects.toThrow(pattern);
}

beforeAll(async () => {
  t = await createTestDatabase();
  adminId = await t.createUser("admin@example.test");
  userId = await t.createUser("cliente@example.test");
  await t.makeAdmin(adminId);

  const { rows } = await t.db.query<{ id: string }>(
    "select id from public.categories where slug = 'beleza'",
  );
  categoryId = rows[0].id;
  await t.db.query(
    "insert into public.categories (name, slug, is_active) values ('Oculta', 'oculta', false)",
  );

  activeId = await insertProduct({
    name: "Teste ativo", slug: "teste-ativo", price_cents: 1500,
    stock_quantity: null, is_active: true, category_id: categoryId,
  });
  inactiveId = await insertProduct({
    name: "Teste inativo", slug: "teste-inativo", price_cents: 1000, stock_quantity: 5, is_active: false,
  });
  pendingPriceId = await insertProduct({
    name: "Teste sem preço", slug: "teste-sem-preco", price_cents: null, is_active: true,
  });
  lowStockId = await insertProduct({
    name: "Teste estoque", slug: "teste-estoque", price_cents: 2500, stock_quantity: 2, is_active: true,
  });
});

describe("migrations", () => {
  it("seed the briefing categories without products", async () => {
    const { rows } = await t.db.query<{ slug: string }>(
      "select slug from public.categories where is_active order by position",
    );
    expect(rows.map((r) => r.slug)).toEqual(["beleza", "perfumaria", "cuidados-pessoais", "variedades"]);
  });

  it("enable RLS on every public table", async () => {
    const { rows } = await t.db.query<{ relname: string; relrowsecurity: boolean }>(
      `select c.relname, c.relrowsecurity from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.filter((r) => !r.relrowsecurity)).toEqual([]);
  });
});

describe("constraints", () => {
  it("reject negative or zero prices and negative stock", async () => {
    await rejects(insertProduct({ name: "x", slug: "neg-price", price_cents: -1 }), /products_price_range/);
    await rejects(insertProduct({ name: "x", slug: "zero-price", price_cents: 0 }), /products_price_range/);
    await rejects(insertProduct({ name: "x", slug: "neg-stock", stock_quantity: -1 }), /products_stock_range/);
  });

  it("reject malformed slugs, duplicates and non-array images", async () => {
    await rejects(insertProduct({ name: "x", slug: "Com Espaço" }), /products_slug_format/);
    await rejects(insertProduct({ name: "x", slug: "teste-ativo" }), /products_slug_unique/);
    await rejects(insertProduct({ name: "x", slug: "img-obj", images: { a: 1 } }), /products_images_array/);
  });

  it("new products are inactive by default", async () => {
    const id = await insertProduct({ name: "Padrão", slug: "padrao" });
    const { rows } = await t.db.query<{ is_active: boolean }>(
      "select is_active from public.products where id = $1", [id],
    );
    expect(rows[0].is_active).toBe(false);
    await t.db.query("delete from public.products where id = $1", [id]);
  });

  it("keep updated_at current on update", async () => {
    const before = await t.db.query<{ updated_at: Date }>(
      "update public.products set updated_at = '2000-01-01' where id = $1 returning updated_at", [activeId],
    );
    // The trigger overrides any value written by the client.
    expect(before.rows[0].updated_at.getFullYear()).toBeGreaterThan(2000);
  });
});

describe("anon (storefront)", () => {
  it("reads only active products and categories", async () => {
    const products = await t.as("anon", null, () =>
      t.db.query<{ id: string }>("select id from public.products"),
    );
    const ids = products.rows.map((r) => r.id);
    expect(ids).toContain(activeId);
    expect(ids).toContain(pendingPriceId);
    expect(ids).not.toContain(inactiveId);

    const categories = await t.as("anon", null, () =>
      t.db.query<{ slug: string }>("select slug from public.categories"),
    );
    expect(categories.rows.map((r) => r.slug)).not.toContain("oculta");
  });

  it("cannot change the catalog", async () => {
    await t.as("anon", null, async () => {
      await rejects(t.db.query("insert into public.products (name, slug) values ('x', 'anon-x')"), /permission denied/);
      await rejects(t.db.query("update public.products set price_cents = 1"), /permission denied/);
      await rejects(t.db.query("delete from public.products"), /permission denied/);
      await rejects(t.db.query("insert into public.categories (name, slug) values ('x', 'x')"), /permission denied/);
    });
  });

  it("cannot see admins or orders, nor create orders directly", async () => {
    await t.as("anon", null, async () => {
      await rejects(t.db.query("select * from public.admin_users"), /permission denied/);
      await rejects(t.db.query("select * from public.orders"), /permission denied/);
      await rejects(t.db.query("insert into public.orders (customer_name) values ('x')"), /permission denied/);
      await rejects(
        t.db.query("select * from public.create_order('Ana', null, null, '[]'::jsonb)"),
        /permission denied/,
      );
    });
  });
});

describe("authenticated user who is not an admin", () => {
  it("still sees only active products", async () => {
    const { rows } = await t.as("authenticated", userId, () =>
      t.db.query<{ id: string }>("select id from public.products"),
    );
    expect(rows.map((r) => r.id)).not.toContain(inactiveId);
  });

  it("cannot create, edit or delete products", async () => {
    await t.as("authenticated", userId, async () => {
      await rejects(
        t.db.query("insert into public.products (name, slug) values ('x', 'user-x')"),
        /row-level security/,
      );
      const updated = await t.db.query("update public.products set price_cents = 1 where id = $1", [activeId]);
      expect(updated.affectedRows).toBe(0);
      const deleted = await t.db.query("delete from public.products where id = $1", [activeId]);
      expect(deleted.affectedRows).toBe(0);
    });
    const { rows } = await t.db.query<{ price_cents: number }>(
      "select price_cents from public.products where id = $1", [activeId],
    );
    expect(rows[0].price_cents).toBe(1500);
  });

  it("cannot promote itself to admin", async () => {
    await t.as("authenticated", userId, async () => {
      await rejects(
        t.db.query("insert into public.admin_users (user_id) values ($1)", [userId]),
        /permission denied/,
      );
      const { rows } = await t.db.query("select * from public.admin_users");
      expect(rows).toEqual([]);
      const isAdmin = await t.db.query<{ is_admin: boolean }>("select private.is_admin() as is_admin");
      expect(isAdmin.rows[0].is_admin).toBe(false);
    });
  });

  it("cannot read orders", async () => {
    const { rows } = await t.as("authenticated", userId, () => t.db.query("select * from public.orders"));
    expect(rows).toEqual([]);
  });
});

describe("admin", () => {
  it("is recognised by is_admin()", async () => {
    const { rows } = await t.as("authenticated", adminId, () =>
      t.db.query<{ is_admin: boolean }>("select private.is_admin() as is_admin"),
    );
    expect(rows[0].is_admin).toBe(true);
  });

  it("sees inactive products and categories", async () => {
    await t.as("authenticated", adminId, async () => {
      const products = await t.db.query<{ id: string }>("select id from public.products");
      expect(products.rows.map((r) => r.id)).toContain(inactiveId);
      const categories = await t.db.query<{ slug: string }>("select slug from public.categories");
      expect(categories.rows.map((r) => r.slug)).toContain("oculta");
    });
  });

  it("creates, edits, deactivates and deletes products", async () => {
    await t.as("authenticated", adminId, async () => {
      const created = await t.db.query<{ id: string }>(
        "insert into public.products (name, slug, price_cents) values ('Novo', 'admin-novo', 990) returning id",
      );
      const id = created.rows[0].id;
      const edited = await t.db.query(
        "update public.products set price_cents = 1290, is_active = true where id = $1", [id],
      );
      expect(edited.affectedRows).toBe(1);
      const off = await t.db.query("update public.products set is_active = false where id = $1", [id]);
      expect(off.affectedRows).toBe(1);
      const deleted = await t.db.query("delete from public.products where id = $1", [id]);
      expect(deleted.affectedRows).toBe(1);
    });
  });

  it("cannot see other users' admin rows nor grant admin to others", async () => {
    await t.as("authenticated", adminId, async () => {
      await rejects(
        t.db.query("insert into public.admin_users (user_id) values ($1)", [userId]),
        /permission denied/,
      );
    });
  });

  it("cannot delete a category that still has products", async () => {
    await t.as("authenticated", adminId, async () => {
      await rejects(
        t.db.query("delete from public.categories where id = $1", [categoryId]),
        /foreign key/,
      );
    });
  });

  it("loses access as soon as the admin row is removed", async () => {
    const tempAdmin = await t.createUser("temp@example.test");
    await t.makeAdmin(tempAdmin);
    await t.db.query("delete from public.admin_users where user_id = $1", [tempAdmin]);
    const { rows } = await t.as("authenticated", tempAdmin, () =>
      t.db.query<{ id: string }>("select id from public.products where id = $1", [inactiveId]),
    );
    expect(rows).toEqual([]);
  });
});

describe("create_order (server only)", () => {
  type Item = { product_id: string; quantity: number };
  const order = (items: Item[] | unknown, name = "Cliente Teste") =>
    t.as("service_role", null, () =>
      t.db.query<{ order_id: string; subtotal_cents: number }>(
        "select * from public.create_order($1, $2, $3, $4::jsonb)",
        [name, "11 99999-0000", null, JSON.stringify(items)],
      ),
    );

  async function orderCount() {
    const { rows } = await t.db.query<{ n: number }>("select count(*)::int as n from public.orders");
    return rows[0].n;
  }

  it("cannot be executed by signed-in users", async () => {
    await t.as("authenticated", adminId, async () => {
      await rejects(
        t.db.query("select * from public.create_order('Ana', null, null, '[]'::jsonb)"),
        /permission denied/,
      );
    });
  });

  it("persists the order with server prices and a computed subtotal", async () => {
    const { rows } = await order([
      { product_id: activeId, quantity: 3 },
      { product_id: lowStockId, quantity: 2 },
    ]);
    const { order_id, subtotal_cents } = rows[0];
    expect(Number(subtotal_cents)).toBe(3 * 1500 + 2 * 2500);

    const items = await t.db.query<Row>(
      `select product_id, product_name, unit_price_cents, quantity, line_total_cents
       from public.order_items where order_id = $1 order by product_name`,
      [order_id],
    );
    expect(items.rows).toEqual([
      { product_id: activeId, product_name: "Teste ativo", unit_price_cents: 1500, quantity: 3, line_total_cents: 4500 },
      { product_id: lowStockId, product_name: "Teste estoque", unit_price_cents: 2500, quantity: 2, line_total_cents: 5000 },
    ]);
    const saved = await t.db.query<{ subtotal_cents: number; status: string }>(
      "select subtotal_cents, status from public.orders where id = $1", [order_id],
    );
    expect(Number(saved.rows[0].subtotal_cents)).toBe(9500);
    expect(saved.rows[0].status).toBe("pending");
  });

  it("keeps a copy of name and price after the product changes", async () => {
    const { rows } = await order([{ product_id: activeId, quantity: 1 }]);
    await t.db.query("update public.products set name = 'Renomeado', price_cents = 9999 where id = $1", [activeId]);
    const items = await t.db.query<Row>(
      "select product_name, unit_price_cents from public.order_items where order_id = $1", [rows[0].order_id],
    );
    expect(items.rows[0]).toEqual({ product_name: "Teste ativo", unit_price_cents: 1500 });
    await t.db.query("update public.products set name = 'Teste ativo', price_cents = 1500 where id = $1", [activeId]);
  });

  it.each([
    ["inactive product", () => [{ product_id: inactiveId, quantity: 1 }], /product_unavailable/],
    ["unknown product", () => [{ product_id: "00000000-0000-4000-8000-000000000000", quantity: 1 }], /product_unavailable/],
    ["price pending", () => [{ product_id: pendingPriceId, quantity: 1 }], /price_pending/],
    ["stock exceeded", () => [{ product_id: lowStockId, quantity: 3 }], /insufficient_stock/],
    ["zero quantity", () => [{ product_id: activeId, quantity: 0 }], /invalid_quantity/],
    ["fractional quantity", () => [{ product_id: activeId, quantity: 1.5 }], /invalid_quantity/],
    ["over per-item limit", () => [{ product_id: activeId, quantity: 21 }], /invalid_quantity/],
    ["duplicate lines", () => [{ product_id: activeId, quantity: 1 }, { product_id: activeId, quantity: 1 }], /duplicate_item/],
    ["empty cart", () => [], /invalid_items/],
    ["malformed id", () => [{ product_id: "1; drop table x", quantity: 1 }], /invalid_items/],
    ["not an array", () => ({ product_id: activeId }), /invalid_items/],
  ])("rejects %s without leaving a partial order", async (_label, items, error) => {
    const before = await orderCount();
    // A valid line first: it must be rolled back together with the bad one.
    const payload = items();
    const withValid = Array.isArray(payload) && payload.length > 0 && payload[0].product_id !== activeId
      ? [{ product_id: activeId, quantity: 1 }, ...payload]
      : payload;
    await rejects(order(withValid), error);
    expect(await orderCount()).toBe(before);
  });

  it("rejects a missing customer name", async () => {
    await rejects(order([{ product_id: activeId, quantity: 1 }], " "), /invalid_customer/);
  });

  it("blocks deleting a product that has order history", async () => {
    await t.as("authenticated", adminId, async () => {
      await rejects(t.db.query("delete from public.products where id = $1", [activeId]), /foreign key/);
    });
  });

  it("lets admins read orders and change only the status", async () => {
    await t.as("authenticated", adminId, async () => {
      const { rows } = await t.db.query<{ id: string }>("select id from public.orders limit 1");
      expect(rows).toHaveLength(1);
      const ok = await t.db.query("update public.orders set status = 'confirmed' where id = $1", [rows[0].id]);
      expect(ok.affectedRows).toBe(1);
      await rejects(
        t.db.query("update public.orders set subtotal_cents = 1 where id = $1", [rows[0].id]),
        /permission denied/,
      );
    });
  });
});

describe("storage: product-images bucket", () => {
  const productPath = () => `products/${activeId}/foto.webp`;
  const insertObject = (name: string) =>
    t.db.query("insert into storage.objects (bucket_id, name) values ('product-images', $1)", [name]);

  it("is public, limited to 5 MB and to JPEG/PNG/WebP", async () => {
    const { rows } = await t.db.query<Row>(
      "select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'product-images'",
    );
    expect(rows[0]).toEqual({
      public: true,
      file_size_limit: 5242880,
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
    });
  });

  it("accepts uploads from admins inside products/<uuid>/", async () => {
    await t.as("authenticated", adminId, () => insertObject(productPath()));
  });

  it("rejects uploads from anon and non-admin users", async () => {
    await t.as("anon", null, () => rejects(insertObject(`products/${activeId}/a.webp`), /row-level security/));
    await t.as("authenticated", userId, () =>
      rejects(insertObject(`products/${activeId}/b.webp`), /row-level security/),
    );
  });

  it("rejects admin uploads outside the expected path or with other extensions", async () => {
    await t.as("authenticated", adminId, async () => {
      await rejects(insertObject("outra-pasta/x.webp"), /row-level security/);
      await rejects(insertObject(`products/${activeId}/sub/x.webp`), /row-level security/);
      await rejects(insertObject("products/nao-e-uuid/x.webp"), /row-level security/);
      await rejects(insertObject(`products/${activeId}/script.svg`), /row-level security/);
    });
  });

  it("never lets anyone overwrite or move a file", async () => {
    await t.as("authenticated", adminId, async () => {
      const moved = await t.db.query(
        "update storage.objects set name = 'products/x/y.webp' where name = $1", [productPath()],
      );
      expect(moved.affectedRows).toBe(0);
    });
  });

  it("does not let anon or non-admins list or delete files", async () => {
    for (const [role, id] of [["anon", null], ["authenticated", userId]] as const) {
      await t.as(role, id, async () => {
        const listed = await t.db.query("select name from storage.objects");
        expect(listed.rows).toEqual([]);
        const deleted = await t.db.query("delete from storage.objects where name = $1", [productPath()]);
        expect(deleted.affectedRows).toBe(0);
      });
    }
  });

  it("lets admins delete files", async () => {
    const { affectedRows } = await t.as("authenticated", adminId, () =>
      t.db.query("delete from storage.objects where name = $1", [productPath()]),
    );
    expect(affectedRows).toBe(1);
  });
});
