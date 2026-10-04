/**
 * POST /api/cart/validate
 *
 * The cart in localStorage holds nothing but SKUs and quantities. This
 * endpoint is what turns that into money: it loads authoritative prices and
 * availability from the database and recomputes every total server-side.
 *
 * The browser's idea of a price is never read, so editing localStorage or the
 * page's JavaScript changes what is displayed and nothing else.
 *
 * Body:  { items: [{ sku, quantity }] }
 * Reply: { lines, corrections, subtotal_idr, delivery_fee_idr, total_idr }
 */

import { ok, fail, serverError, methodNotAllowed, readJsonBody, clientIp } from "./_lib/http.mjs";
import { cleanCartLines, ValidationError } from "./_lib/validate.mjs";
import { priceCart } from "./_lib/pricing.mjs";
import { isSupabaseConfigured, isCommerceTestMode } from "./_lib/env.mjs";
import { isPlaceholderMode } from "./_lib/commerce.mjs";
import { checkRateLimit } from "./_lib/ratelimit.mjs";

export default async (request) => {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);

  const limit = checkRateLimit(`cart:${clientIp(request)}`, { limit: 60, windowSeconds: 60 });
  if (!limit.allowed) {
    return fail("rate_limited", "Please slow down for a moment and try again.", 429, {
      retry_after_seconds: limit.retryAfterSeconds
    });
  }

  try {
    const body = await readJsonBody(request);

    // Placeholder mode prices the bag too, so the whole browse-to-bag flow
    // can be reviewed, and so does the Mother's Day prototype. Checkout still
    // refuses in both: it needs real credentials.
    if (!isSupabaseConfigured() && !isPlaceholderMode() && !isCommerceTestMode()) {
      return fail(
        "not_configured",
        "Online ordering is not available yet. Please contact us on WhatsApp to place your order.",
        503
      );
    }

    // An empty bag is a normal state, not an error.
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return ok({ lines: [], corrections: [], subtotal_idr: 0, delivery_fee_idr: 0, total_idr: 0 });
    }

    const requestedLines = cleanCartLines(body.items);
    const deliveryMethod = body.delivery_method === "delivery" ? "delivery" : "pickup";
    const priced = await priceCart(requestedLines, { deliveryMethod });

    return ok(priced);
  } catch (error) {
    if (error instanceof ValidationError) {
      return fail("invalid_input", error.publicMessage, 400, { field: error.field });
    }
    if (error?.publicCode === "invalid_json" || error?.publicCode === "payload_too_large") {
      return fail(error.publicCode, "That request could not be read.", 400);
    }
    return serverError("cart-validate", error);
  }
};

export const config = {
  path: "/api/cart/validate",
  rateLimit: { windowSize: 60, windowLimit: 90, aggregateBy: ["ip"] }
};
