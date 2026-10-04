import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const root = new URL("../", import.meta.url);
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("staff home opens the prioritized queue and keeps recipient details off the card", async () => {
  const html = await readFile(new URL("marvell-admin/public/index.html", root), "utf8");
  const script = await readFile(new URL("marvell-admin/public/assets/admin.js", root), "utf8");
  const dom = new JSDOM(html, { url: "https://admin.marvellflorist.com/", runScripts: "outside-only" });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false });
  Object.defineProperty(window.crypto, "randomUUID", { value: () => "f9402be3-380f-4783-8e80-a552093b259c" });
  let printDialogs = 0;
  window.print = () => { printDialogs += 1; };
  const order = { id: "d8a26c6d-3d1e-42fd-9b44-72e2080e31cd", reference: "MV-2345-6789",
    payment_status: "settlement", fulfillment_state: "acknowledged", delivery_method: "delivery",
    recipient_name: "Private Recipient", recipient_phone: "08123456789",
    delivery_address: "Private Street", card_message: "Happy birthday!", card_sender: "Friend",
    card_anonymous: false, needs_attention: false, items: [{ sku: "ST-01", name: "Flowers", quantity: 1 }] };
  const calls = [];
  window.fetch = async (input, init) => {
    const path = String(input);
    calls.push({ path, body: init?.body ? JSON.parse(init.body) : null });
    let data = { ok: true };
    if (path === "/api/admin/session") data = { ok: true, signed_in: true, mfa_required: false,
      staff: { role: "store_admin", display_name: "Toko", can_manage_stock: true } };
    else if (path.startsWith("/api/admin/orders?")) data = { ok: true, orders: [order] };
    else if (path.startsWith("/api/admin/orders/")) data = { ok: true, order };
    return { ok: true, json: async () => data };
  };
  window.eval(script);
  for (let i = 0; i < 10; i += 1) await tick();
  assert.ok(calls.some((call) => call.path === "/api/admin/orders?queue=open"));
  assert.ok(!calls.some((call) => call.path === "/api/admin/mfa"), "valid AAL2 reopen has no MFA challenge");
  assert.match(window.document.body.textContent, /Beranda|Pesanan/);
  window.document.querySelector("[data-order-id]").click();
  for (let i = 0; i < 10; i += 1) await tick();
  const card = window.document.querySelector("#card-preview-area");
  assert.ok(card);
  assert.match(card.textContent, /Happy birthday!/);
  assert.match(card.textContent, /MV-2345-6789/);
  assert.doesNotMatch(card.textContent, /Private Recipient|08123456789|Private Street/);
  assert.match(window.document.querySelector("#order-detail").textContent, /Private Street/);
  assert.ok(window.document.querySelector('[data-action="preview-card"]'));
  assert.ok(window.document.querySelector('[data-action="print-card"]'));
  assert.equal(window.document.querySelector('[data-action="confirm-print"]'), null);
  window.document.querySelector('[data-action="print-card"]').click();
  for (let i = 0; i < 10; i += 1) await tick();
  assert.equal(printDialogs, 1);
  assert.ok(calls.some((call) => call.body?.action === "request"));
  assert.ok(!calls.some((call) => call.body?.action === "confirm"));
  assert.ok(window.document.querySelector('[data-action="confirm-print"]'), "confirmation is a separate action");
  window.close();
});

test("unsigned staff sees Indonesian email sign-in", async () => {
  const html = await readFile(new URL("marvell-admin/public/index.html", root), "utf8");
  const script = await readFile(new URL("marvell-admin/public/assets/admin.js", root), "utf8");
  const dom = new JSDOM(html, { url: "https://admin.marvellflorist.com/", runScripts: "outside-only" });
  dom.window.fetch = async () => ({ ok: true, json: async () => ({ ok: true, signed_in: false }) });
  dom.window.eval(script);
  for (let i = 0; i < 5; i += 1) await tick();
  assert.match(dom.window.document.body.textContent, /Masuk untuk bekerja/);
  assert.match(dom.window.document.body.textContent, /Kirim Kode Masuk/);
  dom.window.close();
});

test("AAL1 staff session sees Indonesian MFA setup before any order data", async () => {
  const html = await readFile(new URL("marvell-admin/public/index.html", root), "utf8");
  const script = await readFile(new URL("marvell-admin/public/assets/admin.js", root), "utf8");
  const dom = new JSDOM(html, { url: "https://admin.marvellflorist.com/", runScripts: "outside-only" });
  const calls = [];
  dom.window.fetch = async (input) => {
    calls.push(String(input));
    const data = String(input) === "/api/admin/session"
      ? { ok: true, signed_in: true, mfa_required: true, staff: { role: "florist", display_name: "Toko" } }
      : { ok: true, factors: [] };
    return { ok: true, json: async () => data };
  };
  dom.window.eval(script);
  for (let i = 0; i < 5; i += 1) await tick();
  assert.match(dom.window.document.body.textContent, /Verifikasi dua langkah/);
  assert.match(dom.window.document.body.textContent, /Aktifkan Sekarang/);
  assert.ok(!calls.some((path) => path.includes("/api/admin/orders")));
  dom.window.close();
});

test("owner can enroll TOTP through POST, verify it, and reach the dashboard", async () => {
  const html = await readFile(new URL("marvell-admin/public/index.html", root), "utf8");
  const script = await readFile(new URL("marvell-admin/public/assets/admin.js", root), "utf8");
  const dom = new JSDOM(html, { url: "http://localhost:8890/", runScripts: "outside-only" });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false });
  let aal2 = false;
  const calls = [];
  window.fetch = async (input, init = {}) => {
    const path = String(input);
    const method = init.method || "GET";
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ path, method, body });
    let data = { ok: true };
    if (path === "/api/admin/session") data = { ok: true, signed_in: true, mfa_required: !aal2,
      staff: { role: "owner", display_name: "Pemilik", can_manage_stock: true } };
    else if (path === "/api/admin/mfa") data = { ok: true, factors: [] };
    else if (path === "/api/admin/mfa/enroll") data = { ok: true,
      factor_id: "33333333-3333-4333-8333-333333333333",
      qr_code: "data:image/svg+xml;utf-8,%3Csvg%3Eqr%3C/svg%3E", secret: "MARVELLSECRET" };
    else if (path === "/api/admin/mfa/verify") { aal2 = true; data = { ok: true, signed_in: true, mfa_required: false }; }
    else if (path.startsWith("/api/admin/orders?")) data = { ok: true, orders: [] };
    return { ok: true, status: 200, json: async () => data };
  };

  window.eval(script);
  for (let i = 0; i < 8; i += 1) await tick();
  window.document.querySelector('[data-action="enroll"]').click();
  for (let i = 0; i < 8; i += 1) await tick();

  const enrollCall = calls.find((call) => call.path === "/api/admin/mfa/enroll");
  assert.deepEqual(enrollCall, { path: "/api/admin/mfa/enroll", method: "POST", body: {} });
  assert.equal(window.document.querySelector(".qr")?.getAttribute("src"),
    "data:image/svg+xml;utf-8,%3Csvg%3Eqr%3C/svg%3E");
  assert.match(window.document.body.textContent, /MARVELLSECRET/);
  assert.match(window.document.body.textContent, /Kunci manual/);

  window.document.querySelector("#mfa-code").value = "123456";
  window.document.querySelector("#mfa-form").dispatchEvent(
    new window.Event("submit", { bubbles: true, cancelable: true })
  );
  for (let i = 0; i < 12; i += 1) await tick();

  const verifyCall = calls.find((call) => call.path === "/api/admin/mfa/verify");
  assert.deepEqual(verifyCall, { path: "/api/admin/mfa/verify", method: "POST", body: {
    factor_id: "33333333-3333-4333-8333-333333333333", code: "123456"
  } });
  assert.match(window.document.body.textContent, /Apa yang harus dikerjakan sekarang/);
  assert.ok(calls.some((call) => call.path === "/api/admin/orders?queue=open"));
  window.close();
});
