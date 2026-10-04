-- Optional first-party measurement. No order operation depends on these tables.
create table if not exists public.browser_consent_receipts (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  customer_user_id uuid references auth.users(id) on delete set null,
  consent_version text not null,
  analytics_allowed boolean not null default false,
  marketing_allowed boolean not null default false,
  recorded_at timestamptz not null default now()
);
create index if not exists browser_consent_visitor_idx
  on public.browser_consent_receipts(visitor_id, recorded_at desc);

create table if not exists public.marketing_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  consent_receipt_id uuid not null references public.browser_consent_receipts(id),
  customer_user_id uuid references auth.users(id) on delete set null,
  first_touch jsonb,
  last_touch jsonb,
  landing_path text,
  referrer_category text,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  check (first_touch is null or jsonb_typeof(first_touch) = 'object'),
  check (last_touch is null or jsonb_typeof(last_touch) = 'object')
);
create index if not exists marketing_sessions_visitor_idx
  on public.marketing_sessions(visitor_id, started_at desc);

create table if not exists public.marketing_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.marketing_sessions(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  event_name text not null check (event_name in (
    'page_view','view_collection','view_item','search','wishlist_add','wishlist_remove',
    'add_to_cart','remove_from_cart','begin_checkout','delivery_details_complete',
    'payment_started','checkout_error','purchase','refund','account_create',
    'account_sign_in','newsletter_signup','whatsapp_click','consultation_start')),
  product_sku text,
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object'),
  occurred_at timestamptz not null default now()
);
create index if not exists marketing_events_session_idx
  on public.marketing_events(session_id, occurred_at desc);
create index if not exists marketing_events_name_time_idx
  on public.marketing_events(event_name, occurred_at desc);
create unique index if not exists marketing_events_order_conversion_key
  on public.marketing_events(event_name, order_id)
  where order_id is not null and event_name in ('purchase','refund');

create table if not exists public.order_attribution (
  order_id uuid primary key references public.orders(id) on delete cascade,
  session_id uuid references public.marketing_sessions(id) on delete set null,
  first_touch jsonb,
  last_touch jsonb,
  captured_at timestamptz not null default now(),
  purchase_reconciled_at timestamptz,
  check (first_touch is null or jsonb_typeof(first_touch) = 'object'),
  check (last_touch is null or jsonb_typeof(last_touch) = 'object')
);

alter table public.browser_consent_receipts enable row level security;
alter table public.marketing_sessions enable row level security;
alter table public.marketing_events enable row level security;
alter table public.order_attribution enable row level security;
revoke all on public.browser_consent_receipts, public.marketing_sessions,
  public.marketing_events, public.order_attribution from public, anon, authenticated;
