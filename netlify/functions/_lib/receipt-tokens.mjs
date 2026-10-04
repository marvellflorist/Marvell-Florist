import { createHash, randomBytes } from "node:crypto";

export function newReceiptToken() {
  return randomBytes(32).toString("base64url");
}

export function receiptTokenHash(token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return "\\x" + createHash("sha256").update(token).digest("hex");
}

export async function saveReceiptToken(db, orderId, token, days = 30) {
  const tokenHash = receiptTokenHash(token);
  if (!tokenHash) throw new Error("invalid_receipt_token");
  const expires = new Date(Date.now() + days * 86400_000).toISOString();
  const { error } = await db.from("guest_receipt_tokens").insert({
    order_id: orderId, token_hash: tokenHash, expires_at: expires
  });
  if (error) throw error;
}
