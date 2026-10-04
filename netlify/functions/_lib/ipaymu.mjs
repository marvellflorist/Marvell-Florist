/**
 * iPaymu API v2 — sandbox only.
 *
 * The merchant VA and API key are server-side credentials. Neither is ever
 * returned by publicPaymentConfig or imported by browser code.
 *
 * Production is deliberately absent. Standard Netlify Functions do not have a
 * static outbound IP, which iPaymu requires for live API access. Adding the
 * production host must be a separate, reviewed infrastructure change.
 */

import crypto from "node:crypto";
import { config, isPaymentsConfigured } from "./env.mjs";

export const IPAYMU_SANDBOX_BASE_URL = "https://sandbox.ipaymu.com";

export function ipaymuTimestamp(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
}

/** iPaymu v2 request signature over the exact JSON string sent on the wire. */
export function createApiSignature(method, rawBody, {
  va = config.ipaymuVa,
  apiKey = config.ipaymuApiKey
} = {}) {
  if (!va || !apiKey) return "";
  const bodyHash = crypto.createHash("sha256").update(String(rawBody)).digest("hex").toLowerCase();
  const stringToSign = `${String(method).toUpperCase()}:${va}:${bodyHash}:${apiKey}`;
  return crypto.createHmac("sha256", apiKey).update(stringToSign).digest("hex");
}

async function signedPost(path, payload) {
  if (!isPaymentsConfigured()) {
    const error = new Error("payments_not_configured");
    error.publicCode = "payments_disabled";
    throw error;
  }

  const rawBody = JSON.stringify(payload);
  const response = await fetch(`${IPAYMU_SANDBOX_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      va: config.ipaymuVa,
      signature: createApiSignature("POST", rawBody),
      timestamp: ipaymuTimestamp()
    },
    body: rawBody,
    signal: AbortSignal.timeout(10_000)
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

/** Everything the browser is allowed to know about payments. */
export function publicPaymentConfig() {
  return {
    enabled: isPaymentsConfigured(),
    provider: "ipaymu",
    environment: "sandbox",
    is_production: false,
    checkout_mode: "redirect"
  };
}

function productLines(order) {
  const lines = order.items.map((item) => ({
    name: String(item.product_name || item.sku).slice(0, 100),
    description: String(item.sku || "Marvell arrangement").slice(0, 100),
    quantity: String(item.quantity),
    price: String(item.unit_price_idr)
  }));
  if (order.delivery_fee_idr > 0) {
    lines.push({ name: "Delivery", description: "Marvell delivery", quantity: "1", price: String(order.delivery_fee_idr) });
  }
  return lines;
}

/** Creates an iPaymu-hosted sandbox checkout and returns only public values. */
export async function createRedirectPayment(order) {
  const lines = productLines(order);
  const orderUrl = `${config.siteOrigin}/order/${encodeURIComponent(order.order_number)}`;
  const payload = {
    product: lines.map((line) => line.name),
    qty: lines.map((line) => line.quantity),
    price: lines.map((line) => line.price),
    description: lines.map((line) => line.description),
    returnUrl: orderUrl,
    notifyUrl: `${config.siteOrigin}/api/payments/ipaymu/webhook`,
    cancelUrl: `${orderUrl}?payment=cancelled`,
    referenceId: order.order_number,
    buyerName: order.customer_name,
    buyerEmail: order.email,
    buyerPhone: order.phone,
    expired: Math.max(1, Math.ceil(config.reservationTtlMinutes / 60)),
    feeDirection: "MERCHANT"
  };

  const { response, body } = await signedPost("/api/v2/payment", payload);
  const sessionId = String(body?.Data?.SessionID || "").trim();
  const paymentUrl = String(body?.Data?.Url || "").trim();
  let safePaymentUrl = false;
  try {
    const parsed = new URL(paymentUrl);
    safePaymentUrl = parsed.protocol === "https:" && parsed.hostname === "sandbox.ipaymu.com";
  } catch {
    safePaymentUrl = false;
  }

  if (!response.ok || Number(body?.Status) !== 200 || !sessionId || !safePaymentUrl) {
    console.error("[ipaymu] sandbox payment creation failed", response.status, String(body?.Status || "unknown"));
    const error = new Error("ipaymu_payment_creation_failed");
    error.publicCode = "payment_unavailable";
    throw error;
  }

  return { session_id: sessionId, payment_url: paymentUrl };
}

/** Fetches the authoritative status of one iPaymu transaction. */
export async function fetchTransactionStatus(transactionId) {
  const id = String(transactionId || "").trim();
  if (!id || !isPaymentsConfigured()) return null;
  const { response, body } = await signedPost("/api/v2/transaction", { transactionId: id });
  if (!response.ok || Number(body?.Status) !== 200 || !body?.Data) {
    console.error("[ipaymu] sandbox status lookup failed", response.status, String(body?.Status || "unknown"));
    return null;
  }
  return body.Data;
}

const CALLBACK_INTEGER_FIELDS = new Set([
  "trx_id", "status_code", "transaction_status_code", "paid_off"
]);

/** Mirrors iPaymu's documented callback type normalization exactly. */
export function normalizeCallbackPayload(rawData) {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) return null;
  const result = {};
  for (const [key, rawValue] of Object.entries(rawData)) {
    if (key === "signature") continue;
    if (key === "is_escrow") {
      result[key] = rawValue === true || rawValue === 1 || rawValue === "1" || rawValue === "true";
    } else if (CALLBACK_INTEGER_FIELDS.has(key)) {
      const parsed = Number.parseInt(rawValue, 10);
      result[key] = Number.isFinite(parsed) ? parsed : String(rawValue);
    } else if (key === "additional_info") {
      if (Array.isArray(rawValue) || (rawValue && typeof rawValue === "object")) result[key] = rawValue;
      else if (rawValue === "[]" || rawValue === "" || rawValue == null) result[key] = [];
      else {
        try { result[key] = JSON.parse(String(rawValue)); }
        catch { result[key] = String(rawValue); }
      }
    } else {
      result[key] = String(rawValue);
    }
  }
  if (!("additional_info" in result)) result.additional_info = [];
  return result;
}

export function createCallbackSignature(payload, va = config.ipaymuVa) {
  const normalized = normalizeCallbackPayload(payload);
  if (!normalized || !va) return "";
  const sorted = Object.keys(normalized)
    .sort((a, b) => a.localeCompare(b))
    .reduce((object, key) => { object[key] = normalized[key]; return object; }, {});
  const canonical = JSON.stringify(sorted).replace(/\//g, "\\/");
  return crypto.createHmac("sha256", va).update(canonical).digest("hex");
}

export function verifyCallbackSignature(payload, provided, va = config.ipaymuVa) {
  const expected = createCallbackSignature(payload, va);
  const actual = String(provided || "").trim().toLowerCase();
  if (!expected || !/^[0-9a-f]{64}$/.test(actual)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

/** Maps iPaymu transaction status codes to the existing neutral order states. */
export function mapTransactionStatus(transaction) {
  const status = Number(transaction?.Status ?? transaction?.status_code ?? transaction?.transaction_status_code);
  switch (status) {
    case 0:
      return { order_status: "pending_payment", payment_status: "pending" };
    case 1:
    case 6:
      return { order_status: "paid", payment_status: "settlement" };
    case 2:
      return { order_status: "cancelled", payment_status: "cancel" };
    case 3:
      return { order_status: "refunded", payment_status: "refund" };
    case 4:
    case 5:
      return { order_status: "cancelled", payment_status: "failure" };
    case -2:
      return { order_status: "expired", payment_status: "expire" };
    default:
      return null;
  }
}
