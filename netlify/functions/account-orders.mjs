/**
 * GET /api/account/orders
 *
 * The order history behind the account, and the receipts it shows.
 *
 * Orders are selected by customer_user_id and by nothing else. That column is
 * only ever written by claim_orders_for_user(), which reads the confirmed
 * address out of auth.users — so a person sees an order here because Supabase
 * proved they read the mailbox it was sent to, not because a browser said an
 * address matched.
 *
 * Guest orders remain guest orders. Nothing here requires an account to have
 * existed when the order was placed, and /api/order/:number still answers for
 * anyone holding an order number and the address on it.
 *
 * What is returned is a receipt: what was bought, what it cost, whether it is
 * paid, and where it is going. Payment credentials do not exist in our
 * database to return.
 */

import { ok, fail, serverError, methodNotAllowed } from "./_lib/http.mjs";
import { getServiceClient } from "./_lib/supabase.mjs";
import { isAccountsConfigured } from "./_lib/env.mjs";
import { readSession, withCookies, claimOrders } from "./_lib/accounts.mjs";

const MAX_ORDERS = 50;

export default async (request) => {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);

  try {
    if (!isAccountsConfigured()) return ok({ signed_in: false, orders: [] });

    const session = await readSession(request);
    if (!session) {
      return fail("not_signed_in", "Please sign in to see your orders.", 401);
    }

    const supabase = getServiceClient();
    await claimOrders(supabase, session.user);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        public_order_number,
        status,
        payment_status,
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
      .eq("customer_user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_ORDERS);

    if (error) throw error;

    // The delivery address and the email on the order are deliberately not
    // returned. A session is enough to show somebody what they bought; it is
    // not a reason to hand a full customer record back to a browser.
    const orders = (data || []).map((order) => ({
      order_number: order.public_order_number,
      status: order.status,
      payment_status: order.payment_status,
      placed_for: order.recipient_name || order.customer_name,
      delivery_method: order.delivery_method,
      delivery_date: order.delivery_date,
      delivery_time_window: order.delivery_time_window,
      subtotal_idr: order.subtotal_idr,
      delivery_fee_idr: order.delivery_fee_idr,
      total_idr: order.total_idr,
      created_at: order.created_at,
      paid_at: order.paid_at,
      items: (order.order_items || []).map((item) => ({
        sku: item.sku,
        name: item.product_name_snapshot,
        quantity: item.quantity,
        unit_price_idr: item.unit_price_idr,
        line_total_idr: item.line_total_idr
      }))
    }));

    return withCookies(ok({ signed_in: true, orders }), session.cookies);
  } catch (error) {
    return serverError("account-orders", error);
  }
};

export const config = {
  path: "/api/account/orders",
  rateLimit: { windowSize: 60, windowLimit: 40, aggregateBy: ["ip"] }
};
