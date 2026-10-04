-- ===========================================================================
-- Marvell Florist — commerce core
-- Migration 0001: live commerce state, orders, reservations, newsletter log.
--
-- Design rule: Decap/git owns editorial product content (names, photography,
-- descriptions, palettes). This database owns ONLY facts that change without
-- an editor: price, stock, orders and payment state. The website joins the two
-- by SKU.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type order_status as enum (
    'pending_payment',
    'paid',
    'cancelled',
    'expired',
    'refunded'
  );
exception when duplicate_object then null; end $$;

-- Provider-neutral payment lifecycle plus a local 'unpaid' starting point.
do $$ begin
  create type payment_status as enum (
    'unpaid',
    'pending',
    'settlement',
    'capture',
    'deny',
    'cancel',
    'expire',
    'failure',
    'refund',
    'partial_refund'
  );
exception when duplicate_object then null; end $$;

-- Drives the future staff tablet app. Independent of payment state so that
-- florists can move a paid order across the workroom without touching money.
do $$ begin
  create type production_status as enum (
    'new',
    'making',
    'ready',
    'completed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type reservation_status as enum (
    'held',
    'committed',
    'released'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- products_commerce — live price and stock, keyed by the permanent SKU
-- ---------------------------------------------------------------------------

create table if not exists products_commerce (
  sku               text primary key,
  price_idr         integer not null check (price_idr >= 0),
  stock_quantity    integer not null default 0 check (stock_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  active            boolean not null default true,
  purchasable       boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Stock can never be reserved beyond what physically exists.
  constraint products_commerce_reserved_within_stock
    check (reserved_quantity <= stock_quantity)
);

comment on table products_commerce is
  'Live commerce state per retail SKU. Editorial content lives in Decap (content/retail-products.json).';
comment on column products_commerce.reserved_quantity is
  'Units held by pending orders. Available to sell = stock_quantity - reserved_quantity.';
comment on column products_commerce.purchasable is
  'False keeps the SKU visible but removes Add to Bag (e.g. display-only or consultation-only pieces).';

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  public_order_number text not null unique,
  status              order_status not null default 'pending_payment',
  production_status   production_status not null default 'new',

  customer_name       text not null,
  email               text not null,
  phone               text not null,

  delivery_method     text not null check (delivery_method in ('pickup', 'delivery')),
  delivery_address    text,
  delivery_date       date,
  delivery_time_window text,
  recipient_name      text,
  card_message        text,
  order_notes         text,

  subtotal_idr        integer not null check (subtotal_idr >= 0),
  delivery_fee_idr    integer not null default 0 check (delivery_fee_idr >= 0),
  total_idr           integer not null check (total_idr >= 0),

  payment_provider    text not null default 'ipaymu',
  payment_reference   text,
  payment_status      payment_status not null default 'unpaid',
  paid_at             timestamptz,

  email_opt_in        boolean not null default false,
  whatsapp_opt_in     boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- A delivery order must carry an address.
  constraint orders_delivery_needs_address
    check (delivery_method <> 'delivery'
           or (delivery_address is not null and btrim(delivery_address) <> ''))
);

create index if not exists orders_status_idx on orders (status, created_at desc);
create index if not exists orders_production_idx on orders (production_status, delivery_date);
create index if not exists orders_payment_reference_idx on orders (payment_reference);

comment on column orders.public_order_number is
  'Server-generated, human-quotable, also used as the payment-provider referenceId. Never sequential-guessable.';

-- ---------------------------------------------------------------------------
-- order_items — price and name snapshotted at purchase time
-- ---------------------------------------------------------------------------

create table if not exists order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references orders (id) on delete cascade,
  sku                   text not null,
  product_name_snapshot text not null,
  quantity              integer not null check (quantity > 0),
  unit_price_idr        integer not null check (unit_price_idr >= 0),
  line_total_idr        integer not null check (line_total_idr >= 0),
  created_at            timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on order_items (order_id);
create index if not exists order_items_sku_idx on order_items (sku);

comment on table order_items is
  'Snapshots name and price so a later CMS edit or price change never rewrites order history.';

-- ---------------------------------------------------------------------------
-- inventory_reservations — stock held while an order awaits payment
-- ---------------------------------------------------------------------------

create table if not exists inventory_reservations (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders (id) on delete cascade,
  sku        text not null references products_commerce (sku),
  quantity   integer not null check (quantity > 0),
  expires_at timestamptz not null,
  status     reservation_status not null default 'held',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_reservations_expiry_idx
  on inventory_reservations (status, expires_at);
create index if not exists inventory_reservations_order_idx
  on inventory_reservations (order_id);

-- ---------------------------------------------------------------------------
-- newsletter_events — local audit trail of consent, alongside Brevo
-- ---------------------------------------------------------------------------

create table if not exists newsletter_events (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  first_name      text,
  phone           text,
  source          text not null default 'unknown',
  email_opt_in    boolean not null default false,
  whatsapp_opt_in boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists newsletter_events_email_idx on newsletter_events (email);
create index if not exists newsletter_events_created_idx on newsletter_events (created_at desc);

comment on table newsletter_events is
  'Append-only consent record. Brevo is the sending system; this is our own proof of who opted into what, and when.';

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_commerce_set_updated_at on products_commerce;
create trigger products_commerce_set_updated_at
  before update on products_commerce
  for each row execute function set_updated_at();

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

drop trigger if exists inventory_reservations_set_updated_at on inventory_reservations;
create trigger inventory_reservations_set_updated_at
  before update on inventory_reservations
  for each row execute function set_updated_at();
