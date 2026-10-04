/**
 * GET /api/account/google           begin "Continue with Google"
 * GET /api/account/google/callback  finish it
 *
 * The same session, reached a different way. Google proves the person owns the
 * address; Supabase mints the session; the session goes into the same httpOnly
 * cookies as the email route, so nothing downstream has to care which door
 * somebody came through.
 *
 * PKCE, SERVER SIDE
 * The exchange is done with a proof key rather than by trusting the redirect.
 * We generate a verifier, keep it in an httpOnly cookie scoped to
 * /api/account, and send only its SHA-256 challenge to Supabase. The code that
 * comes back in the URL is worthless without the verifier, which never leaves
 * this side. Supabase's own JavaScript client would keep that verifier in
 * localStorage; ours never touches the page.
 *
 * NOT FAKED
 * This does nothing at all until the Google provider is actually enabled on
 * the Supabase project. Rather than pretend, the start endpoint asks Supabase
 * what providers are on and says plainly when Google is not one of them, and
 * /api/account/session reports the same so the button is never drawn on a door
 * that does not open. See COMMERCE-SETUP.md for the exact console steps.
 */

import { createHash, randomBytes } from "node:crypto";
import { fail, serverError, methodNotAllowed, clientIp } from "./_lib/http.mjs";
import { config as settings, isAccountsConfigured, accountsConfigProblems } from "./_lib/env.mjs";
import { checkRateLimit } from "./_lib/ratelimit.mjs";
import {
  sessionCookies,
  verifierCookie,
  readVerifier,
  oauthNextCookie,
  readOauthNext,
  clearedCookies,
  afterSignIn,
  enabledProviders
} from "./_lib/accounts.mjs";

const base64url = (buffer) =>
  buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function safeNext(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw.slice(0, 200);
}

function redirect(to, cookies = []) {
  const headers = new Headers({
    location: to,
    "cache-control": "no-store",
    "x-robots-tag": "noindex, nofollow"
  });
  for (const value of cookies) headers.append("set-cookie", value);
  return new Response(null, { status: 303, headers });
}

export default async (request) => {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);

  const limit = checkRateLimit(`account-google:${clientIp(request)}`, { limit: 20, windowSeconds: 600 });
  if (!limit.allowed) return fail("rate_limited", "Please wait a few minutes.", 429);

  try {
    if (!isAccountsConfigured()) {
      console.error("[accounts] google sign-in is not configured —", accountsConfigProblems().join("; "));
      return fail("not_configured", "Accounts are not available yet.", 503);
    }

    const url = new URL(request.url);
    const isCallback = url.pathname.endsWith("/callback");
    const next = safeNext(isCallback ? readOauthNext(request) : url.searchParams.get("next"));

    // ---------------------------------------------------------------- start
    if (!isCallback) {
      const providers = await enabledProviders();
      if (!providers.google) {
        return fail(
          "provider_unavailable",
          "Continue with Google is not available yet. Please continue with email.",
          503
        );
      }

      const verifier = base64url(randomBytes(32));
      const challenge = base64url(createHash("sha256").update(verifier).digest());

      const authorize = new URL(`${settings.supabaseUrl}/auth/v1/authorize`);
      authorize.searchParams.set("provider", "google");
      // Supabase compares redirect_to with its allowlist, including the query.
      // Both configured URLs are exact callback paths, so keep next in an
      // httpOnly cookie instead of appending it to the callback URL.
      authorize.searchParams.set("redirect_to", new URL("/api/account/google/callback", settings.siteOrigin).toString());
      authorize.searchParams.set("code_challenge", challenge);
      authorize.searchParams.set("code_challenge_method", "s256");

      return redirect(authorize.toString(), [verifierCookie(verifier), oauthNextCookie(next)]);
    }

    // ------------------------------------------------------------- callback
    const failure = url.searchParams.get("error_description") || url.searchParams.get("error");
    if (failure) {
      console.error("[accounts] google returned an error", failure);
      return redirect(`${next}${next.includes("?") ? "&" : "?"}account=google-failed`, clearedCookies());
    }

    const code = String(url.searchParams.get("code") || "").trim();
    const verifier = readVerifier(request);
    if (!code || !verifier) {
      // No verifier means this redirect did not start here. Refusing it is the
      // whole reason the verifier exists.
      return redirect(`${next}${next.includes("?") ? "&" : "?"}account=google-failed`, clearedCookies());
    }

    const response = await fetch(`${settings.supabaseUrl}/auth/v1/token?grant_type=pkce`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: settings.supabaseAnonKey },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier })
    });

    const session = await response.json().catch(() => null);
    if (!response.ok || !session?.access_token || !session?.refresh_token || !session?.user) {
      console.error("[accounts] pkce exchange failed", response.status);
      return redirect(`${next}${next.includes("?") ? "&" : "?"}account=google-failed`, clearedCookies());
    }

    const { profile } = await afterSignIn(session.user);

    // Google proves the address and nothing else. It does not ask for a title
    // or a name, so it cannot by itself produce a completed
    // account — the same rule the email route follows. Somebody arriving this
    // way without one is sent to finish registration rather than being left
    // signed in and half made.
    const destination = profile?.profile_completed_at
      ? `${next}${next.includes("?") ? "&" : "?"}account=signed-in`
      : "/account?account=complete-profile";

    // The verifier has done its job; it is cleared by being re-set empty in
    // the same response that carries the session.
    return redirect(destination, [
      ...sessionCookies(session),
      ...clearedCookies().filter((value) => value.startsWith("mv_pkce=") || value.startsWith("mv_oauth_next="))
    ]);
  } catch (error) {
    return serverError("account-google", error);
  }
};

export const config = {
  path: ["/api/account/google", "/api/account/google/callback"],
  rateLimit: { windowSize: 600, windowLimit: 30, aggregateBy: ["ip"] }
};
