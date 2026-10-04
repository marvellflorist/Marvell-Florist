import { ok, fail, readJsonBody } from "../../netlify/functions/_lib/http.mjs";
import { methodNotAllowed } from "./_lib/admin-http.mjs";
import { allowed, withCookies } from "./_lib/admin-auth.mjs";
import { authorize, UUID, userClient } from "./_lib/admin-api.mjs";

const TRANSITIONS = {
  acknowledge: "orders.acknowledge",
  start_preparing: "orders.prepare",
  mark_ready: "orders.prepare",
  start_delivery: "orders.deliver",
  complete: "orders.deliver"
};

function problem(error) {
  const code = String(error?.message || "");
  if (code.includes("STATE_CHANGED") || code.includes("INVALID_TRANSITION")) {
    return fail("status_berubah", "Status pesanan sudah berubah. Muat ulang pesanan.", 409);
  }
  if (code.includes("ORDER_NEEDS_ATTENTION")) {
    return fail("perlu_tindakan", "Selesaikan masalah pesanan sebelum melanjutkan.", 409);
  }
  if (code.includes("STAFF_ACCESS_DENIED")) return fail("akses_ditolak", "Akses ditolak.", 403);
  if (code.includes("PRINT_NOT_REQUESTED")) return fail("belum_dicetak", "Pilih Cetak Kartu terlebih dahulu.", 409);
  if (code.includes("CARD_UNAVAILABLE")) return fail("kartu_tidak_tersedia", "Kartu belum tersedia.", 409);
  if (code.includes("RESOLUTION_NOTE_REQUIRED")) {
    return fail("catatan_diperlukan", "Tulis tindakan yang sudah dilakukan, minimal 10 karakter.", 400);
  }
  if (code.includes("STOCK_UNAVAILABLE")) {
    return fail("stok_tidak_cukup", "Stok tersedia belum cukup. Perbarui stok fisik atau tangani pengembalian dana terlebih dahulu.", 409);
  }
  return fail("aksi_gagal", "Tindakan belum tersimpan. Coba lagi.", 500);
}

export default async (request) => {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    const gate = await authorize(request, { mutation: true });
    if (gate.response) return gate.response;
    const { session } = gate;
    const parts = new URL(request.url).pathname.split("/").filter(Boolean);
    const id = parts.at(-2);
    const kind = parts.at(-1);
    if (!UUID.test(id) || !["action", "card"].includes(kind)) {
      return fail("tidak_ditemukan", "Pesanan tidak ditemukan.", 404);
    }
    const body = await readJsonBody(request, 4096);
    const db = userClient(session);
    let result;
    if (kind === "card") {
      if (!allowed(session.staff, "cards.print")) return fail("akses_ditolak", "Akses ditolak.", 403);
      if (!["request", "confirm"].includes(body?.action) || !UUID.test(body?.request_id || "")) {
        return fail("aksi_salah", "Tindakan kartu tidak valid.", 400);
      }
      result = await db.rpc("admin_card_action", {
        p_order_id: id, p_action: body.action, p_request_id: body.request_id
      });
    } else if (TRANSITIONS[body?.action]) {
      if (!allowed(session.staff, TRANSITIONS[body.action])) return fail("akses_ditolak", "Akses ditolak.", 403);
      result = await db.rpc("admin_transition_order", { p_order_id: id,
        p_action: body.action, p_expected_state: body.expected_state || null,
        p_note: body.note || null });
    } else if (body?.action === "resolve_attention") {
      if (!allowed(session.staff, "orders.acknowledge")) return fail("akses_ditolak", "Akses ditolak.", 403);
      result = await db.rpc("admin_resolve_attention", {
        p_order_id: id, p_note: String(body.note || "").slice(0, 500)
      });
    } else if (body?.action === "assign_delivery") {
      if (!allowed(session.staff, "orders.acknowledge") || !UUID.test(body.assignee_id || "")) {
        return fail("akses_ditolak", "Akses ditolak.", 403);
      }
      result = await db.rpc("admin_assign_delivery", { p_order_id: id, p_assignee: body.assignee_id });
    } else if (body?.action === "change_delivery") {
      if (!allowed(session.staff, "orders.acknowledge")) return fail("akses_ditolak", "Akses ditolak.", 403);
      result = await db.rpc("admin_change_delivery", {
        p_order_id: id, p_date: body.date, p_window: body.window
      });
    } else return fail("aksi_salah", "Tindakan tidak tersedia.", 400);
    if (result.error) return withCookies(problem(result.error), session.cookies);
    return withCookies(ok({ result: result.data }), session.cookies);
  } catch (error) {
    console.error("[admin-order-action]", error?.code || "error");
    return fail("gangguan", "Tindakan belum tersimpan. Coba lagi.", 503);
  }
};

export const config = {
  path: ["/api/admin/orders/:id/action", "/api/admin/orders/:id/card"]
};
