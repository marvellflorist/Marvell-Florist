/**
 * The account — sessions, and the rules the account system is built on.
 *
 * WHERE THE SESSION LIVES
 * Supabase issues an access token and a refresh token. Neither is ever handed
 * to the browser as script-readable data: both go into httpOnly, Secure,
 * SameSite=Lax cookies that JavaScript on the page cannot read (Secure is
 * dropped only for an http://localhost SITE_ORIGIN, so that `netlify dev` can
 * hold a session at all), so a single
 * cross-site script cannot walk off with somebody's session. The browser holds
 * no Supabase key of any kind — the anon key stays in this directory, which is
 * the same rule the rest of the project already keeps.
 *
 * The refresh token is scoped to /api/account, so it is not attached to every
 * request to the site, only to the handful that can use it.
 *
 * WHAT COUNTS AS IDENTITY
 * `readSession()` is the only thing that answers "who is this". It verifies
 * the access token with Supabase and returns the user Supabase reports. An
 * email address in a request body is never identity, and is never used to
 * decide what somebody may see. This matters most for the historical orders a
 * person placed as a guest: those are attached by claim_orders_for_user(),
 * which reads the confirmed address out of auth.users itself.
 *
 * PASSWORDLESS
 * There are no passwords here and there is no password endpoint to attack.
 * Signing in means proving you can read a mailbox: Supabase mints a one-time
 * code, we deliver it over Brevo, and the code is exchanged for a session.
 * Google is the same idea with Google doing the proving.
 *
 * AN AUTH USER IS NOT AN ACCOUNT
 * These are two facts and they are stored separately. auth.users says somebody
 * has proved a mailbox. customer_profiles.profile_completed_at says somebody
 * has actually made an account: a title, a name, and a verified address. Only
 * the second one means "has an account", and only registration sets it.
 *
 * Treating the first as the second is what let an address that had never
 * registered sign in, and then be refused by Create your account as a duplicate.
 * Every question of the form "does this person have an account" goes through
 * lookupAccount(), which answers both parts without confusing them.
 */

import { createClient } from "@supabase/supabase-js";
import { config, isAccountsConfigured } from "./env.mjs";
import { getServiceClient } from "./supabase.mjs";
import { describeError } from "./http.mjs";

/**
 * How long a sign-in code is.
 *
 * Nothing here decides it. Supabase generates the code and its length is a
 * project setting (Authentication -> Sign In / Providers -> Email OTP length),
 * which Supabase allows to be 6 to 10 digits. These are the bounds of what may
 * legitimately arrive, NOT an assertion about any particular project — a
 * Marvell project set to 8 must work without a code change here, which is the
 * bug these constants exist to stop from coming back.
 *
 * The exact length for this project is learned at generation time and reported
 * by /api/account/request-code as `code_length`. The code itself is never
 * reported, logged or stored.
 */
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 10;

const ACCESS_COOKIE = "mv_session";
const REFRESH_COOKIE = "mv_refresh";
const VERIFIER_COOKIE = "mv_pkce";
const OAUTH_NEXT_COOKIE = "mv_oauth_next";

// Supabase access tokens last an hour by default. The cookie is given the same
// life; the refresh cookie is what actually keeps somebody signed in.
const ACCESS_MAX_AGE = 60 * 60;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;
const VERIFIER_MAX_AGE = 60 * 10;

export class AuthConfigError extends Error {
  constructor(message = "Accounts are not configured.") {
    super(message);
    this.name = "AuthConfigError";
    this.code = "not_configured";
  }
}

let authClient = null;

/**
 * A client for Supabase Auth, holding the anon key.
 *
 * Auth is the one part of Supabase that must NOT be called with the service
 * role: the service role can mint a session for anybody, so a bug that let a
 * request steer it would be a bug that let a request become anyone. Only the
 * two places that genuinely need admin — generating a sign-in code, and
 * reading a confirmed address — use the service client, and both take the
 * address from the server's own state.
 */
export function getAuthClient() {
  if (!isAccountsConfigured()) throw new AuthConfigError();
  if (!authClient) {
    authClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { "x-marvell-source": "netlify-function" } }
    });
  }
  return authClient;
}

// -- cookies ----------------------------------------------------------------

function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  const jar = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) jar[name] = decodeURIComponent(value);
  }
  return jar;
}

/**
 * Secure, except on a plain-http loopback origin.
 *
 * A session cookie that can travel in clear is not a session cookie, and the
 * site is HTTPS everywhere including previews — so Secure is the default and
 * production can never reach the other branch. The single exception is
 * `netlify dev`, which serves the real functions over http://localhost:8888;
 * Safari refuses to store a Secure cookie from a plain-http origin, so signing
 * in locally would appear to succeed and then silently forget.
 *
 * The test is deliberately narrow. It is not "are we in development" — it
 * reads the configured site origin and relaxes only for http:// on localhost
 * or 127.0.0.1. Any other origin, and anything https, keeps Secure. A
 * SITE_ORIGIN pointing at a real host cannot opt out of it by accident.
 */
function isLoopbackOrigin() {
  try {
    const url = new URL(config.siteOrigin);
    if (url.protocol !== "http:") return false;
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  } catch (_error) {
    return false;
  }
}

function cookie(name, value, { maxAge, path = "/" }) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    "HttpOnly",
    ...(isLoopbackOrigin() ? [] : ["Secure"]),
    "SameSite=Lax",
    `Max-Age=${maxAge}`
  ];
  return parts.join("; ");
}

export function sessionCookies(session) {
  return [
    cookie(ACCESS_COOKIE, session.access_token, { maxAge: ACCESS_MAX_AGE }),
    cookie(REFRESH_COOKIE, session.refresh_token, { maxAge: REFRESH_MAX_AGE, path: "/api/account" })
  ];
}

export function clearedCookies() {
  return [
    cookie(ACCESS_COOKIE, "", { maxAge: 0 }),
    cookie(REFRESH_COOKIE, "", { maxAge: 0, path: "/api/account" }),
    cookie(VERIFIER_COOKIE, "", { maxAge: 0, path: "/api/account" }),
    cookie(OAUTH_NEXT_COOKIE, "", { maxAge: 0, path: "/api/account" })
  ];
}

export function verifierCookie(verifier) {
  return cookie(VERIFIER_COOKIE, verifier, { maxAge: VERIFIER_MAX_AGE, path: "/api/account" });
}

export function readVerifier(request) {
  return parseCookies(request)[VERIFIER_COOKIE] || "";
}

export function oauthNextCookie(next) {
  return cookie(OAUTH_NEXT_COOKIE, next, { maxAge: VERIFIER_MAX_AGE, path: "/api/account" });
}

export function readOauthNext(request) {
  return parseCookies(request)[OAUTH_NEXT_COOKIE] || "";
}

/** Attaches Set-Cookie headers to a Response without flattening them together. */
export function withCookies(response, cookies = []) {
  if (!cookies.length) return response;
  const headers = new Headers(response.headers);
  for (const value of cookies) headers.append("set-cookie", value);
  return new Response(response.body, { status: response.status, headers });
}

// -- session ----------------------------------------------------------------

/**
 * Who is making this request.
 *
 * Returns { user, cookies } — `cookies` is non-empty when the session had to
 * be refreshed, and the caller must pass it to withCookies() so the browser
 * keeps the new tokens. Returns null for anyone not signed in; being signed
 * out is not an error, it is most visitors.
 */
export async function readSession(request) {
  if (!isAccountsConfigured()) return null;
  const jar = parseCookies(request);
  const client = getAuthClient();

  const access = jar[ACCESS_COOKIE];
  if (access) {
    const { data, error } = await client.auth.getUser(access);
    if (!error && data?.user) return { user: data.user, accessToken: access, cookies: [] };
  }

  const refresh = jar[REFRESH_COOKIE];
  if (!refresh) return null;

  const { data, error } = await client.auth.refreshSession({ refresh_token: refresh });
  if (error || !data?.session || !data?.user) return null;

  return {
    user: data.user,
    accessToken: data.session.access_token,
    cookies: sessionCookies(data.session)
  };
}

/**
 * Ends the session at Supabase as well as in the browser.
 *
 * Clearing the cookie alone would leave a refresh token that still works for
 * thirty days if it had already been copied somewhere.
 */
export async function revokeSession(accessToken) {
  if (!accessToken) return;
  try {
    await fetch(`${config.supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: config.supabaseAnonKey,
        authorization: `Bearer ${accessToken}`
      }
    });
  } catch (error) {
    // The cookies are cleared either way; a failed revoke is logged, not shown.
    console.error("[accounts] logout failed", error?.message || error);
  }
}

// -- the person -------------------------------------------------------------

/**
 * The profile row, created on first sight.
 *
 * Note what is not here: no marketing flag is written, ever. Signing in is not
 * consent to be emailed about anything except signing in.
 */
const PROFILE_CORE_COLUMNS =
  "user_id, title, first_name, last_name, full_name, phone, marketing_email_opt_in, " +
  "pending_marketing_opt_in, profile_completed_at, created_at";

/**
 * The three opt-ins migration 0008 adds. Separated from the core columns
 * because an account has to work without them.
 */
const PROFILE_PREFERENCE_COLUMNS = [
  "personal_recommendations_opt_in",
  "occasion_reminders_opt_in",
  "personal_service_opt_in"
];

export const PROFILE_COLUMNS = `${PROFILE_CORE_COLUMNS}, ${PROFILE_PREFERENCE_COLUMNS.join(", ")}`;

/**
 * Whether a Postgres error is "you asked for a column I do not have".
 *
 * PostgREST answers PGRST204 from its schema cache; Postgres itself answers
 * 42703. Both mean the same thing here, and both used to take the whole
 * account system down with them.
 */
function isMissingColumn(error) {
  const code = String(error?.code || "");
  if (code === "PGRST204" || code === "42703") return true;
  return /could not find the .* column|column .* does not exist/i.test(String(error?.message || ""));
}

let warnedAboutPreferences = false;
function warnMissingPreferences(where) {
  if (warnedAboutPreferences) return;
  warnedAboutPreferences = true;
  console.error(
    `[accounts] ${where}: customer_profiles is missing the preference columns. `
      + "Run supabase/migrations/0008_wishlists_and_preferences.sql. "
      + "Accounts work without them; the three opt-ins cannot be stored until it is run."
  );
}

/**
 * Reads a profile, and keeps reading it when 0008 has not been run.
 *
 * Those three opt-ins are in the column list every profile read asks for, so
 * a database without them fails *every* account request — registration,
 * sign-in, the session check, the details page. The whole system goes dark
 * over three booleans that default to false. It falls back to the core
 * columns instead, which is the same account minus the opt-ins.
 */
/**
 * Writes a patch to a profile and returns the row, dropping the preference
 * columns if the database has not got them yet.
 *
 * The details page saves a name, a phone number and the opt-ins in one
 * patch. Without 0008 the whole patch is refused, so somebody could not
 * change their own name over three booleans. The name is saved; the
 * preferences come back as they really are, which is off.
 */
export async function updateProfileRow(serviceClient, userId, patch) {
  const write = (row, columns) => serviceClient
    .from("customer_profiles")
    .update(row)
    .eq("user_id", userId)
    .select(columns)
    .single();

  const full = await write(patch, PROFILE_COLUMNS);
  if (!full.error || !isMissingColumn(full.error)) return full;

  warnMissingPreferences("details save");
  const core = { ...patch };
  for (const column of PROFILE_PREFERENCE_COLUMNS) delete core[column];
  if (!Object.keys(core).length) {
    return { data: null, error: null, skipped: true };
  }
  return write(core, PROFILE_CORE_COLUMNS);
}

async function selectProfile(serviceClient, build) {
  const full = await build(PROFILE_COLUMNS);
  if (!full.error || !isMissingColumn(full.error)) return full;
  warnMissingPreferences("profile read");
  return build(PROFILE_CORE_COLUMNS);
}

export async function ensureProfile(serviceClient, user) {
  const { data, error } = await selectProfile(serviceClient, (columns) => serviceClient
    .from("customer_profiles")
    .select(columns)
    .eq("user_id", user.id)
    .maybeSingle());

  if (error) throw error;
  if (data) return data;

  const inserted = await selectProfile(serviceClient, (columns) => serviceClient
    .from("customer_profiles")
    .insert({
      user_id: user.id,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null
    })
    .select(columns)
    .single());

  if (inserted.error) throw inserted.error;
  return inserted.data;
}

/**
 * Attaches any guest orders placed with this person's confirmed address.
 *
 * The address is not passed in. The database function reads it from auth.users,
 * which is the only copy Supabase has actually proved.
 */
export async function claimOrders(serviceClient, user) {
  const { data, error } = await serviceClient.rpc("claim_orders_for_user", { p_user_id: user.id });
  if (error) {
    console.error("[accounts] order claim failed —", describeError(error));
    if (isMissingSchema(error)) console.error(MIGRATION_HINT);
    return 0;
  }
  return Number(data) || 0;
}

/**
 * Whether Supabase is saying "that is not here" rather than "that went wrong".
 *
 * PGRST205 is a table PostgREST cannot see, PGRST202 a function, 42P01 and
 * 42883 are Postgres saying the same two things directly. All four mean the
 * migrations have not been run against this project, which is a deployment
 * fact and not a fault of the request.
 */
function isMissingSchema(error) {
  return ["PGRST205", "PGRST202", "42P01", "42883"].includes(String(error?.code || ""));
}

const MIGRATION_HINT =
  "[accounts] this Supabase project has no account schema. Run supabase/migrations/0001…0006 in the SQL editor " +
  "(0005_accounts.sql creates customer_profiles and claim_orders_for_user). Signing in works without them; " +
  "orders and saved details do not.";

/**
 * Everything that happens after Supabase has minted a session, none of which
 * is allowed to cost somebody that session.
 *
 * A session is a proved mailbox. The profile row and the order claim are
 * conveniences built on top of it, so a database that cannot answer must not
 * be able to undo a sign-in Supabase has already granted. That is precisely
 * what used to happen: a correct code was accepted, the session was minted,
 * customer_profiles turned out not to exist in the project, the exception
 * became a generic 500, and the person was left signed out holding a one-time
 * code that had just been spent.
 *
 * Returns { profile, claimed }. A null profile is the degraded answer, never
 * a reason to refuse. The real cause is logged in full every time.
 */
export async function afterSignIn(user) {
  let profile = null;
  let claimed = 0;
  try {
    const serviceClient = getServiceClient();
    try {
      profile = await ensureProfile(serviceClient, user);
    } catch (error) {
      console.error("[accounts] profile unavailable —", describeError(error));
      if (isMissingSchema(error)) console.error(MIGRATION_HINT);
    }
    claimed = await claimOrders(serviceClient, user);
  } catch (error) {
    // No service client at all: the key is missing or empty. Same rule — say
    // so loudly, and still let the person in.
    console.error("[accounts] account store unreachable —", describeError(error));
  }
  return { profile, claimed };
}

/**
 * Does this address have an auth identity, an account, both or
 * neither.
 *
 * One round trip, and the only place an email address is matched to a user id.
 * The matching happens inside a security-definer function so that auth.users
 * stays unreadable from here and the address never has to be compared against
 * a list of every user.
 *
 * Returns { userId, authExists, profileComplete }. The two booleans are
 * deliberately not collapsed into one: registration needs to tell "nobody" from
 * "an identity with no account", because the second is a state the old sign-in
 * behaviour left real addresses in and it has to be completable rather than
 * refused.
 */
export async function lookupAccount(serviceClient, email) {
  const { data, error } = await serviceClient.rpc("my_marvell_account", { p_email: email });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    userId: row?.user_id || null,
    authExists: Boolean(row?.auth_exists),
    profileComplete: Boolean(row?.profile_complete)
  };
}

/** "Halim" and "Marshall" make "Marshall Halim"; either alone is enough. */
function joinName(first, last) {
  return [String(first || "").trim(), String(last || "").trim()].filter(Boolean).join(" ");
}

/**
 * Writes the registration form to the profile row, without completing it.
 *
 * Called while the address is still unproved, so nothing here may be taken as
 * a fact about the person: profile_completed_at stays null, and the newsletter
 * answer is parked in pending_marketing_opt_in rather than becoming a
 * subscription. Verifying the code is what turns both into the real thing.
 *
 * Upsert rather than insert, because the row may already exist — an auth
 * identity with no account is exactly the case this has to serve.
 */
export async function savePendingRegistration(serviceClient, userId, details) {
  const { title, firstName, lastName, marketing, personalRecommendations,
    occasionReminders, personalService } = details;

  const core = {
    user_id: userId,
    title,
    first_name: firstName,
    last_name: lastName,
    full_name: joinName(firstName, lastName),
    pending_marketing_opt_in: Boolean(marketing)
  };
  const preferences = {
    personal_recommendations_opt_in: Boolean(personalRecommendations),
    occasion_reminders_opt_in: Boolean(occasionReminders),
    personal_service_opt_in: Boolean(personalService)
  };

  const write = (row) => serviceClient
    .from("customer_profiles")
    .upsert(row, { onConflict: "user_id" });

  const { error } = await write({ ...core, ...preferences });
  if (!error) return;

  // Three opt-ins that default to false are not worth an account for. If
  // 0008 has not been run the columns are simply absent, and refusing the
  // registration over them means nobody can sign up at all — which is what
  // used to happen, with a 500 and "please try again shortly" that no
  // amount of trying would get past.
  if (!isMissingColumn(error)) throw error;
  warnMissingPreferences("registration");
  const retry = await write(core);
  if (retry.error) throw retry.error;
}

/**
 * Turns a registration into a completed account after the address
 * has been proved, either by a verified code or an authenticated session.
 *
 * Idempotent, and quiet when there is nothing to do: somebody signing back
 * into an account they already have passes through here untouched.
 *
 * The newsletter is handed to the existing subscription path and to no other.
 * A ticked box is only acted on now, after the address has been proved, and
 * the pending flag is cleared whether or not Brevo accepted it — a failed
 * subscription must not be retried silently on every later sign-in, and it
 * must never cost somebody the account they have just made.
 *
 * Returns the profile row as it now stands, or null if there is none.
 */
export async function completeProfile(serviceClient, user, subscribeToNewsletter) {
  const { data: profile, error } = await selectProfile(serviceClient, (columns) => serviceClient
    .from("customer_profiles")
    .select(columns)
    .eq("user_id", user.id)
    .maybeSingle());
  if (error) throw error;
  if (!profile) return null;

  const wantsNewsletter = Boolean(profile.pending_marketing_opt_in);
  const readyToComplete = Boolean(profile.title && profile.last_name);
  if (!wantsNewsletter && (profile.profile_completed_at || !readyToComplete)) return profile;

  let subscribed = profile.marketing_email_opt_in;
  if (wantsNewsletter && typeof subscribeToNewsletter === "function") {
    try {
      await subscribeToNewsletter(profile);
      subscribed = true;
    } catch (subscribeError) {
      console.error("[accounts] newsletter subscription failed —", describeError(subscribeError));
    }
  }

  const patch = { pending_marketing_opt_in: false };
  if (wantsNewsletter) {
    patch.marketing_email_opt_in = subscribed;
    if (subscribed) patch.marketing_opted_in_at = new Date().toISOString();
  }
  if (readyToComplete && !profile.profile_completed_at) {
    patch.profile_completed_at = new Date().toISOString();
  }

  const updated = await selectProfile(serviceClient, (columns) => serviceClient
    .from("customer_profiles")
    .update(patch)
    .eq("user_id", user.id)
    .select(columns)
    .single());
  if (updated.error) throw updated.error;
  return updated.data;
}

/** What the browser is allowed to know about the person signed in. */
export function publicUser(user, profile) {
  const fullName = profile?.full_name || user.user_metadata?.full_name || "";
  const lastName = profile?.last_name || "";
  return {
    id: user.id,
    email: user.email,
    email_confirmed: Boolean(user.email_confirmed_at),
    title: profile?.title || "",
    first_name: profile?.first_name || "",
    // Older rows have a full_name and no last_name. The greeting needs
    // something to print, and the whole name is a better fallback than an
    // empty one.
    last_name: lastName || fullName,
    full_name: fullName,
    // One fact, one column. Not "has a title and a name", which an
    // unverified registration also has, and not "has an auth identity", which
    // is what used to be mistaken for an account.
    profile_complete: Boolean(profile?.profile_completed_at),
    phone: profile?.phone || "",
    marketing_email_opt_in: Boolean(profile?.marketing_email_opt_in),
    personal_recommendations_opt_in: Boolean(profile?.personal_recommendations_opt_in),
    occasion_reminders_opt_in: Boolean(profile?.occasion_reminders_opt_in),
    personal_service_opt_in: Boolean(profile?.personal_service_opt_in),
    provider: user.app_metadata?.provider || "email",
    created_at: profile?.created_at || user.created_at
  };
}

// -- providers --------------------------------------------------------------

/**
 * Which sign-in providers Supabase actually has switched on.
 *
 * Asked rather than assumed, so "Continue with Google" is only ever drawn on a
 * door that opens. Cached for a few minutes: this is a deployment fact, not a
 * per-request one, and the panel asks on every open.
 */
let providerCache = { at: 0, providers: null };

export async function enabledProviders() {
  if (!isAccountsConfigured()) return {};
  if (providerCache.providers && Date.now() - providerCache.at < 5 * 60_000) {
    return providerCache.providers;
  }
  try {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: config.supabaseAnonKey }
    });
    if (!response.ok) throw new Error(`settings ${response.status}`);
    const data = await response.json();
    providerCache = { at: Date.now(), providers: data?.external || {} };
    return providerCache.providers;
  } catch (error) {
    console.error("[accounts] provider lookup failed", error?.message || error);
    return {};
  }
}

export const __testing = { parseCookies, cookie, isLoopbackOrigin, isMissingSchema, ACCESS_COOKIE, REFRESH_COOKIE, VERIFIER_COOKIE };
