(function () {
  if (typeof document === "undefined") return;
  if (document.body?.dataset.headerTemplateApplied === "1") return;

  function isHomePage() {
    const pathname = window.location.pathname.replace(/\/+$/, "");
    return pathname === "" || pathname === "/" || pathname.endsWith("/index.html");
  }

  function getNormalizedPathname() {
    return window.location.pathname.replace(/\/+$/, "").toLowerCase();
  }

  function isFeaturedPage() {
    const pathname = getNormalizedPathname();
    return pathname.endsWith("/featured.html") || pathname.endsWith("/featured");
  }

  function isJournalsPage() {
    const pathname = getNormalizedPathname();
    return pathname.endsWith("/journal.html")
      || pathname.endsWith("/journal")
      || pathname.endsWith("/journals.html")
      || pathname.endsWith("/journals");
  }

  function isWishlistPage() {
    const pathname = getNormalizedPathname();
    // The wishlist is not a page any more; saved pieces are a section of the
    // bag page. Both old spellings still answer, via a redirect.
    return pathname.endsWith("/wishlist.html") || pathname.endsWith("/wishlist");
  }

  function isPromoStripCollectionsPage() {
    const pathname = getNormalizedPathname();
    return pathname.endsWith("/gallery.html")
      || pathname.endsWith("/gallery")
      || pathname.endsWith("/product.html")
      || pathname.endsWith("/product");
  }

  function shouldUsePromoStrip() {
    return (isHomePage() || isPromoStripCollectionsPage())
      && !isFeaturedPage()
      && !isJournalsPage()
      && !isWishlistPage();
  }

  function ensureStyles() {
    if (document.getElementById("shared-header-template-styles")) return;
    const style = document.createElement("style");
    style.id = "shared-header-template-styles";
    style.textContent = `
      header {
        padding: 0 24px !important;
        height: 72px !important;
        position: fixed !important;
        top: var(--shared-header-top, 0px) !important;
        left: 0 !important;
        width: 100% !important;
        z-index: 80 !important;
        display: flex !important;
        align-items: center !important;
        pointer-events: none !important;
        transition: top 0.5s ease !important;
      }
      header::before {
        height: 72px !important;
        top: var(--shared-header-top, 0px) !important;
        background: #fff !important;
        border-bottom: 1px solid rgba(63, 54, 45, 0.16) !important;
        transition: top 0.5s ease, opacity 0.45s ease, border-color 0.45s ease, background-color 0.45s ease !important;
      }
      header::after {
        top: var(--shared-header-top, 0px) !important;
        transition: top 0.5s ease !important;
      }
      body {
        --promo-strip-height: 44px;
        --shared-header-top: 0px;
      }
      body.has-promo-strip {
        --shared-header-top: var(--promo-strip-height);
      }
      body.promo-strip-closing {
        --shared-header-top: 0px;
      }
      .collection-promo-strip {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 60 !important;
        background: #d3d1cd !important;
        overflow: hidden !important;
        min-height: 0 !important;
        max-height: 0 !important;
        opacity: 0 !important;
        transform: translateY(0) !important;
        transition: max-height 0.5s ease, transform 0.5s ease, opacity 0.5s ease !important;
      }
      body.has-promo-strip .collection-promo-strip {
        max-height: var(--promo-strip-height) !important;
        opacity: 1 !important;
        transform: translateY(0) !important;
      }
      body.has-promo-strip .collection-promo-strip.is-closing {
        max-height: var(--promo-strip-height) !important;
        opacity: 0 !important;
        transform: translateY(calc(-1 * var(--promo-strip-height))) !important;
      }
      .promo-strip-fallback {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 0 !important;
        background: #d3d1cd !important;
        z-index: 48 !important;
        pointer-events: none !important;
        opacity: 0 !important;
        transition: height 0.5s ease, opacity 0.5s ease !important;
      }
      body.has-promo-strip .promo-strip-fallback {
        height: var(--promo-strip-height) !important;
        opacity: 1 !important;
      }
      body.promo-strip-closing .promo-strip-fallback {
        height: var(--promo-strip-height) !important;
        opacity: 0 !important;
      }
      .collection-promo-track {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) !important;
        width: 100% !important;
        align-items: center !important;
        gap: 12px !important;
        position: relative !important;
        padding: 10px 44px 10px 20px !important;
      }
      .collection-promo-status {
        display: inline-flex !important;
        align-items: center !important;
        gap: 7px !important;
        grid-column: 1 !important;
        justify-self: start !important;
        width: auto !important;
        min-width: 48px !important;
        color: rgba(79, 77, 73, 0.74) !important;
        font-family: "Inter Tight", sans-serif !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        letter-spacing: 0.05em !important;
        white-space: nowrap !important;
      }
      .collection-promo-play-toggle {
        position: relative !important;
        display: inline-grid !important;
        place-items: center !important;
        width: 20px !important;
        height: 20px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        color: rgba(79, 77, 73, 0.82) !important;
        cursor: pointer !important;
        padding: 0 !important;
        flex: 0 0 auto !important;
        position: relative !important;
        z-index: 5 !important;
      }
      .collection-promo-play-toggle:hover,
      .collection-promo-play-toggle:focus-visible {
        color: rgba(79, 77, 73, 0.98) !important;
        outline: none !important;
      }
      .collection-promo-pause-icon,
      .collection-promo-play-icon {
        grid-area: 1 / 1 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .collection-promo-pause-icon {
        gap: 3px !important;
      }
      .collection-promo-pause-icon span {
        display: block !important;
        width: 2px !important;
        height: 10px !important;
        background: currentColor !important;
      }
      .collection-promo-play-icon {
        width: 0 !important;
        height: 0 !important;
        border-top: 5px solid transparent !important;
        border-bottom: 5px solid transparent !important;
        border-left: 8px solid currentColor !important;
        transform: translateX(1px) !important;
        opacity: 0 !important;
      }
      .collection-promo-play-toggle[data-state="paused"] .collection-promo-pause-icon {
        opacity: 0 !important;
      }
      .collection-promo-play-toggle[data-state="paused"] .collection-promo-play-icon {
        opacity: 1 !important;
      }
      .collection-promo-progress {
        position: relative !important;
        display: block !important;
        flex: 0 0 auto !important;
        width: 16px !important;
        height: 16px !important;
        min-width: 16px !important;
        border-radius: 50% !important;
        overflow: hidden !important;
        background: transparent !important;
      }
      .collection-promo-progress-fill {
        position: absolute !important;
        inset: 0 !important;
        display: block !important;
        border-radius: 50% !important;
        background: conic-gradient(rgba(79, 77, 73, 0.84) var(--promo-progress-angle, 0deg), rgba(79, 77, 73, 0.2) 0deg) !important;
        -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0) !important;
        mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0) !important;
      }
      .collection-promo-progress-fill.is-progressing {
        animation: promoProgressFill var(--promo-progress-duration, 4800ms) linear forwards !important;
      }
      .collection-promo-status-text {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      .collection-promo-viewport {
        grid-column: 2 !important;
        min-width: 0 !important;
        overflow: hidden !important;
        justify-self: center !important;
          z-index: 1 !important;
        height: 24px !important;
        max-width: min(760px, calc(100vw - 170px)) !important;
      }
      .collection-promo-stack {
        display: flex !important;
        flex-direction: column !important;
        transform: translateY(0) !important;
        transition: transform 0.5s ease-in-out !important;
      }
      .collection-promo-stack.is-resetting {
        transition: none !important;
      }
      .collection-promo-stack.is-rotating {
        transform: translateY(-24px) !important;
      }
      .collection-promo-link {
        color: #4f4d49 !important;
        text-decoration: none !important;
        font-family: "Inter Tight", sans-serif !important;
        font-size: 13px !important;
        line-height: 1.25 !important;
        letter-spacing: 0.01em !important;
        text-align: center !important;
        opacity: 0 !important;
        flex: 0 1 auto !important;
        white-space: nowrap !important;
        font-weight: 500 !important;
        position: relative !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 24px !important;
      }
      body.has-promo-strip .collection-promo-link {
        opacity: 1 !important;
        transition: opacity 0.35s ease !important;
      }
      .collection-promo-link::after {
        content: "" !important;
        position: absolute !important;
        left: 0 !important;
        bottom: -2px !important;
        width: 100% !important;
        height: 1px !important;
        background: currentColor !important;
        transform-origin: left center !important;
        transform: scaleX(0) !important;
        opacity: 0.75 !important;
        transition: transform 0.32s ease !important;
      }
      .collection-promo-link:hover::after,
      .collection-promo-link:focus-visible::after {
        transform: scaleX(1) !important;
      }
      .collection-promo-close {
        position: absolute !important;
        right: 10px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        width: 20px !important;
        height: 20px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        color: rgba(79, 77, 73, 0.78) !important;
        font-family: "Inter Tight", sans-serif !important;
        font-size: 16px !important;
        line-height: 1 !important;
        cursor: pointer !important;
        z-index: 5 !important;
      }
      .collection-promo-close:hover,
      .collection-promo-close:focus-visible {
        color: rgba(79, 77, 73, 0.96) !important;
        outline: none !important;
      }
      @property --promo-progress-angle {
        syntax: "<angle>";
        inherits: false;
        initial-value: 0deg;
      }
      @keyframes promoProgressFill {
        from {
          --promo-progress-angle: 0deg;
        }
        to {
          --promo-progress-angle: 360deg;
        }
      }
      body[data-header-divider="none"] header::before,
      body[data-header-divider="none"] header,
      body[data-header-divider="none"] header::after {
        border-bottom: 0 !important;
        box-shadow: none !important;
      }
      .header-bar {
        position: relative !important;
        width: 100% !important;
        height: 72px !important;
        min-height: 72px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 14px !important;
        z-index: 2 !important;
        pointer-events: auto !important;
      }
      .mobile-header-actions {
        display: contents !important;
      }
      .header-logo-text {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: "AdelioDisplayCondensed", sans-serif !important;
        font-size: 36px !important;
        font-weight: 300 !important;
        line-height: 0.9 !important;
        letter-spacing: 0.01em !important;
        word-spacing: normal !important;
        color: rgba(42, 33, 24, 0.82) !important;
        -webkit-text-fill-color: currentColor !important;
        -webkit-text-stroke: 0 !important;
        text-shadow: none !important;
        white-space: nowrap !important;
        overflow: visible !important;
        text-overflow: clip !important;
        transition: color 0.45s ease, -webkit-text-fill-color 0.45s ease, -webkit-text-stroke 0.45s ease !important;
      }
      .header-logo {
        position: absolute !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 3 !important;
        width: max-content !important;
        max-width: calc(100% - 420px) !important;
        overflow: visible !important;
      }
      .header-contact,
      .contact-quick-trigger,
      .search-toggle,
      .search-mobile-trigger,
      .menu-toggle {
        font-family: "Inter Tight", sans-serif !important;
        font-size: 12px !important;
        font-weight: 400 !important;
        letter-spacing: 0.06em !important;
        color: rgba(42, 33, 24, 0.82) !important;
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        text-decoration: none !important;
      }
      .search-toggle {
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin-left: 0 !important;
        order: 2 !important;
        cursor: pointer !important;
        transition: opacity 0.2s ease, color 0.45s ease !important;
      }
      .search-toggle svg {
        width: 20px !important;
        height: 20px !important;
        display: block !important;
        stroke: currentColor !important;
        fill: none !important;
        stroke-width: 1.25 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }
      /* The masthead is the wordmark and a row of icons, and nothing else.
         Every control below carries an aria-label, so the words are still
         there for a screen reader and gone from the page. */
      .search-toggle .search-label,
      .menu-toggle .menu-label,
      .header-account .header-account-label,
      .header-bar .contact-quick-label {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0 0 0 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      .search-mobile-trigger {
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 0 !important;
        width: 42px !important;
        min-width: 42px !important;
        height: 42px !important;
        min-height: 42px !important;
        margin-left: auto !important;
        order: 2 !important;
        padding: 0 !important;
        cursor: pointer !important;
      }
      .header-contact,
      .contact-quick-trigger {
        order: 5 !important;
        margin-left: 0 !important;
      }
      .search-mobile-trigger span {
        display: none !important;
      }
      .search-mobile-trigger svg {
        width: 20px !important;
        height: 20px !important;
        display: block !important;
        stroke: currentColor !important;
        fill: none !important;
        stroke-width: 1.25 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }
      .menu-toggle {
        margin-left: 0 !important;
        order: 1 !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 0 !important;
        cursor: pointer !important;
        transition: opacity 0.2s ease, color 0.45s ease !important;
      }
      .menu-toggle .menu-icon {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .menu-toggle .menu-icon svg {
        width: 20px !important;
        height: 20px !important;
        display: block !important;
        stroke: currentColor !important;
        fill: none !important;
        stroke-width: 1.25 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }
      .menu-toggle:hover,
      .menu-toggle:focus-visible,
      .search-toggle:hover,
      .search-toggle:focus-visible,
      .search-mobile-trigger:hover,
      .search-mobile-trigger:focus-visible {
        opacity: 0.84 !important;
        outline: none !important;
      }
      @media (min-width: 769px) {
        .header-bar {
          gap: 14px !important;
        }
        .menu-toggle {
          order: 1 !important;
        }
        .search-toggle {
          order: 2 !important;
          margin-right: 10px !important;
        }
      }
      .menu-backdrop {
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
      .menu-backdrop.is-open {
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      .menu-panel {
        position: fixed !important;
        top: 0 !important;
        bottom: auto !important;
        left: 0 !important;
        right: auto !important;
        width: min(92vw, 500px) !important;
        height: 100vh !important;
        background: var(--footer-offwhite, #fff) !important;
        color: #151210 !important;
        transform: translateX(-100%) !important;
        transition: transform 0.5s ease-in-out !important;
        z-index: 241 !important;
        box-shadow: none !important;
        display: grid !important;
        grid-template-rows: auto 1fr !important;
        border-top: 0 !important;
        border-right: 1px solid rgba(29, 26, 24, 0.08) !important;
        border-left: 0 !important;
      }
      .menu-panel.is-open {
        transform: translateX(0) !important;
        box-shadow: 20px 0 36px rgba(10, 12, 18, 0.18) !important;
      }
      .menu-head {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        padding: 18px 0 0 18px !important;
      }
      .menu-close {
        width: 42px !important;
        height: 42px !important;
        border-radius: 50% !important;
        border: 0 !important;
        background: #111 !important;
        color: #fff !important;
        cursor: pointer !important;
        display: grid !important;
        place-items: center !important;
      }
      .menu-body {
        position: relative !important;
        overflow: hidden !important;
        padding: 0 !important;
        min-height: 460px !important;
      }
      .menu-view {
        position: absolute !important;
        inset: 30px 68px 46px 68px !important;
        display: grid !important;
        align-content: start !important;
        gap: 14px !important;
        opacity: 0 !important;
        transform: translateX(18px) !important;
        pointer-events: none !important;
        transition: opacity 0.28s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1) !important;
      }
      .menu-view[data-menu-view="main"] {
        justify-items: start !important;
        text-align: left !important;
        gap: 0 !important;
      }
      .menu-panel:not([data-menu-current]) .menu-view[data-menu-view="main"],
      .menu-panel[data-menu-current="main"] .menu-view[data-menu-view="main"],
      .menu-panel[data-menu-current="featured"] .menu-view[data-menu-view="featured"],
      .menu-panel[data-menu-current="contact"] .menu-view[data-menu-view="contact"] {
        opacity: 1 !important;
        transform: translateX(0) !important;
        pointer-events: auto !important;
        visibility: visible !important;
      }
      .menu-panel[data-menu-current="featured"] .menu-view[data-menu-view="main"],
      .menu-panel[data-menu-current="contact"] .menu-view[data-menu-view="main"] {
        transform: translateX(-18px) !important;
      }
      .menu-main-primary,
      .menu-main-secondary {
        display: grid !important;
        justify-items: start !important;
      }
      .menu-main-primary {
        gap: 18px !important;
      }
      .menu-main-secondary {
        margin-top: 52px !important;
        gap: 16px !important;
      }
      .menu-link,
      .menu-link-button {
        display: inline-flex !important;
        align-items: center !important;
        gap: 10px !important;
        color: #1d1a18 !important;
        text-decoration: none !important;
        font-family: "Inter Tight", sans-serif !important;
        font-size: clamp(19px, 1.55vw, 23px) !important;
        font-weight: 500 !important;
        line-height: 1.24 !important;
        width: fit-content !important;
        justify-content: flex-start !important;
        background: transparent !important;
        border: 0 !important;
        padding: 0 !important;
        text-align: left !important;
        cursor: pointer !important;
      }
      .menu-link-secondary,
      .menu-link-button.menu-link-secondary {
        font-size: 18px !important;
        font-weight: 500 !important;
        letter-spacing: 0.03em !important;
        line-height: 1.42 !important;
        color: #1d1a18 !important;
      }
      .menu-link::after,
      .menu-link-button::after {
        content: "›" !important;
        margin-left: auto !important;
        opacity: 0 !important;
        transform: none !important;
        transition: opacity 0.2s ease, transform 0.2s ease !important;
      }
      .menu-link:hover,
      .menu-link:focus-visible {
        text-decoration: none !important;
        outline: none !important;
      }
      .menu-link:hover::after,
      .menu-link:focus-visible::after,
      .menu-link-button:hover::after,
      .menu-link-button:focus-visible::after {
        opacity: 1 !important;
        transform: none !important;
      }
      .menu-back {
        width: fit-content !important;
        gap: 6px !important;
        font-size: 12px !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
        color: rgba(21, 18, 16, 0.72) !important;
      }
      .menu-back::after {
        content: none !important;
      }
      [data-featured-menu-list] {
        display: grid !important;
        align-content: start !important;
        gap: 16px !important;
      }
      .menu-link-contact {
        display: none !important;
      }
      .menu-view[data-menu-view="contact"] {
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
      }
      .menu-view[data-menu-view="contact"] .contact-quick-body {
        padding: 8px 0 0 !important;
      }
      /* The safe-area strips are a phone's business only, and they are fixed
         overlays or they are nothing: hidden by default so that on a desktop
         they are not two empty blocks sitting at the top of every page's body,
         taking part in a layout they have nothing to do with. The rule that
         turns them on is in the phone block below. */
      .mobile-safe-area-fill {
        display: none !important;
      }
      /* The contact panel's chrome lives in assets/marvell-shop.js now, with
         every other right-hand quick panel. Only the menu's own contact view
         is styled from here. */
      @media (max-width: 768px) {
        .menu-panel {
          left: 0 !important;
          right: 0 !important;
          top: auto !important;
          bottom: 0 !important;
          width: 100vw !important;
          max-width: none !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          transform: translateY(100%) !important;
          border-top: 1px solid rgba(29, 26, 24, 0.08) !important;
          border-right: 0 !important;
        }
        .menu-panel.is-open {
          transform: translateY(0) !important;
          box-shadow: 0 -20px 36px rgba(10, 12, 18, 0.18) !important;
        }
        header {
          padding: 0 12px !important;
          justify-content: flex-start !important;
          align-items: flex-end !important;
          gap: 0 !important;
          height: calc(72px + env(safe-area-inset-top, 0px)) !important;
          background: #fff !important;
          z-index: 80 !important;
        }
        header::before,
        header::after {
          display: none !important;
        }
        .header-bar {
          height: 72px !important;
          min-height: 72px !important;
          justify-content: flex-start !important;
          flex-wrap: nowrap !important;
          /* The gap is set once, in the phone block further down, next to the
             order the icons are placed in. It was set here too and overridden
             there, which left two answers in one file for the one thing that
             decides how the masthead reads. */
        }
        /* The notch and the home bar are painted, not left showing the page
           scrolling underneath the header and the footer. The home page had
           these two strips of its own; every page has them now, because a
           phone with a notch is not a home-page-only phone. */
        .mobile-safe-area-fill {
          position: fixed !important;
          left: 0 !important;
          right: 0 !important;
          pointer-events: none !important;
          display: block !important;
        }
        .mobile-safe-area-fill--top {
          top: 0 !important;
          height: calc(72px + env(safe-area-inset-top, 0px)) !important;
          background: var(--theme-header-bar-bg, #fff) !important;
          border-bottom: 1px solid rgba(157, 133, 101, 0.24) !important;
          z-index: 49 !important;
          transition: none !important;
        }
        .mobile-safe-area-fill--bottom {
          bottom: 0 !important;
          height: env(safe-area-inset-bottom, 0px) !important;
          background: var(--footer-offwhite, #fff) !important;
          z-index: 49 !important;
        }
        .mobile-header-actions {
          position: absolute !important;
          right: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 16px !important;
          z-index: 4 !important;
        }
        .header-logo {
          position: static !important;
          left: auto !important;
          transform: none !important;
          max-width: calc(100% - 96px) !important;
          overflow: hidden !important;
          flex: 1 1 auto !important;
          order: 1 !important;
          min-width: 0 !important;
        }
        header .header-logo-text {
          font-size: clamp(25px, 7vw, 32px) !important;
          word-spacing: normal !important;
          overflow: hidden !important;
          text-overflow: clip !important;
        }
        .language-switcher {
          order: 2 !important;
          margin-left: 0 !important;
          flex: 0 0 auto !important;
          gap: 2px !important;
        }
        .header-contact,
        .contact-quick-trigger {
          display: none !important;
        }
        .search-toggle {
          display: inline-flex !important;
          order: 4 !important;
          margin-left: 0 !important;
          gap: 0 !important;
          flex: 0 0 auto !important;
          min-width: 20px !important;
          position: static !important;
          right: auto !important;
          top: auto !important;
          transform: none !important;
        }
        .search-toggle .search-label {
          display: none !important;
        }
        .search-mobile-trigger,
        body[data-mobile-search-enabled="false"] .search-mobile-trigger {
          display: none !important;
          width: 0 !important;
          min-width: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        .menu-toggle {
          position: static !important;
          left: auto !important;
          right: auto !important;
          top: auto !important;
          transform: none !important;
          gap: 0 !important;
          order: 5 !important;
          margin-left: 0 !important;
          flex: 0 0 auto !important;
          min-width: 20px !important;
        }
        .menu-toggle .menu-label {
          display: none !important;
        }
        .menu-head {
          padding: calc(env(safe-area-inset-top, 0px) + 18px) max(18px, env(safe-area-inset-right, 0px)) 0 max(18px, env(safe-area-inset-left, 0px)) !important;
        }
        .collection-promo-track {
          grid-template-columns: auto minmax(0, 1fr) auto !important;
          gap: 8px !important;
          padding: 8px 34px !important;
        }
        .collection-promo-status {
          position: absolute !important;
          left: -20px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          width: 52px !important;
          min-width: 52px !important;
          gap: 4px !important;
          justify-content: flex-start !important;
          z-index: 4 !important;
          pointer-events: auto !important;
        }
        .collection-promo-status-text {
          display: none !important;
        }
        .collection-promo-viewport {
          grid-column: 2 !important;
          width: min(100%, calc(100vw - 88px)) !important;
          max-width: calc(100vw - 88px) !important;
          justify-self: center !important;
          z-index: 1 !important;
        }
        .collection-promo-stack,
        .collection-promo-link {
          width: 100% !important;
        }
        .collection-promo-link {
          font-size: 12px !important;
          white-space: normal !important;
        }
        .collection-promo-close {
          right: 8px !important;
        }
        .menu-view {
          inset: calc(env(safe-area-inset-top, 0px) + 18px) max(24px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 32px) max(24px, env(safe-area-inset-left, 0px)) !important;
          gap: 18px !important;
        }
        .menu-main-secondary {
          margin-top: 34px !important;
          gap: 14px !important;
        }
        .menu-link,
        .menu-link-button {
          font-size: clamp(18px, 5.2vw, 21px) !important;
        }
        .menu-link-secondary,
        .menu-link-button.menu-link-secondary {
          font-size: 17px !important;
        }
        .menu-link::after,
        .menu-link-button::after {
          opacity: 0.62 !important;
          transform: none !important;
          margin-left: auto !important;
        }
        .menu-link-contact {
          display: inline-flex !important;
        }
      }
      /* --- The masthead ----------------------------------------------------
         Menu, search and the restored client actions keep the homepage
         masthead arrangement. Language choice remains in the footer. */
      .header-account {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
        padding: 0;
        border: 0;
        background: transparent;
        appearance: none;
        -webkit-appearance: none;
        cursor: pointer;
        text-decoration: none;
        color: rgba(42, 33, 24, 0.82);
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        letter-spacing: 0.06em;
        white-space: nowrap;
        order: 4;
        /* Matched to .bag-launcher-btn and .search-toggle so the whole bar
           cross-fades as one when the hero scrolls away. */
        transition: opacity 0.2s ease, color 0.45s ease;
      }
      .header-account:hover,
      .header-account:focus-visible {
        opacity: 0.84;
        outline: none;
      }
      .header-account-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .header-account-icon svg {
        width: 20px;
        height: 20px;
        display: block;
      }
      /* Over a hero image the header goes pale, and the account goes with it.
         Without this the one control carrying words stayed dark against the
         photograph while the wordmark, the heart and the bag all turned. */
      body.desktop-header-hero-mode .header-account {
        color: rgba(242, 236, 224, 0.96);
      }

      @media (min-width: 769px) {
        body .header-bar .search-toggle,
        body .header-bar.has-favorites-launcher .search-toggle { margin-left: 0 !important; }
        body .header-bar.has-favorites-launcher .favorites-launcher { margin-left: auto !important; }
        .header-bar .contact-quick-trigger { display: inline-flex !important; }
        .header-bar .header-account { order: 4 !important; }
        .header-bar .bag-launcher { order: 6 !important; }
      }
      /* Contact is one of the four panels, so its control is one of the four
         icons — the same size, the same weight, in the same cluster. It used
         to be the only one wearing words, which made it read as a separate
         thing standing beside the group rather than part of it. */
      .header-bar .contact-quick-trigger { gap: 0 !important; }
      .header-bar .contact-quick-trigger::before { content: none !important; }
      .header-bar .contact-quick-icon { display: inline-flex; width: 20px; height: 20px; align-items: center; justify-content: center; flex: 0 0 20px; }
      .header-bar .contact-quick-icon svg { display: block; width: 20px; height: 20px; stroke: currentColor; }

      /* The header's right-hand cluster and a panel's utility row are the same
         set of icons in the same order — wishlist, account, contact, bag —
         so moving between them is moving between the same four things. */
      .header-bar .favorites-launcher-btn svg,
      .header-bar .header-account-icon svg,
      .header-bar .contact-quick-icon svg,
      .header-bar .bag-launcher-btn svg,
      .header-bar .search-toggle svg,
      .header-bar .search-mobile-trigger svg,
      .header-bar .menu-toggle .menu-icon svg {
        stroke-width: 1.25 !important;
      }
      /* Icons stay visually quiet while their actual hit areas remain large
         enough for a finger. Several controls previously exposed only a
         20–24px clickable box, which made the wishlist and account entries
         seem intermittent even though their handlers had fired correctly. */
      .header-bar .favorites-launcher-btn,
      .header-bar .header-account,
      .header-bar .contact-quick-trigger,
      .header-bar .bag-launcher-btn,
      .header-bar .search-toggle,
      .header-bar .menu-toggle {
        width: 42px !important;
        min-width: 42px !important;
        height: 42px !important;
        min-height: 42px !important;
        padding: 0 !important;
        align-items: center !important;
        justify-content: center !important;
      }

      /* Legacy language styling remains harmless while the footer owns the selector. */
      @media (min-width: 769px) {
        .header-bar .language-switcher { order: 7 !important; margin-left: 12px !important; }
      }

      /* --- Mobile ----------------------------------------------------------
         [ menu  search ]   MARVELL FLORIST   [ heart  account  bag ]

         The same shape as the desktop masthead, which is the point: the menu
         and search open from the left, and the panels open from the right.
         These used to be hidden on a phone and reached from inside the menu
         instead — but the menu is a list of places now, so hiding them here
         left no way to a saved piece at all.

         Contact Us is the exception, and it is not an oversight: it is a row
         in the menu, the menu opens it in place, and a phone masthead has
         four things in it already.

         Placed with flex order, never by moving nodes: assets/favorites.js
         puts its own launcher next to the contact control, so the two would
         otherwise take turns rearranging each other. */
      @media (max-width: 768px) {
        header {
          padding: 0 12px !important;
        }
        /* 10px, which is the gap the same four icons sit at in a panel's
           utility row (.mv-panel-utility-actions in assets/marvell-shop.js).
           They were 13px here, which on a 390px masthead reads as a row of
           separate controls rather than one cluster — and the two places
           showing the same icons disagreed about their spacing.

           Note for anyone hunting this: the 16px gap on
           .mobile-header-actions higher up in this file does nothing, because
           the rule below makes that box display:contents, and a box that
           generates no box has no gap. The icons are direct flex children of
           .header-bar on a phone, so this is the gap that decides them. */
        .header-bar {
          gap: 10px !important;
        }
        .header-bar .mobile-header-actions {
          display: contents !important;
        }
        .header-bar .menu-toggle {
          order: 0 !important;
          margin: 0 !important;
          flex: 0 0 auto !important;
        }
        /* This one auto margin is what divides the row, so the right-hand
           group holds together however many of its four are on the page. */
        .header-bar .search-toggle {
          display: inline-flex !important;
          order: 1 !important;
          margin: 0 auto 0 0 !important;
          flex: 0 0 auto !important;
          position: static !important;
          transform: none !important;
        }
        .header-bar .header-logo {
          position: absolute !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          max-width: calc(100% - 206px) !important;
          flex: 0 0 auto !important;
          order: 2 !important;
        }
        .header-bar .header-logo-text {
          font-size: clamp(19px, 5.4vw, 28px) !important;
        }
        .header-bar .favorites-launcher,
        .header-bar .header-account,
        .header-bar .bag-launcher {
          display: inline-flex !important;
          margin: 0 !important;
          flex: 0 0 auto !important;
          position: static !important;
          transform: none !important;
        }
        /* Contact Us is not in the masthead on a phone. It is in the menu, at
           the bottom of the list, and the menu opens it in place.
           This is said at .header-bar weight on purpose. The rule above used
           to carry the contact control along with the other three, and the two
           places that hid it — higher up in this file, and in
           assets/shared-contact.js — both named .contact-quick-trigger on its
           own, which is a hundred points lighter than .header-bar
           .contact-quick-trigger and lost to it every time. The control was on
           every phone no matter how many times it was told not to be. */
        .header-bar .header-contact,
        .header-bar .contact-quick-trigger {
          display: none !important;
        }
        .header-bar .favorites-launcher { order: 3 !important; }
        .header-bar .header-account { order: 4 !important; }
        .header-bar .bag-launcher { order: 6 !important; }
        .header-bar .favorites-launcher-btn svg,
        .header-bar .header-account-icon svg,
        .header-bar .contact-quick-icon svg,
        .header-bar .bag-launcher-btn svg,
        .header-bar .search-toggle svg,
        .header-bar .menu-toggle .menu-icon svg {
          width: 19px !important;
          height: 19px !important;
        }
        /* The footer owns the language selector. */
        .header-bar .language-switcher {
          display: none !important;
        }
      }
      @media (min-width: 769px) {
        .header-bar .contact-quick-trigger,
        .header-bar .header-account,
        .header-bar .menu-toggle,
        .header-bar .search-toggle,
        .header-bar .favorites-launcher,
        .header-bar .favorites-launcher-btn:not(.has-items),
        .header-bar .bag-launcher-btn,
        .header-bar .header-logo-text {
          color: #35383a !important;
        }
        body.desktop-header-hero-mode .header-bar .contact-quick-trigger,
        body.desktop-header-hero-mode .header-bar .header-account,
        body.desktop-header-hero-mode .header-bar .menu-toggle,
        body.desktop-header-hero-mode .header-bar .search-toggle,
        body.desktop-header-hero-mode .header-bar .favorites-launcher,
        body.desktop-header-hero-mode .header-bar .favorites-launcher-btn:not(.has-items),
        body.desktop-header-hero-mode .header-bar .bag-launcher-btn,
        body.desktop-header-hero-mode .header-bar .header-logo-text {
          color: #fff !important;
          -webkit-text-fill-color: currentColor !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Inject the shared header and overlay styles as early as possible so
  // panels like the contact quick sheet never flash in their unstyled state
  // on hard refresh before DOMContentLoaded runs.
  ensureStyles();

  function ensureMobileSearchTrigger() {
    const headerBar = document.querySelector(".header-bar");
    if (!(headerBar instanceof HTMLElement)) return;
    headerBar.querySelectorAll(".search-mobile-trigger").forEach((node) => node.remove());
    if (headerBar.dataset.mobileSearchCleanupBound === "1" || typeof MutationObserver !== "function") return;
    const observer = new MutationObserver(() => {
      headerBar.querySelectorAll(".search-mobile-trigger").forEach((node) => node.remove());
    });
    observer.observe(headerBar, { childList: true, subtree: true });
    headerBar.dataset.mobileSearchCleanupBound = "1";
  }

  /** The two strips behind the notch and the home bar. */
  function ensureSafeAreaFills() {
    if (!document.body) return;
    ["top", "bottom"].forEach((edge) => {
      const selector = `.mobile-safe-area-fill--${edge}`;
      if (document.querySelector(selector)) return;
      const fill = document.createElement("div");
      fill.className = `mobile-safe-area-fill mobile-safe-area-fill--${edge}`;
      fill.setAttribute("aria-hidden", "true");
      // Ahead of everything, so it cannot sit over a panel that opens later.
      document.body.prepend(fill);
    });
  }

  function ensureMobileActionCluster() {
    const headerBar = document.querySelector(".header-bar");
    if (!(headerBar instanceof HTMLElement)) return;
    let cluster = headerBar.querySelector(".mobile-header-actions");
    if (!(cluster instanceof HTMLElement)) {
      cluster = document.createElement("div");
      cluster.className = "mobile-header-actions";
      headerBar.appendChild(cluster);
    }
    // The right-hand cluster, in the same order as the desktop masthead and
    // as the utility row inside every panel: wishlist, account, contact,
    // bag. Appending in this order is what fixes it, because the cluster is a
    // real flex box on a phone rather than `display: contents`.
    // Only the bag is moved here, and only because it has nowhere else to be
    // put. Everything else in the masthead is placed by flex `order` in the
    // stylesheet below, which is how the desktop row is built too.
    //
    // Nothing else may be moved into this box: assets/favorites.js places its
    // own launcher relative to the contact control, so pulling the contact
    // control in here would leave it inserting against a node that is no
    // longer its sibling — and, since this also runs from a MutationObserver,
    // the two would go on moving the same elements past each other.
    const controls = [
      headerBar.querySelector(".bag-launcher")
    ];
    controls.forEach((control) => {
      if (!(control instanceof HTMLElement)) return;
      if (control.parentElement !== cluster) cluster.appendChild(control);
    });
  }

  function ensureAccountEntry() {
    const headerBar = document?.querySelector?.(".header-bar");
    if (!(headerBar instanceof HTMLElement)) return;
    const label = window.MarvellAccount?.label?.() || "Join Marvell";
    let account = headerBar.querySelector(".header-account");
    if (!(account instanceof HTMLButtonElement)) {
      account = document.createElement("button");
      account.type = "button";
      account.className = "header-account";
      account.setAttribute("data-account-open", "");
      account.setAttribute("aria-haspopup", "dialog");
      account.setAttribute("aria-expanded", "false");
      account.setAttribute("aria-controls", "marvell-account-drawer");
      account.innerHTML = `<span class="header-account-icon" aria-hidden="true">${window.MarvellIcons?.icon?.("account") || ""}</span><span class="header-account-label"></span>`;
      const bag = headerBar.querySelector(".bag-launcher");
      if (bag instanceof HTMLElement) bag.before(account);
      else headerBar.appendChild(account);
    }
    // The words live in the aria-label; the page shows the glyph. The label
    // node is kept and kept current because it is what the panel tests, the
    // translation pass and a screen reader all read.
    account.setAttribute("aria-label", label);
    const labelNode = account.querySelector(".header-account-label");
    if (labelNode && labelNode.textContent !== label) labelNode.textContent = label;
  }

  /**
   * The contact control is a glyph, like every other control up here.
   *
   * Its words have to be wrapped before the icon goes in. A bare text node
   * cannot be hidden with CSS, so a trigger whose label is written straight
   * into the button — which is how index.html and gallery.html spell it —
   * kept "Hubungi Kami" on screen beside the icon while every other page
   * showed the glyph alone. The words stay in the element for a screen reader
   * and for assets/site-language.js to translate; only the paint changes.
   *
   * assets/shared-contact.js does the same thing for the pages it runs on.
   * This is here because index.html does not load it.
   */
  function ensureContactIcon() {
    document.querySelectorAll(".header-bar .contact-quick-trigger, .header-bar .header-contact").forEach((trigger) => {
      if (!(trigger instanceof HTMLElement)) return;
      if (!trigger.querySelector(".contact-quick-label")) {
        const words = String(trigger.textContent || "").trim();
        if (words) {
          const label = document.createElement("span");
          label.className = "contact-quick-label";
          label.textContent = words;
          if (!trigger.hasAttribute("aria-label")) trigger.setAttribute("aria-label", words);
          trigger.textContent = "";
          trigger.appendChild(label);
        }
      }
      if (trigger.querySelector(".contact-quick-icon")) return;
      const icon = window.MarvellIcons?.icon?.("contact");
      if (!icon) return;
      const host = document.createElement("span");
      host.className = "contact-quick-icon";
      host.setAttribute("aria-hidden", "true");
      host.innerHTML = icon;
      trigger.prepend(host);
    });
  }

  function ensureFeaturedMenuFallback() {
    const fallbackHref = "featured.html";
    document.querySelectorAll("[data-featured-menu-list]").forEach((container) => {
      if (!(container instanceof HTMLElement)) return;
      if (container.children.length > 0 || container.textContent.trim()) return;
      container.innerHTML = `<a class="menu-link" data-seasonal-fallback="true" href="${fallbackHref}">Collections</a>`;
    });
  }

  const PROMO_DISMISS_STORAGE_KEY = "marvell-promo-dismissed-until";
  const PROMO_DISMISS_DURATION_MS = 5 * 60 * 1000;
  let sharedPromoRestoreTimer = 0;

  function wasHardReload() {
    try {
      return performance.getEntriesByType("navigation")?.[0]?.type === "reload";
    } catch (_error) {
      return false;
    }
  }

  function getPromoDismissedUntil() {
    try {
      const stored = Number(window.sessionStorage?.getItem(PROMO_DISMISS_STORAGE_KEY) || "0");
      return Number.isFinite(stored) ? stored : 0;
    } catch (_error) {
      return 0;
    }
  }

  function setPromoDismissedUntil(value) {
    try {
      if (value > Date.now()) window.sessionStorage?.setItem(PROMO_DISMISS_STORAGE_KEY, String(value));
      else window.sessionStorage?.removeItem(PROMO_DISMISS_STORAGE_KEY);
    } catch (_error) {
      // Storage is optional; the close button still works on the current page.
    }
  }

  function getPromoDismissRemainingMs() {
    return Math.max(0, getPromoDismissedUntil() - Date.now());
  }

  function isPromoDismissedForSession() {
    if (getPromoDismissRemainingMs() <= 0) {
      setPromoDismissedUntil(0);
      window.__MARVELL_PROMO_DISMISSED_THIS_LOAD__ = false;
      return false;
    }
    return true;
  }

  function dismissPromoForSession() {
    window.__MARVELL_PROMO_DISMISSED_THIS_LOAD__ = true;
    setPromoDismissedUntil(Date.now() + PROMO_DISMISS_DURATION_MS);
  }

  function scheduleSharedPromoRestore(callback) {
    if (sharedPromoRestoreTimer) window.clearTimeout(sharedPromoRestoreTimer);
    const remaining = getPromoDismissRemainingMs();
    if (remaining <= 0) return;
    sharedPromoRestoreTimer = window.setTimeout(() => {
      sharedPromoRestoreTimer = 0;
      window.__MARVELL_PROMO_DISMISSED_THIS_LOAD__ = false;
      setPromoDismissedUntil(0);
      if (typeof callback === "function") callback();
    }, remaining + 40);
  }

  if (wasHardReload()) setPromoDismissedUntil(0);

  function ensurePromoStrip() {
    if (!(document.body instanceof HTMLElement)) return;
    if (isPromoDismissedForSession()) {
      document.body.classList.remove("has-promo-strip", "promo-strip-closing");
      scheduleSharedPromoRestore(ensurePromoStrip);
      return;
    }
    if (!shouldUsePromoStrip()) {
      document.body.classList.remove("has-promo-strip", "promo-strip-closing");
      document.querySelector(".collection-promo-strip")?.remove();
      document.querySelector(".promo-strip-fallback")?.remove();
      return;
    }

    const header = document.querySelector("header");
    if (!(header instanceof HTMLElement)) return;

    let strip = document.querySelector(".collection-promo-strip");
	    const expectedPromoMarkup = `
	      <div class="collection-promo-track">
	        <div class="collection-promo-status">
	          <span class="collection-promo-progress" aria-hidden="true"><span class="collection-promo-progress-fill" id="collection-promo-progress-fill"></span></span>
	          <button class="collection-promo-play-toggle" id="collection-promo-play-toggle" type="button" aria-label="Pause seasonal promotions" aria-pressed="false" data-state="playing">
	            <span class="collection-promo-pause-icon" aria-hidden="true"><span></span><span></span></span>
	            <span class="collection-promo-play-icon" aria-hidden="true"></span>
	          </button>
	          <span class="collection-promo-status-text" id="collection-promo-status-text">1 / 1</span>
	        </div>
        <div class="collection-promo-viewport">
          <div class="collection-promo-stack" id="collection-promo-stack">
            <a class="collection-promo-link" id="collection-promo-link" href="featured.html">Collections - Explore the arrangements</a>
            <a class="collection-promo-link" id="collection-promo-link-next" href="featured.html" tabindex="-1" aria-hidden="true">Collections - Explore the arrangements</a>
          </div>
        </div>
        <button class="collection-promo-close" id="collection-promo-close" type="button" aria-label="Close seasonal promotion">&times;</button>
      </div>
    `;
    if (!(strip instanceof HTMLElement)) {
      strip = document.createElement("div");
      strip.className = "collection-promo-strip";
      strip.setAttribute("aria-hidden", "true");
      strip.innerHTML = expectedPromoMarkup;
      document.body.insertBefore(strip, header);
	    } else if (!(strip.querySelector("#collection-promo-progress-fill") instanceof HTMLElement) || !(strip.querySelector("#collection-promo-play-toggle") instanceof HTMLButtonElement) || !(strip.querySelector("#collection-promo-status-text") instanceof HTMLElement) || !(strip.querySelector("#collection-promo-link-next") instanceof HTMLAnchorElement) || !(strip.querySelector("#collection-promo-stack") instanceof HTMLElement)) {
      strip.innerHTML = expectedPromoMarkup;
    }

    let fallback = document.querySelector(".promo-strip-fallback");
    if (!(fallback instanceof HTMLElement)) {
      fallback = document.createElement("div");
      fallback.className = "promo-strip-fallback";
      fallback.setAttribute("aria-hidden", "true");
      if (strip.nextSibling) {
        document.body.insertBefore(fallback, strip.nextSibling);
      } else {
        document.body.insertBefore(fallback, header);
      }
    }

    document.body.classList.add("has-promo-strip");

    const closeButton = strip.querySelector(".collection-promo-close");
    if (closeButton instanceof HTMLButtonElement && closeButton.dataset.promoBound !== "1") {
      closeButton.dataset.promoBound = "1";
      closeButton.addEventListener("click", () => {
        if (strip.classList.contains("is-closing")) return;
        dismissPromoForSession();
        strip.classList.add("is-closing");
        document.body.classList.add("promo-strip-closing");
        window.setTimeout(() => {
          document.body.classList.remove("has-promo-strip");
          strip.classList.remove("is-closing");
          document.body.classList.remove("promo-strip-closing");
          scheduleSharedPromoRestore(ensurePromoStrip);
        }, 520);
      });
    }
  }

  function ensureDesktopControlOrder() {
    if (typeof window.matchMedia !== "function" || !window.matchMedia("(min-width: 769px)").matches) return;
    const headerBar = document.querySelector(".header-bar");
    if (!(headerBar instanceof HTMLElement)) return;
    const menuToggle = headerBar.querySelector(".menu-toggle");
    const searchToggle = headerBar.querySelector(".search-toggle");
    if (!(menuToggle instanceof HTMLElement) || !(searchToggle instanceof HTMLElement)) return;
    const parent =
      menuToggle.parentElement instanceof HTMLElement &&
      menuToggle.parentElement === searchToggle.parentElement
        ? menuToggle.parentElement
        : headerBar;
    if (!(parent instanceof HTMLElement) || !parent.contains(searchToggle)) return;
    if (menuToggle.compareDocumentPosition(searchToggle) & Node.DOCUMENT_POSITION_PRECEDING) {
      parent.insertBefore(menuToggle, searchToggle);
    }
  }

  function initialize() {
    ensureStyles();
    ensureSafeAreaFills();
    ensurePromoStrip();
    ensureMobileSearchTrigger();
    ensureAccountEntry();
    ensureContactIcon();
    ensureMobileActionCluster();
    ensureDesktopControlOrder();
    window.MarvellIcons?.adopt?.();
    ensureFeaturedMenuFallback();

    // favorites.js and bag.js inject their launchers asynchronously. Observe
    // only those additions: watching every carousel and animation mutation
    // made the header redo work across the whole page while it was loading.
    if (typeof MutationObserver === "function" && document.body) {
      const launcherSelector = ".favorites-launcher, .bag-launcher";
      const observer = new MutationObserver((mutations) => {
        const launcherAdded = mutations.some((mutation) => [...mutation.addedNodes].some((node) =>
          node instanceof Element && (node.matches(launcherSelector) || node.querySelector?.(launcherSelector))
        ));
        if (!launcherAdded) return;
        ensureAccountEntry();
        ensureContactIcon();
        window.MarvellIcons?.adopt?.(document.querySelector(".header-bar"));
      });
      observer.observe(document.body, { childList: true, subtree: true });
      window.setTimeout(() => observer.disconnect(), 8000);
    }

    // The entry reads "Join Marvell" to a guest and "Account" to somebody
    // signed in. The panel says when that changes rather than the header
    // polling for it — and the observer above has stopped by then.
    window.addEventListener("marvell:account-change", () => ensureAccountEntry());

    document.querySelectorAll(".header-contact, .contact-quick-trigger").forEach((control) => {
      if (control instanceof HTMLElement && !control.hasAttribute("aria-label")) {
        control.setAttribute("aria-label", control.textContent?.trim() || "Contact us");
      }
    });
    if (document.body) {
      document.body.dataset.headerTemplateApplied = "1";
      document.body.dataset.mobileSearchEnabled = isHomePage() ? "true" : "false";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
