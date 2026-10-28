import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

// In-process Postgres (PGlite) with the minimum of Supabase's platform objects
// that our migrations depend on: the API roles, auth.users/auth.uid() and the
// storage tables and helpers. It lets the real migration files run and the RLS
// policies be exercised offline. It is NOT a full Supabase: Storage HTTP
// rules (bucket size/MIME limits) and Auth itself are not emulated.

const MIGRATIONS_DIR = fileURLToPath(new URL("../../migrations", import.meta.url));

const PLATFORM_STUBS = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text);

  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(auth.jwt() ->> 'sub', '')::uuid
  $$;

  grant usage on schema public to anon, authenticated, service_role;

  create schema storage;
  grant usage on schema storage to anon, authenticated, service_role;
  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text,
    owner uuid,
    created_at timestamptz default now(),
    unique (bucket_id, name)
  );
  alter table storage.objects enable row level security;
  grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
  grant select on storage.buckets to anon, authenticated, service_role;

  create function storage.foldername(name text) returns text[] language plpgsql immutable as $$
  declare _parts text[];
  begin
    select string_to_array(name, '/') into _parts;
    return _parts[1:array_length(_parts, 1) - 1];
  end $$;
  create function storage.extension(name text) returns text language plpgsql immutable as $$
  declare _parts text[]; _filename text;
  begin
    select string_to_array(name, '/') into _parts;
    select _parts[array_length(_parts, 1)] into _filename;
    return reverse(split_part(reverse(_filename), '.', 1));
  end $$;
`;

export type Role = "anon" | "authenticated" | "service_role";

export type TestDatabase = {
  db: PGlite;
  /** Runs `fn` as an API role, optionally impersonating an auth user. */
  as<T>(role: Role, userId: string | null, fn: () => Promise<T>): Promise<T>;
  createUser(email: string): Promise<string>;
  makeAdmin(userId: string): Promise<void>;
};

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const db = new PGlite();
  await db.exec(PLATFORM_STUBS);
  for (const file of migrationFiles()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  return {
    db,
    async as(role, userId, fn) {
      const claims = userId ? JSON.stringify({ sub: userId, role }) : "";
      await db.query("select set_config('request.jwt.claims', $1, false)", [claims]);
      await db.exec(`set role ${role}`);
      try {
        return await fn();
      } finally {
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claims', '', false)");
      }
    },
    async createUser(email) {
      const { rows } = await db.query<{ id: string }>(
        "insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id",
        [email],
      );
      return rows[0].id;
    },
    async makeAdmin(userId) {
      await db.query("insert into public.admin_users (user_id) values ($1)", [userId]);
    },
  };
}
