import { ok, fail, methodNotAllowed, readJsonBody, clientIp } from "./_lib/http.mjs";
import { checkRateLimit } from "./_lib/ratelimit.mjs";
import { getServiceClient } from "./_lib/supabase.mjs";
import { normalizeTouch, safePath, validateEvent, __testing } from "./_lib/attribution.mjs";

async function latestConsent(db, visitorId) {
  const result = await db.from("browser_consent_receipts")
    .select("id, analytics_allowed, marketing_allowed")
    .eq("visitor_id", visitorId).order("recorded_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export default async (request) => {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  const path = new URL(request.url).pathname;
  const limit = checkRateLimit(`analytics:${clientIp(request)}`, { limit: 80, windowSeconds: 60 });
  if (!limit.allowed) return fail("rate_limited", "Please try again later.", 429);
  try {
    const body = await readJsonBody(request, 4096);
    const db = getServiceClient();
    if (path === "/api/privacy/consent") {
      if (!__testing.UUID.test(String(body.visitor_id || "")) || body.consent_version !== "2026-09-01") {
        return fail("invalid_consent", "Invalid preference.", 400);
      }
      const { data, error } = await db.from("browser_consent_receipts").insert({
        visitor_id: body.visitor_id, consent_version: body.consent_version,
        analytics_allowed: body.analytics === true, marketing_allowed: body.marketing === true
      }).select("id").single();
      if (error) throw error;
      return ok({ receipt_id: data.id });
    }
    if (path === "/api/analytics/session") {
      if (!__testing.UUID.test(String(body.visitor_id || ""))) return fail("invalid_session", "Invalid session.", 400);
      const consent = await latestConsent(db, body.visitor_id);
      if (!consent?.analytics_allowed || consent.id !== body.consent_receipt_id) {
        return fail("consent_required", "Analytics preference required.", 403);
      }
      const touch = normalizeTouch(body.touch);
      const pathValue = safePath(body.landing_path);
      const existing = __testing.UUID.test(String(body.session_id || ""))
        ? await db.from("marketing_sessions").select("id, first_touch")
          .eq("id", body.session_id).eq("visitor_id", body.visitor_id)
          .eq("consent_receipt_id", consent.id)
          .gt("expires_at", new Date().toISOString()).maybeSingle()
        : { data: null, error: null };
      if (existing.error) throw existing.error;
      if (existing.data) {
        const hasCampaignTag = Object.values(body.touch || {}).some((value) => String(value || "").trim());
        if (hasCampaignTag) {
          const { error } = await db.from("marketing_sessions")
            .update({ last_touch: touch, updated_at: new Date().toISOString() })
            .eq("id", existing.data.id).eq("visitor_id", body.visitor_id);
          if (error) throw error;
        }
        return ok({ session_id: existing.data.id });
      }
      const previous = await db.from("marketing_sessions").select("first_touch")
        .eq("visitor_id", body.visitor_id).eq("consent_receipt_id", consent.id)
        .order("started_at", { ascending: true }).limit(1).maybeSingle();
      if (previous.error) throw previous.error;
      const { data, error } = await db.from("marketing_sessions").insert({
        visitor_id: body.visitor_id, consent_receipt_id: consent.id,
        first_touch: previous.data?.first_touch || touch, last_touch: touch,
        landing_path: pathValue,
        referrer_category: ["search", "social", "email", "other", "direct"].includes(body.referrer_category)
          ? body.referrer_category : "direct"
      }).select("id").single();
      if (error) throw error;
      return ok({ session_id: data.id });
    }
    if (path === "/api/analytics/event") {
      const event = validateEvent(body);
      const sessionResult = await db.from("marketing_sessions")
        .select("id, visitor_id, consent_receipt_id")
        .eq("id", event.session_id).gt("expires_at", new Date().toISOString()).maybeSingle();
      if (sessionResult.error) throw sessionResult.error;
      if (!sessionResult.data) return fail("invalid_session", "Invalid session.", 403);
      const consent = await latestConsent(db, sessionResult.data.visitor_id);
      if (!consent?.analytics_allowed || consent.id !== sessionResult.data.consent_receipt_id) {
        return fail("consent_required", "Analytics preference required.", 403);
      }
      const { error } = await db.from("marketing_events").insert(event);
      if (error) throw error;
      return ok({ recorded: true });
    }
    return fail("not_found", "Not found.", 404);
  } catch (error) {
    if (String(error?.message || "").startsWith("invalid_") || error?.message === "sensitive_properties") {
      return fail("invalid_event", "Invalid event.", 400);
    }
    console.error("[analytics]", error?.code || "error");
    return fail("unavailable", "Unavailable.", 503);
  }
};

export const config = {
  path: ["/api/privacy/consent", "/api/analytics/session", "/api/analytics/event"],
  rateLimit: { windowSize: 60, windowLimit: 100, aggregateBy: ["ip"] }
};
