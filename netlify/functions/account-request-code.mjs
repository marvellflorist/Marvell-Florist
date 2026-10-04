/**
 * POST /api/account/request-code   body: { email, next }
 *
 * SIGN IN, and only sign in. This endpoint is for somebody who already has My
 * Marvell and wants back in.
 *
 * WHAT CHANGED, AND WHY
 * This used to create an account. An address Supabase had not seen was made
 * into an auth user here, on the reasoning that signing in and signing up are
 * one act when there is no password to set. They are not: an auth identity is
 * not an account, and treating them as the same thing meant an
 * address that had never registered could sign in, and was then refused by
 * Create your account as a duplicate.
 *
 * So nothing here creates anything. An address with no completed profile is
 * told so, and sent to registration.
 *
 * ENUMERATION
 * This does now answer "is there an account for this address", which the old
 * single sentence deliberately did not. That is the cost of the behaviour
 * being asked for: a sign-in form that cannot say "no account" is a sign-in
 * form that has to invent one. The limits below are what is left holding the
 * line, so they are tight and there are two of them, by IP and by address.
 */

import { ok, fail, serverError, methodNotAllowed, readJsonBody, clientIp } from "./_lib/http.mjs";
import { cleanEmail, ValidationError } from "./_lib/validate.mjs";
import { getServiceClient } from "./_lib/supabase.mjs";
import { BrevoError } from "./_lib/brevo.mjs";
import { isAccountsConfigured, accountsConfigProblems } from "./_lib/env.mjs";
import { checkRateLimit } from "./_lib/ratelimit.mjs";
import { lookupAccount } from "./_lib/accounts.mjs";
import { sendSignInCode, safeNext } from "./_lib/signin-code.mjs";

const SENT_MESSAGE = "Your code is on its way.";
const NOT_FOUND_MESSAGE = "We couldn't find an account with this email.";

export default async (request) => {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);

  const byIp = checkRateLimit(`account-code:${clientIp(request)}`, { limit: 5, windowSeconds: 600 });
  if (!byIp.allowed) {
    return fail("rate_limited", "Too many attempts. Please wait a few minutes.", 429, {
      retry_after_seconds: byIp.retryAfterSeconds
    });
  }

  try {
    if (!isAccountsConfigured()) {
      console.error("[accounts] sign-in is not configured —", accountsConfigProblems().join("; "));
      return fail("not_configured", "Accounts are not available yet. You can still order as a guest.", 503);
    }

    const body = await readJsonBody(request, 4 * 1024);
    const email = cleanEmail(body?.email);
    const next = safeNext(body?.next);

    const byEmail = checkRateLimit(`account-code-email:${email}`, { limit: 4, windowSeconds: 900 });
    if (!byEmail.allowed) {
      return fail("rate_limited", "Too many attempts. Please wait a few minutes.", 429, {
        retry_after_seconds: byEmail.retryAfterSeconds
      });
    }

    const supabase = getServiceClient();
    const account = await lookupAccount(supabase, email);

    // An auth identity on its own is not an account, so it is answered the
    // same way as nothing at all. The one difference is invisible from here
    // and lives in registration, which will complete that identity rather
    // than refuse it.
    if (!account.profileComplete) {
      return fail("account_not_found", NOT_FOUND_MESSAGE, 404);
    }

    const { codeLength } = await sendSignInCode(supabase, email, next);
    return ok({ message: SENT_MESSAGE, code_length: codeLength });
  } catch (error) {
    if (error instanceof ValidationError) {
      return fail(error.publicCode || "invalid_email", error.message, 400);
    }
    if (error instanceof BrevoError) {
      return fail(error.code, error.message, error.code === "rate_limited" ? 429 : 502);
    }
    if (error?.publicCode === "invalid_json" || error?.publicCode === "payload_too_large") {
      return fail(error.publicCode, "That request could not be read.", 400);
    }
    return serverError("account-request-code", error);
  }
};

export const config = {
  path: "/api/account/request-code",
  rateLimit: { windowSize: 600, windowLimit: 12, aggregateBy: ["ip"] }
};
