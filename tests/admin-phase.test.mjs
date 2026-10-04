import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { newReceiptToken, receiptTokenHash } from "../netlify/functions/_lib/receipt-tokens.mjs";
import { allowed, originAllowed, __testing as auth } from "../marvell-admin/functions/_lib/admin-auth.mjs";
import { publicOrder } from "../marvell-admin/functions/_lib/admin-api.mjs";
import { normalizeTouch, safePath, validateEvent } from "../netlify/functions/_lib/attribution.mjs";
import { methodNotAllowed } from "../marvell-admin/functions/_lib/admin-http.mjs";
import { paidOrderEmail } from "../netlify/functions/_lib/admin-notifications.mjs";
import { beginTotpEnrollment, classifyTotpFactors, mfaFailure } from "../marvell-admin/functions/_lib/admin-mfa.mjs";
import { JSDOM } from "jsdom";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("guest receipt credentials are random, hashed, and reject public references", () => {
  const a = newReceiptToken();
  const b = newReceiptToken();
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, b);
  assert.equal(receiptTokenHash(a), `\\x${createHash("sha256").update(a).digest("hex")}`);
  assert.equal(receiptTokenHash("MV-2345-6789"), null);
  assert.equal(receiptTokenHash("jane@example.com"), null);
});

test("staff sessions use separate host-only cookies and explicit permissions", () => {
  const cookie = auth.cookie("mv_admin_session", "opaque", 60);
  assert.match(cookie, /HttpOnly; SameSite=Lax/);
  assert.doesNotMatch(cookie, /Domain=/);
  assert.equal(allowed({ role: "delivery", active: true }, "cards.print"), false);
  assert.equal(allowed({ role: "florist", active: true }, "cards.print"), true);
  assert.equal(allowed({ role: "store_admin", active: true, can_manage_stock: false }, "stock.manage"), false);
  assert.equal(allowed({ role: "store_admin", active: true, can_manage_stock: true }, "stock.manage"), true);
  assert.equal(allowed({ role: "owner", active: false }, "stock.manage"), false);
});

test("local Admin origin is accepted without production domain or secure cookies", () => {
  const previous = process.env.ADMIN_SITE_ORIGIN;
  try {
    delete process.env.ADMIN_SITE_ORIGIN;
    assert.equal(originAllowed(new Request("http://localhost:8890/api/admin/mfa/enroll", {
      headers: { origin: "http://localhost:8890" }
    })), true);
    assert.equal(originAllowed(new Request("http://localhost:8890/api/admin/mfa/enroll", {
      headers: { origin: "https://admin.marvellflorist.com" }
    })), false);
    assert.doesNotMatch(auth.cookie("mv_admin_session", "opaque", 60), /; Secure/);
    process.env.ADMIN_SITE_ORIGIN = "https://admin.marvellflorist.com";
    assert.match(auth.cookie("mv_admin_session", "opaque", 60), /; Secure/);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_SITE_ORIGIN;
    else process.env.ADMIN_SITE_ORIGIN = previous;
  }
});

test("MFA enrollment replaces only unfinished TOTP factors and preserves verified factors", async () => {
  const unfinished = { id: "11111111-1111-4111-8111-111111111111",
    factor_type: "totp", status: "unverified" };
  const phone = { id: "22222222-2222-4222-8222-222222222222",
    factor_type: "phone", status: "unverified" };
  assert.deepEqual(classifyTotpFactors({ all: [unfinished, phone], totp: [] }), {
    verified: [], unverified: [unfinished]
  });

  const calls = [];
  const auth = { auth: { mfa: {
    listFactors: async () => ({ data: { all: [unfinished, phone], totp: [] }, error: null }),
    unenroll: async ({ factorId }) => { calls.push(["unenroll", factorId]); return { data: { id: factorId }, error: null }; },
    enroll: async (options) => { calls.push(["enroll", options]); return { error: null, data: {
      id: "33333333-3333-4333-8333-333333333333",
      totp: { qr_code: "data:image/svg+xml;utf-8,qr", secret: "MANUALSECRET" }
    } }; }
  } } };
  assert.deepEqual(await beginTotpEnrollment(auth), {
    alreadyVerified: false,
    factorId: "33333333-3333-4333-8333-333333333333",
    qrCode: "data:image/svg+xml;utf-8,qr",
    secret: "MANUALSECRET"
  });
  assert.deepEqual(calls, [
    ["unenroll", unfinished.id],
    ["enroll", { factorType: "totp", friendlyName: "Marvell Admin" }]
  ]);

  const verifiedAuth = { auth: { mfa: {
    listFactors: async () => ({ data: { all: [], totp: [{ id: "verified" }] }, error: null }),
    unenroll: async () => assert.fail("verified factor must not be removed"),
    enroll: async () => assert.fail("a second factor must not be created")
  } } };
  assert.deepEqual(await beginTotpEnrollment(verifiedAuth), { alreadyVerified: true });
  assert.deepEqual(mfaFailure({ code: "mfa_verification_failed" }), {
    code: "kode_salah",
    message: "Kode autentikator tidak valid. Periksa waktunya lalu coba lagi.",
    status: 401
  });
});

test("staff-facing system errors and paid-order alerts use Indonesian", async () => {
  const denied = await methodNotAllowed(["POST"]).json();
  assert.match(denied.message, /Metode permintaan tidak diizinkan/);
  const mail = paidOrderEmail({ reference: "MV-2345-6789", deliveryDate: "2026-10-01",
    deliveryWindow: "morning", stockException: true,
    orderId: "d8a26c6d-3d1e-42fd-9b44-72e2080e31cd" });
  assert.match(mail.subject, /Perlu Tindakan/);
  assert.match(mail.text, /reservasi stok telah dilepas/);
  assert.match(mail.text, /Pagi/);
});

test("order detail projections keep customer contact and prices with permitted roles", () => {
  const row = { id: "id", public_order_number: "MV-2345-6789", email: "buyer@example.com",
    phone: "08123456789", total_idr: 100000, card_message: "Private greeting",
    recipient_name: "Rina", recipient_phone: "08111111111", delivery_address: "Street 1",
    order_items: [{ sku: "ST-01", product_name_snapshot: "Flowers", quantity: 1,
      product_image_snapshot: "/assets/a.webp", unit_price_idr: 100000, line_total_idr: 100000 }] };
  const delivery = publicOrder(row, "delivery");
  assert.equal(delivery.delivery_address, "Street 1");
  assert.equal(delivery.email, undefined);
  assert.equal(delivery.card_message, undefined);
  assert.equal(delivery.items[0].unit_price_idr, undefined);
  const florist = publicOrder(row, "florist");
  assert.equal(florist.card_message, "Private greeting");
  assert.equal(florist.delivery_address, undefined);
  assert.equal(florist.email, undefined);
  assert.equal(publicOrder(row, "owner").email, "buyer@example.com");
});

test("analytics rejects sensitive event payloads and strips order references from paths", () => {
  const session_id = "d8a26c6d-3d1e-42fd-9b44-72e2080e31cd";
  assert.throws(() => validateEvent({ session_id, event_name: "page_view",
    properties: { email: "buyer@example.com" } }), /sensitive_properties/);
  assert.equal(safePath("/order/MV-2345-6789?receipt=secret"), "/order/:reference");
  assert.deepEqual(normalizeTouch({ utm_source: "IG", utm_medium: "Reel",
    utm_campaign: "October Launch" }), {
    source: "instagram", medium: "reel", campaign: "october_launch", content: null
  });
});

test("Google Analytics stays unloaded until the browser has an explicit analytics choice", async () => {
  const script = await read("assets/site-language.js");
  for (const allowed of [false, true]) {
    const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>",
      { url: "https://marvellflorist.com/", runScripts: "outside-only" });
    if (allowed) dom.window.localStorage.setItem("marvell-browser-consent-v1",
      JSON.stringify({ version: "2026-09-01", analytics: true }));
    dom.window.eval(script);
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    assert.equal(dom.window["ga-disable-G-Z9PJ60V3CR"], !allowed);
    assert.equal(Boolean(dom.window.document.querySelector('script[src*="googletagmanager.com"]')), allowed);
    dom.window.close();
  }
});

test("late payment and notification SQL covers expiry, stock exception, and durable alert", async () => {
  const core = await read("supabase/migrations/0010_marvell_admin_core.sql");
  const notifications = await read("supabase/migrations/0011_order_notifications.sql");
  assert.match(core, /expires_at <= now\(\)/);
  assert.match(core, /v_order\.status <> 'pending_payment'/);
  assert.match(core, /if not v_exception then\s+update public\.products_commerce/);
  assert.match(core, /needs_attention = v_exception, stock_exception = v_exception/);
  assert.match(core, /raise exception 'STOCK_UNAVAILABLE'/);
  assert.match(notifications, /create trigger orders_paid_notification after update of status/);
  assert.match(notifications, /create or replace function public\.reconcile_paid_order_notifications/);
  assert.match(notifications, /recipient_kind, channel\)\s+values \(v_notification_id, 'paid:' \|\| new\.id::text \|\| ':email:customer'/);
});
