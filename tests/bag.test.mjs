/**
 * The guest bag.
 *
 * Runs assets/marvell-shop.js against a minimal fake browser. The point of
 * these tests is the storage contract: whatever is in localStorage, only a
 * SKU and a quantity may ever come back out of it.
 */

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const SOURCE = await readFile(new URL("../assets/marvell-shop.js", import.meta.url), "utf8");

/** A fresh module instance with its own storage, for each test. */
function loadShop(initialStorage = null) {
  const store = new Map();
  if (initialStorage !== null) {
    store.set("marvell-bag-v1", typeof initialStorage === "string"
      ? initialStorage
      : JSON.stringify(initialStorage));
  }

  const window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key)
    },
    location: { origin: "https://marvellflorist.com" },
    addEventListener() {},
    dispatchEvent() {},
    localeHack: undefined
  };

  const context = vm.createContext({
    window,
    document: { addEventListener() {} },
    console,
    fetch: async () => { throw new Error("network disabled in tests"); },
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    URL,
    URLSearchParams,
    Date,
    Number,
    Math,
    JSON,
    String,
    Array,
    Object,
    Set,
    Map,
    Boolean
  });
  context.globalThis = context;

  vm.runInContext(SOURCE, context);
  return { Shop: window.MarvellShop, Bag: window.MarvellBag, store };
}

/**
 * Values created inside the VM carry that realm's prototypes, so strict deep
 * equality would compare Object.prototype identity rather than content. A JSON
 * round trip gives us plain host objects to assert against.
 */
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("a fresh bag is empty", () => {
  const { Bag } = loadShop();
  assert.deepEqual(plain(Bag.read()), []);
  assert.equal(Bag.count(), 0);
});

test("adding and stepping quantity", () => {
  const { Bag } = loadShop();

  assert.equal(Bag.add("ST-01", 1), false, "an unanswered order cannot enter the bag");
  assert.deepEqual(plain(Bag.read()), []);
  Bag.writeOrderPlan({ date: "2026-10-01", timeWindow: "morning", fulfilment: "delivery" });

  Bag.add("ST-01", 2);
  assert.deepEqual(plain(Bag.read()), [{ sku: "ST-01", quantity: 2 }]);

  Bag.add("ST-01", 1);
  assert.equal(Bag.read()[0].quantity, 3, "adding the same SKU accumulates");

  Bag.setQuantity("ST-01", 5);
  assert.equal(Bag.read()[0].quantity, 5);

  Bag.remove("ST-01");
  assert.deepEqual(plain(Bag.read()), []);
});

test("quantities are capped and floored", () => {
  const { Bag } = loadShop();
  Bag.writeOrderPlan({ date: "2026-10-01", timeWindow: "morning", fulfilment: "delivery" });

  Bag.add("ST-01", 999);
  assert.equal(Bag.read()[0].quantity, 20, "capped at the maximum");

  // Setting below one removes the line rather than storing a zero.
  Bag.setQuantity("ST-01", 0);
  assert.deepEqual(plain(Bag.read()), []);
});

test("a price injected into storage is discarded on read", () => {
  // The attack: hand-edit localStorage to carry a price of 1 rupiah.
  const { Bag } = loadShop([
    { sku: "ST-01", quantity: 1, price_idr: 1, unit_price_idr: 1, line_total_idr: 1, name: "hacked" }
  ]);

  const lines = Bag.read();
  assert.deepEqual(plain(lines), [{ sku: "ST-01", quantity: 1 }]);
  assert.equal(Object.keys(lines[0]).length, 2, "only sku and quantity survive");
});

test("malformed storage never throws", () => {
  for (const junk of ["not json at all", "null", '{"not":"an array"}', "[1,2,3]", '[{"sku":"nope"}]']) {
    const { Bag } = loadShop(junk);
    assert.deepEqual(plain(Bag.read()), [], `should recover from ${junk}`);
  }
});

test("storage that throws is treated as an empty bag", () => {
  // Private browsing and blocked site data both surface as a throw.
  const SOURCE_LOCAL = SOURCE;
  const window = {
    localStorage: {
      getItem() { throw new Error("SecurityError"); },
      setItem() { throw new Error("QuotaExceededError"); }
    },
    location: { origin: "https://marvellflorist.com" },
    addEventListener() {},
    dispatchEvent() {}
  };
  const context = vm.createContext({
    window, document: { addEventListener() {} }, console,
    CustomEvent: class { constructor(t, i) { this.type = t; this.detail = i?.detail; } },
    URL, URLSearchParams, Date, Number, Math, JSON, String, Array, Object, Set, Map, Boolean,
    fetch: async () => { throw new Error("offline"); }
  });
  context.globalThis = context;
  vm.runInContext(SOURCE_LOCAL, context);

  assert.deepEqual(plain(window.MarvellBag.read()), []);
  assert.doesNotThrow(() => window.MarvellBag.add("ST-01", 1));
});

test("duplicate lines in storage are merged", () => {
  const { Bag } = loadShop([
    { sku: "ST-01", quantity: 2 },
    { sku: "ST-01", quantity: 3 }
  ]);
  assert.deepEqual(plain(Bag.read()), [{ sku: "ST-01", quantity: 5 }]);
});

test("applyCorrections brings storage in line with the server", () => {
  const { Shop, Bag } = loadShop([
    { sku: "ST-01", quantity: 5 },
    { sku: "ST-02", quantity: 1 }
  ]);

  const changed = Shop.applyCorrections([
    { sku: "ST-01", type: "quantity_reduced", quantity: 2 },
    { sku: "ST-02", type: "removed" }
  ]);

  assert.equal(changed, true);
  assert.deepEqual(plain(Bag.read()), [{ sku: "ST-01", quantity: 2 }]);
});

test("formatIdr matches the format used across the site", () => {
  const { Shop } = loadShop();
  assert.equal(Shop.formatIdr(1050000), "Rp1.050.000");
  assert.equal(Shop.formatIdr(0), "Rp0");
  assert.equal(Shop.formatIdr(null), "");
});

test("escapeHtml neutralises markup", () => {
  const { Shop } = loadShop();
  assert.equal(
    Shop.escapeHtml('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
  );
  assert.equal(Shop.escapeHtml("Tom & Jerry's"), "Tom &amp; Jerry&#39;s");
});

test("safeImage blocks anything that is not a same-origin path", () => {
  const { Shop } = loadShop();
  assert.equal(Shop.safeImage("/assets/a.webp"), "/assets/a.webp");
  for (const bad of ["javascript:alert(1)", "//evil.com/x.png", "https://evil.com/x.png", "data:image/svg+xml,<svg/onload=alert(1)>"]) {
    assert.equal(Shop.safeImage(bad), "", `should block ${bad}`);
  }
});

test("paragraphs escapes CMS text while keeping its shape", () => {
  const { Shop } = loadShop();
  const html = Shop.paragraphs("First <b>para</b>\n\nSecond");
  assert.equal(html, "<p>First &lt;b&gt;para&lt;/b&gt;</p><p>Second</p>");
});

// ----------------------------------------------------- the order plan -------

/**
 * Nothing enters the bag before the order is settled.
 *
 * When a piece is wanted, and whether it is delivered or collected, used to be
 * asked at the very end — at checkout, after a bag had been filled and carried
 * around. It is the one question that can invalidate the whole order, so it is
 * asked first and the bag will not take anything until it is answered.
 */
test("an order plan is only a plan once all three answers are in", () => {
  const { Bag } = loadShop();
  assert.equal(Bag.orderPlanSettled(), false, "an empty bag starts with no plan");

  // Each of the three missing in turn.
  assert.equal(Bag.writeOrderPlan({ timeWindow: "morning", fulfilment: "delivery" }), false, "no date");
  assert.equal(Bag.writeOrderPlan({ date: "2026-10-01", fulfilment: "delivery" }), false, "no time window");
  assert.equal(Bag.writeOrderPlan({ date: "2026-10-01", timeWindow: "morning" }), false, "no fulfilment");
  assert.equal(Bag.orderPlanSettled(), false);

  assert.equal(Bag.writeOrderPlan({ date: "2026-10-01", timeWindow: "morning", fulfilment: "delivery" }), true);
  assert.equal(Bag.orderPlanSettled(), true);
  assert.deepEqual(plain(Bag.readOrderPlan()),
    { date: "2026-10-01", dateUnsure: false, timeWindow: "morning", fulfilment: "delivery", notes: "" });
});

test("not knowing the date yet is an answer; leaving it blank is not", () => {
  const { Bag } = loadShop();
  assert.equal(Bag.writeOrderPlan({ date: "", timeWindow: "afternoon", fulfilment: "pickup" }), false);
  assert.equal(Bag.writeOrderPlan({ dateUnsure: true, timeWindow: "afternoon", fulfilment: "pickup" }), true);
  assert.equal(plain(Bag.readOrderPlan()).dateUnsure, true);
});

test("a plan will not take a date, a window or a fulfilment it does not recognise", () => {
  const { Bag } = loadShop();
  assert.equal(Bag.writeOrderPlan({ date: "01/10/2026", timeWindow: "morning", fulfilment: "delivery" }), false);
  assert.equal(Bag.writeOrderPlan({ date: "2026-10-01", timeWindow: "whenever", fulfilment: "delivery" }), false);
  assert.equal(Bag.writeOrderPlan({ date: "2026-10-01", timeWindow: "morning", fulfilment: "teleport" }), false);
  assert.equal(Bag.orderPlanSettled(), false);
});


test("emptying the bag forgets the plan, because the next bag is a new order", () => {
  const { Bag } = loadShop();
  Bag.writeOrderPlan({ date: "2026-10-01", timeWindow: "morning", fulfilment: "delivery" });
  Bag.add("ST-01", 1);
  assert.equal(Bag.orderPlanSettled(), true);

  Bag.clear();
  assert.equal(Bag.orderPlanSettled(), false, "the plan outlived the bag it belonged to");
  assert.deepEqual(plain(Bag.read()), []);
});

test("the bag asks the page for a plan, and takes no for an answer", async () => {
  const { Bag } = loadShop();

  // A page with no Order details step cannot answer, so nothing is added.
  assert.equal(await Bag.requestOrderPlan(), false, "answered without anything to ask");

  // One that closes the panel on the question.
  Bag.registerOrderPlanCollector(() => {});
  assert.equal(await Bag.requestOrderPlan(), false);
  assert.equal(Bag.orderPlanSettled(), false);

  // And one that settles it.
  Bag.registerOrderPlanCollector(() => {
    Bag.writeOrderPlan({ date: "2026-10-01", timeWindow: "morning", fulfilment: "delivery" });
  });
  assert.equal(await Bag.requestOrderPlan(), true);

  // Settled once: the second piece is not asked again.
  let askedAgain = false;
  Bag.registerOrderPlanCollector(() => { askedAgain = true; });
  assert.equal(await Bag.requestOrderPlan(), true);
  assert.equal(askedAgain, false, "the same order was asked about twice");
});
