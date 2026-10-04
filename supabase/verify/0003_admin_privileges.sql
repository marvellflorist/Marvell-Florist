-- Read-only verification after 0010-0013. Raises on unsafe effective grants.
--
-- Admin mutation RPCs are user-context functions: authenticated must execute
-- them so auth.uid()/auth.jwt() identify the staff actor, while service_role
-- must not. A true anon result also catches an EXECUTE grant inherited through
-- PUBLIC. postgres is intentionally not asserted: the owner/superuser retains
-- effective access regardless of an ACL revoke.
do $$
declare v_bad text;
begin
  with expected(signature, auth_exec, service_exec) as (values
    ('public.generate_order_number()', false, false),
    ('public.create_order_with_reservations(jsonb,jsonb,integer,integer,integer)', false, true),
    ('public.commit_order_payment(text,public.payment_status,text)', false, true),
    ('public.release_order_reservations(text,public.order_status,public.payment_status)', false, true),
    ('public.expire_stale_reservations()', false, true),
    ('public.advance_production_status(text,public.production_status)', false, false),
    ('public.staff_account_by_email(text)', false, true),
    ('public.admin_transition_order(uuid,text,text,text)', true, false),
    ('public.admin_card_action(uuid,text,uuid)', true, false),
    ('public.admin_resolve_attention(uuid,text)', true, false),
    ('public.admin_assign_delivery(uuid,uuid)', true, false),
    ('public.admin_change_delivery(uuid,date,text)', true, false),
    ('public.admin_set_stock(text,integer)', true, false),
    ('public.admin_update_staff(uuid,text,boolean,boolean,boolean)', true, false),
    ('public.admin_add_staff(uuid,text,text)', true, false),
    ('public.enqueue_paid_order_notification()', false, false),
    ('public.claim_notification_outbox(uuid,integer)', false, true),
    ('public.reconcile_paid_order_notifications(integer)', false, true),
    ('public.work_minutes_between(timestamptz,timestamptz)', false, false),
    ('public.enqueue_notification_escalations()', false, true)
  )
  select string_agg(format(
    '%s [anon=%s, authenticated=%s (expected %s), service_role=%s (expected %s)]',
    e.signature, actual.anon_exec, actual.auth_exec, e.auth_exec,
    actual.service_exec, e.service_exec), E'\n')
  into v_bad
  from expected e
  cross join lateral (select
    has_function_privilege('anon', e.signature, 'execute') as anon_exec,
    has_function_privilege('authenticated', e.signature, 'execute') as auth_exec,
    has_function_privilege('service_role', e.signature, 'execute') as service_exec
  ) actual
  where actual.anon_exec
     or actual.auth_exec <> e.auth_exec
     or actual.service_exec <> e.service_exec;
  if v_bad is not null then raise exception 'Admin function grant mismatch: %', v_bad; end if;

  -- ACLs alone are insufficient for SECURITY DEFINER user-context RPCs. Check
  -- the installed definitions still bind the JWT actor, require active staff,
  -- enforce AAL2, and contain the action-specific permission guard.
  with expected_guard(signature, permission_marker) as (values
    ('public.admin_transition_order(uuid,text,text,text)', 'v_role in (''owner'',''store_admin'')'),
    ('public.admin_card_action(uuid,text,uuid)', 'v_role not in (''owner'',''store_admin'',''florist'')'),
    ('public.admin_resolve_attention(uuid,text)', 'v_role not in (''owner'',''store_admin'')'),
    ('public.admin_assign_delivery(uuid,uuid)', 'v_role not in (''owner'',''store_admin'')'),
    ('public.admin_change_delivery(uuid,date,text)', 'v_role not in (''owner'',''store_admin'')'),
    ('public.admin_set_stock(text,integer)', 'v_staff.can_manage_stock'),
    ('public.admin_update_staff(uuid,text,boolean,boolean,boolean)', 'role = ''owner'''),
    ('public.admin_add_staff(uuid,text,text)', 'role = ''owner''')
  ), definitions as (
    select signature, permission_marker,
      pg_get_functiondef(signature::regprocedure) as definition
    from expected_guard
  )
  select string_agg(signature, E'\n') into v_bad
  from definitions
  where position('auth.uid()' in definition) = 0
     or position('staff_members' in definition) = 0
     or position('active' in definition) = 0
     or position('auth.jwt()->>''aal''' in definition) = 0
     or position('''aal2''' in definition) = 0
     or position(permission_marker in definition) = 0;
  if v_bad is not null then
    raise exception 'Admin function authorization guard mismatch: %', v_bad;
  end if;

  select string_agg(c.relname, ', ') into v_bad
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any(array[
       'staff_members','order_status_events','card_print_events','audit_events',
       'guest_receipt_tokens','admin_notifications','notification_outbox',
       'notification_attempts','notification_settings','browser_consent_receipts',
       'marketing_sessions','marketing_events','order_attribution'])
     and (not c.relrowsecurity
       or has_table_privilege('anon', c.oid, 'select')
       or has_table_privilege('authenticated', c.oid, 'select'));
  if v_bad is not null then raise exception 'Admin table grant/RLS mismatch: %', v_bad; end if;
  raise notice 'Marvell Admin function grants and private tables verified.';
end $$;

-- Operational facts for human review (no data-changing statements):
select count(*) filter (where status = 'paid' and stock_exception) as paid_stock_exceptions,
       count(*) filter (where status = 'paid' and needs_attention) as paid_needing_attention,
       count(*) filter (where status = 'paid' and acknowledged_at is null) as paid_unacknowledged
from public.orders;
select state, count(*) from public.notification_outbox group by state order by state;
