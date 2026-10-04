-- My Marvell preferences and private wishlists.
-- Apply separately after reviewing this proposal. Never run migrations 0001-0007 again.

alter table public.customer_profiles
  add column if not exists personal_recommendations_opt_in boolean not null default false,
  add column if not exists occasion_reminders_opt_in boolean not null default false,
  add column if not exists personal_service_opt_in boolean not null default false;

-- Newsletter consent already has two columns: pending_marketing_opt_in before
-- address verification and marketing_email_opt_in after Brevo accepts it.

create table if not exists public.wishlist_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.customer_profiles(user_id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  is_default boolean not null default false,
  shared_with_marvell boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists wishlist_lists_one_default_per_user
  on public.wishlist_lists(user_id) where is_default;
create index if not exists wishlist_lists_user_id_idx
  on public.wishlist_lists(user_id, created_at);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.wishlist_lists(id) on delete cascade,
  item_key text not null check (char_length(item_key) between 1 and 512),
  item_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(item_data) = 'object'),
  created_at timestamptz not null default now(),
  unique (list_id, item_key)
);

create index if not exists wishlist_items_list_id_idx
  on public.wishlist_items(list_id, created_at desc);

drop trigger if exists wishlist_lists_set_updated_at on public.wishlist_lists;
create trigger wishlist_lists_set_updated_at
  before update on public.wishlist_lists
  for each row execute function public.set_updated_at();

alter table public.wishlist_lists enable row level security;
alter table public.wishlist_items enable row level security;
revoke all on public.wishlist_lists, public.wishlist_items from public, anon, authenticated;
grant select, insert, update, delete on public.wishlist_lists, public.wishlist_items to authenticated;

-- A customer can read only their own lists. Direct clients can create and
-- change custom lists; the default is created and protected by the server.
drop policy if exists wishlist_lists_owner_select on public.wishlist_lists;
create policy wishlist_lists_owner_select on public.wishlist_lists
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists wishlist_lists_owner_insert on public.wishlist_lists;
create policy wishlist_lists_owner_insert on public.wishlist_lists
  for insert to authenticated
  with check (user_id = (select auth.uid()) and not is_default);
drop policy if exists wishlist_lists_owner_update on public.wishlist_lists;
create policy wishlist_lists_owner_update on public.wishlist_lists
  for update to authenticated
  using (user_id = (select auth.uid()) and not is_default)
  with check (user_id = (select auth.uid()) and not is_default);
drop policy if exists wishlist_lists_owner_delete on public.wishlist_lists;
create policy wishlist_lists_owner_delete on public.wishlist_lists
  for delete to authenticated
  using (user_id = (select auth.uid()) and not is_default);

-- Item access follows list ownership. The share flag never appears here:
-- it does not grant anonymous or other customer access.
drop policy if exists wishlist_items_owner_select on public.wishlist_items;
create policy wishlist_items_owner_select on public.wishlist_items
  for select to authenticated
  using (exists (select 1 from public.wishlist_lists l
                where l.id = list_id and l.user_id = (select auth.uid())));
drop policy if exists wishlist_items_owner_insert on public.wishlist_items;
create policy wishlist_items_owner_insert on public.wishlist_items
  for insert to authenticated
  with check (exists (select 1 from public.wishlist_lists l
                     where l.id = list_id and l.user_id = (select auth.uid())));
drop policy if exists wishlist_items_owner_update on public.wishlist_items;
create policy wishlist_items_owner_update on public.wishlist_items
  for update to authenticated
  using (exists (select 1 from public.wishlist_lists l
                where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.wishlist_lists l
                     where l.id = list_id and l.user_id = (select auth.uid())));
drop policy if exists wishlist_items_owner_delete on public.wishlist_items;
create policy wishlist_items_owner_delete on public.wishlist_items
  for delete to authenticated
  using (exists (select 1 from public.wishlist_lists l
                where l.id = list_id and l.user_id = (select auth.uid())));

-- No staff grant yet. Staff authentication is not part of the current account
-- system, so shared_with_marvell remains a private preference until a staff
-- endpoint can verify an authorized Marvell identity before reading it.
