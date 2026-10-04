/**
 * POST /api/checkout
 *
 * Creates a pending order, holds its stock, and asks iPaymu Sandbox for a
 * hosted checkout URL. The order of operations matters:
 *
 *   validate input -> re-price server-side -> reserve stock atomically
 *   -> request hosted payment session -> hand its public URL to the browser
 *
 * Stock is held before payment so a shopper cannot pay for something that sold
 * out while the hosted checkout was open. If payment creation then fails, the hold
 * is released immediately rather than stranding inventory.
 *
 * Nothing here marks anything paid. That can only happen in the webhook, after
 * a signature check.
 */

import { ok, fail, serverError, methodNotAllowed, readJsonBody, clientIp } from "./_lib/http.mjs";
import {
  cleanText,
  cleanMultiline,
  cleanEmail,
  cleanPhone,
  cleanBoolean,
  cleanCartLines,
  cleanIsoDate,
  isSameDayUnavailable,
  ValidationError
} from "./_lib/validate.mjs";
import { getServiceClient, parsePostgresError } from "./_lib/supabase.mjs";
import { config as appConfig, isSupabaseConfigured, isPaymentsConfigured } from "./_lib/env.mjs";
import { createRedirectPayment, publicPaymentConfig } from "./_lib/ipaymu.mjs";
import { checkRateLimit } from "./_lib/ratelimit.mjs";
import { priceCart } from "./_lib/pricing.mjs";
import { subscribeContact } from "./_lib/brevo.mjs";
import { newReceiptToken, saveReceiptToken } from "./_lib/receipt-tokens.mjs";

async function captureOrderAttribution(db, sessionId, orderId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(sessionId || ""))) return;
  try {
    const { data: session, error } = await db.from("marketing_sessions")
      .select("id, visitor_id, first_touch, last_touch, consent_receipt_id")
      .eq("id", sessionId).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (error || !session) return;
    const latest = await db.from("browser_consent_receipts")
      .select("id, analytics_allowed").eq("visitor_id", session.visitor_id)
      .order("recorded_at", { ascending: false }).limit(1).maybeSingle();
    if (latest.error || !latest.data?.analytics_allowed || latest.data.id !== session.consent_receipt_id) return;
    await db.from("order_attribution").insert({ order_id: orderId, session_id: session.id,
      first_touch: session.first_touch, last_touch: session.last_touch });
  } catch (error) {
    // Measurement must never block checkout or leave its stock reservation held.
    console.error("[checkout] attribution unavailable", error?.code || "error");
  }
}

const TIME_WINDOWS = ["morning", "afternoon"];

function cleanTimeWindow(value) {
  const raw = String(value ?? "").trim();
  if (!TIME_WINDOWS.includes(raw)) {
    throw new ValidationError("delivery_time_window", "Please choose a time.");
  }
  return raw;
}

function readCustomer(body) {
  const deliveryMethod = body.delivery_method === "delivery" ? "delivery" : "pickup";

  const deliveryDate = cleanIsoDate(body.delivery_date, {
    required: true,
    label: deliveryMethod === "delivery" ? "delivery date" : "pickup date"
  });
  if (isSameDayUnavailable(deliveryDate)) {
    throw new ValidationError("delivery_date", "Same-day orders are unavailable after 16:00 WIB. Please choose tomorrow or a later date.");
  }

  const customer = {
    customer_name: cleanText(body.customer_name, {
      field: "customer_name", label: "name", max: 120, required: true
    }),
    email: cleanEmail(body.email, { required: true }),
    phone: cleanPhone(body.phone, { required: true }),
    delivery_method: deliveryMethod,
    delivery_address: "",
    // When the order is wanted is part of the order, not a preference
    // attached to it: an arrangement is made for a day, and a day is what
    // the workroom schedules against. Required for pickup as well as for
    // delivery, because both of them happen on one.
    delivery_date: deliveryDate,
    delivery_time_window: cleanTimeWindow(body.delivery_time_window),
    recipient_name: cleanText(body.recipient_name, {
      field: "recipient_name", label: "recipient name", max: 120
    }),
    recipient_phone: cleanPhone(body.recipient_phone),
    delivery_unit: cleanText(body.delivery_unit, { field: "delivery_unit", max: 120 }),
    delivery_instructions: cleanMultiline(body.delivery_instructions, { field: "delivery_instructions", max: 500 }),
    card_message: cleanMultiline(body.card_message, {
      field: "card_message", label: "card message", max: 500
    }),
    card_sender: cleanText(body.card_sender, { field: "card_sender", max: 120 }),
    card_anonymous: cleanBoolean(body.card_anonymous),
    order_notes: cleanMultiline(body.order_notes, {
      field: "order_notes", label: "notes", max: 1000
    }),
    email_opt_in: cleanBoolean(body.email_opt_in),
    whatsapp_opt_in: cleanBoolean(body.whatsapp_opt_in)
  };

  if (deliveryMethod === "delivery") {
    customer.delivery_address = cleanText(body.delivery_address, {
      field: "delivery_address", label: "delivery address", max: 500, required: true
    });
  }

  return customer;
}

export default async (request, context) => {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);

  const ip = clientIp(request);
  const limit = checkRateLimit(`checkout:${ip}`, { limit: 8, windowSeconds: 60 });
  if (!limit.allowed) {
    return fail("rate_limited", "Too many attempts. Please wait a moment and try again.", 429, {
      retry_after_seconds: limit.retryAfterSeconds
    });
  }

  try {
    const body = await readJsonBody(request);

    // Hidden field: a real shopper never fills it, a naive bot fills everything.
    if (cleanText(body.company, { field: "company", max: 200 })) {
      // Look successful so the bot does not learn to adapt, but do nothing.
      return ok({ order_number: "", payment: { enabled: false }, discarded: true });
    }

    if (!isSupabaseConfigured()) {
      return fail(
        "not_configured",
        "Online ordering is not available yet. Please contact us on WhatsApp to place your order.",
        503
      );
    }

    // No payment keys: refuse cleanly rather than reserving stock that can
    // never be paid for.
    if (!isPaymentsConfigured()) {
      return fail(
        "payments_disabled",
        "Online payment is not live yet. Please contact us on WhatsApp and we will complete your order personally.",
        503,
        { payment: publicPaymentConfig() }
      );
    }

    const customer = readCustomer(body);
    const requestedLines = cleanCartLines(body.items);

    // Re-price from the database. Anything the browser sent about money is
    // ignored; this is the number the shopper will actually be charged.
    const priced = await priceCart(requestedLines, { deliveryMethod: customer.delivery_method });

    if (!priced.lines.length) {
      return fail("empty_cart", "Nothing in your bag is still available.", 409, {
        corrections: priced.corrections,
        cart: priced
      });
    }

    // Something moved between the cart page and here: show the shopper the new
    // numbers and make them confirm rather than silently charging a new total.
    if (priced.corrections.length) {
      return fail("cart_changed", "Your bag has changed since you last looked.", 409, {
        corrections: priced.corrections,
        cart: priced
      });
    }

    const supabase = getServiceClient();

    const createArgs = {
      p_customer: customer,
      p_items: priced.lines.map((line) => ({
        sku: line.sku,
        quantity: line.quantity,
        product_name: line.name,
        product_image: line.image || "",
        selected_options: {},
        production_instructions: ""
      })),
      p_delivery_fee_idr: priced.delivery_fee_idr,
      p_expected_subtotal_idr: priced.subtotal_idr,
      p_reservation_minutes: appConfig.reservationTtlMinutes
    };
    let created;
    let rpcError;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const result = await supabase.rpc("create_order_with_reservations", createArgs);
      created = result.data;
      rpcError = result.error;
      // A uniqueness collision aborts that RPC transaction. A fresh attempt
      // generates a fresh public reference and a fresh internal provider ID.
      if (!rpcError || rpcError.code !== "23505") break;
    }

    if (rpcError) {
      const parsed = parsePostgresError(rpcError);
      if (parsed.code === "insufficient_stock" || parsed.code === "sku_unavailable") {
        // Lost a race with another shopper in the last few hundred ms.
        const rechecked = await priceCart(requestedLines, {
          deliveryMethod: customer.delivery_method
        });
        return fail("cart_changed", "One of your pieces has just sold out.", 409, {
          corrections: rechecked.corrections,
          cart: rechecked
        });
      }
      if (parsed.code === "price_changed") {
        const rechecked = await priceCart(requestedLines, {
          deliveryMethod: customer.delivery_method
        });
        return fail("cart_changed", "A price has changed since you last looked.", 409, {
          corrections: rechecked.corrections,
          cart: rechecked
        });
      }
      if (parsed.code === "empty_cart") {
        return fail("empty_cart", "Your bag is empty.", 409);
      }
      return serverError("checkout:rpc", rpcError);
    }

    const order = {
      order_number: created.order_number,
      customer_name: customer.customer_name,
      email: customer.email,
      phone: customer.phone,
      total_idr: created.total_idr,
      delivery_fee_idr: created.delivery_fee_idr,
      items: priced.lines.map((line) => ({
        sku: line.sku,
        product_name: line.name,
        quantity: line.quantity,
        unit_price_idr: line.unit_price_idr
      }))
    };

    // A public reference never opens a receipt. Create its bearer credential
    // before handing the customer to the payment provider.
    const receiptToken = newReceiptToken();
    try {
      await saveReceiptToken(supabase, created.order_id, receiptToken);
    } catch (error) {
      await supabase.rpc("release_order_reservations", {
        p_order_number: created.order_number,
        p_order_status: "cancelled",
        p_payment_status: "failure"
      });
      return serverError("checkout:receipt", error);
    }

    let ipaymu;
    try {
      ipaymu = await createRedirectPayment(order);
      const savedSession = await supabase.from("orders").update({
        payment_provider: "ipaymu",
        payment_session_id: ipaymu.session_id,
        payment_status: "pending"
      }).eq("id", created.order_id);
      if (savedSession.error) throw savedSession.error;
    } catch (error) {
      // Payment could not be started: give the stock straight back rather than
      // letting it sit reserved for the full TTL.
      console.error("[checkout] iPaymu sandbox payment failed, releasing reservation", created.order_number);
      await supabase
        .rpc("release_order_reservations", {
          p_order_number: created.order_number,
          p_order_status: "cancelled",
          p_payment_status: "failure"
        })
        .catch((releaseError) =>
          console.error("[checkout] release failed", releaseError?.message)
        );

      return fail(
        "payment_unavailable",
        "We could not start the payment just now. Nothing has been charged. Please try again, or contact us on WhatsApp.",
        502
      );
    }

    // Optional measurement is separate from the order/payment path.
    const attribution = captureOrderAttribution(supabase, body.analytics_session_id, created.order_id);
    if (typeof context?.waitUntil === "function") context.waitUntil(attribution);
    // Without Netlify's waitUntil (plain local tests), analytics may fail
    // closed. Checkout never waits for it.

    // Marketing consent is a side errand; it must never fail a paid order.
    if (customer.email_opt_in || customer.whatsapp_opt_in) {
      subscribeContact({
        email: customer.email,
        firstName: customer.customer_name.split(" ")[0] || "",
        phone: customer.whatsapp_opt_in ? customer.phone : "",
        emailOptIn: customer.email_opt_in,
        whatsappOptIn: customer.whatsapp_opt_in,
        source: "checkout"
      }).catch((error) => console.error("[checkout] newsletter opt-in failed", error?.message));
    }

    return ok({
      order_number: created.order_number,
      receipt_token: receiptToken,
      total_idr: created.total_idr,
      subtotal_idr: created.subtotal_idr,
      delivery_fee_idr: created.delivery_fee_idr,
      expires_at: created.expires_at,
      payment: {
        ...publicPaymentConfig(),
        session_id: ipaymu.session_id,
        payment_url: ipaymu.payment_url
      }
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return fail("invalid_input", error.publicMessage, 400, { field: error.field });
    }
    if (error?.publicCode === "invalid_json" || error?.publicCode === "payload_too_large") {
      return fail(error.publicCode, "That request could not be read.", 400);
    }
    return serverError("checkout", error);
  }
};

export const config = {
  path: "/api/checkout",
  rateLimit: { windowSize: 60, windowLimit: 20, aggregateBy: ["ip"] }
};
