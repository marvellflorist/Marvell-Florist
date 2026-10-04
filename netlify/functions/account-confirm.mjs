/**
 * GET /api/account/confirm?token_hash=…&next=/…
 *
 * The link in the sign-in email. Same exchange as the typed code, arriving a
 * different way: the hashed token is handed to Supabase, and what comes back
 * is put into httpOnly cookies before the browser is sent on to the page the
 * person started from.
 *
 * The session never appears in a URL, a fragment or page script. That is why
 * this link points at us rather than at Supabase's own action link, which
 * finishes by putting tokens in the address bar — where they end up in
 * history, in referrers and within reach of any script on the page.
 */

import { fail, serverError, methodNotAllowed, clientIp, describeError } from "./_lib/http.mjs";
import { getServiceClient } from "./_lib/supabase.mjs";
import { subscribeContact } from "./_lib/brevo.mjs";
import { isAccountsConfigured } from "./_lib/env.mjs";
import { checkRateLimit } from "./_lib/ratelimit.mjs";
import {
  getAuthClient,
  sessionCookies,
  afterSignIn,
  completeProfile
} from "./_lib/accounts.mjs";

/** Only a path on this site. An open redirect on a sign-in link is a gift. */
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

  const limit = checkRateLimit(`account-confirm:${clientIp(request)}`, { limit: 20, windowSeconds: 600 });
  if (!limit.allowed) {
    return fail("rate_limited", "Too many attempts. Please wait a few minutes.", 429);
  }

  try {
    if (!isAccountsConfigured()) {
      return fail("not_configured", "Accounts are not available yet.", 503);
    }

    const url = new URL(request.url);
    const tokenHash = String(url.searchParams.get("token_hash") || "").trim();
    const next = safeNext(url.searchParams.get("next"));

    if (!tokenHash || tokenHash.length > 512) {
      return redirect(`${next}${next.includes("?") ? "&" : "?"}account=expired`);
    }

    const auth = getAuthClient();
    const { data, error } = await auth.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });

    if (error || !data?.session || !data?.user) {
      // A used or stale link is ordinary, not exceptional: the panel says so
      // and offers a new code.
      return redirect(`${next}${next.includes("?") ? "&" : "?"}account=expired`);
    }

    await afterSignIn(data.user);

    // The link finishes a registration exactly as the typed code does. Same
    // rule: allowed to fail loudly, never allowed to cost the session.
    try {
      await completeProfile(getServiceClient(), data.user, (profile) =>
        subscribeContact({
          email: data.user.email,
          firstName: profile?.first_name || "",
          lastName: profile?.last_name || "",
          title: profile?.title || "",
          emailOptIn: true,
          whatsappOptIn: false,
          source: "my-marvell"
        })
      );
    } catch (error) {
      console.error("[account-confirm] profile not completed —", describeError(error));
    }

    return redirect(
      `${next}${next.includes("?") ? "&" : "?"}account=signed-in`,
      sessionCookies(data.session)
    );
  } catch (error) {
    return serverError("account-confirm", error);
  }
};

export const config = {
  path: "/api/account/confirm",
  rateLimit: { windowSize: 600, windowLimit: 30, aggregateBy: ["ip"] }
};
