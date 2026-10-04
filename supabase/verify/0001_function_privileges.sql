-- ===========================================================================
-- Marvell Florist — verification, not a migration
--
-- Run this in the Supabase SQL editor AFTER 0001…0007. It changes nothing.
-- It answers one question: can an untrusted role reach a security-definer
-- function that moves stock, settles payments or answers whether an address
-- has an account.
--
-- WHY THIS EXISTS
-- PostgreSQL grants EXECUTE on every new function to PUBLIC, and every role
-- holds PUBLIC implicitly. A migration that revokes only from anon and
-- authenticated therefore looks correct and changes nothing. This file is the
-- check that the revoke actually took, because reading the migration cannot
-- tell you.
--
-- has_function_privilege() is the right instrument precisely because it
-- resolves PUBLIC and role membership the same way the planner does, so it
-- reports what anon can actually do rather than what was written.
--
-- Two parts:
--   PART 1  a table to read
--   PART 2  an assertion that raises if anything is wrong
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- PART 1 — the report
--
-- Expected for every row: anon false, authenticated false, service_role true,
-- except generate_order_number, which no role may call. It is not security
-- definer and its only caller is create_order_with_reservations, which is, so
-- it runs as the owner and needs no grant of its own.
-- ---------------------------------------------------------------------------

with protected(signature, service_role_should_execute) as (
  values
    ('public.create_order_with_reservations(jsonb, jsonb, integer, integer, integer)', true),
    ('public.commit_order_payment(text, payment_status, text)',                        true),
    ('public.release_order_reservations(text, order_status, payment_status)',          true),
    ('public.expire_stale_reservations()',                                             true),
    ('public.generate_order_number()',                                                 false),
    ('public.advance_production_status(text, production_status)',                      true),
    ('public.claim_orders_for_user(uuid)',                                             true),
    ('public.my_marvell_account(text)',                                                true)
)
select
  p.signature,
  has_function_privilege('anon',          p.signature, 'execute') as anon_execute,
  has_function_privilege('authenticated', p.signature, 'execute') as authenticated_execute,
  has_function_privilege('service_role',  p.signature, 'execute') as service_role_execute,
  p.service_role_should_execute                                   as service_role_expected,
  -- PUBLIC's own grant, read straight off the ACL. A null proacl means the
  -- function still carries PostgreSQL's default, which includes PUBLIC, so
  -- null is the dangerous answer and not the safe one.
  case
    when pr.proacl is null then true
    else exists (select 1 from unnest(pr.proacl) a where a::text like '=%')
  end                                                             as public_execute,
  case
    when has_function_privilege('anon', p.signature, 'execute')
      or has_function_privilege('authenticated', p.signature, 'execute')
      then 'FAIL: reachable by an untrusted role'
    when has_function_privilege('service_role', p.signature, 'execute')
         <> p.service_role_should_execute
      then 'FAIL: service_role grant does not match intent'
    else 'ok'
  end                                                             as verdict
from protected p
join pg_proc pr on pr.oid = p.signature::regprocedure
order by verdict desc, p.signature;

-- ---------------------------------------------------------------------------
-- PART 2 — the assertion
--
-- Raises, naming every function that is wrong. Silence is a pass. Run this
-- one whenever the migrations are re-applied; the table above is for reading,
-- this is for being sure.
-- ---------------------------------------------------------------------------

do $$
declare
  v_bad text;
begin
  with protected(signature, service_role_should_execute) as (
    values
      ('public.create_order_with_reservations(jsonb, jsonb, integer, integer, integer)', true),
      ('public.commit_order_payment(text, payment_status, text)',                        true),
      ('public.release_order_reservations(text, order_status, payment_status)',          true),
      ('public.expire_stale_reservations()',                                             true),
      ('public.generate_order_number()',                                                 false),
      ('public.advance_production_status(text, production_status)',                      true),
      ('public.claim_orders_for_user(uuid)',                                             true),
      ('public.my_marvell_account(text)',                                                true)
  )
  select string_agg(
           format('%s (anon=%s authenticated=%s service_role=%s expected service_role=%s)',
                  p.signature,
                  has_function_privilege('anon',          p.signature, 'execute'),
                  has_function_privilege('authenticated', p.signature, 'execute'),
                  has_function_privilege('service_role',  p.signature, 'execute'),
                  p.service_role_should_execute),
           E'\n  ')
    into v_bad
    from protected p
   where has_function_privilege('anon',          p.signature, 'execute')
      or has_function_privilege('authenticated', p.signature, 'execute')
      or has_function_privilege('service_role',  p.signature, 'execute')
         <> p.service_role_should_execute;

  if v_bad is not null then
    raise exception E'function privileges are wrong:\n  %', v_bad;
  end if;

  raise notice 'function privileges: all 8 correct. anon and authenticated cannot execute any of them.';
end $$;

-- ---------------------------------------------------------------------------
-- PART 3 — the staff views, which are a different rule
--
-- A view is NOT granted to PUBLIC by default; PostgreSQL gives a new table or
-- view to its owner alone, and it is Supabase's default privileges that hand
-- it to anon, authenticated and service_role by name. So revoking the named
-- grants is sufficient for these and no PUBLIC revoke is needed. Checked all
-- the same, because "sufficient in theory" is what the function block also
-- looked like.
--
-- public_product_availability is deliberately absent: it is the catalogue,
-- anon is meant to read it, and 0002 grants that on purpose.
-- ---------------------------------------------------------------------------

do $$
declare
  v_bad text;
begin
  select string_agg(format('%s (anon=%s authenticated=%s)', v,
                           has_table_privilege('anon', v, 'select'),
                           has_table_privilege('authenticated', v, 'select')), E'\n  ')
    into v_bad
    from unnest(array['public.staff_production_queue',
                      'public.staff_today',
                      'public.staff_stock_overview',
                      'public.customer_profiles',
                      'public.orders',
                      'public.order_items',
                      'public.inventory_reservations',
                      'public.newsletter_events']) as v
   where has_table_privilege('anon', v, 'select')
      or has_table_privilege('authenticated', v, 'select');

  if v_bad is not null then
    raise exception E'tables or views readable by an untrusted role:\n  %', v_bad;
  end if;

  raise notice 'staff views and private tables: not readable by anon or authenticated.';
end $$;
