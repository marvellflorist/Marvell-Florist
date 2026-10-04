/**
 * The contact quick panel.
 *
 * One of the right-hand quick panels, and built like the rest of them: the
 * ground, the travel, the close, the backdrop and the utility row come from
 * .mv-panel in assets/marvell-shop.js. Contact shows a single list of links.
 *
 * Because it is registered with the panel registry, moving between this and
 * the wishlist, account, updates or the bag cross-fades in place — the
 * panel stays where it is, its contents change, and the little rule under the
 * icons slides to say where you are.
 *
 * The block order is fixed: assets/site-language.js translates links by
 * position.
 */
(function () {
  if (typeof document === "undefined") return;

  /**
   * This file's <script> tag comes before marvell-shop.js on about half the
   * site's pages, and the panel is built from marvell-shop's chrome. Rather
   * than reorder twenty documents — and rely on nobody reordering them back —
   * the panel waits for the shop to announce itself, with the DOM being ready
   * as the backstop.
   */
  function whenReady(run) {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      run();
    };
    const ready = () => {
      if (window.MarvellShop) return go();
      window.addEventListener("marvell:shop-ready", go, { once: true });
      // If marvell-shop.js is not on this page at all, the panel is still
      // better built late than not at all.
      window.setTimeout(go, 3000);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ready, { once: true });
    } else {
      ready();
    }
  }

  function start() {
  const triggers = Array.from(document.querySelectorAll(".header-contact"));
  const existingPanel = document.getElementById("contact-quick-panel");
  if (!triggers.length && !(existingPanel instanceof HTMLElement)) return;

  const Shop = window.MarvellShop;
  const t = Shop
    ? Shop.t
    : (en, id) => (window.MarvellLanguage?.getLanguage?.() === "id" ? id : en);

  Shop?.injectPanelStyles?.();

  const styleId = "shared-contact-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .header-contact,
      .contact-quick-trigger {
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 0 !important;
        line-height: 1.1 !important;
        text-shadow: none !important;
        color: #35383a !important;
        text-decoration: none !important;
        font-family: "Inter Tight", sans-serif !important;
        font-size: 12px !important;
        font-weight: 400 !important;
        letter-spacing: 0.06em !important;
        text-transform: none !important;
        background: none !important;
        border: 0 !important;
        cursor: pointer !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        transition: color 0.45s ease, opacity 0.2s ease !important;
        appearance: none;
        -webkit-appearance: none;
      }
      .header-contact::after,
      .contact-quick-trigger::after {
        content: none !important;
      }
      .header-contact::before,
      .contact-quick-trigger::before { content: none !important; }
      .contact-quick-icon { display: inline-flex; width: 20px; height: 20px; align-items: center; justify-content: center; }
      .contact-quick-icon svg { display: block; width: 20px; height: 20px; stroke: currentColor; }
      body.desktop-header-hero-mode .header-bar .contact-quick-trigger,
      body.desktop-header-hero-mode .header-bar .contact-quick-trigger:hover,
      body.desktop-header-hero-mode .header-bar .contact-quick-trigger:focus-visible { color: #fff !important; }
      .header-contact:hover,
      .header-contact:focus-visible,
      .contact-quick-trigger:hover,
      .contact-quick-trigger:focus-visible {
        color: #35383a !important;
        opacity: 0.84 !important;
        transform: none !important;
        outline: none !important;
        text-decoration: none !important;
      }

      /* A single list, with the same row rhythm as the menu. */
      #contact-quick-panel .mv-panel-body {
        padding: 0 !important;
        gap: 0 !important;
      }
      #contact-quick-panel .contact-quick-head {
        display: block !important;
        padding: clamp(40px, 7vw, 76px) clamp(26px, 5vw, 56px) clamp(30px, 5vw, 52px);
      }
      #contact-quick-panel .contact-quick-head h2 {
        margin: 0;
        font-family: "AdelioDisplayCondensed", "Inter Tight", sans-serif;
        font-size: clamp(25px, 2.5vw, 33px);
        font-weight: 300;
        line-height: 1.12;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #1d1a18;
      }
      #contact-quick-panel .contact-quick-head p {
        margin: 14px 0 0;
        font: 400 14px/1.62 "Inter Tight", sans-serif;
        color: rgba(29, 26, 24, .58);
      }
      #contact-quick-panel .contact-quick-body {
        display: grid !important;
        gap: 0 !important;
        align-content: start !important;
        padding: 0 !important;
        border-top: 1px solid rgba(29, 26, 24, .1);
      }
      #contact-quick-panel .contact-quick-block {
        display: grid;
        gap: 0 !important;
        padding: clamp(24px, 3.4vw, 32px) clamp(26px, 5vw, 56px);
        border-bottom: 1px solid rgba(29, 26, 24, .1);
      }
      #contact-quick-panel .contact-quick-label {
        margin: 0 0 12px;
        color: #1d1a18;
        font: 300 14px/1.25 "AdelioDisplayCondensed", sans-serif;
        letter-spacing: .035em;
        text-transform: uppercase;
      }
      #contact-quick-panel .contact-quick-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        text-decoration: none;
        font-family: "Inter Tight", sans-serif;
        font-size: 16px;
        font-weight: 400;
        line-height: 1.4;
        min-height: 44px;
        width: 100%;
        margin: 0 !important;
        color: rgba(29, 26, 24, .82);
        transition: color .3s ease;
      }
      #contact-quick-panel .contact-quick-link::after {
        content: "\\203A";
        display: block;
        position: static !important;
        left: auto;
        bottom: auto;
        width: auto;
        height: auto;
        margin-left: 12px;
        background: none !important;
        opacity: .76;
        font-size: 23px;
        font-weight: 600;
        text-decoration: none !important;
        transform: none;
        transition: opacity .3s ease, transform .3s ease;
      }
      #contact-quick-panel .contact-quick-link:hover,
      #contact-quick-panel .contact-quick-link:focus-visible {
        color: #1d1a18;
        text-decoration: none !important;
        outline: none;
      }
      #contact-quick-panel .contact-quick-link:hover::after,
      #contact-quick-panel .contact-quick-link:focus-visible::after {
        opacity: 1;
        transform: translateX(3px);
      }
      @media (max-width: 768px) {
        /* Not in the masthead on a phone. Contact Us is in the menu there, at
           the bottom of the list, and the menu opens it in place.
           assets/header-template.js already says this — but the rule at the
           top of THIS stylesheet turns the control back on with an !important
           of its own, and this sheet is injected second, so it was winning and
           the control was showing on every phone. It is said here as well, so
           whichever of the two lands last, the answer is the same. */
        .header-contact,
        .contact-quick-trigger {
          display: none !important;
          gap: 0 !important;
        }
        #contact-quick-panel .contact-quick-block { padding-left: 16px; padding-right: 16px; }
      }
    `;
    document.head.appendChild(style);
  }

  function panelMarkup() {
    const utility = Shop?.utilityRowMarkup?.("contact") || "";
    return `
      ${utility}
      <div class="mv-panel-body">
        <div class="contact-quick-head">
          <h2 id="contact-quick-title">${t("Contact Us", "Hubungi Kami")}</h2>
          <p>${t("We are here to help you.", "Kami siap membantu Anda.")}</p>
        </div>
        <div class="contact-quick-body">
        <div class="contact-quick-block">
          <p class="contact-quick-label">${t("WhatsApp Enquiries", "Pertanyaan WhatsApp")}</p>
          <a class="contact-quick-link" href="https://wa.me/6281275017456" target="_blank" rel="noopener noreferrer">Rangkaian Bunga</a>
          <a class="contact-quick-link" href="https://wa.me/628116667457" target="_blank" rel="noopener noreferrer">Pesanan Kustom</a>
          <a class="contact-quick-link" href="https://wa.me/628116667920" target="_blank" rel="noopener noreferrer">Perlengkapan</a>
        </div>
        <div class="contact-quick-block">
          <p class="contact-quick-label">${t("Our Locations", "Lokasi Kami")}</p>
          <a class="contact-quick-link" href="https://maps.app.goo.gl/PL8EQ7C1mVJAoa3LA?g_st=ic" target="_blank" rel="noopener noreferrer">Rangkaian</a>
          <a class="contact-quick-link" href="https://maps.app.goo.gl/uhXFdFr4SfC97ABb9?g_st=ic" target="_blank" rel="noopener noreferrer">Perlengkapan</a>
        </div>
        <div class="contact-quick-block">
          <p class="contact-quick-label">${t("Social Channels", "Kanal Sosial")}</p>
          <a class="contact-quick-link" href="https://www.instagram.com/marvellflorist" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a class="contact-quick-link" href="https://www.facebook.com/share/184hfdi9TD/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer">Facebook</a>
        </div>
        <div class="contact-quick-block">
          <p class="contact-quick-label">${t("Online Stores", "Toko Online")}</p>
          <a class="contact-quick-link" href="https://id.shp.ee/8mCEvykG" target="_blank" rel="noopener noreferrer">Shopee</a>
          <a class="contact-quick-link" href="https://tk.tokopedia.com/ZSuyXkhHG/" target="_blank" rel="noopener noreferrer">Tokopedia</a>
        </div>
        </div>
      </div>
    `;
  }

  triggers.forEach((trigger) => {
    trigger.classList.add("contact-quick-trigger");

    // The words are wrapped before the icon goes in, for two reasons: a bare
    // text node cannot be hidden with CSS, and assets/site-language.js writes
    // the translated label with textContent — which, on the trigger itself,
    // would take the icon out with it.
    if (!trigger.querySelector(".contact-quick-label")) {
      const words = String(trigger.textContent || "").trim() || "Contact Us";
      const label = document.createElement("span");
      label.className = "contact-quick-label";
      label.textContent = words;
      trigger.textContent = "";
      trigger.appendChild(label);
    }
    if (!trigger.querySelector(".contact-quick-icon")) {
      const icon = document.createElement("span");
      icon.className = "contact-quick-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = window.MarvellIcons?.icon?.("contact") || "";
      trigger.prepend(icon);
    }
    if (!trigger.getAttribute("aria-label")) {
      trigger.setAttribute("aria-label", t("Contact us", "Hubungi kami"));
    }
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", "contact-quick-panel");
    trigger.setAttribute("aria-expanded", "false");
    if (trigger instanceof HTMLAnchorElement) {
      trigger.setAttribute("role", "button");
    }
  });

  let panel = existingPanel instanceof HTMLElement ? existingPanel : null;

  if (!(panel instanceof HTMLElement)) {
    if (!triggers.length) return;
    panel = document.createElement("aside");
    document.body.appendChild(panel);
  }

  panel.className = "mv-panel mv-panel--contact";
  panel.id = "contact-quick-panel";
  panel.dataset.sharedManaged = "true";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-hidden", "true");
  panel.setAttribute("aria-label", t("Contact us", "Hubungi kami"));
  panel.setAttribute("tabindex", "-1");
  panel.innerHTML = panelMarkup();

  // Panels from before this one carried a backdrop of their own. Remove that
  // legacy node only when the shared registry is actually available to replace
  // it. Gallery keeps the standalone panel on pages without marvell-shop.js;
  // removing its only backdrop there leaves filter and contact sheets without
  // any dimming or blur layer.
  const legacyBackdrop = document.getElementById("contact-quick-backdrop");
  if (Shop?.ensureBackdrop) {
    legacyBackdrop?.remove();
    Shop.ensureBackdrop();
  }

  if (document.body instanceof HTMLElement) document.body.dataset.sharedContactApplied = "1";

  let lastFocused = null;

  /** Closes without touching the shared lock — the registry's own hook. */
  function closeQuietly() {
    if (!panel.classList.contains("is-open")) return;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("contact-quick-open");
    triggers.forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
  }

  const setOpen = (open) => {
    if (open) {
      lastFocused = document.activeElement;
      // Re-rendered on open so the utility row's bag count is current.
      panel.innerHTML = panelMarkup();
      window.MarvellIcons?.adopt?.(panel);
      window.MarvellLanguage?.scheduleTranslationPass?.();
      Shop?.openPanel?.("contact");
      Shop?.syncUtilityRows?.();
    }
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("contact-quick-open", open);
    triggers.forEach((trigger) => {
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    if (open) {
      panel.querySelector(".mv-panel-utility-close")?.focus?.();
    } else {
      Shop?.closePanel?.("contact");
      if (lastFocused instanceof HTMLElement && document.contains(lastFocused)) lastFocused.focus?.();
    }
  };

  Shop?.registerPanel?.("contact", { close: closeQuietly, element: () => panel });

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(true);
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest("[data-contact-open]")) return;
    event.preventDefault();
    setOpen(true);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) setOpen(false);
  });

  window.MarvellContact = {
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen: () => panel.classList.contains("is-open")
  };
  }

  whenReady(start);
})();
