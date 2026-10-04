import { ok, fail, readJsonBody } from "../../netlify/functions/_lib/http.mjs";
import { methodNotAllowed } from "./_lib/admin-http.mjs";
import { cleanEmail, cleanText } from "../../netlify/functions/_lib/validate.mjs";
import { getServiceClient } from "../../netlify/functions/_lib/supabase.mjs";
import { sendTransactionalEmail, senders } from "../../netlify/functions/_lib/brevo.mjs";
import { authorize, UUID, userClient } from "./_lib/admin-api.mjs";
import { mfaClient, sessionCookies, withCookies } from "./_lib/admin-auth.mjs";

const ROLES = new Set(["owner", "store_admin", "florist", "delivery"]);

async function stepUp(session, code) {
  if (!/^\d{6}$/.test(String(code || ""))) return null;
  const auth = await mfaClient(session);
  const factors = await auth.auth.mfa.listFactors();
  if (factors.error || !factors.data?.totp?.length) return null;
  const verified = await auth.auth.mfa.challengeAndVerify({
    factorId: factors.data.totp[0].id, code: String(code)
  });
  if (verified.error || !verified.data?.access_token) return null;
  return verified.data;
}

export default async (request) => {
  if (!["GET", "POST"].includes(request.method)) return methodNotAllowed(["GET", "POST"]);
  try {
    const gate = await authorize(request, { mutation: request.method === "POST", owner: true });
    if (gate.response) return gate.response;
    const { session } = gate;
    const db = getServiceClient();
    if (request.method === "GET") {
      const rows = await db.from("staff_members")
        .select("user_id, display_name, role, active, can_manage_stock, notify_paid_orders, deactivated_at")
        .order("display_name");
      if (rows.error) throw rows.error;
      const staff = await Promise.all((rows.data || []).map(async (row) => {
        const person = await db.auth.admin.getUserById(row.user_id);
        return { ...row, email: person.data?.user?.email || "" };
      }));
      return withCookies(ok({ staff }), session.cookies);
    }

    const body = await readJsonBody(request, 8192);
    const upgraded = await stepUp(session, body?.mfa_code);
    if (!upgraded) return fail("verifikasi_diperlukan", "Masukkan kode autentikator terbaru.", 403);
    const stepped = { ...session, accessToken: upgraded.access_token, refreshToken: upgraded.refresh_token };
    let response;
    if (body?.action === "invite") {
      const email = cleanEmail(body.email);
      const name = cleanText(body.display_name, { field: "display_name", max: 100, required: true });
      const role = String(body.role || "");
      if (!ROLES.has(role)) return fail("peran_salah", "Pilih peran staf.", 400);
      const account = await db.rpc("my_marvell_account", { p_email: email });
      if (account.error) throw account.error;
      let userId = account.data?.[0]?.user_id;
      if (!userId) {
        const created = await db.auth.admin.createUser({ email, email_confirm: true });
        if (created.error) throw created.error;
        userId = created.data.user.id;
      }
      const existing = await db.from("staff_members").select("user_id").eq("user_id", userId).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) return fail("sudah_ada", "Akun staf ini sudah ada.", 409);
      const inserted = await userClient(stepped).rpc("admin_add_staff", {
        p_user_id: userId, p_name: name, p_role: role
      });
      if (inserted.error) throw inserted.error;
      let mailSent = true;
      try {
        const origin = new URL(process.env.ADMIN_SITE_ORIGIN || "http://localhost:8890").origin;
        await sendTransactionalEmail({ to: email, sender: senders.order,
          subject: "Undangan Marvell Admin",
          text: `Anda diundang bergabung dengan Marvell Admin. Buka ${origin} lalu masuk dengan email ini.`,
          html: `<p>Anda diundang bergabung dengan Marvell Admin.</p><p>Buka <a href="${origin}">Marvell Admin</a> lalu masuk dengan email ini.</p>` });
      } catch { mailSent = false; }
      response = ok({ created: true, mail_sent: mailSent });
    } else if (body?.action === "update") {
      if (!UUID.test(body.user_id || "") || !ROLES.has(String(body.role || ""))) {
        return fail("data_tidak_valid", "Periksa akun dan peran staf.", 400);
      }
      const result = await userClient(stepped).rpc("admin_update_staff", {
        p_user_id: body.user_id, p_role: body.role, p_active: body.active === true,
        p_notify_paid_orders: body.notify_paid_orders === true,
        p_can_manage_stock: body.can_manage_stock === true
      });
      if (result.error) return fail("perubahan_gagal", "Akses staf belum dapat diubah.", 409);
      response = ok({ updated: true });
    } else return fail("aksi_salah", "Tindakan tidak tersedia.", 400);
    return withCookies(response, sessionCookies(upgraded));
  } catch (error) {
    console.error("[admin-staff]", error?.code || "error");
    return fail("gangguan", "Akses staf belum dapat diproses.", 503);
  }
};

export const config = { path: "/api/admin/staff" };
