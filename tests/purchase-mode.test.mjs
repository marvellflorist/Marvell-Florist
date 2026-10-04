/**
 * purchaseMode, and the fence around the Mother's Day prototype.
 *
 * Two things matter here more than anything else:
 *
 *   1. Nothing Marvell has already published becomes purchasable by accident.
 *      Ten years of Gallery and Featured work is consultation work, and the
 *      October 2026 retail model must not reach backwards over it.
 *
 *   2. The prototype cannot escape. It is development scaffolding built on a
 *      dormant collection, with invented stock, and it must be invisible
 *      unless both the server flag and the browser flag are on.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const ROOT = new URL("../", import.meta.url);
const PURCHASE_SOURCE = await readFile(new URL("assets/purchase-mode.js", ROOT), "utf8");

function load(url = "https://marvellflorist.com/product.html") {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url, runScripts: "outside-only" });
  dom.window.eval(PURCHASE_SOURCE);
  return dom;
}

// ------------------------------------------------------------- defaults ----

test("consultation is the default for anything that does not ask otherwise", () => {
  const { window } = load();
  const { MarvellPurchase: P } = window;

  for (const record of [
    {},
    { title: "A bouquet" },
    { price: 350000 },
    { purchaseMode: "" },
    { purchaseMode: "DIRECTLY" },
    { purchaseMode: true },
    null,
    undefined
  ]) {
    assert.equal(P.resolve(record, { allowDirect: true }), "consultation");
  }
  window.close();
});

test("a historical product never becomes purchasable, even with the gate open", () => {
  const { window } = load();
  const { MarvellPurchase: P } = window;

  // Shape of a real Featured record from content/featured.json: a name, an
  // image, a price, filters. No SKU, no mode.
  const historical = {
    title: "Sovereign",
    image: "/assets/uploads/img_4691.webp",
    price: 550000,
    filters: { type: "bouquet", colors: ["black"] }
  };
  assert.equal(P.resolve(historical, { allowDirect: true }), "consultation");
  window.close();
});

test("direct requires both a valid SKU and an explicit mode", () => {
  const { window } = load();
  const { MarvellPurchase: P } = window;

  assert.equal(P.resolve({ sku: "MD-01" }, { allowDirect: true }), "consultation", "a SKU alone is not consent");
  assert.equal(P.resolve({ purchaseMode: "direct" }, { allowDirect: true }), "consultation", "a mode alone cannot be bagged");
  assert.equal(P.resolve({ sku: "not a sku", purchaseMode: "direct" }, { allowDirect: true }), "consultation");
  assert.equal(P.resolve({ sku: "MD-01", purchaseMode: "direct" }, { allowDirect: true }), "direct");
  window.close();
});

test("the gate alone can hold a direct product back", () => {
  const { window } = load();
  const { MarvellPurchase: P } = window;
  const product = { sku: "MD-01", purchaseMode: "direct" };

  assert.equal(P.resolve(product, { allowDirect: false }), "consultation");
  assert.equal(P.resolve(product, { allowDirect: true }), "direct");
  window.close();
});

test("unavailable is honoured whatever the gate says", () => {
  const { window } = load();
  const { MarvellPurchase: P } = window;
  const product = { sku: "MD-01", purchaseMode: "unavailable" };

  assert.equal(P.resolve(product, { allowDirect: true }), "unavailable");
  assert.equal(P.resolve(product, { allowDirect: false }), "unavailable");
  window.close();
});

// --------------------------------------------------------- the test gate ----

test("the prototype is off unless it is asked for by name", () => {
  assert.equal(load("https://marvellflorist.com/featured.html").window.MarvellPurchase.isCommerceTest(), false);
  assert.equal(load("https://marvellflorist.com/product.html?category=X").window.MarvellPurchase.isCommerceTest(), false);
  assert.equal(load("https://marvellflorist.com/?commerce-test=1").window.MarvellPurchase.isCommerceTest(), true);
  assert.equal(load("https://marvellflorist.com/?commerce-test=0").window.MarvellPurchase.isCommerceTest(), false);
});

test("the flag survives navigation so the flow can be walked", () => {
  const { window } = load("https://marvellflorist.com/featured.html?commerce-test=1");
  const { MarvellPurchase: P } = window;

  assert.equal(P.isCommerceTest(), true);
  assert.equal(P.decorateHref("product.html?title=Sovereign"), "product.html?title=Sovereign&commerce-test=1");
  assert.equal(P.decorateHref("/bag"), "/bag?commerce-test=1");
  // External links and anchors are left alone.
  assert.equal(P.decorateHref("https://wa.me/6281275017456"), "https://wa.me/6281275017456");
  assert.equal(P.decorateHref("#newsletter"), "#newsletter");
  window.close();
});

// ------------------------------------------------------- the prototype ------

test("the prototype file is scaffolding, and says so", async () => {
  const raw = await readFile(new URL("content/_dev-mothers-day-commerce.json", ROOT), "utf8");
  const data = JSON.parse(raw);

  assert.match(data._WARNING, /DEVELOPMENT ONLY/);
  assert.match(data._comment, /MARVELL_COMMERCE_TEST/);
  assert.match(data._comment, /Stock figures are INVENTED/);
  assert.equal(data._source, "content/featured.json -> events[id=mothers_day]");
  // The filename itself is the first warning anyone sees in a diff.
  assert.ok(data.products.every((product) => product.sku.startsWith("MD-")));
});

test("the prototype copies the real collection rather than inventing one", async () => {
  const featured = JSON.parse(await readFile(new URL("content/featured.json", ROOT), "utf8"));
  const overlay = JSON.parse(await readFile(new URL("content/_dev-mothers-day-commerce.json", ROOT), "utf8"));
  const source = featured.events.find((event) => event.id === "mothers_day");

  assert.ok(source, "the dormant Mother's Day collection is still in featured.json");
  assert.equal(overlay.products.length, source.products.length);

  overlay.products.forEach((product, index) => {
    const original = source.products[index];
    assert.equal(product.name, original.name, "names are copied, never rewritten");
    assert.equal(product.description, original.description);
    assert.equal(product.images[0].image, original.src);
    assert.equal(
      overlay.commerce[product.sku].price_idr,
      original.price,
      "prices come from the real collection"
    );
  });
});

test("Mother's Day is real inventory now, and joined up across the content", async () => {
  // It began as a prototype behind ?commerce-test=1 and was promoted: the
  // collection is sold, so its pieces live in the catalogue the CMS owns
  // rather than in content/_dev-mothers-day-commerce.json. What that requires
  // is that the three files agree, because a SKU that is only in two of them
  // renders as a piece with no price, or a price with no piece.
  const retail = JSON.parse(await readFile(new URL("content/retail-products.json", ROOT), "utf8"));
  const collections = JSON.parse(await readFile(new URL("content/collections.json", ROOT), "utf8"));
  const featured = JSON.parse(await readFile(new URL("content/featured.json", ROOT), "utf8"));
  const commerce = JSON.parse(await readFile(new URL("content/retail-commerce.json", ROOT), "utf8"));

  const retailSkus = new Set(retail.products.map((product) => product.sku));
  const mothersDay = featured.events.find((event) => event.id === "mothers_day");

  assert.ok(mothersDay.products.length > 0);
  for (const product of mothersDay.products) {
    assert.match(product.sku || "", /^MD-[0-9]{2}$/, `${product.name} carries its SKU`);
    assert.equal(product.purchaseMode, "direct", `${product.name} is bought, not enquired about`);
    assert.ok(retailSkus.has(product.sku), `${product.sku} is in the retail catalogue`);
  }

  const collection = collections.collections.find((entry) => entry.id === "mothers-day");
  assert.ok(collection, "the collection is in the catalogue");
  // Archived out of season; the files must still agree for when it returns.
  assert.ok(["active", "archived"].includes(collection.status), collection.status);

  // Every SKU has somewhere for its price and its on-sale switch to live.
  const priced = new Set(commerce.products.map((row) => row.sku));
  for (const product of mothersDay.products) {
    assert.ok(priced.has(product.sku), `${product.sku} has a stock row`);
  }
});

test("the admin can take a piece off sale, and can never put stock back on", async () => {
  // The switch is the point of content/retail-commerce.json: it must apply
  // over whatever the authoritative source says, and only ever downwards.
  const source = await readFile(new URL("netlify/functions/_lib/commerce.mjs", ROOT), "utf8");
  assert.match(source, /const admin = await fetchRetailCommerceRows\(skus\)/);
  assert.match(source, /if \(row\.purchasable\) return;/,
    "a row that is on sale changes nothing about a SKU Supabase answered for");
  assert.match(source, /in_stock: false, available_quantity: 0, purchasable: false/,
    "and a row that is off sale can only take it off sale");

  const commerce = JSON.parse(await readFile(new URL("content/retail-commerce.json", ROOT), "utf8"));
  for (const row of commerce.products) {
    assert.match(row.sku, /^[A-Z0-9]{2,6}-[0-9]{2,3}$/);
    assert.equal(typeof row.available, "boolean", `${row.sku} carries the switch`);
  }
});

test("showing a seasonal collection is still not the same as selling it", async () => {
  // Mother's Day is sold because somebody wrote a SKU and a purchase mode
  // onto each of its pieces, on purpose. Every other collection is shown and
  // not sold, and turning one on in the CMS must never be what changes that:
  // a piece with no SKU has no price the server will honour and no Add to
  // Bag, whatever else is true of the collection it sits in.
  const featured = JSON.parse(await readFile(new URL("content/featured.json", ROOT), "utf8"));
  const retail = JSON.parse(await readFile(new URL("content/retail-products.json", ROOT), "utf8"));
  const retailSkus = new Set(retail.products.map((product) => product.sku));

  const live = featured.events.filter((event) => event.forceActive === true);
  assert.ok(live.length > 0, "at least one collection is running");

  const sold = new Set(["mothers_day"]);
  for (const event of live) {
    if (sold.has(event.id)) continue;
    for (const product of event.products || []) {
      assert.ok(!product.sku, `${event.id}: no SKU on a seasonal piece`);
      assert.ok(!product.purchaseMode, `${event.id}: no purchase mode on a seasonal piece`);
    }
  }

  // And a piece that does claim a SKU must actually be in the catalogue,
  // rather than naming one that resolves to nothing.
  for (const event of featured.events) {
    for (const product of event.products || []) {
      if (!product.sku) continue;
      assert.ok(retailSkus.has(product.sku), `${event.id}: ${product.sku} is real inventory`);
    }
  }
});

test("the prototype is excluded from the deploy as well as switched off", async () => {
  const toml = await readFile(new URL("netlify.toml", ROOT), "utf8");
  assert.match(toml, /!content\/_dev-\*\.json/, "the file is not bundled with the functions");

  const env = await readFile(new URL(".env.example", ROOT), "utf8");
  assert.match(env, /MARVELL_COMMERCE_TEST=false/, "the flag ships off");
});

test("the server flag cannot be on beside live payments", async () => {
  const source = await readFile(new URL("netlify/functions/_lib/env.mjs", ROOT), "utf8");
  const fn = source.slice(source.indexOf("export function isCommerceTestMode"));
  assert.match(fn, /if \(config\.ipaymuEnvironment !== "sandbox"\) return false;/);
});

// ------------------------------------------------------------- the page -----

test("product.html renders one detail page with three possible actions", async () => {
  const html = await readFile(new URL("product.html", ROOT), "utf8");

  // One page, not two systems: the consultation button and the bag controls
  // live in the same column, and the mode decides which is shown.
  assert.match(html, /id="product-whatsapp"/, "consultation flow retained");
  assert.match(html, /id="product-purchase"/, "direct purchase block present");
  assert.match(html, /id="product-unavailable"/, "unavailable state present");

  // Exactly one of them is ever painted. An author `display` beats the
  // browser's own `[hidden] { display: none }`, so .hidden alone was setting
  // an attribute nobody could see and the page drew both actions at once.
  assert.match(
    html,
    /\.product-purchase\[hidden\],\n\.product-bag-btn\[hidden\],\n\.product-whatsapp-btn\[hidden\]/,
    "hiding these has to survive their own display rules"
  );

  // No quantity beside Add to Bag: one tap adds one piece, and how many is
  // settled in the bag against what is actually in stock.
  assert.ok(!html.includes("data-bag-quantity-field"), "quantity is the bag's business");
  assert.ok(!html.includes('id="product-qty-input"'), "and there is no stepper to read");

  // The SKU is only attached once the server has confirmed it is purchasable.
  assert.match(html, /if \(availability\.canBuy\) bagBtn\.dataset\.bagAdd = retail\.sku;/);
  assert.match(html, /else delete bagBtn\.dataset\.bagAdd;/);

  // No second product-detail system was built for retail.
  assert.ok(!html.includes("shop-product-detail"), "retail reuses this page");
});

// -------------------------------------------------------- the icon family ---

test("the header is drawn with the Marvell icon family, not stock glyphs", async () => {
  const icons = await readFile(new URL("assets/marvell-icons.js", ROOT), "utf8");

  // One specification for the whole set.
  const strokes = [...icons.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => m[1]);
  assert.ok(strokes.length > 0);
  assert.ok(strokes.every((value) => value === "1.25"), "one stroke weight across the family");

  for (const name of ["menu", "search", "heart", "account", "bag"]) {
    assert.match(icons, new RegExp(`${name}:`), `${name} is in the family`);
  }

  // A bag, never a trolley: no wheels, which is what a cart icon's circles are.
  const bag = icons.slice(icons.indexOf("bag: () =>"));
  assert.ok(!/circle/.test(bag.slice(0, 400)), "the bag has no wheels");

  // Contact has its own icon and stays available in the masthead.
  const header = await readFile(new URL("assets/header-template.js", ROOT), "utf8");
  assert.match(icons, /contact: \(\) =>/, "contact has a matching glyph");
  assert.match(header, /\.header-bar \.contact-quick-trigger \{ display: inline-flex !important; \}/);
});

test("the shared shell mounts a Join Marvell entry", async () => {
  const header = await readFile(new URL("assets/header-template.js", ROOT), "utf8");
  assert.match(header, /ensureAccountEntry\(\)/);
});

test("the header's one worded control turns with the rest over a hero", async () => {
  const header = await readFile(new URL("assets/header-template.js", ROOT), "utf8");
  const favorites = await readFile(new URL("assets/favorites.js", ROOT), "utf8");
  const bag = await readFile(new URL("assets/bag.js", ROOT), "utf8");

  // Every header control has a light state over a dark hero. The account was
  // the one that did not, so it stayed dark against the photograph while the
  // wordmark, the heart and the bag all turned.
  const pale = /rgba\(242, 236, 224, 0\.96\)/;
  assert.match(header.slice(header.indexOf("body.desktop-header-hero-mode .header-account")), pale);
  assert.match(favorites.slice(favorites.indexOf("body.desktop-header-hero-mode .favorites-launcher-btn")), pale);
  assert.match(bag.slice(bag.indexOf("body.desktop-header-hero-mode .bag-launcher-btn")), pale);
});
