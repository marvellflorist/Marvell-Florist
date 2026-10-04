import { getServiceClient } from "./supabase.mjs";
import { sendTransactionalEmail, senders } from "./brevo.mjs";
import { newReceiptToken, saveReceiptToken } from "./receipt-tokens.mjs";
import { config } from "./env.mjs";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function adminOrigin() {
  const raw = process.env.ADMIN_SITE_ORIGIN || "http://localhost:8890";
  const parsed = new URL(raw);
  if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    throw new Error("admin_origin_must_be_https");
  }
  return parsed.origin;
}

export function paidOrderEmail({ reference, deliveryMethod, deliveryDate, deliveryWindow, stockException, escalated, orderId }) {
  const subject = stockException
    ? `Perlu Tindakan: Pesanan ${reference}`
    : escalated ? `Belum Dikonfirmasi: Pesanan ${reference}` : `Pesanan Baru: ${reference}`;
  const status = stockException
    ? "Pembayaran diterima, tetapi reservasi stok telah dilepas. Periksa stok sebelum menyiapkan pesanan."
    : "Pembayaran telah dikonfirmasi. Pesanan menunggu konfirmasi dari tim toko.";
  const date = deliveryDate || "Belum ditentukan";
  const window = deliveryWindow === "morning" ? "Pagi" : deliveryWindow === "afternoon" ? "Siang" : deliveryWindow || "—";
  const dateLabel = deliveryMethod === "pickup" ? "Tanggal pengambilan" : "Tanggal pengiriman";
  const windowText = deliveryMethod === "pickup" ? "Waktu pengambilan" : "Waktu pengiriman";
  const link = `${adminOrigin()}/pesanan?id=${encodeURIComponent(orderId)}`;
  const text = `${subject}\n${status}\n${dateLabel}: ${date}\n${windowText}: ${window}\nBuka Pesanan: ${link}`;
  const html = `<main><h1>${escapeHtml(subject)}</h1><p>${escapeHtml(status)}</p>`
    + `<p>${dateLabel}: ${escapeHtml(date)}<br>${windowText}: ${escapeHtml(window)}</p>`
    + `<p><a href="${escapeHtml(link)}">Buka Pesanan</a></p></main>`;
  return { subject, text, html };
}

function nextAttempt(attempts) {
  return new Date(Date.now() + Math.min(60, 2 ** Math.min(attempts, 6)) * 60_000).toISOString();
}

/** Called immediately by the verified webhook and by a scheduled recovery job. */
export async function dispatchPendingNotifications({ orderId = null, limit = 10 } = {}) {
  const db = getServiceClient();
  const { data: claims, error: claimError } = await db.rpc("claim_notification_outbox", {
    p_order_id: orderId, p_limit: limit
  });
  if (claimError) throw claimError;
  const result = { claimed: claims?.length || 0, sent: 0, failed: 0 };
  for (let i = 0; i < (claims || []).length; i += 5) {
    await Promise.all(claims.slice(i, i + 5).map(async (claim) => {
    let code = null;
    try {
      const { data: notice, error: noticeError } = await db.from("admin_notifications")
        .select("id, order_id, event_type").eq("id", claim.notification_id).single();
      if (noticeError) throw noticeError;
      const { data: order, error: orderError } = await db.from("orders")
        .select("public_order_number, email, delivery_method, delivery_date, delivery_time_window, stock_exception")
        .eq("id", notice.order_id).single();
      if (orderError) throw orderError;
      let recipient = process.env.MARVELL_ADMIN_ALERT_EMAIL || "";
      if (claim.recipient_kind === "customer") {
        recipient = order.email;
      } else if (claim.recipient_user_id) {
        const { data, error } = await db.auth.admin.getUserById(claim.recipient_user_id);
        if (error) throw error;
        recipient = data?.user?.email || "";
      }
      if (!recipient) {
        code = "recipient_unconfigured";
        throw new Error(code);
      }
      let mail;
      if (claim.recipient_kind === "customer") {
        const token = newReceiptToken();
        await saveReceiptToken(db, notice.order_id, token);
        const link = `${new URL(config.siteOrigin).origin}/order/${encodeURIComponent(order.public_order_number)}#receipt=${token}`;
        mail = {
          subject: `Marvell Florist — payment received for ${order.public_order_number}`,
          text: `Your payment has been received. We will confirm fulfillment details with you. View your order: ${link}`,
          html: `<main><p>Your payment has been received. We will confirm fulfillment details with you.</p><p><a href="${escapeHtml(link)}">View your order</a></p></main>`
        };
      } else {
        mail = paidOrderEmail({
          reference: order.public_order_number,
          deliveryMethod: order.delivery_method,
          deliveryDate: order.delivery_date,
          deliveryWindow: order.delivery_time_window,
          stockException: order.stock_exception,
          escalated: claim.event_key.startsWith("escalate:"),
          orderId: notice.order_id
        });
      }
      await sendTransactionalEmail({
        to: recipient, sender: senders.order, ...mail,
        signal: AbortSignal.timeout(3500)
      });
      const { error: sentError } = await db.from("notification_outbox")
        .update({ state: "sent", sent_at: new Date().toISOString(), lease_until: null, last_error_code: null })
        .eq("id", claim.id).eq("state", "sending");
      if (sentError) throw sentError;
      result.sent += 1;
    } catch (error) {
      code ||= error?.code || error?.name || "send_failed";
      const { error: failedError } = await db.from("notification_outbox")
        .update({ state: "failed", lease_until: null, last_error_code: String(code).slice(0, 80),
          next_attempt_at: nextAttempt(claim.attempts) })
        .eq("id", claim.id).eq("state", "sending");
      if (failedError) console.error("[notification-dispatch] failed to save failure", failedError.code);
      result.failed += 1;
    }
    const { error: logError } = await db.from("notification_attempts").insert({
      outbox_id: claim.id, attempt_number: claim.attempts,
      result: code ? "failed" : "accepted", error_code: code ? String(code).slice(0, 80) : null
    });
    if (logError) console.error("[notification-dispatch] attempt log failed", logError.code);
    }));
  }
  return result;
}
