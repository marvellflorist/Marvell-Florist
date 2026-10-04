-- Apply once to the already-migrated database; do not rerun migrations 0001-0007.
revoke execute on function public.generate_order_number() from service_role;
