/**
 * The wishlist has two homes: this browser, for a visitor who has not signed
 * in, and the account, for one who has. These tests hold the line between
 * them — that the heart is never harder than one tap, that signing in folds
 * the device list into the account without asking, and that signing out
 * leaves nothing of the account behind in a shared browser.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const ROOT = new URL("../", import.meta.url);
const SHOP = await readFile(new URL("assets/marvell-shop.js", ROOT), "utf8");
const ICONS = await readFile(new URL("assets/marvell-icons.js", ROOT), "utf8");
const FAVORITES = await readFile(new URL("assets/favorites.js", ROOT), "utf8");
const ACCOUNT = await readFile(new URL("assets/account.js", ROOT), "utf8");
const WISHLIST_FN = await readFile(new URL("netlify/functions/account-wishlist.mjs", ROOT), "utf8");
const MIGRATION = await readFile(new URL("supabase/migrations/0008_wishlists_and_preferences.sql", ROOT), "utf8");

const GUEST_KEY = "marvell-favorites-v1";
const ACCOUNT_KEY = "marvell-account-favorites-v1";
const windows = [];
test.after(() => windows.forEach((dom) => dom.window.close()));

/** A wishlist endpoint that remembers, so a merge can be observed. */
function fakeServer(seed = []) {
  const state = {
    items: new Map(seed.map((item) => [item.id, item])),
    lists: [{ id: "list-1", name: "Saved", is_default: true, shared_with_marvell: false }],
    calls: []
  };
  const snapshot = () => ({
    ok: true,
    default_list_id: "list-1",
    lists: state.lists.map((list) => ({ ...list })),
    items: [...state.items.values()].map((item) => ({
      list_id: "list-1", item_key: item.id, item_data: item, created_at: "2026-09-21T00:00:00Z"
    }))
  });
  return {
    state,
    async fetch(url, options = {}) {
      const body = options.body ? JSON.parse(options.body) : null;
      state.calls.push({ url: String(url), body });
      if (body?.operation === "merge") {
        // A union: what the account already held is never dropped.
        for (const item of body.items) if (!state.items.has(item.id)) state.items.set(item.id, item);
      } else if (body?.operation === "add_item") {
        state.items.set(body.item.id, body.item);
      } else if (body?.operation === "remove_item") {
        state.items.delete(body.item_key);
      } else if (body?.operation === "clear_list") {
        state.items.clear();
      } else if (body?.operation === "create_list") {
        state.lists.push({
          id: `list-${state.lists.length + 1}`,
          name: body.name,
          is_default: false,
          shared_with_marvell: false
        });
      }
      return { ok: true, status: 200, json: async () => snapshot() };
    }
  };
}

function makePage({ fetch } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><header><div class="header-bar"></div></header><main></main></body></html>', {
    url: "https://marvellflorist.com/shop", runScripts: "outside-only"
  });
  windows.push(dom);
  const { window } = dom;
  window.fetch = fetch || (async () => { throw Error("offline"); });
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = (fn) => window.setTimeout(fn, 0);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  window.scrollTo = () => {};
  window.eval(ICONS); window.eval(SHOP); window.eval(FAVORITES);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  return window;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 30));
const read = (window, key) => JSON.parse(window.localStorage.getItem(key) || "[]");
const piece = (title, href) => ({ title, href, image: "", price: "", category: "Bouquets", source: "", quantity: 1 });

test("a signed-out visitor gets one list, saved on this device, with no account asked for", async () => {
  const server = fakeServer();
  const window = makePage({ fetch: server.fetch });
  await settle();

  // One tap saves. Nothing is created first and nothing is named.
  assert.equal(window.MarvellFavorites.toggleFavorite(piece("Camellia", "/product?id=a")), true);
  assert.equal(read(window, GUEST_KEY).length, 1);
  assert.equal(read(window, ACCOUNT_KEY).length, 0, "and nothing is written to the account mirror");

  // The same tap again removes it, immediately.
  const saved = window.MarvellFavorites.getFavorites()[0];
  assert.equal(window.MarvellFavorites.toggleFavorite(saved), false);
  assert.equal(read(window, GUEST_KEY).length, 0);

  await settle();
  assert.deepEqual(server.state.calls, [], "a guest wishlist never reaches the network");
});

test("signing in folds the device list into the account, without asking", async () => {
  // The account already holds a piece; the device holds two, one of them the
  // same. The result is the union, once each.
  const server = fakeServer([piece("Camellia", "/product?id=a"), piece("Peony", "/product?id=b")]
    .map((item) => ({ ...item, id: `href:${item.href}` })));
  const window = makePage({ fetch: server.fetch });
  await settle();

  window.MarvellFavorites.toggleFavorite(piece("Peony", "/product?id=b"));
  window.MarvellFavorites.toggleFavorite(piece("Ranunculus", "/product?id=c"));
  assert.equal(read(window, GUEST_KEY).length, 2);

  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();

  const merge = server.state.calls.find((call) => call.body?.operation === "merge");
  assert.ok(merge, "the merge happens on its own: nobody is asked to import anything");
  assert.equal(merge.url, "/api/account/wishlist");

  const account = read(window, ACCOUNT_KEY);
  assert.deepEqual(account.map((item) => item.title).sort(), ["Camellia", "Peony", "Ranunculus"],
    "existing account items are kept and the duplicate stays one item");
  assert.equal(read(window, GUEST_KEY).length, 0, "the device copy is cleared once the account holds them");
  assert.equal(window.MarvellFavorites.getFavorites().length, 3, "and the panel now reads the account list");
});

test("the heart still saves in one tap once signed in, straight to the default list", async () => {
  const server = fakeServer();
  const window = makePage({ fetch: server.fetch });
  await settle();
  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();

  window.MarvellFavorites.toggleFavorite(piece("Camellia", "/product?id=a"));
  // On screen before the network answers.
  assert.equal(window.MarvellFavorites.getFavorites().length, 1);
  await settle();

  const add = server.state.calls.find((call) => call.body?.operation === "add_item");
  assert.ok(add, "and it reaches the account");
  assert.ok(!add.body.list_id, "with no list chosen: the default list is the server's to know");
  assert.equal(read(window, ACCOUNT_KEY).length, 1);

  window.MarvellFavorites.removeFavorite("href:/product?id=a");
  await settle();
  assert.ok(server.state.calls.some((call) => call.body?.operation === "remove_item"));
  assert.equal(read(window, ACCOUNT_KEY).length, 0);
});

test("a customer with several wishlists chooses the destination before anything is saved", async () => {
  const calls = [];
  const lists = [
    { id: "list-1", name: "Saved", is_default: true, shared_with_marvell: false },
    { id: "list-2", name: "Anniversary", is_default: false, shared_with_marvell: false }
  ];
  const rows = [];
  const fetch = async (_url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push(body);
    if (body?.operation === "add_item") {
      rows.push({ list_id: body.list_id, item_key: body.item.id, item_data: body.item,
        created_at: "2026-09-23T00:00:00Z" });
    }
    return { ok: true, status: 200, json: async () => ({ ok: true,
      default_list_id: "list-1", lists, items: rows }) };
  };
  const window = makePage({ fetch });
  await settle();
  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();

  const host = window.document.createElement("div");
  host.innerHTML = window.MarvellFavorites.createCardButtonMarkup(piece("Camellia", "/product?id=a"));
  window.document.body.appendChild(host);
  await settle();
  host.querySelector("[data-favorite-toggle]").click();
  await settle();

  assert.equal(calls.filter((body) => body?.operation === "add_item").length, 0,
    "opening the chooser does not silently save to the default list");
  const picker = window.document.querySelector(".wishlist-picker");
  assert.ok(picker, "the existing quick panel becomes the list chooser");
  assert.deepEqual([...picker.querySelectorAll("[data-wishlist-pick]")].map((button) => button.textContent.replace(/\s+/g, "").trim()),
    ["SavedSavehere", "AnniversarySavehere"]);

  picker.querySelector('[data-wishlist-pick="list-2"]').click();
  await settle();
  const add = calls.find((body) => body?.operation === "add_item");
  assert.equal(add?.list_id, "list-2");
  assert.equal(add?.item?.title, "Camellia");
  assert.equal(window.MarvellFavorites.accountSnapshot().items["list-2"].length, 1);
});

test("an existing account session is restored at page boot", async () => {
  const dom = new JSDOM('<!doctype html><html><body><header><div class="header-bar"></div></header></body></html>', {
    url: "https://marvellflorist.com/shop", runScripts: "outside-only"
  });
  windows.push(dom);
  const { window } = dom;
  const calls = [];
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.fetch = async (url) => {
    calls.push(String(url));
    if (String(url) === "/api/account/session") return { ok: true, json: async () => ({
      ok: true, available: true, signed_in: true, user: { email: "owner@example.com" }, providers: { google: false }
    }) };
    if (String(url) === "/api/account/orders") return { ok: true, json: async () => ({ ok: true, orders: [] }) };
    throw new Error(`Unexpected URL ${url}`);
  };
  window.eval(SHOP);
  window.eval(ACCOUNT);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  await settle();

  assert.ok(calls.includes("/api/account/session"), "boot checks the HttpOnly cookie session");
  assert.equal(window.MarvellAccount.isSignedIn(), true);
});

test("opening the account while boot restores it shares one session refresh", async () => {
  const dom = new JSDOM('<!doctype html><html><body><header><div class="header-bar"></div></header></body></html>', {
    url: "https://marvellflorist.com/shop", runScripts: "outside-only"
  });
  windows.push(dom);
  const { window } = dom;
  let sessionCalls = 0;
  let finishSession;
  const sessionReply = new Promise((resolve) => { finishSession = resolve; });
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = (callback) => window.setTimeout(callback, 0);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  window.fetch = async (url) => {
    if (String(url) === "/api/account/session") {
      sessionCalls += 1;
      return sessionReply;
    }
    if (String(url) === "/api/account/orders") return { ok: true, json: async () => ({ ok: true, orders: [] }) };
    throw new Error(`Unexpected URL ${url}`);
  };
  window.eval(SHOP);
  window.eval(ACCOUNT);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  window.MarvellAccount.open();

  assert.equal(sessionCalls, 1, "boot and panel open must not race the refresh token");
  finishSession({ ok: true, json: async () => ({
    ok: true, available: true, signed_in: true, user: { email: "owner@example.com" }, providers: { google: true }
  }) });
  await settle();
  assert.equal(window.MarvellAccount.isSignedIn(), true);
});

test("signing out leaves nothing of the account in a shared browser", async () => {
  const server = fakeServer([{ ...piece("Camellia", "/product?id=a"), id: "href:/product?id=a" }]);
  const window = makePage({ fetch: server.fetch });
  await settle();
  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();
  assert.equal(read(window, ACCOUNT_KEY).length, 1);

  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: false } }));
  await settle();
  assert.equal(window.localStorage.getItem(ACCOUNT_KEY), null, "the mirror is removed, not merely emptied");
  assert.equal(window.MarvellFavorites.getFavorites().length, 0, "the next visitor sees their own empty list");
});

test("a wishlist that cannot reach the account falls back to the device, not to nothing", async () => {
  const window = makePage({ fetch: async () => ({ ok: false, status: 401, json: async () => ({ ok: false, code: "not_signed_in" }) }) });
  await settle();
  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();

  // The session was refused, so the heart goes back to saving here.
  assert.equal(window.MarvellFavorites.toggleFavorite(piece("Camellia", "/product?id=a")), true);
  assert.equal(read(window, GUEST_KEY).length, 1);
  assert.equal(window.localStorage.getItem(ACCOUNT_KEY), null);
});

test("the panel shows what is saved, and offers the account only to a guest", async () => {
  // It used to render the empty state on every pass — the branch that drew
  // the list had been lost — so a customer with a full wishlist was told it
  // was empty, in a panel whose only content was one sentence floating in
  // the middle of it.
  const server = fakeServer();
  const window = makePage({ fetch: server.fetch });
  await settle();
  window.MarvellFavorites.open();
  await settle();

  const panel = window.document.querySelector(".wishlist-panel, [data-favorites-drawer], .mv-panel");
  assert.ok(panel, "the panel is in the page");

  assert.equal(panel.getAttribute("aria-hidden"), "false");
  assert.match(panel.textContent, /Your wishlist is empty/);
  assert.ok(!/Saved on this device/.test(panel.textContent), "no storage caption");
  assert.ok(!/Saved to your account/.test(panel.textContent), "and none for an account either");
  const offer = panel.querySelector("[data-account-open]");
  assert.ok(offer, "with the offer to keep it anywhere");
  assert.ok(offer.closest(".wishlist-panel-empty"));
  // The title is above it either way, so the empty state is a state of the
  // panel rather than the whole of it.
  assert.ok(panel.querySelector(".wishlist-panel-head"), "the panel wears its title when empty");

  window.MarvellFavorites.toggleFavorite(piece("Camellia", "/product?id=a"));
  await settle();
  assert.equal(panel.querySelectorAll(".wishlist-panel-item").length, 1, "the saved piece is listed");
  assert.match(panel.textContent, /Camellia/);
  assert.ok(!panel.querySelector(".wishlist-panel-empty"), "and no longer called empty");
  assert.ok(panel.querySelector("[data-favorite-remove]"), "with a way to take it back out");
  assert.match(panel.querySelector('.wishlist-panel-foot a[href^="/wishlist"]')?.textContent || "",
    /View your wishlist/, "and the way through to the room");
  assert.ok(panel.querySelector(".wishlist-panel-foot [data-account-open]"),
    "a guest with pieces is still offered the account");

  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();
  assert.ok(!panel.querySelector("[data-account-open]"), "and never asked again once signed in");
});

test("the wishlist endpoint decides ownership itself, and never from the browser", () => {
  // Every read and write is scoped to the session's own user id. A list id
  // from the body is only ever used after ownedList has checked it.
  assert.match(WISHLIST_FN, /if \(!session\) return fail\("not_signed_in"/);
  assert.match(WISHLIST_FN, /\.eq\("id", requiredId\(listId\)\)\.eq\("user_id", userId\)/);
  assert.ok(!/service_role|SUPABASE_SERVICE/.test(WISHLIST_FN.replace(/getServiceClient/g, "")),
    "the service key is named nowhere a browser could read it");

  // The default list is the server's to create and to protect.
  assert.match(WISHLIST_FN, /name: "Saved", is_default: true/);
  assert.match(WISHLIST_FN, /if \(list\.is_default\) return withCookies\(fail\("default_list"/);
});

test("sharing a list with Marvell is a private preference, not a public URL", () => {
  assert.match(MIGRATION, /shared_with_marvell boolean not null default false/);
  // No policy grants anyone but the owner, and anon is granted nothing at all.
  assert.ok(!/shared_with_marvell/.test(MIGRATION.split("enable row level security")[1] || ""),
    "the share flag appears in no policy, so it can never widen access by itself");
  assert.match(MIGRATION, /revoke all on public\.wishlist_lists, public\.wishlist_items from public, anon, authenticated/);
  for (const policy of MIGRATION.match(/create policy[^;]+;/g) || []) {
    assert.match(policy, /to authenticated/, "no policy is open to anon");
    assert.match(policy, /auth\.uid\(\)/, "and every one is tied to the caller");
  }
});

test("one default list per customer, and one copy of each piece in it", () => {
  assert.match(MIGRATION, /create unique index if not exists wishlist_lists_one_default_per_user\s+on public\.wishlist_lists\(user_id\) where is_default/);
  assert.match(MIGRATION, /unique \(list_id, item_key\)/);
  // Re-running the file must not fail on an object that is already there.
  assert.equal((MIGRATION.match(/^create policy/gm) || []).length, (MIGRATION.match(/^drop policy if exists/gm) || []).length);
  assert.equal((MIGRATION.match(/^create trigger/gm) || []).length, (MIGRATION.match(/^drop trigger if exists/gm) || []).length);
});

// -- the wishlist page ------------------------------------------------------

const PAGE_HTML = await readFile(new URL("wishlist.html", ROOT), "utf8");
// The room's own styling is one sheet now, shared by /wishlist and by the
// wishlist tab on /account.
const PAGE_CSS = await readFile(new URL("assets/wishlist.css", ROOT), "utf8");
const PAGE_JS = await readFile(new URL("assets/wishlist-page.js", ROOT), "utf8");
const BAG_HTML = await readFile(new URL("bag.html", ROOT), "utf8");
const PURCHASE = await readFile(new URL("assets/purchase-mode.js", ROOT), "utf8");

function makeWishlistPage({ fetch, url = "https://marvellflorist.com/wishlist" } = {}) {
  const dom = new JSDOM(PAGE_HTML, { url, runScripts: "outside-only" });
  windows.push(dom);
  const { window } = dom;
  window.fetch = fetch || (async () => { throw Error("offline"); });
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = (fn) => window.setTimeout(fn, 0);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  window.scrollTo = () => {};
  window.eval(ICONS); window.eval(SHOP); window.eval(FAVORITES); window.eval(PAGE_JS);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  return window;
}

test("the wishlist page is a room of pieces, not a second cart", () => {
  // The bag totals, counts quantities and checks out. None of that belongs to
  // a list of things somebody is still thinking about.
  for (const forbidden of [/data-cart-total/, /Subtotal/i, /Checkout/i, /quantity/i, /data-qty/]) {
    assert.ok(!forbidden.test(PAGE_HTML), `the wishlist page has no ${forbidden}`);
  }
  // The bag still has them, so this is a difference and not a regression.
  assert.match(BAG_HTML, /Checkout|checkout/);

  // Photography on a grid, using the same cards the shop already draws.
  assert.match(PAGE_JS, /class="shop-card"/);
  assert.match(PAGE_HTML, /class="shop-grid wl-grid"/);
});

test("a signed-out visitor sees their pieces, and never a list to choose from", async () => {
  const window = makeWishlistPage();
  await settle();
  window.MarvellFavorites.toggleFavorite(piece("Camellia", "/product?id=a"));
  await settle();

  const index = window.document.querySelector('[data-wl-view="index"]');
  const detail = window.document.querySelector('[data-wl-view="detail"]');
  assert.equal(index.hidden, true, "no index: one list is nothing to choose between");
  assert.equal(detail.hidden, false);
  assert.equal(window.document.querySelectorAll("[data-wl-item]").length, 1);
  assert.match(window.document.querySelector("[data-wl-detail-name]").textContent, /^Saved/,
    "the guest's one list has the same stable name as the default account list");

  // No account chrome at all, and no caption: the offer is the one line on
  // the page, under the pieces.
  assert.equal(window.document.querySelector("[data-wl-share]").hidden, true, "sharing needs an account");
  assert.equal(window.document.querySelector("[data-wl-detail-top]").hidden, true, "and so do list options");
  assert.equal(window.document.querySelector("[data-wl-detail-sub]").hidden, true, "no standing subtitle");
  const foot = window.document.querySelector("[data-wl-foot]");
  assert.equal(foot.hidden, false);
  assert.ok(foot.querySelector("[data-account-open]"));
});

test("a customer sees every list, and opens one without leaving the page", async () => {
  const server = fakeServer([{ ...piece("Camellia", "/product?id=a"), id: "href:/product?id=a" }]);
  const window = makeWishlistPage({ fetch: server.fetch });
  await settle();
  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();

  const index = window.document.querySelector('[data-wl-view="index"]');
  assert.equal(index.hidden, false, "a customer starts at their lists");
  assert.match(index.textContent, /Your wishlists/);
  assert.equal(window.document.querySelectorAll("[data-wl-open]").length, 2, "collage and name both open it");
  assert.equal(window.document.querySelectorAll(".wl-collage-cell").length, 1,
    "a short list does not leave empty photo tiles");
  assert.ok(window.document.querySelector("[data-wl-create]"), "and a list can be created");

  window.document.querySelector("[data-wl-open]").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await settle();
  assert.equal(index.hidden, true);
  assert.equal(window.document.querySelector('[data-wl-view="detail"]').hidden, false);
  assert.match(window.location.search, /list=list-1/, "the open list is in the address");
  assert.equal(window.document.querySelectorAll("[data-wl-item]").length, 1);
});

test("a two-piece list shows two photos in its collage", async () => {
  const server = fakeServer([
    { ...piece("Camellia", "/product?id=a"), id: "href:/product?id=a", image: "/assets/camellia.webp" },
    { ...piece("Peony", "/product?id=b"), id: "href:/product?id=b", image: "/assets/peony.webp" }
  ]);
  const window = makeWishlistPage({ fetch: server.fetch });
  await settle();
  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();
  assert.equal(window.document.querySelectorAll(".wl-collage-cell").length, 2);
  assert.equal(window.document.querySelectorAll(".wl-collage-cell img").length, 2);
});

test("legacy account rows recover images from their product link", async () => {
  const href = "/product.html?title=Celebration&image=%2Fassets%2Fuploads%2Fbou-(graduation)black,gold.webp";
  // This is the shape of the affected live rows: the canonical path survived
  // in item_key, while the old URL filter emptied both stored fields.
  const server = fakeServer([{ ...piece("Celebration", ""), id: `href:${href}`, image: "" }]);
  const window = makeWishlistPage({ fetch: server.fetch });
  await settle();
  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();

  const recovered = window.MarvellFavorites.accountSnapshot().items["list-1"][0];
  assert.equal(new URL(recovered.href, window.location.origin).searchParams.get("title"), "Celebration");
  assert.equal(new URL(recovered.href, window.location.origin).searchParams.get("image"), "/assets/uploads/bou-(graduation)black,gold.webp");
  assert.equal(recovered.image, "/assets/uploads/bou-(graduation)black,gold.webp");
  assert.equal(window.document.querySelector(".wl-collage-cell img")?.getAttribute("src"), recovered.image);
  assert.match(WISHLIST_FN, /Product assets legitimately contain commas and parentheses/);
});

test("Remove stays visible and Add to bag appears only for catalogue-purchasable pieces", async () => {
  const window = makeWishlistPage({ fetch: async (url) => {
    if (String(url) === "/api/catalog") return {
      ok: true, json: async () => ({ ok: true, collections: [], products: [
        { sku: "ST-01", name: "Soft Tones No. 1", purchasable: true },
        { sku: "ST-02", name: "Soft Tones No. 2", purchasable: false }
      ] })
    };
    throw Error(`Unexpected URL ${url}`);
  } });
  window.eval(PURCHASE);
  window.MarvellFavorites.toggleFavorite({ ...piece("Soft Tones No. 1", "/product/soft-tones-no-1"),
    sku: "ST-01", purchaseMode: "direct" });
  window.MarvellFavorites.toggleFavorite({ ...piece("Soft Tones No. 2", "/product/soft-tones-no-2"),
    sku: "ST-02", purchaseMode: "direct" });
  await settle();

  assert.equal(window.document.querySelectorAll("[data-wl-items] [data-wl-remove]").length, 2);
  const buttons = [...window.document.querySelectorAll("[data-wl-items] [data-wishlist-bag]")];
  assert.equal(buttons.length, 2);
  assert.equal(buttons.find((button) => button.dataset.bagAdd === "ST-01")?.hidden, false);
  assert.equal(buttons.find((button) => button.dataset.wishlistBag.includes("soft-tones-no-2"))?.hidden, true);
  assert.equal(window.document.querySelector("[data-wl-enquire]"), null);
});

/**
 * The saved notice is a card again.
 *
 * It had been reduced to a line of text in the top corner, transparent and
 * borderless, gone after 2.8 seconds — no name for what was saved, no way to
 * the wishlist, nothing to dismiss. It is the card it was before: the eyebrow,
 * a tick and the piece's own name, a link to the wishlist and a Close, over an
 * overlay, and it waits to be dismissed rather than timing out while somebody
 * is still reading it.
 */
test("the heart opens the panel, and the saved notice is a card over an overlay", async () => {
  const window = makePage({ fetch: async (url) => {
    assert.equal(String(url), "/api/catalog");
    return { ok: true, json: async () => ({ ok: true, collections: [], products: [
      { sku: "ST-01", name: "Soft Tones No. 1", purchasable: true }
    ] }) };
  } });
  await settle();
  window.MarvellFavorites.toggleFavorite({ ...piece("Soft Tones No. 1", "/product/soft-tones-no-1"),
    sku: "ST-01", purchaseMode: "direct" });
  await settle();
  // The heart opens the panel whether or not anything is saved. It used to
  // leave for the page as soon as the first piece went in, which on a header
  // that ships its own markup — a <button>, not an anchor — meant the heart
  // simply stopped working once you had used it.
  assert.ok(!/window\.location\.assign\(wishlistPageHref\(\)\)/.test(FAVORITES),
    "the heart still navigates instead of opening its panel");
  assert.match(FAVORITES, /function openWishlist\(\) \{[\s\S]*?setDrawerOpen\(true\);\n  \}/);
  const heartClick = FAVORITES.slice(FAVORITES.indexOf("launcherButton.addEventListener"));
  assert.match(heartClick.slice(0, heartClick.indexOf("\n    }")), /event\.preventDefault\(\)/,
    "a plain click on the heart is handled here, not left to the element");
  // Nothing is bought from the panel; that is what the bag is for.
  assert.equal(window.document.querySelector('.mv-panel--wishlist [data-bag-add="ST-01"]'), null);

  // The notice and the overlay behind it are both built with the panel chrome.
  // (showToast itself only runs from the heart button, not from the programmatic
  // toggleFavorite this test calls, so what it renders is checked at the source.)
  assert.ok(window.document.querySelector(".favorites-toast"), "no saved notice at all");
  assert.ok(window.document.querySelector(".favorites-toast-overlay"), "no overlay behind the notice");

  const card = FAVORITES.slice(FAVORITES.indexOf("function showToast"));
  const body = card.slice(0, card.indexOf("\n  }"));
  assert.match(body, /favorites-toast-name">\$\{escapeHtml\(title\)\}/, "the notice does not name what was saved");
  assert.match(body, /favorites-toast-link[^"]*" href/, "no way from the notice to the wishlist");
  assert.match(body, /data-favorites-toast-close/, "nothing to dismiss it with");
  assert.match(body, /toastOverlay\.classList\.add\("is-open"\)/, "the overlay is not raised with it");

  // A card, not a line of text in the corner.
  assert.match(FAVORITES, /\.favorites-toast \{[\s\S]*?left: 50%;[\s\S]*?border: 1px solid[\s\S]*?box-shadow: 0 14px 34px/);
  // And it waits, rather than timing out under whoever is reading it.
  assert.ok(!/toastTimer = window\.setTimeout\(hideToast/.test(FAVORITES),
    "the notice still dismisses itself on a timer");
});

test("organising a piece stays inside the list and uses the account queue", async () => {
  const server = fakeServer([{ ...piece("Camellia", "/product?id=a"), id: "href:/product?id=a" }]);
  server.state.lists.push({ id: "list-2", name: "Occasions", is_default: false, shared_with_marvell: false });
  const window = makeWishlistPage({ fetch: server.fetch });
  await settle();
  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();
  window.document.querySelector('[data-wl-open="list-1"]').click();
  const trigger = window.document.querySelector("[data-wl-item-menu-trigger]");
  trigger.click();
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  assert.equal(window.document.querySelectorAll('[data-wl-transfer="move"]').length, 1);
  assert.equal(window.document.querySelectorAll('[data-wl-transfer="copy"]').length, 1);
  window.document.querySelector('[data-wl-transfer="move"]').click();
  await settle();
  const moved = server.state.calls.find((call) => call.body?.operation === "move_item");
  assert.equal(moved?.body.from_list_id, "list-1");
  assert.equal(moved?.body.to_list_id, "list-2");
  assert.equal(moved?.body.item_key, "href:/product?id=a");
});

test("a piece can start another named wishlist from its Edit menu", async () => {
  const server = fakeServer([{ ...piece("Camellia", "/product?id=a"), id: "href:/product?id=a" }]);
  const window = makeWishlistPage({ fetch: server.fetch });
  await settle();
  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();
  window.document.querySelector('[data-wl-open="list-1"]').click();
  window.document.querySelector("[data-wl-item-menu-trigger]").click();
  window.document.querySelector("[data-wl-create-for-item]").click();
  await settle();

  assert.ok(server.state.calls.some((call) => call.body?.operation === "create_list"));
  assert.ok(server.state.calls.some((call) => call.body?.operation === "move_item"
    && call.body.to_list_id === "list-2"));
  assert.match(window.location.search, /list=list-2/);
  assert.equal(window.document.querySelector("[data-wl-rename-form]").hidden, false);
});

test("the default list cannot be deleted, and sharing is off until it is chosen", async () => {
  const server = fakeServer();
  const window = makeWishlistPage({ fetch: server.fetch, url: "https://marvellflorist.com/wishlist?list=list-1" });
  await settle();
  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();

  const share = window.document.querySelector("[data-wl-share-input]");
  assert.equal(share.checked, false, "off by default");
  assert.equal(window.document.querySelector("[data-wl-share]").hidden, false);
  assert.ok(!window.document.querySelector("[data-wl-delete]"), "Saved is not deletable");
  assert.ok(window.document.querySelector("[data-wl-rename]"), "but it can be renamed");

  share.checked = true;
  share.dispatchEvent(new window.Event("change", { bubbles: true }));
  await settle();
  const shared = server.state.calls.find((call) => call.body?.operation === "set_share");
  assert.ok(shared, "the choice is stored server-side");
  assert.equal(shared.body.shared, true);
});

test("every list change goes through the heart's queue, so the panel cannot drift", () => {
  // The page never calls the wishlist endpoint itself. One queue, one cache,
  // one list. Signing out uses the separate account session endpoint.
  assert.ok(!/fetch\(["'`]\/api\/account\/wishlist/.test(PAGE_JS),
    "wishlist changes stay in the shared queue");
  assert.match(PAGE_JS, /Favorites\(\)\?\.accountOperation\?\.\(body\)/);
  for (const operation of ["create_list", "rename_list", "delete_list", "set_share", "remove_item"]) {
    assert.match(PAGE_JS, new RegExp(`operation: "${operation}"`), `${operation} is wired`);
  }
  assert.match(PAGE_JS, /action === "move" \? "move_item" : "copy_item"/,
    "the item menu can move or copy a piece");
});

test("the Mother's Day bag is open in development and shut on the live site", () => {
  // On by default away from marvellflorist.com, so the journey can be walked;
  // named hosts stay on the consultation path unless asked.
  assert.match(PURCHASE, /const PRODUCTION_HOSTS = new Set\(\["marvellflorist\.com", "www\.marvellflorist\.com"\]\)/);
  assert.match(PURCHASE, /return !isProductionHost\(\);/);
  // A hostname that cannot be read is treated as production.
  assert.match(PURCHASE, /function isProductionHost\(\)[^]*?catch \(_error\) \{\s*return true;/);
  // Turning it off still sticks, which an absent value could not express.
  assert.match(PURCHASE, /if \(stored === "0"\) return false;/);
});

test("a new list is made, then named — not named, then made", async () => {
  // Asking for a name before the list exists is a form to fill in before
  // anything has been saved to it. The list arrives with a number, opens
  // straight away, and is renamed later from its own Options menu if it ever
  // turns out to be worth naming.
  const server = fakeServer();
  const window = makeWishlistPage({ fetch: server.fetch });
  await settle();
  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();

  // No naming step stands between the button and the list.
  assert.equal(window.document.querySelector("[data-wl-create-form]"), null);
  assert.equal(window.document.querySelector("[data-wl-create-input]"), null);

  window.document.querySelector("[data-wl-create]")
    .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await settle();

  const created = server.state.calls.find((call) => call.body?.operation === "create_list");
  assert.ok(created, "the list is made on the first tap");
  assert.equal(created.body.name, "Wishlist 1");
  assert.match(window.location.search, /list=list-2/, "and it opens");
  assert.equal(window.document.querySelector("[data-wl-rename-form]").hidden, false,
    "its name is ready to edit immediately");
  assert.ok(window.document.querySelector("[data-wl-rename-form]").parentElement.classList.contains("wl-title-slot"),
    "the field replaces the title instead of appearing farther down the sidebar");
  assert.equal(window.document.querySelector("[data-wl-detail-name]").hidden, true,
    "the old title is hidden while its in-place field is active");

  // The next one takes the next free number rather than the count, so
  // deleting one and making another cannot produce two of the same name.
  window.history.replaceState({}, "", "https://marvellflorist.com/wishlist");
  window.dispatchEvent(new window.PopStateEvent("popstate"));
  await settle();
  window.document.querySelector("[data-wl-create]")
    .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await settle();

  const names = server.state.calls
    .filter((call) => call.body?.operation === "create_list")
    .map((call) => call.body.name);
  assert.deepEqual(names, ["Wishlist 1", "Wishlist 2"]);
});

test("the wishlist page does not caption itself", async () => {
  // A room of saved pieces does not need a line under the title explaining
  // where it is kept. The heading, the pieces, and — for a guest — one offer
  // at the foot is the whole page.
  assert.ok(!/Saved to your account/.test(PAGE_JS), "no storage caption for an account");
  assert.ok(!/data-wl-index-sub/.test(PAGE_HTML), "and none over the index either");

  // Adelio is the same title face as the account sign-up page. The tally
  // remains a small text label rather than another title.
  assert.match(PAGE_CSS, /\.wl-heading \{[^}]*font-family: "AdelioDisplayCondensed"[^}]*!important/);
  assert.match(PAGE_CSS, /\.wl-heading \.wl-tally \{[^}]*font-size: 13px/);
});

test("wishlist photography is one frame at one height, as many to a row as fit", () => {
  // It was a CSS multi-column flow, which caps the columns at whichever is
  // smaller of the count and the space divided by the column width — so a
  // sidebar-narrowed page gave two or three where four fitted — and balances
  // its contents, so a short list sat in the left half of an empty page.
  assert.ok(!/columns: 4 210px/.test(PAGE_CSS), "the masonry flow is back");
  assert.match(PAGE_CSS, /\.wl-grid \{[^}]*display: grid;[^}]*grid-template-columns: repeat\(auto-fill,/,
    "the pieces take as many equal tracks as the column will hold");
  assert.match(PAGE_CSS, /\.wl-grid \.shop-card-media \{[^}]*aspect-ratio: 4 \/ 5;/,
    "every frame is the same shape, so the cards line up");
  assert.match(PAGE_CSS, /\.wl-product-title \{[^}]*-webkit-line-clamp: 2;/,
    "and a long name cannot make one card taller than its row");
  assert.match(PAGE_CSS, /\.wl-collage-cell img \{[^}]*object-fit: cover;/,
    "list previews fill every mosaic tile");
  assert.match(PAGE_CSS, /\.wl-product-title:hover, \.wl-product-title:focus-visible \{ text-decoration: none;/,
    "product names stay clean on hover and keyboard focus");

  // The Edit control is quiet until the card is under the cursor, the way
  // each list card's own three dots are.
  assert.match(PAGE_CSS, /\.wl-item-menu-trigger \{[^}]*opacity: 0;/);
  assert.match(PAGE_CSS, /\.shop-card:hover \.wl-item-menu-trigger,[\s\S]*?opacity: 1;/);

  // No photograph grows under the cursor here any more.
  assert.ok(!/scale\(1\.018\)/.test(PAGE_CSS), "a hover still zooms a saved piece");
});

test("a signed-in customer whose lists will not load is never asked to sign in", async () => {
  // The bug this guards: the page used to ask MarvellFavorites "is the
  // account list live?" and treat the answer as "is this person signed in?".
  // One failed call to the wishlist endpoint — a missing migration, a 500,
  // anything — ran dropToGuest(), and a signed-in customer was shown a
  // guest's page: no lists, and an invitation to sign in they had already
  // accepted. Identity comes from the account now; the store only decides
  // what can be displayed.
  const window = makeWishlistPage({
    fetch: async () => ({ ok: false, status: 500, json: async () => ({ ok: false, code: "server_error" }) })
  });
  await settle();
  window.MarvellFavorites.toggleFavorite(piece("Camellia", "/product?id=a"));
  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();

  const detail = window.document.querySelector('[data-wl-view="detail"]');
  assert.equal(detail.hidden, false, "their pieces are still shown");
  assert.equal(window.document.querySelectorAll("[data-wl-item]").length, 1, "and nothing looks lost");
  assert.equal(detail.querySelector("[data-account-open]"), null, "with no sign-in offer anywhere");

  // And the reason is said, rather than left as a silent guest view.
  const foot = window.document.querySelector("[data-wl-foot]");
  assert.equal(foot.hidden, false);
  assert.match(foot.textContent, /could not reach your saved lists/i);
  assert.ok(!/Sign in/i.test(foot.textContent));
});

test("each list on the index carries its own options, as Dior's does", async () => {
  const server = fakeServer();
  const window = makeWishlistPage({ fetch: server.fetch });
  await settle();
  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();

  // Make a second list, so there is one that is not the default.
  window.document.querySelector("[data-wl-create]")
    .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await settle();
  window.history.replaceState({}, "", "https://marvellflorist.com/wishlist");
  window.dispatchEvent(new window.PopStateEvent("popstate"));
  await settle();

  const triggers = window.document.querySelectorAll("[data-wl-card-menu-trigger]");
  assert.equal(triggers.length, 2, "every card has a menu");

  // The default list cannot be deleted from the index either.
  const cards = window.document.querySelectorAll(".wl-list-card");
  assert.equal(cards[0].querySelector("[data-wl-card-delete]"), null, "the default list has no delete");
  assert.ok(cards[1].querySelector("[data-wl-card-delete]"), "the one that can go, can");

  cards[1].querySelector("[data-wl-card-share]").click();
  await settle();
  assert.ok(server.state.calls.some((call) => call.body?.operation === "set_share"
    && call.body.list_id === "list-2" && call.body.shared === true),
  "the card's share choice updates that list only");

  // Renaming happens on the card, not by opening the list first.
  window.document.querySelectorAll(".wl-list-card")[1].querySelector("[data-wl-card-rename]")
    .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await settle();
  const field = window.document.querySelector("[data-wl-card-rename-input]");
  assert.ok(field, "the name becomes a field in place");
  assert.equal(window.location.search, "", "and the index is not left to do it");

  field.value = "Mother's Day";
  field.form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await settle();

  const renamed = server.state.calls.find((call) => call.body?.operation === "rename_list");
  assert.ok(renamed, "the rename is sent");
  assert.equal(renamed.body.name, "Mother's Day");
  assert.equal(window.document.querySelector("[data-wl-card-rename-input]"), null, "and the field closes");
});

test("the quick panel makes the same distinction as the page", async () => {
  // The panel reads the same two facts, so it cannot disagree with the page
  // about whether somebody is signed in.
  const window = makePage({
    fetch: async () => ({ ok: false, status: 500, json: async () => ({ ok: false, code: "server_error" }) })
  });
  await settle();
  window.MarvellFavorites.toggleFavorite(piece("Camellia", "/product?id=a"));
  window.MarvellFavorites.open();
  await settle();

  const panel = window.document.querySelector(".wishlist-panel, [data-favorites-drawer], .mv-panel");
  assert.ok(panel.querySelector("[data-account-open]"), "a guest is offered the account");
  assert.equal(panel.querySelectorAll(".wishlist-panel-item").length, 1,
    "and their piece is shown, not hidden behind the offer");

  window.dispatchEvent(new window.CustomEvent("marvell:account-change", { detail: { signed_in: true } }));
  await settle();
  assert.equal(
    panel.querySelector("[data-account-open]"), null,
    "and somebody signed in is not, even though the store never answered"
  );
  // Field by field: the object comes from the jsdom realm, so deepEqual
  // compares prototypes as well as values and would fail on a match.
  const state = window.MarvellFavorites.accountState();
  assert.equal(state.signedIn, true, "the person is signed in");
  assert.equal(state.synced, false, "their lists are not loaded");
  assert.equal(state.unavailable, true, "and the page may say why");
});
