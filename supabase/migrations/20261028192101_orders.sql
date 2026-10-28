-- Lojinha da Bruna — Etapa 2: pedidos.
--
-- Pedidos são criados apenas pela função public.create_order, executável
-- somente pelo service_role (servidor da aplicação). Clientes anônimos não
-- têm nenhum acesso direto a orders/order_items. Administradoras leem os
-- pedidos e alteram o status.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null
    constraint orders_customer_name_length check (char_length(btrim(customer_name)) between 2 and 120),
  customer_phone text
    constraint orders_customer_phone_length check (char_length(customer_phone) between 8 and 30),
  delivery_address text
    constraint orders_delivery_address_length check (char_length(delivery_address) <= 500),
  status text not null default 'pending'
    constraint orders_status_valid check (status in ('pending', 'confirmed', 'cancelled', 'fulfilled')),
  -- bigint: soma de até 50 itens; cada linha já é limitada por integer.
  subtotal_cents bigint not null default 0
    constraint orders_subtotal_non_negative check (subtotal_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function private.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- restrict: um produto com histórico de pedidos não pode ser excluído,
  -- apenas desativado.
  product_id uuid not null references public.products (id) on delete restrict,
  -- Cópias do momento da compra: preservam o histórico se o produto mudar.
  product_name text not null
    constraint order_items_product_name_length check (char_length(product_name) between 1 and 120),
  unit_price_cents integer not null
    constraint order_items_unit_price_positive check (unit_price_cents > 0),
  quantity integer not null
    constraint order_items_quantity_positive check (quantity > 0),
  line_total_cents integer not null
    constraint order_items_line_total_consistent check (line_total_cents = unit_price_cents * quantity),
  created_at timestamptz not null default now(),
  constraint order_items_unique_product unique (order_id, product_id)
);

-- order_id já é coberto pelo índice da restrição única (order_id, product_id).
create index order_items_product_id_idx on public.order_items (product_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
grant select on table public.orders to authenticated;
grant update (status) on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
grant all on table public.orders to service_role;
grant all on table public.order_items to service_role;

create policy "orders: administradoras leem"
  on public.orders for select
  to authenticated
  using ((select private.is_admin()));

create policy "orders: administradoras alteram o status"
  on public.orders for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "order_items: administradoras leem"
  on public.order_items for select
  to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Criação atômica do pedido.
--
-- p_items: [{ "product_id": "<uuid>", "quantity": <int> }, ...]
--
-- Tudo roda numa única transação: se qualquer item for inválido, nada é
-- gravado. Preço, nome e disponibilidade vêm da tabela products (nunca do
-- carrinho). As linhas de produto ficam travadas (FOR SHARE) até o fim da
-- transação, então uma edição concorrente não muda o preço no meio do pedido.
--
-- O estoque é validado, mas não baixado: a Bruna confirma o pedido pelo
-- WhatsApp e ajusta o estoque no painel (ver docs/decisoes.md).
--
-- Erros (SQLSTATE P0001, message = código, detail = product_id):
--   invalid_customer, invalid_items, duplicate_item, invalid_quantity,
--   product_unavailable, price_pending, insufficient_stock
-- ---------------------------------------------------------------------------
create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_items jsonb
)
returns table (order_id uuid, subtotal_cents bigint)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  max_lines constant integer := 50;
  max_quantity constant integer := 20; -- MAX_QUANTITY_PER_ITEM na aplicação
  v_order_id uuid;
  v_subtotal bigint := 0;
  v_count integer;
  v_item record;
  v_product record;
begin
  if p_customer_name is null or char_length(btrim(p_customer_name)) not between 2 and 120 then
    raise exception using errcode = 'P0001', message = 'invalid_customer';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception using errcode = 'P0001', message = 'invalid_items';
  end if;

  v_count := jsonb_array_length(p_items);
  if v_count = 0 or v_count > max_lines then
    raise exception using errcode = 'P0001', message = 'invalid_items';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) as elem
    where jsonb_typeof(elem) <> 'object'
      or jsonb_typeof(elem -> 'product_id') <> 'string'
      or jsonb_typeof(elem -> 'quantity') <> 'number'
      or (elem ->> 'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_items';
  end if;

  if (select count(distinct lower(elem ->> 'product_id')) from jsonb_array_elements(p_items) as elem) <> v_count then
    raise exception using errcode = 'P0001', message = 'duplicate_item';
  end if;

  insert into public.orders (customer_name, customer_phone, delivery_address)
  values (
    btrim(p_customer_name),
    nullif(btrim(p_customer_phone), ''),
    nullif(btrim(p_delivery_address), '')
  )
  returning id into v_order_id;

  -- Ordem determinística dos locks evita deadlock entre pedidos simultâneos.
  for v_item in
    select (elem ->> 'product_id')::uuid as product_id,
           (elem ->> 'quantity')::numeric as quantity
    from jsonb_array_elements(p_items) as elem
    order by 1
  loop
    if v_item.quantity <> trunc(v_item.quantity)
       or v_item.quantity < 1
       or v_item.quantity > max_quantity then
      raise exception using errcode = 'P0001', message = 'invalid_quantity',
        detail = v_item.product_id::text;
    end if;

    select p.id, p.name, p.price_cents, p.stock_quantity, p.is_active
      into v_product
      from public.products as p
      where p.id = v_item.product_id
      for share;

    if not found or not v_product.is_active then
      raise exception using errcode = 'P0001', message = 'product_unavailable',
        detail = v_item.product_id::text;
    end if;

    if v_product.price_cents is null then
      raise exception using errcode = 'P0001', message = 'price_pending',
        detail = v_item.product_id::text;
    end if;

    if v_product.stock_quantity is not null
       and v_item.quantity > v_product.stock_quantity then
      raise exception using errcode = 'P0001', message = 'insufficient_stock',
        detail = v_item.product_id::text;
    end if;

    insert into public.order_items
      (order_id, product_id, product_name, unit_price_cents, quantity, line_total_cents)
    values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_product.price_cents,
      v_item.quantity::integer,
      v_product.price_cents * v_item.quantity::integer
    );

    v_subtotal := v_subtotal + v_product.price_cents::bigint * v_item.quantity::integer;
  end loop;

  update public.orders as o set subtotal_cents = v_subtotal where o.id = v_order_id;

  return query select v_order_id, v_subtotal;
end;
$$;

revoke execute on function public.create_order(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(text, text, text, jsonb) to service_role;
