/**
 * POST /api/payments/ipaymu/webhook
 *
 * A callback can change money state only after both checks succeed:
 *   1. its X-Signature matches iPaymu's canonical callback HMAC; and
 *   2. a separately signed iPaymu v2 transaction lookup confirms the status.
 */

import { json, serverError, methodNotAllowed } from "./_lib/http.mjs";
import { getServiceClient } from "./_lib/supabase.mjs";
import {
  normalizeCallbackPayload,
  verifyCallbackSignature,
  fetchTransactionStatus,
  mapTransactionStatus
} from "./_lib/ipaymu.mjs";
import { isSupabaseConfigured, isPaymentsConfigured } from "./_lib/env.mjs";
import { dispatchPendingNotifications } from "./_lib/admin-notifications.mjs";

const MAX_CALLBACK_BYTES = 64 * 1024;
const PAID_STATUSES = new Set(["paid"]);
const RELEASE_STATUSES = new Set(["cancelled", "expired", "refunded"]);

async function readCallback(request) {
  const declared = Number.parseInt(request.headers.get("content-length") || "0", 10);
  if (declared > MAX_CALLBACK_BYTES) throw new Error("payload_too_large");
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_CALLBACK_BYTES) throw new Error("payload_too_large");
  const type = String(request.headers.get("content-type") || "").toLowerCase();
  if (type.includes("application/json")) return JSON.parse(raw || "{}");
  if (type.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  throw new Error("unsupported_content_type");
}

export default async (request, context) => {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  if (!isPaymentsConfigured() || !isSupabaseConfigured()) {
    console.error("[ipaymu-webhook] callback received while sandbox is not configured");
    return json({ ok: false }, 503);
  }

  let rawCallback;
  try {
    rawCallback = await readCallback(request);
  } catch {
    return json({ ok: false }, 400);
  }

  const signature = request.headers.get("x-signature") || "";
  if (!verifyCallbackSignature(rawCallback, signature)) {
    console.error("[ipaymu-webhook] rejected callback signature");
    return json({ ok: false }, 403);
  }

  const callback = normalizeCallbackPayload(rawCallback);
  const orderNumber = String(callback?.reference_id || callback?.referenceId || "").trim();
  const transactionId = String(callback?.trx_id || "").trim();
  if (!orderNumber || !transactionId) return json({ ok: false }, 400);

  try {
    const authoritative = await fetchTransactionStatus(transactionId);
    if (!authoritative) return json({ ok: false }, 503);

    const authoritativeId = String(authoritative.TransactionId || "").trim();
    const authoritativeReference = String(authoritative.ReferenceId || "").trim();
    if (authoritativeId !== transactionId
        || (authoritativeReference && authoritativeReference !== orderNumber)) {
      console.error("[ipaymu-webhook] transaction identity mismatch", orderNumber);
      return json({ ok: false }, 409);
    }

    const mapped = mapTransactionStatus(authoritative);
    if (!mapped) {
      console.warn("[ipaymu-webhook] unmapped transaction status", orderNumber, authoritative.Status);
      return json({ ok: true, ignored: true }, 200);
    }

    const supabase = getServiceClient();
    const { data: order, error: lookupError } = await supabase.from("orders")
      .select("id, total_idr, payment_provider, payment_session_id")
      .eq("public_order_number", orderNumber).maybeSingle();
    if (lookupError) throw lookupError;
    if (!order || order.payment_provider !== "ipaymu") return json({ ok: false }, 404);

    const authoritativeSession = String(authoritative.SessionId || "").trim();
    if (authoritativeSession && order.payment_session_id
        && authoritativeSession !== order.payment_session_id) {
      console.error("[ipaymu-webhook] session mismatch", orderNumber);
      return json({ ok: false }, 409);
    }

    const amount = Number(authoritative.Amount);
    if (!Number.isSafeInteger(amount) || amount !== order.total_idr) {
      console.error("[ipaymu-webhook] amount mismatch", orderNumber);
      return json({ ok: false }, 409);
    }

    if (PAID_STATUSES.has(mapped.order_status)) {
      const { error } = await supabase.rpc("commit_order_payment", {
        p_order_number: orderNumber,
        p_payment_status: mapped.payment_status,
        p_payment_reference: transactionId
      });
      if (error) throw error;

      const dispatch = dispatchPendingNotifications({ orderId: order.id, limit: 25 })
        .catch((dispatchError) => {
          console.error("[ipaymu-webhook] immediate dispatch unavailable", dispatchError?.code || "error");
        });
      if (typeof context?.waitUntil === "function") context.waitUntil(dispatch);
      else await dispatch;

      console.log("[ipaymu-webhook] settled", orderNumber);
      return json({ ok: true, status: "paid" }, 200);
    }

    if (RELEASE_STATUSES.has(mapped.order_status)) {
      const { error } = await supabase.rpc("release_order_reservations", {
        p_order_number: orderNumber,
        p_order_status: mapped.order_status,
        p_payment_status: mapped.payment_status
      });
      if (error) throw error;
      return json({ ok: true, status: mapped.order_status }, 200);
    }

    const { error } = await supabase.from("orders").update({
      payment_status: mapped.payment_status,
      payment_reference: transactionId
    }).eq("id", order.id);
    if (error) throw error;
    return json({ ok: true, status: "pending" }, 200);
  } catch (error) {
    // A transient failure should be retried by iPaymu.
    return serverError("ipaymu-webhook", error);
  }
};

export const config = { path: "/api/payments/ipaymu/webhook" };
