import { ok, fail, readJsonBody, clientIp } from "../../netlify/functions/_lib/http.mjs";
import { methodNotAllowed } from "./_lib/admin-http.mjs";
import { cleanEmail, ValidationError } from "../../netlify/functions/_lib/validate.mjs";
import { getServiceClient } from "../../netlify/functions/_lib/supabase.mjs";
import { sendTransactionalEmail, senders } from "../../netlify/functions/_lib/brevo.mjs";
import { checkRateLimit } from "../../netlify/functions/_lib/ratelimit.mjs";
import { readAdminSession, newAuthClient, mfaClient, sessionCookies,
  clearedCookies, withCookies, originAllowed } from "./_lib/admin-auth.mjs";
import { beginTotpEnrollment, mfaFailure } from "./_lib/admin-mfa.mjs";

const denial = () => fail("akses_ditolak", "Akses tidak tersedia.", 403);
const unsigned = () => fail("belum_masuk", "Silakan masuk terlebih dahulu.", 401);

export default async (request) => {
  const path = new URL(request.url).pathname;
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "POST") return methodNotAllowed(["GET", "POST"]);
  if (method === "POST" && !originAllowed(request)) return denial();
  try {
    if (path === "/api/admin/sign-in" && method === "POST") {
      const limit = checkRateLimit(`admin-sign-in:${clientIp(request)}`, { limit: 5, windowSeconds: 600 });
      if (!limit.allowed) return fail("terlalu_sering", "Tunggu sebentar sebelum mencoba lagi.", 429);
      const body = await readJsonBody(request, 4096);
      const email = cleanEmail(body?.email);
      const db = getServiceClient();
      const { data, error } = await db.rpc("staff_account_by_email", { p_email: email });
      if (error) throw error;
      if (data?.length) {
        const generated = await db.auth.admin.generateLink({ type: "magiclink", email });
        if (generated.error) throw generated.error;
        const code = generated.data?.properties?.email_otp;
        if (!/^\d{6,10}$/.test(String(code || ""))) throw new Error("staff_code_missing");
        await sendTransactionalEmail({ to: email, sender: senders.order,
          subject: "Kode Masuk Marvell Admin",
          text: `Kode masuk Marvell Admin Anda: ${code}\n\nJika Anda tidak memintanya, abaikan email ini.`,
          html: `<p>Kode masuk Marvell Admin Anda: <strong>${code}</strong></p><p>Jika Anda tidak memintanya, abaikan email ini.</p>` });
      }
      return ok({ message: "Jika akun staf aktif, kode masuk telah dikirim." });
    }

    if (path === "/api/admin/verify" && method === "POST") {
      const limit = checkRateLimit(`admin-verify:${clientIp(request)}`, { limit: 10, windowSeconds: 600 });
      if (!limit.allowed) return fail("terlalu_sering", "Tunggu sebentar sebelum mencoba lagi.", 429);
      const body = await readJsonBody(request, 4096);
      const email = cleanEmail(body?.email);
      const code = String(body?.code || "").trim();
      if (!/^\d{6,10}$/.test(code)) return fail("kode_salah", "Kode tidak valid.", 400);
      const result = await newAuthClient().auth.verifyOtp({ email, token: code, type: "email" });
      if (result.error || !result.data?.session || !result.data?.user) {
        return fail("kode_salah", "Kode tidak valid atau sudah kedaluwarsa.", 401);
      }
      const db = getServiceClient();
      const { data: staff, error } = await db.from("staff_members")
        .select("role, display_name, active")
        .eq("user_id", result.data.user.id).eq("active", true).maybeSingle();
      if (error) throw error;
      if (!staff) return denial();
      await db.from("audit_events").insert({ actor_user_id: result.data.user.id,
        action: "staff.sign_in_first_factor", object_type: "staff", object_id: result.data.user.id });
      return withCookies(ok({ signed_in: true, mfa_required: true }), sessionCookies(result.data.session));
    }

    const session = await readAdminSession(request);
    if (path === "/api/admin/session" && method === "GET") {
      if (!session) return ok({ signed_in: false });
      return withCookies(ok({ signed_in: true, mfa_required: session.aal !== "aal2",
        staff: { display_name: session.staff.display_name, role: session.staff.role,
          can_manage_stock: session.staff.can_manage_stock } }), session.cookies);
    }
    if (path === "/api/admin/sign-out" && method === "POST") {
      if (session) {
        const auth = await mfaClient(session);
        await auth.auth.signOut({ scope: "local" });
      }
      return withCookies(ok({ signed_in: false }), clearedCookies());
    }
    if (!session) return unsigned();

    if (path === "/api/admin/mfa" && method === "GET") {
      const auth = await mfaClient(session);
      const { data, error } = await auth.auth.mfa.listFactors();
      if (error) throw error;
      return withCookies(ok({ factors: (data?.totp || []).map((f) => ({ id: f.id })) }), session.cookies);
    }
    if (path === "/api/admin/mfa/enroll" && method === "POST") {
      const auth = await mfaClient(session);
      try {
        const enrolled = await beginTotpEnrollment(auth);
        if (enrolled.alreadyVerified) {
          return withCookies(fail("mfa_sudah_aktif", "Autentikasi dua langkah sudah aktif. Masukkan kode terbaru.", 409), session.cookies);
        }
        return withCookies(ok({ factor_id: enrolled.factorId,
          qr_code: enrolled.qrCode, secret: enrolled.secret }), session.cookies);
      } catch (error) {
        console.error("[admin-auth:mfa-enroll]", error?.code || error?.name || "error");
        const problem = mfaFailure(error, "enroll");
        return withCookies(fail(problem.code, problem.message, problem.status), session.cookies);
      }
    }
    if (path === "/api/admin/mfa/verify" && method === "POST") {
      const body = await readJsonBody(request, 4096);
      const factorId = String(body?.factor_id || "");
      const code = String(body?.code || "");
      if (!/^[0-9a-f-]{36}$/i.test(factorId) || !/^\d{6}$/.test(code)) {
        return fail("kode_salah", "Periksa kode autentikator Anda.", 400);
      }
      const auth = await mfaClient(session);
      const verified = await auth.auth.mfa.challengeAndVerify({ factorId, code });
      if (verified.error || !verified.data?.access_token || !verified.data?.refresh_token) {
        const problem = mfaFailure(verified.error, "verify");
        return withCookies(fail(problem.code, problem.message, problem.status), session.cookies);
      }
      const db = getServiceClient();
      await db.from("audit_events").insert({ actor_user_id: session.user.id,
        action: "staff.mfa_verified", object_type: "staff", object_id: session.user.id });
      return withCookies(ok({ signed_in: true, mfa_required: false }), sessionCookies(verified.data));
    }
    return fail("tidak_ditemukan", "Halaman tidak ditemukan.", 404);
  } catch (error) {
    if (error instanceof ValidationError) return fail("data_tidak_valid", "Periksa data yang dimasukkan.", 400);
    console.error("[admin-auth]", error?.code || error?.name || "error");
    return fail("gangguan", "Layanan sedang terganggu. Coba lagi sebentar.", 503);
  }
};

export const config = {
  path: ["/api/admin/sign-in", "/api/admin/verify", "/api/admin/session",
    "/api/admin/sign-out", "/api/admin/mfa", "/api/admin/mfa/enroll", "/api/admin/mfa/verify"],
  rateLimit: { windowSize: 60, windowLimit: 60, aggregateBy: ["ip"] }
};
