import { ok, fail } from "../../netlify/functions/_lib/http.mjs";
import { methodNotAllowed } from "./_lib/admin-http.mjs";
import { getServiceClient } from "../../netlify/functions/_lib/supabase.mjs";
import { withCookies } from "./_lib/admin-auth.mjs";
import { authorize, UUID, publicOrder } from "./_lib/admin-api.mjs";

const FIELDS = `id, public_order_number, status, payment_status, fulfillment_state,
  needs_attention, attention_reason, stock_exception, delivery_method, delivery_date,
  delivery_time_window, recipient_name, recipient_phone, delivery_address, delivery_unit,
  delivery_instructions, delivery_assignee, card_message, card_sender, card_anonymous,
  card_printed_at, card_reprint_count, customer_name, email, phone, order_notes,
  subtotal_idr, delivery_fee_idr, total_idr, payment_reference, paid_at,
  acknowledged_at, created_at,
  order_items(sku, product_name_snapshot, quantity, product_image_snapshot,
    selected_options, production_instructions, unit_price_idr, line_total_idr)`;

function todayJakarta() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const o = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${o.year}-${o.month}-${o.day}`;
}

export default async (request) => {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);
  try {
    const gate = await authorize(request);
    if (gate.response) return gate.response;
    const { session } = gate;
    const db = getServiceClient();
    const url = new URL(request.url);
    const id = url.pathname.split("/").pop();
    const detail = UUID.test(id);
    if (url.pathname.startsWith("/api/admin/orders/") && !detail) {
      return fail("tidak_ditemukan", "Pesanan tidak ditemukan.", 404);
    }
    const role = session.staff.role;
    let query = db.from("orders").select(FIELDS).eq("status", "paid");
    if (detail) query = query.eq("id", id);
    if (role === "delivery") {
      query = query.eq("delivery_assignee", session.user.id)
        .in("fulfillment_state", ["ready", "out_for_delivery", "delivered"]);
    }
    if (role === "florist") {
      query = query.in("fulfillment_state", ["acknowledged", "preparing", "ready"]);
    }
    if (detail) {
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) return withCookies(fail("tidak_ditemukan", "Pesanan tidak ditemukan.", 404), session.cookies);
      const order = publicOrder(data, role);
      if (role === "owner" || role === "store_admin") {
        const history = await db.from("order_status_events")
          .select("event_type, from_state, to_state, note, created_at")
          .eq("order_id", data.id).order("created_at", { ascending: true });
        if (history.error) throw history.error;
        order.history = history.data || [];
        if (data.delivery_method === "delivery") {
          const drivers = await db.from("staff_members")
            .select("user_id, display_name").eq("role", "delivery").eq("active", true)
            .order("display_name");
          if (drivers.error) throw drivers.error;
          order.delivery_staff = drivers.data || [];
        }
      }
      return withCookies(ok({ order }), session.cookies);
    }
    const queue = url.searchParams.get("queue") || "open";
    if (queue === "attention") query = query.eq("needs_attention", true);
    else if (queue === "new") query = query.eq("fulfillment_state", "new");
    else if (queue === "today") query = query.eq("delivery_date", todayJakarta());
    else if (queue === "preparing") query = query.eq("fulfillment_state", "preparing");
    else if (queue === "ready") query = query.eq("fulfillment_state", "ready");
    else if (queue === "delivery") query = query.eq("delivery_method", "delivery")
      .in("fulfillment_state", ["ready", "out_for_delivery"]);
    else if (queue === "cards") query = query.not("card_message", "is", null)
      .neq("fulfillment_state", "delivered").eq("needs_attention", false);
    else if (queue === "open") query = query.neq("fulfillment_state", "delivered");
    else if (queue !== "all") return fail("antrian_salah", "Antrian tidak tersedia.", 400);
    if (queue === "open") query = query.order("needs_attention", { ascending: false })
      .order("delivery_date", { ascending: true, nullsFirst: false })
      .order("paid_at", { ascending: true });
    else query = query.order("paid_at", { ascending: false });
    const { data, error } = await query.limit(101);
    if (error) throw error;
    return withCookies(ok({ orders: (data || []).slice(0, 100).map((row) => publicOrder(row, role)),
      truncated: (data || []).length > 100 }), session.cookies);
  } catch (error) {
    console.error("[admin-orders]", error?.code || "error");
    return fail("gangguan", "Pesanan belum dapat dimuat. Coba lagi.", 503);
  }
};

export const config = { path: ["/api/admin/orders", "/api/admin/orders/:id"] };
