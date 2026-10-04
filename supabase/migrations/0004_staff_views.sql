-- ===========================================================================
-- Marvell Florist — staff operations groundwork
-- Migration 0004: read models the future Samsung-tablet PWA will consume.
--
-- No staff app is built yet and no staff auth exists yet. These views exist so
-- that when it is built, it reads stable, named shapes rather than inventing a
-- second interpretation of the order tables. They are service-role only; the
-- staff app will authenticate before any of this is reachable.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- staff_production_queue — "what must be made", newest commitments first.
-- Only paid orders appear: nobody should build an arrangement for an order
-- that has not cleared.
-- ---------------------------------------------------------------------------

create or replace view staff_production_queue
with (security_invoker = true)
as
select
  o.id                  as order_id,
  o.public_order_number,
  o.production_status,
  o.delivery_method,
  o.delivery_date,
  o.delivery_time_window,
  o.recipient_name,
  o.customer_name,
  o.phone,
  o.card_message,
  o.order_notes,
  o.total_idr,
  o.paid_at,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sku', i.sku,
        'product_name', i.product_name_snapshot,
        'quantity', i.quantity
      )
      order by i.sku
    ) filter (where i.id is not null),
    '[]'::jsonb
  ) as items
from orders o
left join order_items i on i.order_id = o.id
where o.status = 'paid'
  and o.production_status <> 'completed'
group by o.id;

comment on view staff_production_queue is
  'Feeds the New / Making / Ready columns of the staff tablet app.';

-- ---------------------------------------------------------------------------
-- staff_today — everything leaving the shop today, in Jakarta time.
-- ---------------------------------------------------------------------------

create or replace view staff_today
with (security_invoker = true)
as
select *
from staff_production_queue
where delivery_date = (timezone('Asia/Jakarta', now()))::date;

-- ---------------------------------------------------------------------------
-- staff_stock_overview — the product screen: what is on the shelf right now.
-- ---------------------------------------------------------------------------

create or replace view staff_stock_overview
with (security_invoker = true)
as
select
  p.sku,
  p.price_idr,
  p.stock_quantity,
  p.reserved_quantity,
  greatest(p.stock_quantity - p.reserved_quantity, 0) as available_quantity,
  p.active,
  p.purchasable,
  p.updated_at
from products_commerce p
order by p.sku;

-- ---------------------------------------------------------------------------
-- advance_production_status — the only way the tablet moves an order along.
-- Keeps the transition legal and leaves payment state untouched.
-- ---------------------------------------------------------------------------

create or replace function advance_production_status(
  p_order_number text,
  p_next         production_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order
  from orders
  where public_order_number = p_order_number
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.status <> 'paid' then
    raise exception 'ORDER_NOT_PAID';
  end if;

  update orders
  set production_status = p_next
  where id = v_order.id;

  return jsonb_build_object(
    'order_number', p_order_number,
    'production_status', p_next
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may read and call these
--
-- The views first. A view is not granted to PUBLIC by default — PostgreSQL
-- gives new tables and views to their owner alone, and it is Supabase's
-- default privileges that hand them to anon, authenticated and service_role by
-- name. Revoking those named grants is therefore sufficient, and no PUBLIC
-- revoke is needed or added here.
--
-- The function is the opposite case. EXECUTE on a new function IS granted to
-- PUBLIC by default, so revoking anon and authenticated alone left the PUBLIC
-- grant standing and anon holds PUBLIC implicitly. advance_production_status
-- is `security definer` and moves a paid order along the production line, so
-- PUBLIC is revoked and the grant is then made deliberately.
--
-- service_role, because this file's own premise is that these are service-role
-- only: there is no staff auth yet, and when the tablet app arrives it will
-- reach this through a server holding the service key rather than from the
-- device. If a real staff database role is ever created, this is the line that
-- changes, and it should change to that role rather than adding to it.
-- ---------------------------------------------------------------------------

revoke all    on staff_production_queue from anon, authenticated;
revoke all    on staff_today            from anon, authenticated;
revoke all    on staff_stock_overview   from anon, authenticated;

revoke execute on function advance_production_status(text, production_status) from public, anon, authenticated;
grant  execute on function advance_production_status(text, production_status) to service_role;
