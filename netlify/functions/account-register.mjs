/**
 * POST /api/account/register
 *   body: { title, first_name, last_name, email, email_confirm, newsletter }
 *
 * Create your account from one form. A signed-out person verifies the code from
 * /api/account/verify; a signed-in person with a verified address has already
 * proved the mailbox and can complete the same form directly.
 *
 * AN AUTH USER IS NOT AN ACCOUNT
 * For a signed-out person, this writes an unverified registration and sends a
 * code. profile_completed_at stays null until that code comes back. For an
 * authenticated person, the server checks the verified session and matching
 * email before completing the profile. In both cases the person submits the
 * required fields; merely having an auth.users row completes nothing.
 *
 * AN EXISTING AUTH IDENTITY IS NOT A CONFLICT
 * An address may already have an auth user and no account. That is the state
 * the old sign-in behaviour left addresses in, and it is the state this
 * endpoint exists to let people out of. It reuses the identity and completes
 * the profile rather than refusing a duplicate. Only a *completed* account is
 * a conflict, and that one is sent to sign in.
 *
 * NEWSLETTER
 * The box is one answer on one form and it is not consent to anything else.
 * It is parked as pending_marketing_opt_in and acted on only after the address
 * is verified, by the existing newsletter integration. Unticked subscribes
 * nobody, and creating an account never implies it either way.
 */

import { ok, fail, serverError, methodNotAllowed, readJsonBody, clientIp } from "./_lib/http.mjs";
import { cleanEmail, cleanText, cleanBoolean, ValidationError } from "./_lib/validate.mjs";
import { getServiceClient } from "./_lib/supabase.mjs";
import { BrevoError, subscribeContact } from "./_lib/brevo.mjs";
import { isAccountsConfigured, accountsConfigProblems } from "./_lib/env.mjs";
import { checkRateLimit } from "./_lib/ratelimit.mjs";
import {
  lookupAccount,
  savePendingRegistration,
  readSession,
  completeProfile,
  publicUser,
  withCookies
} from "./_lib/accounts.mjs";
import { sendSignInCode, safeNext } from "./_lib/signin-code.mjs";

// The five the form offers, and the same five the newsletter form has offered
// for a while, so one person is addressed the same way by both.
const TITLES = ["mr", "mrs", "ms", "miss", "mx"];

export default async (request) => {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);

  const byIp = checkRateLimit(`account-register:${clientIp(request)}`, { limit: 5, windowSeconds: 600 });
  if (!byIp.allowed) {
    return fail("rate_limited", "Too many attempts. Please wait a few minutes.", 429, {
      retry_after_seconds: byIp.retryAfterSeconds
    });
  }

  try {
    if (!isAccountsConfigured()) {
      console.error("[accounts] registration is not configured —", accountsConfigProblems().join("; "));
      return fail("not_configured", "Accounts are not available yet. You can still order as a guest.", 503);
    }

    const body = await readJsonBody(request, 4 * 1024);

    const title = String(body?.title ?? "").trim().toLowerCase();
    if (!TITLES.includes(title)) {
      return fail("invalid_title", "Please choose a title.", 400, { field: "title" });
    }

    const firstName = cleanText(body?.first_name, { field: "first_name", label: "first name", max: 80 });
    if (!firstName) {
      return fail("invalid_first_name", "Please enter your first name.", 400, { field: "first_name" });
    }
    const lastName = cleanText(body?.last_name, { field: "last_name", label: "last name", max: 80 });
    if (!lastName) {
      return fail("invalid_last_name", "Please enter your last name.", 400, { field: "last_name" });
    }

    const email = cleanEmail(body?.email);
    // Checked on both sides. A typo here is not a rejected form, it is a code
    // sent to a stranger and an account nobody can reach.
    const confirm = String(body?.email_confirm ?? "").trim().toLowerCase();
    if (confirm !== email) {
      return fail("email_mismatch", "The email addresses do not match.", 400, { field: "email_confirm" });
    }

    const marketing = cleanBoolean(body?.newsletter);
    const personalRecommendations = cleanBoolean(body?.personal_recommendations_opt_in);
    const occasionReminders = cleanBoolean(body?.occasion_reminders_opt_in);
    const personalService = cleanBoolean(body?.personal_service_opt_in);
    const preferences = { title, firstName, lastName, marketing,
      personalRecommendations, occasionReminders, personalService };
    const next = safeNext(body?.next);

    const byEmail = checkRateLimit(`account-register-email:${email}`, { limit: 4, windowSeconds: 900 });
    if (!byEmail.allowed) {
      return fail("rate_limited", "Too many attempts. Please wait a few minutes.", 429, {
        retry_after_seconds: byEmail.retryAfterSeconds
      });
    }

    const supabase = getServiceClient();
    const session = await readSession(request);
    if (session && cleanEmail(session.user.email) !== email) {
      return fail("email_mismatch", "Use the email address you signed in with.", 400, { field: "email" });
    }
    const account = await lookupAccount(supabase, email);

    if (account.profileComplete) {
      return fail(
        "account_exists",
        "You already have an account with this email. Please sign in.",
        409,
        { field: "email" }
      );
    }

    // Google has already proved this mailbox. The same registration fields
    // complete its existing identity without making the person prove the
    // address a second time. An auth user alone still never counts as an
    // account: completion happens only after this explicit form submission.
    if (session) {
      if (!session.user.email_confirmed_at) {
        return fail("email_unverified", "Please verify your email address first.", 403);
      }
      if (account.userId && account.userId !== session.user.id) {
        return fail("account_conflict", "Please sign in again before continuing.", 409);
      }
      await savePendingRegistration(supabase, session.user.id, preferences);
      const profile = await completeProfile(supabase, session.user, (pending) =>
        subscribeContact({
          email: session.user.email,
          firstName: pending.first_name || "",
          lastName: pending.last_name || "",
          title: pending.title || "",
          emailOptIn: true,
          whatsappOptIn: false,
          source: "my-marvell"
        })
      );
      if (!profile?.profile_completed_at) {
        return fail("profile_unavailable", "Your details could not be saved. Please try again.", 503);
      }
      return withCookies(ok({ user: publicUser(session.user, profile) }), session.cookies);
    }

    // No identity yet: make one, unconfirmed. Reading the code is what
    // confirms it, and there is no password to set.
    let userId = account.userId;
    if (!userId) {
      const created = await supabase.auth.admin.createUser({ email, email_confirm: false });
      if (created.error) throw created.error;
      userId = created.data?.user?.id;
    }
    if (!userId) throw new Error("no user id after registration");

    await savePendingRegistration(supabase, userId, preferences);

    // Registration knows the name and knows this is a first arrival, so the
    // mail greets the person and asks them to complete the account rather
    // than to sign in to one they do not have yet.
    const { codeLength } = await sendSignInCode(supabase, email, next, {
      name: firstName,
      registering: true
    });

    return ok({ email, code_length: codeLength });
  } catch (error) {
    if (error instanceof ValidationError) {
      return fail(error.publicCode || "invalid_request", error.message, 400, { field: error.field });
    }
    if (error instanceof BrevoError) {
      return fail(error.code, error.message, error.code === "rate_limited" ? 429 : 502);
    }
    if (error?.publicCode === "invalid_json" || error?.publicCode === "payload_too_large") {
      return fail(error.publicCode, "That request could not be read.", 400);
    }
    return serverError("account-register", error);
  }
};

export const config = {
  path: "/api/account/register",
  rateLimit: { windowSize: 600, windowLimit: 12, aggregateBy: ["ip"] }
};
