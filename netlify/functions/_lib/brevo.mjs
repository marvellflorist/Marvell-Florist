/**
 * Brevo contact service.
 *
 * The API key is read here and nowhere else, and never crosses to the browser.
 * Brevo's own error bodies can echo submitted data, so they are logged and
 * replaced with a plain apology before anything is returned.
 *
 * Consent model: an email address and a phone number are contact details, not
 * permission. EMAIL_OPT_IN and WHATSAPP_OPT_IN carry the two decisions
 * separately, and the phone number is only sent to Brevo at all when the
 * subscriber actually ticked the WhatsApp box.
 *
 * Sending identities live here too, so that campaign and receipt code added
 * later inherits the right From address rather than inventing one:
 *   info@   campaigns and brand communication   (BREVO_NEWSLETTER_SENDER)
 *   orders@ receipts and order status           (BREVO_ORDER_SENDER)
 *   hello@  inquiries and consultations         (MARVELL_INQUIRY_EMAIL)
 */

import { config } from "./env.mjs";

const BREVO_CONTACTS_ENDPOINT = "https://api.brevo.com/v3/contacts";
const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export class BrevoError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BrevoError";
    this.code = code;
  }
}

/** Identities for later campaign and transactional work. Nothing sends yet. */
export const senders = {
  get newsletter() {
    return config.brevoNewsletterSender;
  },
  get order() {
    return config.brevoOrderSender;
  },
  get inquiry() {
    return config.marvellInquiryEmail;
  }
};

/** Brevo Date attributes take YYYY-MM-DD. Recorded in Jakarta time. */
function consentDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

/**
 * Brevo expects phone attributes in E.164, with the leading plus.
 *
 * The endpoint normalises numbers before calling this, but the same local
 * Indonesian formats are handled again here: a "0812..." reaching Brevo as
 * "+0812..." would either bounce or message a stranger, so it is not worth
 * relying on an upstream step for.
 */
function toE164(phone) {
  let digits = String(phone || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return `+${digits}`;
}

/**
 * Creates or updates a contact.
 * `updateEnabled: true` means an existing subscriber changing their mind
 * updates their preferences instead of erroring as a duplicate.
 */
export async function subscribeContact({
  email,
  firstName = "",
  lastName = "",
  title = "",
  phone = "",
  emailOptIn = false,
  whatsappOptIn = false,
  source = "unknown"
}) {
  if (!config.brevoApiKey || !config.brevoListId) {
    throw new BrevoError("not_configured", "Newsletter is not configured.");
  }
  if (!email) {
    throw new BrevoError("invalid_email", "An email address is required.");
  }

  const attributes = {
    // FIRSTNAME and LASTNAME are Brevo's own built-in attributes. Both are
    // optional here, and written as empty rather than omitted so that clearing
    // a name on a later submission actually clears it in Brevo.
    FIRSTNAME: firstName || "",
    LASTNAME: lastName || "",
    EMAIL_OPT_IN: Boolean(emailOptIn),
    WHATSAPP_OPT_IN: Boolean(whatsappOptIn),
    SOURCE: source,
    // The date this decision was actually made or changed, not the date the
    // contact first existed. Updated on every submission.
    CONSENT_DATE: consentDate()
  };

  // A salutation, only when one was chosen and only when the attribute has
  // been created in Brevo. Brevo rejects a whole contact for one attribute it
  // does not know, so an unconfigured TITLE must not cost somebody their
  // subscription — it is left out instead, and the choice still reaches our
  // own consent record either way.
  if (title && config.brevoTitleAttribute) {
    attributes[config.brevoTitleAttribute] = title.toUpperCase();
  }

  // Brevo's own WhatsApp attribute, rather than a second custom phone field.
  // Only written when the subscriber consented to be messaged there — a number
  // given for order contact is not permission to market to it.
  if (whatsappOptIn && phone) {
    attributes.WHATSAPP = toE164(phone);
  }

  const listIds = [config.brevoListId];
  if (whatsappOptIn && config.brevoWhatsappListId) {
    listIds.push(config.brevoWhatsappListId);
  }

  let response;
  try {
    response = await fetch(BREVO_CONTACTS_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": config.brevoApiKey
      },
      body: JSON.stringify({ email, attributes, listIds, updateEnabled: true })
    });
  } catch (error) {
    // Network failure. The message may contain the request URL but never the
    // key, which travels in a header.
    console.error("[brevo] request failed", error?.message);
    throw new BrevoError("upstream_error", "The newsletter service is unavailable.");
  }

  // 201 created, 204 updated.
  if (response.status === 201 || response.status === 204) {
    return { created: response.status === 201 };
  }

  const detail = await response.json().catch(() => ({}));

  // Returned when the contact exists and updateEnabled was not honoured for
  // some field; treat it as success rather than alarming anyone.
  if (detail?.code === "duplicate_parameter") {
    return { created: false };
  }

  console.error("[brevo] contact sync failed", response.status, JSON.stringify(detail));

  if (response.status === 400) {
    throw new BrevoError("invalid_contact", "We could not accept those details.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new BrevoError("not_configured", "Newsletter is not configured correctly.");
  }
  if (response.status === 429) {
    throw new BrevoError("rate_limited", "The newsletter service is busy.");
  }
  throw new BrevoError("upstream_error", "The newsletter service is unavailable.");
}

/**
 * Removes a contact from the newsletter list.
 *
 * The counterpart to subscribeContact, and the only other thing Preferences
 * needs. It takes somebody off the list rather than leaving them on it with a
 * flag turned off: "unsubscribe me" is not "keep me and remember not to send",
 * and a list that quietly keeps people is the kind of list nobody trusts.
 *
 * A contact Brevo has never heard of is not an error. Somebody who never
 * subscribed asking not to be subscribed has got what they asked for.
 */
export async function unsubscribeContact(email) {
  if (!config.brevoApiKey || !config.brevoListId) {
    throw new BrevoError("not_configured", "Newsletter is not configured.");
  }
  if (!email) throw new BrevoError("invalid_email", "An email address is required.");

  let response;
  try {
    response = await fetch(`${BREVO_CONTACTS_ENDPOINT}/lists/${config.brevoListId}/contacts/remove`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": config.brevoApiKey
      },
      body: JSON.stringify({ emails: [email] })
    });
  } catch (error) {
    console.error("[brevo] unsubscribe request failed", error?.message);
    throw new BrevoError("upstream_error", "The newsletter service is unavailable.");
  }

  if (response.ok || response.status === 204) return { removed: true };

  const detail = await response.json().catch(() => ({}));
  // Brevo answers 400 contact_already_removed / invalid_parameter for somebody
  // who is not on the list. Not on the list is the state that was asked for.
  if (response.status === 400 || response.status === 404) return { removed: false };

  console.error("[brevo] unsubscribe failed", response.status, JSON.stringify(detail));
  if (response.status === 401 || response.status === 403) {
    throw new BrevoError("not_configured", "Newsletter is not configured correctly.");
  }
  if (response.status === 429) throw new BrevoError("rate_limited", "The newsletter service is busy.");
  throw new BrevoError("upstream_error", "The newsletter service is unavailable.");
}

/**
 * Sends one transactional email.
 *
 * Marketing and transactional mail are different things and are kept apart on
 * purpose: this never touches a list, never creates a contact and never
 * records consent. Sending somebody a sign-in code is not permission to market
 * to them, and a transactional send must never become a back door to a list.
 *
 * Brevo's error bodies can echo the recipient address, so they are logged and
 * replaced before anything is returned.
 */
export async function sendTransactionalEmail({ to, subject, html, text, sender, replyTo, signal } = {}) {
  if (!config.brevoApiKey) {
    throw new BrevoError("not_configured", "Email delivery is not configured.");
  }
  if (!to || !subject || (!html && !text)) {
    throw new BrevoError("invalid_email", "The email could not be sent.");
  }

  let response;
  try {
    response = await fetch(BREVO_EMAIL_ENDPOINT, {
      method: "POST",
      ...(signal ? { signal } : {}),
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "api-key": config.brevoApiKey
      },
      body: JSON.stringify({
        sender: { email: sender || senders.newsletter, name: "Marvell Florist" },
        to: [{ email: to }],
        subject,
        ...(html ? { htmlContent: html } : {}),
        ...(text ? { textContent: text } : {}),
        ...(replyTo ? { replyTo: { email: replyTo } } : {})
      })
    });
  } catch (error) {
    console.error("[brevo] transactional request failed", error?.message);
    throw new BrevoError("upstream_error", "We could not send that email just now.");
  }

  if (response.status === 201 || response.status === 202 || response.ok) return { sent: true };

  const detail = await response.json().catch(() => ({}));
  console.error("[brevo] transactional send failed", response.status, JSON.stringify(detail));

  if (response.status === 401 || response.status === 403) {
    throw new BrevoError("not_configured", "Email delivery is not configured correctly.");
  }
  if (response.status === 429) {
    throw new BrevoError("rate_limited", "Email delivery is busy. Please try again shortly.");
  }
  throw new BrevoError("upstream_error", "We could not send that email just now.");
}

// Exported for tests.
export const __testing = { consentDate, toE164 };
