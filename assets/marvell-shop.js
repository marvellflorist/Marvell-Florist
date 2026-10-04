/**
 * Marvell Shop — shared commerce core.
 *
 * Provides two globals, in the same style as MarvellFavorites and
 * MarvellConsultation:
 *
 *   window.MarvellShop — catalogue access, formatting, escaping
 *   window.MarvellBag  — the guest bag (localStorage)
 *
 * The bag stores SKUs and quantities and nothing else. Prices, names, stock
 * and totals are always fetched from the server, never read back out of
 * localStorage, so editing storage changes what a shopper sees and never what
 * they are charged.
 */
(function () {
  if (typeof window === "undefined") return;
  if (window.MarvellShop) return;

  const BAG_KEY = "marvell-bag-v1";
  // The one canonical bag route. Everything that links to the bag reads it
  // from here so a second spelling cannot appear.
  const BAG_PAGE = "/bag.html";
  const BAG_UNSEEN_KEY = "marvell-bag-unseen-v1";
  const MAX_LINES = 20;
  const MAX_QUANTITY = 20;
  const CATALOG_TTL_MS = 60_000;

  let catalogCache = null;
  let catalogFetchedAt = 0;
  let catalogPromise = null;

  // -- language ------------------------------------------------------------

  function getLanguage() {
    return window.MarvellLanguage?.getLanguage?.() === "id" ? "id" : "en";
  }

  function t(en, id) {
    return getLanguage() === "id" ? id : en;
  }

  // -- escaping ------------------------------------------------------------

  /** Every CMS string and every server string passes through this before HTML. */
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Only site-relative image paths are ever rendered. Blocks javascript:,
   * data: and off-site URLs even if one reached the CMS.
   */
  function safeImage(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (raw.startsWith("//")) return "";
    if (raw.startsWith("/")) return raw;
    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        return url.origin === window.location.origin ? `${url.pathname}${url.search}` : "";
      } catch (_error) {
        return "";
      }
    }
    return "";
  }

  /** Renders paragraphs from CMS text without ever trusting it as markup. */
  function paragraphs(value) {
    return String(value ?? "")
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  // -- money ---------------------------------------------------------------

  /**
   * Rp1.050.000 — the format already used across the site.
   *
   * A missing price returns an empty string rather than "Rp0": a SKU with no
   * commerce row has no price, which is not the same as being free.
   */
  function formatIdr(value) {
    if (value === null || value === undefined || value === "") return "";
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "";
    return `Rp${Math.round(amount).toLocaleString("id-ID")}`;
  }

  // -- catalogue -----------------------------------------------------------

  /**
   * One request serves the whole page. Stock moves, so the result is only
   * held for a minute and any add-to-bag re-checks against the server anyway.
   */
  async function getCatalog({ force = false } = {}) {
    const fresh = catalogCache && Date.now() - catalogFetchedAt < CATALOG_TTL_MS;
    if (fresh && !force) return catalogCache;
    if (catalogPromise && !force) return catalogPromise;

    catalogPromise = (async () => {
      try {
        const response = await fetch("/api/catalog", {
          headers: { accept: "application/json" },
          cache: "no-store"
        });
        if (!response.ok) throw new Error(`catalog ${response.status}`);
        const data = await response.json();
        if (!data?.ok) throw new Error("catalog payload");

        catalogCache = {
          collections: Array.isArray(data.collections) ? data.collections : [],
          products: Array.isArray(data.products) ? data.products : [],
          payments: data.payments || { enabled: false },
          commerceAvailable: data.commerce_available === true,
          placeholder: data.placeholder === true
        };
        catalogFetchedAt = Date.now();
        // Announced here rather than in each page, so no commerce page can
        // show placeholder prices without also saying that is what they are.
        showPreviewNotice(catalogCache.placeholder);
        return catalogCache;
      } catch (error) {
        console.warn("[marvell-shop] catalogue unavailable", error?.message);
        // An empty catalogue renders an honest empty state rather than an error.
        catalogCache = catalogCache || {
          collections: [],
          products: [],
          payments: { enabled: false },
          commerceAvailable: false,
          placeholder: false,
          failed: true
        };
        catalogFetchedAt = Date.now();
        return catalogCache;
      } finally {
        catalogPromise = null;
      }
    })();

    return catalogPromise;
  }

  /**
   * Placeholder preview strip.
   *
   * When the catalogue is served from content/placeholder-commerce.json rather
   * than Supabase, every price and stock figure on the page is invented. That
   * has to be visible: a shop quoting made-up prices without saying so is the
   * one genuinely harmful state this feature could produce.
   */
  function showPreviewNotice(isPlaceholder) {
    if (typeof document === "undefined") return;
    const host = document.querySelector(".shop-main");
    if (!host) return;

    const existing = document.getElementById("marvell-preview-notice");
    if (!isPlaceholder) {
      existing?.remove();
      return;
    }
    if (existing) return;

    if (!document.getElementById("marvell-preview-notice-styles")) {
      const style = document.createElement("style");
      style.id = "marvell-preview-notice-styles";
      style.textContent = `
        #marvell-preview-notice {
          margin: 18px 0 0;
          padding: 13px 16px;
          border: 1px dashed rgba(29, 26, 24, 0.32);
          background: rgba(29, 26, 24, 0.035);
          font-family: "Inter Tight", sans-serif;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(29, 26, 24, 0.74);
          display: grid;
          gap: 4px;
        }
        #marvell-preview-notice strong {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #1d1a18;
        }
      `;
      document.head.appendChild(style);
    }

    const notice = document.createElement("aside");
    notice.id = "marvell-preview-notice";
    notice.setAttribute("role", "note");
    notice.innerHTML = `
      <strong>${escapeHtml(t("Preview", "Pratinjau"))}</strong>
      <span>${escapeHtml(
        t(
          "This shop is running on placeholder prices and stock. Nothing here can be purchased yet.",
          "Shop ini menggunakan harga dan stok sementara. Belum ada yang bisa dibeli."
        )
      )}</span>
    `;
    host.insertBefore(notice, host.firstChild);
  }

  async function findProductBySlug(slug) {
    const wanted = String(slug || "").trim().toLowerCase();
    if (!wanted) return null;
    const catalog = await getCatalog();
    return catalog.products.find((product) => product.slug === wanted) || null;
  }

  async function findProductBySku(sku) {
    const wanted = String(sku || "").trim().toUpperCase();
    if (!wanted) return null;
    const catalog = await getCatalog();
    return catalog.products.find((product) => product.sku === wanted) || null;
  }

  /**
   * Everything a shopper can buy today, in collection order.
   *
   * A collection has no page of its own — retail lives inside Featured — so
   * this is the whole of what collections do now: an active one decides which
   * SKUs are merchandised and in what order. An upcoming launch is not yet on
   * sale and an archived one is a record, and neither is purchasable now, so
   * neither is listed here.
   */
  async function getShopProducts() {
    const catalog = await getCatalog();
    const seen = new Set();
    const ordered = [];

    // Every SKU any collection claims, active or not. Used below to tell a
    // genuinely orphaned SKU apart from one that simply belongs to a
    // collection that has not opened yet.
    const claimed = new Set();
    catalog.collections.forEach((collection) => {
      (collection.products || []).forEach((product) => claimed.add(product.sku));
      (collection.product_ids || []).forEach((sku) => claimed.add(sku));
    });

    for (const collection of catalog.collections) {
      if (collection.status !== "active") continue;
      for (const product of collection.products || []) {
        if (seen.has(product.sku)) continue;
        seen.add(product.sku);
        ordered.push({ ...product, collection_title: collection.title, collection_slug: collection.slug });
      }
    }

    // A live SKU that no collection lists at all would otherwise be
    // unreachable, so it is shown rather than silently lost.
    for (const product of catalog.products) {
      if (seen.has(product.sku) || claimed.has(product.sku) || !product.listed) continue;
      seen.add(product.sku);
      ordered.push(product);
    }
    return ordered;
  }

  // -- shared panel chrome --------------------------------------------------

  /**
   * The right-hand quick panels — the wishlist, account, contact and the
   * bag — are the same object as the navigation menu, opening from the other
   * side. Rather than re-describing that panel five times and letting them
   * drift apart, its chrome lives here once and every module calls
   * injectPanelStyles().
   *
   * Every value below is taken from .menu-panel in assets/secondary-menu.js:
   * the same offwhite ground, the same 0.5s ease-in-out travel, the same
   * hairline border, the same 42px close disc, the same Inter Tight scale.
   * !important is used for the same reason the menu uses it — these panels
   * render over twenty pages that each carry their own CSS.
   */
  function injectPanelStyles() {
    if (typeof document === "undefined") return;
    if (document.getElementById("marvell-panel-styles")) return;

    const style = document.createElement("style");
    style.id = "marvell-panel-styles";
    style.textContent = `
      .mv-backdrop {
        position: fixed !important;
        inset: 0 !important;
        background: rgba(12, 10, 9, 0.34) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.5s ease-in-out !important;
        z-index: 240 !important;
      }
      .mv-backdrop.is-open {
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      .mv-panel {
        /* The width is NOT a token a panel may override any more. Four panels
           at four widths made the edge jump every time one faded into the
           next, which is the opposite of what the cross-fade is for. One
           width, and it is the menu's, so both sides of the screen agree.
           Only the ground is still per-panel. */
        --mv-panel-width: min(92vw, 500px);
        --mv-panel-ground: var(--footer-offwhite, #fff);
        position: fixed !important;
        top: 0 !important;
        bottom: auto !important;
        right: 0 !important;
        left: auto !important;
        width: var(--mv-panel-width) !important;
        height: 100vh !important;
        height: 100dvh !important;
        background: var(--mv-panel-ground) !important;
        color: #151210 !important;
        transform: translateX(100%) !important;
        transition: transform 0.5s ease-in-out !important;
        z-index: 241 !important;
        box-shadow: none !important;
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) !important;
        border: 0 !important;
        border-left: 1px solid rgba(29, 26, 24, 0.08) !important;
        overflow: hidden !important;
        font-family: "Inter Tight", sans-serif !important;
      }
      .mv-panel--with-foot {
        grid-template-rows: auto minmax(0, 1fr) auto !important;
      }
      .mv-panel[aria-hidden="true"]:not(.is-open) {
        visibility: hidden !important;
      }
      .mv-panel.is-open {
        transform: translateX(0) !important;
        visibility: visible !important;
        box-shadow: -20px 0 36px rgba(10, 12, 18, 0.18) !important;
      }
      /* Moving between two right-hand panels.
         The panel does not leave and come back: it stays exactly where it is,
         its contents cross-fade, and the rule under the icons slides from the
         icon you came from to the one you asked for.

         Three things make that true. The arriving panel's travel transition is
         switched off, so it appears in place instead of sliding in from the
         edge. Its utility row is excluded from the fade, so the row is solid
         from the first frame and the rule appears to move rather than blink.
         And the departing panel's own rule is hidden at once, so there are
         never two of them on screen at the same time. */
      body.mv-panel-switching .mv-panel.is-open:not(.mv-panel-switch-out) {
        transform: translateX(0) !important;
        transition: none !important;
        animation: none !important;
      }
      body.mv-panel-switching .mv-panel.is-open:not(.mv-panel-switch-out) > *:not(.mv-panel-utility) {
        animation: mv-panel-switch-in .34s ease both;
      }
      .mv-panel.is-open.mv-panel-switch-out {
        transform: translateX(0) !important;
        opacity: 0 !important;
        transition: opacity .34s ease !important;
        z-index: 243 !important;
        pointer-events: none !important;
      }
      .mv-panel.is-open.mv-panel-switch-out .mv-panel-utility-indicator {
        opacity: 0 !important;
        transition: none !important;
      }
      @keyframes mv-panel-switch-in { from { opacity: 0; } to { opacity: 1; } }
      body:has(.mv-panel.is-open) .floating-whatsapp-btn {
        z-index: 239 !important;
      }

      .mv-panel-head {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        padding: 18px 18px 0 18px !important;
        position: relative !important;
        z-index: 3 !important;
      }
      .mv-panel-close {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        border: 0;
        background: #111;
        color: #fff;
        font-size: 23px;
        font-weight: 300;
        line-height: 1;
        cursor: pointer;
        display: grid;
        place-items: center;
        padding: 0;
        font-family: "Inter Tight", sans-serif;
        transition: background 0.2s ease, border-color 0.2s ease;
      }
      .mv-panel-close:hover,
      .mv-panel-close:focus-visible {
        background: #000;
        outline: none;
      }

      .mv-panel-body {
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        padding: 30px 46px 46px 46px !important;
        display: grid !important;
        align-content: start !important;
        gap: 26px !important;
      }
      .mv-panel-foot {
        padding: 22px 46px calc(env(safe-area-inset-bottom, 0px) + 30px) 46px !important;
        border-top: 1px solid rgba(29, 26, 24, 0.08) !important;
        display: grid !important;
        gap: 14px !important;
        background: var(--mv-panel-ground) !important;
      }

      /* Type scale, lifted from .menu-back and .menu-quick-link. */
      .mv-eyebrow {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(21, 18, 16, 0.72);
      }
      .mv-title {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: clamp(19px, 1.55vw, 23px);
        font-weight: 500;
        line-height: 1.24;
        color: #1d1a18;
      }
      .mv-item-name {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 19px;
        font-weight: 500;
        line-height: 1.34;
        color: #1d1a18;
      }
      .mv-item-name a {
        color: inherit;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        transition: opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1), color 0.42s cubic-bezier(0.22, 1, 0.36, 1);
      }
      /* The same chevron affordance the quick-panel links use. */
      .mv-item-name a::after {
        content: "›";
        margin-left: 10px;
        opacity: 0;
        transform: translateX(-4px);
        transition: opacity 0.24s ease, transform 0.24s ease;
      }
      .mv-item-name a:hover::after,
      .mv-item-name a:focus-visible::after {
        opacity: 1;
        transform: translateX(0);
      }
      .mv-body-text {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 15px;
        font-weight: 400;
        line-height: 1.62;
        color: rgba(29, 26, 24, 0.64);
      }
      .mv-meta {
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        font-weight: 400;
        line-height: 1.5;
        color: rgba(29, 26, 24, 0.64);
        font-variant-numeric: tabular-nums;
      }
      .mv-quiet-action {
        border: 0;
        background: transparent;
        padding: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(21, 18, 16, 0.72);
        cursor: pointer;
        transition: color 0.42s ease;
      }
      .mv-quiet-action:hover,
      .mv-quiet-action:focus-visible {
        color: #1d1a18;
        outline: none;
      }

      /* Primary action. Matches the menu's close disc rather than inventing
         a third black. */
      .mv-cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 16px 22px;
        border: 0;
        background: #111;
        color: #fff;
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        text-decoration: none;
        cursor: pointer;
        transition: background 0.2s ease, opacity 0.2s ease;
      }
      .mv-cta:hover:not(:disabled) { background: #000; }
      .mv-cta:disabled,
      .mv-cta[aria-disabled="true"] { opacity: 0.4; pointer-events: none; }
      .mv-cta--ghost {
        background: transparent;
        color: #1d1a18;
        border: 1px solid rgba(29, 26, 24, 0.24);
      }
      .mv-cta--ghost:hover:not(:disabled) { background: #111; color: #fff; border-color: #111; }

      /* The gallery's Apply Filters button, to the letter. It is the site's
         one "and now do it" control, and a panel that ends in a decision uses
         the same one rather than inventing a second. Kept here so the two
         cannot drift; tests/panel-parity.test.mjs compares them. */
      .mv-cta--apply {
        width: 100%;
        min-height: 38px;
        padding: 0 24px;
        border: 1px solid transparent;
        background: #12100e;
        color: #f8f4ec;
        font-size: 11px;
        letter-spacing: 0.1em;
        transition: background-color 220ms ease, border-color 220ms ease, color 220ms ease;
      }
      .mv-cta--apply:hover:not(:disabled):not([aria-disabled="true"]),
      .mv-cta--apply:focus-visible {
        outline: none;
        background: transparent;
        color: #151210;
        border-color: #151210;
      }

      .mv-note {
        padding: 13px 15px;
        background: rgba(29, 26, 24, 0.045);
        border-left: 1px solid rgba(29, 26, 24, 0.24);
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: rgba(29, 26, 24, 0.74);
        display: grid;
        gap: 6px;
      }
      .mv-note--alert {
        background: rgba(154, 74, 53, 0.07);
        border-left-color: #9a4a35;
        color: #7a3a29;
      }

      /* Mobile: the menu becomes a full-width sheet rising from the bottom,
         and so do these. */
      @media (max-width: 768px) {
        .mv-panel {
          --mv-panel-width: 100vw;
          width: 100vw !important;
          min-width: 100vw !important;
          max-width: 100vw !important;
          left: 0 !important;
          right: 0 !important;
          top: auto !important;
          bottom: 0 !important;
          /* The whole screen, exactly as the menu takes it. These used to stop
             92dvh short, which left a strip of the page showing above a panel
             that had otherwise replaced it — and made the left-hand menu and
             the right-hand panels two different sizes of the same gesture. */
          height: 100dvh !important;
          max-height: 100dvh !important;
          border-left: 0 !important;
          border-top: 1px solid rgba(29, 26, 24, 0.08) !important;
          transform: translateY(100%) !important;
        }
        .mv-panel.is-open {
          transform: translateY(0) !important;
          box-shadow: 0 -20px 36px rgba(10, 12, 18, 0.18) !important;
        }
        .mv-panel-head {
          padding: 14px 16px 0 0 !important;
        }
        .mv-panel-body {
          padding: 18px 16px 28px 16px !important;
          gap: 22px !important;
        }
        .mv-panel-foot {
          padding: 18px 16px calc(env(safe-area-inset-bottom, 0px) + 22px) 16px !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .mv-panel, .mv-backdrop { transition: none !important; }
      }
    `;
    document.head.appendChild(style);
    injectUtilityStyles();
  }

  /**
   * The utility row that stays at the top of every quick panel.
   *
   * A panel is not a modal that replaces the site: the way back to search, the
   * wishlist, the account and the bag stays where it always is while one is
   * open, so the panel reads as part of the shell rather than as something
   * floating over it. Close sits on the left, where the panel's own edge is.
   *
   * The row sits on the panel's pale ground, so its icons are always the dark
   * set — the header's light-over-hero state does not apply inside a panel.
   */
  function injectUtilityStyles() {
    if (document.getElementById("marvell-panel-utility-styles")) return;

    const style = document.createElement("style");
    style.id = "marvell-panel-utility-styles";
    style.textContent = `
      .mv-panel-utility {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 18px !important;
        padding: 20px 46px 18px 46px !important;
        border-bottom: 1px solid rgba(29, 26, 24, 0.1) !important;
        background: var(--mv-panel-ground) !important;
      }
      .mv-panel-utility-close {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 0;
        border: 0;
        background: transparent;
        appearance: none;
        -webkit-appearance: none;
        cursor: pointer;
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(21, 18, 16, 0.78);
        transition: opacity 0.2s ease;
      }
      .mv-panel-utility-close:hover,
      .mv-panel-utility-close:focus-visible { opacity: 0.6; outline: none; }
      .mv-panel-utility-close svg {
        width: 15px;
        height: 15px;
        display: block;
        stroke: currentColor;
        stroke-width: 1.25;
        fill: none;
        stroke-linecap: round;
      }

      .mv-panel-utility-actions {
        display: inline-flex;
        align-items: center;
        gap: 16px;
        position: relative;
      }
      .mv-panel-utility-action {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        border: 0;
        background: transparent;
        appearance: none;
        -webkit-appearance: none;
        cursor: pointer;
        color: rgba(21, 18, 16, 0.78);
        text-decoration: none;
        transition: opacity 0.2s ease;
      }
      .mv-panel-utility-action:hover,
      .mv-panel-utility-action:focus-visible { opacity: 0.6; outline: none; }
      .mv-panel-utility-action svg { width: 20px; height: 20px; display: block; }
      /* The current panel's own icon is marked rather than removed, so the row
         never changes width as you move between panels. */
      .mv-panel-utility-indicator {
        position: absolute;
        bottom: -7px;
        width: 14px;
        height: 1px;
        background: currentColor;
        pointer-events: none;
        opacity: 0;
        transition: transform .34s ease, opacity .2s ease;
      }
      .mv-panel-utility-count {
        position: absolute;
        top: -3px;
        right: -5px;
        font-family: "Inter Tight", sans-serif;
        font-size: 9px;
        font-weight: 600;
        line-height: 1;
        color: currentColor;
        display: none;
      }
      .mv-panel-utility-action.has-items .mv-panel-utility-count { display: block; }
      .mv-panel-utility-count::after { content: attr(data-count); }

      /* ------------------------------------------------------------------
         The retracing underline.

         The house hover is a rule that draws itself from the left and, on
         leaving, retreats the way it came rather than collapsing back to the
         left. The menu and the footer already do it for links that carry no
         underline at rest (see assets/site-language.js).

         This is the other half: links that are underlined at rest. They kept
         a static text-decoration and merely dimmed on hover, so a page full
         of them had no motion in it at all. Here the text-decoration is given
         up for a rule of the element's own, which is at full width at rest
         and, on hover, retreats to the right and redraws from the left. One
         keyframe rather than a transition, because a transition cannot turn
         round mid-flight and change its origin.

         Opt in with the class; nothing is restyled behind a page's back.
         ------------------------------------------------------------------ */
      @keyframes mv-underline-retrace {
        0%   { transform: scaleX(1); transform-origin: right center; }
        42%  { transform: scaleX(0); transform-origin: right center; }
        43%  { transform: scaleX(0); transform-origin: left center; }
        100% { transform: scaleX(1); transform-origin: left center; }
      }
      .mv-underline {
        position: relative;
        text-decoration: none !important;
      }
      .mv-underline::after {
        content: "";
        position: absolute;
        /* The rule is as wide as the *text*, not as the box. A link is often
           a block or a flex item wider than the words in it, and a rule that
           ran to the edge of the box read as a divider. adoptUnderlines()
           measures the text and publishes these two; both fall back to the
           whole box, which is right for the links that are shrink-to-fit. */
        left: var(--mv-underline-x, 0px);
        width: var(--mv-underline-w, 100%);
        right: auto;
        /* Measured down from the middle of the box rather than up from its
           bottom, so one figure sits just under the baseline whatever the
           line-height happens to be. The same trick the menu uses. */
        top: 50%;
        bottom: auto;
        margin-top: 0.44em;
        height: 1px;
        background: currentColor;
        transform: scaleX(1);
        transform-origin: left center;
        pointer-events: none;
      }
      .mv-underline:hover::after,
      .mv-underline:focus-visible::after {
        animation: mv-underline-retrace 0.62s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      /* A link that is the destination you are already on does not move. */
      .mv-underline[aria-current]:not([aria-current="false"]):hover::after {
        animation: none;
      }
      @media (prefers-reduced-motion: reduce) {
        .mv-underline:hover::after,
        .mv-underline:focus-visible::after { animation: none; }
      }

      @media (max-width: 768px) {
        /* No pointer, so there is no hover to draw and the rule simply is. */
        .mv-underline:hover::after,
        .mv-underline:focus-visible::after { animation: none; }
        /* The panel takes the whole screen now, so its first row is up against
           the status bar and the notch. The menu head clears them the same way
           (see assets/header-template.js); this is the right-hand version of
           that padding. It has to live in THIS stylesheet, which is injected
           after the panel's, or the unqualified rule above would win it back. */
        .mv-panel-utility {
          padding: calc(env(safe-area-inset-top, 0px) + 16px)
                   max(16px, env(safe-area-inset-right, 0px))
                   14px
                   max(16px, env(safe-area-inset-left, 0px)) !important;
        }
        .mv-panel-utility-actions { gap: 10px; }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Markup for the utility row. `current` marks which panel is showing, so the
   * row can say where you are without a second heading.
   */
  function utilityRowMarkup(current = "") {
    const icon = (name) => window.MarvellIcons?.icon?.(name) || "";
    const mark = (name) => (name === current ? ' aria-current="true"' : "");

    return `
      <div class="mv-panel-utility">
        <button class="mv-panel-utility-close" type="button" data-panel-close
          aria-label="${escapeHtml(t("Close", "Tutup"))}">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6 18 18"></path><path d="M18 6 6 18"></path>
          </svg>
          <span>${escapeHtml(t("Close", "Tutup"))}</span>
        </button>
        <div class="mv-panel-utility-actions">
          <a class="mv-panel-utility-action" href="/wishlist" data-panel-wishlist${mark("wishlist")}
            aria-label="${escapeHtml(t("Wishlist", "Wishlist"))}">${icon("heart")}</a>
          <button class="mv-panel-utility-action" type="button" data-panel-account${mark("account")}
            aria-label="${escapeHtml(t("Account", "Akun"))}">${icon("account")}</button>
          <button class="mv-panel-utility-action" type="button" data-panel-contact${mark("contact")}
            aria-label="${escapeHtml(t("Contact us", "Hubungi kami"))}">${icon("contact")}</button>
          <a class="mv-panel-utility-action" href="${BAG_PAGE}" data-panel-bag${mark("bag")}
            aria-label="${escapeHtml(t("Shopping Bag", "Tas Belanja"))}">${icon("bag")}
            <span class="mv-panel-utility-count" data-count="0"></span>
          </a>
          <span class="mv-panel-utility-indicator" aria-hidden="true"></span>
        </div>
      </div>
    `;
  }

  /**
   * Keeps every utility row's bag count in step with the bag itself. Rows are
   * re-rendered by their own panels, so this runs over all of them rather than
   * holding a reference to any one.
   */
  function syncUtilityRows() {
    // Guarded on the method, not on `document`: the checks run these modules
    // against a minimal stub that has a document but not a full DOM.
    if (typeof document === "undefined" || typeof document?.querySelectorAll !== "function") return;
    const count = bagCount();
    document.querySelectorAll("[data-panel-bag]").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.classList.toggle("has-items", count > 0);
      const badge = node.querySelector(".mv-panel-utility-count");
      if (badge instanceof HTMLElement) badge.dataset.count = String(count);
    });

    // Panels re-render themselves — the wishlist when an item is removed, My
    // Marvell when the session arrives — and a re-render builds a new row with
    // a new indicator, which would otherwise sit at the far left. A fresh
    // indicator carries no inline transform, so it is placed under whichever
    // icon the row marks. One that has already travelled is left alone.
    document.querySelectorAll(".mv-panel-utility-actions").forEach((actions) => {
      if (!(actions instanceof HTMLElement)) return;
      const indicator = actions.querySelector(".mv-panel-utility-indicator");
      if (!(indicator instanceof HTMLElement) || indicator.style.transform) return;
      const current = actions.querySelector('[aria-current="true"]');
      if (!(current instanceof HTMLElement)) {
        indicator.style.opacity = "0";
        return;
      }
      const left = current.getBoundingClientRect().left - actions.getBoundingClientRect().left;
      indicator.style.transition = "none";
      indicator.style.opacity = "1";
      indicator.style.transform = `translateX(${left + (current.getBoundingClientRect().width - 14) / 2}px)`;
      // Given back its transition once it is in place, so the next move slides.
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => { indicator.style.transition = ""; });
      } else {
        indicator.style.transition = "";
      }
    });
  }

  /**
   * The little rule under the icon that says which panel you are in.
   *
   * It slides from the icon you came from to the icon you asked for, which is
   * the whole point of the quick panels being connected: the panel's contents
   * cross-fade while this one mark travels, so moving between the wishlist,
   * the account, contact and the bag reads as one surface changing its mind
   * rather than four drawers taking turns.
   */
  let switchFrom = "";
  function syncPanelIndicator(name, panel) {
    if (!(panel instanceof HTMLElement)) return;
    const actions = panel.querySelector(".mv-panel-utility-actions");
    const indicator = actions?.querySelector(".mv-panel-utility-indicator");
    const target = actions?.querySelector(`[data-panel-${name}]`);
    if (!(actions instanceof HTMLElement) || !(indicator instanceof HTMLElement) || !(target instanceof HTMLElement)) return;
    const from = actions.querySelector(`[data-panel-${switchFrom}]`) || target;
    const x = (node) => node.getBoundingClientRect().left - actions.getBoundingClientRect().left + (node.getBoundingClientRect().width - 14) / 2;
    indicator.style.transition = "none";
    indicator.style.transform = `translateX(${x(from)}px)`;
    indicator.style.opacity = "1";
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      indicator.style.transition = "";
      indicator.style.transform = `translateX(${x(target)}px)`;
    }));
  }

  // -- panel coordination --------------------------------------------------

  /**
   * One place that knows which panel is open.
   *
   * The site has several things that can cover the page — the menu, the
   * wishlist, account, contact and the bag — each built in its own file. Without a registry they each lock body scroll by assignment, each
   * carry a backdrop of their own and each close only themselves, so two can
   * be open at once and whichever closes last decides whether the page can
   * scroll again. This makes opening one close the rest, and makes the scroll
   * lock and the backdrop single owned resources.
   */
  const registry = new Map();
  let activePanel = "";
  let savedBodyOverflow = null;
  let switchTimer = 0;
  let switchingOut = null;
  /**
   * The connected set. Moving between any two of these cross-fades in place;
   * anything else (the menu, from the other side) opens and closes normally.
   */
  const rightPanels = new Set(["wishlist", "account", "contact", "bag"]);

  // -- the one backdrop ----------------------------------------------------

  /**
   * Every right-hand panel stands on this, rather than each bringing its own.
   * Two backdrops fading past each other during a switch is exactly the blink
   * the connected panels exist to remove.
   */
  let sharedBackdrop = null;

  function ensureBackdrop() {
    if (typeof document === "undefined" || !(document.body instanceof HTMLElement)) return null;
    if (sharedBackdrop instanceof HTMLElement && sharedBackdrop.isConnected) return sharedBackdrop;
    const existing = document.querySelector("[data-mv-backdrop]");
    if (existing instanceof HTMLElement) {
      sharedBackdrop = existing;
      return sharedBackdrop;
    }
    sharedBackdrop = document.createElement("div");
    sharedBackdrop.className = "mv-backdrop";
    sharedBackdrop.setAttribute("data-mv-backdrop", "");
    sharedBackdrop.setAttribute("aria-hidden", "true");
    sharedBackdrop.addEventListener("click", () => closeAllPanels());
    document.body.appendChild(sharedBackdrop);
    return sharedBackdrop;
  }

  function showBackdrop() {
    const node = ensureBackdrop();
    if (node instanceof HTMLElement) node.classList.add("is-open");
  }

  function hideBackdrop() {
    if (sharedBackdrop instanceof HTMLElement) sharedBackdrop.classList.remove("is-open");
  }

  function finishSwitch() {
    if (switchTimer) window.clearTimeout(switchTimer);
    switchTimer = 0;
    if (switchingOut) {
      switchingOut.entry.close();
      switchingOut.element?.classList.remove("mv-panel-switch-out");
      switchingOut = null;
    }
    document.body?.classList.remove("mv-panel-switching");
  }

  function lockScroll() {
    if (savedBodyOverflow !== null || !document.body) return;
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  function unlockScroll() {
    if (savedBodyOverflow === null || !document.body) return;
    document.body.style.overflow = savedBodyOverflow;
    savedBodyOverflow = null;
  }

  /**
   * `close` is called when something else wants the screen. It must not call
   * back into openPanel/closePanel, or the two would chase each other.
   *
   * `element` returns the panel's own node. The registry needs it to hold a
   * departing panel on screen while it fades, and to find the utility row the
   * indicator travels along, so a right-hand panel that omits it falls back to
   * closing outright.
   */
  function registerPanel(name, { close, element } = {}) {
    if (!name || typeof close !== "function") return;
    registry.set(name, { close, element });
  }

  /** The indicator can only be placed once the panel's row is in the DOM. */
  function markIndicator(name) {
    const read = () => {
      const element = registry.get(name)?.element?.();
      if (element instanceof HTMLElement) syncPanelIndicator(name, element);
    };
    if (typeof window.requestAnimationFrame !== "function") return read();
    window.requestAnimationFrame(read);
  }

  function openPanel(name) {
    const destination = registry.get(name);
    if (!destination) return false;
    const destinationElement = rightPanels.has(name) ? destination.element?.() : null;
    // A backdrop is never allowed to outlive its panel. Callers may create
    // their panel lazily, so validate it before closing the current surface.
    if (rightPanels.has(name) && (!(destinationElement instanceof HTMLElement) || !destinationElement.isConnected)) {
      return false;
    }
    finishSwitch();
    const previous = activePanel;
    const connected = previous && previous !== name && rightPanels.has(previous) && rightPanels.has(name);
    switchFrom = connected ? previous : name;
    registry.forEach((panel, key) => {
      if (key === name) return;
      if (connected && key === previous) {
        const element = panel.element?.();
        if (element instanceof HTMLElement && element.classList.contains("is-open")) {
          element.classList.add("mv-panel-switch-out");
          element.setAttribute("aria-hidden", "true");
          switchingOut = { entry: panel, element };
          return;
        }
      }
      panel.close();
    });
    if (switchingOut) {
      document.body?.classList.add("mv-panel-switching");
      switchTimer = window.setTimeout(finishSwitch, 360);
    }
    // The registry owns the visible state as well as the backdrop and scroll
    // lock. Panel callers may repeat these assignments for their own controls.
    if (destinationElement instanceof HTMLElement) {
      destinationElement.classList.add("is-open");
      destinationElement.setAttribute("aria-hidden", "false");
    }
    activePanel = name;
    lockScroll();
    // The menu brings its own backdrop from the other side of the screen.
    if (rightPanels.has(name)) showBackdrop();
    else hideBackdrop();
    markIndicator(name);
    // A panel's contents are written while it is display:none, where nothing
    // can be measured. Now that it is on screen its underlined links can be
    // found and their rules measured.
    if (destinationElement instanceof HTMLElement) scheduleUnderlines(destinationElement);
    return true;
  }

  function closePanel(name) {
    if (name && activePanel !== name) return;
    finishSwitch();
    activePanel = "";
    unlockScroll();
    hideBackdrop();
  }

  function closeAllPanels() {
    finishSwitch();
    registry.forEach((panel) => panel.close());
    activePanel = "";
    unlockScroll();
    hideBackdrop();
  }

  function getActivePanel() {
    return activePanel;
  }

  // The utility row is delegated once, here, rather than in each panel: the
  // rows are rebuilt on every render and a per-row listener would leak.
  if (typeof document !== "undefined" && typeof document?.addEventListener === "function") {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest("[data-panel-close]")) {
        event.preventDefault();
        closeAllPanels();
        return;
      }
      const wishlistLink = target.closest("[data-panel-wishlist]");
      if (wishlistLink && !event.defaultPrevented && !event.metaKey && !event.ctrlKey &&
          !event.shiftKey && !event.altKey && event.button === 0 &&
          !window.MarvellFavorites?.hasItems?.()) {
        event.preventDefault();
        window.MarvellFavorites?.open?.();
        return;
      }
      if (target.closest("[data-panel-account]")) {
        event.preventDefault();
        window.MarvellAccount?.open?.();
        return;
      }
      if (target.closest("[data-panel-contact]")) {
        event.preventDefault();
        window.MarvellContact?.open?.();
        return;
      }
      // The bag is a page, so this stays a real link — it opens in a new tab,
      // it shows its URL on hover. The one exception is an empty bag: sending
      // somebody to a page that says "nothing here" is worse than saying so
      // where they stand, so an empty bag answers in the panel instead.
      const bagLink = target.closest("[data-panel-bag], [data-bag-link]");
      if (bagLink && !event.defaultPrevented && !event.metaKey && !event.ctrlKey &&
          !event.shiftKey && !event.altKey && event.button === 0 && bagCount() === 0) {
        event.preventDefault();
        window.MarvellBagUi?.open?.();
      }
    });
  }

  // -- the bag -------------------------------------------------------------

  function normaliseLine(line) {
    if (!line || typeof line !== "object") return null;
    const sku = String(line.sku || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{2,6}-[0-9]{2,3}$/.test(sku)) return null;
    const quantity = Number.parseInt(String(line.quantity ?? ""), 10);
    if (!Number.isFinite(quantity) || quantity < 1) return null;
    return { sku, quantity: Math.min(quantity, MAX_QUANTITY) };
  }

  function readBag() {
    try {
      const raw = window.localStorage.getItem(BAG_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];

      const merged = new Map();
      for (const entry of parsed) {
        const line = normaliseLine(entry);
        if (!line) continue;
        const existing = merged.get(line.sku) || 0;
        merged.set(line.sku, Math.min(existing + line.quantity, MAX_QUANTITY));
      }
      return [...merged.entries()]
        .slice(0, MAX_LINES)
        .map(([sku, quantity]) => ({ sku, quantity }));
    } catch (_error) {
      // Private browsing, cleared storage, quota — an empty bag is correct.
      return [];
    }
  }

  /**
   * Persists the bag and announces the change — but only when the contents
   * genuinely differ. Listeners re-price the bag on every change event, and a
   * no-op write that still fired one would let a page refresh itself forever.
   */
  function writeBag(lines) {
    const next = JSON.stringify(lines.slice(0, MAX_LINES));
    let previous = null;

    try {
      previous = window.localStorage.getItem(BAG_KEY);
      window.localStorage.setItem(BAG_KEY, next);
    } catch (_error) {
      // Storage unavailable: the bag lives for this page view only.
    }

    if (previous !== next) notify();
  }

  const listeners = new Set();

  function notify() {
    const lines = readBag();
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    listeners.forEach((listener) => {
      try {
        listener(lines, count);
      } catch (error) {
        console.error("[marvell-shop] bag listener failed", error);
      }
    });
    window.dispatchEvent(new CustomEvent("marvell:bag-change", { detail: { lines, count } }));
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function addToBag(sku, quantity = 1) {
    // Keep the invariant at the storage boundary too: a caller that skips the
    // shared button handler must not create a new line without the answers.
    if (!orderPlanSettled()) return false;
    const line = normaliseLine({ sku, quantity });
    if (!line) return false;

    const lines = readBag();
    const existing = lines.find((entry) => entry.sku === line.sku);

    if (existing) {
      existing.quantity = Math.min(existing.quantity + line.quantity, MAX_QUANTITY);
    } else {
      if (lines.length >= MAX_LINES) return false;
      lines.push(line);
    }

    writeBag(lines);
    markUnseen();
    window.MarvellAnalytics?.track?.("add_to_cart", {}, line.sku);
    return true;
  }

  function setQuantity(sku, quantity) {
    const wanted = String(sku || "").trim().toUpperCase();
    const parsed = Number.parseInt(String(quantity ?? ""), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return removeFromBag(wanted);

    const lines = readBag().map((line) =>
      line.sku === wanted ? { ...line, quantity: Math.min(parsed, MAX_QUANTITY) } : line
    );
    writeBag(lines);
    return true;
  }

  function removeFromBag(sku) {
    const wanted = String(sku || "").trim().toUpperCase();
    writeBag(readBag().filter((line) => line.sku !== wanted));
    window.MarvellAnalytics?.track?.("remove_from_cart", {}, wanted);
    return true;
  }

  function clearBag() {
    writeBag([]);
    clearOrderPlan();
  }

  // -- the order plan ---------------------------------------------------------

  /**
   * When the order is wanted, and how it is to reach whoever it is for.
   *
   * Nothing enters the bag until this is settled. It used to be asked for at
   * the very end, at checkout, which meant a bag could be filled and carried
   * around for days before anyone found out the date was impossible or that
   * the piece could not reach where it was going — the one question that can
   * invalidate the whole order, asked last.
   *
   * It belongs to the bag rather than to a line: a florist takes one order to
   * one place at one time, and checkout has always asked it once. So it is
   * settled once, on the first piece, and every piece after joins that plan.
   * Emptying the bag forgets it, because the next bag is a new order.
   */
  const ORDER_PLAN_KEY = "marvell-order-plan-v1";
  const TIME_WINDOWS = ["morning", "afternoon"];
  const FULFILMENTS = ["delivery", "pickup"];

  function sameDayUnavailable(dateValue, now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", hour12: false
    }).formatToParts(now).map((part) => [part.type, part.value]));
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    return String(dateValue || "").trim() === today && Number.parseInt(parts.hour || "0", 10) >= 16;
  }

  function normaliseOrderPlan(plan) {
    if (!plan || typeof plan !== "object") return null;
    const date = String(plan.date || "").trim();
    const unsure = plan.dateUnsure === true;
    // Either a real date or a stated "not sure yet" — both are answers. An
    // empty date with no such statement is the question going unanswered.
    if (!unsure && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    if (!unsure && sameDayUnavailable(date)) return null;
    const timeWindow = String(plan.timeWindow || "").trim().toLowerCase();
    if (!TIME_WINDOWS.includes(timeWindow)) return null;
    const fulfilment = String(plan.fulfilment || "").trim().toLowerCase();
    if (!FULFILMENTS.includes(fulfilment)) return null;
    return {
      date: unsure ? "" : date,
      dateUnsure: unsure,
      timeWindow,
      fulfilment,
      notes: String(plan.notes || "").trim().slice(0, 1000)
    };
  }

  function readOrderPlan() {
    try {
      const raw = window.localStorage.getItem(ORDER_PLAN_KEY);
      return raw ? normaliseOrderPlan(JSON.parse(raw)) : null;
    } catch (_error) {
      return null;
    }
  }

  function writeOrderPlan(plan) {
    const next = normaliseOrderPlan(plan);
    if (!next) return false;
    try {
      window.localStorage.setItem(ORDER_PLAN_KEY, JSON.stringify(next));
    } catch (_error) {
      // Storage unavailable: the plan lives for this page view only.
    }
    window.dispatchEvent(new CustomEvent("marvell:order-plan-change", { detail: { plan: next } }));
    return true;
  }

  function clearOrderPlan() {
    try {
      window.localStorage.removeItem(ORDER_PLAN_KEY);
    } catch (_error) {
      // Ignore storage failures.
    }
    window.dispatchEvent(new CustomEvent("marvell:order-plan-change", { detail: { plan: null } }));
  }

  function orderPlanSettled() {
    return readOrderPlan() !== null;
  }

  /**
   * The page that can ask the question registers here.
   *
   * Only a product page carries the Order details step, so the bag cannot open
   * it itself. A page that has one says so; a page that has not simply cannot
   * add to the bag, which is correct — there is nothing there to add.
   */
  let orderPlanCollector = null;

  function registerOrderPlanCollector(collect) {
    orderPlanCollector = typeof collect === "function" ? collect : null;
  }

  /** Whether this page can ask at all, as against having been told no. */
  function canCollectOrderPlan() {
    return orderPlanCollector !== null;
  }

  /** Resolves true once a plan is settled, false if the question was dropped. */
  async function requestOrderPlan() {
    if (orderPlanSettled()) return true;
    if (!orderPlanCollector) return false;
    try {
      await orderPlanCollector();
    } catch (_error) {
      return false;
    }
    return orderPlanSettled();
  }

  function bagCount() {
    return readBag().reduce((sum, line) => sum + line.quantity, 0);
  }

  function markUnseen() {
    try {
      window.localStorage.setItem(BAG_UNSEEN_KEY, "true");
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  function markSeen() {
    try {
      window.localStorage.setItem(BAG_UNSEEN_KEY, "false");
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  function hasUnseen() {
    try {
      return window.localStorage.getItem(BAG_UNSEEN_KEY) === "true";
    } catch (_error) {
      return false;
    }
  }

  // -- server calls --------------------------------------------------------

  async function postJson(endpoint, payload) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload)
    });

    let data = null;
    try {
      data = await response.json();
    } catch (_error) {
      data = null;
    }

    if (!data) {
      return {
        ok: false,
        code: "server_error",
        message: t(
          "Something went wrong. Please try again.",
          "Terjadi kesalahan. Silakan coba lagi."
        )
      };
    }
    return data;
  }

  /**
   * Asks the server what the bag is actually worth. The response is the only
   * source of prices and totals shown anywhere in the cart or checkout.
   */
  async function validateBag({ deliveryMethod = "pickup" } = {}) {
    const lines = readBag();
    if (!lines.length) {
      return { ok: true, lines: [], corrections: [], subtotal_idr: 0, delivery_fee_idr: 0, total_idr: 0 };
    }
    return postJson("/api/cart/validate", { items: lines, delivery_method: deliveryMethod });
  }

  /**
   * Applies the server's corrections to local storage, so the bag the shopper
   * carries matches the bag the server will honour.
   */
  function applyCorrections(corrections) {
    if (!Array.isArray(corrections) || !corrections.length) return false;

    const before = JSON.stringify(readBag());

    corrections.forEach((correction) => {
      if (!correction?.sku) return;
      if (correction.type === "removed") {
        removeFromBag(correction.sku);
      } else if (correction.type === "quantity_reduced" && correction.quantity) {
        setQuantity(correction.sku, correction.quantity);
      }
    });

    // Compare the result rather than trusting that each correction did
    // something: re-applying a correction already applied is a no-op, and
    // reporting it as a change would send the caller round again.
    return JSON.stringify(readBag()) !== before;
  }

  /* --------------------------------------------------------------------
     Finding the links that should retrace.

     The site has around forty places where a link is underlined at rest —
     in the footer, the legal pages, the bag, the account, the wishlist, the
     reviews. Styling each by hand means the next one added is flat again,
     so the sheet describes the effect and this finds the elements: anything
     link-shaped whose underline is already there before the pointer is.

     Two things are measured rather than assumed.

     The rule is as wide as the text. A link is often a block or a flex item
     much wider than its words, and a rule to the edge of that box reads as
     a divider, so the text is measured with a Range and published as
     --mv-underline-w / --mv-underline-x.

     A link that wraps is left alone. One absolutely positioned rule cannot
     follow two line boxes, so a wrapped link keeps its plain underline —
     and because the check runs again after a resize, one that starts
     wrapping later gets it back.
     -------------------------------------------------------------------- */
  const UNDERLINE_SELECTOR = "a, button, summary, [role='link'], [role='button']";

  /** Where the words are, inside a box that may be much wider than them. */
  function textRect(node) {
    try {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      range.detach?.();
      return rect;
    } catch (_error) {
      return null;
    }
  }

  function measureUnderline(node) {
    const box = node.getBoundingClientRect();
    const text = textRect(node);
    if (!text || !text.width || !box.width || Math.abs(text.width - box.width) <= 1.5) {
      node.style.removeProperty("--mv-underline-w");
      node.style.removeProperty("--mv-underline-x");
      return;
    }
    node.style.setProperty("--mv-underline-w", `${Math.round(text.width)}px`);
    node.style.setProperty("--mv-underline-x", `${Math.round(text.left - box.left)}px`);
  }

  /**
   * Whether one rule can stand for this element's words.
   *
   * Three ways it cannot, each seen in the wild:
   *
   *   an image link   an <a> around a photograph and nothing else. The UA
   *                   sheet underlines every anchor, so without this a blue
   *                   rule was drawn straight across the photograph.
   *   a card          an <a> around a picture and a name and a price. One
   *                   rule under "all of that" is not an underline.
   *   a wrapped link  two line boxes, one absolutely positioned rule. Note
   *                   that a block-level link that wraps still reports a
   *                   single client rect, so the text is measured instead.
   */
  function underlineFits(node, styles) {
    if (!node.textContent || !node.textContent.trim()) return false;
    if (node.querySelector?.("img, svg, picture, video, canvas, figure")) return false;
    if (typeof node.getClientRects === "function" && node.getClientRects().length !== 1) return false;
    const text = textRect(node);
    if (!text || !text.width) return false;
    const size = parseFloat(styles.fontSize) || 16;
    const line = parseFloat(styles.lineHeight) || size * 1.4;
    return text.height <= Math.max(line, size) * 1.6;
  }

  function adoptUnderlines(scope = document) {
    if (typeof document === "undefined" || typeof window.getComputedStyle !== "function") return;
    let nodes;
    try {
      nodes = scope?.querySelectorAll?.(UNDERLINE_SELECTOR);
    } catch (_error) {
      return;
    }
    if (!nodes) return;
    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      // An opt-out for anywhere this would be wrong, and a way to hand-apply
      // the class without this pass ever taking it away again.
      if (node.dataset.mvUnderline === "off") return;
      const mine = node.dataset.mvUnderline === "auto";
      if (node.classList.contains("mv-underline") && !mine) return;
      const styles = window.getComputedStyle(node);
      if (mine) {
        // Re-checked rather than trusted: a resize can make a link wrap, and
        // a rule that no longer fits gives its element back its own.
        if (!underlineFits(node, styles)) {
          node.classList.remove("mv-underline");
          delete node.dataset.mvUnderline;
          node.style.removeProperty("--mv-underline-w");
          node.style.removeProperty("--mv-underline-x");
          return;
        }
        measureUnderline(node);
        return;
      }
      if (styles.visibility === "hidden" || styles.display === "none") return;
      // The class sets position:relative so the rule can be placed against
      // the element. Taking a positioned element off its own coordinates
      // would move it, so those are left alone.
      if (styles.position !== "static" && styles.position !== "relative") return;
      const decoration = String(styles.textDecorationLine || styles.textDecoration || "");
      if (!/\bunderline\b/.test(decoration)) return;
      if (!underlineFits(node, styles)) return;
      node.dataset.mvUnderline = "auto";
      node.classList.add("mv-underline");
      measureUnderline(node);
    });
  }

  let underlineTimer = 0;
  function scheduleUnderlines(scope) {
    if (typeof window.setTimeout !== "function") return;
    window.clearTimeout(underlineTimer);
    underlineTimer = window.setTimeout(() => adoptUnderlines(scope), 120);
  }

  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    const sweep = () => adoptUnderlines(document);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", sweep, { once: true });
    } else {
      sweep();
    }
    // Again once the fonts and stylesheets have settled: a rule measured
    // against a fallback face is a rule of the wrong width.
    window.addEventListener("load", sweep, { once: true });
    document.fonts?.ready?.then?.(sweep).catch?.(() => {});
    window.addEventListener("resize", () => scheduleUnderlines(document));
  }

  // Another tab changed the bag.
  window.addEventListener("storage", (event) => {
    if (event.key === BAG_KEY) notify();
  });

  subscribe(() => syncUtilityRows());

  window.MarvellShop = {
    t,
    getLanguage,
    escapeHtml,
    safeImage,
    paragraphs,
    formatIdr,
    getCatalog,
    getShopProducts,
    findProductBySlug,
    findProductBySku,
    validateBag,
    applyCorrections,
    postJson,
    injectPanelStyles,
    adoptUnderlines,
    utilityRowMarkup,
    syncUtilityRows,
    syncPanelIndicator,
    registerPanel,
    ensureBackdrop,
    openPanel,
    closePanel,
    closeAllPanels,
    getActivePanel,
    BAG_PAGE,
    MAX_QUANTITY
  };

  // Several panel modules are loaded before this file on some pages, because
  // their <script> tags predate it. They wait for this rather than assuming
  // the order, and the order stays free to change.
  if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
    const announce = () => window.dispatchEvent(new CustomEvent("marvell:shop-ready"));
    // A turn of the loop, so listeners registered by the rest of this file's
    // own boot are in place first. The checks run this module against a stub
    // browser with no timers, where announcing straight away is correct.
    if (typeof window.setTimeout === "function") window.setTimeout(announce, 0);
    else announce();
  }

  window.MarvellBag = {
    readOrderPlan,
    writeOrderPlan,
    clearOrderPlan,
    orderPlanSettled,
    canCollectOrderPlan,
    registerOrderPlanCollector,
    requestOrderPlan,
    read: readBag,
    add: addToBag,
    setQuantity,
    remove: removeFromBag,
    clear: clearBag,
    count: bagCount,
    subscribe,
    markSeen,
    markUnseen,
    hasUnseen,
    notify
  };
})();
