import { ok, fail } from "../../netlify/functions/_lib/http.mjs";
import { methodNotAllowed } from "./_lib/admin-http.mjs";
import { getServiceClient } from "../../netlify/functions/_lib/supabase.mjs";
import { authorize } from "./_lib/admin-api.mjs";
import { withCookies } from "./_lib/admin-auth.mjs";

export default async (request) => {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);
  try {
    const gate = await authorize(request);
    if (gate.response) return gate.response;
    const { session } = gate;
    if (!["owner", "store_admin"].includes(session.staff.role)) {
      return fail("akses_ditolak", "Akses ditolak.", 403);
    }
    const db = getServiceClient();
    const { data, error } = await db.from("admin_notifications")
      .select("id, order_id, event_type, created_at, acknowledged_at, escalated_at")
      .is("acknowledged_at", null).order("created_at", { ascending: false }).limit(60);
    if (error) throw error;
    return withCookies(ok({ notifications: data || [] }), session.cookies);
  } catch (error) {
    console.error("[admin-notifications]", error?.code || "error");
    return fail("gangguan", "Notifikasi belum dapat dimuat.", 503);
  }
};

export const config = { path: "/api/admin/notifications" };
