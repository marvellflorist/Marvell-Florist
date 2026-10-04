-- Durable paid-order alerts. The trigger runs in the payment transaction;
-- email delivery runs after commit and is retried independently.
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_key text not null unique,
  event_type text not null,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id),
  escalated_at timestamptz
);
create index if not exists admin_notifications_open_idx
  on public.admin_notifications(created_at desc) where acknowledged_at is null;

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.admin_notifications(id) on delete cascade,
  event_key text not null unique,
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_kind text not null default 'staff' check (recipient_kind in ('staff','customer')),
  channel text not null check (channel = 'email'),
  state text not null default 'pending'
    check (state in ('pending','sending','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  sent_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now()
);
create index if not exists notification_outbox_due_idx
  on public.notification_outbox(next_attempt_at, created_at)
  where state in ('pending','failed','sending');

create table if not exists public.notification_attempts (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.notification_outbox(id) on delete cascade,
  attempt_number integer not null,
  result text not null check (result in ('accepted','failed')),
  error_code text,
  created_at timestamptz not null default now(),
  unique(outbox_id, attempt_number)
);

create table if not exists public.notification_settings (
  id boolean primary key default true check (id),
  timezone text not null default 'Asia/Jakarta',
  opening_time time not null default '09:00',
  closing_time time not null default '18:00',
  weekdays integer[] not null default '{1,2,3,4,5,6}',
  acknowledge_after_work_minutes integer not null default 30
    check (acknowledge_after_work_minutes between 1 and 1440),
  reconcile_from timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closing_time > opening_time)
);
insert into public.notification_settings(id) values (true) on conflict (id) do nothing;

alter table public.admin_notifications enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.notification_attempts enable row level security;
alter table public.notification_settings enable row level security;
revoke all on public.admin_notifications, public.notification_outbox,
  public.notification_attempts, public.notification_settings
  from public, anon, authenticated;

create or replace function public.enqueue_paid_order_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_notification_id uuid; v_staff record; v_count integer := 0;
begin
  if new.status <> 'paid' or old.status = 'paid' then return new; end if;
  insert into public.admin_notifications(order_id, event_key, event_type)
  values (new.id, 'paid:' || new.id::text,
    case when new.stock_exception then 'paid_stock_exception' else 'paid_order' end)
  on conflict (event_key) do update set event_key = excluded.event_key
  returning id into v_notification_id;

  for v_staff in select user_id from public.staff_members
    where active and notify_paid_orders and role in ('owner','store_admin')
  loop
    insert into public.notification_outbox(notification_id, event_key, recipient_user_id, channel)
    values (v_notification_id, 'paid:' || new.id::text || ':email:' || v_staff.user_id::text,
      v_staff.user_id, 'email')
    on conflict (event_key) do nothing;
    v_count := v_count + 1;
  end loop;
  if v_count = 0 then
    -- A missing recipient is visible in the outbox, never a silent omission.
    insert into public.notification_outbox(notification_id, event_key, channel)
    values (v_notification_id, 'paid:' || new.id::text || ':email:unconfigured', 'email')
    on conflict (event_key) do nothing;
  end if;
  insert into public.notification_outbox(notification_id, event_key, recipient_kind, channel)
    values (v_notification_id, 'paid:' || new.id::text || ':email:customer', 'customer', 'email')
    on conflict (event_key) do nothing;
  return new;
end;
$$;
revoke all on function public.enqueue_paid_order_notification() from public, anon, authenticated, service_role;
drop trigger if exists orders_paid_notification on public.orders;
create trigger orders_paid_notification after update of status on public.orders
  for each row when (new.status = 'paid' and old.status is distinct from new.status)
  execute function public.enqueue_paid_order_notification();

-- Claim due rows atomically. A crashed worker's lease becomes eligible again.
create or replace function public.claim_notification_outbox(
  p_order_id uuid default null, p_limit integer default 10
) returns setof public.notification_outbox language plpgsql security definer
set search_path = public as $$
begin
  return query
  with claimed as (
    select b.id from public.notification_outbox b
    join public.admin_notifications n on n.id = b.notification_id
    where (p_order_id is null or n.order_id = p_order_id)
      and b.next_attempt_at <= now()
      and (b.state in ('pending','failed')
        or (b.state = 'sending' and b.lease_until < now()))
      and b.attempts < 8
    order by b.created_at
    for update of b skip locked limit greatest(1, least(p_limit, 25))
  )
  update public.notification_outbox b
    set state = 'sending', lease_until = now() + interval '5 minutes',
        attempts = b.attempts + 1
  from claimed where b.id = claimed.id returning b.*;
end;
$$;
revoke all on function public.claim_notification_outbox(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_notification_outbox(uuid, integer) to service_role;

-- Recover a paid order whose notification rows were missing due to an older
-- deployment or a transient operational fault. Idempotent event keys keep
-- retries from creating duplicate alerts.
create or replace function public.reconcile_paid_order_notifications(p_days integer default 30)
returns integer language plpgsql security definer set search_path = public as $$
declare v_order record; v_notification_id uuid; v_staff record; v_staff_count integer;
  v_count integer := 0;
begin
  for v_order in select id, stock_exception from public.orders
      where status = 'paid' and paid_at >= (select reconcile_from from public.notification_settings where id = true)
        and paid_at >= now() - make_interval(days => greatest(1, least(p_days, 90)))
        and not exists (select 1 from public.admin_notifications n
          where n.event_key = 'paid:' || orders.id::text)
      order by paid_at limit 500
  loop
    insert into public.admin_notifications(order_id, event_key, event_type)
      values (v_order.id, 'paid:' || v_order.id::text,
        case when v_order.stock_exception then 'paid_stock_exception' else 'paid_order' end)
      on conflict (event_key) do update set event_key = excluded.event_key
      returning id into v_notification_id;
    v_staff_count := 0;
    for v_staff in select user_id from public.staff_members
      where active and notify_paid_orders and role in ('owner','store_admin')
    loop
      insert into public.notification_outbox(notification_id, event_key, recipient_user_id, channel)
        values (v_notification_id, 'paid:' || v_order.id::text || ':email:' || v_staff.user_id::text,
          v_staff.user_id, 'email') on conflict (event_key) do nothing;
      v_staff_count := v_staff_count + 1;
    end loop;
    if v_staff_count = 0 then
      insert into public.notification_outbox(notification_id, event_key, channel)
        values (v_notification_id, 'paid:' || v_order.id::text || ':email:unconfigured', 'email')
        on conflict (event_key) do nothing;
    end if;
    insert into public.notification_outbox(notification_id, event_key, recipient_kind, channel)
      values (v_notification_id, 'paid:' || v_order.id::text || ':email:customer', 'customer', 'email')
      on conflict (event_key) do nothing;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.reconcile_paid_order_notifications(integer)
  from public, anon, authenticated;
grant execute on function public.reconcile_paid_order_notifications(integer) to service_role;

-- Called by the scheduled reconciler. Each elapsed minute counts only within
-- configured working hours in the configured timezone.
create or replace function public.work_minutes_between(p_start timestamptz, p_end timestamptz)
returns integer language sql stable security definer set search_path = public as $$
  with settings as (select * from public.notification_settings where id = true),
  days as (
    select d::date local_day, s.* from settings s,
      generate_series((p_start at time zone s.timezone)::date,
        (p_end at time zone s.timezone)::date, interval '1 day') d
  )
  select coalesce(sum(greatest(0, extract(epoch from
    least(p_end, (local_day + closing_time) at time zone timezone) -
    greatest(p_start, (local_day + opening_time) at time zone timezone)) / 60)), 0)::integer
  from days where extract(isodow from local_day)::integer = any(weekdays);
$$;
revoke all on function public.work_minutes_between(timestamptz, timestamptz)
  from public, anon, authenticated, service_role;

create or replace function public.enqueue_notification_escalations()
returns integer language plpgsql security definer set search_path = public as $$
declare v_notification record; v_owner record; v_count integer := 0; v_recipients integer;
begin
  for v_notification in
    select n.* from public.admin_notifications n
      cross join public.notification_settings s
      where n.acknowledged_at is null and n.escalated_at is null
        and public.work_minutes_between(n.created_at, now()) >= s.acknowledge_after_work_minutes
      for update of n skip locked
  loop
    update public.admin_notifications set escalated_at = now()
      where id = v_notification.id;
    v_recipients := 0;
    for v_owner in select user_id from public.staff_members
      where active and role = 'owner' and notify_paid_orders
    loop
      insert into public.notification_outbox(notification_id, event_key, recipient_user_id, channel)
      values (v_notification.id,
        'escalate:' || v_notification.id::text || ':email:' || v_owner.user_id::text,
        v_owner.user_id, 'email') on conflict (event_key) do nothing;
      v_recipients := v_recipients + 1;
    end loop;
    if v_recipients = 0 then
      insert into public.notification_outbox(notification_id, event_key, channel)
      values (v_notification.id, 'escalate:' || v_notification.id::text || ':email:unconfigured', 'email')
      on conflict (event_key) do nothing;
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.enqueue_notification_escalations()
  from public, anon, authenticated;
grant execute on function public.enqueue_notification_escalations() to service_role;
