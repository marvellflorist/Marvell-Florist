/**
 * End-to-end rendering of the commerce pages.
 *
 * Each page is loaded into a real DOM with /api/catalog stubbed, then its own
 * inline script is run, and the resulting markup is asserted. This is the
 * closest thing the project has to opening the page in a browser.
 *
 * The other site scripts (header, menu, language) are deliberately not loaded:
 * these tests are about the commerce code, and those modules are unchanged
 * except for their navigation labels.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const ROOT = new URL("../", import.meta.url);

/**
 * Pages leave timers behind (the order page polls while payment clears), so
 * every window is closed once the suite finishes or the runner will not exit.
 */
const openWindows = [];
process.on("beforeExit", () => {
  while (openWindows.length) {
    try { openWindows.pop().window.close(); } catch { /* already gone */ }
  }
});

const SHOP_CORE = await readFile(new URL("assets/marvell-shop.js", ROOT), "utf8");
const CART_UI = await readFile(new URL("assets/bag.js", ROOT), "utf8");

/** A catalogue shaped exactly like /api/catalog returns. */
const CATALOG = {
  ok: true,
  commerce_available: true,
  payments: { enabled: false, provider: "ipaymu", environment: "sandbox", is_production: false, checkout_mode: "redirect" },
  products: [],
  collections: []
};

function product(overrides = {}) {
  return {
    sku: "ST-01",
    slug: "soft-tones-no-1",
    name: "Soft Tones No. 1",
    collection_id: "soft-tones-2026",
    images: [{ image: "/assets/uploads/a.webp", alt: "Soft Tones No. 1" }],
    description: "A low, wide composition.",
    composition: "Artificial roses.",
    dimensions: "28cm",
    care_notes: "Dust gently.",
    fresh_interpretation_available: true,
    tags: [],
    styling_notes: "",
    price_idr: 850000,
    listed: true,
    purchasable: true,
    in_stock: true,
    available_quantity: 8,
    availability: "in_stock",
    ...overrides
  };
}

function catalogWith(products) {
  const collection = {
    id: "soft-tones-2026",
    slug: "soft-tones",
    title: "Soft Tones",
    status: "active",
    kicker: "COLLECTION 01",
    launch_date: "2026-10-01",
    end_date: "2026-12-15",
    hero_image: "/assets/uploads/hero.webp",
    trailer_url: "",
    description: "A study in restraint.",
    editorial_copy: "Soft Tones began with a question about quiet.",
    palette: [{ name: "Porcelain", hex: "#EFE7DC" }],
    product_ids: products.map((p) => p.sku),
    seo_title: "Soft Tones Collection | Marvell Florist",
    seo_description: "Soft Tones.",
    products,
  };
  return { ...CATALOG, products, collections: [collection] };
}

/**
 * Loads a page, stubs the network, runs marvell-shop.js plus the page's own
 * inline script, and waits for the async render to settle.
 */
async function renderPage(file, {
  url = "https://marvellflorist.com/",
  catalog = catalogWith([product()]),
  cartResponse = null,
  featuredContent = null,
  bag = [],
  orderPlan = null,
  withCartUi = false,
  session = {}
} = {}) {
  const html = await readFile(new URL(file, ROOT), "utf8");

  const dom = new JSDOM(html, { url, runScripts: "outside-only" });
  openWindows.push(dom);
  const { window } = dom;
  window.requestAnimationFrame = (callback) => window.setTimeout(callback, 0);

  window.localStorage.setItem("marvell-bag-v1", JSON.stringify(bag));
  if (orderPlan) window.localStorage.setItem("marvell-order-plan-v1", JSON.stringify(orderPlan));
  Object.entries(session).forEach(([key, value]) => window.sessionStorage.setItem(key, value));

  const calls = [];
  window.fetch = async (input, init) => {
    const target = String(input);
    calls.push({ target, body: init?.body ? JSON.parse(init.body) : null });

    if (target.includes("/api/catalog")) {
      return { ok: true, status: 200, json: async () => catalog };
    }
    if (target.includes("/api/cart/validate")) {
      return { ok: true, status: 200, json: async () => cartResponse || { ok: true, lines: [], corrections: [], subtotal_idr: 0, delivery_fee_idr: 0, total_idr: 0 } };
    }
    if (target.includes("/content/featured.json")) {
      return { ok: Boolean(featuredContent), status: featuredContent ? 200 : 404, json: async () => featuredContent };
    }
    if (target.includes("/api/checkout")) {
      // Stops before payment creation; these tests are about browser input.
      return { ok: false, status: 503, json: async () => ({ ok: false, code: "payments_disabled", message: "Payments are not live." }) };
    }
    return { ok: false, status: 404, json: async () => ({ ok: false }) };
  };

  // Strip the page's own <script src> tags; only the inline block is run.
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((block) => block.trim());

  window.eval(SHOP_CORE);
  if (withCartUi) window.eval(CART_UI);
  inline.forEach((block) => window.eval(block));

  // Let the page's async IIFEs resolve.
  for (let i = 0; i < 25; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return { dom, window, document: window.document, calls };
}

// ------------------------------------------------------- retail entry -------

const COMMERCE_PAGES = ["shop-product.html", "bag.html", "checkout.html", "order.html"];

test("the Shop preview page is gone, and its address still lands", async () => {
  // It was a mock: six invented products with hardcoded prices and no
  // catalogue behind it. Featured is the retail entry point now.
  await assert.rejects(readFile(new URL("shop.html", ROOT), "utf8"), /ENOENT/);

  const toml = await readFile(new URL("netlify.toml", ROOT), "utf8");
  assert.match(toml, /from = "\/shop\.html"\s+to = "\/featured"/);
  assert.match(toml, /from = "\/shop"\s+to = "\/featured"/);

  // And nothing still points at it.
  for (const name of COMMERCE_PAGES) {
    const html = await readFile(new URL(name, ROOT), "utf8");
    assert.ok(!/href="\/?shop(\.html)?"/.test(html), `${name} still links to the shop preview`);
  }
});

test("there is no collections page, and both of its addresses still land", async () => {
  // A collection groups the catalogue and orders what is merchandised. It is
  // not a place: retail lives inside Featured, so neither the index nor the
  // per-collection page exists any more.
  await assert.rejects(readFile(new URL("collections.html", ROOT), "utf8"), /ENOENT/);
  await assert.rejects(readFile(new URL("collection.html", ROOT), "utf8"), /ENOENT/);

  // Both URLs were indexed and linked, so both must redirect rather than 404.
  const toml = await readFile(new URL("netlify.toml", ROOT), "utf8");
  assert.match(toml, /from = "\/collections"\s+to = "\/featured"\s+status = 301/);
  assert.match(toml, /from = "\/collections\/\*"\s+to = "\/featured"\s+status = 301/);
  assert.match(toml, /from = "\/collections\.html"\s+to = "\/featured"\s+status = 301/);

  // Nothing routes a shopper at a page that is not there.
  for (const name of [...COMMERCE_PAGES, "index.html"]) {
    const html = await readFile(new URL(name, ROOT), "utf8");
    assert.ok(!/href="[^"]*collections?\.html"/.test(html), `${name} still links to a collections page`);
    assert.ok(!/href="\/collections/.test(html), `${name} still links to /collections`);
  }
  for (const name of ["assets/bag.js", "assets/shared-footer.js"]) {
    const js = await readFile(new URL(name, ROOT), "utf8");
    assert.ok(!/href="[^"]*collections?\.html"/.test(js), `${name} still links to a collections page`);
    assert.ok(!/href="\/collections/.test(js), `${name} still links to /collections`);
  }

  // The sitemap cannot keep submitting URLs that now redirect.
  const sitemap = await readFile(new URL("sitemap.xml", ROOT), "utf8");
  assert.ok(!sitemap.includes("/collections"), "sitemap still submits a collections URL");
});

test("other commerce pages still load their shared core", async () => {
  for (const name of COMMERCE_PAGES) {
    const html = await readFile(new URL(name, ROOT), "utf8");
    assert.ok(html.includes('src="/assets/marvell-shop.js'));
  }
});

// ------------------------------------------------------------- /product -----

test("a product that can be bought here offers Add to Bag, and only that", async () => {
  // Add to Bag and the WhatsApp consultation are two different buttons, and
  // the page draws one of them. It used to draw both for an in-stock piece —
  // asking for a decision it had already made, and offering two ways to buy
  // one thing.
  const { document } = await renderPage("shop-product.html", {
    url: "https://marvellflorist.com/product/soft-tones-no-1"
  });

  assert.equal(document.querySelector("[data-product-name]").textContent, "Soft Tones No. 1");
  assert.equal(document.querySelector("[data-product-price]").textContent, "Rp850.000");

  assert.equal(document.querySelector("[data-product-buy]").hidden, false);
  assert.equal(document.querySelector("[data-product-add]").dataset.bagAdd, "ST-01");

  assert.equal(
    document.querySelector("[data-product-fresh]").hidden,
    true,
    "the consultation is the fallback, not a second checkout beside the first"
  );
});

test("retail product asks every required order question before adding", async () => {
  const { document, window } = await renderPage("shop-product.html", {
    url: "https://marvellflorist.com/product/soft-tones-no-1",
    withCartUi: true
  });
  const clickAdd = () => document.querySelector("[data-product-add]").click();
  const overlay = document.querySelector("[data-product-plan-overlay]");
  const form = document.querySelector("[data-product-plan-form]");
  clickAdd();
  assert.equal(overlay.hidden, false);
  assert.deepEqual([...window.MarvellBag.read()], []);

  document.querySelector("[data-product-plan-close]").click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(overlay.hidden, true);
  assert.equal(window.MarvellBag.count(), 0, "cancelling the questions cannot add the piece");

  clickAdd();
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  assert.equal(window.MarvellBag.count(), 0, "blank answers cannot add the piece");
  document.querySelector("[data-product-plan-date]").value = tomorrow();
  document.querySelector("[data-product-plan-time]").value = "afternoon";
  document.querySelector("[data-product-plan-method]").value = "delivery";
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(overlay.hidden, true);
  assert.equal(window.MarvellBag.count(), 1);
  assert.equal(window.MarvellBag.readOrderPlan().timeWindow, "afternoon");
});

test("a piece that cannot be bought here carries the consultation instead", async () => {
  const soldOut = product({ availability: "sold_out", in_stock: false, purchasable: false, available_quantity: 0 });
  const { document } = await renderPage("shop-product.html", {
    url: "https://marvellflorist.com/product/soft-tones-no-1",
    catalog: catalogWith([soldOut])
  });

  assert.equal(document.querySelector("[data-product-buy]").hidden, true);

  const fresh = document.querySelector("[data-product-fresh]");
  assert.equal(fresh.hidden, false);
  const link = document.querySelector("[data-product-fresh-link]");
  assert.match(link.href, /^https:\/\/wa\.me\/628116667457\?text=/);

  const message = decodeURIComponent(link.href.split("text=")[1]);
  assert.match(message, /Soft Tones No\. 1/, "product name travels with the request");
  assert.match(message, /ST-01/, "SKU travels with the request");

  assert.match(
    document.querySelector("[data-product-fresh-note]").textContent,
    /availability and final price are confirmed/,
    "fresh flowers are never presented as an instant purchase"
  );
});

test("product page never calls an artificial arrangement fake", async () => {
  const { document } = await renderPage("shop-product.html", {
    url: "https://marvellflorist.com/product/soft-tones-no-1"
  });
  assert.doesNotMatch(document.body.textContent.toLowerCase(), /\bfake\b/);
});

test("a sold-out product says so, rather than only going quiet", async () => {
  const soldOut = product({ availability: "sold_out", in_stock: false, purchasable: false, available_quantity: 0 });
  const { document } = await renderPage("shop-product.html", {
    url: "https://marvellflorist.com/product/soft-tones-no-1",
    catalog: catalogWith([soldOut])
  });

  assert.equal(document.querySelector("[data-product-buy]").hidden, true, "no Add to Bag when sold out");
  assert.match(document.querySelector("[data-product-availability]").textContent, /Sold out/);
});

test("a product with fresh interpretation disabled shows only pathway A", async () => {
  const noFresh = product({ fresh_interpretation_available: false });
  const { document } = await renderPage("shop-product.html", {
    url: "https://marvellflorist.com/product/soft-tones-no-1",
    catalog: catalogWith([noFresh])
  });
  assert.equal(document.querySelector("[data-product-fresh]").hidden, true);
});

test("low stock is surfaced, and buying is still one tap", async () => {
  const scarce = product({ available_quantity: 2 });
  const { document } = await renderPage("shop-product.html", {
    url: "https://marvellflorist.com/product/soft-tones-no-1",
    catalog: catalogWith([scarce])
  });

  assert.match(document.querySelector("[data-product-availability]").textContent, /Only 2 available/);

  // There is no quantity beside Add to Bag. How many you want is settled in
  // the bag, against what the server says is actually in stock — a stepper
  // here only invites a number the next screen has to argue with.
  assert.equal(document.querySelector("#product-qty-input"), null);
  assert.equal(document.querySelector("[data-product-add]").dataset.bagQuantityField, undefined);
});

test("an unknown product slug shows a not-found state", async () => {
  const { document } = await renderPage("shop-product.html", {
    url: "https://marvellflorist.com/product/nope"
  });
  assert.match(document.querySelector("[data-product-missing]").textContent, /could not find that piece/);
});

// ---------------------------------------------------------------- /cart -----

test("cart page renders server-priced lines and totals", async () => {
  const { document } = await renderPage("bag.html", {
    url: "https://marvellflorist.com/bag",
    bag: [{ sku: "ST-01", quantity: 2 }],
    cartResponse: {
      ok: true,
      lines: [{
        sku: "ST-01", name: "Soft Tones No. 1", slug: "soft-tones-no-1",
        image: "/assets/uploads/a.webp", quantity: 2,
        unit_price_idr: 850000, line_total_idr: 1700000, available_quantity: 8
      }],
      corrections: [],
      subtotal_idr: 1700000,
      delivery_fee_idr: 0,
      total_idr: 1700000
    }
  });

  const lines = document.querySelectorAll(".cart-line");
  assert.equal(lines.length, 1);
  assert.match(lines[0].textContent, /Soft Tones No\. 1/);
  assert.equal(lines[0].querySelector(".cart-line-name a")?.getAttribute("href"), "/product/soft-tones-no-1");
  assert.equal(document.querySelector(".bag-filled-stage > .bag-filled-title-wrap [data-bag-title]")?.textContent, "SHOPPING BAG");
  assert.equal(document.querySelector(".bag-filled-hero [data-bag-title]"), null, "the title scrolls separately from the sticky image");
  assert.equal(document.querySelector(".bag-filled-content [data-bag-title]"), null, "the scrolling white surface stays solid behind its copy");
  assert.equal(document.querySelector("[data-cart-subtotal]").textContent, "Rp1.700.000");
  assert.equal(document.querySelector("[data-cart-total]").textContent, "Rp1.700.000");
  assert.equal(lines[0].querySelectorAll(".bag-card-price").length, 1, "one product price");
  assert.equal(document.querySelector(".bag-filled-side .bag-info-box [data-cart-checkout]")?.getAttribute("href"), "/checkout.html");
  assert.equal(document.querySelector(".bag-selections [data-cart-checkout]"), null, "checkout does not sit under the products");
  assert.equal(document.querySelector("[data-bag-payment-label]").textContent, "Available payment options");
  assert.deepEqual([...document.querySelectorAll(".bag-payment-options img")].map((img) => img.alt), ["QRIS", "OVO", "BCA", "GoPay"]);
  assert.equal(document.querySelector(".bag-help").open, false, "help starts as a compact accordion");
  assert.match(document.querySelector("[data-bag-help-copy]").textContent, /Monday to Saturday in Batam/);
});

test("each cart product shows the saved plan as quiet text with an edit link", async () => {
  const plan = { date: "2030-09-24", timeWindow: "afternoon", fulfilment: "delivery" };
  const { document } = await renderPage("bag.html", {
    url: "https://marvellflorist.com/bag?lang=en",
    bag: [{ sku: "ST-01", quantity: 1 }, { sku: "ST-02", quantity: 1 }],
    orderPlan: plan,
    cartResponse: {
      ok: true,
      lines: [
        { sku: "ST-01", name: "First", quantity: 1, line_total_idr: 850000, available_quantity: 8 },
        { sku: "ST-02", name: "Second", quantity: 1, line_total_idr: 850000, available_quantity: 8 }
      ],
      corrections: [], subtotal_idr: 1700000, delivery_fee_idr: 0, total_idr: 1700000
    }
  });
  const lines = document.querySelectorAll(".cart-line");
  assert.equal(lines.length, 2);
  for (const line of lines) {
    const details = line.querySelector(".bag-card-plan");
    assert.ok(details, "the plan belongs below this product");
    assert.match(details.textContent, /2030-09-24 · Afternoon, 13:00-18:00/);
    assert.match(details.textContent, /Delivered in Batam/);
  }
  assert.equal(document.querySelector(".bag-selections > [data-bag-plan]"), null);
  const edit = document.querySelector("[data-bag-plan-edit]");
  assert.ok(edit);
  assert.equal(edit.getAttribute("href"), "/checkout.html?edit=delivery");
  const html = await readFile(new URL("bag.html", ROOT), "utf8");
  assert.match(html, /\.bag-card-plan-text\s*\{[^}]*color:/);
  assert.doesNotMatch(html, /\.bag-card-plan\s*\{[^}]*background:\s*#f7f7f7/);
});

test("a Featured piece in the bag opens the same product view as Featured", async () => {
  const featuredContent = { events: [{ title: "Mother's Day Collection", products: [{
    sku: "MD-01", name: "Sovereign", src: "/assets/uploads/img_4691.webp", price: 850000
  }] }] };
  const { document } = await renderPage("bag.html", {
    url: "https://marvellflorist.com/bag?lang=en",
    bag: [{ sku: "MD-01", quantity: 1 }],
    featuredContent,
    cartResponse: {
      ok: true,
      lines: [{ sku: "MD-01", name: "Sovereign", slug: "sovereign", image: "/assets/uploads/img_4691.webp",
        quantity: 1, unit_price_idr: 850000, line_total_idr: 850000, available_quantity: 8 }],
      corrections: [], subtotal_idr: 850000, delivery_fee_idr: 0, total_idr: 850000
    }
  });
  const line = document.querySelector(".cart-line");
  const href = new URL(line.querySelector(".cart-line-name a").href);
  assert.equal(href.pathname, "/product");
  assert.equal(href.searchParams.get("category"), "Mother's Day Collection");
  assert.equal(href.searchParams.get("title"), "Sovereign");
  assert.equal(href.searchParams.get("image"), "/assets/uploads/img_4691.webp");
  assert.equal(href.searchParams.get("lang"), "en");
  assert.equal(line.querySelector(".cart-line-media img")?.getAttribute("src"), "/assets/uploads/img_4691.webp");
  assert.equal(line.querySelector(".cart-line-name")?.textContent, "Sovereign");
});

test("a cart card message carries into checkout", async () => {
  const pricedCart = {
    ok: true,
    lines: [{ sku: "ST-01", name: "Soft Tones No. 1", slug: "soft-tones-no-1", image: "", quantity: 1,
      unit_price_idr: 850000, line_total_idr: 850000, available_quantity: 8 }],
    corrections: [], subtotal_idr: 850000, delivery_fee_idr: 0, total_idr: 850000
  };
  const bag = [{ sku: "ST-01", quantity: 1 }];
  const cart = await renderPage("bag.html", { url: "https://marvellflorist.com/bag", bag, cartResponse: pricedCart });
  const message = cart.document.querySelector("[data-cart-gift-message]");
  message.value = "With love, from Batam.";
  message.dispatchEvent(new cart.window.Event("input", { bubbles: true }));
  assert.equal(cart.window.sessionStorage.getItem("marvell-cart-gift-message"), message.value);

  const checkout = await renderPage("checkout.html", {
    url: "https://marvellflorist.com/checkout",
    bag,
    cartResponse: pricedCart,
    session: { "marvell-cart-gift-message": message.value },
    catalog: { ...catalogWith([product()]), payments: { ...CATALOG.payments, enabled: true } }
  });
  assert.equal(checkout.document.querySelector('[name="card_message"]').value, message.value);
});

test("cart page shows the empty state when the bag is empty", async () => {
  const { document } = await renderPage("bag.html", { url: "https://marvellflorist.com/bag", bag: [] });
  assert.match(document.querySelector("[data-cart-empty]").textContent, /Your shopping bag is empty/);
});

test("the shopping bag controls stay neutral around the hero and payment marks", async () => {
  // The hero photograph and payment PNGs carry colour. The surrounding
  // controls remain neutral.
  const html = await readFile(new URL("bag.html", ROOT), "utf8");
  const style = html.slice(html.indexOf("<style>"), html.indexOf("</style>"))
    .replace(/\.bag-payment-logo--[^{}]+\{[^}]*\}/g, "")
    .replace(/\.bag-filled-hero\s*\{[^}]*\}/g, "")
    .replace(/\.bag-filled-title\s*\{[^}]*\}/g, "");
  for (const method of ["QRIS", "OVO", "BCA", "GoPay"]) {
    assert.match(html, new RegExp(`alt="${method}"`));
  }

  const hexes = style.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  for (const hex of hexes) {
    const full = hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex.slice(0, 7);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16));
    assert.ok(r === g && g === b, `${hex} is not greyscale`);
  }

  const rgbas = style.match(/rgba?\(([^)]*)\)/g) || [];
  for (const rgba of rgbas) {
    const [r, g, b] = rgba.replace(/rgba?\(|\)/g, "").split(",").map((n) => Number(n.trim()));
    assert.ok(r === g && g === b, `${rgba} is not greyscale`);
  }

  // And the page is not called by the bare word any more.
  assert.match(html, /<title>Shopping Bag \| Marvell Florist<\/title>/);
  assert.ok(!/>Bag</.test(html), "no element renders the bare word");
});

test("cart page surfaces server corrections", async () => {
  const { document, window } = await renderPage("bag.html", {
    url: "https://marvellflorist.com/bag",
    bag: [{ sku: "ST-01", quantity: 5 }],
    cartResponse: {
      ok: true,
      lines: [{
        sku: "ST-01", name: "Soft Tones No. 1", slug: "soft-tones-no-1",
        image: "", quantity: 2, unit_price_idr: 850000, line_total_idr: 1700000, available_quantity: 2
      }],
      corrections: [{
        sku: "ST-01", name: "Soft Tones No. 1", type: "quantity_reduced",
        quantity: 2, message: "Only 2 of Soft Tones No. 1 are still available, so your bag has been updated."
      }],
      subtotal_idr: 1700000, delivery_fee_idr: 0, total_idr: 1700000
    }
  });

  assert.match(document.querySelector("[data-cart-notice]").textContent, /Only 2 of Soft Tones No\. 1/);

  // The correction is written back to storage, so the bag matches the server.
  const stored = JSON.parse(window.localStorage.getItem("marvell-bag-v1"));
  assert.deepEqual(stored, [{ sku: "ST-01", quantity: 2 }]);
});

// ------------------------------------------------------------ /checkout -----

test("checkout shows the payments-disabled state instead of a dead button", async () => {
  const { document } = await renderPage("checkout.html", {
    url: "https://marvellflorist.com/checkout",
    bag: [{ sku: "ST-01", quantity: 1 }],
    cartResponse: {
      ok: true,
      lines: [{
        sku: "ST-01", name: "Soft Tones No. 1", slug: "soft-tones-no-1",
        image: "", quantity: 1, unit_price_idr: 850000, line_total_idr: 850000, available_quantity: 8
      }],
      corrections: [], subtotal_idr: 850000, delivery_fee_idr: 0, total_idr: 850000
    }
  });

  const blocked = document.querySelector("[data-checkout-blocked]");
  assert.equal(blocked.hidden, false);
  assert.match(blocked.textContent, /Online payment is not live yet/);
  assert.match(blocked.querySelector("a").href, /wa\.me/);
  assert.equal(document.querySelector("[data-checkout-form]").hidden, true);
});

test("checkout form appears once payments are enabled", async () => {
  const catalog = {
    ...catalogWith([product()]),
    payments: { enabled: true, provider: "ipaymu", environment: "sandbox", is_production: false, checkout_mode: "redirect" }
  };

  const { document } = await renderPage("checkout.html", {
    url: "https://marvellflorist.com/checkout",
    catalog,
    bag: [{ sku: "ST-01", quantity: 1 }],
    cartResponse: {
      ok: true,
      lines: [{
        sku: "ST-01", name: "Soft Tones No. 1", slug: "soft-tones-no-1",
        image: "", quantity: 1, unit_price_idr: 850000, line_total_idr: 850000, available_quantity: 8
      }],
      corrections: [], subtotal_idr: 850000, delivery_fee_idr: 0, total_idr: 850000
    }
  });

  assert.equal(document.querySelector("[data-checkout-form]").hidden, false);
  assert.equal(document.querySelector("[data-summary-total]").textContent, "Rp850.000");

  // Marketing consent must be opt-in and separate for each channel.
  const email = document.querySelector('[name="email_opt_in"]');
  const whatsapp = document.querySelector('[name="whatsapp_opt_in"]');
  assert.equal(email.checked, false, "email marketing is never pre-ticked at checkout");
  assert.equal(whatsapp.checked, false, "WhatsApp marketing is never pre-ticked");
  assert.notEqual(email, whatsapp, "the two consents are separate controls");
});

/** A date the server will accept: inside the next year, not in the past. */
function tomorrow() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

test("an order cannot be placed without saying when it is wanted", async () => {
  // A florist makes an arrangement for a day. These used to be labelled
  // "(optional)" and accepted empty on both sides, which meant an order could
  // reach the workroom with nothing to schedule it against.
  const catalog = {
    ...catalogWith([product()]),
    payments: { enabled: true, provider: "ipaymu", environment: "sandbox", is_production: false, checkout_mode: "redirect" }
  };
  const cartResponse = {
    ok: true,
    lines: [{
      sku: "ST-01", name: "Soft Tones No. 1", slug: "soft-tones-no-1",
      image: "", quantity: 1, unit_price_idr: 850000, line_total_idr: 850000, available_quantity: 8
    }],
    corrections: [], subtotal_idr: 850000, delivery_fee_idr: 0, total_idr: 850000
  };

  const { document, window, calls } = await renderPage("checkout.html", {
    url: "https://marvellflorist.com/checkout",
    catalog, cartResponse,
    bag: [{ sku: "ST-01", quantity: 1 }]
  });

  const submit = async () => {
    document.querySelector("[data-checkout-form]").dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true })
    );
    for (let i = 0; i < 15; i += 1) await new Promise((r) => setTimeout(r, 0));
  };

  document.querySelector('[name="customer_name"]').value = "Jane Doe";
  document.querySelector('[name="phone"]').value = "081275017456";
  document.querySelector('[name="email"]').value = "jane@example.com";

  await submit();
  assert.equal(calls.find((call) => call.target.includes("/api/checkout")), undefined,
    "nothing is posted without a date");
  assert.match(document.querySelector("[data-checkout-notice]").textContent, /date/i);

  document.querySelector('[name="delivery_date"]').value = tomorrow();
  await submit();
  assert.equal(calls.find((call) => call.target.includes("/api/checkout")), undefined,
    "nor without a time");
  assert.match(document.querySelector("[data-checkout-notice]").textContent, /time/i);

  // And neither is presented as optional any more.
  assert.equal(document.querySelector("[data-optional-1]"), null);
  assert.equal(document.querySelector("[data-optional-2]"), null);
  assert.ok(document.querySelector('[name="delivery_date"]').required);
  assert.ok(document.querySelector('[name="delivery_time_window"]').required);
});

test("checkout never posts a price to the server", async () => {
  const catalog = {
    ...catalogWith([product()]),
    payments: { enabled: true, provider: "ipaymu", environment: "sandbox", is_production: false, checkout_mode: "redirect" }
  };
  const cartResponse = {
    ok: true,
    lines: [{
      sku: "ST-01", name: "Soft Tones No. 1", slug: "soft-tones-no-1",
      image: "", quantity: 1, unit_price_idr: 850000, line_total_idr: 850000, available_quantity: 8
    }],
    corrections: [], subtotal_idr: 850000, delivery_fee_idr: 0, total_idr: 850000
  };

  const { document, window, calls } = await renderPage("checkout.html", {
    url: "https://marvellflorist.com/checkout",
    catalog, cartResponse,
    bag: [{ sku: "ST-01", quantity: 1 }]
  });

  document.querySelector('[name="customer_name"]').value = "Jane Doe";
  document.querySelector('[name="phone"]').value = "081275017456";
  document.querySelector('[name="email"]').value = "jane@example.com";
  // The order's own details are required now, so an order cannot be placed
  // without them — which is what the next test is about.
  document.querySelector('[name="delivery_date"]').value = tomorrow();
  document.querySelector('[name="delivery_time_window"]').value = "morning";

  document.querySelector("[data-checkout-form]").dispatchEvent(
    new window.Event("submit", { bubbles: true, cancelable: true })
  );
  for (let i = 0; i < 15; i += 1) await new Promise((r) => setTimeout(r, 0));

  const checkoutCall = calls.find((call) => call.target.includes("/api/checkout"));
  assert.ok(checkoutCall, "checkout was posted");

  for (const item of checkoutCall.body.items) {
    assert.deepEqual(Object.keys(item).sort(), ["quantity", "sku"], "only sku and quantity are sent");
  }
  const serialised = JSON.stringify(checkoutCall.body);
  assert.ok(!/price/i.test(serialised), "no price field is sent from the browser");
  assert.ok(!/total/i.test(serialised), "no total is sent from the browser");
});

// --------------------------------------------------------------- /order -----

test("order page renders a paid confirmation and clears the bag", async () => {
  const order = {
    order_number: "MF-260919-K4T2M",
    status: "paid",
    payment_status: "settlement",
    customer_first_name: "Jane",
    delivery_method: "pickup",
    delivery_date: null,
    delivery_time_window: null,
    recipient_name: null,
    subtotal_idr: 850000,
    delivery_fee_idr: 0,
    total_idr: 850000,
    created_at: "2026-09-19T10:00:00Z",
    paid_at: "2026-09-19T10:02:00Z",
    items: [{ sku: "ST-01", name: "Soft Tones No. 1", quantity: 1, unit_price_idr: 850000, line_total_idr: 850000 }]
  };

  const html = await readFile(new URL("order.html", ROOT), "utf8");
  const dom = new JSDOM(html, { url: "https://marvellflorist.com/order/MF-260919-K4T2M", runScripts: "outside-only" });
  openWindows.push(dom);
  const { window } = dom;

  window.localStorage.setItem("marvell-bag-v1", JSON.stringify([{ sku: "ST-01", quantity: 1 }]));
  const receiptToken = "a".repeat(43);
  window.sessionStorage.setItem("marvell-receipt:MF-260919-K4T2M", receiptToken);

  const sent = [];
  window.fetch = async (input, init) => {
    sent.push({ target: String(input), body: init?.body ? JSON.parse(init.body) : null, method: init?.method });
    return { ok: true, status: 200, json: async () => ({ ok: true, order }) };
  };

  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]).filter((b) => b.trim());

  window.eval(SHOP_CORE);
  inline.forEach((block) => window.eval(block));
  for (let i = 0; i < 20; i += 1) await new Promise((r) => setTimeout(r, 0));

  const document = window.document;
  assert.equal(document.querySelector("[data-order-title]").textContent, "MF-260919-K4T2M");
  assert.match(document.querySelector("[data-order-status]").textContent, /Paid/);
  assert.equal(document.querySelector("[data-order-total]").textContent, "Rp850.000");
  assert.match(document.querySelector("[data-order-items]").textContent, /Soft Tones No\. 1/);

  // A completed order must not leave a bag behind to be bought twice.
  assert.deepEqual(JSON.parse(window.localStorage.getItem("marvell-bag-v1")), []);

  // A random receipt token accompanies the reference in the POST body.
  const lookup = sent.find((call) => call.target.includes("/api/order/"));
  assert.equal(lookup.method, "POST");
  assert.equal(lookup.body.receipt_token, receiptToken);
  assert.ok(!lookup.target.includes(receiptToken), "the token stays out of the URL");
});

test("order page refuses a malformed order number without calling the API", async () => {
  const html = await readFile(new URL("order.html", ROOT), "utf8");
  const dom = new JSDOM(html, { url: "https://marvellflorist.com/order/NOT-AN-ORDER", runScripts: "outside-only" });
  openWindows.push(dom);
  const { window } = dom;

  let called = false;
  window.fetch = async () => { called = true; return { ok: false, status: 404, json: async () => ({}) }; };

  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]).filter((b) => b.trim());
  window.eval(SHOP_CORE);
  inline.forEach((block) => window.eval(block));
  for (let i = 0; i < 10; i += 1) await new Promise((r) => setTimeout(r, 0));

  assert.equal(called, false, "a malformed order number never reaches the server");
  assert.match(window.document.querySelector("[data-order-missing]").textContent, /could not find that order/);
});

// ------------------------------------------------------------ XSS guard -----

test("hostile CMS content is escaped, not executed", async () => {
  const hostile = product({
    name: '<img src=x onerror="window.__pwned=true">',
    description: '<script>window.__pwned=true</script>',
    images: [{ image: "javascript:alert(1)", alt: '"><svg onload=alert(1)>' }]
  });

  const { document, window } = await renderPage("shop-product.html", {
    url: "https://marvellflorist.com/product/soft-tones-no-1",
    catalog: catalogWith([hostile])
  });

  assert.equal(window.__pwned, undefined, "no injected script ran");
  assert.equal(document.querySelectorAll("img[onerror]").length, 0);
  assert.equal(document.querySelectorAll("svg[onload]").length, 0);
  // The name still displays, as text.
  assert.match(document.querySelector("[data-product-name]").textContent, /onerror/);
  // The javascript: image path was dropped entirely.
  assert.equal(document.querySelectorAll('.product-gallery-item img').length, 0);
});

test("an order number alone will not open an order", async () => {
  // The number is a short string that travels: a browser history, a forwarded
  // confirmation, a screenshot. On its own it must not render an order.
  const html = await readFile(new URL("order.html", ROOT), "utf8");
  const dom = new JSDOM(html, { url: "https://marvellflorist.com/order/MF-260919-K4T2M", runScripts: "outside-only" });
  openWindows.push(dom);
  const { window } = dom;

  const calls = [];
  window.fetch = async (target, init) => {
    calls.push({ target, body: JSON.parse(init.body) });
    return { ok: false, status: 404, json: async () => ({ ok: false }) };
  };

  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]).filter((b) => b.trim());

  window.eval(SHOP_CORE);
  inline.forEach((block) => window.eval(block));
  for (let i = 0; i < 20; i += 1) await new Promise((r) => setTimeout(r, 0));

  const document = window.document;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.receipt_token, "", "no token is invented from the reference");
  assert.ok(document.querySelector("[data-order-email-form]"), "the page asks for the email");
  assert.ok(document.querySelector("[data-order-article]").hidden, "no order is shown");
});
