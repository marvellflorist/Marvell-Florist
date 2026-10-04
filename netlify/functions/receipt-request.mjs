import { ok, fail, methodNotAllowed, clientIp, readJsonBody } from "./_lib/http.mjs";
import { cleanOrderNumber, cleanEmail, ValidationError } from "./_lib/validate.mjs";
import { getServiceClient } from "./_lib/supabase.mjs";
import { checkRateLimit } from "./_lib/ratelimit.mjs";
import { newReceiptToken, saveReceiptToken } from "./_lib/receipt-tokens.mjs";
import { sendTransactionalEmail, senders } from "./_lib/brevo.mjs";
import { config as appConfig } from "./_lib/env.mjs";

const answer = () => ok({ message: "If the details match, we will email a secure receipt link." });

export default async (request) => {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  const limit = checkRateLimit(`receipt-request:${clientIp(request)}`, { limit: 4, windowSeconds: 3600 });
  if (!limit.allowed) return fail("rate_limited", "Please wait before requesting another link.", 429);
  try {
    const body = await readJsonBody(request, 2048);
    const number = cleanOrderNumber(body.order_number);
    const email = cleanEmail(body.email);
    const orderLimit = checkRateLimit(`receipt-number:${number}`, { limit: 3, windowSeconds: 86400 });
    if (!orderLimit.allowed) return answer();
    const db = getServiceClient();
    const { data: order, error } = await db.from("orders")
      .select("id, email, public_order_number")
      .eq("public_order_number", number).maybeSingle();
    if (error) throw error;
    if (!order || order.email.trim().toLowerCase() !== email) return answer();
    const token = newReceiptToken();
    await saveReceiptToken(db, order.id, token, 7);
    const origin = new URL(appConfig.siteOrigin).origin;
    const link = `${origin}/order/${encodeURIComponent(number)}#receipt=${token}`;
    await sendTransactionalEmail({
      to: order.email, sender: senders.order,
      subject: `Marvell Florist — receipt ${number}`,
      text: `Your secure order link: ${link}\nThis link expires in 7 days.`,
      html: `<p>Your secure order link:</p><p><a href="${link}">View order ${number}</a></p><p>This link expires in 7 days.</p>`,
      signal: AbortSignal.timeout(3500)
    });
    return answer();
  } catch (error) {
    if (error instanceof ValidationError) return answer();
    console.error("[receipt-request]", error?.code || error?.name || "error");
    return answer();
  }
};

export const config = {
  path: "/api/receipt/request",
  rateLimit: { windowSize: 3600, windowLimit: 8, aggregateBy: ["ip"] }
};
