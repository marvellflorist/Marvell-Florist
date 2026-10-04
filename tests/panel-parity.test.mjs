/**
 * Panel parity.
 *
 * The quick panels — the wishlist and the account — are meant to be the
 * navigation menu's quick panel, opening from the other side. These tests read
 * the actual CSS out of assets/secondary-menu.js and assets/marvell-shop.js
 * and compare the declarations that carry the look, so they cannot quietly
 * drift. The bag is deliberately not one of them: it is a page.
 *
 * Header-icon tests do the same against assets/header-template.js, which owns
 * how .search-toggle and .menu-toggle are sized, coloured and eased.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const ROOT = new URL("../", import.meta.url);
const MENU = await readFile(new URL("assets/secondary-menu.js", ROOT), "utf8");
const SHOP = await readFile(new URL("assets/marvell-shop.js", ROOT), "utf8");
const BAG = await readFile(new URL("assets/bag.js", ROOT), "utf8");
const NEWSLETTER = await readFile(new URL("assets/newsletter.js", ROOT), "utf8");
const ACCOUNT = await readFile(new URL("assets/account.js", ROOT), "utf8");
const HEADER = await readFile(new URL("assets/header-template.js", ROOT), "utf8");

/** Pulls one declaration block out of a CSS string by selector. */
function block(source, selector) {
  const index = source.indexOf(selector);
  assert.notEqual(index, -1, `selector not found: ${selector}`);
  const open = source.indexOf("{", index);
  const close = source.indexOf("}", open);
  return source.slice(open + 1, close);
}

/** Reads a single property's value out of a block. */
function prop(source, selector, property) {
  const body = block(source, selector);
  const match = body.match(new RegExp(`(?:^|[;\\s])${property}\\s*:\\s*([^;]+)`, "m"));
  assert.ok(match, `${property} not found in ${selector}`);
  return match[1].replace(/\s*!important\s*$/, "").trim();
}

// ------------------------------------------------------------ the panel ----

test("drawer backdrop matches the menu backdrop", () => {
  for (const property of ["background", "backdrop-filter", "transition"]) {
    assert.equal(
      prop(SHOP, ".mv-backdrop {", property),
      prop(MENU, ".menu-backdrop {", property),
      `${property} differs from .menu-backdrop`
    );
  }
});

test("drawer panel matches the menu panel's ground and border", () => {
  // The ground is a token now, but its default is still the menu's.
  assert.equal(
    prop(SHOP, ".mv-panel {", "--mv-panel-ground"),
    prop(MENU, ".menu-panel {", "background"),
    "by default a drawer stands on the same ground as the menu"
  );
  assert.equal(prop(SHOP, ".mv-panel {", "background"), "var(--mv-panel-ground)");
  assert.equal(prop(SHOP, ".mv-panel {", "color"), prop(MENU, ".menu-panel {", "color"));

  // Both draw the same hairline between panel and page; only the edge differs,
  // because the menu comes from the left and these come from the right.
  assert.match(prop(MENU, ".menu-panel {", "border-right"), /1px solid rgba\(29, 26, 24, 0\.08\)/);
  assert.match(prop(SHOP, ".mv-panel {", "border-left"), /1px solid rgba\(29, 26, 24, 0\.08\)/);
});

test("drawer panel travels for the same duration as the menu", () => {
  // The menu also animates width; only the transform timing must agree.
  const menuTransform = prop(MENU, ".menu-panel {", "transition").split(",")[0].trim();
  const drawerTransform = prop(SHOP, ".mv-panel {", "transition").split(",")[0].trim();
  assert.equal(drawerTransform, menuTransform);
  assert.match(drawerTransform, /transform 0\.5s ease-in-out/);
});

test("drawer panel width matches the menu panel width", () => {
  assert.match(prop(MENU, ".menu-panel {", "--menu-panel-single-width"), /min\(92vw, var\(--menu-panel-base-width\)\)/);
  assert.match(prop(MENU, ".menu-panel {", "--menu-panel-base-width"), /500px/);
  assert.equal(prop(SHOP, ".mv-panel {", "--mv-panel-width"), "min(92vw, 500px)");
});

test("drawer close button is the menu's close disc", () => {
  for (const property of ["width", "height", "border-radius", "background", "color", "font-size", "font-weight"]) {
    assert.equal(
      prop(SHOP, ".mv-panel-close {", property),
      prop(MENU, ".menu-close {", property),
      `close button ${property} differs`
    );
  }
});

test("drawer type scale is taken from the menu's links", () => {
  // Item names match .menu-quick-link exactly.
  for (const property of ["font-family", "font-size", "font-weight", "line-height", "color"]) {
    assert.equal(
      prop(SHOP, ".mv-item-name {", property),
      prop(MENU, ".menu-quick-link {", property),
      `item name ${property} differs from .menu-quick-link`
    );
  }
  // Titles match the primary .menu-link scale.
  const MENU_LINK = ".menu-link,\n      .menu-link-button {";
  assert.equal(prop(SHOP, ".mv-title {", "font-size"), prop(MENU, MENU_LINK, "font-size"));
  assert.equal(prop(SHOP, ".mv-title {", "font-weight"), prop(MENU, MENU_LINK, "font-weight"));
  // Eyebrows match the .menu-back label style.
  assert.equal(prop(SHOP, ".mv-eyebrow {", "font-size"), prop(MENU, ".menu-back {", "font-size"));
  assert.equal(prop(SHOP, ".mv-eyebrow {", "letter-spacing"), prop(MENU, ".menu-back {", "letter-spacing"));
  assert.equal(prop(SHOP, ".mv-eyebrow {", "text-transform"), prop(MENU, ".menu-back {", "text-transform"));
});

test("the drawers carry the menu's chevron affordance", () => {
  assert.match(block(SHOP, ".mv-item-name a::after {"), /content:\s*"›"/);
  assert.match(block(MENU, ".menu-quick-link::after {"), /content:\s*"›"/);
});

test("the bag is a page, and the panel only covers what a page cannot", () => {
  // The bag used to be a drawer as well as a page, and two implementations of
  // one thing is how a header icon and a URL come to disagree about what is in
  // it. The panel that exists now is not a second bag: it holds no lines, no
  // quantities and no totals. It says the bag is empty, or says what just went
  // in, and every other click is a real link to /bag.
  assert.ok(!/\.bag-list\b/.test(BAG), "the bag page renders its own lines");
  assert.ok(!/formatIdr/.test(BAG), "the panel never prices anything");
  assert.match(BAG, /<a class="bag-launcher-btn" href="\$\{escapeHtml\(BAG_PAGE\)\}"/);
  assert.match(BAG, /const BAG_PAGE = Shop\.BAG_PAGE \|\| "\/bag/, "one spelling of the route");

  // One rule decides between the page and the panel, in one place.
  assert.match(BAG, /function openBag\(\)/);
  assert.match(BAG, /if \(Bag\.count\(\) > 0\)[\s\S]{0,120}window\.location\.href = BAG_PAGE/);

  // And it is a .mv-panel like the rest of them, not chrome of its own.
  assert.match(BAG, /panel\.className = "mv-panel mv-panel--bag mv-panel--with-foot"/);
  assert.ok(!/\.bag-drawer\s*\{/.test(BAG), "no bag drawer of its own");
  assert.ok(!/bag-toast/.test(BAG), "the toast is gone; the panel says it instead");
});

test("every right-hand panel is registered, and connected to the others", () => {
  // The cross-fade is only possible when the registry can reach the departing
  // panel's element. A panel that registers without one closes outright, and
  // the surface blinks.
  const FAVORITES = readFileSync(new URL("assets/favorites.js", ROOT), "utf8");
  const CONTACT = readFileSync(new URL("assets/shared-contact.js", ROOT), "utf8");

  const sources = {
    wishlist: FAVORITES,
    account: ACCOUNT,
    contact: CONTACT,
    bag: BAG
  };
  for (const [name, source] of Object.entries(sources)) {
    assert.match(
      source,
      new RegExp(`registerPanel\\?\\.\\("${name}",\\s*\\{[\\s\\S]{0,160}element:`),
      `${name} must register its element so the panels can cross-fade`
    );
  }

  // The registry has to know they belong together.
  assert.match(SHOP, /const rightPanels = new Set\(\["wishlist", "account", "contact", "bag"\]\)/);

  // And there is one backdrop, owned by the registry.
  for (const [name, source] of Object.entries(sources)) {
    assert.ok(
      !/(backdrop|Backdrop)\s*=\s*document\.createElement/.test(source),
      `${name} must stand on the shared backdrop, not make one`
    );
  }
});

test("the panel checkout button is the gallery's Apply Filters button", () => {
  // The site has one "and now do it" control. A panel that ends in a decision
  // uses it rather than inventing a second black rectangle.
  const gallery = readFileSync(new URL("gallery.html", ROOT), "utf8");
  for (const property of ["background", "color", "font-size", "letter-spacing", "min-height"]) {
    assert.equal(
      prop(SHOP, ".mv-cta--apply {", property),
      prop(gallery, ".filters-apply {", property),
      `apply button ${property} differs from .filters-apply`
    );
  }
});

test("the gallery filter sheet restores the blurred backdrop", () => {
  const gallery = readFileSync(new URL("gallery.html", ROOT), "utf8");
  const backdrop = block(gallery, ".contact-quick-backdrop {");
  assert.match(backdrop, /backdrop-filter:\s*blur\(10px\)/);
  assert.match(backdrop, /-webkit-backdrop-filter:\s*blur\(10px\)/);
  assert.match(gallery, /const backdrop = getGalleryPanelBackdrop\(\);[\s\S]{0,220}backdrop\.classList\.toggle\("is-open", isOpen\)/);
  assert.match(gallery, /closeGalleryPanelsFromBackdrop[\s\S]{0,260}setFiltersOpen\(false\)/);
});

test("the account panel uses the shared chrome rather than its own", () => {
  assert.match(ACCOUNT, /Shop\?\.injectPanelStyles\?\.\(\)/, "account panel uses the shared panel");
  assert.match(ACCOUNT, /drawer\.className = "mv-panel mv-panel--account"/);
  assert.match(ACCOUNT, /Shop\?\.ensureBackdrop\?\.\(\)/, "and the registry's backdrop");
});

test("the panels become bottom sheets on mobile, like the menu", () => {
  const mobile = SHOP.slice(SHOP.indexOf("@media (max-width: 768px)"));
  assert.match(mobile, /transform: translateY\(100%\)/);
  assert.match(mobile, /width: 100vw/);
});

// ----------------------------------------------------------- the icon ------

test("the bag icon is the Lucide shopping-bag", () => {
  // Lucide's shopping-bag, verbatim.
  assert.match(BAG, /M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z/);
  assert.match(BAG, /M3 6h18/);
  assert.match(BAG, /M16 10a4 4 0 0 1-8 0/);
  assert.match(BAG, /viewBox="0 0 24 24"/);
});

test("the bag icon is drawn like the other header icons", () => {
  const bag = block(BAG, ".bag-launcher-btn svg {");
  const search = block(HEADER, ".search-toggle svg {");

  for (const property of ["width", "height", "stroke", "fill", "stroke-width", "stroke-linecap", "stroke-linejoin"]) {
    const bagValue = bag.match(new RegExp(`${property}\\s*:\\s*([^;]+)`))[1].replace(/\s*!important\s*$/, "").trim();
    const searchValue = search.match(new RegExp(`${property}\\s*:\\s*([^;]+)`))[1].replace(/\s*!important\s*$/, "").trim();
    assert.equal(bagValue, searchValue, `svg ${property} differs from .search-toggle`);
  }
});

test("the bag colour behaves exactly like the other header icons", () => {
  // Same resting colour as .header-contact / .search-toggle / .menu-toggle.
  assert.equal(prop(BAG, ".bag-launcher-btn {", "color"), "rgba(42, 33, 24, 0.82)");
  assert.equal(
    prop(HEADER, '.header-contact,\n      .contact-quick-trigger,\n      .search-toggle,', "color"),
    "rgba(42, 33, 24, 0.82)",
    "header baseline colour changed; the bag must follow"
  );

  // Same easing as .search-toggle, so it cross-fades in step.
  assert.equal(
    prop(BAG, ".bag-launcher-btn {", "transition"),
    prop(HEADER, ".search-toggle {", "transition")
  );

  // Same pale colour over a hero image.
  assert.match(BAG, /body\.desktop-header-hero-mode \.bag-launcher-btn \{\s*color: rgba\(242, 236, 224, 0\.96\)/);

  // The icon inherits, so a colour change reaches the glyph and the count.
  assert.equal(prop(BAG, ".bag-launcher-btn svg {", "stroke"), "currentColor");
  assert.equal(prop(BAG, ".bag-launcher-count {", "color"), "currentColor");
});

test("the bag sits at the end of the icon cluster", () => {
  // Desktop order: menu, search, wishlist, account, contact, bag.
  // Anchor past the grouped font rule that also names these selectors.
  const MENU_TOGGLE = HEADER.indexOf(".menu-toggle {", HEADER.indexOf(".header-contact,\n      .contact-quick-trigger {"));
  assert.equal(prop(HEADER.slice(MENU_TOGGLE), ".menu-toggle {", "order"), "1");
  assert.equal(prop(HEADER, ".search-toggle {\n        display: inline-flex", "order"), "2");
  assert.match(HEADER, /\.header-bar \.header-account \{ order: 4 !important; \}/);
  assert.match(HEADER, /\.header-bar \.contact-quick-trigger \{ display: inline-flex !important; \}/);
  assert.equal(prop(BAG, ".bag-launcher {", "order"), "6");

  // It must not claim the auto margin that positions the right cluster.
  assert.equal(prop(BAG, ".bag-launcher {", "margin-left"), "0");
});

test("the bag joins the wishlist in the mobile action cluster", () => {
  const mobile = BAG.slice(BAG.indexOf("@media (max-width: 768px)"));
  assert.match(mobile, /\.bag-launcher \{ order: 3; \}/);
});

test("the bag is inserted after the wishlist heart in the DOM", async () => {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
       <header><div class="header-bar">
         <button class="menu-toggle"></button>
         <a class="search-toggle"></a>
         <div class="favorites-launcher"><button class="favorites-launcher-btn"></button></div>
         <a class="header-contact"></a>
       </div></header>
     </body></html>`,
    { url: "https://marvellflorist.com/shop", runScripts: "outside-only" }
  );
  const { window } = dom;
  window.fetch = async () => { throw new Error("offline"); };
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

  window.eval(SHOP);
  window.eval(BAG);
  await new Promise((r) => setTimeout(r, 30));

  const heart = window.document.querySelector(".favorites-launcher");
  const bag = window.document.querySelector(".bag-launcher");

  assert.ok(bag, "bag launcher was created");
  assert.equal(
    heart.nextElementSibling,
    bag,
    "the bag must follow the heart, so the mobile order tie resolves correctly"
  );
});

test("the mailing list is a form, not a panel", () => {
  // Signing up for a mailing list is one field and one button. It was the only
  // thing in the panel family that was not a place you could be.
  // It may still *look* for an open panel — the invitation must never appear
  // over one — but it must not be built as one.
  assert.ok(!/mv-panel--newsletter|className = "mv-panel|class="mv-panel/.test(NEWSLETTER), "no panel chrome");
  assert.ok(!/registerPanel/.test(NEWSLETTER), "and nothing registered as one");
  assert.ok(!/data-panel-newsletter/.test(SHOP), "and no icon in the utility row");
  assert.match(NEWSLETTER, /nl-card nl-block/, "the occasional invitation remains");
  assert.match(NEWSLETTER, /nl-block nl-footer/, "and the footer form is the home of it");

  // It is a mailing list, not an account, and the consent sentence says so.
  assert.match(NEWSLETTER, /This is a mailing list, not an account/);
  // The form in the page is one field; the dialog it opens offers a name and
  // requires none of it. What must never appear here is a phone number: that
  // is asked for at checkout, where it is used, and WhatsApp consent is a
  // separate decision made somewhere else.
  assert.ok(!/name="whatsapp"|name="phone"/.test(NEWSLETTER));
  assert.match(NEWSLETTER, /whatsappOptIn: false/);
});

test("the mailing list is named for what it is", () => {
  // "A Note from Marvell" told nobody what they were signing up for.
  assert.ok(!/A Note from Marvell/.test(NEWSLETTER));
  assert.match(NEWSLETTER, /Sign up for Marvell updates/);
});

test("a switch between panels does not close one and open another", () => {
  // The whole point of the connected panels. If the arriving panel keeps its
  // travel transition it slides in from the edge, which is the closing and
  // reopening this exists to remove — so the transition is switched off for
  // the duration of a switch and only opacity moves.
  const arriving = block(SHOP, "body.mv-panel-switching .mv-panel.is-open:not(.mv-panel-switch-out) {");
  assert.match(arriving, /transform: translateX\(0\) !important/);
  assert.match(arriving, /transition: none !important/, "the arriving panel must not slide");

  // Its contents fade in; its utility row does not, so the row is solid from
  // the first frame and the rule under the icons appears to move rather than
  // blink out and back.
  assert.match(
    SHOP,
    /body\.mv-panel-switching \.mv-panel\.is-open:not\(\.mv-panel-switch-out\) > \*:not\(\.mv-panel-utility\) \{\s*animation: mv-panel-switch-in/
  );

  // The departing panel fades out in place, and drops its own rule at once so
  // there are never two underlines on screen.
  const leaving = block(SHOP, ".mv-panel.is-open.mv-panel-switch-out {");
  assert.match(leaving, /transform: translateX\(0\) !important/);
  assert.match(leaving, /opacity: 0 !important/);
  assert.match(SHOP, /\.mv-panel\.is-open\.mv-panel-switch-out \.mv-panel-utility-indicator \{\s*opacity: 0 !important/);
});

test("Add to Bag and Consult are one button with two labels", () => {
  // A piece is either bought here or arranged in conversation, and which one
  // it is belongs to the piece. Two differently-styled buttons would say the
  // second kind is a lesser way to buy — which is most of what Marvell does.
  const product = readFileSync(new URL("product.html", ROOT), "utf8");
  const shared = ".product-bag-btn,\n.product-whatsapp-btn {";
  assert.ok(product.includes(shared), "the two share one declaration");

  for (const property of ["min-height", "padding", "border", "background", "color", "font-size", "letter-spacing", "text-transform"]) {
    assert.ok(
      new RegExp(`(?:^|[;\\s])${property}\\s*:`, "m").test(block(product, shared)),
      `${property} must be set once, for both`
    );
  }
  // Same hover, too: one of them inverting and the other not is the tell.
  assert.ok(product.includes(".product-bag-btn:hover,\n.product-bag-btn:focus-visible,\n.product-whatsapp-btn:hover,\n.product-whatsapp-btn:focus-visible {"));

  // Only one of them is ever on screen; the mode decides which.
  assert.match(product, /if \(waBtn instanceof HTMLElement\) waBtn\.hidden = true;/);
  assert.match(product, /if \(waBtn instanceof HTMLElement\) waBtn\.hidden = false;/);
});

// ------------------------------------------------------- drawn underlines --

/**
 * The underline is drawn rather than faded, and it has to be the length of
 * the text. An absolutely positioned bar spans its element's box, so every
 * rule here is really one rule: the box must be the words, and nothing else.
 */

const LANGUAGE = await readFile(new URL("assets/site-language.js", ROOT), "utf8");

test("the underline is drawn slowly, and sits against the baseline", () => {
  const bars = [
    ["site-language.js", block(LANGUAGE, ".product-breadcrumb a::before {")],
    ["secondary-menu.js", block(MENU, ".menu-panel .menu-quick-link::before {")]
  ];
  for (const [where, bar] of bars) {

    // Measured down from the box's centre, not up from its bottom: a fixed
    // offset from the bottom drifts with every different line-height.
    assert.match(bar, /top:\s*50%/, "anchored to the centre");
    assert.match(bar, /bottom:\s*auto/, "and not to the bottom");
    assert.match(bar, /margin-top:\s*0?\.44em/, "a hair below the baseline");

    const duration = bar.match(/transition:\s*transform\s+([0-9.]+)s/);
    assert.ok(duration, `${where}: the bar transitions its transform`);
    assert.ok(Number(duration[1]) >= 0.55, `${where}: the draw is slow (${duration[1]}s)`);
  }
});

test("a chevron is not text, so it sits outside the underlined box", () => {
  // The footer's chevron was a flex item, which put it inside the link's box
  // and ran the rule on under it. It is positioned out of the flow now.
  const chevron = block(LANGUAGE, "#site-footer .footer-link::after {");
  assert.match(chevron, /position:\s*absolute/);
  assert.match(chevron, /left:\s*100%/, "hung off the right-hand edge");

  // And the links that are laid out as blocks shrink to their words.
  const legal = block(LANGUAGE, ".legal-toc-link {");
  assert.match(legal, /width:\s*fit-content/);
});

test("a menu row is stretched for its chevron, but an underlined one is not", () => {
  // Every row in the menu's left column is width:100% so that the ones which
  // open a second pane can push a chevron to the far edge. The underlined
  // links have no chevron, and a rule the width of the panel under a
  // two-word label is what that stretch used to cost.
  assert.match(
    MENU,
    /@media \(min-width: 769px\) \{\s*\.menu-panel \.menu-main-left \.menu-link:not\(\[data-menu-quick\]\):not\(\.menu-back\)[\s\S]*?width: fit-content/,
    "underlined rows are the width of their text on desktop"
  );
  // The rows that do carry a chevron keep their stretch.
  assert.match(prop(MENU, ".menu-main-left [data-menu-quick] {", "width"), /100%/);
});

test("a word with a chevron after it is still underlined, and only the word", () => {
  // These rows stay the width of the panel so the chevron can sit at its far
  // edge, so the rule cannot span the box. It is given the text's own width,
  // measured from a Range over the element's contents — which excludes the
  // chevron by construction, because a pseudo-element is not in the DOM.
  const bar = block(MENU, ".menu-panel .menu-main-left [data-menu-quick]::before {");
  assert.match(bar, /width:\s*var\(--mv-underline-w/, "sized to the measured text");
  assert.match(bar, /right:\s*auto/, "and not stretched to the box");
  assert.match(bar, /top:\s*50%/);
  assert.match(bar, /margin-top:\s*\.44em/);

  // The measurement must exclude the chevron, and never write a zero.
  assert.match(MENU, /range\.selectNodeContents\(trigger\)/);
  assert.match(MENU, /if \(width > 0\) trigger\.style\.setProperty\("--mv-underline-w"/);

  // The chevron rows keep their stretch; that is the whole reason for this.
  assert.match(prop(MENU, ".menu-main-left [data-menu-quick] {", "width"), /100%/);
  assert.match(prop(MENU, ".menu-main-left [data-menu-quick] {", "position"), /relative/);
});

// ------------------------------------------- the order, before the bag -------

import { readFile as readOrderFile } from "node:fs/promises";
const BAG_JS = await readOrderFile(new URL("../assets/bag.js", import.meta.url), "utf8");
const PRODUCT_HTML = await readOrderFile(new URL("../product.html", import.meta.url), "utf8");
const CHECKOUT_HTML = await readOrderFile(new URL("../checkout.html", import.meta.url), "utf8");
const BAG_HTML = await readOrderFile(new URL("../bag.html", import.meta.url), "utf8");

/**
 * Add to Bag cannot reach the bag before the order is settled.
 *
 * When it is wanted and whether it is delivered or collected used to be asked
 * at checkout, after a bag had been filled and carried around — the one
 * question that can invalidate the whole order, asked last.
 */
test("nothing is added to the bag while the order is unsettled", () => {
  const add = BAG_JS.slice(BAG_JS.indexOf("function handleAdd"));
  const body = add.slice(0, add.indexOf("\n  }"));
  assert.match(body, /orderPlanSettled\?\.\(\)/, "handleAdd does not check for a settled order");
  assert.match(body, /await Bag\.requestOrderPlan\?\.\(\)/, "it does not ask for one");
  assert.match(body, /if \(!settled\) return;/, "it adds anyway when the question is dropped");
  // And the check comes before the add, not after it.
  assert.ok(body.indexOf("requestOrderPlan") < body.indexOf("Bag.add("),
    "the piece is added before the order is settled");
});

test("the product page answers the bag with its own Order details panel", () => {
  assert.match(PRODUCT_HTML, /registerOrderPlanCollector\?\.\(\(\) => new Promise/,
    "the product page does not offer to answer");
  // Apply writes the plan, and only with all three answers in.
  assert.match(PRODUCT_HTML, /const hasCompleteOrderPlan = \(\) => \(/);
  assert.match(PRODUCT_HTML, /writeOrderPlan\?\.\(\{[\s\S]*?timeWindow: config\.timeWindow/);
  // Closing the panel on the question has to end the wait, or Add to Bag hangs.
  assert.match(PRODUCT_HTML, /if \(!isOpen && collectingOrderPlanForBag\) settleOrderPlanRequest\(\);/,
    "closing the panel would leave the bag waiting forever");
});

test("what was settled is shown in the cart and filled in at checkout", () => {
  assert.match(BAG_HTML, /function renderOrderPlan\(\)/, "the cart does not show the settled order");
  assert.match(BAG_HTML, /readOrderPlan\?\.\(\)/);
  assert.match(CHECKOUT_HTML, /function applyOrderPlan\(\)/, "checkout asks again instead of filling in");
  assert.match(CHECKOUT_HTML, /applyOrderPlan\(\);/, "applyOrderPlan is defined but never called");
  // The three fields checkout would otherwise ask for twice.
  const apply = CHECKOUT_HTML.slice(CHECKOUT_HTML.indexOf("function applyOrderPlan"));
  const body = apply.slice(0, apply.indexOf("\n  }"));
  for (const field of ["delivery_date", "delivery_time_window", "delivery_method"]) {
    assert.match(body, new RegExp(field), `checkout still re-asks ${field}`);
  }
});
