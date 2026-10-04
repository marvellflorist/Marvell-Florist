/**
 * POST /api/order/:orderNumber   body: { receipt_token }
 *
 * Powers the confirmation page and the Track Your Order panel. Returns only
 * what the person who placed the order needs to see: what they bought, what it
 * cost, and whether payment has cleared.
 *
 * The public reference is a label, never a credential. A random receipt token
 * proves possession of the checkout or email receipt; an authenticated My
 * Marvell session can also read an order it owns.
 *
 * POST rather than GET so the address is not written into a URL, a referrer
 * header or an access log. A wrong email, a wrong number and an order that
 * does not exist all return the same 404, so this cannot be used to test
 * whether an address ever ordered from us.
 *
 * Even once both match, the response withholds the email and the full address
 * it has on file: enough to confirm an order, not enough to harvest a customer
 * record. Payment state is read from our database, which only the verified
 * webhook can write, so this can never be talked into reporting an unpaid
 * order as paid.
 */

import { ok, fail, serverError, methodNotAllowed, clientIp } from "./_lib/http.mjs";
import { cleanOrderNumber, ValidationError } from "./_lib/validate.mjs";
import { getServiceClient } from "./_lib/supabase.mjs";
import { isSupabaseConfigured } from "./_lib/env.mjs";
import { checkRateLimit } from "./_lib/ratelimit.mjs";
import { receiptTokenHash } from "./_lib/receipt-tokens.mjs";
import { readSession } from "./_lib/accounts.mjs";

const NOT_FOUND_MESSAGE =
  "We could not open that receipt. Request a fresh email link or contact us on WhatsApp.";

export default async (request) => {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);

  // Tight limit: this is the one endpoint where guessing would be the attack.
  const limit = checkRateLimit(`order:${clientIp(request)}`, { limit: 20, windowSeconds: 60 });
  if (!limit.allowed) {
    return fail("rate_limited", "Too many lookups. Please wait a moment.", 429, {
      retry_after_seconds: limit.retryAfterSeconds
    });
  }

  try {
    if (!isSupabaseConfigured()) {
      return fail("not_configured", "Order lookup is not available yet.", 503);
    }

    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const requested = url.pathname.split("/").filter(Boolean).pop() || body?.order_number;
    const orderNumber = cleanOrderNumber(requested);
    const tokenHash = receiptTokenHash(body?.receipt_token);

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        customer_user_id,
        public_order_number,
        status,
        payment_status,
        needs_attention,
        customer_name,
        delivery_method,
        delivery_date,
        delivery_time_window,
        recipient_name,
        subtotal_idr,
        delivery_fee_idr,
        total_idr,
        created_at,
        paid_at,
        order_items ( sku, product_name_snapshot, quantity, unit_price_idr, line_total_idr )
      `)
      .eq("public_order_number", orderNumber)
      .maybeSingle();

    if (error) throw error;
    if (!data) return fail("order_not_found", NOT_FOUND_MESSAGE, 404);

    let authorized = false;
    if (tokenHash) {
      const { data: token, error: tokenError } = await supabase
        .from("guest_receipt_tokens").select("id")
        .eq("order_id", data.id).eq("token_hash", tokenHash)
        .gt("expires_at", new Date().toISOString()).is("revoked_at", null)
        .maybeSingle();
      if (tokenError) throw tokenError;
      authorized = Boolean(token);
    }
    if (!authorized && data.customer_user_id) {
      const session = await readSession(request);
      authorized = session?.user?.id === data.customer_user_id;
    }
    if (!authorized) {
      return fail("order_not_found", NOT_FOUND_MESSAGE, 404);
    }

    return ok({
      order: {
        order_number: data.public_order_number,
        status: data.status,
        payment_status: data.payment_status,
        needs_attention: data.needs_attention,
        // First name only — enough to recognise, not enough to harvest.
        customer_first_name: String(data.customer_name || "").split(" ")[0] || "",
        delivery_method: data.delivery_method,
        delivery_date: data.delivery_date,
        delivery_time_window: data.delivery_time_window,
        recipient_name: data.recipient_name,
        subtotal_idr: data.subtotal_idr,
        delivery_fee_idr: data.delivery_fee_idr,
        total_idr: data.total_idr,
        created_at: data.created_at,
        paid_at: data.paid_at,
        items: (data.order_items || []).map((item) => ({
          sku: item.sku,
          name: item.product_name_snapshot,
          quantity: item.quantity,
          unit_price_idr: item.unit_price_idr,
          line_total_idr: item.line_total_idr
        }))
      }
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      // A malformed number and a missing one give the same answer.
      return fail("order_not_found", NOT_FOUND_MESSAGE, 404);
    }
    return serverError("order-status", error);
  }
};

export const config = {
  path: "/api/order/:orderNumber",
  rateLimit: { windowSize: 60, windowLimit: 30, aggregateBy: ["ip"] }
};
