-- Read-only operational verification after manually applying 0010-0012.
-- Returns counts only; investigate nonzero anomalies before enabling checkout.

select
  count(*) filter (where status = 'paid' and stock_exception and needs_attention)
    as paid_stock_exceptions_waiting_for_staff,
  count(*) filter (where status = 'paid' and needs_attention and not stock_exception)
    as other_paid_attention,
  count(*) filter (where status = 'paid' and stock_exception and not needs_attention)
    as inconsistent_stock_exception_flags,
  count(*) filter (where status = 'paid' and fulfillment_state <> 'new' and needs_attention)
    as attention_orders_that_advanced
from public.orders;

select count(*) as paid_orders_missing_alert
from public.orders o
cross join public.notification_settings s
where o.status = 'paid' and o.paid_at >= s.reconcile_from
  and not exists (select 1 from public.admin_notifications n
    where n.event_key = 'paid:' || o.id::text);

select count(*) as paid_orders_with_unreviewed_released_stock
from public.orders o
where o.status = 'paid' and not o.needs_attention
  and exists (select 1 from public.inventory_reservations r
    where r.order_id = o.id and r.status = 'released')
  and not exists (select 1 from public.inventory_reservations r
    where r.order_id = o.id and r.status = 'committed')
  and not exists (select 1 from public.audit_events a
    where a.object_id = o.id and a.action = 'order.attention_resolved'
      and a.after_state->>'stock_allocated' = 'true');

select count(*) as confirmed_cards_without_print_timestamp
from public.card_print_events e
join public.orders o on o.id = e.order_id
where e.event_type in ('print_confirmed','reprint_confirmed')
  and o.card_printed_at is null;

select state, recipient_kind, count(*) as messages
from public.notification_outbox
group by state, recipient_kind order by state, recipient_kind;

select count(*) as notifications_exhausted_retries
from public.notification_outbox where state = 'failed' and attempts >= 8;
