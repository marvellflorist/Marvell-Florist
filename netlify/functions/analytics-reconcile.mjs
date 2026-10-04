// Purchase measurement is deliberately outside the verified payment webhook.
// Order attribution and consent may fail without delaying payment or staff.
import { getServiceClient } from "./_lib/supabase.mjs";

export default async () => {
  const db = getServiceClient();
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data, error } = await db.from("order_attribution")
    .select("order_id, session_id, orders!inner(status), marketing_sessions(visitor_id, consent_receipt_id)")
    .eq("orders.status", "paid").is("purchase_reconciled_at", null)
    .gte("captured_at", since).order("captured_at", { ascending: false }).limit(25);
  if (error) throw error;
  for (let i = 0; i < (data || []).length; i += 5) {
    await Promise.all(data.slice(i, i + 5).map(async (row) => {
      try {
        if (row.session_id && row.marketing_sessions) {
          const { data: latest, error: consentError } = await db.from("browser_consent_receipts")
            .select("id, analytics_allowed")
            .eq("visitor_id", row.marketing_sessions.visitor_id)
            .order("recorded_at", { ascending: false }).limit(1).maybeSingle();
          if (consentError) throw consentError;
          if (latest?.analytics_allowed && latest.id === row.marketing_sessions.consent_receipt_id) {
            const inserted = await db.from("marketing_events").insert({
              session_id: row.session_id, order_id: row.order_id,
              event_name: "purchase", properties: {}
            });
            if (inserted.error && inserted.error.code !== "23505") throw inserted.error;
          }
        }
        const stamped = await db.from("order_attribution")
          .update({ purchase_reconciled_at: new Date().toISOString() })
          .eq("order_id", row.order_id);
        if (stamped.error) throw stamped.error;
      } catch (eventError) {
        console.error("[analytics-reconcile]", eventError?.code || "error");
      }
    }));
  }
};

export const config = { schedule: "*/15 * * * *" };
