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
      /* The glyph itself comes from assets/marvell-icons.js and is sized by
         assets/header-template.js. This only has to centre it. */
      .menu-toggle .menu-icon {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
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
        transition: transform 0.5s ease-in-out, width 0.52s cubic-bezier(0.22, 1, 0.36, 1) !important;
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
      /* The menu wears the same head as the right-hand quick panels: Close on
         the panel's own edge, the site's controls on the other side, and a
         hairline under both. It is the same object opening from the other
         side, so it should not have a different head. */
      .menu-head {
        display: block !important;
        padding: 0 !important;
        width: var(--menu-panel-single-width) !important;
        min-width: var(--menu-panel-single-width) !important;
        position: relative !important;
        z-index: 3 !important;
      }
      .menu-head .mv-panel-utility {
        padding: 20px 34px 18px 28px !important;
      }
      /* Without the shared row — marvell-shop.js not loaded yet — the disc
         below is still the way out. */
      .menu-head:not(:has(.mv-panel-utility)) {
        display: flex !important;
        align-items: center !important;
        padding: 18px 0 0 18px !important;
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
        inset: 30px 42px 46px 42px !important;
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
        padding: 0 42px !important;
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
      /* The menu is a list of places, and nothing else.
         It used to end in a rule and a row of tools — Search, Wishlist, Join
         Marvell, Bag — which are all reachable from the masthead and from the
         right-hand panels. Repeating them here gave the left panel a second
         subject, and a divider to separate it from the first.

         Both groups are one column, on one type scale. The primary group was
         a wrapping flex row, which on a 500px panel folded eight arrangement
         names into a ragged block that read as a tag cloud rather than a
         list. */
      .menu-main-primary,
      .menu-main-secondary {
        display: grid;
        justify-items: start;
      }
      .menu-main-primary {
        gap: 16px;
      }
      /* One group follows the other with air, not a rule. */
      .menu-main-secondary {
        margin-top: 46px;
        gap: 16px;
      }
      /* Anything that opens a list wears the chevron, whichever group it is
         in — Collections sits in the first group now. */
      .menu-main-left [data-menu-quick] {
        position: relative;
        width: 100%;
        justify-content: space-between;
        transition: color 0.42s ease, opacity 0.42s ease;
        will-change: color, opacity;
      }
      .menu-main-left [data-menu-quick]::after {
        content: "›";
        opacity: 0;
        transition: opacity 0.28s ease, color 0.28s ease;
      }
      .menu-main-left [data-menu-quick].is-quick-active::after,
      .menu-main-left [data-menu-quick]:hover::after,
      .menu-main-left [data-menu-quick]:focus-visible::after {
        opacity: 1;
      }
      /* The second panel is not a panel that fades in beside the first. It
         is kept underneath it — column two, translated a full width back to
         the left, behind the opaque first column — and it slides out to the
         right as the panel widens to make room for it. Closing runs the same
         travel backwards, so it goes back under the first panel rather than
         disappearing where it stands.

         It used to be nudged 42px over nearly a second, which at that
         distance and duration reads as nothing moving at all: the pane was
         effectively just revealed by the panel getting wider. The travel is
         the whole width now, and it is timed to the widening so the two
         finish together. */
      .menu-main-quickpane {
        position: relative !important;
        min-width: 0 !important;
        width: var(--menu-panel-single-width) !important;
        height: 100% !important;
        padding: 0 !important;
        background: var(--footer-offwhite, #fff) !important;
        border: 0 !important;
        box-shadow: none !important;
        opacity: 0 !important;
        transform: translateX(-100%) !important;
        pointer-events: none !important;
        transition: opacity 0.2s ease, transform 0.52s cubic-bezier(0.22, 1, 0.36, 1) !important;
        overflow: hidden !important;
        grid-column: 2 !important;
        z-index: 1 !important;
      }
      .menu-quick-panel {
        position: absolute !important;
        inset: 0 !important;
        padding: 0 42px !important;
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
      /* On the way out the pane must still be visible while it travels, so
         the fade is held back until the slide is most of the way home. */
      .menu-panel[data-menu-quick-closing="true"] .menu-main-quickpane {
        transition-duration: 0.18s, 0.46s !important;
        transition-delay: 0.3s, 0s !important;
      }
      .menu-panel[data-menu-quick-closing="true"] .menu-quick-panel {
        transition-duration: 0.18s, 0.4s !important;
        transition-delay: 0.26s, 0s !important;
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
      /* The second group is the same size and weight as the first. It used to
         be 18px at a different letter-spacing and line-height, which made the
         menu carry three type sizes for one list of links. It is set apart by
         the air above it, not by being smaller. */
      .menu-link-secondary,
      .menu-link-button.menu-link-secondary {
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
      .menu-main-primary .menu-link:not([data-menu-quick])::after,
      .menu-main-primary .menu-link-button:not([data-menu-quick])::after {
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
      /* The sub-views are the same links, so they are the same type. */
      .menu-view[data-menu-view="about"] .menu-link,
      .menu-view[data-menu-view="services"] .menu-link,
      .menu-view[data-menu-view="visit"] .menu-link {
        font-weight: 500;
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
      /* Contact Us is a place, so it is titled like one. The view used to open
         straight into four stacked blocks of detail with nothing saying where
         you were — the only panel in the family without a heading. This is the
         same head as "Welcome to Marvell": the display face, light, at the
         panel's own measure. */
      .menu-contact-head {
        padding: 6px 0 4px;
      }
      .menu-contact-title {
        margin: 0;
        font-family: "AdelioDisplayCondensed", "Inter Tight", sans-serif;
        font-size: clamp(25px, 2.5vw, 33px);
        font-weight: 300;
        line-height: 1.12;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #1d1a18;
      }
      .menu-contact-lead {
        margin: 14px 0 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        font-weight: 400;
        line-height: 1.62;
        color: rgba(29, 26, 24, 0.58);
      }
      .menu-view[data-menu-view="contact"] .contact-quick-body {
        padding: 30px 0 0;
        gap: 34px;
      }
      /* Loosened. These blocks were set at a 1px rhythm with a negative margin
         pulling the opening hours back into the number above them, which read
         as a dense directory rather than as somewhere to be. The labels are
         the quietest thing here, not the loudest: they were tracked out at
         0.14em over a heavier colour and competed with the numbers they
         introduce. */
      .contact-quick-body {
        padding: 8px 30px 30px;
        display: grid;
        gap: 34px;
      }
      .contact-quick-block {
        display: grid;
        gap: 12px;
      }
      .contact-quick-label {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 11px;
        font-weight: 400;
        line-height: 1.08;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: rgba(21, 18, 16, 0.5);
      }
      .contact-quick-link {
        font-family: "Inter Tight", sans-serif;
        color: #1d1a18;
        text-decoration: none;
        font-size: 17px;
        font-weight: 400;
        line-height: 1.34;
        width: fit-content;
        position: relative;
      }
      .contact-quick-block .contact-quick-link + .contact-quick-link {
        margin-top: 4px;
      }
      .contact-quick-block .contact-quick-text + .contact-quick-text {
        margin-top: 0;
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
        font-weight: 400;
        line-height: 1.6;
        color: rgba(21, 18, 16, 0.72);
      }
      .contact-quick-text.is-muted {
        color: rgba(21, 18, 16, 0.5);
      }
      .contact-quick-block .contact-quick-link + .contact-quick-text {
        margin-top: 6px;
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
        /* The masthead is assets/header-template.js's, including on a phone.
           This file used to restate it here — hiding contact, pushing search
           and the menu over to the right, and absolutely positioning the icon
           cluster — which fought the header's own layout and won only because
           this stylesheet is injected later. All that is left is the toggle
           that opens this panel. */
        .menu-toggle {
          position: static !important;
          left: auto !important;
          right: auto !important;
          top: auto !important;
          transform: none !important;
          gap: 0 !important;
          padding: 0 !important;
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
        }
        [data-menu-quick]::after {
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
        .menu-contact-head {
          padding: 10px var(--mobile-menu-right-gutter) 0 var(--mobile-menu-left-gutter);
        }
        .menu-view[data-menu-view="contact"] .contact-quick-body {
          padding: 26px var(--mobile-menu-right-gutter) 0 var(--mobile-menu-left-gutter);
          gap: 32px;
        }
        .contact-quick-block {
          gap: 12px;
        }
        .contact-quick-label {
          font-size: 11px;
          letter-spacing: 0.1em;
        }
        .contact-quick-link {
          font-size: 19px;
          line-height: 1.3;
        }
        .contact-quick-text {
          font-size: 14px;
          line-height: 1.6;
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
          /* The second panel's travel. On a phone a view IS the second panel:
             there is no room beside the list, so going into Services moves the
             whole screen, and it moves the way the desktop pane moves. The
             fade is off — setMenuView holds every view opaque on a phone — so
             only transform is listed and .menu-body clips the one leaving. */
          transition: transform 0.52s cubic-bezier(0.22, 1, 0.36, 1) !important;
          will-change: transform;
          /* Every view scrolls on a phone, not just Menu and Contact Us. A
             list longer than the screen — the editions under Collections on a
             short phone, Contact Us with four blocks — was simply cut off at
             the bottom with no way to reach the rest. */
          overflow-y: auto !important;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
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
        body[data-menu-mobile-standardized="index"] .menu-panel [data-menu-quick]::after {
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
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-contact-head {
          padding: 10px var(--mobile-menu-right-gutter) 0 var(--mobile-menu-left-gutter) !important;
        }
        body[data-menu-mobile-standardized="index"] .menu-panel .menu-view[data-menu-view="contact"] .contact-quick-body {
          padding: 26px var(--mobile-menu-right-gutter) 0 var(--mobile-menu-left-gutter) !important;
          gap: 32px !important;
        }
      }
      /* Use the same quiet header and display typography as Welcome to Marvell.
         The category pane still grows out of the menu, with visual routes
         alongside the existing text links. */
      .menu-panel .menu-head {
        display: flex !important;
        align-items: center !important;
        min-height: 64px !important;
        box-sizing: border-box !important;
        border-bottom: 1px solid rgba(29, 26, 24, .1) !important;
      }
      .menu-panel .menu-close {
        display: inline-flex !important;
        align-items: center !important;
        gap: 10px !important;
        width: auto !important;
        height: auto !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        color: rgba(21, 18, 16, .78) !important;
        font: 500 12px/1.2 "Inter Tight", sans-serif !important;
        letter-spacing: .08em !important;
        text-transform: uppercase !important;
      }
      .menu-panel .menu-close:hover,
      .menu-panel .menu-close:focus-visible { background: transparent !important; opacity: .6; }
      body[data-shared-menu-applied="1"] .menu-panel .menu-close,
      body[data-menu-mobile-standardized="index"] .menu-panel .menu-close { width: auto !important; height: auto !important; font-size: 12px !important; }
      .menu-panel .menu-close svg {
        width: 15px;
        height: 15px;
        stroke: currentColor;
        stroke-width: 1.25;
        fill: none;
        stroke-linecap: round;
      }
      .menu-panel .menu-view[data-menu-view="main"] { overflow-y: auto !important; overscroll-behavior: contain; }
      .menu-panel .menu-intro { padding: 12px 0 26px; width: 100%; }
      .menu-panel .menu-intro h2 {
        margin: 0;
        color: #1d1a18;
        font: 300 clamp(25px, 2.5vw, 33px)/1.12 "AdelioDisplayCondensed", sans-serif;
        letter-spacing: .05em;
        text-transform: uppercase;
      }
      .menu-panel .menu-intro p {
        margin: 12px 0 0;
        color: rgba(29, 26, 24, .58);
        font: 400 14px/1.62 "Inter Tight", sans-serif;
      }
      .menu-panel .menu-main-primary,
      .menu-panel .menu-main-secondary { justify-items: stretch !important; width: 100% !important; gap: 0 !important; }
      .menu-panel .menu-main-secondary { margin-top: 24px !important; padding-top: 20px; border-top: 1px solid rgba(29, 26, 24, .1); }
      .menu-panel .menu-main-left .menu-link,
      .menu-panel .menu-main-left .menu-link-button {
        display: flex !important;
        width: 100% !important;
        min-height: 44px;
        justify-content: space-between !important;
        color: rgba(29, 26, 24, .82) !important;
        font: 400 16px/1.4 "Inter Tight", sans-serif !important;
      }
      .menu-panel .menu-main-left [data-menu-quick]::after {
        content: "›" !important;
        display: block !important;
        opacity: .48 !important;
        margin-left: 12px !important;
        font-size: 23px;
        font-weight: 300;
        transition: transform .3s ease, opacity .3s ease !important;
      }
      .menu-panel .menu-main-left [data-menu-quick]:hover::after,
      .menu-panel .menu-main-left [data-menu-quick]:focus-visible::after { transform: translateX(3px) !important; opacity: 1 !important; }
      .menu-panel .menu-main-left .menu-link:hover,
      .menu-panel .menu-main-left .menu-link:focus-visible,
      .menu-panel .menu-main-left .menu-link-button:hover,
      .menu-panel .menu-main-left .menu-link-button:focus-visible { color: #1d1a18 !important; }
      .menu-panel .menu-quick-panel { overflow-y: auto !important; overscroll-behavior: contain; }
      .menu-panel .menu-quick-panel[data-quick-panel="collections"] { gap: 14px !important; }
      @media (max-width: 768px) {
        .menu-panel .menu-head { justify-content: flex-start !important; }
        .menu-panel .menu-intro { padding: 4px 16px 22px !important; box-sizing: border-box; }
        .menu-panel .menu-main-secondary { margin-top: 16px !important; padding-top: 14px; }
        .menu-panel .menu-main-left .menu-link,
        .menu-panel .menu-main-left .menu-link-button { padding-top: 9px !important; padding-bottom: 9px !important; min-height: 48px; font-size: 16px !important; }
        .menu-panel .menu-main-left [data-menu-quick]::after { grid-column: 2; justify-self: center; }
      }
      /* Chevrons mean that a second menu pane opens. Every destination link
         uses an underline instead, on both sides of the menu. */
      .menu-panel .menu-link:not([data-menu-quick])::after,
      .menu-panel .menu-link-button:not([data-menu-quick])::after,
      .menu-panel .menu-quick-link::after {
        content: none !important;
        display: none !important;
      }
      /* Drawn, not faded. A text-decoration can only change colour, so what
         was here was the whole rule appearing at once and darkening. The
         line is a bar on ::before now and travels out from the left edge of
         the word, which is how a line gets made. ::before, because the
         chevron on the panes' triggers already owns ::after. */
      .menu-panel .menu-link:not([data-menu-quick]):not(.menu-back),
      .menu-panel .menu-link-button:not([data-menu-quick]):not(.menu-back),
      .menu-panel .menu-quick-link {
        position: relative !important;
        text-decoration-line: none !important;
        text-decoration-color: transparent !important;
        transition: color .3s ease !important;
      }
      .menu-panel .menu-link:not([data-menu-quick]):not(.menu-back)::before,
      .menu-panel .menu-link-button:not([data-menu-quick]):not(.menu-back)::before,
      .menu-panel .menu-quick-link::before {
        content: "" !important;
        position: absolute !important;
        left: 0 !important;
        right: 0 !important;
        /* Measured down from the box's centre rather than up from its
           bottom, so one value sits just under the baseline across the
           three line-heights the menu uses. */
        top: 50% !important;
        bottom: auto !important;
        margin-top: .44em !important;
        height: 1px !important;
        background: currentColor !important;
        transform: scaleX(0) !important;
        transform-origin: right center !important;
        transition: transform .6s cubic-bezier(.22, 1, .36, 1) !important;
        pointer-events: none !important;
      }
      .menu-panel .menu-link:not([data-menu-quick]):not(.menu-back):hover::before,
      .menu-panel .menu-link:not([data-menu-quick]):not(.menu-back):focus-visible::before,
      .menu-panel .menu-link-button:not([data-menu-quick]):not(.menu-back):hover::before,
      .menu-panel .menu-link-button:not([data-menu-quick]):not(.menu-back):focus-visible::before,
      .menu-panel .menu-quick-link:hover::before,
      .menu-panel .menu-quick-link:focus-visible::before {
        transform: scaleX(1) !important;
        transform-origin: left center !important;
      }
      /* The older bar on .nav-label did the same job for the first group
         only, and would now draw a second line under the first. */
      .menu-panel .menu-main-primary .menu-link .nav-label::after,
      .menu-panel .menu-main-primary .menu-link-button .nav-label::after {
        content: none !important;
      }

      /* The bar is as wide as its element, so the element has to be as wide
         as its text.

         Every row in this column is stretched to the full panel width
         further up this sheet, so that the ones which open a second pane can
         push their chevron to the right-hand edge. The underlined links have
         no chevron — the same sheet sets content:none on theirs — so for
         them the stretch buys nothing and cost a rule five hundred pixels
         long under a two-word label. */
      @media (min-width: 769px) {
        .menu-panel .menu-main-left .menu-link:not([data-menu-quick]):not(.menu-back),
        .menu-panel .menu-main-left .menu-link-button:not([data-menu-quick]):not(.menu-back) {
          width: fit-content !important;
          justify-content: flex-start !important;
        }
      }

      /* A word with a chevron after it is still a word, and still gets its
         underline — under the word only.

         These rows cannot use the trick the rest of the menu uses. They are
         width:100% with space-between on purpose, so the chevron sits at the
         far edge of the panel rather than trailing the label, and shrinking
         the box to the text would move it. So the box stays wide and the
         rule is given the width of the text instead, measured from the text
         itself and published as a custom property.

         Measured rather than wrapped in a span, because site-language.js
         translates these labels by assigning textContent, which would throw
         any wrapper away on the next pass. A custom property survives that;
         the text node does not have to. */
      .menu-panel .menu-main-left [data-menu-quick]::before {
        content: "" !important;
        position: absolute !important;
        left: 0 !important;
        right: auto !important;
        width: var(--mv-underline-w, 0px) !important;
        top: 50% !important;
        bottom: auto !important;
        margin-top: .44em !important;
        height: 1px !important;
        background: currentColor !important;
        transform: scaleX(0) !important;
        transform-origin: right center !important;
        transition: transform .6s cubic-bezier(.22, 1, .36, 1) !important;
        pointer-events: none !important;
      }
      .menu-panel .menu-main-left [data-menu-quick]:hover::before,
      .menu-panel .menu-main-left [data-menu-quick]:focus-visible::before,
      .menu-panel .menu-main-left [data-menu-quick].is-quick-active::before {
        transform: scaleX(1) !important;
        transform-origin: left center !important;
      }

      /* Below that the rows are a touch target laid out on a grid, where
         shrinking to the text would break the layout — and there is no
         pointer to draw a hover for anyway. */
      @media (max-width: 768px) {
        .menu-panel .menu-link::before,
        .menu-panel .menu-link-button::before,
        .menu-panel .menu-main-left [data-menu-quick]::before,
        .menu-panel .menu-quick-link::before {
          content: none !important;
        }
      }
      .menu-panel .menu-quick-panel,
      .menu-panel .menu-quick-panel[data-quick-panel="collections"] { gap: 0 !important; }
      .menu-panel .menu-quick-link {
        display: flex !important;
        align-items: center !important;
        width: fit-content;
        min-height: 44px;
        font: 400 16px/1.4 "Inter Tight", sans-serif !important;
        color: rgba(29, 26, 24, .82) !important;
      }
    `;
    document.head.appendChild(style);
  }

  const panelMarkup = `
    <div class="menu-head">
      <button class="menu-close" id="menu-close" type="button" aria-label="Close menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18"/></svg><span>Close</span></button>
    </div>
    <div class="menu-body">
      <div class="menu-view" data-menu-view="main">
        <div class="menu-main-layout">
          <div class="menu-main-left">
            <div class="menu-intro"><h2>Menu</h2><p>Discover Marvell</p></div>
            <div class="menu-main-primary">
              <!-- Collections is Featured. They were two links to one idea —
                   the seasonal editions — so the menu names it once, at the
                   top, and every edition hangs off it. -->
              <button class="menu-link menu-link-button" type="button" data-menu-open="featured" data-menu-quick="collections" data-seasonal-featured-link>Collections</button>
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
              <button class="menu-link menu-link-button menu-link-secondary menu-link-contact" type="button" data-menu-open="contact">Contact Us</button>
            </div>
          </div>
          <div class="menu-main-quickpane" data-menu-quickpane data-quick-current="">
            <div class="menu-quick-panel" data-quick-panel="collections">
            </div>
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
        <div class="menu-contact-head">
          <h2 class="menu-contact-title">Contact Us</h2>
          <p class="menu-contact-lead">We are here to help you.</p>
        </div>
        <div class="contact-quick-body">
          <div class="contact-quick-block">
            <p class="contact-quick-label">WhatsApp Enquiries</p>
            <a class="contact-quick-link" href="https://wa.me/6281275017456" target="_blank" rel="noopener noreferrer">Rangkaian Bunga</a>
            <a class="contact-quick-link" href="https://wa.me/628116667457" target="_blank" rel="noopener noreferrer">Pesanan Kustom</a>
            <a class="contact-quick-link" href="https://wa.me/628116667920" target="_blank" rel="noopener noreferrer">Perlengkapan</a>
          </div>
          <div class="contact-quick-block">
            <p class="contact-quick-label">Our Locations</p>
            <a class="contact-quick-link" href="https://maps.app.goo.gl/PL8EQ7C1mVJAoa3LA?g_st=ic" target="_blank" rel="noopener noreferrer">Rangkaian</a>
            <a class="contact-quick-link" href="https://maps.app.goo.gl/uhXFdFr4SfC97ABb9?g_st=ic" target="_blank" rel="noopener noreferrer">Perlengkapan</a>
          </div>
          <div class="contact-quick-block">
            <p class="contact-quick-label">Social Channels</p>
            <a class="contact-quick-link" href="https://www.instagram.com/marvellflorist" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a class="contact-quick-link" href="https://www.facebook.com/share/184hfdi9TD/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer">Facebook</a>
          </div>
          <div class="contact-quick-block">
            <p class="contact-quick-label">Online Stores</p>
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
        panel.style.transform = window.matchMedia("(min-width: 769px)").matches ? "translateX(-100%)" : "translateY(100%)";
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

  const isDesktopQuickPane = () => window.matchMedia("(min-width: 769px)").matches;
  const getPanelClosedTransform = () => (isDesktopQuickPane() ? "translateX(-100%)" : "translateY(100%)");
  const getPanelOpenTransform = () => (isDesktopQuickPane() ? "translateX(0)" : "translateY(0)");
  // Desktop: a full width back, which puts it under the first column.
  // Mobile has no second column to hide under, so it keeps its short offset.
  const getQuickPaneHiddenTransform = () => (isDesktopQuickPane() ? "translateX(-100%)" : "translateX(42px)");
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
      menuHead.style.setProperty("justify-content", "flex-start", "important");
      menuHead.style.setProperty("padding", isDesktop ? "20px 42px" : "16px", "important");
      menuHead.style.setProperty("width", isDesktop ? "var(--menu-panel-single-width)" : "100vw", "important");
      menuHead.style.setProperty("min-width", isDesktop ? "var(--menu-panel-single-width)" : "100vw", "important");
    }
    if (menuMainLeft instanceof HTMLElement) {
      menuMainLeft.style.setProperty("padding", isDesktop ? "0 42px" : "0", "important");
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
  window.addEventListener("resize", () => measureQuickUnderlines());
  if (quickPane instanceof HTMLElement) {
    quickPane.style.setProperty("width", "var(--menu-panel-single-width)", "important");
    quickPane.style.setProperty("opacity", "0", "important");
    quickPane.style.setProperty("transform", getQuickPaneHiddenTransform(), "important");
    quickPane.style.setProperty("pointer-events", "none", "important");
  }
const resetQuickPane = () => {
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
  const wasActive = panel.getAttribute("data-menu-quick-active") === "true";
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
  // Keep the parent pane in place when selecting another destination. Its
  // children already have opacity and transform transitions, so changing the
  // selected child lets the two views cross-fade without a hidden gap.
  applyQuickPaneState();
  quickTriggers.forEach((trigger) => {
    if (!(trigger instanceof HTMLElement)) return;
    trigger.classList.toggle("is-quick-active", normalized !== "" && trigger.getAttribute("data-menu-quick") === normalized);
    trigger.setAttribute("aria-expanded", normalized !== "" && trigger.getAttribute("data-menu-quick") === normalized ? "true" : "false");
  });
};

  /**
   * Where a view that is not the current one sits.
   *
   * Desktop nudges it 18px and cross-fades, because on desktop a view is a
   * small part of a wide panel and the eye is being pointed at a change, not
   * walked to another place.
   *
   * A phone has no second column, so going into Services is the whole screen
   * changing. That is the same move the second panel makes on desktop, and it
   * now travels the same way: a full width, on the second panel's easing and
   * duration, with no fade. Two lists sliding past each other read as one
   * step through the menu; two lists fading through each other at 18px read
   * as the panel glitching.
   */
  const getViewOffsetTransform = (isMainView, viewName) => {
    const back = isMainView && viewName !== "main";
    if (isDesktopQuickPane()) return back ? "translateX(-18px)" : "translateX(18px)";
    return back ? "translateX(-100%)" : "translateX(100%)";
  };

  const setMenuView = (viewName) => {
    const isDesktop = isDesktopQuickPane();
    panel.setAttribute("data-menu-current", viewName);
    menuViews.forEach((view) => {
      const isMatch = view.getAttribute("data-menu-view") === viewName;
      const isMainView = view.getAttribute("data-menu-view") === "main";
      view.setAttribute("aria-hidden", isMatch ? "false" : "true");
      // A full-width slide does not need a fade, and fading over 0.2s while
      // travelling for 0.52s would empty the outgoing list before it has left.
      view.style.setProperty("opacity", isDesktop && !isMatch ? "0" : "1", "important");
      view.style.setProperty("pointer-events", isMatch ? "auto" : "none", "important");
      // Hiding the outgoing view immediately cancels its opacity transition.
      // Opacity handles the exit; inert prevents hidden links taking focus.
      view.style.setProperty("visibility", "visible", "important");
      view.toggleAttribute("inert", !isMatch);
      view.style.setProperty(
        "transform",
        isMatch ? "translateX(0)" : getViewOffsetTransform(isMainView, viewName),
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

  /**
   * Collections is one entry, and every edition lives under it.
   *
   * Seasonal editions and collections are the same thing, so the menu names
   * them once. This used to promote the edition to the top level whenever only
   * one was running — so "Graduation Collection" stood in the menu as a
   * sibling of Services and About, and there was no "Collections" at all. Now
   * the entry is always called Collections and always opens the list, whether
   * that list holds one edition or six. The list is headed by the page that
   * holds all of them, so the entry is never a dead end.
   */
  function syncSharedCollectionsEntry(catalog) {
    const activeEvents = getRenderableActiveEvents(catalog);
    const sortedEvents = [...activeEvents].sort((a, b) => {
      const byPriority = (Number(b?.priority) || 0) - (Number(a?.priority) || 0);
      if (byPriority !== 0) return byPriority;
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });
    const rawLabel = "Collections";
    const label = localizeSeasonalCollectionTitle(rawLabel);
    panel.querySelectorAll("[data-seasonal-featured-link]").forEach((trigger) => {
      if (!(trigger instanceof HTMLElement)) return;
      trigger.dataset.seasonalManaged = "true";
      trigger.dataset.seasonalLabel = rawLabel;
      trigger.textContent = label;
      trigger.setAttribute("data-menu-quick", "collections");
      trigger.setAttribute("data-menu-open", "featured");
      trigger.removeAttribute("data-seasonal-direct-href");
    });

    const viewAllLabel = getActiveUiLanguage() === "id" ? "Lihat Semua Koleksi" : "View All Collections";
    const viewAll = `<a class="menu-link" data-seasonal-managed="true" data-seasonal-view-all="true" href="${buildLocalizedFeaturedHref("")}">${viewAllLabel}</a>`;
    const eventLinksMarkup = sortedEvents.map((eventConfig) => {
      const eventId = String(eventConfig?.id || "").trim();
      const eventTitle = String(eventConfig?.title || "").trim() || "Collections";
      const localizedTitle = localizeSeasonalCollectionTitle(eventTitle);
      if (!eventId) return "";
      return `<a class="menu-link" data-seasonal-managed="true" data-seasonal-label="${String(eventTitle).replace(/"/g, "&quot;")}" href="${buildLocalizedFeaturedHref(eventId)}">${localizedTitle}</a>`;
    }).join("");
    const listMarkup = viewAll + eventLinksMarkup;

    if (featuredMenuList instanceof HTMLElement) {
      featuredMenuList.innerHTML = listMarkup;
    }
    if (featuredQuickList instanceof HTMLElement) {
      featuredQuickList.innerHTML = listMarkup.replaceAll('class="menu-link"', 'class="menu-quick-link"');
    }
  }

  if (featuredMenuList instanceof HTMLElement && !featuredMenuList.children.length && !featuredMenuList.textContent.trim()) {
    featuredMenuList.innerHTML = '<a class="menu-link" data-seasonal-fallback="true" href="featured.html">View All Collections</a>';
  }

  fetch("content/featured.json", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((catalog) => {
      if (catalog) syncSharedCollectionsEntry(catalog);
    })
    .catch(() => {
      // Keep the static fallback when the featured catalog cannot be loaded.
    });

  /**
   * Publishes each chevron row's text width as --mv-underline-w.
   *
   * The row is as wide as the panel so its chevron can sit at the far edge,
   * so the underline cannot simply span the box. A Range over the element's
   * contents measures the text and nothing else: pseudo-elements are not in
   * the DOM, so the chevron is excluded by construction rather than by
   * subtracting a guess at its width.
   *
   * Re-run whenever the text or the panel's width could have changed. A
   * measurement of zero — the panel is display:none, or this is a document
   * with no layout at all — is discarded rather than written, because a
   * zero-width rule is worse than last time's correct one.
   */
  const measureQuickUnderlines = () => {
    // Queried fresh rather than read from the list captured at init: the
    // seasonal code rewrites the Collections trigger, and a row that was
    // replaced after boot would otherwise never be measured.
    panel.querySelectorAll("[data-menu-quick]").forEach((trigger) => {
      if (!(trigger instanceof HTMLElement)) return;
      try {
        const range = document.createRange();
        range.selectNodeContents(trigger);
        const width = range.getBoundingClientRect().width;
        range.detach?.();
        if (width > 0) trigger.style.setProperty("--mv-underline-w", `${Math.round(width)}px`);
      } catch (_error) {
        // No layout to measure. The rule stays at its fallback width of zero.
      }
    });
  };

  const openMenu = () => {
    // The homepage loads this menu before marvell-shop.js. Register when it is
    // actually opened too, so switching to Join Marvell or Wishlist closes it.
    window.MarvellShop?.registerPanel?.("menu", { close: closeMenuQuietly });
    panel.classList.add("is-open");
    panel.style.setProperty("transform", getPanelOpenTransform(), "important");
    backdrop.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    backdrop.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    ensureMenuHead();
    setMenuView("main");
    resetQuickPane();
    // The labels are only measurable once the panel is laid out, and they
    // change with the language, so this is read on the way in every time.
    measureQuickUnderlines();
    // Closes the wishlist and account panels, and takes the scroll lock. The
    // menu used to set body overflow itself, which meant whichever surface
    // closed last decided whether the page could scroll again.
    if (window.MarvellShop?.openPanel) window.MarvellShop.openPanel("menu");
    else document.body.style.overflow = "hidden";
    panel.focus();
  };

  /**
   * Keep the close control in the same form as the right-hand panel controls.
   *
   * It used to swap that control for the right-hand panels' utility row, which
   * put the wishlist, account, contact and bag icons at the top of the left
   * panel. The left panel is not one of those: it is the way into the site,
   * they are places you keep coming back to, and they open from the other
   * side. Wearing their icons made the menu look like one of them and gave it
   * four exits it does not own.
   *
   * Anything already carrying the row — a panel rendered before this shipped —
   * is put back to the plain close control.
   */
  const ensureMenuHead = () => {
    const head = panel.querySelector(".menu-head");
    if (!(head instanceof HTMLElement)) return;
    if (!head.querySelector(".mv-panel-utility")) return;
    head.innerHTML =
      '<button class="menu-close" id="menu-close" type="button" aria-label="Close menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18"/></svg><span>Close</span></button>';
    head.querySelector(".menu-close")?.addEventListener("click", () => closeMenu());
  };

  /** Closes the menu without releasing the shared scroll lock. */
  const closeMenuQuietly = () => {
    if (!panel.classList.contains("is-open")) return;
    panel.classList.remove("is-open");
    panel.style.setProperty("transform", getPanelClosedTransform(), "important");
    backdrop.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    backdrop.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    setQuickPane("");
  };

  const closeMenu = () => {
    closeMenuQuietly();
    if (window.MarvellShop?.closePanel) window.MarvellShop.closePanel("menu");
    else document.body.style.overflow = "";
  };

  window.MarvellShop?.registerPanel?.("menu", { close: closeMenuQuietly });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.MarvellShop?.registerPanel?.("menu", { close: closeMenuQuietly });
    }, { once: true });
  }

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
    if (!(target instanceof Element)) return;
    const openButton = target.closest("[data-menu-open]");
    if (openButton instanceof HTMLElement) {
      const quickName = String(openButton.getAttribute("data-menu-quick") || "").trim();
      if (quickName && isDesktopQuickPane()) {
        setQuickPane(quickName);
        return;
      }
      const mobileHref = String(openButton.getAttribute("data-menu-mobile-href") || "").trim();
      if (mobileHref && window.matchMedia("(max-width: 768px)").matches) {
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
      // Contact Us is a view of this menu, and on a phone it stays one.
      //
      // It used to close the menu and open the right-hand contact panel on
      // every screen. On desktop that is right: the panel is beside the menu,
      // both are visible at once and the contact details are a place of their
      // own. On a phone the panel is a sheet from the bottom, so the menu fell
      // away and something else climbed up over it — two moves, in opposite
      // directions, to walk one step further into the same menu. The contact
      // view and its phone layout have always been here; this stops stepping
      // over them.
      if (targetView === "contact" && isDesktopQuickPane() && window.MarvellContact?.open) {
        closeMenu();
        window.MarvellContact.open();
        return;
      }
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
