-- Read-only preflight. Run in the Supabase SQL editor before applying 0010.
-- This deliberately reads catalog metadata rather than trusting a local file.
with checks as (
  select
    to_regclass('public.wishlist_lists') is not null as wishlist_lists_present,
    to_regclass('public.wishlist_items') is not null as wishlist_items_present,
    exists (select 1 from information_schema.columns where table_schema = 'public'
      and table_name = 'customer_profiles' and column_name = 'personal_recommendations_opt_in')
      as wishlist_preferences_present,
    exists (select 1 from pg_constraint where conrelid = 'public.products_commerce'::regclass
      and conname = 'products_commerce_price_round_thousands') as price_constraint_present,
    not exists (select 1 from public.products_commerce where price_idr % 1000 <> 0)
      as prices_are_rounded
)
select *,
  case when wishlist_lists_present and wishlist_items_present and wishlist_preferences_present
    then '0008 appears present' else 'Review/apply 0008 before 0010' end as migration_0008,
  case when price_constraint_present and prices_are_rounded
    then '0009 appears present' else 'Review/apply 0009 before 0010' end as migration_0009
from checks;

-- RLS is part of 0008, not just the table names.
select c.relname, c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', c.oid, 'select') as anon_can_select
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('wishlist_lists', 'wishlist_items')
order by c.relname;
