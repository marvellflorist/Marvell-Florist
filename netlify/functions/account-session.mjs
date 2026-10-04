/**
 * GET    /api/account/session   who is signed in, if anyone
 * PATCH  /api/account/session   update the person's own details
 * DELETE /api/account/session   sign out
 *
 * The panel asks this on open. Being signed out is the ordinary answer and is
 * not an error: most visitors are guests, guests can buy everything, and the
 * panel is drawn from this answer rather than from anything remembered in the
 * browser.
 *
 * Identity comes from the cookie and from Supabase's verification of it. The
 * request body never says who somebody is — only what they want to change
 * about themselves.
 */

import { ok, fail, serverError, methodNotAllowed, readJsonBody, describeError } from "./_lib/http.mjs";
import { cleanText, cleanPhone, cleanBoolean, ValidationError } from "./_lib/validate.mjs";
import { getServiceClient } from "./_lib/supabase.mjs";
import { subscribeContact, unsubscribeContact, BrevoError } from "./_lib/brevo.mjs";
import { isAccountsConfigured } from "./_lib/env.mjs";
import {
  readSession,
  revokeSession,
  clearedCookies,
  withCookies,
  afterSignIn,
  PROFILE_COLUMNS,
  updateProfileRow,
  publicUser,
  enabledProviders
} from "./_lib/accounts.mjs";

export default async (request) => {
  const method = request.method.toUpperCase();
  if (!["GET", "PATCH", "DELETE"].includes(method)) {
    return methodNotAllowed(["GET", "PATCH", "DELETE"]);
  }

  try {
    if (!isAccountsConfigured()) {
      // Not an error the shopper needs to see: the panel simply offers the
      // guest routes instead.
      return ok({ signed_in: false, available: false, providers: { google: false } });
    }

    const session = await readSession(request);

    if (method === "DELETE") {
      if (session) await revokeSession(session.accessToken);
      const providers = await enabledProviders();
      return withCookies(
        ok({ signed_in: false, available: true, providers: { google: Boolean(providers.google) } }),
        clearedCookies()
      );
    }

    if (!session) {
      const providers = await enabledProviders();
      return ok({ signed_in: false, available: true, providers: { google: Boolean(providers.google) } });
    }

    // Who this is comes from the cookie Supabase verified, so it is already
    // settled. The profile row is the extra, and it cannot unsettle it: a
    // profile store that is unreachable degrades this answer rather than
    // turning a signed-in person into a 500. afterSignIn() logs why.
    let { profile, claimed } = await afterSignIn(session.user);

    if (method === "PATCH") {
      const body = await readJsonBody(request, 4 * 1024);
      const patch = {};

      if (body?.title !== undefined) {
        // A closed set, checked here and again by the database. Free text
        // would be a free-text field printed back at the top of the panel.
        const wanted = String(body.title ?? "").trim().toLowerCase();
        if (wanted && !["mr", "mrs", "ms", "miss", "mx"].includes(wanted)) {
          return fail("invalid_title", "Please choose a title.", 400, { field: "title" });
        }
        patch.title = wanted || null;
      }
      if (body?.first_name !== undefined) {
        patch.first_name =
          cleanText(body.first_name, { field: "first_name", label: "first name", max: 80 }) || null;
      }
      if (body?.last_name !== undefined) {
        patch.last_name =
          cleanText(body.last_name, { field: "last_name", label: "last name", max: 80 }) || null;
      }
      if (patch.first_name !== undefined || patch.last_name !== undefined) {
        // full_name is derived, never typed. Keeping it in step here means
        // everything that still reads it stays correct.
        const first = patch.first_name !== undefined ? patch.first_name : profile?.first_name;
        const last = patch.last_name !== undefined ? patch.last_name : profile?.last_name;
        patch.full_name = [first, last].map((part) => String(part || "").trim()).filter(Boolean).join(" ") || null;
      }
      if (body?.phone !== undefined) {
        const raw = String(body.phone ?? "").trim();
        patch.phone = raw ? cleanPhone(raw) : null;
      }

      // The email address is not editable here and has no branch above. It is
      // what Supabase has proved, it is what guest orders are matched on, and
      // a settings field that changed it would change who somebody is.

      // Preferences. Newsletter membership and account membership stay
      // independent: this is the person themselves, signed in, saying yes or
      // no, and it goes through the same Brevo path the newsletter form uses
      // rather than a second subscription mechanism owned by accounts.
      if (body?.marketing_email_opt_in !== undefined) {
        const wanted = cleanBoolean(body.marketing_email_opt_in);
        if (wanted !== Boolean(profile?.marketing_email_opt_in)) {
          try {
            if (wanted) {
              await subscribeContact({
                email: session.user.email,
                firstName: profile?.first_name || "",
                lastName: profile?.last_name || "",
                title: profile?.title || "",
                emailOptIn: true,
                whatsappOptIn: false,
                source: "my-marvell"
              });
            } else {
              await unsubscribeContact(session.user.email);
            }
          } catch (error) {
            console.error("[account-session] newsletter preference not applied —", describeError(error));
            return fail(
              error instanceof BrevoError ? error.code : "newsletter_unavailable",
              "We couldn't update your preferences. Please try again.",
              502
            );
          }
          patch.marketing_email_opt_in = wanted;
          patch.marketing_opted_in_at = wanted ? new Date().toISOString() : null;
        }
      }

      for (const field of ["personal_recommendations_opt_in", "occasion_reminders_opt_in", "personal_service_opt_in"]) {
        if (body?.[field] !== undefined) patch[field] = cleanBoolean(body[field]);
      }

      if (Object.keys(patch).length) {
        // Unlike a sign-in, this is a write somebody asked for: if it cannot
        // happen they need to be told, rather than shown their old details
        // back as though they had been saved.
        if (!profile) {
          return fail(
            "profile_unavailable",
            "Your details could not be saved. Please try again in a moment.",
            503
          );
        }
        try {
          const updated = await updateProfileRow(getServiceClient(), session.user.id, patch);
          if (updated.error) throw updated.error;
          // Nothing left to write once the preference columns were dropped:
          // the profile already says what it says.
          if (!updated.skipped) profile = updated.data;
        } catch (error) {
          console.error("[account-session] details not saved —", describeError(error));
          return fail(
            "profile_unavailable",
            "Your details could not be saved. Please try again in a moment.",
            503
          );
        }
      }
    }

    return withCookies(
      ok({ signed_in: true, available: true, user: publicUser(session.user, profile), claimed_orders: claimed }),
      session.cookies
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return fail(error.publicCode || "invalid_request", error.message, 400);
    }
    if (error?.publicCode === "invalid_json" || error?.publicCode === "payload_too_large") {
      return fail(error.publicCode, "That request could not be read.", 400);
    }
    return serverError("account-session", error);
  }
};

export const config = {
  path: "/api/account/session",
  rateLimit: { windowSize: 60, windowLimit: 60, aggregateBy: ["ip"] }
};
