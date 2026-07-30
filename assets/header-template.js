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
      @font-face {
        font-family: "AdelioDisplayCondensedLight";
        src: url("AdelioDisplayCondensed-Light-v0.1.ttf") format("truetype");
        font-style: normal;
        font-weight: 300;
        font-display: swap;
      }
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
        transition: max-height 0.5s ease, transform 0.5s ease !important;
      }
      body.has-promo-strip .collection-promo-strip {
        max-height: var(--promo-strip-height) !important;
        opacity: 1 !important;
        transform: translateY(0) !important;
      }
      .collection-promo-strip.is-closing {
        max-height: var(--promo-strip-height) !important;
        opacity: 1 !important;
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
        transition: height 0.5s ease !important;
      }
      body.has-promo-strip .promo-strip-fallback {
        height: var(--promo-strip-height) !important;
        opacity: 1 !important;
      }
      body.promo-strip-closing .promo-strip-fallback {
        height: var(--promo-strip-height) !important;
        opacity: 1 !important;
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
        display: inline-block !important;
        font-family: "AdelioDisplayCondensedLight", "Inter Tight", sans-serif !important;
        font-size: 32px !important;
        font-weight: 300 !important;
        line-height: 1 !important;
        letter-spacing: 0 !important;
        word-spacing: normal !important;
        text-transform: uppercase !important;
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
        stroke-width: 2 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }
      .search-toggle .search-label {
        display: inline-block !important;
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
        stroke-width: 2 !important;
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
        stroke-width: 2 !important;
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
      @media (min-width: 900px) {
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
      .contact-quick-backdrop {
        position: fixed !important;
        inset: 0 !important;
        background: rgba(0, 0, 0, 0.25) !important;
        backdrop-filter: blur(6px) !important;
        -webkit-backdrop-filter: blur(6px) !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.5s ease-in-out !important;
        z-index: 240 !important;
      }
      .contact-quick-backdrop.is-open {
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      .contact-quick-panel {
        position: fixed !important;
        top: 0 !important;
        bottom: auto !important;
        right: 0 !important;
        width: min(92vw, 600px) !important;
        height: 100vh !important;
        background: var(--footer-offwhite, #fff) !important;
        color: #151210 !important;
        transform: translateX(100%) !important;
        transition: transform 0.5s ease-in-out !important;
        z-index: 241 !important;
        box-shadow: none !important;
        display: grid !important;
        grid-template-rows: auto 1fr !important;
      }
      .contact-quick-panel.is-open {
        transform: translateX(0) !important;
        box-shadow: -20px 0 36px rgba(10, 12, 18, 0.18) !important;
      }
      #contact-quick-panel .contact-quick-head {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        padding: 24px 34px 8px !important;
      }
      #contact-quick-panel .contact-quick-close {
        width: 42px !important;
        height: 42px !important;
        border-radius: 50% !important;
        border: 0 !important;
        background: #111 !important;
        color: #fff !important;
        font-size: clamp(20px, 5.6vw, 23px) !important;
        font-weight: 300 !important;
        line-height: 1 !important;
        cursor: pointer !important;
        display: grid !important;
        place-items: center !important;
        transition: background 0.2s ease !important;
      }
      #contact-quick-panel .contact-quick-close:hover,
      #contact-quick-panel .contact-quick-close:focus-visible {
        background: #000 !important;
        outline: none !important;
      }
      #contact-quick-panel .contact-quick-body {
        padding: 18px 40px 34px 88px !important;
        display: grid !important;
        gap: 20px !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
      }
      #contact-quick-panel .contact-quick-block {
        display: grid !important;
        gap: 10px !important;
      }
      #contact-quick-panel .contact-quick-label {
        margin: 0 !important;
        font-family: "Inter Tight", sans-serif !important;
        font-size: 14px !important;
        line-height: 1.08 !important;
        letter-spacing: 0.12em !important;
        font-weight: 600 !important;
        color: rgba(21, 18, 16, 0.65) !important;
      }
      #contact-quick-panel .contact-quick-link,
      #contact-quick-panel .contact-quick-text {
        margin: 0 !important;
        font-family: "Inter Tight", sans-serif !important;
        font-size: 14px !important;
        line-height: 1.45 !important;
        color: #1d1a18 !important;
      }
      #contact-quick-panel .contact-quick-link {
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        text-decoration: none !important;
        font-size: clamp(14px, 1.3vw, 18px) !important;
        font-weight: 500 !important;
        line-height: 1.22 !important;
        width: fit-content !important;
      }
      #contact-quick-panel .contact-quick-link::after {
        content: "\\203A" !important;
        position: static !important;
        width: auto !important;
        height: auto !important;
        background: none !important;
        opacity: 0 !important;
        transform: translateX(-4px) !important;
        transition: opacity 0.2s ease, transform 0.2s ease !important;
      }
      #contact-quick-panel .contact-quick-link:hover,
      #contact-quick-panel .contact-quick-link:focus-visible {
        opacity: 0.85 !important;
        text-decoration: none !important;
        outline: none !important;
      }
      #contact-quick-panel .contact-quick-link:hover::after,
      #contact-quick-panel .contact-quick-link:focus-visible::after {
        opacity: 0.65 !important;
        transform: translateX(0) !important;
      }
      #contact-quick-panel .contact-quick-text.is-muted {
        color: rgba(21, 18, 16, 0.62) !important;
      }
      body.contact-quick-open {
        overflow: hidden !important;
      }
      @media (max-width: 899px) {
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
        .contact-quick-panel {
          left: 0 !important;
          right: 0 !important;
          top: auto !important;
          bottom: 0 !important;
          width: 100vw !important;
          max-width: none !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          transform: translateY(100%) !important;
        }
        .contact-quick-panel.is-open {
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
          gap: 6px !important;
          flex-wrap: nowrap !important;
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
        .header-logo-text {
          font-size: clamp(20px, 5.6vw, 23px) !important;
          letter-spacing: 0 !important;
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
        #contact-quick-panel .contact-quick-head {
          padding: calc(env(safe-area-inset-top, 0px) + 20px) max(20px, env(safe-area-inset-right, 0px)) 8px max(20px, env(safe-area-inset-left, 0px)) !important;
        }
        #contact-quick-panel .contact-quick-body {
          padding: 18px max(24px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 34px) max(24px, env(safe-area-inset-left, 0px)) !important;
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

  function ensureMobileActionCluster() {
    const headerBar = document.querySelector(".header-bar");
    if (!(headerBar instanceof HTMLElement)) return;
    let cluster = headerBar.querySelector(".mobile-header-actions");
    if (!(cluster instanceof HTMLElement)) {
      cluster = document.createElement("div");
      cluster.className = "mobile-header-actions";
      headerBar.appendChild(cluster);
    }
    const controls = [
      headerBar.querySelector(".favorites-launcher"),
      headerBar.querySelector(".search-toggle"),
      headerBar.querySelector(".menu-toggle")
    ];
    controls.forEach((control) => {
      if (!(control instanceof HTMLElement)) return;
      if (control.parentElement !== cluster) cluster.appendChild(control);
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

  function normalizeBrandTitle() {
    document.querySelectorAll(".header-logo-text").forEach((node) => {
      if (node instanceof HTMLElement) node.textContent = "MARVELL FLORIST";
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
    if (typeof window.matchMedia !== "function" || !window.matchMedia("(min-width: 900px)").matches) return;
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
    ensurePromoStrip();
    ensureMobileSearchTrigger();
    ensureMobileActionCluster();
    ensureDesktopControlOrder();
    ensureFeaturedMenuFallback();
    normalizeBrandTitle();
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
