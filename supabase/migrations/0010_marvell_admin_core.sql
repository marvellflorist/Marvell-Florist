-- Marvell Admin core. Apply only after read-only preflight confirms 0008/0009.
-- Existing MF references remain intact. New references are MV-XXXX-XXXX.

alter table public.orders
  add column if not exists payment_order_id text,
  add column if not exists payment_reconcile_checked_at timestamptz,
  add column if not exists fulfillment_state text not null default 'new',
  add column if not exists needs_attention boolean not null default false,
  add column if not exists attention_reason text,
  add column if not exists stock_exception boolean not null default false,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_by uuid references auth.users(id),
  add column if not exists recipient_phone text,
  add column if not exists delivery_unit text,
  add column if not exists delivery_instructions text,
  add column if not exists delivery_assignee uuid references auth.users(id),
  add column if not exists card_sender text,
  add column if not exists card_anonymous boolean not null default false,
  add column if not exists card_printed_at timestamptz,
  add column if not exists card_printed_by uuid references auth.users(id),
  add column if not exists card_reprint_count integer not null default 0;

update public.orders set payment_order_id = public_order_number
where payment_order_id is null;
alter table public.orders alter column payment_order_id set not null;
alter table public.orders alter column payment_order_id
  set default ('PAY-' || replace(gen_random_uuid()::text, '-', ''));
create unique index if not exists orders_payment_order_id_key
  on public.orders(payment_order_id);

update public.orders set fulfillment_state = case production_status::text
  when 'making' then 'preparing' when 'ready' then 'ready'
  when 'completed' then 'delivered' else 'new' end
where fulfillment_state = 'new' and production_status::text <> 'new';
alter table public.orders drop constraint if exists orders_fulfillment_state_check;
alter table public.orders add constraint orders_fulfillment_state_check
  check (fulfillment_state in
    ('new','acknowledged','preparing','ready','out_for_delivery','delivered','cancelled'));
alter table public.orders drop constraint if exists orders_card_reprint_count_check;
alter table public.orders add constraint orders_card_reprint_count_check
  check (card_reprint_count >= 0);
create index if not exists orders_fulfillment_queue_idx
  on public.orders(fulfillment_state, delivery_date, paid_at)
  where status = 'paid';
create index if not exists orders_attention_idx on public.orders(delivery_date, paid_at)
  where needs_attention;

alter table public.order_items
  add column if not exists product_image_snapshot text,
  add column if not exists selected_options jsonb not null default '{}'::jsonb,
  add column if not exists production_instructions text;
alter table public.order_items drop constraint if exists order_items_options_object_check;
alter table public.order_items add constraint order_items_options_object_check
  check (jsonb_typeof(selected_options) = 'object');

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('owner','store_admin','florist','delivery')),
  active boolean not null default true,
  can_manage_stock boolean not null default false,
  notify_paid_orders boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz
);
drop trigger if exists staff_members_set_updated_at on public.staff_members;
create trigger staff_members_set_updated_at before update on public.staff_members
  for each row execute function public.set_updated_at();

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  from_state text,
  to_state text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists order_status_events_order_idx
  on public.order_status_events(order_id, created_at desc);

create table if not exists public.card_print_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('print_requested','print_confirmed','reprint_requested','reprint_confirmed')),
  request_id uuid not null unique,
  created_at timestamptz not null default now()
);
create index if not exists card_print_events_order_idx
  on public.card_print_events(order_id, created_at desc);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  object_type text not null,
  object_id uuid,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_object_idx
  on public.audit_events(object_type, object_id, created_at desc);

-- A guest receipt link carries a random bearer token. Only its digest is stored.
create table if not exists public.guest_receipt_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists guest_receipt_tokens_order_idx
  on public.guest_receipt_tokens(order_id);

alter table public.staff_members enable row level security;
alter table public.order_status_events enable row level security;
alter table public.card_print_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.guest_receipt_tokens enable row level security;
revoke all on public.staff_members, public.order_status_events,
  public.card_print_events, public.audit_events, public.guest_receipt_tokens
  from public, anon, authenticated;

-- 32 symbols, eight positions: 40 random bits. The unique constraint is the
-- final arbiter; checkout retries a collision of public_order_number.
create or replace function public.generate_order_number()
returns text language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  bytes bytea := gen_random_bytes(8);
  suffix text := '';
  i integer;
begin
  for i in 0..7 loop
    suffix := suffix || substr(alphabet, (get_byte(bytes, i) & 31) + 1, 1);
  end loop;
  return 'MV-' || substr(suffix, 1, 4) || '-' || substr(suffix, 5, 4);
end;
$$;
revoke all on function public.generate_order_number() from public, anon, authenticated, service_role;

create or replace function public.create_order_with_reservations(
  p_customer             jsonb,
  p_items                jsonb,
  p_delivery_fee_idr     integer default 0,
  p_expected_subtotal_idr integer default null,
  p_reservation_minutes  integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id     uuid;
  v_order_number text;
  v_payment_order_id text;
  v_attempt integer;
  v_subtotal     integer := 0;
  v_total        integer := 0;
  v_expires_at   timestamptz;
  v_item         jsonb;
  v_sku          text;
  v_quantity     integer;
  v_available    integer;
  v_price        integer;
  v_line_total   integer;
  v_product      products_commerce%rowtype;
  v_result_items jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  v_expires_at := now() + make_interval(mins => greatest(p_reservation_minutes, 1));

  -- Pass 1 -----------------------------------------------------------------
  -- Lock every SKU in a deterministic order (sorted by sku) so two concurrent
  -- checkouts touching the same pair of products cannot deadlock each other.
  for v_item in
    select value
    from jsonb_array_elements(p_items) as value
    order by value->>'sku'
  loop
    v_sku      := btrim(v_item->>'sku');
    v_quantity := coalesce((v_item->>'quantity')::integer, 0);

    if v_quantity <= 0 then
      continue;
    end if;

    select * into v_product
    from products_commerce
    where sku = v_sku
    for update;

    if not found or not v_product.active or not v_product.purchasable then
      raise exception 'SKU_UNAVAILABLE:%', v_sku;
    end if;

    v_available := v_product.stock_quantity - v_product.reserved_quantity;
    if v_available < v_quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_sku;
    end if;

    -- Authoritative price. Whatever the browser believed is irrelevant here.
    v_price      := v_product.price_idr;
    v_line_total := v_price * v_quantity;
    v_subtotal   := v_subtotal + v_line_total;

    v_result_items := v_result_items || jsonb_build_object(
      'sku', v_sku,
      'quantity', v_quantity,
      'unit_price_idr', v_price,
      'line_total_idr', v_line_total,
      'product_name', coalesce(nullif(btrim(v_item->>'product_name'), ''), v_sku),
      'product_image', nullif(btrim(v_item->>'product_image'), ''),
      'selected_options', coalesce(v_item->'selected_options', '{}'::jsonb),
      'production_instructions', nullif(btrim(v_item->>'production_instructions'), '')
    );
  end loop;

  if jsonb_array_length(v_result_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- The shopper must be charged the number they were shown, or not at all.
  if p_expected_subtotal_idr is not null and p_expected_subtotal_idr <> v_subtotal then
    raise exception 'PRICE_CHANGED';
  end if;

  v_total := v_subtotal + greatest(coalesce(p_delivery_fee_idr, 0), 0);

  -- Pass 2 — write the order ------------------------------------------------
  for v_attempt in 1..8 loop
    v_order_number := generate_order_number();
    begin
  insert into orders (
    public_order_number, status, payment_status,
    customer_name, email, phone,
    delivery_method, delivery_address, delivery_date, delivery_time_window,
    recipient_name, recipient_phone, delivery_unit, delivery_instructions,
    card_message, card_sender, card_anonymous, order_notes,
    subtotal_idr, delivery_fee_idr, total_idr,
    payment_provider, email_opt_in, whatsapp_opt_in
  )
  values (
    v_order_number, 'pending_payment', 'unpaid',
    btrim(p_customer->>'customer_name'),
    lower(btrim(p_customer->>'email')),
    btrim(p_customer->>'phone'),
    coalesce(nullif(btrim(p_customer->>'delivery_method'), ''), 'pickup'),
    nullif(btrim(p_customer->>'delivery_address'), ''),
    nullif(btrim(p_customer->>'delivery_date'), '')::date,
    nullif(btrim(p_customer->>'delivery_time_window'), ''),
    nullif(btrim(p_customer->>'recipient_name'), ''),
    nullif(btrim(p_customer->>'recipient_phone'), ''),
    nullif(btrim(p_customer->>'delivery_unit'), ''),
    nullif(btrim(p_customer->>'delivery_instructions'), ''),
    nullif(btrim(p_customer->>'card_message'), ''),
    nullif(btrim(p_customer->>'card_sender'), ''),
    coalesce((p_customer->>'card_anonymous')::boolean, false),
    nullif(btrim(p_customer->>'order_notes'), ''),
    v_subtotal,
    greatest(coalesce(p_delivery_fee_idr, 0), 0),
    v_total,
    'ipaymu',
    coalesce((p_customer->>'email_opt_in')::boolean, false),
    coalesce((p_customer->>'whatsapp_opt_in')::boolean, false)
  )
  returning id, payment_order_id into v_order_id, v_payment_order_id;
      exit;
    exception when unique_violation then
      if v_attempt = 8 then raise exception 'ORDER_NUMBER_EXHAUSTED'; end if;
    end;
  end loop;

  insert into order_items (order_id, sku, product_name_snapshot, quantity, unit_price_idr, line_total_idr, product_image_snapshot, selected_options, production_instructions)
  select
    v_order_id,
    item->>'sku',
    item->>'product_name',
    (item->>'quantity')::integer,
    (item->>'unit_price_idr')::integer,
    (item->>'line_total_idr')::integer,
    item->>'product_image',
    coalesce(item->'selected_options', '{}'::jsonb),
    item->>'production_instructions'
  from jsonb_array_elements(v_result_items) as item;

  insert into inventory_reservations (order_id, sku, quantity, expires_at, status)
  select
    v_order_id,
    item->>'sku',
    (item->>'quantity')::integer,
    v_expires_at,
    'held'
  from jsonb_array_elements(v_result_items) as item;

  -- Hold the stock. Still counted in stock_quantity; simply not sellable.
  update products_commerce p
  set reserved_quantity = p.reserved_quantity + agg.qty
  from (
    select item->>'sku' as sku, sum((item->>'quantity')::integer) as qty
    from jsonb_array_elements(v_result_items) as item
    group by 1
  ) agg
  where p.sku = agg.sku;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_order_id', v_payment_order_id,
    'subtotal_idr', v_subtotal,
    'delivery_fee_idr', greatest(coalesce(p_delivery_fee_idr, 0), 0),
    'total_idr', v_total,
    'expires_at', v_expires_at,
    'items', v_result_items
  );
end;
$$;

revoke all on function public.create_order_with_reservations(jsonb, jsonb, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.create_order_with_reservations(jsonb, jsonb, integer, integer, integer) to service_role;

-- Commit payment only once. A late settlement is still recorded as paid, but
-- released/missing stock is never silently allocated or marked fulfillable.
create or replace function public.commit_order_payment(
  p_order_number text, p_payment_status payment_status,
  p_payment_reference text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_held integer;
  v_required integer;
  v_committed integer := 0;
  v_exception boolean;
begin
  select * into v_order from public.orders
   where payment_order_id = p_order_number or public_order_number = p_order_number
   for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status = 'paid' then
    return jsonb_build_object('order_number', v_order.public_order_number,
      'status', 'paid', 'changed', false, 'stock_exception', v_order.stock_exception);
  end if;
  if v_order.status not in ('pending_payment','expired','cancelled') then
    raise exception 'PAYMENT_STATE_CONFLICT';
  end if;

  select coalesce(sum(quantity), 0) into v_required
    from public.order_items where order_id = v_order.id;
  select coalesce(sum(quantity), 0) into v_held
    from public.inventory_reservations
   where order_id = v_order.id and status = 'held';
  v_exception := v_order.status <> 'pending_payment' or v_required = 0 or v_held <> v_required;
  -- The sweep may be delayed. An elapsed hold is expired even while its row
  -- still says held; payment must never convert that hold into allocated stock.
  if not v_exception then
    select exists (select 1 from public.inventory_reservations
      where order_id = v_order.id and status = 'held' and expires_at <= now())
      into v_exception;
  end if;
  if not v_exception then
    select exists (
      select 1 from
        (select sku, sum(quantity) qty from public.order_items
          where order_id = v_order.id group by sku) i
        full join
        (select sku, sum(quantity) qty from public.inventory_reservations
          where order_id = v_order.id and status = 'held' group by sku) r
        using (sku)
      where coalesce(i.qty, 0) <> coalesce(r.qty, 0)
    ) into v_exception;
  end if;

  if not v_exception then
    update public.products_commerce p
       set stock_quantity = p.stock_quantity - agg.qty,
           reserved_quantity = p.reserved_quantity - agg.qty
      from (select sku, sum(quantity) as qty
              from public.inventory_reservations
             where order_id = v_order.id and status = 'held' group by sku) agg
     where p.sku = agg.sku;
    update public.inventory_reservations set status = 'committed'
     where order_id = v_order.id and status = 'held';
    get diagnostics v_committed = row_count;
  else
    -- A partial hold must not linger after staff receive the stock exception.
    update public.products_commerce p
       set reserved_quantity = greatest(p.reserved_quantity - agg.qty, 0)
      from (select sku, sum(quantity) qty from public.inventory_reservations
             where order_id = v_order.id and status = 'held' group by sku) agg
     where p.sku = agg.sku;
    update public.inventory_reservations set status = 'released'
     where order_id = v_order.id and status = 'held';
  end if;

  update public.orders
     set status = 'paid', payment_status = p_payment_status,
         payment_reference = coalesce(p_payment_reference, payment_reference),
         paid_at = coalesce(paid_at, now()),
         fulfillment_state = 'new', production_status = 'new',
         needs_attention = v_exception, stock_exception = v_exception,
         attention_reason = case when v_exception then 'payment_after_stock_release' else null end
   where id = v_order.id;
  insert into public.order_status_events(order_id, event_type, from_state, to_state, note)
  values (v_order.id, case when v_exception then 'paid_stock_exception' else 'paid' end,
    v_order.status::text, 'paid', case when v_exception then 'Reservasi stok tidak tersedia saat pembayaran diterima' end);
  return jsonb_build_object('order_number', v_order.public_order_number,
    'status', 'paid', 'changed', true, 'stock_exception', v_exception,
    'reservations_committed', v_committed);
end;
$$;
revoke all on function public.commit_order_payment(text, payment_status, text)
  from public, anon, authenticated;
grant execute on function public.commit_order_payment(text, payment_status, text) to service_role;

-- The sweep and settlement both lock the order before touching reservations.
create or replace function public.expire_stale_reservations()
returns integer language plpgsql security definer set search_path = public as $$
declare v_order_id uuid; v_count integer := 0;
begin
  for v_order_id in
    select o.id from public.orders o
     where o.status = 'pending_payment'
       and exists (select 1 from public.inventory_reservations r
         where r.order_id = o.id and r.status = 'held' and r.expires_at < now())
     for update of o skip locked
  loop
    update public.products_commerce p
       set reserved_quantity = greatest(p.reserved_quantity - agg.qty, 0)
      from (select sku, sum(quantity) qty from public.inventory_reservations
             where order_id = v_order_id and status = 'held' group by sku) agg
     where p.sku = agg.sku;
    update public.inventory_reservations set status = 'released'
     where order_id = v_order_id and status = 'held';
    update public.orders set status = 'expired', payment_status = 'expire'
     where id = v_order_id and status = 'pending_payment';
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.expire_stale_reservations() from public, anon, authenticated;
grant execute on function public.expire_stale_reservations() to service_role;

create or replace function public.release_order_reservations(
  p_order_number   text,
  p_order_status   order_status,
  p_payment_status payment_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order    orders%rowtype;
  v_released integer := 0;
begin
  select * into v_order
  from orders
  where payment_order_id = p_order_number or public_order_number = p_order_number
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.status = p_order_status and v_order.payment_status = p_payment_status then
    return jsonb_build_object('order_number', v_order.public_order_number,
      'status', p_order_status, 'changed', false);
  end if;

  -- Never claw back stock from an order that genuinely paid. A refund is a
  -- separate, human decision about physical goods that may already be made.
  if v_order.status = 'paid' and p_order_status <> 'refunded' then
    return jsonb_build_object('order_number', v_order.public_order_number, 'status', 'paid', 'changed', false);
  end if;

  update products_commerce p
  set reserved_quantity = greatest(p.reserved_quantity - agg.qty, 0)
  from (
    select sku, sum(quantity) as qty
    from inventory_reservations
    where order_id = v_order.id and status = 'held'
    group by sku
  ) agg
  where p.sku = agg.sku;

  update inventory_reservations
  set status = 'released'
  where order_id = v_order.id and status = 'held';

  get diagnostics v_released = row_count;

  update orders
  set status         = p_order_status,
      payment_status = p_payment_status
  where id = v_order.id;

  insert into public.order_status_events(order_id, event_type, from_state, to_state, note)
    values (v_order.id, 'payment_' || p_order_status::text,
      v_order.status::text, p_order_status::text, null);
  insert into public.audit_events(action, object_type, object_id, before_state, after_state)
    values ('payment.' || p_order_status::text, 'order', v_order.id,
      jsonb_build_object('status', v_order.status, 'payment_status', v_order.payment_status),
      jsonb_build_object('status', p_order_status, 'payment_status', p_payment_status));

  return jsonb_build_object(
    'order_number', v_order.public_order_number,
    'status', p_order_status,
    'changed', true,
    'reservations_released', v_released
  );
end;
$$;

revoke all on function public.release_order_reservations(text, order_status, payment_status) from public, anon, authenticated;
grant execute on function public.release_order_reservations(text, order_status, payment_status) to service_role;

-- Admin sign-in performs an existence check before asking Supabase to mint an
-- email code. This function returns no customer profile information.
create or replace function public.staff_account_by_email(p_email text)
returns table(user_id uuid, staff_role text)
language sql stable security definer set search_path = public, auth as $$
  select s.user_id, s.role from public.staff_members s
  join auth.users u on u.id = s.user_id
  where s.active and lower(btrim(u.email)) = lower(btrim(p_email))
  limit 1;
$$;
revoke all on function public.staff_account_by_email(text) from public, anon, authenticated;
grant execute on function public.staff_account_by_email(text) to service_role;

-- User-context RPC: the actor comes only from the verified JWT. It checks the
-- active membership again inside the same transaction as the order mutation.
create or replace function public.admin_transition_order(
  p_order_id uuid, p_action text, p_expected_state text default null,
  p_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_order public.orders%rowtype;
  v_next text;
begin
  select role into v_role from public.staff_members
    where user_id = v_actor and active;
  if v_role is null or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'paid' then raise exception 'ORDER_NOT_PAID'; end if;
  if p_expected_state is not null and v_order.fulfillment_state <> p_expected_state then
    raise exception 'STATE_CHANGED';
  end if;

  if p_action = 'acknowledge' and v_order.fulfillment_state = 'new'
      and v_role in ('owner','store_admin') then
    v_next := 'acknowledged';
  elsif p_action = 'start_preparing' and v_order.fulfillment_state = 'acknowledged'
      and v_role in ('owner','store_admin','florist') then
    v_next := 'preparing';
  elsif p_action = 'mark_ready' and v_order.fulfillment_state = 'preparing'
      and v_role in ('owner','store_admin','florist') then
    v_next := 'ready';
  elsif p_action = 'start_delivery' and v_order.fulfillment_state = 'ready'
      and v_order.delivery_method = 'delivery'
      and (v_role in ('owner','store_admin') or
        (v_role = 'delivery' and v_order.delivery_assignee = v_actor)) then
    v_next := 'out_for_delivery';
  elsif p_action = 'complete' and
      ((v_order.fulfillment_state = 'out_for_delivery' and
        (v_role in ('owner','store_admin') or
         (v_role = 'delivery' and v_order.delivery_assignee = v_actor)))
       or (v_order.fulfillment_state = 'ready' and
         v_order.delivery_method = 'pickup' and v_role in ('owner','store_admin'))) then
    v_next := 'delivered';
  else
    raise exception 'INVALID_TRANSITION';
  end if;
  if v_order.needs_attention then raise exception 'ORDER_NEEDS_ATTENTION'; end if;

  update public.orders set fulfillment_state = v_next,
    production_status = case v_next
      when 'preparing' then 'making'::production_status
      when 'ready' then 'ready'::production_status
      when 'out_for_delivery' then 'ready'::production_status
      when 'delivered' then 'completed'::production_status
      else 'new'::production_status end,
    acknowledged_at = case when v_next = 'acknowledged' then now() else acknowledged_at end,
    acknowledged_by = case when v_next = 'acknowledged' then v_actor else acknowledged_by end
  where id = p_order_id;
  insert into public.order_status_events(order_id, actor_user_id, event_type, from_state, to_state, note)
    values (p_order_id, v_actor, p_action, v_order.fulfillment_state, v_next,
      left(nullif(btrim(p_note), ''), 500));
  insert into public.audit_events(actor_user_id, action, object_type, object_id, before_state, after_state)
    values (v_actor, 'order.' || p_action, 'order', p_order_id,
      jsonb_build_object('fulfillment_state', v_order.fulfillment_state),
      jsonb_build_object('fulfillment_state', v_next));
  if v_next = 'acknowledged' then
    update public.admin_notifications set acknowledged_at = now(), acknowledged_by = v_actor
      where order_id = p_order_id and acknowledged_at is null;
  end if;
  return jsonb_build_object('changed', true, 'fulfillment_state', v_next);
end;
$$;
revoke all on function public.admin_transition_order(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_transition_order(uuid, text, text, text) to authenticated;

-- A print dialog is only an attempt. The separate confirmation means staff
-- actually saw a printed card; reprints remain visible in history.
create or replace function public.admin_card_action(
  p_order_id uuid, p_action text, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_role text; v_order public.orders%rowtype;
  v_event text; v_inserted uuid;
begin
  select role into v_role from public.staff_members
    where user_id = v_actor and active;
  if v_role is null or v_role not in ('owner','store_admin','florist')
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'paid' or v_order.needs_attention
      or nullif(btrim(v_order.card_message), '') is null then
    raise exception 'CARD_UNAVAILABLE';
  end if;
  if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
  if p_action = 'request' then
    v_event := case when v_order.card_printed_at is null then 'print_requested' else 'reprint_requested' end;
  elsif p_action = 'confirm' then
    v_event := case when v_order.card_printed_at is null then 'print_confirmed' else 'reprint_confirmed' end;
    if not exists (select 1 from public.card_print_events e
      where e.order_id = p_order_id and e.actor_user_id = v_actor
        and e.event_type = case when v_order.card_printed_at is null
          then 'print_requested' else 'reprint_requested' end
        and e.created_at > coalesce(v_order.card_printed_at, '-infinity'::timestamptz)) then
      raise exception 'PRINT_NOT_REQUESTED';
    end if;
  else raise exception 'INVALID_CARD_ACTION'; end if;

  insert into public.card_print_events(order_id, actor_user_id, event_type, request_id)
    values (p_order_id, v_actor, v_event, p_request_id)
    on conflict (request_id) do nothing returning id into v_inserted;
  if v_inserted is null then return jsonb_build_object('changed', false); end if;
  if p_action = 'confirm' then
    update public.orders set card_printed_at = now(), card_printed_by = v_actor,
      card_reprint_count = card_reprint_count + case when v_order.card_printed_at is null then 0 else 1 end
      where id = p_order_id;
  end if;
  insert into public.audit_events(actor_user_id, action, object_type, object_id)
    values (v_actor, 'card.' || v_event, 'order', p_order_id);
  return jsonb_build_object('changed', true, 'event', v_event);
end;
$$;
revoke all on function public.admin_card_action(uuid, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_card_action(uuid, text, uuid) to authenticated;

create or replace function public.admin_resolve_attention(p_order_id uuid, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_role text; v_order public.orders%rowtype;
  v_item record; v_product public.products_commerce%rowtype;
begin
  select role into v_role from public.staff_members where user_id = v_actor and active;
  if v_role is null or v_role not in ('owner','store_admin')
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  if char_length(btrim(coalesce(p_note,''))) < 10 then raise exception 'RESOLUTION_NOTE_REQUIRED'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if not v_order.needs_attention then return jsonb_build_object('changed', false); end if;
  if v_order.status <> 'paid' then raise exception 'ORDER_NOT_PAID'; end if;
  if v_order.stock_exception then
    -- Explicit staff reconciliation. Lock each SKU in a stable order, verify
    -- unreserved stock, and allocate the entire order atomically or none.
    for v_item in select sku, sum(quantity)::integer qty
        from public.order_items where order_id = p_order_id group by sku order by sku
    loop
      select * into v_product from public.products_commerce
        where sku = v_item.sku for update;
      if not found or v_product.stock_quantity - v_product.reserved_quantity < v_item.qty then
        raise exception 'STOCK_UNAVAILABLE';
      end if;
      update public.products_commerce set stock_quantity = stock_quantity - v_item.qty
        where sku = v_item.sku;
    end loop;
  end if;
  update public.orders set needs_attention = false, stock_exception = false,
    attention_reason = null where id = p_order_id;
  insert into public.order_status_events(order_id, actor_user_id, event_type, note)
    values (p_order_id, v_actor, 'attention_resolved', left(btrim(p_note), 500));
  insert into public.audit_events(actor_user_id, action, object_type, object_id,
    before_state, after_state)
    values (v_actor, 'order.attention_resolved', 'order', p_order_id,
      jsonb_build_object('needs_attention', true, 'reason', v_order.attention_reason),
      jsonb_build_object('needs_attention', false, 'stock_allocated', v_order.stock_exception,
        'note', left(btrim(p_note), 500)));
  return jsonb_build_object('changed', true);
end;
$$;
revoke all on function public.admin_resolve_attention(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_resolve_attention(uuid, text) to authenticated;

create or replace function public.admin_assign_delivery(p_order_id uuid, p_assignee uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_role text; v_before uuid;
begin
  select role into v_role from public.staff_members where user_id = v_actor and active;
  if v_role is null or v_role not in ('owner','store_admin')
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  if not exists (select 1 from public.staff_members
      where user_id = p_assignee and active and role = 'delivery') then
    raise exception 'DELIVERY_ASSIGNEE_INVALID';
  end if;
  select delivery_assignee into v_before from public.orders
    where id = p_order_id and status = 'paid' and delivery_method = 'delivery' for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_before is not distinct from p_assignee then return jsonb_build_object('changed', false); end if;
  update public.orders set delivery_assignee = p_assignee where id = p_order_id;
  insert into public.audit_events(actor_user_id, action, object_type, object_id, before_state, after_state)
    values (v_actor, 'order.delivery_assigned', 'order', p_order_id,
      jsonb_build_object('assignee', v_before), jsonb_build_object('assignee', p_assignee));
  return jsonb_build_object('changed', true);
end;
$$;
revoke all on function public.admin_assign_delivery(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_assign_delivery(uuid, uuid) to authenticated;

create or replace function public.admin_change_delivery(
  p_order_id uuid, p_date date, p_window text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_role text; v_order public.orders%rowtype;
begin
  select role into v_role from public.staff_members where user_id = v_actor and active;
  if v_role is null or v_role not in ('owner','store_admin')
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  if p_date is null or p_date < (now() at time zone 'Asia/Jakarta')::date
      or p_window not in ('morning','afternoon') then raise exception 'DELIVERY_SLOT_INVALID'; end if;
  select * into v_order from public.orders where id = p_order_id and status = 'paid' for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.delivery_date is not distinct from p_date
      and v_order.delivery_time_window is not distinct from p_window then
    return jsonb_build_object('changed', false);
  end if;
  update public.orders set delivery_date = p_date, delivery_time_window = p_window where id = p_order_id;
  insert into public.order_status_events(order_id, actor_user_id, event_type, note)
    values (p_order_id, v_actor, 'delivery_slot_changed',
      p_date::text || ' / ' || case p_window when 'morning' then 'Pagi' else 'Siang' end);
  insert into public.audit_events(actor_user_id, action, object_type, object_id, before_state, after_state)
    values (v_actor, 'order.delivery_slot_changed', 'order', p_order_id,
      jsonb_build_object('date', v_order.delivery_date, 'window', v_order.delivery_time_window),
      jsonb_build_object('date', p_date, 'window', p_window));
  return jsonb_build_object('changed', true);
end;
$$;
revoke all on function public.admin_change_delivery(uuid, date, text)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_change_delivery(uuid, date, text) to authenticated;

create or replace function public.admin_set_stock(p_sku text, p_quantity integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_staff public.staff_members%rowtype;
  v_product public.products_commerce%rowtype;
begin
  select * into v_staff from public.staff_members where user_id = v_actor and active;
  if not found or (v_staff.role <> 'owner' and
      not (v_staff.role = 'store_admin' and v_staff.can_manage_stock))
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  select * into v_product from public.products_commerce where sku = p_sku for update;
  if not found then raise exception 'SKU_UNAVAILABLE'; end if;
  if p_quantity is null or p_quantity < v_product.reserved_quantity then
    raise exception 'STOCK_BELOW_RESERVATIONS';
  end if;
  if p_quantity = v_product.stock_quantity then return jsonb_build_object('changed', false); end if;
  update public.products_commerce set stock_quantity = p_quantity where sku = p_sku;
  insert into public.audit_events(actor_user_id, action, object_type, before_state, after_state)
    values (v_actor, 'stock.quantity_changed', 'product',
      jsonb_build_object('sku', p_sku, 'quantity', v_product.stock_quantity),
      jsonb_build_object('sku', p_sku, 'quantity', p_quantity));
  return jsonb_build_object('changed', true, 'stock_quantity', p_quantity);
end;
$$;
revoke all on function public.admin_set_stock(text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_set_stock(text, integer) to authenticated;

create or replace function public.admin_update_staff(
  p_user_id uuid, p_role text, p_active boolean,
  p_notify_paid_orders boolean, p_can_manage_stock boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_target public.staff_members%rowtype;
begin
  if not exists (select 1 from public.staff_members
      where user_id = v_actor and active and role = 'owner')
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  if p_role not in ('owner','store_admin','florist','delivery') then raise exception 'ROLE_INVALID'; end if;
  select * into v_target from public.staff_members where user_id = p_user_id for update;
  if not found then raise exception 'STAFF_NOT_FOUND'; end if;
  if p_user_id = v_actor and (not p_active or p_role <> 'owner') then
    raise exception 'CANNOT_REMOVE_SELF';
  end if;
  if v_target.role = 'owner' and v_target.active and (p_role <> 'owner' or not p_active)
      and (select count(*) from public.staff_members where role = 'owner' and active) <= 1 then
    raise exception 'LAST_OWNER';
  end if;
  update public.staff_members set role = p_role, active = p_active,
    notify_paid_orders = p_notify_paid_orders,
    can_manage_stock = p_can_manage_stock,
    deactivated_at = case when p_active then null else now() end
    where user_id = p_user_id;
  insert into public.audit_events(actor_user_id, action, object_type, object_id, before_state, after_state)
    values (v_actor, 'staff.permissions_changed', 'staff', p_user_id,
      jsonb_build_object('role', v_target.role, 'active', v_target.active,
        'notify_paid_orders', v_target.notify_paid_orders, 'can_manage_stock', v_target.can_manage_stock),
      jsonb_build_object('role', p_role, 'active', p_active,
        'notify_paid_orders', p_notify_paid_orders, 'can_manage_stock', p_can_manage_stock));
  return jsonb_build_object('changed', true);
end;
$$;
revoke all on function public.admin_update_staff(uuid, text, boolean, boolean, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_update_staff(uuid, text, boolean, boolean, boolean)
  to authenticated;

create or replace function public.admin_add_staff(
  p_user_id uuid, p_name text, p_role text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid();
begin
  if not exists (select 1 from public.staff_members
      where user_id = v_actor and active and role = 'owner')
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  if p_role not in ('owner','store_admin','florist','delivery')
      or char_length(btrim(coalesce(p_name,''))) not between 1 and 100 then
    raise exception 'STAFF_INPUT_INVALID';
  end if;
  insert into public.staff_members(user_id, display_name, role, notify_paid_orders)
    values (p_user_id, btrim(p_name), p_role, p_role in ('owner','store_admin'));
  insert into public.audit_events(actor_user_id, action, object_type, object_id, after_state)
    values (v_actor, 'staff.invited', 'staff', p_user_id,
      jsonb_build_object('role', p_role, 'active', true));
  return jsonb_build_object('created', true);
end;
$$;
revoke all on function public.admin_add_staff(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_add_staff(uuid, text, text) to authenticated;

-- The old function has no actor or transition validation. Nothing calls it
-- today, so remove its service-role execute grant before exposing Admin.
revoke all on function public.advance_production_status(text, production_status)
  from public, anon, authenticated, service_role;
