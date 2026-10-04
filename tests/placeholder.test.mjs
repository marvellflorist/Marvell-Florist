/**
 * Placeholder shop mode.
 *
 * Placeholder mode lets the shop be reviewed before Supabase exists, by
 * serving invented prices from content/placeholder-commerce.json. The danger
 * it creates is obvious — a real customer seeing made-up prices — so most of
 * these tests are about the conditions under which it must refuse to run.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const ROOT = new URL("../", import.meta.url);

/** Fresh module instance per environment, since ESM caches by specifier. */
let bust = 0;
async function loadCommerce(env) {
  for (const key of [
    "SHOP_PLACEHOLDER_MODE",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "IPAYMU_ENVIRONMENT"
  ]) {
    delete process.env[key];
  }
  Object.assign(process.env, env);
  bust += 1;
  return import(`../netlify/functions/_lib/commerce.mjs?v=${bust}`);
}

// ------------------------------------------------------------- gating ------

test("placeholder mode is off unless explicitly switched on", async () => {
  const { isPlaceholderMode } = await loadCommerce({});
  assert.equal(isPlaceholderMode(), false, "a bare deploy must not invent prices");
});

test("placeholder mode is off when the flag is anything but true", async () => {
  for (const value of ["false", "0", "no", "", "yes-please"]) {
    const { isPlaceholderMode } = await loadCommerce({ SHOP_PLACEHOLDER_MODE: value });
    assert.equal(isPlaceholderMode(), false, `flag "${value}" must not enable it`);
  }
});

test("placeholder mode switches on with the explicit flag", async () => {
  const { isPlaceholderMode } = await loadCommerce({ SHOP_PLACEHOLDER_MODE: "true" });
  assert.equal(isPlaceholderMode(), true);
});

test("real data always wins: Supabase configured disables placeholder mode", async () => {
  const { isPlaceholderMode } = await loadCommerce({
    SHOP_PLACEHOLDER_MODE: "true",
    SUPABASE_URL: "https://real.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "real-key"
  });
  assert.equal(
    isPlaceholderMode(),
    false,
    "placeholder prices must never shadow a live catalogue"
  );
});

test("placeholder mode refuses to run beside live payments", async () => {
  const { isPlaceholderMode } = await loadCommerce({
    SHOP_PLACEHOLDER_MODE: "true",
    IPAYMU_ENVIRONMENT: "production"
  });
  assert.equal(
    isPlaceholderMode(),
    false,
    "invented prices must never coexist with a production payment gateway"
  );
});

// --------------------------------------------------------------- data ------

test("placeholder state has the same shape as the database state", async () => {
  const { fetchCommerce } = await loadCommerce({ SHOP_PLACEHOLDER_MODE: "true" });
  const state = await fetchCommerce(["ST-01", "ST-05", "NOPE-99"]);

  const live = state.get("ST-01");
  assert.deepEqual(
    Object.keys(live).sort(),
    ["active", "available_quantity", "in_stock", "price_idr", "purchasable", "sku", "updated_at"],
    "callers must not be able to tell the two sources apart"
  );
  assert.ok(live.price_idr > 0);
  assert.equal(live.in_stock, true);

  const soldOut = state.get("ST-05");
  assert.equal(soldOut.available_quantity, 0);
  assert.equal(soldOut.in_stock, false, "the preview must exercise the sold-out state");

  assert.equal(state.get("NOPE-99"), undefined, "unknown SKUs stay unknown");
});

test("placeholder state is empty when the mode is off", async () => {
  const { fetchCommerce } = await loadCommerce({});
  const state = await fetchCommerce(["ST-01"]);
  assert.equal(state.size, 0, "nothing is priced without a source");
});

test("the placeholder file covers every SKU in the catalogue", async () => {
  const products = JSON.parse(
    await readFile(new URL("content/retail-products.json", ROOT), "utf8")
  ).products;
  const placeholder = JSON.parse(
    await readFile(new URL("content/placeholder-commerce.json", ROOT), "utf8")
  ).products;

  for (const product of products) {
    assert.ok(placeholder[product.sku], `${product.sku} has no placeholder row`);
  }
});

test("the placeholder catalogue exercises every availability state", async () => {
  const { fetchCommerce } = await loadCommerce({ SHOP_PLACEHOLDER_MODE: "true" });
  const products = JSON.parse(
    await readFile(new URL("content/retail-products.json", ROOT), "utf8")
  ).products;

  const state = await fetchCommerce(products.map((p) => p.sku));
  const rows = [...state.values()];

  assert.ok(rows.some((r) => r.purchasable && r.available_quantity > 3), "an in-stock piece");
  assert.ok(rows.some((r) => r.purchasable && r.available_quantity > 0 && r.available_quantity <= 3), "a low-stock piece");
  assert.ok(rows.some((r) => r.purchasable && r.available_quantity === 0), "a sold-out piece");
  assert.ok(rows.some((r) => !r.purchasable), "a not-for-sale piece");
});

// ---------------------------------------------------- shop composition -----

const SHOP_SOURCE = await readFile(new URL("assets/marvell-shop.js", ROOT), "utf8");

function loadShopInDom(catalog) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body><main class="shop-main"></main></body></html>`, {
    url: "https://marvellflorist.com/shop",
    runScripts: "outside-only"
  });
  const { window } = dom;
  window.localStorage.setItem("marvell-bag-v1", "[]");
  window.fetch = async () => ({ ok: true, status: 200, json: async () => catalog });
  window.eval(SHOP_SOURCE);
  return { window, dom };
}

/** jsdom values carry that realm's prototypes; normalise before comparing. */
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function fakeProduct(sku, collectionId) {
  return {
    sku, slug: sku.toLowerCase(), name: sku, collection_id: collectionId,
    images: [], listed: true, purchasable: true, in_stock: true,
    available_quantity: 5, price_idr: 100000, availability: "in_stock"
  };
}

test("the shop lists active collections only", async () => {
  const active = fakeProduct("ST-01", "active-col");
  const upcoming = fakeProduct("CH-01", "upcoming-col");
  const archived = fakeProduct("AR-01", "archived-col");

  const catalog = {
    ok: true, commerce_available: true, placeholder: false, payments: { enabled: false },
    products: [active, upcoming, archived],
    collections: [
      { id: "active-col", slug: "a", title: "A", status: "active", product_ids: ["ST-01"], products: [active], palette: [] },
      { id: "upcoming-col", slug: "u", title: "U", status: "upcoming", product_ids: ["CH-01"], products: [upcoming], palette: [] },
      { id: "archived-col", slug: "r", title: "R", status: "archived", product_ids: ["AR-01"], products: [archived], palette: [] }
    ]
  };

  const { window } = loadShopInDom(catalog);
  const shown = await window.MarvellShop.getShopProducts();
  const skus = shown.map((p) => p.sku);

  assert.deepEqual(plain(skus), ["ST-01"], "an unopened or closed collection is not merchandise");
  window.close();
});

test("a SKU belonging to no collection is still reachable in the shop", async () => {
  const orphan = fakeProduct("OR-01", "");
  const catalog = {
    ok: true, commerce_available: true, placeholder: false, payments: { enabled: false },
    products: [orphan],
    collections: []
  };

  const { window } = loadShopInDom(catalog);
  const shown = await window.MarvellShop.getShopProducts();
  assert.deepEqual(plain(shown.map((p) => p.sku)), ["OR-01"]);
  window.close();
});

// ---------------------------------------------------------- the notice -----

test("placeholder pricing always comes with a visible preview notice", async () => {
  const catalog = {
    ok: true, commerce_available: true, placeholder: true, payments: { enabled: false },
    products: [], collections: []
  };
  const { window } = loadShopInDom(catalog);
  await window.MarvellShop.getCatalog();

  const notice = window.document.getElementById("marvell-preview-notice");
  assert.ok(notice, "a placeholder shop must say so");
  assert.match(notice.textContent, /placeholder prices and stock/i);
  assert.match(notice.textContent, /can be purchased yet/i);
  window.close();
});

test("no notice appears when the catalogue is real", async () => {
  const catalog = {
    ok: true, commerce_available: true, placeholder: false, payments: { enabled: false },
    products: [], collections: []
  };
  const { window } = loadShopInDom(catalog);
  await window.MarvellShop.getCatalog();

  assert.equal(window.document.getElementById("marvell-preview-notice"), null);
  window.close();
});

// ------------------------------------------- the admin's own stock rows ----

/**
 * content/retail-commerce.json is the one commerce source the admin can edit
 * without a database. These tests are about the limit on it: it may answer
 * for a SKU nothing else knows, and it may take any piece off sale, and it
 * may never do the third thing — put stock back on top of a source that
 * holds it transactionally.
 */

test("the admin's file answers for a SKU no other source knows", async () => {
  const { fetchCommerce } = await loadCommerce({});
  const rows = JSON.parse(
    await readFile(new URL("content/retail-commerce.json", ROOT), "utf8")
  ).products;
  const onSale = rows.find((row) => row.available && row.stock_quantity > 0);
  assert.ok(onSale, "at least one piece is on sale");

  // No Supabase, no placeholder mode: without the admin's file this would be
  // an empty map, and the piece would render as unavailable.
  const state = await fetchCommerce([onSale.sku]);
  const row = state.get(onSale.sku);
  assert.ok(row, `${onSale.sku} resolves`);
  assert.equal(row.price_idr, onSale.price_idr);
  assert.equal(row.available_quantity, onSale.stock_quantity);
  assert.equal(row.in_stock, true);
  assert.equal(row.purchasable, true);
});

test("turning the switch off sells nothing, whatever the stock figure says", async () => {
  const { fetchCommerce } = await loadCommerce({});
  const rows = JSON.parse(
    await readFile(new URL("content/retail-commerce.json", ROOT), "utf8")
  ).products;
  for (const row of rows.filter((entry) => entry.available === false)) {
    const state = await fetchCommerce([row.sku]);
    const resolved = state.get(row.sku);
    assert.equal(resolved.purchasable, false, `${row.sku} is off sale`);
    assert.equal(resolved.in_stock, false);
  }
});

test("every Mother's Day piece has a price to show", async () => {
  // The collection is sold now. A SKU in the catalogue with no commerce row
  // renders as editorial content with no price and no Add to Bag, which for
  // a collection that is on sale is a broken page rather than a safe one.
  const { fetchCommerce } = await loadCommerce({});
  const products = JSON.parse(
    await readFile(new URL("content/retail-products.json", ROOT), "utf8")
  ).products.filter((product) => product.sku.startsWith("MD-"));
  assert.ok(products.length > 0);

  const state = await fetchCommerce(products.map((product) => product.sku));
  for (const product of products) {
    const row = state.get(product.sku);
    assert.ok(row, `${product.sku} resolves`);
    assert.ok(row.price_idr > 0, `${product.sku} has a price`);
  }
});
