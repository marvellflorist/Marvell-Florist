/**
 * Navigation and footer.
 *
 * These modules are shared by every page on the site, including the historical
 * portfolio. The edits were small — two new entries, one rename — so these
 * tests check that the existing structure is intact and that nothing that used
 * to link somewhere now links nowhere.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const ROOT = new URL("../", import.meta.url);
const openWindows = [];
process.on("beforeExit", () => {
  while (openWindows.length) {
    try { openWindows.pop().window.close(); } catch { /* already closed */ }
  }
});

const MENU_SOURCE = await readFile(new URL("assets/secondary-menu.js", ROOT), "utf8");
const FOOTER_SOURCE = await readFile(new URL("assets/shared-footer.js", ROOT), "utf8");
const LANGUAGE_SOURCE = await readFile(new URL("assets/site-language.js", ROOT), "utf8");
const FAVORITES_SOURCE = await readFile(new URL("assets/favorites.js", ROOT), "utf8");
const SHOP_SOURCE = await readFile(new URL("assets/marvell-shop.js", ROOT), "utf8");

/** A bare page with just enough of the site's shell for the shared scripts. */
function makeDom(body = "") {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><head></head><body>
       <header><div class="header-bar">
         <a class="header-logo" href="index.html"><span class="header-logo-text">MARVELL FLORIST</span></a>
         <button class="menu-toggle" id="menu-toggle" type="button" aria-controls="menu-panel"></button>
       </div></header>
       ${body}
     </body></html>`,
    { url: "https://marvellflorist.com/gallery", runScripts: "outside-only" }
  );
  openWindows.push(dom);

  const { window } = dom;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}
  }));
  window.requestAnimationFrame = (fn) => window.setTimeout(() => fn(Date.now()), 0);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
  window.scrollTo = () => {};
  return dom;
}

test("Collections leads the menu, and is the only name for it", async () => {
  // Featured, Collections and Seasonal Editions were three names for one
  // idea — the seasonal editions — carried by two separate links in two
  // separate groups. There is one entry now, and it leads the menu.
  const dom = makeDom();
  dom.window.eval(MENU_SOURCE);
  await new Promise((r) => setTimeout(r, 50));

  const document = dom.window.document;
  const primary = document.querySelector(".menu-main-primary");
  assert.ok(primary, "primary menu group exists");

  assert.equal(
    primary.firstElementChild.getAttribute("data-seasonal-featured-link"),
    "",
    "Collections is the first thing in the menu"
  );
  assert.match(primary.firstElementChild.textContent, /Collections/);

  // And nothing else offers the same place under another name, in the shared
  // menu or in the copy of it that index.html still carries inline.
  assert.equal(primary.querySelector('[href="collections.html"]'), null);
  const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(
    !/href="collections\.html"/.test(indexHtml),
    "index.html still has its own Collections link"
  );
  assert.equal(document.querySelectorAll("[data-seasonal-featured-link]").length, 1);
  assert.ok(!MENU_SOURCE.includes("Seasonal Editions"), "the old name is retired");
});

test("every historical category link is preserved exactly", async () => {
  const dom = makeDom();
  dom.window.eval(MENU_SOURCE);
  await new Promise((r) => setTimeout(r, 50));

  const hrefs = [...dom.window.document.querySelectorAll(".menu-main-primary .menu-link")]
    .map((node) => node.getAttribute("href"));

  // These are indexed URLs. Losing or changing one would cost existing SEO.
  for (const category of [
    "standing-flowers", "artificial-flowers", "bouquets",
    "papan-bunga", "funerals", "parcels"
  ]) {
    assert.ok(
      hrefs.includes(`gallery.html?category=${category}`),
      `gallery.html?category=${category} still linked from the menu`
    );
  }
});

test("collections and seasonal editions are one entry, and it opens a list", async () => {
  const dom = makeDom();
  dom.window.eval(MENU_SOURCE);
  await new Promise((r) => setTimeout(r, 50));

  const seasonal = dom.window.document.querySelector('[data-menu-open="featured"]');
  assert.ok(seasonal, "seasonal entry still exists");
  // The attribute other modules key off must survive the rename.
  assert.ok(seasonal.hasAttribute("data-seasonal-featured-link"), "seasonal hook intact");
  assert.match(seasonal.textContent, /Collections/);
  assert.ok(
    seasonal.closest(".menu-main-primary"),
    "it leads the menu rather than sitting below the categories"
  );
  // It always opens the list of editions rather than jumping to one of them.
  // When a single edition was running, the entry used to rename itself to that
  // edition — so "Graduation Collection" stood in the menu as a sibling of
  // Services, and there was no way to ask for collections as a whole.
  assert.equal(seasonal.getAttribute("data-menu-quick"), "collections");
  assert.equal(seasonal.getAttribute("data-seasonal-direct-href"), null);
});

test("the menu is a list of places, not a second toolbar", async () => {
  const dom = makeDom();
  dom.window.eval(MENU_SOURCE);
  await new Promise((r) => setTimeout(r, 50));

  const panel = dom.window.document.getElementById("menu-panel");
  assert.ok(panel, "menu panel exists");

  // Search, the wishlist, the account and the bag are the masthead's, and the
  // right-hand panels'. The menu opens from the other side and does not
  // repeat them — the row of them needed a rule to separate it from the
  // navigation, which is the divider that went with it.
  assert.equal(panel.querySelector(".menu-main-utility"), null, "no utility row");
  assert.equal(panel.querySelector("[data-account-open]"), null, "no Join Marvell");
  assert.equal(panel.querySelector("[data-favorites-open]"), null, "no wishlist");
  assert.equal(panel.querySelector("[data-menu-bag-link]"), null, "no bag");
  assert.equal(panel.querySelector("[data-menu-search-link]"), null, "no search");

  // And the head is a close control, not the right-hand panels' icon row.
  assert.equal(panel.querySelector(".mv-panel-utility"), null);
  assert.ok(panel.querySelector(".menu-close"), "the close disc stays");
});

test("Contact Us is titled like the panel it is", async () => {
  const dom = makeDom();
  dom.window.eval(MENU_SOURCE);
  await new Promise((r) => setTimeout(r, 50));

  const view = dom.window.document.querySelector('[data-menu-view="contact"]');
  assert.ok(view, "contact view exists");
  const title = view.querySelector(".menu-contact-title");
  assert.ok(title, "contact view carries a heading");
  assert.match(title.textContent, /Contact Us/);

  // In the display face, light — the same head as "Welcome to Marvell".
  const menu = MENU_SOURCE.slice(MENU_SOURCE.indexOf(".menu-contact-title {"));
  assert.match(menu.slice(0, 400), /font-family: "AdelioDisplayCondensed"/);
  assert.match(menu.slice(0, 400), /font-weight: 300/);
});

test("the menu carries contact as well as the header", async () => {
  const dom = makeDom();
  dom.window.eval(MENU_SOURCE);
  await new Promise((r) => setTimeout(r, 50));

  const document = dom.window.document;
  assert.ok(document.querySelector('[data-menu-open="contact"]'), "Contact entry present");
  assert.ok(document.querySelector('[data-menu-open="services"]'), "Client services present");

  // The newsletter is an inline block in the footer now, never a menu trigger.
  assert.equal(document.querySelector("[data-newsletter-open]"), null);
});

test("the footer keeps its contact details and gains the commerce links", async () => {
  const dom = makeDom('<footer id="site-footer"></footer>');
  dom.window.eval(FOOTER_SOURCE);
  await new Promise((r) => setTimeout(r, 50));

  const footer = dom.window.document.querySelector("#site-footer");
  const html = footer.innerHTML;

  // WhatsApp consultation must be untouched.
  assert.match(html, /wa\.me\/6281275017456/, "WhatsApp number preserved");

  // hello@ is verified and is now the published inquiry address.
  assert.match(html, /hello@marvellflorist\.com/, "inquiry address published");
  assert.ok(
    !html.includes("floristmarvell@gmail.com"),
    "the old Gmail address has been retired from the footer"
  );
  // Newsletters send from info@; the footer must not invite replies there.
  assert.ok(!html.includes("info@marvellflorist.com"), "sending identity is not a contact address");

  // Featured leads; /shop is not a navigation concept.
  assert.ok(footer.querySelector("[data-featured-primary-link]"), "Featured linked");
  // Featured is the only Collections. The retail index that used to sit beside
  // it carried the same word and led somewhere else, which read as two places.
  assert.equal(footer.querySelector('[href="collections.html"]'), null);
  assert.equal(
    [...footer.querySelectorAll(".footer-link")].filter((node) => node.textContent.trim() === "Collections").length,
    1,
    "one Collections entry in the footer"
  );
  assert.equal(footer.querySelectorAll(".footer-col").length, 4, "Legal Notices is its own column");
  assert.ok(footer.querySelector(".footer-language-trigger"), "language choice sits at the footer bottom");
  // Closed is a class, not [hidden]: the list fades, and display:none cannot.
  const popover = footer.querySelector(".footer-language-popover");
  assert.ok(!popover.classList.contains("is-open"), "the language list starts closed");
  assert.ok(!popover.hasAttribute("hidden"), "closed is a class, so the list can fade");
  assert.ok(footer.querySelector(".footer-language-chevron"), "the trigger carries a chevron");

  // The newsletter is an inline block, not a link to a drawer.
  assert.equal(footer.querySelector("[data-newsletter-open]"), null);

  // The quote is gone.
  assert.equal(footer.querySelector(".footer-closing"), null, "closing quote removed");

  // Historical category links intact.
  for (const category of ["parcels", "bouquets", "standing-flowers", "papan-bunga", "artificial-flowers", "funerals"]) {
    assert.ok(
      footer.querySelector(`[data-gallery-category="${category}"]`),
      `footer still links ${category}`
    );
  }
});

test("The account has a quick panel and a full details page", async () => {
  // The header opens the quick panel; the account page hosts registration
  // for guests and personal details for signed-in people.
  const account = await readFile(new URL("assets/account.js", ROOT), "utf8");

  assert.match(account, /drawer\.className = "mv-panel mv-panel--account"/, "shares the panel chrome");
  assert.match(account, /role", "dialog"/);
  assert.match(account, /data-account-open/, "opened by delegation, from header and menu");

  // Registration and account details share the same page. Sign-in stays in
  // the panel so an existing customer can enter from anywhere on the site.
  const join = await readFile(new URL("account.html", ROOT), "utf8");
  assert.match(account, /const JOIN_PAGE = "\/account"/, "the panel links to it");
  assert.match(join, /data-join-step="register"/, "and it is where an account is made");
  assert.match(join, /data-details-panel="profile"/, "and signed-in details live there too");
  assert.ok(!/data-account-lookup/.test(join), "the page does not duplicate the panel");
  assert.ok(!/data-account-signin/.test(join), "and does not duplicate the sign-in form");

  // And no third surface. The page was called my-marvell.html before the
  // account took its own name; nothing may answer to either old spelling.
  await assert.rejects(readFile(new URL("join-marvell.html", ROOT), "utf8"), /ENOENT/);
  await assert.rejects(readFile(new URL("my-marvell.html", ROOT), "utf8"), /ENOENT/);
  const toml = await readFile(new URL("netlify.toml", ROOT), "utf8");
  assert.ok(!toml.includes("join-marvell"), "and no route to one");

  // It does the one account thing that works without a login, and offers it
  // as its own row rather than as a paragraph about guest checkout.
  assert.match(account, /MF-\\d\{6\}-\[A-Z0-9\]\{5\}/, "guest order lookup");
  assert.match(account, /id: "track",/, "track your order is offered without an account");

  // \b keeps "passwordless" out of this; that is the design, not a password.
  for (const mention of account.match(/[^.]*\bpassword\b[^.]*\./gi) || []) {
    assert.match(
      mention,
      /without a password|no password|not a password|rather than a password|tanpa kata sandi|kata sandi untuk diingat|password field here|none for anyone to steal/i,
      "a password is only ever promised away"
    );
  }
  assert.ok(!/type="password"/.test(account), "and no field ever collects one");
});

test("the signed-in panel is a menu of what belongs to the person", async () => {
  const account = await readFile(new URL("assets/account.js", ROOT), "utf8");
  const signedIn = account.slice(
    account.indexOf("function signedInMarkup"),
    account.indexOf("function signedOutMarkup")
  );

  // Four rows, in this order, and nothing else.
  const rows = [...signedIn.matchAll(/id: "([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(rows, ["profile", "orders", "wishlist", "preferences"]);
  assert.match(signedIn, /My profile/);
  assert.match(signedIn, /Personal information and saved details/);
  assert.match(signedIn, /Orders, receipts and status/);
  assert.match(signedIn, /Your saved arrangements/);
  assert.match(signedIn, /Newsletter and communication preferences/);
  assert.match(signedIn, /data-account-signout/);

  // Guest order tracking is not a principal item for somebody signed in. It
  // stays on the signed-out panel, which is where it is actually needed.
  assert.ok(!/trackBody\(\)/.test(signedIn), "track another order is not signed-in navigation");
  const signedOut = account.slice(account.indexOf("function signedOutMarkup"));
  assert.match(signedOut, /id: "track"/, "and guests can still track an order");

  // The account row uses the wishlist entry point, which routes filled lists
  // to the page and keeps only the empty state in a panel.
  assert.match(account, /window\.MarvellFavorites\?\.open\?\.\(\)/);
});

test("the account panel offers three choices, all of them closed", async () => {
  const account = await readFile(new URL("assets/account.js", ROOT), "utf8");

  // Three sections, one open at a time, and the open one may close again.
  assert.match(account, /class="account-sections"/);
  assert.match(account, /function sectionMarkup/);
  assert.match(account, /\/\*\* One section open at a time, and the open one may be closed again\. \*\//);
  for (const id of ["signin", "create", "track"]) {
    assert.match(account, new RegExp(`id: "${id}"`), `${id} section present`);
  }

  // Nothing is expanded when the panel arrives. A panel that opens with a
  // form already showing has chosen for the reader, and it is wrong two times
  // in three.
  assert.ok(!/open:\s*true/.test(account), "no section is open by default");
  assert.match(account, /aria-expanded="false"/, "sections render collapsed");
  assert.match(account, /collapseAll\(\);\n      state\.stage = "email";\n      state\.notFound = false;\n      state\.attemptedEmail = "";\n      Shop\?\.openPanel/,
    "reopening starts from nothing open, and from the first step");

  // The heading and its subtitle.
  assert.match(account, /t\("Welcome to Marvell"/);
  assert.match(account, /Sign in or create your account\./);

  // The display face is Adelio; the retired one appears nowhere.
  assert.match(account, /font-family: "AdelioDisplayCondensed"/);
  assert.ok(!/Relationship of Melodrame/.test(account));
});

test("the panel never decides for itself that somebody is signed in", async () => {
  const account = await readFile(new URL("assets/account.js", ROOT), "utf8");

  // Signed-in is only ever set from a server reply. There is no localStorage
  // flag, no query-string flag and no optimistic guess that would let a
  // tampered-with browser draw itself an account.
  assert.match(account, /function isSignedIn\(\) \{\s*return Boolean\(state\.signedIn && state\.user\);/);
  assert.match(account, /state\.signedIn = Boolean\(data\?\.signed_in && data\?\.user\)/);
  assert.ok(!/localStorage[^\n]*sign/i.test(account), "no session is remembered in the browser");
  assert.ok(!/type="password"/.test(account), "no credential is ever collected");

  // The session travels in an httpOnly cookie this file cannot read, so every
  // call has to say so explicitly.
  assert.match(account, /credentials: "same-origin"/);

  // The order lookup still needs both fields, and still needs no account.
  const lookup = account.slice(account.indexOf("function trackBody"));
  assert.match(lookup, /name="email"/);
  assert.match(lookup, /name="order"/);
  assert.match(lookup, /t\("Find order"/);
});

test("an order number alone is not enough to open an order", async () => {
  const account = await readFile(new URL("assets/account.js", ROOT), "utf8");
  const api = await readFile(new URL("netlify/functions/order-status.mjs", ROOT), "utf8");

  // The panel validates the reference and email, and a later email link
  // request handles guests without treating the email as a credential.
  assert.match(account, /if \(!EMAIL_PATTERN\.test\(email\)\)/);
  assert.match(account, /if \(!ORDER_PATTERN\.test\(order\)\)/);
  assert.ok(!/sessionStorage\.setItem\(LOOKUP_EMAIL_KEY, email\)/.test(account));
  assert.ok(!/order\/\$\{[^}]*\}\?email/.test(account), "the email never enters the URL");

  // And the server enforces it, rather than trusting the panel to.
  assert.match(api, /request\.method !== "POST"/);
  assert.match(api, /receiptTokenHash\(body\?\.receipt_token\)/);
  assert.match(api, /guest_receipt_tokens/);
  assert.match(api, /session\?\.user\?\.id === data\.customer_user_id/);
  assert.match(api, /return fail\("order_not_found", NOT_FOUND_MESSAGE, 404\);\n    \}/);
});

test("Join Marvell is available from the masthead", async () => {
  // It used to be listed in the menu as well. The menu is the left panel and
  // The account opens from the right, so carrying it in both places gave the
  // same control two homes and the menu a row of tools to hold it.
  const header = await readFile(new URL("assets/header-template.js", ROOT), "utf8");
  const menu = await readFile(new URL("assets/secondary-menu.js", ROOT), "utf8");
  assert.match(header, /ensureAccountEntry\(\)/);
  assert.ok(!/data-account-open/.test(menu), "and not from the menu as well");
});

test("the homepage menu joins the shared panel registry after it loads", async () => {
  const dom = makeDom();
  dom.window.eval(MENU_SOURCE);
  const registered = [];
  dom.window.MarvellShop = {
    registerPanel(name, panel) { registered.push({ name, panel }); },
    openPanel() {}
  };
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(registered.some(({ name, panel }) => name === "menu" && typeof panel.close === "function"));
});

test("customer information links survive later translation passes", async () => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body><main>
    <div class="legal-page">
      <div class="legal-intro"><h1></h1><p class="lead"></p></div>
      <div class="legal-content"></div>
      <aside class="legal-toc"><p class="legal-toc-label"></p><nav class="legal-toc-nav"></nav></aside>
    </div>
  </main></body></html>`, {
    url: "https://marvellflorist.com/faq.html?lang=en",
    runScripts: "outside-only"
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = (callback) => window.setTimeout(callback, 0);
  window.scrollTo = () => {};
  window.eval(LANGUAGE_SOURCE);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));

  const privacyLink = window.document.querySelector('.legal-suite-link[href*="privacy-policy"]');
  assert.ok(privacyLink, "the privacy page is linked from FAQ");
  window.MarvellLanguage.scheduleTranslationPass();
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.strictEqual(
    window.document.querySelector('.legal-suite-link[href*="privacy-policy"]'),
    privacyLink,
    "translation must not replace the link while someone is clicking it"
  );
  window.close();
});

test("every page that renders the footer also loads the newsletter script", async () => {
  // Otherwise the footer's Join Marvell link would be inert.
  const { readdir } = await import("node:fs/promises");
  const files = (await readdir(new URL(".", ROOT))).filter(
    (name) => name.endsWith(".html") && !name.startsWith("__")
  );

  const missing = [];
  for (const name of files) {
    const html = await readFile(new URL(name, ROOT), "utf8");
    if (!html.includes("shared-footer.js") && !html.includes("favorites.js")) continue;
    if (!html.includes("newsletter.js")) missing.push(name);
  }

  assert.deepEqual(missing, [], `pages missing newsletter.js: ${missing.join(", ")}`);
});

test("every page with the site shell also loads the bag", async () => {
  const { readdir } = await import("node:fs/promises");
  const files = (await readdir(new URL(".", ROOT))).filter(
    (name) => name.endsWith(".html") && !name.startsWith("__")
  );

  const missing = [];
  for (const name of files) {
    const html = await readFile(new URL(name, ROOT), "utf8");
    if (!html.includes("favorites.js")) continue;
    if (!html.includes("marvell-shop.js") || !html.includes("bag.js")) missing.push(name);
  }

  assert.deepEqual(missing, [], `pages missing the bag scripts: ${missing.join(", ")}`);
});

test("the wishlist is a page again, and the bag keeps its own Saved section", async () => {
  const favorites = await readFile(new URL("assets/favorites.js", ROOT), "utf8");

  // The panel is what saves a piece. If these disappeared, consultation
  // pieces would have lost their save-for-later, which is most of the
  // catalogue.
  assert.match(favorites, /marvell-favorites-v1/, "wishlist storage key intact");
  assert.match(favorites, /data-favorite-toggle/, "wishlist toggle hook intact");
  assert.match(favorites, /favorites-drawer/, "wishlist panel intact");

  // The bag keeps its Saved section: a piece still moves from saved to bought
  // without a second trip.
  const bagPage = await readFile(new URL("bag.html", ROOT), "utf8");
  assert.match(bagPage, /id="saved"/, "the bag page holds the saved pieces");
  assert.match(bagPage, /data-saved-list/, "and renders them");

  // And /wishlist is a real page once more, served rather than redirected.
  const wishlistPage = await readFile(new URL("wishlist.html", ROOT), "utf8");
  assert.ok(!/\/bag\.html#saved/.test(wishlistPage), "it no longer forwards to the bag");
  assert.match(wishlistPage, /data-wl-view="index"/, "it lists a customer's wishlists");
  assert.match(wishlistPage, /data-wl-view="detail"/, "and opens one of them");
  assert.match(wishlistPage, /assets\/wishlist-page\.js/, "and loads its own script");

  const netlify = await readFile(new URL("netlify.toml", ROOT), "utf8");
  assert.match(netlify, /from = "\/wishlist"\s+to = "\/wishlist\.html"\s+status = 200/,
    "the pretty address is served, not bounced");

  // The panel and the account both point at it, so there is one way in.
  assert.match(favorites, /function wishlistPageHref\(\) \{\n    return localizedHref\("\/wishlist"\);/);
  // The account page carries the wishlist itself now, as a tab beside the
  // orders and the details, rather than sending the customer off the page.
  // The standalone page above stays for signed-out visitors and shared links.
  const account = await readFile(new URL("account.html", ROOT), "utf8");
  assert.match(account, /data-details-tab="wishlist"/, "the account has a wishlist tab");
  assert.match(account, /data-details-panel="wishlist"/, "and a panel for it");
  assert.match(account, /id="wishlist-main"/, "which holds the same room the page does");
  assert.match(account, /assets\/wishlist-page\.js/, "driven by the same script");
  assert.ok(!/<a href="\/wishlist">My wishlist<\/a>/.test(account),
    "and no longer a link off the page");
});

test("the header heart opens a stable panel when the wishlist is empty", async () => {
  const dom = makeDom();
  const { window } = dom;
  // The panel's chrome and its utility row come from marvell-shop.js, which
  // every page carrying the wishlist also loads.
  window.eval(SHOP_SOURCE);
  window.eval(FAVORITES_SOURCE);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  const heart = window.document.querySelector(".favorites-launcher-btn");
  assert.ok(heart, "header heart is present");
  heart.click();

  const drawer = window.document.getElementById("favorites-drawer");
  assert.ok(drawer?.classList.contains("is-open"), "wishlist panel opens");
  assert.equal(heart.getAttribute("aria-expanded"), "true");
  assert.equal(window.location.pathname, "/gallery", "the current page stays open");

  const closeButton = drawer.querySelector("[data-panel-close]");
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.strictEqual(drawer.querySelector("[data-panel-close]"), closeButton,
    "refreshes do not replace the focused panel controls");
  closeButton.click();
  assert.equal(heart.getAttribute("aria-expanded"), "false");
});

// ------------------------------------------- one menu, not one per page -----

/**
 * assets/secondary-menu.js is the menu. It writes its own stylesheet and its
 * own markup into whatever `#menu-panel` it finds, on every page.
 *
 * The home page used to keep a second copy of both in its own <style> and its
 * own body — and that copy had drifted: Collections opened a whole view rather
 * than the second panel beside it, and the second panel still carried the
 * 42px nudge the shared script had already replaced with a full-width slide.
 * The shared rules are all !important, so the stale copy lost every argument
 * it picked and only ever showed up as a page that was harder to change. It
 * is not there any more, and it may not come back.
 */
test("no page keeps a second copy of the shared menu's stylesheet", async () => {
  const pages = [
    "index.html", "about.html", "contact.html", "faq.html", "services.html", "journals.html",
    "gallery.html", "featured.html", "wishlist.html", "product.html", "bag.html",
    "checkout.html", "account.html", "order.html", "privacy-policy.html", "terms-conditions.html"
  ];
  // What the shared script owns. `.menu-toggle` is the header's, not the
  // menu's — assets/header-template.js styles it and pages may add to it.
  const owned = /^\.(menu-panel|menu-backdrop|menu-head|menu-close|menu-body|menu-view|menu-main-|menu-quick-|menu-link|menu-back|menu-subtitle)|^\[data-menu-|^\[data-featured-menu-list\]/;

  for (const page of pages) {
    const html = await readFile(new URL(page, ROOT), "utf8");
    const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join("\n");
    // Selectors run across lines, so a rule's prelude is everything between
    // the end of the last block and the brace that opens this one.
    for (const match of styles.matchAll(/(^|[{}])([^{}]*)\{/gm)) {
      const prelude = match[2].replace(/\/\*[\s\S]*?\*\//g, "").trim();
      if (!prelude || prelude.startsWith("@")) continue;
      const selectors = prelude.split(",").map((one) => one.trim()).filter(Boolean);
      // A rule that reaches menu rows among a page's own controls is the
      // page's. A rule that is only about the menu is the shared script's.
      if (selectors.length && selectors.every((one) => owned.test(one))) {
        assert.fail(`${page} styles the shared menu itself: ${prelude.replace(/\s+/g, " ")}`);
      }
    }
  }
});

test("a page hands the menu an empty panel and lets the shared script fill it", async () => {
  for (const page of ["index.html", "gallery.html", "product.html"]) {
    const html = await readFile(new URL(page, ROOT), "utf8");
    const panel = html.match(/<aside[^>]*id="menu-panel"[^>]*>([\s\S]*?)<\/aside>/);
    assert.ok(panel, `${page} no longer offers a panel for the menu to fill`);
    assert.equal(panel[1].trim(), "", `${page} still writes its own menu instead of leaving it to secondary-menu.js`);
  }
});

test("the menu is loaded after the panel registry it joins", async () => {
  const pages = ["index.html", "about.html", "faq.html", "privacy-policy.html", "terms-conditions.html"];
  for (const page of pages) {
    const html = await readFile(new URL(page, ROOT), "utf8");
    // The script tags, not the comments that name the same files.
    const tag = (file) => html.search(new RegExp(`<script[^>]*src="[^"]*${file.replace(".", "\\.")}`));
    const shop = tag("marvell-shop.js");
    const menu = tag("secondary-menu.js");
    if (shop === -1 || menu === -1) continue;
    assert.ok(shop < menu, `${page} opens the menu before marvell-shop.js can register it`);
  }
});

// ------------------------------------------------ the menu on a phone --------

/** makeDom, with matchMedia answering as a phone or as a desktop. */
function makeMenuDom(isPhone) {
  const dom = makeDom();
  dom.window.matchMedia = (query) => ({
    media: query,
    // The menu asks two questions: min-width 769px for desktop, max-width
    // 768px for the phone. One answer, two ways round.
    matches: /min-width:\s*769px/.test(query) ? !isPhone : isPhone,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    onchange: null, dispatchEvent() { return false; }
  });
  dom.window.eval(MENU_SOURCE);
  return dom;
}

/**
 * Contact Us is the last step into the menu, so on a phone it stays in it.
 *
 * It used to hand off to the right-hand contact panel on every screen. On a
 * phone that panel is a sheet from the bottom, so the menu dropped away and
 * another surface climbed over it — two moves in opposite directions to walk
 * one step further into the same menu. The menu's own contact view, and its
 * phone layout, were already written.
 */
test("Contact Us stays inside the menu on a phone", async () => {
  const dom = makeMenuDom(true);
  const { window, window: { document } } = dom;
  await new Promise((r) => setTimeout(r, 50));

  let handedOff = false;
  window.MarvellContact = { open: () => { handedOff = true; } };

  document.querySelector(".menu-toggle").click();
  document.querySelector(".menu-link-contact").click();

  assert.equal(handedOff, false, "the separate contact panel is not opened");
  assert.equal(
    document.getElementById("menu-panel").getAttribute("data-menu-current"),
    "contact",
    "the menu steps into its own contact view"
  );
  const view = document.querySelector('.menu-view[data-menu-view="contact"]');
  assert.equal(view.getAttribute("aria-hidden"), "false");
  assert.ok(view.querySelector("[data-menu-back]"), "and there is a way back");
});

test("Contact Us still opens the side panel on desktop", async () => {
  const dom = makeMenuDom(false);
  const { window, window: { document } } = dom;
  await new Promise((r) => setTimeout(r, 50));

  let handedOff = false;
  window.MarvellContact = { open: () => { handedOff = true; } };

  document.querySelector(".menu-toggle").click();
  document.querySelector(".menu-link-contact").click();

  assert.equal(handedOff, true, "the panel beside the menu is still the desktop answer");
});

/**
 * A view on a phone is the second panel: it is the whole screen changing, so
 * it travels a whole width, on the second panel's easing, without a fade.
 * Desktop keeps the 18px nudge and the cross-fade, because there a view is a
 * part of a wide panel rather than the place you are standing.
 */
test("a phone slides a whole width between menu views, and does not fade", async () => {
  const dom = makeMenuDom(true);
  const { window: { document } } = dom;
  await new Promise((r) => setTimeout(r, 50));

  document.querySelector(".menu-toggle").click();
  document.querySelector('[data-menu-open="services"]').click();

  const main = document.querySelector('.menu-view[data-menu-view="main"]');
  const services = document.querySelector('.menu-view[data-menu-view="services"]');
  assert.equal(main.style.transform, "translateX(-100%)", "the list leaves to the left, all the way");
  assert.equal(services.style.transform, "translateX(0)");
  assert.equal(main.style.opacity, "1", "and stays visible while it travels");

  // The rule that times it is the second panel's, to the millisecond.
  assert.match(
    MENU_SOURCE,
    /\.menu-view \{[^}]*transition: transform 0\.52s cubic-bezier\(0\.22, 1, 0\.36, 1\) !important/,
    "the phone view carries the second panel's travel"
  );
  assert.match(MENU_SOURCE, /\.menu-main-quickpane \{[^}]*transform 0\.52s cubic-bezier\(0\.22, 1, 0\.36, 1\)/,
    "which is the same figure the second panel uses");
});

test("desktop keeps the short nudge between menu views", async () => {
  const dom = makeMenuDom(false);
  const { window: { document } } = dom;
  await new Promise((r) => setTimeout(r, 50));

  document.querySelector(".menu-toggle").click();
  // Featured has no quick pane of its own to open, so it is a view on desktop.
  document.querySelector('[data-menu-open="featured"]').removeAttribute("data-menu-quick");
  document.querySelector('[data-menu-open="featured"]').click();

  const main = document.querySelector('.menu-view[data-menu-view="main"]');
  assert.equal(main.style.transform, "translateX(-18px)");
  assert.equal(main.style.opacity, "0", "desktop cross-fades instead");
});

test("every menu view can scroll on a phone, not just Menu and Contact Us", () => {
  const phoneBlock = MENU_SOURCE.slice(MENU_SOURCE.indexOf('body[data-menu-mobile-standardized="index"] .menu-panel .menu-view {'));
  const rule = phoneBlock.slice(0, phoneBlock.indexOf("}"));
  assert.match(rule, /overflow-y: auto !important/,
    "a list longer than the screen was cut off with no way to reach the rest");
  assert.match(rule, /overscroll-behavior: contain/);
});

// -------------------------------------------- the reviews, in full ----------

const HOME_SOURCE = await readFile(new URL("assets/home.js", ROOT), "utf8");

/**
 * The reviews carousel measured its tallest review, applied that as a fixed
 * `height` to every card, clipped what did not fit with `overflow: hidden`,
 * and then dropped sentences off the end until what was left cleared the line
 * — which meant the tallest review, the one the height was measured from, was
 * the one thing guaranteed to end in "...". The phone clamped every review to
 * two lines on top of that. Somebody wrote those reviews; they are shown.
 */
test("a review is shown whole, not cut to a measured height", async () => {
  const html = await readFile(new URL("index.html", ROOT), "utf8");
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join("\n");

  // The measured height is a floor for the row, never a ceiling on a card.
  assert.ok(
    !/\n\s*height: var\(--reviews-(card|slide)-min-height/.test(styles),
    "the measured review height is applied as `height`, which caps the card"
  );
  assert.match(styles, /min-height: var\(--reviews-card-min-height/, "the row is still even");

  const cardRule = styles.slice(styles.indexOf("\n.review-card {"));
  assert.ok(
    !/overflow: hidden/.test(cardRule.slice(0, cardRule.indexOf("}"))),
    "a review card still clips its own text"
  );
  // And the phone does not clamp the review to two lines either. (The search
  // dropdown still clamps product TITLES to two lines, which is a tile in a
  // grid rather than somebody's sentence — that one stays.)
  for (const match of styles.matchAll(/\.review-text[^{]*\{([^}]*)\}/g)) {
    assert.ok(!/line-clamp/.test(match[1]), "a review is still clamped to a line count");
  }
});

test("the review text is never truncated in script either", () => {
  assert.ok(!/splitReviewTextIntoSentences/.test(HOME_SOURCE),
    "the sentence-dropping truncation is still there");
  assert.ok(!/\.\.\.`|suffix = truncated/.test(HOME_SOURCE),
    "something still appends an ellipsis to a review");
  assert.match(HOME_SOURCE, /setReviewTextMarkup\(textElement, fullText\)/,
    "fitReviewCardText renders the whole review");
});

// --------------------------- mobile chrome, on every page not just home -----

/**
 * Two mobile treatments existed only on the home page, written into its own
 * <style>: the strips that paint behind the notch and the home bar, and the
 * smaller WhatsApp button lifted clear of the bottom of the screen. Both are
 * in the shared scripts now — a phone with a notch is not a home-page-only
 * phone, and assets/newsletter.js already assumed the button moved up.
 */
test("the safe-area strips are the shared header's, on every page", async () => {
  const header = await readFile(new URL("assets/header-template.js", ROOT), "utf8");
  assert.match(header, /ensureSafeAreaFills\(\)/, "the header builds them");
  assert.match(header, /\.mobile-safe-area-fill--top \{[^}]*env\(safe-area-inset-top/, "and styles them");
  assert.match(header, /\.mobile-safe-area-fill--bottom \{[^}]*env\(safe-area-inset-bottom/);
  // And they stay out of the way everywhere else. The strips are created on
  // every page at every width, so without this they would be two empty blocks
  // at the top of every desktop body, in a layout they have nothing to do with.
  const base = header.slice(0, header.indexOf("@media (max-width: 768px)"));
  const at = base.lastIndexOf(".mobile-safe-area-fill {");
  assert.notEqual(at, -1, "the strips are not hidden outside the phone block");
  assert.match(base.slice(at, base.indexOf("}", at)), /display: none !important/);
  // No page may keep its own copy, or the two sets of strips would stack.
  for (const page of ["index.html", "about.html", "gallery.html", "product.html"]) {
    const html = await readFile(new URL(page, ROOT), "utf8");
    const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join("\n");
    assert.ok(!/\.mobile-safe-area-fill/.test(styles), `${page} styles the safe-area strips itself`);
  }
});

test("the WhatsApp button is lifted on a phone everywhere, not only at home", async () => {
  const footer = await readFile(new URL("assets/shared-footer.js", ROOT), "utf8");
  const mobile = footer.slice(footer.indexOf("@media (max-width: 768px)"));
  assert.match(mobile, /\.floating-whatsapp-btn \{[^}]*env\(safe-area-inset-bottom/,
    "the shared footer lifts the button clear of the home bar");
  assert.match(mobile, /\.floating-whatsapp-btn \{[^}]*width: 52px/);
  for (const page of ["index.html", "gallery.html", "product.html"]) {
    const html = await readFile(new URL(page, ROOT), "utf8");
    const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join("\n");
    assert.ok(!/\.floating-whatsapp-btn/.test(styles), `${page} sizes the WhatsApp button itself`);
  }
});

test("the WhatsApp icon cannot flash unstyled while a page is parsing", async () => {
  const footer = await readFile(new URL("assets/shared-footer.js", ROOT), "utf8");
  assert.match(footer, /<svg viewBox="0 0 32 32" width="26" height="26"/,
    "the shared icon has intrinsic dimensions even before CSS is considered");
  for (const page of ["index.html", "featured.html"]) {
    const html = await readFile(new URL(page, ROOT), "utf8");
    assert.ok(!/class="floating-whatsapp-btn/.test(html),
      `${page} leaves creation to the already-styled shared footer`);
  }
});

test("a page hands the contact panel over empty too", async () => {
  const html = await readFile(new URL("index.html", ROOT), "utf8");
  const panel = html.match(/<aside[^>]*id="contact-quick-panel"[^>]*>([\s\S]*?)<\/aside>/);
  assert.ok(panel, "the home page still offers a panel for shared-contact.js to fill");
  assert.equal(panel[1].trim(), "", "and leaves its contents to that script");
});

test("no stylesheet hides mobile rules behind a query no screen can match", async () => {
  for (const page of ["index.html", "about.html", "gallery.html", "product.html", "featured.html"]) {
    const html = await readFile(new URL(page, ROOT), "utf8");
    const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join("\n");
    for (const match of styles.matchAll(/@media([^{]*)\{/g)) {
      const query = match[1];
      const min = /min-width:\s*(\d+)px/.exec(query);
      const max = /max-width:\s*(\d+)px/.exec(query);
      // `and`, not a comma: a comma is two queries, either of which can match.
      if (!min || !max || /,/.test(query)) continue;
      assert.ok(
        Number(min[1]) <= Number(max[1]),
        `${page} has 209 lines of CSS behind @media${query.trim()}, which nothing can satisfy`
      );
    }
  }
});

test("an underlined link draws its own rule, so leaving can retrace it", async () => {
  // The house hover is a rule that arrives from the left and, on leaving,
  // retreats the way it came. Links that carried no underline at rest had it
  // already (the menu, the footer); links underlined at rest did not, and
  // merely dimmed — which left the reviews CTA, the wishlist and the legal
  // pages with no motion at all.
  const shop = await readFile(new URL("assets/marvell-shop.js", ROOT), "utf8");
  assert.match(shop, /@keyframes mv-underline-retrace/, "the effect is defined once");
  // Out to the right, then back in from the left. A transition cannot turn
  // round mid-flight and change its origin, which is why this is a keyframe.
  assert.match(shop, /mv-underline-retrace \{[\s\S]*?transform-origin: right center;[\s\S]*?transform-origin: left center;/);

  // The rule is the width of the words, not of the box: a link is often a
  // block much wider than its text, where a full-width rule reads as a
  // divider rather than an underline.
  assert.match(shop, /\.mv-underline::after \{[\s\S]*?width: var\(--mv-underline-w, 100%\);/);

  // And the elements are found rather than listed, so the next underlined
  // link added to the site is not flat again.
  assert.match(shop, /function adoptUnderlines/);
  assert.match(shop, /adoptUnderlines,/, "and exposed, for contents drawn after the sweep");

  // Three things it must not do, each of which drew a rule across a picture
  // or across a whole card the first time round.
  assert.match(shop, /function underlineFits[\s\S]*?node\.textContent\.trim\(\)/,
    "an anchor with no words is still an anchor, and the UA underlines it");
  assert.match(shop, /function underlineFits[\s\S]*?img, svg, picture, video, canvas, figure/,
    "a link around a photograph gets no rule");
  assert.match(shop, /function underlineFits[\s\S]*?text\.height <= Math\.max\(line, size\) \* 1\.6/,
    "a link whose text wraps keeps its own underline");
  assert.match(shop, /styles\.position !== "static" && styles\.position !== "relative"/,
    "and a positioned element is never moved onto its own coordinates");

  // The reviews CTA is the one place this is asked for by hand, because the
  // sweep cannot know the section is the point of the exercise.
  const home = await readFile(new URL("index.html", ROOT), "utf8");
  assert.match(home, /class="reviews-cta mv-underline"/);
  assert.ok(!/\.reviews-cta \{[^}]*text-decoration: underline/.test(home),
    "the CTA still paints a static underline of its own");
});

test("a quick panel never borrows the page's own <header> styling", async () => {
  // The wishlist panel's title bar was a <header>. The home page styles the
  // bare element — position:fixed, height:72px, pointer-events:none — so the
  // panel's title was lifted out of the flow and drawn over the first saved
  // piece, and the list below it started at the top of the panel.
  const favorites = await readFile(new URL("assets/favorites.js", ROOT), "utf8");
  assert.ok(!/<header|<footer/.test(favorites), "panel markup uses a bare header or footer again");
  assert.match(favorites, /<div class="wishlist-panel-head">/);
});
