/**
 * Shared HTTP helpers for Marvell's serverless endpoints.
 *
 * House rules enforced here:
 *  - Responses are always JSON with an explicit shape.
 *  - Internal error detail (stack traces, Postgres messages, upstream API
 *    bodies) is logged but never returned to the browser.
 */

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

export function ok(data) {
  return json({ ok: true, ...data }, 200);
}

/**
 * A failure the shopper is allowed to see. `code` is a stable machine string
 * the frontend switches on; `message` is already customer-safe English.
 */
export function fail(code, message, status = 400, extra = {}) {
  return json({ ok: false, code, message, ...extra }, status);
}

/**
 * Everything an error actually knows, for the log.
 *
 * A Supabase error is not an Error. It carries its useful detail in `code`,
 * `details` and `hint`, and it has no stack at all — so logging `.message`
 * alone turns "that table is not in this project" into a sentence naming no
 * table, which is how one unrun migration came to look like a broken sign-in.
 *
 * For the log only. Nothing here is ever returned to a browser.
 */
export function describeError(error) {
  if (!error) return "unknown error";
  const parts = [error.message || String(error)];
  if (error.code) parts.push(`code=${error.code}`);
  if (error.details) parts.push(`details=${error.details}`);
  if (error.hint) parts.push(`hint=${error.hint}`);
  return parts.join(" | ");
}

/**
 * A failure the shopper is NOT allowed to see the detail of. The real cause
 * goes to the Netlify function log; the browser gets a generic apology.
 */
export function serverError(logLabel, error) {
  console.error(`[${logLabel}]`, describeError(error));
  if (error?.stack) console.error(error.stack);
  return json(
    {
      ok: false,
      code: "server_error",
      message: "Something went wrong on our side. Please try again in a moment."
    },
    500
  );
}

export function methodNotAllowed(allowed) {
  return json(
    { ok: false, code: "method_not_allowed", message: "Method not allowed." },
    405,
    { allow: allowed.join(", ") }
  );
}

/** Reads and size-caps a JSON body. Rejects anything oversized or malformed. */
export async function readJsonBody(request, maxBytes = 32 * 1024) {
  const raw = await request.text();
  if (raw.length > maxBytes) {
    const error = new Error("payload_too_large");
    error.publicCode = "payload_too_large";
    throw error;
  }
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not_an_object");
    }
    return parsed;
  } catch (_error) {
    const error = new Error("invalid_json");
    error.publicCode = "invalid_json";
    throw error;
  }
}

/** Best-effort client IP, used only for rate limiting. Never stored. */
export function clientIp(request) {
  const headers = request.headers;
  return (
    headers.get("x-nf-client-connection-ip") ||
    (headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}
