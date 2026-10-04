/**
 * Marvell Bag — the header launcher, the bag quick panel, and the controls
 * the bag page is driven by.
 *
 * The bag is a page. /bag.html is where a bag is read before money changes
 * hands — quantities, a gift message, a subtotal, and the pieces saved for
 * later underneath it — and the header's bag icon is a real link to it.
 *
 * The quick panel exists for the two moments the page would be the wrong
 * answer:
 *
 *   EMPTY       clicking through to a page that says "nothing here" is worse
 *               than saying so where the shopper stands.
 *   JUST ADDED  confirming an add and offering checkout, without taking them
 *               off the piece they were looking at.
 *
 * Any other click goes to the page. There is still only one bag: the panel
 * shows what was just added and what the page will show, and never prices
 * anything itself — every figure comes from /api/cart/validate.
 */
(function () {
  if (typeof window === "undefined") return;
  if (window.MarvellBagUi) return;

  const Shop = window.MarvellShop;
  const Bag = window.MarvellBag;
  if (!Shop || !Bag) {
    console.warn("[marvell-cart] marvell-shop.js must load first");
    return;
  }

  const { t, escapeHtml } = Shop;
  const BAG_PAGE = Shop.BAG_PAGE || "/bag.html";

  let launcher = document.querySelector(".bag-launcher");
  let panel = null;
  let lastFocused = null;

  // -- styles --------------------------------------------------------------

  function injectStyles() {
    Shop.injectPanelStyles();
    if (document.getElementById("marvell-cart-styles")) return;

    const style = document.createElement("style");
    style.id = "marvell-cart-styles";
    style.textContent = `
      /* Header launcher.
         Sized, coloured and eased exactly like .search-toggle and
         .menu-toggle in assets/header-template.js, so the bag reads as one of
         the header's own controls rather than something bolted on. Colour is
         inherited through currentColor, which is what lets it cross-fade with
         the rest of the header over a hero image. */
      .bag-launcher {
        position: relative;
        z-index: 6;
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
        margin-left: 0;
        /* menu 1 | search 2 | wishlist 3 | account 4 | contact 5 | BAG 6 */
        order: 6;
      }
      .bag-launcher-btn {
        position: relative;
        min-height: 0;
        border-radius: 0;
        border: 0;
        background: transparent;
        color: rgba(42, 33, 24, 0.82);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        cursor: pointer;
        font: inherit;
        line-height: 1;
        transition: opacity 0.2s ease, color 0.45s ease;
      }
      .bag-launcher-btn svg {
        width: 20px;
        height: 20px;
        display: block;
        stroke: currentColor;
        fill: none;
        /* The family's own weight, which is what the panel row draws at. The
           header used to be a heavier 2, so the same glyph was two different
           icons depending on where you saw it. */
        stroke-width: 1.25;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .bag-launcher-btn:hover,
      .bag-launcher-btn:focus-visible {
        opacity: 0.72;
        outline: none;
      }
      /* Over a hero image the header goes pale; the bag goes with it. */
      body.desktop-header-hero-mode .bag-launcher-btn {
        color: rgba(242, 236, 224, 0.96);
      }
      /* Plain currentColor numerals rather than a filled pill, so the count
         inherits every colour change the header makes. */
      .bag-launcher-count {
        position: absolute;
        top: -3px;
        right: -5px;
        font-family: "Inter Tight", sans-serif;
        font-size: 9px;
        font-weight: 600;
        line-height: 1;
        letter-spacing: 0;
        color: currentColor;
        display: none;
      }
      .bag-launcher-btn.has-items .bag-launcher-count {
        display: block;
      }
      .bag-launcher-count::after {
        content: attr(data-count);
      }

      /* The quantity, remove and stock controls below are shared with the bag
         page, which renders its own lines and delegates their clicks here. */
      .bag-line-controls {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .bag-qty {
        display: inline-flex;
        align-items: center;
        border: 1px solid rgba(29, 26, 24, 0.18);
      }
      .bag-qty button {
        width: 30px;
        height: 30px;
        border: 0;
        background: transparent;
        color: #1d1a18;
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        line-height: 1;
        cursor: pointer;
        transition: opacity 0.2s ease;
      }
      .bag-qty button:hover:not(:disabled) { opacity: 0.6; }
      .bag-qty button:disabled { opacity: 0.28; cursor: not-allowed; }
      .bag-qty-value {
        min-width: 28px;
        text-align: center;
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        color: #1d1a18;
        font-variant-numeric: tabular-nums;
      }
      .bag-line-flag {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 13px;
        line-height: 1.5;
        color: #8a5a3b;
      }
      /* The bag quick panel. Chrome from .mv-panel in marvell-shop.js. */
      .mv-panel--bag .mv-panel-body {
        padding: clamp(34px, 5vw, 56px) clamp(26px, 5vw, 56px) clamp(24px, 3vw, 34px) !important;
        gap: 0 !important;
        align-content: start !important;
      }
      .bag-panel-added {
        display: grid;
        gap: 10px;
      }
      .bag-panel-added .mv-eyebrow { margin-bottom: 4px; }
      .bag-panel-line {
        display: grid;
        grid-template-columns: clamp(84px, 20%, 132px) minmax(0, 1fr);
        gap: clamp(16px, 2.4vw, 26px);
        align-items: center;
        margin-top: 18px;
        padding-top: 22px;
        border-top: 1px solid rgba(29, 26, 24, 0.08);
      }
      .bag-panel-line-media {
        aspect-ratio: 4 / 5;
        overflow: hidden;
        background: rgba(29, 26, 24, 0.05);
      }
      .bag-panel-line-media img { width: 100%; height: 100%; display: block; object-fit: cover; }
      .bag-panel-empty {
        display: grid;
        justify-items: center;
        align-content: center;
        gap: 18px;
        text-align: center;
        min-height: 42vh;
      }
      .bag-panel-empty p { margin: 0; }
      .bag-panel-empty .mv-body-text { max-width: 34ch; }
      .bag-panel-link {
        border: 0;
        padding: 0;
        background: transparent;
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        color: #1d1a18;
        text-decoration: underline;
        text-underline-offset: 0.28em;
        text-decoration-thickness: 1px;
        cursor: pointer;
        transition: opacity 0.2s ease;
      }
      .bag-panel-link:hover,
      .bag-panel-link:focus-visible { opacity: 0.6; outline: none; }
      .mv-panel--bag .mv-panel-foot { justify-items: stretch; }
      .mv-panel--bag .mv-panel-foot .bag-panel-link { justify-self: center; }

      /* Add to Bag, used on product cards and product pages. */
      .bag-add-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 15px 24px;
        border: 1px solid #111;
        background: #111;
        color: #fff;
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease, opacity 0.2s ease;
      }
      .bag-add-btn:hover:not(:disabled) { background: #000; border-color: #000; }
      .bag-add-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      .bag-add-btn.is-secondary {
        background: transparent;
        color: #1d1a18;
        border-color: rgba(29, 26, 24, 0.24);
      }
      .bag-add-btn.is-secondary:hover:not(:disabled) {
        background: #111;
        color: #fff;
        border-color: #111;
      }

      @media (max-width: 768px) {
        /* Mobile header order: logo 1 | lang 2 | wishlist 3 | BAG 3 | search 4 | menu 5.
           Tied with the wishlist at 3, so DOM order keeps bag after heart. */
        .bag-launcher { order: 3; }
        .bag-launcher-btn { width: 22px; height: 22px; }
      }
    `;
    document.head.appendChild(style);
  }

  // -- scaffolding ---------------------------------------------------------

  function ensureUi() {
    if (!(document.body instanceof HTMLElement)) return;
    injectStyles();

    if (!(launcher instanceof HTMLElement)) {
      launcher = document.createElement("div");
      launcher.className = "bag-launcher";
      // A link, not a button: the bag is a page, and it should middle-click,
      // open in a new tab and show its URL on hover like any other.
      //
      // The glyph here is a placeholder: marvell-icons.js replaces it with the
      // family's bag, and its apply() needs an <svg> already in place to swap.
      launcher.innerHTML = `
        <a class="bag-launcher-btn" href="${escapeHtml(BAG_PAGE)}" data-bag-link
           aria-label="${escapeHtml(t("View bag", "Lihat tas"))}">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
            <path d="M3 6h18"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <span class="bag-launcher-count" data-count="0"></span>
        </a>
      `;
    }
    placeLauncher();

    if (!(panel instanceof HTMLElement)) {
      panel = document.createElement("aside");
      panel.className = "mv-panel mv-panel--bag mv-panel--with-foot";
      panel.id = "marvell-bag-panel";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-hidden", "true");
      panel.setAttribute("aria-label", t("Shopping Bag", "Tas Belanja"));
      document.body.appendChild(panel);
      Shop.ensureBackdrop?.();
      Shop.registerPanel?.("bag", { close: closeQuietly, element: () => panel });
    }
    bindEvents();
  }

  /**
   * Sits immediately after the wishlist heart, in the header's right-hand
   * cluster. Flex order does the real positioning (order 6, after the account
   * at 4); DOM order only breaks the tie on mobile, where the heart and the
   * bag share order 3.
   */
  function placeLauncher() {
    if (!(launcher instanceof HTMLElement)) return;
    // The observer below can fire during page teardown, when the document is
    // already gone.
    if (typeof document === "undefined" || !document?.querySelector) return;

    const favouritesLauncher = document.querySelector(".favorites-launcher");
    if (favouritesLauncher instanceof HTMLElement && favouritesLauncher.parentNode) {
      if (favouritesLauncher.nextElementSibling !== launcher) {
        favouritesLauncher.parentNode.insertBefore(launcher, favouritesLauncher.nextSibling);
      }
      return;
    }

    // No wishlist on this page: fall back to the header bar itself, where the
    // flex order still places the bag correctly.
    const headerBar = document.querySelector(".header-bar");
    if (headerBar instanceof HTMLElement && launcher.parentNode !== headerBar) {
      headerBar.appendChild(launcher);
    }
  }

  // -- rendering -----------------------------------------------------------

  function syncLauncher() {
    if (!(launcher instanceof HTMLElement)) return;
    const button = launcher.querySelector(".bag-launcher-btn");
    const count = Bag.count();
    if (!(button instanceof HTMLElement)) return;

    button.classList.toggle("has-items", count > 0);
    const badge = button.querySelector(".bag-launcher-count");
    if (badge instanceof HTMLElement) badge.dataset.count = String(count);
    button.setAttribute(
      "aria-label",
      count === 1
        ? t("Shopping bag, 1 piece", "Tas belanja, 1 rangkaian")
        : t(`Shopping bag, ${count} pieces`, `Tas belanja, ${count} rangkaian`)
    );
  }

  // -- the quick panel -----------------------------------------------------

  /**
   * What the panel says when the bag is empty. Not an apology — the two
   * places worth going next, and the note that a bag kept in this browser is
   * kept in this browser only.
   */
  function emptyMarkup() {
    return `
      ${Shop.utilityRowMarkup?.("bag") || ""}
      <div class="mv-panel-body">
        <div class="bag-panel-empty">
          <p class="mv-title">${escapeHtml(t("Your bag is empty", "Tas Anda masih kosong"))}</p>
          <p class="mv-body-text">${escapeHtml(t(
            "Pieces you add are held here until you are ready. Nothing is reserved until an order is placed.",
            "Rangkaian yang Anda tambahkan tersimpan di sini sampai Anda siap. Tidak ada yang ditahan sebelum pesanan dibuat."
          ))}</p>
          <a class="bag-panel-link" href="/featured">${escapeHtml(t("Browse collections", "Lihat koleksi"))}</a>
        </div>
      </div>
      <div class="mv-panel-foot">
        <button class="bag-panel-link" type="button" data-panel-wishlist>${escapeHtml(
          t("See your saved pieces", "Lihat simpanan Anda")
        )}</button>
      </div>
    `;
  }

  /**
   * What the panel says the moment something goes in: the confirmation, and
   * the one button that follows from it. That button is the gallery's Apply
   * Filters button — the site's single "and now do it" control — rather than
   * a second black rectangle of its own.
   */
  function addedMarkup(name, image) {
    const count = Bag.count();
    const safe = Shop.safeImage(image);
    return `
      ${Shop.utilityRowMarkup?.("bag") || ""}
      <div class="mv-panel-body">
        <div class="bag-panel-added">
          <p class="mv-eyebrow">${escapeHtml(t("Added to bag", "Ditambahkan ke tas"))}</p>
          <div class="bag-panel-line">
            <div class="bag-panel-line-media">
              ${safe ? `<img src="${escapeHtml(safe)}" alt="" loading="lazy" decoding="async">` : ""}
            </div>
            <div>
              <p class="mv-item-name">${escapeHtml(name)}</p>
              <p class="mv-meta">${escapeHtml(
                count === 1
                  ? t("1 piece in your bag", "1 rangkaian di tas Anda")
                  : t(`${count} pieces in your bag`, `${count} rangkaian di tas Anda`)
              )}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="mv-panel-foot">
        <a class="mv-cta mv-cta--apply" href="/checkout.html">${escapeHtml(t("Checkout", "Checkout"))}</a>
        <a class="bag-panel-link" href="${escapeHtml(BAG_PAGE)}">${escapeHtml(t("View bag", "Lihat tas"))}</a>
      </div>
    `;
  }

  /** The registry's hook: close without touching the shared lock or backdrop. */
  function closeQuietly() {
    if (!(panel instanceof HTMLElement)) return;
    if (!panel.classList.contains("is-open")) return;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
  }

  function showPanel(markup) {
    ensureUi();
    if (!(panel instanceof HTMLElement)) return;
    lastFocused = document.activeElement;
    panel.innerHTML = markup;
    window.MarvellIcons?.adopt?.(panel);
    Shop.openPanel?.("bag");
    Shop.syncUtilityRows?.();
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    panel.querySelector(".mv-panel-utility-close")?.focus?.();
  }

  function hidePanel() {
    if (!(panel instanceof HTMLElement) || !panel.classList.contains("is-open")) return;
    closeQuietly();
    Shop.closePanel?.("bag");
    if (lastFocused instanceof HTMLElement && document.contains(lastFocused)) lastFocused.focus?.();
  }

  /** Says the bag is empty where the shopper stands, rather than as a page. */
  function showEmpty() {
    showPanel(emptyMarkup());
  }

  /** Confirms an add and offers checkout, without leaving the page. */
  function showAdded(name, image) {
    showPanel(addedMarkup(name, image));
  }

  // -- events --------------------------------------------------------------

  /**
   * One delegated listener on the body, bound once.
   *
   * The bag page renders its own lines and relies on these handlers, so the
   * quantity and remove controls behave identically wherever they appear.
   * Mutating the bag fires marvell:bag-change, which is what the page listens
   * to in order to re-price itself — nothing here re-renders anything.
   */
  function bindEvents() {
    if (document.body.dataset.bagBound === "1") return;
    document.body.dataset.bagBound = "1";

    document.body.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest("[data-bag-close]")) {
        event.preventDefault();
        hidePanel();
        return;
      }

      // The site's own "open the bag" trigger. Empty, it answers in the panel;
      // with something in it, the bag is a page and this goes there.
      const open = target.closest("[data-bag-open]");
      if (open) {
        event.preventDefault();
        openBag();
        return;
      }

      const add = target.closest("[data-bag-add]");
      if (add instanceof HTMLElement) {
        event.preventDefault();
        handleAdd(add);
        return;
      }

      const increase = target.closest("[data-bag-increase]");
      if (increase instanceof HTMLElement) {
        event.preventDefault();
        stepQuantity(increase.dataset.bagIncrease, 1);
        return;
      }

      const decrease = target.closest("[data-bag-decrease]");
      if (decrease instanceof HTMLElement) {
        event.preventDefault();
        stepQuantity(decrease.dataset.bagDecrease, -1);
        return;
      }

      const remove = target.closest("[data-bag-remove]");
      if (remove instanceof HTMLElement) {
        event.preventDefault();
        Bag.remove(remove.dataset.bagRemove);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") hidePanel();
    });
  }

  /**
   * Steps a line's quantity. The current value is read from the bag rather
   * than from the last server response, so the controls stay correct even if
   * a re-price is still in flight.
   */
  function stepQuantity(sku, step) {
    const wanted = String(sku || "").trim().toUpperCase();
    if (!wanted) return;

    const current = Bag.read().find((line) => line.sku === wanted)?.quantity || 1;
    const next = current + step;

    if (next < 1) Bag.remove(wanted);
    else Bag.setQuantity(wanted, next);
  }

  /**
   * Adds from a button carrying data-bag-add="SKU" and data-bag-name.
   * The name and image are shown in the panel only; the server decides
   * everything else — price, stock, and whether the add stands at all.
   */
  async function handleAdd(button) {
    const sku = String(button.dataset.bagAdd || "").trim();
    if (!sku) return;

    const quantityField = button.dataset.bagQuantityField
      ? document.querySelector(button.dataset.bagQuantityField)
      : null;
    const quantity = quantityField
      ? Number.parseInt(String(quantityField.value || "1"), 10) || 1
      : 1;

    // Nothing reaches the bag before the order is settled: when it is wanted,
    // and whether it is delivered or collected. The product page opens its
    // Order details step here and this waits; if the question is closed rather
    // than answered, nothing is added and the shopper is where they were.
    if (!Bag.orderPlanSettled?.()) {
      // A page with no Order details step of its own cannot ask, so say so
      // rather than letting the button do nothing. Silence here would read as
      // a broken button, which is worse than an answer.
      if (!Bag.canCollectOrderPlan?.()) {
        showPanel(`
          ${Shop.utilityRowMarkup?.("bag") || ""}
          <div class="mv-panel-body">
            <div class="mv-note">${escapeHtml(t(
              "Tell us when this is wanted before it goes in your bag.",
              "Beri tahu kami kapan ini dibutuhkan sebelum masuk ke tas Anda."
            ))}</div>
          </div>
          <div class="mv-panel-foot">
            <a class="mv-cta mv-cta--apply" href="${escapeHtml(BAG_PAGE)}">${escapeHtml(
              t("View bag", "Lihat tas")
            )}</a>
          </div>
        `);
        return;
      }
      const settled = await Bag.requestOrderPlan?.();
      if (!settled) return;
    }

    if (!Bag.add(sku, quantity)) {
      showPanel(`
        ${Shop.utilityRowMarkup?.("bag") || ""}
        <div class="mv-panel-body">
          <div class="mv-note mv-note--alert">${escapeHtml(
            t("Your bag is full.", "Tas Anda sudah penuh.")
          )}</div>
        </div>
        <div class="mv-panel-foot">
          <a class="mv-cta mv-cta--apply" href="${escapeHtml(BAG_PAGE)}">${escapeHtml(
            t("View bag", "Lihat tas")
          )}</a>
        </div>
      `);
      return;
    }

    showAdded(
      String(button.dataset.bagName || "").trim() || sku,
      String(button.dataset.bagImage || "").trim()
    );
  }

  // -- boot ----------------------------------------------------------------

  function boot() {
    ensureUi();
    syncLauncher();
    Bag.subscribe(() => syncLauncher());

    // The header is injected asynchronously on most pages; re-place when it lands.
    if (typeof MutationObserver === "function") {
      const observer = new MutationObserver(() => placeLauncher());
      observer.observe(document.body, { childList: true, subtree: true });
      window.setTimeout(() => observer.disconnect(), 8000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /**
   * The one rule for "open the bag": a bag with something in it is a page, an
   * empty one is a sentence in a panel. Everything that opens the bag — the
   * header icon, the utility row, a [data-bag-open] anywhere — comes through
   * here, so the two can never disagree.
   */
  function openBag() {
    if (Bag.count() > 0) {
      hidePanel();
      window.location.href = BAG_PAGE;
      return;
    }
    showEmpty();
  }

  window.MarvellBagUi = {
    open: openBag,
    /** Announces an add. Kept under its old name for existing callers. */
    toast: showAdded,
    showAdded,
    showEmpty,
    close: hidePanel,
    isOpen: () => panel instanceof HTMLElement && panel.classList.contains("is-open"),
    syncLauncher
  };
})();
