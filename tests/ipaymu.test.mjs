/** iPaymu v2 request signing, callback verification, and status mapping. */

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const VA = "1179000000000000";
const API_KEY = "sandbox-api-key-for-tests";
process.env.IPAYMU_VA = VA;
process.env.IPAYMU_API_KEY = API_KEY;
process.env.IPAYMU_ENVIRONMENT = "sandbox";

const {
  createApiSignature,
  createCallbackSignature,
  verifyCallbackSignature,
  normalizeCallbackPayload,
  mapTransactionStatus,
  publicPaymentConfig,
  IPAYMU_SANDBOX_BASE_URL
} = await import("../netlify/functions/_lib/ipaymu.mjs");

function callback(overrides = {}) {
  return {
    buyer_email: "jane@example.com",
    reference_id: "MV-ABCD-EFGH",
    sid: "sandbox-session-id",
    status: "berhasil",
    status_code: "1",
    transaction_status_code: "1",
    trx_id: "4719",
    amount: "850000",
    paid_off: "846000",
    is_escrow: "0",
    url: "https://marvellflorist.com/api/payments/ipaymu/webhook",
    ...overrides
  };
}

test("signs the exact iPaymu v2 JSON request body", () => {
  const raw = JSON.stringify({ product: ["Arrangement"], qty: ["1"], price: ["850000"] });
  const bodyHash = crypto.createHash("sha256").update(raw).digest("hex");
  const expected = crypto.createHmac("sha256", API_KEY)
    .update(`POST:${VA}:${bodyHash}:${API_KEY}`).digest("hex");
  assert.equal(createApiSignature("POST", raw), expected);
  assert.notEqual(createApiSignature("POST", `${raw} `), expected, "wire bytes are part of the signature");
});

test("normalizes callback field types required by iPaymu", () => {
  const normalized = normalizeCallbackPayload(callback());
  assert.equal(normalized.trx_id, 4719);
  assert.equal(normalized.status_code, 1);
  assert.equal(normalized.is_escrow, false);
  assert.deepEqual(normalized.additional_info, []);
});

test("accepts a valid callback HMAC and rejects tampering", () => {
  const payload = callback();
  const signature = createCallbackSignature(payload);
  assert.equal(verifyCallbackSignature(payload, signature), true);
  assert.equal(verifyCallbackSignature({ ...payload, amount: "1" }, signature), false);
  assert.equal(verifyCallbackSignature(payload, "deadbeef"), false);
  assert.equal(verifyCallbackSignature(payload, createCallbackSignature(payload, "wrong-va")), false);
});

test("callback signature accepts uppercase hexadecimal", () => {
  const payload = callback();
  assert.equal(verifyCallbackSignature(payload, createCallbackSignature(payload).toUpperCase()), true);
});

test("maps every documented iPaymu transaction status", () => {
  const cases = new Map([
    [0, ["pending_payment", "pending"]],
    [1, ["paid", "settlement"]],
    [6, ["paid", "settlement"]],
    [2, ["cancelled", "cancel"]],
    [3, ["refunded", "refund"]],
    [4, ["cancelled", "failure"]],
    [5, ["cancelled", "failure"]],
    [-2, ["expired", "expire"]]
  ]);
  for (const [status, [orderStatus, paymentStatus]] of cases) {
    assert.deepEqual(mapTransactionStatus({ Status: status }), {
      order_status: orderStatus,
      payment_status: paymentStatus
    });
  }
  assert.equal(mapTransactionStatus({ Status: 99 }), null);
});

test("public payment config exposes no merchant credentials and is sandbox-only", () => {
  const payment = publicPaymentConfig();
  const serialised = JSON.stringify(payment);
  assert.equal(payment.enabled, true);
  assert.equal(payment.provider, "ipaymu");
  assert.equal(payment.environment, "sandbox");
  assert.equal(payment.is_production, false);
  assert.equal(IPAYMU_SANDBOX_BASE_URL, "https://sandbox.ipaymu.com");
  assert.ok(!serialised.includes(VA));
  assert.ok(!serialised.includes(API_KEY));
});
