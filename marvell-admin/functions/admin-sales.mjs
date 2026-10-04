import { ok, fail } from "../../netlify/functions/_lib/http.mjs";
import { methodNotAllowed } from "./_lib/admin-http.mjs";
import { getServiceClient } from "../../netlify/functions/_lib/supabase.mjs";
import { authorize } from "./_lib/admin-api.mjs";
import { withCookies } from "./_lib/admin-auth.mjs";

function startOfJakartaDay() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T00:00:00+07:00`;
}

function grouped(rows, key, label) {
  const groups = new Map();
  for (const row of rows) {
    const name = key(row) || label;
    const current = groups.get(name) || { name, orders: 0, paid_order_value_idr: 0 };
    current.orders += 1;
    current.paid_order_value_idr += row.total_idr;
    groups.set(name, current);
  }
  return [...groups.values()].sort((a, b) => b.paid_order_value_idr - a.paid_order_value_idr).slice(0, 10);
}

async function paidRows(db, since) {
  const rows = [];
  for (let page = 0; page < 5; page += 1) {
    const { data, error } = await db.from("orders")
      .select(`id, subtotal_idr, delivery_fee_idr, total_idr, fulfillment_state,
        paid_at, order_items(sku, product_name_snapshot, quantity, line_total_idr)`)
      .eq("status", "paid").gte("paid_at", since)
      .order("paid_at", { ascending: false }).range(page * 1000, (page + 1) * 1000 - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 1000) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

export default async (request) => {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);
  try {
    const gate = await authorize(request);
    if (gate.response) return gate.response;
    const { session } = gate;
    if (!["owner", "store_admin"].includes(session.staff.role)) {
      return fail("akses_ditolak", "Akses ditolak.", 403);
    }
    const period = new URL(request.url).searchParams.get("period") || "today";
    if (!new Set(["today", "7d", "30d"]).has(period)) return fail("periode_salah", "Periode tidak tersedia.", 400);
    if (session.staff.role !== "owner" && period !== "today") {
      return fail("akses_ditolak", "Akses ditolak.", 403);
    }
    const since = period === "today" ? startOfJakartaDay()
      : new Date(Date.now() - (period === "7d" ? 7 : 30) * 86400000).toISOString();
    const db = getServiceClient();
    const { rows, truncated } = await paidRows(db, since);
    const summary = { period, paid_orders: rows.length, truncated,
      product_sales_idr: rows.reduce((sum, o) => sum + o.subtotal_idr, 0),
      delivery_income_idr: rows.reduce((sum, o) => sum + o.delivery_fee_idr, 0),
      paid_order_value_idr: rows.reduce((sum, o) => sum + o.total_idr, 0),
      completed_orders: rows.filter((o) => o.fulfillment_state === "delivered").length,
      processing_orders: rows.filter((o) => o.fulfillment_state !== "delivered").length };
    if (session.staff.role === "owner") {
      summary.average_order_value_idr = rows.length
        ? Math.round(summary.paid_order_value_idr / rows.length) : 0;
      summary.units_per_order = rows.length
        ? Number((rows.reduce((sum, o) => sum + (o.order_items || []).reduce((n, i) => n + i.quantity, 0), 0) / rows.length).toFixed(2)) : 0;
      const products = new Map();
      for (const row of rows) for (const item of row.order_items || []) {
        const current = products.get(item.sku) || { sku: item.sku, name: item.product_name_snapshot,
          units: 0, product_sales_idr: 0 };
        current.units += item.quantity;
        current.product_sales_idr += item.line_total_idr;
        products.set(item.sku, current);
      }
      summary.products = [...products.values()].sort((a, b) => b.product_sales_idr - a.product_sales_idr).slice(0, 10);
      const refunded = await db.from("orders").select("id", { count: "exact", head: true })
        .eq("status", "refunded").gte("paid_at", since);
      if (refunded.error) throw refunded.error;
      summary.refunded_orders = refunded.count || 0;
      try {
        const attribution = [];
        for (let i = 0; i < rows.length; i += 500) {
          const page = await db.from("order_attribution")
            .select("order_id, first_touch, last_touch")
            .in("order_id", rows.slice(i, i + 500).map((o) => o.id));
          if (page.error) throw page.error;
          attribution.push(...(page.data || []));
        }
        const touch = new Map(attribution.map((a) => [a.order_id, a]));
        summary.channels = grouped(rows, (o) => touch.get(o.id)?.last_touch?.source, "Tanpa atribusi");
        summary.campaigns = grouped(rows.filter((o) => touch.get(o.id)?.last_touch?.campaign),
          (o) => touch.get(o.id).last_touch.campaign, "Tanpa kampanye");
        summary.attribution_available = true;
      } catch (error) {
        console.error("[admin-sales] attribution unavailable", error?.code || "error");
        summary.attribution_available = false;
      }
    }
    return withCookies(ok(summary), session.cookies);
  } catch (error) {
    console.error("[admin-sales]", error?.code || "error");
    return fail("gangguan", "Penjualan belum dapat dimuat.", 503);
  }
};

export const config = { path: "/api/admin/sales" };
