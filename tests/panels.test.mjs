import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const ROOT = new URL("../", import.meta.url);
const SHOP = await readFile(new URL("assets/marvell-shop.js", ROOT), "utf8");
const ICONS = await readFile(new URL("assets/marvell-icons.js", ROOT), "utf8");
const FAVORITES = await readFile(new URL("assets/favorites.js", ROOT), "utf8");
const HEADER = await readFile(new URL("assets/header-template.js", ROOT), "utf8");
const ACCOUNT = await readFile(new URL("assets/account.js", ROOT), "utf8");
const BAG = await readFile(new URL("assets/bag.js", ROOT), "utf8");
const CONTACT = await readFile(new URL("assets/shared-contact.js", ROOT), "utf8");
const NEWSLETTER = await readFile(new URL("assets/newsletter.js", ROOT), "utf8");
const windows = [];
test.after(() => windows.forEach(dom => dom.window.close()));

function makePage() {
  const dom = new JSDOM('<!doctype html><html><body><header><div class="header-bar"><button class="menu-toggle"></button><a class="search-toggle"></a><a class="header-logo"></a><a class="header-contact" href="#">Contact Us</a></div></header><main>Page</main><footer id="site-footer"><div class="footer-inner"><div class="footer-grid"></div></div></footer></body></html>', {
    url: "https://marvellflorist.com/shop", runScripts: "outside-only"
  });
  windows.push(dom);
  const { window } = dom;
  window.fetch = async () => { throw Error("offline"); };
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = fn => window.setTimeout(fn, 0);
  window.cancelAnimationFrame = id => window.clearTimeout(id);
  window.scrollTo = () => {};
  window.eval(ICONS); window.eval(SHOP); window.eval(HEADER); window.eval(FAVORITES); window.eval(ACCOUNT); window.eval(BAG);
  window.eval(CONTACT); window.eval(NEWSLETTER);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  return { window, document: window.document };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 30));

test("Join Marvell opens its quick panel without leaving the page", async () => {
  const { document } = makePage();
  await settle();
  const trigger = document.querySelector(".header-account[data-account-open]");
  assert.ok(trigger);
  assert.match(trigger.textContent, /Join Marvell/);
  trigger.click();
  await settle();
  assert.ok(document.querySelector("#marvell-account-drawer.is-open"));
});

test("an unknown sign-in email gets a clear account message and keeps the address", async () => {
  const { window, document } = makePage();
  window.fetch = async (url) => {
    if (String(url).includes('/api/account/request-code')) {
      return { ok: false, json: async () => ({ code: 'account_not_found' }) };
    }
    return { ok: true, json: async () => ({ ok: true, signed_in: false, available: true }) };
  };
  window.MarvellAccount.open();
  await settle();
  document.querySelector('[data-account-toggle="signin"]').click();
  const email = document.querySelector('[data-account-signin] [name="email"]');
  email.value = 'guest@example.com';
  email.dispatchEvent(new window.Event('input', { bubbles: true }));
  email.form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await settle();
  const notice = document.querySelector('[data-account-not-found]');
  assert.match(notice.textContent, /No account exists/);
  assert.equal(document.querySelector('[data-account-signin] [name="email"]').value, 'guest@example.com');
  assert.equal(notice.querySelector('a').getAttribute('href'), '/account');
  const retry = document.querySelector('[data-account-signin] [name="email"]');
  retry.value = 'another@example.com';
  retry.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(document.querySelector('[data-account-not-found]'), null);
});

test("the wishlist heart opens a panel without leaving the page", async () => {
  const { window, document } = makePage();
  document.querySelector(".favorites-launcher-btn").click();
  await settle();
  assert.ok(document.getElementById("favorites-drawer").classList.contains("is-open"));
  assert.equal(window.location.pathname, "/shop");
});

test("the empty wishlist has a clear state", async () => {
  const { document } = makePage();
  document.querySelector(".favorites-launcher-btn").click();
  await settle();
  const drawer = document.getElementById("favorites-drawer");
  assert.match(drawer.textContent, /Your wishlist is empty/);
  // Empty is where somebody is invited to keep the list, not just told it is
  // empty. The invitation opens the account rather than leaving the panel.
  assert.ok(drawer.querySelector(".wishlist-panel-empty [data-account-open]"));
});

test("the right-hand panels are one connected surface", async () => {
  const { window, document } = makePage();
  document.querySelector(".favorites-launcher-btn").click();
  await settle();
  assert.equal(window.MarvellShop.getActivePanel(), "wishlist");

  // Moving to the account must not close the wishlist outright: the departing
  // panel is held on screen to fade while the arriving one fades in.
  document.querySelector("#favorites-drawer [data-panel-account]").click();
  await settle();
  assert.equal(window.MarvellShop.getActivePanel(), "account");
  assert.ok(document.querySelector("#marvell-account-drawer.is-open"));

  // One backdrop for all of them, so it never blinks between panels.
  assert.equal(document.querySelectorAll("[data-mv-backdrop]").length, 1);
  assert.ok(document.querySelector("[data-mv-backdrop]").classList.contains("is-open"));
});

test("the registry never shows a backdrop without a connected destination", async () => {
  const { window, document } = makePage();
  await settle();
  window.MarvellFavorites.open();
  assert.equal(window.MarvellShop.getActivePanel(), "wishlist");

  const account = document.getElementById("marvell-account-drawer");
  account.remove();
  assert.equal(window.MarvellShop.openPanel("account"), false);
  assert.equal(window.MarvellShop.getActivePanel(), "wishlist");
  assert.ok(document.querySelector("#favorites-drawer.is-open"));
  assert.ok(document.querySelector("[data-mv-backdrop].is-open"));

  window.MarvellShop.closeAllPanels();
  assert.equal(window.MarvellShop.getActivePanel(), "");
  assert.ok(!document.querySelector("[data-mv-backdrop]").classList.contains("is-open"));
  assert.equal(document.body.style.overflow, "");
});

test("rapid switches keep exactly one destination above the backdrop", async () => {
  const { window, document } = makePage();
  await settle();
  for (const open of [window.MarvellFavorites.open, window.MarvellAccount.open,
    window.MarvellFavorites.open, window.MarvellAccount.open, window.MarvellFavorites.open]) {
    open();
    const current = window.MarvellShop.getActivePanel();
    const destination = current === "wishlist" ? "favorites-drawer" : "marvell-account-drawer";
    assert.ok(document.getElementById(destination).classList.contains("is-open"));
    assert.equal(document.getElementById(destination).getAttribute("aria-hidden"), "false");
    assert.ok(document.querySelector("[data-mv-backdrop].is-open"));
    assert.equal(document.body.style.overflow, "hidden");
  }
  window.MarvellShop.closeAllPanels();
  assert.ok(!document.querySelector("[data-mv-backdrop]").classList.contains("is-open"));
  assert.equal(document.body.style.overflow, "");
});

test("every right-hand panel opens, and only one is ever open", async () => {
  const { window, document } = makePage();
  await settle();

  // Each one opened from its own entry point, the way the site opens it.
  const opens = [
    ["wishlist", () => document.querySelector(".favorites-launcher-btn").click()],
    ["account", () => window.MarvellAccount.open()],
    ["contact", () => window.MarvellContact.open()],
    ["bag", () => window.MarvellBagUi.open()]
  ];

  for (const [name, open] of opens) {
    open();
    await settle();
    assert.equal(window.MarvellShop.getActivePanel(), name, `${name} did not take the screen`);

    const openPanels = [...document.querySelectorAll(".mv-panel.is-open")]
      .filter((panel) => !panel.classList.contains("mv-panel-switch-out"));
    assert.equal(openPanels.length, 1, `${name} left another panel open behind it`);

    // Every one of them carries the same row, marking where you are.
    const row = openPanels[0].querySelector(".mv-panel-utility");
    assert.ok(row, `${name} is missing the utility row`);
    assert.ok(
      row.querySelector(`[data-panel-${name}][aria-current="true"]`),
      `${name} does not mark itself in the row`
    );
    assert.ok(row.querySelector("[data-panel-close]"), `${name} has no way out`);
  }

  // And one backdrop underneath all of them, from first to last.
  assert.equal(document.querySelectorAll(".mv-backdrop").length, 1);
});

test("closing any panel releases the scroll lock exactly once", async () => {
  const { window, document } = makePage();
  await settle();
  const before = document.body.style.overflow;

  window.MarvellAccount.open();
  await settle();
  assert.equal(document.body.style.overflow, "hidden");

  window.MarvellContact.open();
  await settle();
  assert.equal(document.body.style.overflow, "hidden", "a switch must not drop the lock");

  document.querySelector(".mv-panel.is-open [data-panel-close]").click();
  await settle();
  assert.equal(document.body.style.overflow, before, "and closing must give it back");
  assert.equal(window.MarvellShop.getActivePanel(), "");
  assert.ok(!document.querySelector(".mv-backdrop").classList.contains("is-open"));
});

test("the empty bag answers in the panel instead of a page", async () => {
  const { window, document } = makePage();
  window.MarvellBagUi.open();
  await settle();
  const panel = document.getElementById("marvell-bag-panel");
  assert.ok(panel?.classList.contains("is-open"), "the empty bag opens the panel");
  assert.match(panel.textContent, /Your bag is empty/);
  assert.equal(window.location.pathname, "/shop", "and does not navigate");
});

test("adding to the bag confirms it with the Apply Filters button", async () => {
  const { window, document } = makePage();
  window.MarvellBagUi.showAdded("Rosalind", "");
  await settle();
  const panel = document.getElementById("marvell-bag-panel");
  assert.match(panel.textContent, /Added to bag/);
  assert.match(panel.textContent, /Rosalind/);
  const cta = panel.querySelector(".mv-panel-foot .mv-cta");
  assert.ok(cta.classList.contains("mv-cta--apply"), "checkout uses the site's one apply button");
  assert.equal(cta.getAttribute("href"), "/checkout.html");
});

test("the contact panel survives loading before the shop core", async () => {
  // On about half the site's pages shared-contact.js sits above
  // marvell-shop.js in the document, because its script tag predates it. The
  // panel is built from marvell-shop's chrome, so it waits rather than
  // assuming — otherwise those pages get a panel with no walls and no way out.
  const dom = new JSDOM(
    '<!doctype html><html><body><header><div class="header-bar"><a class="header-contact" href="#">Contact Us</a></div></header></body></html>',
    { url: "https://marvellflorist.com/product", runScripts: "outside-only" }
  );
  windows.push(dom);
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = (fn) => window.setTimeout(fn, 0);
  window.fetch = async () => { throw Error("offline"); };

  window.eval(ICONS);
  window.eval(CONTACT);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  window.eval(SHOP);
  await settle();

  const panel = window.document.getElementById("contact-quick-panel");
  assert.equal(panel.className, "mv-panel mv-panel--contact");
  assert.ok(panel.querySelector(".mv-panel-utility"), "it still gets the shared row");
  assert.ok(panel.querySelector("[data-panel-close]"), "and a way out");
  assert.ok(window.document.getElementById("marvell-panel-styles"), "and the chrome's styles");

  window.MarvellContact.open();
  await settle();
  assert.ok(panel.classList.contains("is-open"));
  assert.equal(window.MarvellShop.getActivePanel(), "contact");
});

test("the indicator line survives a panel redrawing itself", async () => {
  const { window, document } = makePage();
  await settle();

  window.MarvellAccount.open();
  await settle();
  const first = document.querySelector("#marvell-account-drawer .mv-panel-utility-indicator");
  assert.ok(first.style.transform, "the line is placed under the account icon");

  // A redraw builds a new row. Without the sync it would leave the new
  // indicator at the far left of the row, under nothing.
  window.MarvellShop.syncUtilityRows();
  document.querySelector("#marvell-account-drawer").innerHTML =
    window.MarvellShop.utilityRowMarkup("account");
  window.MarvellShop.syncUtilityRows();

  const redrawn = document.querySelector("#marvell-account-drawer .mv-panel-utility-indicator");
  assert.ok(redrawn.style.transform, "the redrawn line is placed too");
  assert.equal(redrawn.style.opacity, "1");
});

test("the header cluster and a panel's row are the same four icons", async () => {
  const { document } = makePage();
  await settle();
  document.querySelector(".favorites-launcher-btn").click();
  await settle();

  const row = document.querySelector("#favorites-drawer .mv-panel-utility-actions");
  const inRow = [...row.querySelectorAll(".mv-panel-utility-action")].map((node) =>
    Object.keys(node.dataset).find((key) => key.startsWith("panel"))
  );
  assert.deepEqual(inRow, ["panelWishlist", "panelAccount", "panelContact", "panelBag"]);

  // Search is a place you go, not a panel that opens over where you are, so it
  // stays on the left of the header and out of this row.
  assert.equal(row.querySelector("[data-panel-search]"), null);
  assert.ok(document.querySelector(".header-bar .search-toggle"), "and is still in the header");

  // The header carries the same four, in the same order.
  const header = document.querySelector(".header-bar");
  const cluster = [".favorites-launcher", ".header-account", ".contact-quick-trigger", ".bag-launcher"]
    .map((selector) => header.querySelector(selector));
  assert.ok(cluster.every(Boolean), "every one of the four is in the header");
});

test("the masthead shows glyphs, and keeps its words for a screen reader", async () => {
  const { document } = makePage();
  await settle();

  // The words are still in the DOM — the translation pass writes them, and a
  // screen reader reads them — but every control also carries an aria-label,
  // and the labels are taken out of the page visually.
  const account = document.querySelector(".header-account");
  assert.ok(account.getAttribute("aria-label"), "the account control is labelled");
  assert.ok(account.querySelector(".header-account-label"), "and keeps its label node");

  const contact = document.querySelector(".contact-quick-trigger");
  assert.ok(contact.querySelector(".contact-quick-label"), "contact's words are wrapped");
  assert.ok(contact.querySelector(".contact-quick-icon svg"), "and it carries the family glyph");

  // The wrap must not have taken the icon out with it, which is what
  // setText on the control itself used to do.
  assert.match(contact.querySelector(".contact-quick-label").textContent, /Contact/i);
});

// ------------------------------------------------- the phone, specifically ---

const SHOP_CSS = await readFile(new URL("../assets/marvell-shop.js", import.meta.url), "utf8");
const CONTACT_CSS = await readFile(new URL("../assets/shared-contact.js", import.meta.url), "utf8");
const HEADER_CSS = await readFile(new URL("../assets/header-template.js", import.meta.url), "utf8");
const ACCOUNT_CSS = await readFile(new URL("../assets/account.js", import.meta.url), "utf8");

/** The `@media (max-width: 768px)` blocks of a source file, concatenated. */
function phoneRules(source) {
  const out = [];
  let from = 0;
  for (;;) {
    const start = source.indexOf("@media (max-width: 768px)", from);
    if (start === -1) break;
    let i = source.indexOf("{", start);
    let depth = 1;
    i += 1;
    while (depth && i < source.length) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") depth -= 1;
      i += 1;
    }
    out.push(source.slice(start, i));
    from = i;
  }
  return out.join("\n");
}

/**
 * A quick panel takes the whole screen on a phone, exactly as the menu does.
 * They used to stop 92dvh short, which left a strip of the page showing above
 * a panel that had otherwise replaced it, and made the left-hand menu and the
 * right-hand panels two sizes of the same gesture.
 */
test("a quick panel is the whole screen on a phone, like the menu", () => {
  const phone = phoneRules(SHOP_CSS);
  const panel = phone.slice(phone.indexOf(".mv-panel {"));
  const rule = panel.slice(0, panel.indexOf("}"));
  assert.match(rule, /height: 100dvh !important/, "the panel stops short of the screen");
  assert.ok(!/min\(92dvh/.test(phone), "something still caps a panel at 92dvh");
  // The menu's own figure, for comparison — both are 100dvh from the bottom.
  const menuPhone = phoneRules(HEADER_CSS);
  assert.match(menuPhone, /\.menu-panel \{[^}]*height: 100dvh !important/);
  assert.match(menuPhone, /\.menu-panel \{[^}]*transform: translateY\(100%\) !important/);
  assert.match(rule, /transform: translateY\(100%\) !important/, "and it rises the same way");
});

test("a full-screen panel clears the notch, as the menu head does", () => {
  const phone = phoneRules(SHOP_CSS);
  const utility = phone.slice(phone.indexOf(".mv-panel-utility {"));
  assert.match(utility.slice(0, utility.indexOf("}")), /env\(safe-area-inset-top/,
    "the panel's first row would sit under the status bar");
});

/**
 * Contact Us is not in the masthead on a phone — it is in the menu, which
 * opens it in place. Both stylesheets have to say so: shared-contact.js sets
 * `display: inline-flex !important` on the control with no media query, and
 * its sheet is injected after header-template.js's, so header-template saying
 * it alone was being overruled and the control showed on every phone.
 */
test("the Contact Us control is not in the masthead on a phone", () => {
  for (const [name, source] of [["header-template.js", HEADER_CSS], ["shared-contact.js", CONTACT_CSS]]) {
    const phone = phoneRules(source);
    const at = phone.indexOf(".contact-quick-trigger {");
    assert.notEqual(at, -1, `${name} says nothing about the control on a phone`);
    assert.match(phone.slice(at, phone.indexOf("}", at)), /display: none !important/,
      `${name} does not hide the control on a phone`);
  }
});

/**
 * And it is hidden at the weight that decides it.
 *
 * Both of the rules above name `.contact-quick-trigger` on its own. The phone
 * masthead rule in header-template.js named `.header-bar .contact-quick-trigger`
 * and showed it — a hundred specificity points heavier, so it won, and the
 * control sat on every phone through two separate attempts to hide it. Anything
 * that shows it on a phone has to be caught at its own weight.
 */
test("nothing shows the Contact Us control on a phone at .header-bar weight", () => {
  const phone = phoneRules(HEADER_CSS);
  for (const match of phone.matchAll(/([^{}]*)\{([^}]*)\}/g)) {
    const selectors = match[1].split(",").map((one) => one.trim());
    if (!selectors.some((one) => /\.(header-contact|contact-quick-trigger)$/.test(one))) continue;
    const display = /display:\s*([a-z-]+)/.exec(match[2]);
    if (!display) continue;
    assert.equal(display[1], "none",
      `a phone rule shows the contact control: ${match[1].trim().replace(/\s+/g, " ")}`);
  }
  // The cluster it used to belong to is the wishlist, the account and the bag.
  const cluster = phone.slice(phone.indexOf(".header-bar .favorites-launcher,"));
  const rule = cluster.slice(0, cluster.indexOf("{"));
  assert.ok(!/contact/.test(rule), "the contact control is back in the mobile icon cluster");
});

/**
 * Every accordion on the site opens with a plus that turns into a cross: the
 * footer columns, the services list, the gallery's filter groups, the bag's
 * side notes. The account panel's sections used a ring that filled with a dot
 * — a radio control's language, for sections that each open on their own.
 */
test("the account panel's sections open with a plus, like every other accordion", () => {
  const at = ACCOUNT_CSS.indexOf(".account-section-mark {");
  assert.notEqual(at, -1);
  const rule = ACCOUNT_CSS.slice(at, ACCOUNT_CSS.indexOf("}", at));
  assert.ok(!/border-radius: 50%/.test(rule), "the mark is still a ring");
  assert.match(ACCOUNT_CSS, /\.account-section-mark::after \{\s*content: "\+";/, "no plus");
  assert.match(ACCOUNT_CSS, /\.account-section\.is-open \.account-section-mark \{[^}]*rotate\(45deg\)/,
    "the plus does not open into a cross");
  // And it sits at the right-hand end of the row, where the others are.
  assert.match(ACCOUNT_CSS, /\.account-section-head \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto/);
  const head = ACCOUNT_CSS.indexOf("data-account-toggle=");
  const markAt = ACCOUNT_CSS.indexOf("account-section-mark", head);
  const titleAt = ACCOUNT_CSS.indexOf("account-section-title", head);
  assert.ok(titleAt < markAt, "the mark is still written before the title");
});

test("a row that leaves the panel keeps its arrow rather than gaining a plus", () => {
  assert.match(ACCOUNT_CSS, /\.account-section--link \.account-section-mark::after \{ content: none; \}/);
  const at = ACCOUNT_CSS.indexOf(".account-section--link .account-section-mark {");
  const rule = ACCOUNT_CSS.slice(at, ACCOUNT_CSS.indexOf("}", at));
  // The base rule no longer carries a border, so the arrow draws its own.
  assert.match(rule, /border-style: solid/);
  assert.match(rule, /border-width: 0 1px 1px 0/);
  assert.match(rule, /rotate\(-45deg\)/);
});

/**
 * The masthead cluster and a panel's utility row are the same four icons, so
 * they sit at the same spacing. The header was at 13px on a phone and the panel
 * row at 10px — one cluster, two rhythms, and 13px across a 390px masthead
 * reads as separate controls rather than a group.
 *
 * Careful, if this ever needs changing: the `gap: 16px` on
 * .mobile-header-actions in header-template.js is inert, because the same file
 * makes that box `display: contents` on a phone. The icons are direct flex
 * children of .header-bar there, so .header-bar's gap is the one that decides.
 */
test("the phone masthead spaces its icons like a panel's utility row", () => {
  const header = phoneRules(HEADER_CSS);
  // Every `.header-bar { … }` in a phone block, and the last one that sets a
  // gap is the one the cascade lands on.
  const gaps = [...header.matchAll(/\.header-bar \{([^}]*)\}/g)]
    .map((match) => /gap:\s*(\d+)px/.exec(match[1]))
    .filter(Boolean);
  assert.equal(gaps.length, 1,
    `the phone masthead sets its gap ${gaps.length} times; it should be said once`);
  const headerGap = gaps[gaps.length - 1];

  const shop = phoneRules(SHOP_CSS);
  const rowAt = shop.indexOf(".mv-panel-utility-actions {");
  assert.notEqual(rowAt, -1);
  const rowGap = /gap:\s*(\d+)px/.exec(shop.slice(rowAt, shop.indexOf("}", rowAt)));
  assert.ok(rowGap, "the panel's utility row sets no gap");

  assert.equal(headerGap[1], rowGap[1],
    `the masthead is at ${headerGap[1]}px and the panel row at ${rowGap[1]}px — same icons, different rhythm`);
});
