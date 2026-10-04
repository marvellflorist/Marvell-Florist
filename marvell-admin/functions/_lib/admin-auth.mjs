import { createClient } from "@supabase/supabase-js";
import { config } from "../../../netlify/functions/_lib/env.mjs";
import { getServiceClient } from "../../../netlify/functions/_lib/supabase.mjs";

const ACCESS = "mv_admin_session";
const REFRESH = "mv_admin_refresh";
const ACCESS_AGE = 60 * 60;
const REFRESH_AGE = 60 * 60 * 24 * 30;

function adminOrigin() {
  return new URL(process.env.ADMIN_SITE_ORIGIN || "http://localhost:8890").origin;
}

function cookies(request) {
  return Object.fromEntries((request.headers.get("cookie") || "").split(";").map((part) => {
    const i = part.indexOf("=");
    if (i < 1) return ["", ""];
    try { return [part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1).trim())]; }
    catch { return ["", ""]; }
  }));
}

function cookie(name, value, age) {
  const origin = new URL(adminOrigin());
  const local = origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname);
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}`
    + (local ? "" : "; Secure");
}

export function sessionCookies(session) {
  return [cookie(ACCESS, session.access_token, ACCESS_AGE),
    cookie(REFRESH, session.refresh_token, REFRESH_AGE)];
}

export function clearedCookies() {
  return [cookie(ACCESS, "", 0), cookie(REFRESH, "", 0)];
}

export function withCookies(response, values = []) {
  if (!values.length) return response;
  const headers = new Headers(response.headers);
  for (const value of values) headers.append("set-cookie", value);
  return new Response(response.body, { status: response.status, headers });
}

export function originAllowed(request) {
  return request.headers.get("origin") === adminOrigin();
}

export function newAuthClient() {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

function aalOf(token) {
  try { return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")).aal || "aal1"; }
  catch { return "aal1"; }
}

export async function readAdminSession(request) {
  const jar = cookies(request);
  const auth = newAuthClient();
  let accessToken = jar[ACCESS];
  let refreshToken = jar[REFRESH];
  let setCookies = [];
  let user = null;
  if (accessToken) {
    const checked = await auth.auth.getUser(accessToken);
    if (!checked.error) user = checked.data?.user;
  }
  if (!user && refreshToken) {
    const refreshed = await auth.auth.refreshSession({ refresh_token: refreshToken });
    if (refreshed.error || !refreshed.data?.session) return null;
    user = refreshed.data.user;
    accessToken = refreshed.data.session.access_token;
    refreshToken = refreshed.data.session.refresh_token;
    setCookies = sessionCookies(refreshed.data.session);
  }
  if (!user) return null;
  const db = getServiceClient();
  const { data: staff, error } = await db.from("staff_members")
    .select("user_id, display_name, role, active, can_manage_stock")
    .eq("user_id", user.id).eq("active", true).maybeSingle();
  if (error) throw error;
  if (!staff) return null;
  return { user, staff, accessToken, refreshToken, aal: aalOf(accessToken), cookies: setCookies };
}

export async function mfaClient(session) {
  const client = newAuthClient();
  const { error } = await client.auth.setSession({
    access_token: session.accessToken, refresh_token: session.refreshToken
  });
  if (error) throw error;
  return client;
}

export function allowed(staff, action) {
  const role = staff?.role;
  if (!staff?.active) return false;
  if (role === "owner") return true;
  if (action === "orders.read") return ["store_admin", "florist", "delivery"].includes(role);
  if (action === "orders.acknowledge") return role === "store_admin";
  if (action === "orders.prepare") return ["store_admin", "florist"].includes(role);
  if (action === "orders.deliver") return ["store_admin", "delivery"].includes(role);
  if (action === "cards.print") return ["store_admin", "florist"].includes(role);
  if (action === "stock.manage") return role === "store_admin" && staff.can_manage_stock;
  if (action === "sales.simple") return role === "store_admin";
  return false;
}

export const __testing = { aalOf, cookie, ACCESS, REFRESH };
