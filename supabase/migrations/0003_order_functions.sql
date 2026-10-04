-- ===========================================================================
-- Marvell Florist — commerce transactions
-- Migration 0003: atomic order creation and stock movement.
--
-- Every stock movement lives in a database function rather than in application
-- code. Two shoppers buying the last stem at the same moment are serialised by
-- `select ... for update`, so the second one is refused instead of both being
-- told yes. Prices are read inside the same locked transaction and are never
-- accepted from the caller.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Order numbers: MF-YYMMDD-XXXXX
-- Random suffix, not a sequence, so the order URL cannot be walked to read
-- someone else's confirmation page.
-- ---------------------------------------------------------------------------

create or replace function generate_order_number()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; -- no 0/O/1/I
  candidate text;
  suffix    text;
  i         integer;
  attempts  integer := 0;
begin
  loop
    suffix := '';
    for i in 1..5 loop
      suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    candidate := 'MF-'
      || to_char(timezone('Asia/Jakarta', now()), 'YYMMDD')
      || '-' || suffix;

    exit when not exists (select 1 from orders where public_order_number = candidate);

    attempts := attempts + 1;
    if attempts > 20 then
      raise exception 'ORDER_NUMBER_EXHAUSTED';
    end if;
  end loop;

  return candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_order_with_reservations
--
-- p_items: [{ "sku": "ST-01", "quantity": 2, "product_name": "Soft Tones No. 1" }]
-- Returns: { order_id, order_number, subtotal_idr, delivery_fee_idr, total_idr, items }
--
-- Raises (caught and translated by the checkout function):
--   SKU_UNAVAILABLE:<sku>     product missing, inactive or not purchasable
--   INSUFFICIENT_STOCK:<sku>  fewer units free than requested
--   PRICE_CHANGED             totals moved since the shopper last saw them
--   EMPTY_CART                no valid lines
-- ---------------------------------------------------------------------------

create or replace function create_order_with_reservations(
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
      'product_name', coalesce(nullif(btrim(v_item->>'product_name'), ''), v_sku)
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
  v_order_number := generate_order_number();

  insert into orders (
    public_order_number, status, payment_status,
    customer_name, email, phone,
    delivery_method, delivery_address, delivery_date, delivery_time_window,
    recipient_name, card_message, order_notes,
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
    nullif(btrim(p_customer->>'card_message'), ''),
    nullif(btrim(p_customer->>'order_notes'), ''),
    v_subtotal,
    greatest(coalesce(p_delivery_fee_idr, 0), 0),
    v_total,
    'ipaymu',
    coalesce((p_customer->>'email_opt_in')::boolean, false),
    coalesce((p_customer->>'whatsapp_opt_in')::boolean, false)
  )
  returning id into v_order_id;

  insert into order_items (order_id, sku, product_name_snapshot, quantity, unit_price_idr, line_total_idr)
  select
    v_order_id,
    item->>'sku',
    item->>'product_name',
    (item->>'quantity')::integer,
    (item->>'unit_price_idr')::integer,
    (item->>'line_total_idr')::integer
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
    'subtotal_idr', v_subtotal,
    'delivery_fee_idr', greatest(coalesce(p_delivery_fee_idr, 0), 0),
    'total_idr', v_total,
    'expires_at', v_expires_at,
    'items', v_result_items
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- commit_order_payment — a verified payment turns held stock into sold stock.
-- Idempotent: payment providers retry webhooks, and a duplicate settlement
-- notification must not decrement stock twice.
-- ---------------------------------------------------------------------------

create or replace function commit_order_payment(
  p_order_number      text,
  p_payment_status    payment_status,
  p_payment_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order     orders%rowtype;
  v_committed integer := 0;
begin
  select * into v_order
  from orders
  where public_order_number = p_order_number
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  -- Already settled: record the reference, change nothing else.
  if v_order.status = 'paid' then
    update orders
    set payment_reference = coalesce(p_payment_reference, payment_reference),
        payment_status    = p_payment_status
    where id = v_order.id;

    return jsonb_build_object('order_number', p_order_number, 'status', 'paid', 'changed', false);
  end if;

  -- Consume the hold: the units leave both the shelf and the reserve.
  update products_commerce p
  set stock_quantity    = greatest(p.stock_quantity - agg.qty, 0),
      reserved_quantity = greatest(p.reserved_quantity - agg.qty, 0)
  from (
    select sku, sum(quantity) as qty
    from inventory_reservations
    where order_id = v_order.id and status = 'held'
    group by sku
  ) agg
  where p.sku = agg.sku;

  update inventory_reservations
  set status = 'committed'
  where order_id = v_order.id and status = 'held';

  get diagnostics v_committed = row_count;

  update orders
  set status            = 'paid',
      payment_status    = p_payment_status,
      payment_reference = coalesce(p_payment_reference, payment_reference),
      paid_at           = coalesce(paid_at, now()),
      production_status = 'new'
  where id = v_order.id;

  return jsonb_build_object(
    'order_number', p_order_number,
    'status', 'paid',
    'changed', true,
    'reservations_committed', v_committed
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- release_order_reservations — payment failed, expired or was cancelled.
-- The held units go straight back on sale.
-- ---------------------------------------------------------------------------

create or replace function release_order_reservations(
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
  where public_order_number = p_order_number
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  -- Never claw back stock from an order that genuinely paid. A refund is a
  -- separate, human decision about physical goods that may already be made.
  if v_order.status = 'paid' and p_order_status <> 'refunded' then
    return jsonb_build_object('order_number', p_order_number, 'status', 'paid', 'changed', false);
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

  return jsonb_build_object(
    'order_number', p_order_number,
    'status', p_order_status,
    'changed', true,
    'reservations_released', v_released
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- expire_stale_reservations — safety net for shoppers who close the tab
-- mid-payment and for any webhook that never arrives. Run on a schedule.
-- ---------------------------------------------------------------------------

create or replace function expire_stale_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_count    integer := 0;
begin
  for v_order_id in
    select distinct r.order_id
    from inventory_reservations r
    join orders o on o.id = r.order_id
    where r.status = 'held'
      and r.expires_at < now()
      and o.status = 'pending_payment'
  loop
    update products_commerce p
    set reserved_quantity = greatest(p.reserved_quantity - agg.qty, 0)
    from (
      select sku, sum(quantity) as qty
      from inventory_reservations
      where order_id = v_order_id and status = 'held'
      group by sku
    ) agg
    where p.sku = agg.sku;

    update inventory_reservations
    set status = 'released'
    where order_id = v_order_id and status = 'held';

    update orders
    set status = 'expired', payment_status = 'expire'
    where id = v_order_id and status = 'pending_payment';

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may call these
--
-- The externally callable functions above are `security definer`: they run as
-- the owner and move money's worth of stock, so who may invoke them matters.
--
-- REVOKING FROM anon AND authenticated IS NOT ENOUGH, which is what this block
-- used to do. PostgreSQL grants EXECUTE on every new function to PUBLIC, and
-- Supabase's default privileges additionally grant it to anon, authenticated
-- and service_role by name. Revoking only anon and authenticated leaves both
-- PUBLIC and service_role able to execute. Revoke all unwanted grants before
-- the deliberate re-grants below.
--
-- The grants are per function rather than one blanket loop, because the
-- answers differ:
--
--   create_order_with_reservations   checkout.mjs                service_role
--   commit_order_payment             ipaymu-webhook.mjs          service_role
--   release_order_reservations       ipaymu-webhook, checkout    service_role
--   expire_stale_reservations        reservations-cleanup.mjs    service_role
--   generate_order_number            nobody                      no grant
--
-- generate_order_number is the odd one and is deliberately granted to no API
-- role. It is not `security definer`, and its only caller is
-- create_order_with_reservations, which is — so by the time it runs, the
-- current user is already the owner and the owner's EXECUTE right covers it.
-- Granting it to service_role would hand out an order-number generator that
-- nothing needs to call from outside.
--
-- postgres, which is what the SQL editor runs as, owns the helper and retains
-- EXECUTE. The revoke does not remove that owner grant.
-- ---------------------------------------------------------------------------

revoke execute on function create_order_with_reservations(jsonb, jsonb, integer, integer, integer) from public, anon, authenticated;
revoke execute on function commit_order_payment(text, payment_status, text)                        from public, anon, authenticated;
revoke execute on function release_order_reservations(text, order_status, payment_status)          from public, anon, authenticated;
revoke execute on function expire_stale_reservations()                                             from public, anon, authenticated;
revoke execute on function generate_order_number()                                                 from public, anon, authenticated, service_role;

grant execute on function create_order_with_reservations(jsonb, jsonb, integer, integer, integer) to service_role;
grant execute on function commit_order_payment(text, payment_status, text)                        to service_role;
grant execute on function release_order_reservations(text, order_status, payment_status)          to service_role;
grant execute on function expire_stale_reservations()                                             to service_role;
-- generate_order_number: intentionally no grant. See above.
