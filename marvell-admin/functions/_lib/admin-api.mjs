import { createClient } from "@supabase/supabase-js";
import { config } from "../../../netlify/functions/_lib/env.mjs";
import { fail } from "../../../netlify/functions/_lib/http.mjs";
import { readAdminSession, originAllowed } from "./admin-auth.mjs";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function authorize(request, { mutation = false, owner = false } = {}) {
  if (mutation && !originAllowed(request)) return { response: fail("akses_ditolak", "Akses ditolak.", 403) };
  const session = await readAdminSession(request);
  if (!session) return { response: fail("belum_masuk", "Silakan masuk terlebih dahulu.", 401) };
  if (session.aal !== "aal2") return { response: fail("perlu_verifikasi", "Selesaikan verifikasi dua langkah.", 403) };
  if (owner && session.staff.role !== "owner") {
    return { response: fail("akses_ditolak", "Akses ditolak.", 403) };
  }
  return { session };
}

export function userClient(session) {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${session.accessToken}` } }
  });
}

export function publicOrder(row, role) {
  const common = {
    id: row.id, reference: row.public_order_number,
    payment_status: row.payment_status, fulfillment_state: row.fulfillment_state,
    needs_attention: row.needs_attention, stock_exception: row.stock_exception,
    delivery_method: row.delivery_method, delivery_date: row.delivery_date,
    delivery_time_window: row.delivery_time_window, recipient_name: row.recipient_name,
    paid_at: row.paid_at, acknowledged_at: row.acknowledged_at,
    items: (row.order_items || []).map((item) => ({
      sku: item.sku, name: item.product_name_snapshot, quantity: item.quantity,
      image: item.product_image_snapshot, options: item.selected_options,
      instructions: item.production_instructions,
      ...(role === "owner" || role === "store_admin" ? {
        unit_price_idr: item.unit_price_idr, line_total_idr: item.line_total_idr
      } : {})
    }))
  };
  if (role === "delivery") return {
    ...common, items: common.items.map(({ sku, name, quantity, image }) => ({ sku, name, quantity, image })),
    recipient_phone: row.recipient_phone, delivery_address: row.delivery_address,
    delivery_unit: row.delivery_unit, delivery_instructions: row.delivery_instructions
  };
  if (role === "florist") return {
    ...common, card_message: row.card_message,
    card_sender: row.card_sender, card_anonymous: row.card_anonymous,
    card_printed_at: row.card_printed_at, card_reprint_count: row.card_reprint_count,
    order_notes: row.order_notes
  };
  return {
    ...common, attention_reason: row.attention_reason,
    customer_name: row.customer_name, email: row.email, phone: row.phone,
    recipient_phone: row.recipient_phone, delivery_address: row.delivery_address,
    delivery_unit: row.delivery_unit, delivery_instructions: row.delivery_instructions,
    order_notes: row.order_notes, card_message: row.card_message,
    card_sender: row.card_sender, card_anonymous: row.card_anonymous,
    card_printed_at: row.card_printed_at, card_reprint_count: row.card_reprint_count,
    total_idr: row.total_idr, delivery_fee_idr: row.delivery_fee_idr,
    subtotal_idr: row.subtotal_idr, payment_reference: row.payment_reference,
    delivery_assignee: row.delivery_assignee
  };
}
