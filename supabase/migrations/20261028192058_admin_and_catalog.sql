-- Lojinha da Bruna — Etapa 2: administradores, categorias e produtos.
--
-- Modelo de acesso (ver docs/supabase.md):
--   * anon / authenticated: leem apenas categorias e produtos ATIVOS.
--   * administradoras (linhas em public.admin_users): gerenciam o catálogo.
--   * Ninguém vira administradora pelo cadastro público: admin_users não
--     aceita INSERT/UPDATE/DELETE de anon nem de authenticated. O primeiro
--     registro é criado pelo SQL Editor (papel postgres).
--
-- Desde 2026 o Supabase não expõe automaticamente tabelas novas à Data API,
-- por isso cada tabela recebe GRANTs explícitos e mínimos, junto com o RLS.

-- ---------------------------------------------------------------------------
-- Schema privado (não exposto pela Data API) para funções auxiliares.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
-- anon não precisa: nenhuma política aplicável a anon usa funções daqui.
grant usage on schema private to authenticated, service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Administradoras
-- ---------------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Contas autorizadas a usar o painel. Inserção apenas via SQL Editor/service role.';

alter table public.admin_users enable row level security;

revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;
grant all on table public.admin_users to service_role;

-- Cada usuária autenticada só enxerga a própria linha (se existir).
create policy "admin_users: ler a própria linha"
  on public.admin_users for select
  to authenticated
  using (user_id = (select auth.uid()));

-- SECURITY INVOKER: roda com as permissões de quem chama e respeita o RLS de
-- admin_users, então só retorna true para a própria usuária administradora.
create or replace function private.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Categorias
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint categories_name_length check (char_length(btrim(name)) between 1 and 60),
  slug text not null
    constraint categories_slug_unique unique
    constraint categories_slug_format check (
      slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80
    ),
  is_active boolean not null default true,
  -- Ordem de exibição na loja (menor primeiro).
  position integer not null default 0
    constraint categories_position_range check (position between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_active_position_idx
  on public.categories (position, name)
  where is_active;

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function private.set_updated_at();

alter table public.categories enable row level security;

revoke all on table public.categories from anon, authenticated;
grant select on table public.categories to anon;
grant select, insert, update, delete on table public.categories to authenticated;
grant all on table public.categories to service_role;

create policy "categories: leitura pública das ativas"
  on public.categories for select
  to anon, authenticated
  using (is_active);

create policy "categories: administradoras leem todas"
  on public.categories for select
  to authenticated
  using ((select private.is_admin()));

create policy "categories: administradoras criam"
  on public.categories for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "categories: administradoras editam"
  on public.categories for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "categories: administradoras excluem"
  on public.categories for delete
  to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Produtos
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint products_name_length check (char_length(btrim(name)) between 1 and 120),
  slug text not null
    constraint products_slug_unique unique
    constraint products_slug_format check (
      slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 140
    ),
  -- null = descrição ainda não confirmada pela Bruna.
  description text
    constraint products_description_length check (char_length(description) <= 5000),
  brand text
    constraint products_brand_length check (char_length(brand) <= 80),
  -- Excluir uma categoria com produtos é bloqueado; desative-a.
  category_id uuid references public.categories (id) on delete restrict,
  -- Centavos (BRL). null = preço a confirmar: o produto não pode ser comprado.
  -- Teto de R$ 99.999,99 mantém os totais longe do limite de integer.
  price_cents integer
    constraint products_price_range check (price_cents is null or price_cents between 1 and 9999999),
  -- null = estoque não controlado.
  stock_quantity integer
    constraint products_stock_range check (stock_quantity is null or stock_quantity between 0 and 100000),
  -- Lista de { "path": "<caminho no bucket product-images>", "alt": "<texto>" }.
  -- A primeira é a principal.
  images jsonb not null default '[]'::jsonb
    constraint products_images_array check (
      jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 8
    ),
  -- Produtos novos nascem inativos: só aparecem depois de revisados.
  is_active boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_active_name_idx on public.products (name) where is_active;
create index products_updated_at_idx on public.products (updated_at desc);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function private.set_updated_at();

alter table public.products enable row level security;

revoke all on table public.products from anon, authenticated;
grant select on table public.products to anon;
grant select, insert, update, delete on table public.products to authenticated;
grant all on table public.products to service_role;

create policy "products: leitura pública dos ativos"
  on public.products for select
  to anon, authenticated
  using (is_active);

create policy "products: administradoras leem todos"
  on public.products for select
  to authenticated
  using ((select private.is_admin()));

create policy "products: administradoras criam"
  on public.products for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "products: administradoras editam"
  on public.products for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "products: administradoras excluem"
  on public.products for delete
  to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Categorias iniciais do briefing (as mesmas da Etapa 1). Não são produtos
-- nem informações comerciais; podem ser renomeadas ou desativadas no painel.
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, position) values
  ('Beleza', 'beleza', 10),
  ('Perfumaria', 'perfumaria', 20),
  ('Cuidados pessoais', 'cuidados-pessoais', 30),
  ('Variedades', 'variedades', 40)
on conflict (slug) do nothing;
