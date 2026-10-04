-- ===========================================================================
-- Marvell Florist — My Marvell
-- Migration 0005: customer accounts, and the link between a verified person
-- and the orders they have already placed.
--
-- Four rules this migration exists to keep:
--
--   · An order is not an account. Orders are created by checkout with no
--     account at all, guest orders are kept exactly as they were, and nothing
--     here ever deletes, hides or rewrites one. customer_user_id is additive:
--     it records who an order turned out to belong to, and null is a perfectly
--     good answer forever.
--
--   · A mailing list is not an account. marketing_email_opt_in starts false
--     and is only ever set by somebody ticking the box on the newsletter form.
--     Creating My Marvell subscribes nobody to anything.
--
--   · An email address typed into a browser proves nothing. Orders are linked
--     to a person only by an address Supabase Auth has confirmed, read here
--     from auth.users inside a security-definer function — never from a
--     request body, and never from a claim the frontend makes.
--
--   · The browser holds no Supabase key. Everything below is reached by a
--     Netlify Function using the service role; the grants for anon and
--     authenticated are withdrawn, and the owner policies are defence in depth
--     for a future where that stops being true.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- customer_profiles — what My Marvell knows that auth.users does not
--
-- Deliberately no email column. auth.users owns the address and whether it is
-- confirmed; a second copy here would be a second answer to the same question,
-- and the wrong one would be the one used to open somebody's orders.
-- ---------------------------------------------------------------------------

create table if not exists customer_profiles (
  user_id                uuid primary key references auth.users (id) on delete cascade,

  -- The two things the sign-up page asks for, and the only two it needs: how
  -- to address somebody, and what to call them. A first name is not asked for
  -- because nothing here uses one.
  title                  text check (title is null or title in ('mr', 'mrs', 'mx')),
  full_name              text,

  phone                  text,

  -- Marketing consent. Not set by signing up, not set by placing an order:
  -- only by the newsletter form, which asks for it in those words.
  marketing_email_opt_in boolean not null default false,
  marketing_opted_in_at  timestamptz,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table customer_profiles is
  'My Marvell. One row per authenticated customer. Never required to place an order.';
comment on column customer_profiles.title is
  'How to address the customer: mr, mrs or mx. Chosen by them on the sign-up page, and never inferred.';
comment on column customer_profiles.marketing_email_opt_in is
  'Only ever true because somebody ticked the newsletter consent box. Account creation never sets it.';

-- For a database where an earlier version of this file has already run: title
-- arrived with the sign-up page, and create table if not exists would skip it.
alter table customer_profiles
  add column if not exists title text;
do $$ begin
  alter table customer_profiles
    add constraint customer_profiles_title_check
    check (title is null or title in ('mr', 'mrs', 'mx'));
exception when duplicate_object then null; end $$;

drop trigger if exists customer_profiles_set_updated_at on customer_profiles;
create trigger customer_profiles_set_updated_at
  before update on customer_profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- orders.customer_user_id — additive, nullable, never required
-- ---------------------------------------------------------------------------

alter table orders
  add column if not exists customer_user_id uuid references auth.users (id) on delete set null;

create index if not exists orders_customer_user_idx
  on orders (customer_user_id, created_at desc);

comment on column orders.customer_user_id is
  'Set only by claim_orders_for_user(), from an address Supabase Auth has confirmed. Null means a guest order, which stays a guest order.';

-- ---------------------------------------------------------------------------
-- claim_orders_for_user — the only way an order is ever attached to a person
--
-- Takes a user id and nothing else. The address it matches on is read from
-- auth.users inside this function, so a caller cannot ask for somebody else's
-- orders by passing somebody else's email. An unconfirmed address claims
-- nothing: until Supabase has seen proof the person reads that mailbox,
-- matching text is just matching text.
-- ---------------------------------------------------------------------------

create or replace function claim_orders_for_user(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email     text;
  v_confirmed timestamptz;
  v_claimed   integer;
begin
  if p_user_id is null then
    return 0;
  end if;

  select u.email, u.email_confirmed_at
    into v_email, v_confirmed
    from auth.users u
   where u.id = p_user_id;

  if v_email is null or v_confirmed is null then
    return 0;
  end if;

  update orders
     set customer_user_id = p_user_id
   where customer_user_id is null
     and lower(btrim(email)) = lower(btrim(v_email));

  get diagnostics v_claimed = row_count;
  return v_claimed;
end;
$$;

comment on function claim_orders_for_user(uuid) is
  'Attaches historical guest orders to a person whose email Supabase Auth has confirmed. Reads the address from auth.users, never from the caller.';

-- PUBLIC first, because EXECUTE on a new function is granted to it by default
-- and anon holds PUBLIC implicitly. Then the one role that genuinely calls
-- this: the Netlify functions, through the service key. The grant is explicit
-- rather than left to Supabase's default privileges, so that this file states
-- who may attach orders to a person instead of inheriting it.
revoke all   on function claim_orders_for_user(uuid) from public, anon, authenticated;
grant execute on function claim_orders_for_user(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Row level security
--
-- Same posture as migration 0002: anon and authenticated hold no grants, so
-- the policies below cannot currently fire. They are written anyway, and kept
-- correct, so that the day a user-scoped key does reach a client the rule is
-- already there and says "your own row, and nothing else".
-- ---------------------------------------------------------------------------

alter table customer_profiles enable row level security;
revoke all on customer_profiles from anon, authenticated;

drop policy if exists customer_profiles_owner_read on customer_profiles;
create policy customer_profiles_owner_read
  on customer_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists customer_profiles_owner_update on customer_profiles;
create policy customer_profiles_owner_update
  on customer_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists orders_owner_read on orders;
create policy orders_owner_read
  on orders
  for select
  to authenticated
  using (customer_user_id is not null and customer_user_id = auth.uid());

drop policy if exists order_items_owner_read on order_items;
create policy order_items_owner_read
  on order_items
  for select
  to authenticated
  using (
    exists (
      select 1
        from orders o
       where o.id = order_items.order_id
         and o.customer_user_id is not null
         and o.customer_user_id = auth.uid()
    )
  );
