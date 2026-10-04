/**
 * POST /api/newsletter
 *
 * Browser -> here -> Brevo. The Brevo API key stays on this side of the line.
 *
 * Consent is recorded as two independent decisions. Someone can give a phone
 * number for order contact and still not have agreed to WhatsApp marketing, so
 * a number alone is never treated as permission; WHATSAPP_OPT_IN is.
 *
 * Every consent event is also written to our own newsletter_events table, so
 * we hold proof of who agreed to what and when, independently of Brevo.
 */

import { ok, fail, serverError, methodNotAllowed, readJsonBody, clientIp } from "./_lib/http.mjs";
import {
  cleanText,
  cleanEmail,
  cleanPhone,
  cleanBoolean,
  ValidationError
} from "./_lib/validate.mjs";
import { subscribeContact, BrevoError } from "./_lib/brevo.mjs";
import { getServiceClient } from "./_lib/supabase.mjs";
import { isSupabaseConfigured, isBrevoConfigured, brevoConfigProblems } from "./_lib/env.mjs";
import { checkRateLimit } from "./_lib/ratelimit.mjs";

const ALLOWED_SOURCES = new Set([
  "homepage-drawer",
  "footer",
  "header",
  "checkout",
  "shop",
  "collection",
  "product",
  "journal",
  "unknown"
]);

/** Free-form sources are accepted but normalised, so a collection slug works. */
function normaliseSource(value) {
  const raw = cleanText(value, { field: "source", max: 60 }).toLowerCase();
  if (!raw) return "unknown";
  if (ALLOWED_SOURCES.has(raw)) return raw;
  const slug = raw.replace(/[^a-z0-9-]/g, "").slice(0, 40);
  return slug || "unknown";
}

/**
 * Says that a consent record was lost, and says why, without saying who.
 *
 * `code` and `message` name the fault; `details` and `hint` are deliberately
 * left out. Postgres puts the offending row in DETAIL for a constraint
 * violation — "Failing row contains (…, someone@example.com, …)" — so logging
 * the whole error would write a subscriber's address, name and phone number
 * into the function log every time one of these failed. The constraint name
 * inside `message` is enough to find the cause.
 *
 * `source` is which form it came from. It is not personal data and it is the
 * one thing that makes a run of these diagnosable.
 */
function logConsentFailure(error, source) {
  const code = error?.code ? ` code=${error.code}` : "";
  console.error(
    `[newsletter] consent record NOT written (subscription at Brevo did succeed) — ` +
      `source=${source}${code} ${error?.message || String(error)}`
  );
}

export default async (request) => {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);

  const limit = checkRateLimit(`newsletter:${clientIp(request)}`, { limit: 5, windowSeconds: 300 });
  if (!limit.allowed) {
    return fail("rate_limited", "Please wait a little before trying again.", 429, {
      retry_after_seconds: limit.retryAfterSeconds
    });
  }

  try {
    const body = await readJsonBody(request, 8 * 1024);

    // Honeypot. Answer as though it worked so the bot does not retune.
    if (cleanText(body.company, { field: "company", max: 200 })) {
      return ok({ subscribed: true });
    }

    // Time trap: a human takes longer than two seconds to fill three fields.
    const elapsed = Number.parseInt(String(body.elapsed_ms ?? ""), 10);
    if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 1200) {
      return ok({ subscribed: true });
    }

    // The drawer posts camelCase. snake_case is accepted too, so an older
    // cached copy of the script, or a future form, cannot silently drop a
    // consent flag by using the other spelling.
    const pick = (camel, snake) => (body[camel] !== undefined ? body[camel] : body[snake]);

    const email = cleanEmail(pick("email", "email"), { required: true });
    // A name is offered by the dialog and never required by it: a mailing
    // list that will not take an address without a full name is asking for
    // something it does not need.
    const firstName = cleanText(pick("firstName", "first_name"), {
      field: "firstName", label: "first name", max: 80
    });
    const lastName = cleanText(pick("lastName", "last_name"), {
      field: "lastName", label: "last name", max: 80
    });
    // A closed set, and it must hold every civility the dialog offers or the
    // chosen one is quietly dropped on the way through. The dialog requires a
    // title and no longer offers an option that declines, so an empty value
    // here means an older cached script or a direct caller — not a choice.
    // Anything unrecognised is dropped rather than refused: a stray value is
    // not a reason to lose somebody's subscription, and the endpoint stays
    // able to accept a submission from a page that has not reloaded yet.
    const rawTitle = String(pick("title", "title") ?? "").trim().toLowerCase();
    const title = ["mr", "mrs", "miss", "ms", "mx"].includes(rawTitle) ? rawTitle : "";
    const emailOptIn = cleanBoolean(pick("emailOptIn", "email_opt_in"));
    const whatsappOptIn = cleanBoolean(pick("whatsappOptIn", "whatsapp_opt_in"));
    const phone = cleanPhone(pick("whatsapp", "phone"), { required: false });
    const source = normaliseSource(body.source);

    // Sending an address with neither box ticked is not a subscription.
    if (!emailOptIn && !whatsappOptIn) {
      return fail(
        "consent_required",
        "Please choose how you would like to hear from us.",
        400,
        { field: "emailOptIn" }
      );
    }

    // A number without the WhatsApp box is contact detail, not consent.
    if (whatsappOptIn && !phone) {
      return fail(
        "phone_required",
        "Please add your WhatsApp number, or untick the WhatsApp option.",
        400,
        { field: "whatsapp" }
      );
    }

    if (!isBrevoConfigured()) {
      // Named, not generic: "not configured" alone sends you to the Brevo
      // dashboard when the actual fault is an empty line in .env.
      console.error("[newsletter] Brevo is not configured —", brevoConfigProblems().join("; "));
      return fail(
        "not_configured",
        "Our newsletter is not quite ready. Please try again soon.",
        503
      );
    }

    await subscribeContact({
      email,
      firstName,
      lastName,
      title,
      phone: whatsappOptIn ? phone : "",
      emailOptIn,
      whatsappOptIn,
      source
    });

    // Our own consent record.
    //
    // The subscription at Brevo has already happened by this point, so a
    // failure here may not undo it and may not be retried by repeating the
    // call above — that would create a second consent event, or a second
    // contact write, for one decision. It is recorded as a gap and nothing
    // else, loudly enough to be found.
    //
    // The error is INSPECTED rather than caught. supabase-js resolves with
    // { data, error } instead of throwing, so the try/catch this used to rely
    // on never fired: a check-constraint violation, a missing table or a
    // revoked grant all returned quietly and the consent record vanished with
    // no log line at all.
    if (isSupabaseConfigured()) {
      try {
        const { error } = await getServiceClient()
          .from("newsletter_events")
          .insert({
            email,
            first_name: firstName || null,
            last_name: lastName || null,
            title: title || null,
            phone: whatsappOptIn && phone ? phone : null,
            source,
            email_opt_in: emailOptIn,
            whatsapp_opt_in: whatsappOptIn
          });
        if (error) logConsentFailure(error, source);
      } catch (error) {
        // A thrown one as well: a network fault reaches here rather than the
        // branch above, and it is the same gap with the same consequence.
        logConsentFailure(error, source);
      }
    }

    return ok({ subscribed: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return fail("invalid_input", error.publicMessage, 400, { field: error.field });
    }
    if (error instanceof BrevoError) {
      // Brevo's own wording never reaches the shopper.
      const status = error.code === "not_configured" ? 503 : 400;
      const message =
        error.code === "invalid_contact"
          ? "We could not accept those details. Please check your email address."
          : "Our newsletter is unavailable at the moment. Please try again shortly.";
      return fail(error.code, message, status);
    }
    if (error?.publicCode === "invalid_json" || error?.publicCode === "payload_too_large") {
      return fail(error.publicCode, "That request could not be read.", 400);
    }
    return serverError("newsletter", error);
  }
};

export const config = {
  path: "/api/newsletter",
  rateLimit: { windowSize: 300, windowLimit: 10, aggregateBy: ["ip"] }
};
