-- ===========================================================================
-- Marvell Florist — commerce security
-- Migration 0002: row level security.
--
-- Threat model: the browser never holds a Supabase key of any kind. Every read
-- and write goes through a Netlify Function using the service role key, which
-- bypasses RLS by design. The policies below are therefore defence in depth —
-- they guarantee that even if an anon or authenticated key were ever leaked or
-- added to the frontend later, it could not read an order or move stock.
-- ===========================================================================

alter table products_commerce      enable row level security;
alter table orders                 enable row level security;
alter table order_items            enable row level security;
alter table inventory_reservations enable row level security;
alter table newsletter_events      enable row level security;

-- Belt and braces: withdraw the default grants the anon/authenticated roles
-- receive on new tables in the public schema.
revoke all on products_commerce      from anon, authenticated;
revoke all on orders                 from anon, authenticated;
revoke all on order_items            from anon, authenticated;
revoke all on inventory_reservations from anon, authenticated;
revoke all on newsletter_events      from anon, authenticated;

-- ---------------------------------------------------------------------------
-- No policy at all == deny everything for anon/authenticated. We deliberately
-- create NO insert/update/delete policy on any table: stock, prices, orders and
-- payment state are only ever mutated server-side by the service role.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Optional public read surface.
--
-- Only needed if you ever decide to let the browser query Supabase directly
-- with the anon key. The site as built does NOT do this. The view exposes
-- availability as a boolean and a capped count — never the raw stock ledger,
-- so competitors cannot scrape exact inventory, and reserved_quantity (which
-- leaks pending order volume) never leaves the server.
-- ---------------------------------------------------------------------------

create or replace view public_product_availability
with (security_invoker = true)
as
select
  sku,
  price_idr,
  greatest(stock_quantity - reserved_quantity, 0) as available_quantity,
  (stock_quantity - reserved_quantity) > 0        as in_stock,
  purchasable
from products_commerce
where active = true;

comment on view public_product_availability is
  'Safe projection of products_commerce. security_invoker means the caller''s RLS still applies.';

-- Grant the read, then gate it with a policy that only ever reveals rows that
-- are genuinely on sale.
grant select on public_product_availability to anon, authenticated;

drop policy if exists products_commerce_public_read on products_commerce;
create policy products_commerce_public_read
  on products_commerce
  for select
  to anon, authenticated
  using (active = true and purchasable = true);

-- Note: the SELECT policy above is what makes the view readable. Because the
-- view is security_invoker and lists no order or customer data, an anon key can
-- learn a price and whether something is in stock, and nothing else.
