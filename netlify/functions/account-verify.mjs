/**
 * POST /api/account/verify   body: { email, code }
 *
 * Step two: the code from the email is exchanged for a session.
 *
 * Supabase does the comparing. We never hold the code, never store a hash of
 * it and never decide for ourselves whether one is right — if Supabase says
 * no, the answer is no. Codes are single-use and expire in an hour, and a
 * wrong one is answered identically whether the address exists or not.
 *
 * WHAT HAPPENS ON SUCCESS
 *   1. The session goes into httpOnly cookies. It never reaches page script.
 *   2. A registration waiting on this address becomes a real
 *      account: profile_completed_at is set, and only here. This is the one
 *      moment somebody goes from "has proved a mailbox" to "has an account".
 *   3. A newsletter box ticked during registration is handed to the existing
 *      newsletter integration, now that the address has been proved.
 *   4. Orders placed as a guest with this now-confirmed address are attached,
 *      by a database function that reads the address from auth.users rather
 *      than from anything the browser said.
 */

import { ok, fail, serverError, methodNotAllowed, readJsonBody, clientIp, describeError } from "./_lib/http.mjs";
import { cleanEmail, cleanText, ValidationError } from "./_lib/validate.mjs";
import { getServiceClient } from "./_lib/supabase.mjs";
import { subscribeContact } from "./_lib/brevo.mjs";
import { isAccountsConfigured } from "./_lib/env.mjs";
import { checkRateLimit } from "./_lib/ratelimit.mjs";
import {
  OTP_MIN_LENGTH,
  OTP_MAX_LENGTH,
  getAuthClient,
  sessionCookies,
  withCookies,
  afterSignIn,
  completeProfile,
  publicUser
} from "./_lib/accounts.mjs";

const REFUSED = "We couldn't sign you in. Please try again.";

/**
 * The newsletter box from the registration form, acted on at the only moment
 * it may be: after the address has been proved.
 *
 * It goes through subscribeContact, the same call the newsletter form makes,
 * so there is one subscription path and one consent record rather than a
 * second one owned by the account system. `source` says where the decision was
 * made, which is the thing our own record needs to be able to show.
 */
function newsletterSubscriber(user) {
  return (profile) =>
    subscribeContact({
      email: user.email,
      firstName: profile?.first_name || "",
      lastName: profile?.last_name || "",
      title: profile?.title || "",
      emailOptIn: true,
      whatsappOptIn: false,
      source: "my-marvell"
    });
}

export default async (request) => {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);

  // Guessing is the attack on this endpoint, so the limit is the tightest in
  // the project. Six digits at minimum and ten tries is not a lottery worth
  // entering, and a longer code only makes the odds worse for a guesser.
  const limit = checkRateLimit(`account-verify:${clientIp(request)}`, { limit: 10, windowSeconds: 600 });
  if (!limit.allowed) {
    return fail("rate_limited", "Too many attempts. Please wait a few minutes.", 429, {
      retry_after_seconds: limit.retryAfterSeconds
    });
  }

  try {
    if (!isAccountsConfigured()) {
      return fail("not_configured", "Accounts are not available yet.", 503);
    }

    const body = await readJsonBody(request, 4 * 1024);
    const email = cleanEmail(body?.email);
    // Digits only, and bounded by what Supabase can actually have issued.
    // The length is not pinned to one number here: Supabase's OTP length is a
    // project setting, and hard-coding one is exactly how an 8-digit code
    // became unusable in a 6-digit field.
    const code = cleanText(body?.code, { field: "code", max: OTP_MAX_LENGTH + 2 }).replace(/\D/g, "");
    if (code.length < OTP_MIN_LENGTH || code.length > OTP_MAX_LENGTH) {
      return fail("invalid_code", REFUSED, 400);
    }

    const auth = getAuthClient();
    const { data, error } = await auth.auth.verifyOtp({ email, token: code, type: "email" });

    if (error || !data?.session || !data?.user) {
      // Deliberately not logged with the address: a failed sign-in is not an
      // event worth keeping somebody's email in a log for.
      return fail("invalid_code", REFUSED, 401);
    }

    // Deliberately after the session exists and deliberately unable to fail
    // it: see afterSignIn(). The code has been spent by this point, so an
    // exception here would cost somebody a sign-in they had already earned.
    const { profile, claimed } = await afterSignIn(data.user);

    // And now the one step that turns a verified mailbox into an account.
    // Same rule as above: it is allowed to fail, loudly, without taking the
    // session with it. Somebody whose completion failed is signed in with an
    // incomplete profile, which the panel can see and offer to finish.
    let completed = profile;
    try {
      completed = (await completeProfile(getServiceClient(), data.user, newsletterSubscriber(data.user))) || profile;
    } catch (error) {
      console.error("[account-verify] profile not completed —", describeError(error));
    }

    return withCookies(
      ok({ user: publicUser(data.user, completed), claimed_orders: claimed }),
      sessionCookies(data.session)
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return fail(error.publicCode || "invalid_request", REFUSED, 400);
    }
    if (error?.publicCode === "invalid_json" || error?.publicCode === "payload_too_large") {
      return fail(error.publicCode, "That request could not be read.", 400);
    }
    return serverError("account-verify", error);
  }
};

export const config = {
  path: "/api/account/verify",
  rateLimit: { windowSize: 600, windowLimit: 20, aggregateBy: ["ip"] }
};
