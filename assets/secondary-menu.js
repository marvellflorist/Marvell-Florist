(function () {
  if (typeof document === "undefined") return;
  const menuToggle = document.querySelector(".menu-toggle");
  const existingPanel = document.getElementById("menu-panel");
  if (!(menuToggle instanceof HTMLElement) && !(existingPanel instanceof HTMLElement)) return;

  const styleId = "secondary-menu-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .menu-toggle {
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin-left: 0 !important;
        order: 1 !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 10px !important;
        color: rgba(42, 33, 24, 0.82) !important;
        font-family: "Inter Tight", sans-serif !important;
        font-size: 12px !important;
        font-weight: 400 !important;
        letter-spacing: 0.06em !important;
        line-height: 1.1 !important;
        text-transform: none !important;
        text-decoration: none !important;
        cursor: pointer !important;
        appearance: none;
        -webkit-appearance: none;
      }
      .menu-toggle:hover,
      .menu-toggle:focus-visible {
        opacity: 0.84;
        outline: none;
      }
      .menu-toggle .menu-label {
        display: inline-block;
      }
      .menu-toggle .menu-icon {
        display: inline-flex !important;
        flex-direction: column !important;
        gap: 4px !important;
      }
      .menu-toggle .menu-icon span {
        display: block !important;
        width: 18px !important;
        height: 2px !important;
        background: rgba(42, 33, 24, 0.72) !important;
      }
      .menu-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(12, 10, 9, 0.34);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.5s ease-in-out;
        z-index: 240;
      }
      .menu-backdrop.is-open {
        opacity: 1;
        pointer-events: auto;
      }
      .menu-panel[aria-hidden="true"]:not(.is-open) {
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      .menu-panel[data-menu-booting="true"] {
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      .menu-panel[data-menu-preinit="true"],
      .menu-panel[data-menu-preinit="true"]::after,
      .menu-panel[data-menu-preinit="true"] .menu-view,
      .menu-panel[data-menu-preinit="true"] .menu-main-quickpane,
      .menu-panel[data-menu-preinit="true"] .menu-quick-panel,
      .menu-backdrop[data-menu-preinit="true"] {
        transition: none !important;
        animation: none !important;
      }
      .menu-panel {
        --menu-panel-base-width: 500px;
        --menu-panel-single-width: min(92vw, var(--menu-panel-base-width));
        --menu-panel-width: var(--menu-panel-single-width);
        position: fixed !important;
        top: 0 !important;
        bottom: auto !important;
        left: 0 !important;
        right: auto !important;
        width: var(--menu-panel-width) !important;
        height: 100vh !important;
        background: var(--footer-offwhite, #fff) !important;
        color: #151210 !important;
        transform: translateX(-100%) !important;
        transition: transform 0.5s ease-in-out, width 0.42s cubic-bezier(0.22, 1, 0.36, 1) !important;
        z-index: 241 !important;
        box-shadow: none !important;
        display: grid !important;
        grid-template-rows: auto 1fr !important;
        border-top: 0 !important;
        border-right: 1px solid rgba(29, 26, 24, 0.08) !important;
        border-left: 0 !important;
        overflow: hidden !important;
      }
      .menu-panel::after {
        content: "";
        position: absolute !important;
        top: 0 !important;
        bottom: 0 !important;
        left: var(--menu-panel-single-width) !important;
        width: 1px !important;
        background: rgba(29, 26, 24, 0.14) !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.3s ease !important;
        z-index: 2 !important;
      }
      .menu-panel[data-menu-quick-active="true"] {
        width: min(96vw, calc(var(--menu-panel-single-width) * 2)) !important;
      }
      .menu-panel[data-menu-quick-active="true"]::after {
        opacity: 1 !important;
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
        width: var(--menu-panel-single-width) !important;
        min-width: var(--menu-panel-single-width) !important;
        position: relative !important;
        z-index: 3 !important;
      }
      .menu-close {
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
        transition: background 0.2s ease, border-color 0.2s ease;
      }
      .menu-close:hover,
      .menu-close:focus-visible {
        background: #000;
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
        inset: 30px 0 46px !important;
        justify-items: start !important;
        text-align: left !important;
        align-content: start !important;
        gap: 0 !important;
      }
      .menu-main-layout {
        display: grid !important;
        grid-template-columns: minmax(0, var(--menu-panel-single-width)) 0 !important;
        min-height: 100% !important;
        width: 100% !important;
        justify-content: start !important;
        position: relative !important;
      }
      .menu-panel[data-menu-quick-active="true"] .menu-main-layout {
        grid-template-columns: minmax(0, var(--menu-panel-single-width)) minmax(0, var(--menu-panel-single-width)) !important;
      }
      .menu-main-left {
        display: grid !important;
        justify-items: start !important;
        align-content: start !important;
        padding: 0 68px !important;
        width: var(--menu-panel-single-width) !important;
        min-width: 0 !important;
        grid-column: 1 !important;
        position: relative !important;
        z-index: 2 !important;
        background: var(--footer-offwhite, #fff) !important;
        transition: color 0.28s ease, opacity 0.28s ease !important;
      }
      .menu-view[data-menu-view="about"],
      .menu-view[data-menu-view="services"],
      .menu-view[data-menu-view="visit"] {
        justify-items: start;
        align-content: start;
        gap: 10px;
      }
      .menu-main-primary,
      .menu-main-secondary {
        display: grid;
        justify-items: start;
      }
      .menu-main-primary {
        gap: 18px;
      }
      .menu-main-secondary {
        margin-top: 52px;
        gap: 16px;
      }
      .menu-main-secondary [data-menu-quick] {
        width: 100%;
        justify-content: space-between;
        transition: color 0.42s ease, opacity 0.42s ease;
        will-change: color, opacity;
      }
      .menu-main-secondary [data-menu-quick]::after {
        content: "›";
        opacity: 0;
        transition: opacity 0.28s ease, color 0.28s ease;
      }
      .menu-main-secondary [data-menu-quick].is-quick-active::after,
      .menu-main-secondary [data-menu-quick]:hover::after,
      .menu-main-secondary [data-menu-quick]:focus-visible::after {
        opacity: 1;
      }
      .menu-main-quickpane {
        position: relative !important;
        min-width: 0 !important;
        width: var(--menu-panel-single-width) !important;
        height: 100% !important;
        padding: 0 !important;
        background: var(--footer-offwhite, #fff) !important;
        border: 0 !important;
        border-left: 1px solid rgba(29, 26, 24, 0.08) !important;
        box-shadow: none !important;
        opacity: 0 !important;
        transform: translateX(-42px) !important;
        pointer-events: none !important;
        transition: opacity 0.56s ease, transform 0.92s cubic-bezier(0.16, 0.84, 0.2, 1) !important;
        overflow: hidden !important;
        grid-column: 2 !important;
        z-index: 1 !important;
      }
      .menu-quick-panel {
        position: absolute !important;
        inset: 0 !important;
        padding: 0 72px 0 46px !important;
        display: grid !important;
        align-content: start !important;
        gap: 22px !important;
        opacity: 0 !important;
        transform: translateX(-22px) !important;
        pointer-events: none !important;
        transition: opacity 0.52s ease, transform 0.82s cubic-bezier(0.16, 0.84, 0.2, 1) !important;
      }
      .menu-panel[data-menu-quick-active="true"] .menu-main-quickpane[data-quick-current="collections"],
      .menu-panel[data-menu-quick-active="true"] .menu-main-quickpane[data-quick-current="about"],
      .menu-panel[data-menu-quick-active="true"] .menu-main-quickpane[data-quick-current="services"],
      .menu-panel[data-menu-quick-active="true"] .menu-main-quickpane[data-quick-current="visit"] {
        opacity: 1 !important;
        transform: translateX(0) !important;
        pointer-events: auto !important;
      }
      .menu-main-quickpane[data-quick-current="collections"],
      .menu-main-quickpane[data-quick-current="about"],
      .menu-main-quickpane[data-quick-current="services"],
      .menu-main-quickpane[data-quick-current="visit"] {
        background: var(--footer-offwhite, #fff) !important;
      }
      .menu-main-quickpane[data-quick-current="collections"] .menu-quick-panel[data-quick-panel="collections"],
      .menu-main-quickpane[data-quick-current="about"] .menu-quick-panel[data-quick-panel="about"],
      .menu-main-quickpane[data-quick-current="services"] .menu-quick-panel[data-quick-panel="services"],
      .menu-main-quickpane[data-quick-current="visit"] .menu-quick-panel[data-quick-panel="visit"] {
        opacity: 1 !important;
        transform: translateX(0) !important;
        pointer-events: auto !important;
      }
      .menu-quick-link {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        text-decoration: none;
        color: #1d1a18;
        font-family: "Inter Tight", sans-serif;
        font-size: 19px;
        font-weight: 500;
        line-height: 1.34;
        transition: opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1), color 0.42s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .menu-quick-link::after {
        content: "›";
        margin-left: 10px;
        opacity: 0;
        transform: translateX(-4px);
        transition: opacity 0.24s ease, transform 0.24s ease;
      }
      .menu-quick-link:hover::after,
      .menu-quick-link:focus-visible::after {
        opacity: 1;
        transform: translateX(0);
      }
      .menu-panel[data-menu-quick-active="true"] .menu-main-left .menu-link,
      .menu-panel[data-menu-quick-active="true"] .menu-main-left .menu-link-button {
        color: rgba(29, 26, 24, 0.52);
      }
      .menu-panel[data-menu-quick-active="true"] .menu-main-left .menu-link:hover,
      .menu-panel[data-menu-quick-active="true"] .menu-main-left .menu-link:focus-visible,
      .menu-panel[data-menu-quick-active="true"] .menu-main-left .menu-link-button:hover,
      .menu-panel[data-menu-quick-active="true"] .menu-main-left .menu-link-button:focus-visible {
        color: #1d1a18;
      }
      .menu-panel[data-menu-quick-active="true"] .menu-main-left [data-menu-quick].is-quick-active {
        color: #1d1a18;
      }
      .menu-panel[data-menu-quick-closing="true"] .menu-main-quickpane {
        transition-duration: 0.46s, 0.54s;
      }
      .menu-panel[data-menu-quick-closing="true"] .menu-quick-panel {
        transition-duration: 0.28s, 0.38s;
      }
      .menu-panel[data-menu-current="main"] .menu-view[data-menu-view="main"],
      .menu-panel[data-menu-current="featured"] .menu-view[data-menu-view="featured"],
      .menu-panel[data-menu-current="contact"] .menu-view[data-menu-view="contact"],
      .menu-panel[data-menu-current="about"] .menu-view[data-menu-view="about"],
      .menu-panel[data-menu-current="services"] .menu-view[data-menu-view="services"],
      .menu-panel[data-menu-current="visit"] .menu-view[data-menu-view="visit"] {
        opacity: 1 !important;
        transform: translateX(0) !important;
        pointer-events: auto !important;
        visibility: visible !important;
      }
      .menu-panel[data-menu-current="featured"] .menu-view[data-menu-view="main"],
      .menu-panel[data-menu-current="contact"] .menu-view[data-menu-view="main"],
      .menu-panel[data-menu-current="about"] .menu-view[data-menu-view="main"],
      .menu-panel[data-menu-current="services"] .menu-view[data-menu-view="main"],
      .menu-panel[data-menu-current="visit"] .menu-view[data-menu-view="main"] {
        transform: translateX(-18px) !important;
      }
      .menu-link,
      .menu-link-button {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: #1d1a18;
        text-decoration: none;
        font-family: "Inter Tight", sans-serif;
        font-size: clamp(19px, 1.55vw, 23px);
        font-weight: 500;
        line-height: 1.24;
        width: fit-content;
        justify-content: flex-start;
        border: 0;
        background: transparent;
        padding: 0;
        cursor: pointer;
        text-align: left;
        transition: color 0.48s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.48s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .menu-link-secondary,
      .menu-link-button.menu-link-secondary {
        font-size: 18px;
        font-weight: 500;
        letter-spacing: 0.03em;
        line-height: 1.42;
        color: #1d1a18;
        transition: color 0.42s ease, opacity 0.42s ease;
      }
      .menu-link::after,
      .menu-link-button::after {
        content: "›";
        margin-left: auto;
        opacity: 0;
        transform: none;
        transition: opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1), transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .menu-main-primary .menu-link::after,
      .menu-main-primary .menu-link-button::after {
        content: none;
      }
      .menu-main-primary .menu-link .nav-label::after,
      .menu-main-primary .menu-link-button .nav-label::after {
        content: "";
        position: absolute;
        left: 0;
        bottom: -2px;
        width: 100%;
        height: 1px;
        background: currentColor;
        transform: scaleX(0);
        transform-origin: left center;
        transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .menu-main-primary .menu-link:hover .nav-label::after,
      .menu-main-primary .menu-link:focus-visible .nav-label::after,
      .menu-main-primary .menu-link-button:hover .nav-label::after,
      .menu-main-primary .menu-link-button:focus-visible .nav-label::after {
        transform: scaleX(1);
      }
      .menu-back::after {
        content: none;
      }
      .menu-back {
        width: fit-content;
        gap: 6px;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(21, 18, 16, 0.72);
      }
      .menu-back::after {
        content: none;
      }
      .menu-link:hover,
      .menu-link:focus-visible {
        text-decoration: none;
        outline: none;
      }
      .menu-link:hover::after,
      .menu-link:focus-visible::after,
      .menu-link-button:hover::after,
      .menu-link-button:focus-visible::after {
        opacity: 1;
        transform: none;
      }
      .menu-subtitle {
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        letter-spacing: 0.08em;
        color: rgba(21, 18, 16, 0.65);
      }
      .menu-view[data-menu-view="about"] .menu-link,
      .menu-view[data-menu-view="services"] .menu-link,
      .menu-view[data-menu-view="visit"] .menu-link {
        font-size: 18px;
        font-weight: 400;
        letter-spacing: 0.02em;
        line-height: 1.42;
      }
      .menu-view[data-menu-view="about"] .menu-link::after,
      .menu-view[data-menu-view="services"] .menu-link::after,
      .menu-view[data-menu-view="visit"] .menu-link::after {
        opacity: 0.34;
      }
      .menu-view[data-menu-view="about"] .menu-link:hover::after,
      .menu-view[data-menu-view="about"] .menu-link:focus-visible::after,
      .menu-view[data-menu-view="services"] .menu-link:hover::after,
      .menu-view[data-menu-view="services"] .menu-link:focus-visible::after,
      .menu-view[data-menu-view="visit"] .menu-link:hover::after,
      .menu-view[data-menu-view="visit"] .menu-link:focus-visible::after {
        opacity: 1;
      }
      [data-featured-menu-list] {
        display: grid;
        align-content: start;
        gap: 16px;
      }
      .menu-link-contact {
        display: none;
      }
      .menu-view[data-menu-view="contact"] {
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .menu-view[data-menu-view="contact"] .contact-quick-body {
        padding: 8px 0 0;
      }
      .contact-quick-body {
        padding: 8px 30px 30px;
        display: grid;
        gap: 22px;
      }
      .contact-quick-block {
        display: grid;
        gap: 8px;
      }
      .contact-quick-label {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        line-height: 1.08;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(21, 18, 16, 0.65);
      }
      .contact-quick-link {
        font-family: "Inter Tight", sans-serif;
        color: #1d1a18;
        text-decoration: none;
        font-size: 15px;
        line-height: 1.24;
        width: fit-content;
        position: relative;
      }
      .contact-quick-block .contact-quick-link + .contact-quick-link {
        margin-top: 1px;
      }
      .contact-quick-block .contact-quick-text + .contact-quick-text {
        margin-top: -4px;
      }
      .contact-quick-link:hover,
      .contact-quick-link:focus-visible {
        opacity: 0.85;
        text-decoration: underline;
        text-underline-offset: 0.08em;
        text-decoration-thickness: 1px;
      }
      .contact-quick-link::after {
        content: none;
        position: absolute;
        left: 0;
        bottom: 0;
        width: 100%;
        height: 1px;
        background: currentColor;
        transform: scaleX(0);
        transform-origin: left center;
        transition: transform 0.22s ease;
      }
      .contact-quick-link:hover::after,
      .contact-quick-link:focus-visible::after {
        transform: scaleX(1);
      }
      .contact-quick-text {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 13px;
        line-height: 1.4;
        color: rgba(21, 18, 16, 0.82);
      }
      .contact-quick-text.is-muted {
        color: rgba(21, 18, 16, 0.55);
      }
      @media (max-width: 768px) {
        .menu-panel {
          --mobile-menu-left-gutter: 14px;
          --mobile-menu-right-gutter: 16px;
          --mobile-menu-icon-track: 42px;
          --menu-panel-single-width: 100vw !important;
          --menu-panel-width: 100vw !important;
          width: 100vw !important;
          min-width: 100vw !important;
          max-width: 100vw !important;
          left: 0 !important;
          right: 0 !important;
          top: auto !important;
          bottom: 0 !important;
          border-top: 1px solid rgba(29, 26, 24, 0.08) !important;
          border-left: 0 !important;
          border-right: 0 !important;
          transform: translateY(100%) !important;
        }
        .menu-panel.is-open {
          transform: translateY(0) !important;
          box-shadow: 0 -20px 36px rgba(10, 12, 18, 0.18) !important;
        }
        .menu-panel[data-menu-quick-active="true"] {
          width: 100vw !important;
        }
        .menu-panel::after {
          display: none !important;
        }
        .menu-close {
          width: 40px;
          height: 40px;
          font-size: 22px;
        }
        header {
          height: 72px !important;
          padding: 0 12px !important;
        }
        header::before,
        .header-bar {
          height: 72px !important;
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
        .header-logo-text {
          font-size: 23px !important;
        }
        .header-logo {
          order: 1 !important;
          max-width: calc(100% - 172px) !important;
          overflow: hidden !important;
          flex: 1 1 auto !important;
        }
        .language-switcher {
          order: 2 !important;
          margin-left: 0 !important;
          gap: 2px !important;
        }
        .header-contact,
        .contact-quick-trigger {
          display: none !important;
        }
        .search-toggle {
          display: inline-flex !important;
          order: 4 !important;
          gap: 0 !important;
          margin-left: 0 !important;
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
        .menu-toggle {
          position: static !important;
          left: auto !important;
          right: auto !important;
          top: auto !important;
          transform: none !important;
          gap: 0 !important;
          padding: 0 !important;
          order: 5 !important;
          margin-left: 0 !important;
          flex: 0 0 auto !important;
          min-width: 20px !important;
        }
        .menu-toggle .menu-label {
          display: none !important;
        }
        .menu-head {
          justify-content: flex-end;
          padding: 14px var(--mobile-menu-right-gutter) 0 0;
          width: 100vw !important;
          min-width: 100vw !important;
        }
        .menu-view {
          inset: 62px 0 28px 0 !important;
          gap: 24px;
        }
        .menu-view[data-menu-view="main"] {
          align-content: start;
          justify-items: stretch !important;
          text-align: left;
          gap: 0;
          width: 100% !important;
        }
        .menu-main-layout {
          display: block;
          width: 100% !important;
        }
        .menu-main-quickpane {
          display: none;
        }
        .menu-main-left {
          padding: 0 !important;
          justify-items: stretch !important;
          width: 100% !important;
        }
        .menu-view[data-menu-view="about"],
        .menu-view[data-menu-view="services"],
        .menu-view[data-menu-view="visit"] {
          justify-items: stretch !important;
          gap: 16px;
          width: 100% !important;
        }
        .menu-view[data-menu-view="featured"],
        .menu-view[data-menu-view="contact"] {
          justify-items: stretch !important;
          width: 100% !important;
        }
        .menu-main-primary,
        .menu-main-secondary {
          justify-items: stretch !important;
          width: 100% !important;
        }
        .menu-main-primary {
          gap: 18px;
        }
        .menu-main-secondary {
          margin-top: 22px;
          gap: 18px;
        }
        .menu-link,
        .menu-link-button {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) var(--mobile-menu-icon-track) !important;
          align-items: center !important;
          width: 100%;
          padding: 6px var(--mobile-menu-right-gutter) 6px var(--mobile-menu-left-gutter) !important;
          font-size: clamp(18px, 5.2vw, 21px);
          line-height: 1.24;
          box-sizing: border-box !important;
          column-gap: 0 !important;
          justify-self: stretch !important;
          min-width: 0 !important;
        }
        .menu-link-secondary,
        .menu-link-button.menu-link-secondary {
          width: 100%;
          font-size: 17px;
        }
        .menu-link::after,
        .menu-link-button::after {
          content: "›" !important;
          position: static !important;
          justify-self: center !important;
          align-self: center !important;
          width: auto !important;
          margin: 0 !important;
          opacity: 0.72 !important;
          transform: none !important;
          text-align: center !important;
          display: block !important;
        }
        .menu-link .nav-label,
        .menu-link-button .nav-label {
          min-width: 0;
          display: block;
        }
        .menu-view[data-menu-view="featured"] .menu-link,
        .menu-view[data-menu-view="about"] .menu-link,
        .menu-view[data-menu-view="services"] .menu-link,
        .menu-view[data-menu-view="visit"] .menu-link,
        .menu-view[data-menu-view="contact"] .menu-link,
        .menu-view[data-menu-view="featured"] .menu-link-button,
        .menu-view[data-menu-view="about"] .menu-link-button,
        .menu-view[data-menu-view="services"] .menu-link-button,
        .menu-view[data-menu-view="visit"] .menu-link-button,
        .menu-view[data-menu-view="contact"] .menu-link-button {
          padding: 6px var(--mobile-menu-right-gutter) 6px var(--mobile-menu-left-gutter) !important;
        }
        .menu-view[data-menu-view="featured"] .menu-back,
        .menu-view[data-menu-view="about"] .menu-back,
        .menu-view[data-menu-view="services"] .menu-back,
        .menu-view[data-menu-view="visit"] .menu-back,
        .menu-view[data-menu-view="contact"] .menu-back {
          grid-template-columns: minmax(0, 1fr) !important;
          width: 100%;
          padding: 6px var(--mobile-menu-right-gutter) 6px var(--mobile-menu-left-gutter) !important;
          font-size: 10px !important;
          line-height: 1.1 !important;
          letter-spacing: 0.14em !important;
          font-weight: 500 !important;
          text-transform: uppercase !important;
        }
        .menu-view[data-menu-view="featured"] .menu-back::after,
        .menu-view[data-menu-view="about"] .menu-back::after,
        .menu-view[data-menu-view="services"] .menu-back::after,
        .menu-view[data-menu-view="visit"] .menu-back::after,
        .menu-view[data-menu-view="contact"] .menu-back::after {
          content: none !important;
          display: none !important;
        }
        .menu-view[data-menu-view="contact"] {
          justify-items: stretch !important;
          gap: 18px;
          width: 100% !important;
        }
        body[data-shared-menu-applied="1"] .menu-panel .menu-view[data-menu-view="main"],
        body[data-shared-menu-applied="1"] .menu-panel[data-menu-current="main"] .menu-view[data-menu-view="main"],
        body[data-shared-menu-applied="1"] .menu-panel[data-menu-current="featured"] .menu-view[data-menu-view="featured"],
        body[data-shared-menu-applied="1"] .menu-panel[data-menu-current="about"] .menu-view[data-menu-view="about"],
        body[data-shared-menu-applied="1"] .menu-panel[data-menu-current="services"] .menu-view[data-menu-view="services"],
        body[data-shared-menu-applied="1"] .menu-panel[data-menu-current="visit"] .menu-view[data-menu-view="visit"],
        body[data-shared-menu-applied="1"] .menu-panel[data-menu-current="contact"] .menu-view[data-menu-view="contact"],
        body[data-shared-menu-applied="1"] .menu-panel .menu-view[data-menu-view="featured"],
        body[data-shared-menu-applied="1"] .menu-panel .menu-view[data-menu-view="about"],
        body[data-shared-menu-applied="1"] .menu-panel .menu-view[data-menu-view="services"],
        body[data-shared-menu-applied="1"] .menu-panel .menu-view[data-menu-view="visit"],
        body[data-shared-menu-applied="1"] .menu-panel .menu-view[data-menu-view="contact"],
        body[data-shared-menu-applied="1"] .menu-panel .menu-main-left,
        body[data-shared-menu-applied="1"] .menu-panel .menu-main-primary,
        body[data-shared-menu-applied="1"] .menu-panel .menu-main-secondary {
          justify-items: stretch !important;
          width: 100% !important;
        }
        body[data-shared-menu-applied="1"] .menu-panel .menu-view {
          left: 0 !important;
          right: 0 !important;
          inset: 62px 0 28px 0 !important;
        }
        body[data-shared-menu-applied="1"] .menu-panel .menu-close {
          width: 40px !important;
          height: 40px !important;
          font-size: 22px !important;
        }
        body[data-shared-menu-applied="1"] .menu-panel .menu-link,
        body[data-shared-menu-applied="1"] .menu-panel .menu-link-button,
        body[data-shared-menu-applied="1"] .menu-panel .menu-back {
          width: 100% !important;
          justify-self: stretch !important;
          min-width: 0 !important;
        }
        body[data-shared-menu-applied="1"] .menu-panel .menu-view[data-menu-view="featured"] .menu-back,
        body[data-shared-menu-applied="1"] .menu-panel .menu-view[data-menu-view="about"] .menu-back,
        body[data-shared-menu-applied="1"] .menu-panel .menu-view[data-menu-view="services"] .menu-back,
        body[data-shared-menu-applied="1"] .menu-panel .menu-view[data-menu-view="visit"] .menu-back,
        body[data-shared-menu-applied="1"] .menu-panel .menu-view[data-menu-view="contact"] .menu-back {
          grid-template-columns: minmax(0, 1fr) !important;
          width: 100% !important;
          padding: 6px var(--mobile-menu-right-gutter) 6px var(--mobile-menu-left-gutter) !important;
          font-size: 10px !important;
          line-height: 1.1 !important;
          letter-spacing: 0.14em !important;
          font-weight: 500 !important;
          text-transform: uppercase !important;
        }
        .menu-view[data-menu-view="contact"] .contact-quick-body {
          padding: 10px var(--mobile-menu-right-gutter) 0 var(--mobile-menu-left-gutter);
          gap: 24px;
        }
        .contact-quick-block {
          gap: 11px;
        }
        .contact-quick-label {
          font-size: 12px;
          letter-spacing: 0.14em;
        }
        .contact-quick-link {
          font-size: 21px;
          line-height: 1.22;
        }
        .contact-quick-text {
          font-size: 15px;
          line-height: 1.48;
        }
        .menu-link-contact {
          display: grid !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel {
          --mobile-menu-left-gutter: 14px !important;
          --mobile-menu-right-gutter: 16px !important;
          --mobile-menu-icon-track: 42px !important;
          --menu-panel-single-width: 100vw !important;
          --menu-panel-width: 100vw !important;
          width: 100vw !important;
          min-width: 100vw !important;
          max-width: 100vw !important;
          left: 0 !important;
          right: 0 !important;
          top: auto !important;
          bottom: 0 !important;
          border-top: 1px solid rgba(29, 26, 24, 0.08) !important;
          border-left: 0 !important;
          border-right: 0 !important;
          transform: translateY(100%) !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel.is-open {
          transform: translateY(0) !important;
          box-shadow: 0 -20px 36px rgba(10, 12, 18, 0.18) !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel[data-menu-quick-active="true"] {
          width: 100vw !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel::after {
          display: none !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-head {
          justify-content: flex-end !important;
          padding: 14px var(--mobile-menu-right-gutter) 0 0 !important;
          width: 100vw !important;
          min-width: 100vw !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-close {
          width: 40px !important;
          height: 40px !important;
          font-size: 22px !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view {
          left: 0 !important;
          right: 0 !important;
          inset: 62px 0 28px 0 !important;
          gap: 24px !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="main"] {
          align-content: start !important;
          justify-items: stretch !important;
          text-align: left !important;
          gap: 0 !important;
          width: 100% !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="featured"],
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="about"],
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="services"],
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="visit"],
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="contact"] {
          justify-items: stretch !important;
          width: 100% !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel[data-menu-current="main"] .menu-view[data-menu-view="main"],
        body[data-menu-mobile-standardized="index"] .menu-panel[data-menu-current="featured"] .menu-view[data-menu-view="featured"],
        body[data-menu-mobile-standardized="index"] .menu-panel[data-menu-current="about"] .menu-view[data-menu-view="about"],
        body[data-menu-mobile-standardized="index"] .menu-panel[data-menu-current="services"] .menu-view[data-menu-view="services"],
        body[data-menu-mobile-standardized="index"] .menu-panel[data-menu-current="visit"] .menu-view[data-menu-view="visit"],
        body[data-menu-mobile-standardized="index"] .menu-panel[data-menu-current="contact"] .menu-view[data-menu-view="contact"] {
          transform: translateX(0) !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-main-layout {
          display: block !important;
          width: 100% !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-main-quickpane {
          display: none !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-main-left,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-main-primary,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-main-secondary {
          justify-items: stretch !important;
          width: 100% !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-main-left {
          padding: 0 !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="about"],
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="services"],
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="visit"] {
          gap: 16px !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-main-primary {
          gap: 18px !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-main-secondary {
          margin-top: 22px !important;
          gap: 18px !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-link,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-link-button {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) var(--mobile-menu-icon-track) !important;
          align-items: center !important;
          width: 100% !important;
          padding: 6px var(--mobile-menu-right-gutter) 6px var(--mobile-menu-left-gutter) !important;
          font-size: clamp(18px, 5.2vw, 21px) !important;
          line-height: 1.24 !important;
          box-sizing: border-box !important;
          column-gap: 0 !important;
          justify-self: stretch !important;
          min-width: 0 !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-link-secondary,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-link-button.menu-link-secondary {
          width: 100% !important;
          font-size: 17px !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-link::after,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-link-button::after {
          content: "›" !important;
          position: static !important;
          justify-self: center !important;
          align-self: center !important;
          width: auto !important;
          margin: 0 !important;
          opacity: 0.72 !important;
          transform: none !important;
          text-align: center !important;
          display: block !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-link .nav-label,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-link-button .nav-label {
          min-width: 0 !important;
          display: block !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="featured"] .menu-link,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="about"] .menu-link,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="services"] .menu-link,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="visit"] .menu-link,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="contact"] .menu-link,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="featured"] .menu-link-button,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="about"] .menu-link-button,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="services"] .menu-link-button,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="visit"] .menu-link-button,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="contact"] .menu-link-button,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="featured"] .menu-back,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="about"] .menu-back,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="services"] .menu-back,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="visit"] .menu-back,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="contact"] .menu-back {
          width: 100% !important;
          justify-self: stretch !important;
          padding: 6px var(--mobile-menu-right-gutter) 6px var(--mobile-menu-left-gutter) !important;
          min-width: 0 !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="featured"] .menu-back,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="about"] .menu-back,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="services"] .menu-back,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="visit"] .menu-back,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="contact"] .menu-back {
          grid-template-columns: minmax(0, 1fr) !important;
          font-size: 10px !important;
          line-height: 1.1 !important;
          letter-spacing: 0.14em !important;
          font-weight: 500 !important;
          text-transform: uppercase !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="featured"] .menu-back::after,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="about"] .menu-back::after,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="services"] .menu-back::after,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="visit"] .menu-back::after,
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="contact"] .menu-back::after {
          content: none !important;
          display: none !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="contact"] {
          gap: 18px !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="contact"] .contact-quick-body {
          padding: 10px var(--mobile-menu-right-gutter) 0 var(--mobile-menu-left-gutter) !important;
          gap: 24px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const panelMarkup = `
    <div class="menu-head">
      <button class="menu-close" id="menu-close" type="button" aria-label="Close menu">&#10005;</button>
    </div>
    <div class="menu-body">
      <div class="menu-view" data-menu-view="main">
        <div class="menu-main-layout">
          <div class="menu-main-left">
            <div class="menu-main-primary">
              <button class="menu-link menu-link-button" type="button" data-menu-open="featured" data-seasonal-featured-link>Collections</button>
              <a class="menu-link" href="gallery.html?category=standing-flowers">Standing Flowers</a>
              <a class="menu-link" href="gallery.html?category=artificial-flowers">Table Arrangements</a>
              <a class="menu-link" href="gallery.html?category=bouquets">Bouquets</a>
              <a class="menu-link" href="gallery.html?category=papan-bunga">Papan Bunga</a>
              <a class="menu-link" href="gallery.html?category=funerals">Funerals</a>
              <a class="menu-link" href="gallery.html?category=parcels">Parcels</a>
            </div>
            <div class="menu-main-secondary">
              <button class="menu-link menu-link-button menu-link-secondary" type="button" data-menu-open="services" data-menu-quick="services" data-service-entry="true">Services</button>
              <button class="menu-link menu-link-button menu-link-secondary" type="button" data-menu-open="about" data-menu-quick="about" data-about-entry="true">About</button>
              <a class="menu-link menu-link-secondary" href="journals.html">The Journals</a>
              <button class="menu-link menu-link-button menu-link-secondary" type="button" data-menu-open="visit" data-menu-quick="visit" data-visit-entry="true">Visit Us</button>
              <button class="menu-link menu-link-button menu-link-secondary menu-link-contact" type="button" data-menu-open="contact" data-menu-mobile-href="contact.html">Contact Us</button>
            </div>
          </div>
          <div class="menu-main-quickpane" data-menu-quickpane data-quick-current="">
            <div class="menu-quick-panel" data-quick-panel="collections"></div>
            <div class="menu-quick-panel" data-quick-panel="services">
              <a class="menu-quick-link" data-service-link="all" href="services.html">View All Services</a>
              <a class="menu-quick-link" data-service-link="consultation" href="services.html#consultation">Consultation</a>
              <a class="menu-quick-link" data-service-link="personal-message" href="services.html#personal-message">Message Cards</a>
              <a class="menu-quick-link" data-service-link="delivery-setup" href="services.html#delivery-setup">Delivery &amp; Setup</a>
              <a class="menu-quick-link" data-service-link="collection-pickup" href="services.html#collection-pickup">Pickup &amp; Handover</a>
            </div>
            <div class="menu-quick-panel" data-quick-panel="about">
              <a class="menu-quick-link" data-about-link="overview" href="about.html">View About</a>
            <a class="menu-quick-link" data-about-link="journey" href="about.html#foundation">Our Journey</a>
            <a class="menu-quick-link" data-about-link="craft" href="about.html#philosophy">Our Craft</a>
              <a class="menu-quick-link" data-about-link="batam" href="about.html#batam">Rooted in Batam</a>
              <a class="menu-quick-link" data-about-link="signature" href="about.html#signature">Signature Story</a>
            </div>
            <div class="menu-quick-panel" data-quick-panel="visit">
              <a class="menu-quick-link" data-visit-link="boutique" href="https://maps.app.goo.gl/PL8EQ7C1mVJAoa3LA?g_st=ic" target="_blank" rel="noopener noreferrer">Florist Boutique</a>
              <a class="menu-quick-link" data-visit-link="supplies" href="https://maps.app.goo.gl/uhXFdFr4SfC97ABb9?g_st=ic" target="_blank" rel="noopener noreferrer">Supplies Shop</a>
            </div>
          </div>
        </div>
      </div>
      <div class="menu-view" data-menu-view="featured">
        <button class="menu-link menu-link-button menu-back" type="button" data-menu-back="main">Back</button>
        <div data-featured-menu-list></div>
      </div>
      <div class="menu-view" data-menu-view="about">
        <button class="menu-link menu-link-button menu-back" type="button" data-menu-back="main">Back</button>
        <a class="menu-link" data-about-link="overview" href="about.html">View About</a>
      <a class="menu-link" data-about-link="journey" href="about.html#foundation">Our Journey</a>
      <a class="menu-link" data-about-link="craft" href="about.html#philosophy">Our Craft</a>
        <a class="menu-link" data-about-link="batam" href="about.html#batam">Rooted in Batam</a>
        <a class="menu-link" data-about-link="signature" href="about.html#signature">Signature Story</a>
      </div>
      <div class="menu-view" data-menu-view="visit">
        <button class="menu-link menu-link-button menu-back" type="button" data-menu-back="main">Back</button>
        <a class="menu-link" data-visit-link="boutique" href="https://maps.app.goo.gl/PL8EQ7C1mVJAoa3LA?g_st=ic" target="_blank" rel="noopener noreferrer">Florist Boutique</a>
        <a class="menu-link" data-visit-link="supplies" href="https://maps.app.goo.gl/uhXFdFr4SfC97ABb9?g_st=ic" target="_blank" rel="noopener noreferrer">Supplies Shop</a>
      </div>
      <div class="menu-view" data-menu-view="services">
        <button class="menu-link menu-link-button menu-back" type="button" data-menu-back="main">Back</button>
        <a class="menu-link" data-service-link="all" href="services.html">View All Services</a>
        <a class="menu-link" data-service-link="consultation" href="services.html#consultation">Consultation</a>
        <a class="menu-link" data-service-link="personal-message" href="services.html#personal-message">Message Cards</a>
        <a class="menu-link" data-service-link="delivery-setup" href="services.html#delivery-setup">Delivery &amp; Setup</a>
        <a class="menu-link" data-service-link="collection-pickup" href="services.html#collection-pickup">Pickup &amp; Handover</a>
      </div>
      <div class="menu-view" data-menu-view="contact">
        <button class="menu-link menu-link-button menu-back" type="button" data-menu-back="main">Back</button>
        <div class="contact-quick-body">
          <div class="contact-quick-block">
            <p class="contact-quick-label">Hubungi Kami</p>
            <a class="contact-quick-link" href="https://wa.me/6281275017456" target="_blank" rel="noopener noreferrer">Rangkaian Bunga</a>
            <a class="contact-quick-link" href="https://wa.me/628116667457" target="_blank" rel="noopener noreferrer">Pesanan Kustom</a>
            <a class="contact-quick-link" href="https://wa.me/628116667920" target="_blank" rel="noopener noreferrer">Perlengkapan</a>
            <p class="contact-quick-text is-muted">Tersedia Senin – Sabtu</p>
            <p class="contact-quick-text is-muted">8:00 – 18:00 (WIB)</p>
          </div>
          <div class="contact-quick-block">
            <p class="contact-quick-label">Lokasi Kami</p>
            <a class="contact-quick-link" href="https://maps.app.goo.gl/PL8EQ7C1mVJAoa3LA?g_st=ic" target="_blank" rel="noopener noreferrer">Rangkaian</a>
            <a class="contact-quick-link" href="https://maps.app.goo.gl/uhXFdFr4SfC97ABb9?g_st=ic" target="_blank" rel="noopener noreferrer">Perlengkapan</a>
          </div>
          <div class="contact-quick-block">
            <p class="contact-quick-label">Tetap Terhubung</p>
            <a class="contact-quick-link" href="https://www.instagram.com/marvellflorist" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a class="contact-quick-link" href="https://www.facebook.com/share/184hfdi9TD/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer">Facebook</a>
          </div>
          <div class="contact-quick-block">
            <p class="contact-quick-label">Belanja Online</p>
            <a class="contact-quick-link" href="https://id.shp.ee/8mCEvykG" target="_blank" rel="noopener noreferrer">Shopee</a>
            <a class="contact-quick-link" href="https://tk.tokopedia.com/ZSuyXkhHG/" target="_blank" rel="noopener noreferrer">Tokopedia</a>
          </div>
        </div>
      </div>
    </div>
  `;

  if (menuToggle instanceof HTMLElement) {
    menuToggle.setAttribute("aria-haspopup", "dialog");
    menuToggle.setAttribute("aria-controls", "menu-panel");
    menuToggle.setAttribute("aria-expanded", "false");
  }

  let panel = existingPanel instanceof HTMLElement ? existingPanel : null;
  let backdrop = document.getElementById("menu-backdrop");
  if (!(backdrop instanceof HTMLElement)) backdrop = null;

  if (panel instanceof HTMLElement) {
    panel.className = "menu-panel";
    panel.id = "menu-panel";
    panel.dataset.sharedManaged = "true";
    panel.dataset.menuBooting = "true";
    panel.dataset.menuPreinit = "true";
    panel.hidden = false;
    panel.removeAttribute("hidden");
    panel.setAttribute("data-menu-current", "main");
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("tabindex", "-1");
    panel.innerHTML = panelMarkup;
  } else {
    if (!(menuToggle instanceof HTMLElement)) return;
    panel = document.createElement("aside");
    panel.className = "menu-panel";
    panel.id = "menu-panel";
    panel.dataset.sharedManaged = "true";
    panel.dataset.menuBooting = "true";
    panel.dataset.menuPreinit = "true";
    panel.hidden = false;
    panel.setAttribute("data-menu-current", "main");
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("tabindex", "-1");
    panel.innerHTML = panelMarkup;
    document.body.appendChild(panel);
  }

  if (!(backdrop instanceof HTMLElement)) {
    backdrop = document.createElement("div");
    backdrop.className = "menu-backdrop";
    backdrop.id = "menu-backdrop";
    document.body.appendChild(backdrop);
  }
      backdrop.className = "menu-backdrop";
      backdrop.id = "menu-backdrop";
      backdrop.dataset.sharedManaged = "true";
      backdrop.dataset.menuPreinit = "true";
      backdrop.setAttribute("aria-hidden", "true");

      // Fix hard refresh left panel
      if (panel instanceof HTMLElement) {
        panel.style.transform = window.matchMedia("(min-width: 900px)").matches ? "translateX(-100%)" : "translateY(100%)";
      }

  if (!(panel instanceof HTMLElement) || !(backdrop instanceof HTMLElement) || !(menuToggle instanceof HTMLElement)) return;
  if (document.body instanceof HTMLElement) document.body.dataset.sharedMenuApplied = "1";

  const menuClose = panel.querySelector("#menu-close");
  const menuHead = panel.querySelector(".menu-head");
  const menuViews = Array.from(panel.querySelectorAll("[data-menu-view]"));
  const quickPane = panel.querySelector("[data-menu-quickpane]");
  const quickTriggers = Array.from(panel.querySelectorAll("[data-menu-quick]"));
  const quickPanels = quickPane instanceof HTMLElement ? Array.from(quickPane.querySelectorAll("[data-quick-panel]")) : [];
  const menuMainLeft = panel.querySelector(".menu-main-left");
  document.body.setAttribute("data-menu-mobile-standardized", "index");

  const isDesktopQuickPane = () => window.matchMedia("(min-width: 900px)").matches;
  const getPanelClosedTransform = () => (isDesktopQuickPane() ? "translateX(-100%)" : "translateY(100%)");
  const getPanelOpenTransform = () => (isDesktopQuickPane() ? "translateX(0)" : "translateY(0)");
  const getQuickPaneHiddenTransform = () => (isDesktopQuickPane() ? "translateX(-42px)" : "translateX(42px)");
  const getQuickPanelHiddenTransform = () => (isDesktopQuickPane() ? "translateX(-22px)" : "translateX(22px)");
  const applyPanelSide = () => {
    const isDesktop = isDesktopQuickPane();
    panel.style.setProperty("top", isDesktop ? "0" : "auto", "important");
    panel.style.setProperty("bottom", isDesktop ? "auto" : "0", "important");
    panel.style.setProperty("left", "0", "important");
    panel.style.setProperty("right", isDesktop ? "auto" : "0", "important");
    panel.style.setProperty("border-left", isDesktop ? "0" : "0", "important");
    panel.style.setProperty("border-top", isDesktop ? "0" : "1px solid rgba(29, 26, 24, 0.08)", "important");
    panel.style.setProperty("border-right", isDesktop ? "1px solid rgba(29, 26, 24, 0.08)" : "0", "important");
    if (menuHead instanceof HTMLElement) {
      menuHead.style.setProperty("justify-content", isDesktop ? "flex-start" : "flex-end", "important");
      menuHead.style.setProperty("padding", isDesktop ? "18px 0 0 18px" : "14px 16px 0 0", "important");
      menuHead.style.setProperty("width", isDesktop ? "var(--menu-panel-single-width)" : "100vw", "important");
      menuHead.style.setProperty("min-width", isDesktop ? "var(--menu-panel-single-width)" : "100vw", "important");
    }
    if (menuMainLeft instanceof HTMLElement) {
      menuMainLeft.style.setProperty("padding", isDesktop ? "0 68px" : "0", "important");
      menuMainLeft.style.setProperty("width", isDesktop ? "var(--menu-panel-single-width)" : "100%", "important");
    }
    if (quickPane instanceof HTMLElement) {
      quickPane.style.setProperty("width", "var(--menu-panel-single-width)", "important");
      quickPane.style.setProperty("transform", panel.getAttribute("data-menu-quick-active") === "true" ? "translateX(0)" : getQuickPaneHiddenTransform(), "important");
    }
    if (panel.getAttribute("aria-hidden") === "true" && !panel.classList.contains("is-open")) {
      panel.style.setProperty("transform", getPanelClosedTransform(), "important");
    } else if (panel.classList.contains("is-open")) {
      panel.style.setProperty("transform", getPanelOpenTransform(), "important");
    }
  };
  applyPanelSide();
  if (quickPane instanceof HTMLElement) {
    quickPane.style.setProperty("width", "var(--menu-panel-single-width)", "important");
    quickPane.style.setProperty("opacity", "0", "important");
    quickPane.style.setProperty("transform", getQuickPaneHiddenTransform(), "important");
    quickPane.style.setProperty("pointer-events", "none", "important");
  }
  let quickSwitchTimer = 0;

const clearQuickSwitchState = () => {
  if (quickSwitchTimer) {
    window.clearTimeout(quickSwitchTimer);
    quickSwitchTimer = 0;
  }
};

const resetQuickPane = () => {
  clearQuickSwitchState();
  quickPane.style.setProperty("opacity", "0", "important");
  quickPane.style.setProperty("transform", getQuickPaneHiddenTransform(), "important");
  quickPane.style.setProperty("pointer-events", "none", "important");
  quickPanels.forEach((quickPanel) => {
    if (!(quickPanel instanceof HTMLElement)) return;
    quickPanel.style.setProperty("opacity", "0", "important");
    quickPanel.style.setProperty("transform", getQuickPanelHiddenTransform(), "important");
    quickPanel.style.setProperty("pointer-events", "none", "important");
  });
  quickTriggers.forEach((trigger) => {
    if (!(trigger instanceof HTMLElement)) return;
    trigger.classList.remove("is-quick-active");
    trigger.setAttribute("aria-expanded", "false");
  });
  panel.removeAttribute("data-menu-quick-active");
  panel.removeAttribute("data-menu-quick-closing");
  panel.style.setProperty("width", isDesktopQuickPane() ? "var(--menu-panel-single-width)" : "100vw", "important");
  quickPane.setAttribute("data-quick-current", "");
};

  resetQuickPane();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      panel.removeAttribute("data-menu-booting");
      panel.removeAttribute("data-menu-preinit");
      backdrop.removeAttribute("data-menu-preinit");
    });
  });

const setQuickPane = (panelName = "") => {
  const normalized = String(panelName || "").trim();
  const currentPanel = quickPane.getAttribute("data-quick-current") || "";
  const wasActive = panel.getAttribute("data-menu-quick-active") === "true";
  const isSwitchingBetweenPanels = Boolean(normalized && currentPanel && currentPanel !== normalized);
  clearQuickSwitchState();
  if (normalized) {
    panel.removeAttribute("data-menu-quick-closing");
  } else if (wasActive) {
    panel.setAttribute("data-menu-quick-closing", "true");
    window.setTimeout(() => {
      if (panel.getAttribute("data-menu-quick-active") !== "true") {
        panel.removeAttribute("data-menu-quick-closing");
      }
    }, 600);
  }
  panel.style.setProperty("width", normalized && isDesktopQuickPane() ? "min(96vw, calc(var(--menu-panel-single-width) * 2))" : (isDesktopQuickPane() ? "var(--menu-panel-single-width)" : "100vw"), "important");
  const applyQuickPaneState = () => {
    quickPane.setAttribute("data-quick-current", normalized);
    panel.setAttribute("data-menu-quick-active", normalized ? "true" : "false");
    quickPane.style.setProperty("opacity", normalized ? "1" : "0", "important");
    quickPane.style.setProperty("transform", normalized ? "translateX(0)" : getQuickPaneHiddenTransform(), "important");
    quickPane.style.setProperty("pointer-events", normalized ? "auto" : "none", "important");
    quickPanels.forEach((quickPanel) => {
      if (!(quickPanel instanceof HTMLElement)) return;
      const isMatch = normalized !== "" && quickPanel.getAttribute("data-quick-panel") === normalized;
      quickPanel.style.setProperty("opacity", isMatch ? "1" : "0", "important");
      quickPanel.style.setProperty("transform", isMatch ? "translateX(0)" : getQuickPanelHiddenTransform(), "important");
      quickPanel.style.setProperty("pointer-events", isMatch ? "auto" : "none", "important");
    });
  };
  if (isSwitchingBetweenPanels) {
    quickPane.style.setProperty("opacity", "0", "important");
    quickPane.style.setProperty("transform", getQuickPaneHiddenTransform(), "important");
    quickPane.style.setProperty("pointer-events", "none", "important");
    quickPanels.forEach((quickPanel) => {
      if (!(quickPanel instanceof HTMLElement)) return;
      quickPanel.style.setProperty("opacity", "0", "important");
      quickPanel.style.setProperty("transform", getQuickPanelHiddenTransform(), "important");
      quickPanel.style.setProperty("pointer-events", "none", "important");
    });
    quickSwitchTimer = window.setTimeout(() => {
      applyQuickPaneState();
      quickSwitchTimer = 0;
    }, 80);
  } else {
    applyQuickPaneState();
  }
  quickTriggers.forEach((trigger) => {
    if (!(trigger instanceof HTMLElement)) return;
    trigger.classList.toggle("is-quick-active", normalized !== "" && trigger.getAttribute("data-menu-quick") === normalized);
    trigger.setAttribute("aria-expanded", normalized !== "" && trigger.getAttribute("data-menu-quick") === normalized ? "true" : "false");
  });
};

  const setMenuView = (viewName) => {
    panel.setAttribute("data-menu-current", viewName);
    menuViews.forEach((view) => {
      const isMatch = view.getAttribute("data-menu-view") === viewName;
      const isMainView = view.getAttribute("data-menu-view") === "main";
      view.setAttribute("aria-hidden", isMatch ? "false" : "true");
      view.style.setProperty("opacity", isMatch ? "1" : "0", "important");
      view.style.setProperty("pointer-events", isMatch ? "auto" : "none", "important");
      view.style.setProperty("visibility", isMatch ? "visible" : "hidden", "important");
      view.style.setProperty(
        "transform",
        isMatch ? "translateX(0)" : (isMainView && viewName !== "main" ? "translateX(-18px)" : "translateX(18px)"),
        "important"
      );
    });
  };

  const featuredMenuList = panel.querySelector("[data-featured-menu-list]");
  const featuredQuickList = panel.querySelector('[data-quick-panel="collections"]');

  function getActiveUiLanguage() {
    const params = new URL(window.location.href).searchParams;
    const fromUrl = String(params.get("lang") || "").trim().toLowerCase();
    if (fromUrl === "en" || fromUrl === "id") return fromUrl;
    try {
      const fromStorage = String(window.localStorage?.getItem("marvell-language") || "").trim().toLowerCase();
      if (fromStorage === "en" || fromStorage === "id") return fromStorage;
    } catch (_error) {
      // Ignore storage access issues.
    }
    return String(document.documentElement.lang || "").trim().toLowerCase() === "id" ? "id" : "en";
  }

  function buildLocalizedFeaturedHref(eventId = "") {
    const href = eventId ? `featured.html?event=${encodeURIComponent(eventId)}` : "featured.html";
    const url = new URL(href, window.location.href);
    url.searchParams.set("lang", getActiveUiLanguage());
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function localizeSeasonalCollectionTitle(title = "") {
    const raw = String(title || "").trim();
    if (!raw) return "Collections";
    if (getActiveUiLanguage() !== "id") return raw;
    const map = {
      "Ramadan & Eid Collection": "Koleksi Ramadan & Idul Fitri",
      "Valentine's Collection": "Koleksi Valentine",
      "Graduation Collection": "Koleksi Wisuda",
      "Mother's Day Collection": "Koleksi Hari Ibu",
      "Chinese New Year Collection": "Koleksi Tahun Baru Imlek",
      "Christmas Collection": "Koleksi Natal",
      "Collections": "Koleksi"
    };
    return map[raw] || raw;
  }

  function parseMonthDay(value) {
    const [monthRaw, dayRaw] = String(value || "").split("-");
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { month, day };
  }

  function isScheduledEventActive(eventConfig, today = new Date()) {
    const startPart = parseMonthDay(eventConfig?.start);
    const endPart = parseMonthDay(eventConfig?.end);
    if (!startPart || !endPart) return false;
    const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const year = now.getFullYear();
    const startDate = new Date(year, startPart.month - 1, startPart.day);
    const endDate = new Date(year, endPart.month - 1, endPart.day);
    if (endDate >= startDate) return now >= startDate && now <= endDate;
    return now >= startDate || now <= endDate;
  }

  function getRenderableActiveEvents(catalog) {
    const rawEvents = Array.isArray(catalog?.events) ? catalog.events : [];
    return rawEvents
      .filter((eventConfig) => eventConfig?.forceActive === true || isScheduledEventActive(eventConfig))
      .filter((eventConfig) => Array.isArray(eventConfig?.products) && eventConfig.products.some((item) => String(item?.src || "").trim()));
  }

  function resolvePrimaryFeaturedEvent(events = []) {
    return [...events].sort((a, b) => {
      const byPriority = (Number(b?.priority) || 0) - (Number(a?.priority) || 0);
      if (byPriority !== 0) return byPriority;
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    })[0] || null;
  }

  function syncSharedCollectionsEntry(catalog) {
    const activeEvents = getRenderableActiveEvents(catalog);
    const sortedEvents = [...activeEvents].sort((a, b) => {
      const byPriority = (Number(b?.priority) || 0) - (Number(a?.priority) || 0);
      if (byPriority !== 0) return byPriority;
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });
    const primaryEvent = resolvePrimaryFeaturedEvent(sortedEvents);
    const hasMultiple = sortedEvents.length > 1;
    const directHref = primaryEvent ? buildLocalizedFeaturedHref(String(primaryEvent.id || "").trim()) : buildLocalizedFeaturedHref("");
    const rawLabel = hasMultiple
      ? "Collections"
      : (primaryEvent ? String(primaryEvent.title || "").trim() || "Collections" : "Collections");
    const label = localizeSeasonalCollectionTitle(rawLabel);
    panel.querySelectorAll("[data-seasonal-featured-link]").forEach((trigger) => {
      if (!(trigger instanceof HTMLElement)) return;
      trigger.dataset.seasonalManaged = "true";
      trigger.dataset.seasonalLabel = rawLabel;
      trigger.textContent = label;
      if (hasMultiple) {
        trigger.setAttribute("data-menu-quick", "collections");
        trigger.setAttribute("data-menu-open", "featured");
        trigger.removeAttribute("data-seasonal-direct-href");
      } else {
        trigger.removeAttribute("data-menu-quick");
        trigger.setAttribute("data-seasonal-direct-href", directHref);
      }
    });
    const eventLinksMarkup = sortedEvents.map((eventConfig) => {
      const eventId = String(eventConfig?.id || "").trim();
      const eventTitle = String(eventConfig?.title || "").trim() || "Collections";
      const localizedTitle = localizeSeasonalCollectionTitle(eventTitle);
      if (!eventId) return "";
      return `<a class="menu-link" data-seasonal-managed="true" data-seasonal-label="${String(eventTitle).replace(/"/g, "&quot;")}" href="${buildLocalizedFeaturedHref(eventId)}">${localizedTitle}</a>`;
    }).join("");
    if (featuredMenuList instanceof HTMLElement) {
      featuredMenuList.innerHTML = hasMultiple
        ? eventLinksMarkup
        : `<a class="menu-link" data-seasonal-fallback="true" data-seasonal-managed="true" data-seasonal-label="${String(rawLabel).replace(/"/g, "&quot;")}" href="${directHref}">${label}</a>`;
    }
    if (featuredQuickList instanceof HTMLElement) {
      featuredQuickList.innerHTML = hasMultiple
        ? eventLinksMarkup.replaceAll('class="menu-link"', 'class="menu-quick-link"')
        : "";
    }
  }

  if (featuredMenuList instanceof HTMLElement && !featuredMenuList.children.length && !featuredMenuList.textContent.trim()) {
    featuredMenuList.innerHTML = '<a class="menu-link" data-seasonal-fallback="true" href="featured.html">Collections</a>';
  }

  fetch("content/featured.json", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((catalog) => {
      if (catalog) syncSharedCollectionsEntry(catalog);
    })
    .catch(() => {
      // Keep the static fallback when the featured catalog cannot be loaded.
    });

const openMenu = () => {
    panel.classList.add("is-open");
    panel.style.setProperty("transform", getPanelOpenTransform(), "important");
    backdrop.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    backdrop.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    setMenuView("main");
    resetQuickPane();
    document.body.style.overflow = "hidden";
    panel.focus();
  };

  const closeMenu = () => {
    panel.classList.remove("is-open");
    panel.style.setProperty("transform", getPanelClosedTransform(), "important");
    backdrop.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    backdrop.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    setQuickPane("");
    document.body.style.overflow = "";
  };

  const renderDebugReport = () => {
    const existingNode = document.getElementById("menu-debug-report");
    if (existingNode instanceof HTMLElement) existingNode.remove();
    const readRect = (node) => {
      if (!(node instanceof Element)) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    };
    const debugParams = new URL(window.location.href).searchParams;
    const debugView = String(debugParams.get("menu_debug_view") || "main").trim() || "main";
    const rowSelector = debugView === "main"
      ? '.menu-view[data-menu-view="main"] .menu-main-secondary .menu-link, .menu-view[data-menu-view="main"] .menu-main-secondary .menu-link-button'
      : `.menu-view[data-menu-view="${debugView}"] .menu-link, .menu-view[data-menu-view="${debugView}"] .menu-link-button`;
    const rows = Array.from(panel.querySelectorAll(rowSelector));
    const activeView = panel.querySelector(`.menu-view[data-menu-view="${debugView}"]`);
    const backButton = activeView instanceof HTMLElement ? activeView.querySelector(".menu-back") : null;
    const report = {
      sharedManaged: panel.dataset.sharedManaged || null,
      debugView,
      panel: readRect(panel),
      close: readRect(menuClose),
      activeView: readRect(activeView),
      back: readRect(backButton),
      rows: rows.map((row) => {
        const afterStyle = window.getComputedStyle(row, "::after");
        return {
          text: String(row.textContent || "").trim(),
          row: readRect(row),
          after: {
            content: afterStyle.content,
            display: afterStyle.display,
            position: afterStyle.position,
            width: afterStyle.width,
            justifySelf: afterStyle.justifySelf,
            opacity: afterStyle.opacity
          }
        };
      })
    };
    const debugNode = document.createElement("pre");
    debugNode.id = "menu-debug-report";
    debugNode.style.position = "fixed";
    debugNode.style.inset = "0";
    debugNode.style.zIndex = "99999";
    debugNode.style.margin = "0";
    debugNode.style.padding = "16px";
    debugNode.style.background = "rgba(255,255,255,0.96)";
    debugNode.style.color = "#111";
    debugNode.style.overflow = "auto";
    debugNode.style.font = "12px/1.45 monospace";
    debugNode.textContent = JSON.stringify(report, null, 2);
    document.body.appendChild(debugNode);
  };

  if (quickTriggers.length) {
    quickTriggers.forEach((trigger) => {
      if (!(trigger instanceof HTMLElement)) return;
      const quickName = String(trigger.getAttribute("data-menu-quick") || "").trim();
      if (!quickName) return;
      trigger.addEventListener("click", () => {
        if (!isDesktopQuickPane()) return;
        setQuickPane(quickName);
      });
    });
  }

  menuToggle.addEventListener("click", (event) => {
    event.preventDefault();
    if (panel.classList.contains("is-open")) closeMenu();
    else openMenu();
  });

  if (menuClose instanceof HTMLButtonElement) {
    menuClose.addEventListener("click", closeMenu);
  }
  backdrop.addEventListener("click", closeMenu);

  panel.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const openButton = target.closest("[data-menu-open]");
    if (openButton instanceof HTMLElement) {
      const quickName = String(openButton.getAttribute("data-menu-quick") || "").trim();
      if (quickName && isDesktopQuickPane()) {
        setQuickPane(quickName);
        return;
      }
      const mobileHref = String(openButton.getAttribute("data-menu-mobile-href") || "").trim();
      if (mobileHref && window.matchMedia("(max-width: 899px)").matches) {
        closeMenu();
        window.location.href = mobileHref;
        return;
      }
      const directHref = openButton.getAttribute("data-seasonal-direct-href");
      if (directHref) {
        closeMenu();
        window.location.href = directHref;
        return;
      }
      const targetView = openButton.getAttribute("data-menu-open");
      if (targetView) setMenuView(targetView);
      return;
    }
    const directButton = target.closest("[data-seasonal-direct-href]");
    if (directButton instanceof HTMLElement) {
      const directHref = directButton.getAttribute("data-seasonal-direct-href");
      if (directHref) {
        closeMenu();
        window.location.href = directHref;
      }
      return;
    }
    const backButton = target.closest("[data-menu-back]");
    if (backButton instanceof HTMLElement) {
      const targetView = backButton.getAttribute("data-menu-back");
      if (targetView) setMenuView(targetView);
      return;
    }
    const link = target.closest("a");
    if (link instanceof HTMLAnchorElement) closeMenu();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) closeMenu();
  });
  const menuDebugRequested = new URL(window.location.href).searchParams.get("menu_debug") === "1";
  if (menuDebugRequested) {
    window.setTimeout(() => {
      openMenu();
      const debugView = String(new URL(window.location.href).searchParams.get("menu_debug_view") || "main").trim();
      window.setTimeout(() => {
        if (debugView && debugView !== "main") setMenuView(debugView);
        window.setTimeout(renderDebugReport, 180);
      }, 520);
    }, 900);
  }
  window.addEventListener("resize", applyPanelSide);
}());
