const SOURCE_ALIASES = new Map([
  ["instagram", "instagram"], ["ig", "instagram"], ["insta", "instagram"],
  ["tiktok", "tiktok"], ["tik_tok", "tiktok"], ["brevo", "brevo"],
  ["google", "google"], ["direct", "direct"], ["qr", "qr"],
  ["whatsapp", "whatsapp"], ["wa", "whatsapp"]
]);
const MEDIUM_ALIASES = new Map([
  ["bio", "bio"], ["reel", "reel"], ["story", "story"],
  ["post", "post"], ["email", "email"], ["qr", "qr"],
  ["referral", "referral"], ["cpc", "cpc"], ["organic", "organic"]
]);
const EVENTS = new Set([
  "page_view", "view_collection", "view_item", "search", "wishlist_add", "wishlist_remove",
  "add_to_cart", "remove_from_cart", "begin_checkout", "delivery_details_complete",
  "payment_started", "checkout_error", "account_create", "account_sign_in",
  "newsletter_signup", "whatsapp_click", "consultation_start"
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeToken(value, max = 80) {
  const raw = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (raw.length > max || !/^[a-z0-9_]*$/.test(raw)) return "";
  return raw;
}

export function normalizeTouch(value = {}) {
  const rawSource = normalizeToken(value.source || value.utm_source);
  const source = SOURCE_ALIASES.get(rawSource);
  const medium = MEDIUM_ALIASES.get(normalizeToken(value.medium || value.utm_medium));
  const campaign = normalizeToken(value.campaign || value.utm_campaign);
  const content = normalizeToken(value.content || value.utm_content);
  return {
    source: source || (rawSource ? "unknown" : "direct"), medium: medium || null,
    campaign: campaign || null, content: content || null
  };
}

export function safePath(value) {
  const raw = String(value || "");
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  const path = raw.split(/[?#]/, 1)[0];
  if (/^\/order\//i.test(path)) return "/order/:reference";
  return /^\/[a-z0-9/_~.-]{0,199}$/i.test(path) ? path : "/";
}

export function validateEvent(value) {
  const event = String(value?.event_name || "");
  if (!EVENTS.has(event)) throw new Error("invalid_event");
  if (!UUID.test(String(value?.session_id || ""))) throw new Error("invalid_session");
  const properties = value?.properties ?? {};
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) throw new Error("invalid_properties");
  const allowed = new Set(["path", "error_code", "collection_id"]);
  if (Object.keys(properties).some((key) => !allowed.has(key))) throw new Error("sensitive_properties");
  const clean = {};
  if (properties.path !== undefined) clean.path = safePath(properties.path);
  if (properties.error_code !== undefined) clean.error_code = normalizeToken(properties.error_code, 40);
  if (properties.collection_id !== undefined) clean.collection_id = normalizeToken(properties.collection_id, 80);
  const sku = String(value?.product_sku || "").trim().toUpperCase();
  if (sku && !/^[A-Z0-9]{2,6}-[0-9]{2,3}$/.test(sku)) throw new Error("invalid_product");
  return { event_name: event, session_id: value.session_id,
    product_sku: sku || null, properties: clean };
}

export const __testing = { UUID, EVENTS };
