import { getServiceClient } from "./_lib/supabase.mjs";
import { dispatchPendingNotifications } from "./_lib/admin-notifications.mjs";

export default async () => {
  const db = getServiceClient();
  try {
    const recovered = await db.rpc("reconcile_paid_order_notifications");
    if (recovered.error) throw recovered.error;
  } catch (error) {
    console.error("[notification-reconcile] recovery", error?.code || "error");
  }
  try {
    const escalation = await db.rpc("enqueue_notification_escalations");
    if (escalation.error) throw escalation.error;
  } catch (error) {
    console.error("[notification-reconcile] escalation", error?.code || "error");
  }
  await dispatchPendingNotifications({ limit: 25 });
};

export const config = { schedule: "*/5 * * * *" };
