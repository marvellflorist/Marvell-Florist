-- Correct the Admin user-context RPC boundary after 0010.
--
-- These functions are deliberately invoked with the verified staff user's
-- JWT so auth.uid() identifies the actor and each function can enforce its
-- own staff role in the same transaction as the mutation. They are not
-- service-role RPCs. Every entry point also requires an AAL2 JWT so a direct
-- Supabase call cannot bypass the Admin application's MFA gate.

begin;

-- Function bodies are repeated deliberately. CREATE OR REPLACE preserves the
-- signatures while adding the database-side AAL2 checks to installations
-- where 0010 has already run.

create or replace function public.admin_transition_order(
  p_order_id uuid, p_action text, p_expected_state text default null,
  p_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_order public.orders%rowtype;
  v_next text;
begin
  select role into v_role from public.staff_members
    where user_id = v_actor and active;
  if v_role is null or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'paid' then raise exception 'ORDER_NOT_PAID'; end if;
  if p_expected_state is not null and v_order.fulfillment_state <> p_expected_state then
    raise exception 'STATE_CHANGED';
  end if;

  if p_action = 'acknowledge' and v_order.fulfillment_state = 'new'
      and v_role in ('owner','store_admin') then
    v_next := 'acknowledged';
  elsif p_action = 'start_preparing' and v_order.fulfillment_state = 'acknowledged'
      and v_role in ('owner','store_admin','florist') then
    v_next := 'preparing';
  elsif p_action = 'mark_ready' and v_order.fulfillment_state = 'preparing'
      and v_role in ('owner','store_admin','florist') then
    v_next := 'ready';
  elsif p_action = 'start_delivery' and v_order.fulfillment_state = 'ready'
      and v_order.delivery_method = 'delivery'
      and (v_role in ('owner','store_admin') or
        (v_role = 'delivery' and v_order.delivery_assignee = v_actor)) then
    v_next := 'out_for_delivery';
  elsif p_action = 'complete' and
      ((v_order.fulfillment_state = 'out_for_delivery' and
        (v_role in ('owner','store_admin') or
         (v_role = 'delivery' and v_order.delivery_assignee = v_actor)))
       or (v_order.fulfillment_state = 'ready' and
         v_order.delivery_method = 'pickup' and v_role in ('owner','store_admin'))) then
    v_next := 'delivered';
  else
    raise exception 'INVALID_TRANSITION';
  end if;
  if v_order.needs_attention then raise exception 'ORDER_NEEDS_ATTENTION'; end if;

  update public.orders set fulfillment_state = v_next,
    production_status = case v_next
      when 'preparing' then 'making'::production_status
      when 'ready' then 'ready'::production_status
      when 'out_for_delivery' then 'ready'::production_status
      when 'delivered' then 'completed'::production_status
      else 'new'::production_status end,
    acknowledged_at = case when v_next = 'acknowledged' then now() else acknowledged_at end,
    acknowledged_by = case when v_next = 'acknowledged' then v_actor else acknowledged_by end
  where id = p_order_id;
  insert into public.order_status_events(order_id, actor_user_id, event_type, from_state, to_state, note)
    values (p_order_id, v_actor, p_action, v_order.fulfillment_state, v_next,
      left(nullif(btrim(p_note), ''), 500));
  insert into public.audit_events(actor_user_id, action, object_type, object_id, before_state, after_state)
    values (v_actor, 'order.' || p_action, 'order', p_order_id,
      jsonb_build_object('fulfillment_state', v_order.fulfillment_state),
      jsonb_build_object('fulfillment_state', v_next));
  if v_next = 'acknowledged' then
    update public.admin_notifications set acknowledged_at = now(), acknowledged_by = v_actor
      where order_id = p_order_id and acknowledged_at is null;
  end if;
  return jsonb_build_object('changed', true, 'fulfillment_state', v_next);
end;
$$;
revoke all on function public.admin_transition_order(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_transition_order(uuid, text, text, text) to authenticated;

create or replace function public.admin_card_action(
  p_order_id uuid, p_action text, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_role text; v_order public.orders%rowtype;
  v_event text; v_inserted uuid;
begin
  select role into v_role from public.staff_members
    where user_id = v_actor and active;
  if v_role is null or v_role not in ('owner','store_admin','florist')
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'paid' or v_order.needs_attention
      or nullif(btrim(v_order.card_message), '') is null then
    raise exception 'CARD_UNAVAILABLE';
  end if;
  if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
  if p_action = 'request' then
    v_event := case when v_order.card_printed_at is null then 'print_requested' else 'reprint_requested' end;
  elsif p_action = 'confirm' then
    v_event := case when v_order.card_printed_at is null then 'print_confirmed' else 'reprint_confirmed' end;
    if not exists (select 1 from public.card_print_events e
      where e.order_id = p_order_id and e.actor_user_id = v_actor
        and e.event_type = case when v_order.card_printed_at is null
          then 'print_requested' else 'reprint_requested' end
        and e.created_at > coalesce(v_order.card_printed_at, '-infinity'::timestamptz)) then
      raise exception 'PRINT_NOT_REQUESTED';
    end if;
  else raise exception 'INVALID_CARD_ACTION'; end if;

  insert into public.card_print_events(order_id, actor_user_id, event_type, request_id)
    values (p_order_id, v_actor, v_event, p_request_id)
    on conflict (request_id) do nothing returning id into v_inserted;
  if v_inserted is null then return jsonb_build_object('changed', false); end if;
  if p_action = 'confirm' then
    update public.orders set card_printed_at = now(), card_printed_by = v_actor,
      card_reprint_count = card_reprint_count + case when v_order.card_printed_at is null then 0 else 1 end
      where id = p_order_id;
  end if;
  insert into public.audit_events(actor_user_id, action, object_type, object_id)
    values (v_actor, 'card.' || v_event, 'order', p_order_id);
  return jsonb_build_object('changed', true, 'event', v_event);
end;
$$;
revoke all on function public.admin_card_action(uuid, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_card_action(uuid, text, uuid) to authenticated;

create or replace function public.admin_resolve_attention(p_order_id uuid, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_role text; v_order public.orders%rowtype;
  v_item record; v_product public.products_commerce%rowtype;
begin
  select role into v_role from public.staff_members where user_id = v_actor and active;
  if v_role is null or v_role not in ('owner','store_admin')
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  if char_length(btrim(coalesce(p_note,''))) < 10 then raise exception 'RESOLUTION_NOTE_REQUIRED'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if not v_order.needs_attention then return jsonb_build_object('changed', false); end if;
  if v_order.status <> 'paid' then raise exception 'ORDER_NOT_PAID'; end if;
  if v_order.stock_exception then
    for v_item in select sku, sum(quantity)::integer qty
        from public.order_items where order_id = p_order_id group by sku order by sku
    loop
      select * into v_product from public.products_commerce
        where sku = v_item.sku for update;
      if not found or v_product.stock_quantity - v_product.reserved_quantity < v_item.qty then
        raise exception 'STOCK_UNAVAILABLE';
      end if;
      update public.products_commerce set stock_quantity = stock_quantity - v_item.qty
        where sku = v_item.sku;
    end loop;
  end if;
  update public.orders set needs_attention = false, stock_exception = false,
    attention_reason = null where id = p_order_id;
  insert into public.order_status_events(order_id, actor_user_id, event_type, note)
    values (p_order_id, v_actor, 'attention_resolved', left(btrim(p_note), 500));
  insert into public.audit_events(actor_user_id, action, object_type, object_id,
    before_state, after_state)
    values (v_actor, 'order.attention_resolved', 'order', p_order_id,
      jsonb_build_object('needs_attention', true, 'reason', v_order.attention_reason),
      jsonb_build_object('needs_attention', false, 'stock_allocated', v_order.stock_exception,
        'note', left(btrim(p_note), 500)));
  return jsonb_build_object('changed', true);
end;
$$;
revoke all on function public.admin_resolve_attention(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_resolve_attention(uuid, text) to authenticated;

create or replace function public.admin_assign_delivery(p_order_id uuid, p_assignee uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_role text; v_before uuid;
begin
  select role into v_role from public.staff_members where user_id = v_actor and active;
  if v_role is null or v_role not in ('owner','store_admin')
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  if not exists (select 1 from public.staff_members
      where user_id = p_assignee and active and role = 'delivery') then
    raise exception 'DELIVERY_ASSIGNEE_INVALID';
  end if;
  select delivery_assignee into v_before from public.orders
    where id = p_order_id and status = 'paid' and delivery_method = 'delivery' for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_before is not distinct from p_assignee then return jsonb_build_object('changed', false); end if;
  update public.orders set delivery_assignee = p_assignee where id = p_order_id;
  insert into public.audit_events(actor_user_id, action, object_type, object_id, before_state, after_state)
    values (v_actor, 'order.delivery_assigned', 'order', p_order_id,
      jsonb_build_object('assignee', v_before), jsonb_build_object('assignee', p_assignee));
  return jsonb_build_object('changed', true);
end;
$$;
revoke all on function public.admin_assign_delivery(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_assign_delivery(uuid, uuid) to authenticated;

create or replace function public.admin_change_delivery(
  p_order_id uuid, p_date date, p_window text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_role text; v_order public.orders%rowtype;
begin
  select role into v_role from public.staff_members where user_id = v_actor and active;
  if v_role is null or v_role not in ('owner','store_admin')
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  if p_date is null or p_date < (now() at time zone 'Asia/Jakarta')::date
      or p_window not in ('morning','afternoon') then raise exception 'DELIVERY_SLOT_INVALID'; end if;
  select * into v_order from public.orders where id = p_order_id and status = 'paid' for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.delivery_date is not distinct from p_date
      and v_order.delivery_time_window is not distinct from p_window then
    return jsonb_build_object('changed', false);
  end if;
  update public.orders set delivery_date = p_date, delivery_time_window = p_window where id = p_order_id;
  insert into public.order_status_events(order_id, actor_user_id, event_type, note)
    values (p_order_id, v_actor, 'delivery_slot_changed',
      p_date::text || ' / ' || case p_window when 'morning' then 'Pagi' else 'Siang' end);
  insert into public.audit_events(actor_user_id, action, object_type, object_id, before_state, after_state)
    values (v_actor, 'order.delivery_slot_changed', 'order', p_order_id,
      jsonb_build_object('date', v_order.delivery_date, 'window', v_order.delivery_time_window),
      jsonb_build_object('date', p_date, 'window', p_window));
  return jsonb_build_object('changed', true);
end;
$$;
revoke all on function public.admin_change_delivery(uuid, date, text)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_change_delivery(uuid, date, text) to authenticated;

create or replace function public.admin_set_stock(p_sku text, p_quantity integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_staff public.staff_members%rowtype;
  v_product public.products_commerce%rowtype;
begin
  select * into v_staff from public.staff_members where user_id = v_actor and active;
  if not found or (v_staff.role <> 'owner' and
      not (v_staff.role = 'store_admin' and v_staff.can_manage_stock))
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  select * into v_product from public.products_commerce where sku = p_sku for update;
  if not found then raise exception 'SKU_UNAVAILABLE'; end if;
  if p_quantity is null or p_quantity < v_product.reserved_quantity then
    raise exception 'STOCK_BELOW_RESERVATIONS';
  end if;
  if p_quantity = v_product.stock_quantity then return jsonb_build_object('changed', false); end if;
  update public.products_commerce set stock_quantity = p_quantity where sku = p_sku;
  insert into public.audit_events(actor_user_id, action, object_type, before_state, after_state)
    values (v_actor, 'stock.quantity_changed', 'product',
      jsonb_build_object('sku', p_sku, 'quantity', v_product.stock_quantity),
      jsonb_build_object('sku', p_sku, 'quantity', p_quantity));
  return jsonb_build_object('changed', true, 'stock_quantity', p_quantity);
end;
$$;
revoke all on function public.admin_set_stock(text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_set_stock(text, integer) to authenticated;

create or replace function public.admin_update_staff(
  p_user_id uuid, p_role text, p_active boolean,
  p_notify_paid_orders boolean, p_can_manage_stock boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_target public.staff_members%rowtype;
begin
  if not exists (select 1 from public.staff_members
      where user_id = v_actor and active and role = 'owner')
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  if p_role not in ('owner','store_admin','florist','delivery') then raise exception 'ROLE_INVALID'; end if;
  select * into v_target from public.staff_members where user_id = p_user_id for update;
  if not found then raise exception 'STAFF_NOT_FOUND'; end if;
  if p_user_id = v_actor and (not p_active or p_role <> 'owner') then
    raise exception 'CANNOT_REMOVE_SELF';
  end if;
  if v_target.role = 'owner' and v_target.active and (p_role <> 'owner' or not p_active)
      and (select count(*) from public.staff_members where role = 'owner' and active) <= 1 then
    raise exception 'LAST_OWNER';
  end if;
  update public.staff_members set role = p_role, active = p_active,
    notify_paid_orders = p_notify_paid_orders,
    can_manage_stock = p_can_manage_stock,
    deactivated_at = case when p_active then null else now() end
    where user_id = p_user_id;
  insert into public.audit_events(actor_user_id, action, object_type, object_id, before_state, after_state)
    values (v_actor, 'staff.permissions_changed', 'staff', p_user_id,
      jsonb_build_object('role', v_target.role, 'active', v_target.active,
        'notify_paid_orders', v_target.notify_paid_orders, 'can_manage_stock', v_target.can_manage_stock),
      jsonb_build_object('role', p_role, 'active', p_active,
        'notify_paid_orders', p_notify_paid_orders, 'can_manage_stock', p_can_manage_stock));
  return jsonb_build_object('changed', true);
end;
$$;
revoke all on function public.admin_update_staff(uuid, text, boolean, boolean, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_update_staff(uuid, text, boolean, boolean, boolean)
  to authenticated;

create or replace function public.admin_add_staff(
  p_user_id uuid, p_name text, p_role text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid();
begin
  if not exists (select 1 from public.staff_members
      where user_id = v_actor and active and role = 'owner')
      or coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'STAFF_ACCESS_DENIED';
  end if;
  if p_role not in ('owner','store_admin','florist','delivery')
      or char_length(btrim(coalesce(p_name,''))) not between 1 and 100 then
    raise exception 'STAFF_INPUT_INVALID';
  end if;
  insert into public.staff_members(user_id, display_name, role, notify_paid_orders)
    values (p_user_id, btrim(p_name), p_role, p_role in ('owner','store_admin'));
  insert into public.audit_events(actor_user_id, action, object_type, object_id, after_state)
    values (v_actor, 'staff.invited', 'staff', p_user_id,
      jsonb_build_object('role', p_role, 'active', true));
  return jsonb_build_object('created', true);
end;
$$;
revoke all on function public.admin_add_staff(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_add_staff(uuid, text, text) to authenticated;

commit;
