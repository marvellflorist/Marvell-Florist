// Re-check iPaymu transactions already known to us. iPaymu's documented status
// endpoint requires its TransactionId, which first arrives in a callback; a
// completely missing callback must be replayed from the iPaymu sandbox console.
import { getServiceClient } from "./_lib/supabase.mjs";
import { isPaymentsConfigured, isSupabaseConfigured, intEnv } from "./_lib/env.mjs";
import { fetchTransactionStatus, mapTransactionStatus } from "./_lib/ipaymu.mjs";
import { dispatchPendingNotifications } from "./_lib/admin-notifications.mjs";

async function reconcileOne(db, order) {
  const status = await fetchTransactionStatus(order.payment_reference);
  if (!status || String(status.TransactionId) !== String(order.payment_reference)
      || (status.ReferenceId && status.ReferenceId !== order.public_order_number)
      || !Number.isSafeInteger(Number(status.Amount))
      || Number(status.Amount) !== order.total_idr) return;
  const mapped = mapTransactionStatus(status);
  if (mapped?.order_status === "paid") {
    const { error } = await db.rpc("commit_order_payment", {
      p_order_number: order.public_order_number,
      p_payment_status: mapped.payment_status,
      p_payment_reference: String(status.TransactionId || "").slice(0, 120) || null
    });
    if (error) throw error;
    await dispatchPendingNotifications({ orderId: order.id, limit: 25 });
  } else if (["cancelled", "expired"].includes(mapped?.order_status)) {
    const { error } = await db.rpc("release_order_reservations", {
      p_order_number: order.public_order_number,
      p_order_status: mapped.order_status,
      p_payment_status: mapped.payment_status
    });
    if (error) throw error;
  }
}

export default async () => {
  if (!isPaymentsConfigured() || !isSupabaseConfigured()) return;
  const db = getServiceClient();
  const days = Math.min(Math.max(intEnv("PAYMENT_RECONCILE_DAYS", 30), 1), 90);
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data, error } = await db.from("orders")
    .select("id, public_order_number, payment_reference, total_idr")
    .eq("payment_provider", "ipaymu")
    .not("payment_reference", "is", null)
    .in("status", ["pending_payment", "expired", "cancelled"])
    .neq("payment_status", "failure")
    .gte("created_at", since)
    .order("payment_reconcile_checked_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false }).limit(12);
  if (error) throw error;
  for (let i = 0; i < (data || []).length; i += 4) {
    await Promise.all((data || []).slice(i, i + 4).map(async (order) => {
      try { await reconcileOne(db, order); }
      catch (reconcileError) {
        console.error("[payment-reconcile]", order.id, reconcileError?.code || "error");
      } finally {
        const checked = await db.from("orders")
          .update({ payment_reconcile_checked_at: new Date().toISOString() })
          .eq("id", order.id);
        if (checked.error) console.error("[payment-reconcile] check stamp failed", checked.error.code);
      }
    }));
  }
};

export const config = { schedule: "*/5 * * * *" };
