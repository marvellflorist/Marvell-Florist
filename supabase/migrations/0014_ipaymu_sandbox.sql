-- iPaymu v2 sandbox payment sessions. Production remains disabled until the
-- payment backend has approved static outbound infrastructure.

alter table public.orders
  add column if not exists payment_session_id text;

create unique index if not exists orders_payment_session_id_key
  on public.orders(payment_session_id)
  where payment_session_id is not null;

alter table public.orders alter column payment_provider set default 'ipaymu';

comment on column public.orders.payment_session_id is
  'iPaymu redirect-payment SessionID. Not a credential; used to bind callbacks to the checkout session.';

-- `midtrans_order_id` may exist on databases that applied migration 0010 before
-- the provider switch. It is retained as an unused compatibility column so this
-- migration cannot invalidate existing RPC bodies or historical rows.
