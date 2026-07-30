(function () {
  const existingFooter = document.getElementById("site-footer");

  if (!document.querySelector('link[data-shared-footer-fonts="1"]')) {
    const fontsLink = document.createElement("link");
    fontsLink.rel = "stylesheet";
    fontsLink.href = "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap";
    fontsLink.setAttribute("data-shared-footer-fonts", "1");
    document.head.appendChild(fontsLink);
  }

  const footerStylesId = "shared-footer-styles";
  if (!document.getElementById(footerStylesId)) {
    const style = document.createElement("style");
    style.id = footerStylesId;
    style.textContent = `
      
@font-face {
  font-family: "AdelioDisplayCondensedLight";
  src: url("AdelioDisplayCondensed-Light-v0.1.ttf") format("truetype");
  font-style: normal;
  font-weight: 300;
  font-display: swap;
}
@font-face {
  font-family: "RelationshipDisplay";
  src: url("assets/fonts/relationship-of-melodrame.woff2?v=2") format("woff2"),
       url("assets/fonts/relationship-of-melodrame.ttf?v=2") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "Relationship of Melodrame";
  src: url("assets/fonts/relationship-of-melodrame.woff2?v=2") format("woff2"),
       url("assets/fonts/relationship-of-melodrame.ttf?v=2") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
#site-footer {
        position: relative;
        margin-top: 56px;
        padding: 72px 0 calc(env(safe-area-inset-bottom, 0px) + 84px);
        background: #fff;
        color: #2a2118;
        border-top: 1px solid rgba(63, 54, 45, 0.16);
      }
      #site-footer::before {
        content: none;
      }
      #site-footer .footer-inner {
        width: min(1160px, 92vw);
        margin: 0 auto;
        display: grid;
        gap: 34px;
      }
      #site-footer .footer-closing {
        padding: 0 0 58px;
        text-align: center;
      }
      #site-footer .footer-closing-quote {
        margin: 0;
        font-family: "Relationship of Melodrame", "RelationshipDisplay", serif !important;
  text-transform: none;
        font-size: clamp(34px, 4.4vw, 72px);
        line-height: 1.25;
        color: #2a2118;
      }
      #site-footer .footer-closing-author {
        font-family: "Inter Tight", sans-serif !important;
        margin: 16px 0 0;
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(42, 33, 24, 0.68);
      }
      #site-footer .footer-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 56px;
        margin: 0;
        padding: 40px 0 24px;
        align-items: start;
        grid-auto-rows: min-content;
      }
      #site-footer .footer-col {
        margin: 0;
        padding: 0;
        display: grid;
        align-content: start;
        gap: 14px;
        min-height: 0 !important;
        height: auto !important;
      }
      #site-footer .footer-col-title {
        margin: 0 0 14px;
        font-family: "Inter Tight", sans-serif !important;
        width: 100%;
        padding: 0;
        border: 0;
        background: none;
        color: rgba(42, 33, 24, 0.68);
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: none;
        text-align: left;
        cursor: pointer;
      }
      #site-footer .footer-accordion-toggle {
        pointer-events: auto;
        cursor: default;
        justify-content: flex-start;
        gap: 8px;
      }
      #site-footer .footer-accordion-icon {
        display: none;
      }
      #site-footer .footer-accordion-panel {
        max-height: none;
        opacity: 1;
        overflow: visible;
        margin-top: 14px;
      }
      #site-footer .footer-links,
      #site-footer .footer-list {
        display: grid;
        gap: 22px;
        margin: 0;
        padding: 0;
        list-style: none;
        justify-items: start;
        align-content: start;
      }
      #site-footer .footer-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #2a2118;
        text-decoration: none;
        font-family: "Inter Tight", sans-serif !important;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.04;
        letter-spacing: 0.01em;
        text-transform: none;
      }
      #site-footer .footer-link:hover,
      #site-footer .footer-link:focus-visible,
      #site-footer .footer-legal-link:hover,
      #site-footer .footer-legal-link:focus-visible {
        text-decoration: underline;
        text-underline-offset: 0.08em;
      }
      #site-footer .footer-descriptor {
        display: grid;
        gap: 10px;
        margin-top: 18px;
      }
      #site-footer .footer-descriptor p {
        font-family: "Inter Tight", sans-serif !important;
        margin: 0;
        color: rgba(42, 33, 24, 0.74);
        font-size: 12px;
        font-weight: 500;
        line-height: 1.45;
        letter-spacing: 0.01em;
      }
      #site-footer .footer-bottom {
        border-top: 1px solid rgba(157, 133, 101, 0.24);
        padding-top: 6px;
        display: grid;
        grid-template-columns: 1fr;
        justify-items: center;
        align-items: center;
        gap: 0;
        text-align: center;
      }
      #site-footer .footer-copyright {
        font-family: "Inter Tight", sans-serif !important;
        margin: 0;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.01em;
        color: #2a2118;
      }
      #site-footer .footer-legal-link {
        color: inherit;
        text-decoration: none;
      }
      #site-footer .footer-brand {
        margin: 22px 0 0;
        text-align: center;
        font-family: "AdelioDisplayCondensedLight", "Inter Tight", sans-serif !important;
        font-size: clamp(62px, 12vw, 168px);
        font-weight: 300;
        line-height: 1;
        color: rgba(42, 33, 24, 0.84);
        letter-spacing: 0;
        text-transform: uppercase;
        text-shadow: none;
      }
      #site-footer .footer-brand-subline {
        font-family: "Inter Tight", sans-serif !important;
        margin-top: 2px;
        text-align: center;
        color: rgba(42, 33, 24, 0.68);
        font-size: 12px;
        font-weight: 500;
        line-height: 1.45;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .floating-whatsapp-btn {
        position: fixed;
        right: 20px;
        bottom: 22px;
        width: 58px;
        height: 58px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #000;
        border: 1px solid #000;
        box-shadow: none;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        z-index: 11000;
        text-decoration: none;
        transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease, border-color 180ms ease;
      }
      .floating-whatsapp-btn:hover,
      .floating-whatsapp-btn:focus-visible {
        transform: translateY(-2px);
        background: #000;
        border-color: #000;
        box-shadow: none;
        opacity: 1;
      }
      .floating-whatsapp-btn:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 3px;
      }
      .floating-whatsapp-btn svg {
        width: 26px;
        height: 26px;
        display: block;
        fill: #fff;
      }
      @media (max-width: 899px) {
        #site-footer {
          margin-top: 42px;
          padding: 48px 0 calc(env(safe-area-inset-bottom, 0px) + 96px);
        }
        #site-footer::before {
          content: none;
        }
        #site-footer .footer-inner {
          width: min(92vw, 560px);
        }
        #site-footer .footer-grid {
          grid-template-columns: 1fr;
          gap: 12px;
          padding-bottom: 0;
        }
        #site-footer .footer-col {
          border-top: 1px solid rgba(157, 133, 101, 0.24);
          padding: 14px 0 0;
          gap: 0;
        }
        #site-footer .footer-col-title {
          margin: 0;
          font-size: 13px;
          cursor: pointer;
          padding: 2px 0;
        }
        #site-footer .footer-accordion-toggle {
          cursor: pointer;
          justify-content: space-between;
          padding: 0 0 12px;
          width: 100%;
        }
        #site-footer .footer-accordion-icon {
          display: inline-block;
          font-size: 14px;
          line-height: 1;
          color: rgba(42, 33, 24, 0.62);
          transition: transform 0.24s ease;
        }
        #site-footer .footer-accordion-panel {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          margin-top: 0;
          transition: max-height 0.32s ease, opacity 0.22s ease;
        }
        #site-footer .footer-col.is-open .footer-accordion-panel {
          max-height: 360px;
          opacity: 1;
          margin-top: 8px;
        }
        #site-footer .footer-col.is-open .footer-accordion-icon {
          transform: rotate(45deg);
        }
        #site-footer .footer-links,
        #site-footer .footer-list {
          gap: 20px;
        }
        #site-footer .footer-descriptor {
          margin-top: 14px;
          gap: 10px;
        }
        #site-footer .footer-descriptor p {
          font-size: 11px;
          line-height: 1.4;
        }
        #site-footer .footer-bottom {
          margin-top: 12px;
          padding-top: 14px;
        }
        #site-footer .footer-brand {
          margin-top: 16px;
          font-size: clamp(54px, 18vw, 108px);
          line-height: 1;
        }
        #site-footer .footer-brand-subline {
          margin-top: 2px;
          font-size: 11px;
          letter-spacing: 0.07em;
        }
        #site-footer .footer-closing-quote {
          font-size: clamp(34px, 10vw, 48px);
        }
        #site-footer .footer-col-title,
        #site-footer .footer-link {
          font-size: 12px;
          line-height: 1.35;
        }
        .floating-whatsapp-btn {
          right: 14px;
          bottom: calc(env(safe-area-inset-bottom, 0px) + 78px);
          width: 52px;
          height: 52px;
        }
        .floating-whatsapp-btn svg {
          width: 23px;
          height: 23px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const footerMarkup = `
    <div class="footer-inner">
      <div class="footer-closing">
        <p class="footer-closing-quote">&ldquo;Had we but world enough and time.&rdquo;</p>
        <p class="footer-closing-author">Andrew Marvell</p>
      </div>
      <div class="footer-grid">
        <section class="footer-col" aria-label="Contact links">
          <button class="footer-col-title footer-accordion-toggle" type="button" aria-expanded="false" aria-controls="footer-panel-contact-shared">Hubungi <span class="footer-accordion-icon" aria-hidden="true">+</span></button>
          <div class="footer-accordion-panel" id="footer-panel-contact-shared">
            <div class="footer-links">
              <a class="footer-link" href="services.html#consultation">Hubungi Kami</a>
              <a class="footer-link" href="https://wa.me/6281275017456" target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a class="footer-link" href="https://www.instagram.com/marvellflorist" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a class="footer-link" href="https://www.facebook.com/share/184hfdi9TD/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer">Facebook</a>
              <a class="footer-link" href="mailto:floristmarvell@gmail.com">Email</a>
            </div>
            <div class="footer-descriptor" aria-label="Contact details">
              <p>Email: floristmarvell@gmail.com</p>
              <p>Whatsapp: 0811-6667-457</p>
              <p>Alamat: Komp. Ruko Kintamani, Jl. Raja H. Fisabilillah Blok C11, Teluk Tering, Batam Kota, Batam City, Riau Islands 29444</p>
            </div>
          </div>
        </section>
        <section class="footer-col" aria-label="About links">
          <button class="footer-col-title footer-accordion-toggle" type="button" aria-expanded="false" aria-controls="footer-panel-about-shared">About Marvell Florist <span class="footer-accordion-icon" aria-hidden="true">+</span></button>
          <div class="footer-accordion-panel" id="footer-panel-about-shared">
            <ul class="footer-list">
              <li class="footer-list-item"><a class="footer-link footer-about-link" data-bio-target="fg2" href="about.html#foundation">Perjalanan Kami</a></li>
              <li class="footer-list-item"><a class="footer-link footer-about-link" data-bio-target="fg3" href="about.html#philosophy">Karya Kami</a></li>
              <li class="footer-list-item"><a class="footer-link footer-about-link" data-bio-target="fg1" href="about.html#team">Tim Kami</a></li>
              <li class="footer-list-item"><a class="footer-link" href="journals.html">The Journals</a></li>
            </ul>
          </div>
        </section>
        <section class="footer-col" aria-label="Category links">
          <button class="footer-col-title footer-accordion-toggle" type="button" aria-expanded="false" aria-controls="footer-panel-categories-shared">Kategori <span class="footer-accordion-icon" aria-hidden="true">+</span></button>
          <div class="footer-accordion-panel" id="footer-panel-categories-shared">
            <div class="footer-links">
              <a class="footer-link" data-seasonal-featured-link href="featured.html">Collections</a>
              <a class="footer-link" data-gallery-category="parcels" href="gallery.html?category=parcels">Parcels</a>
              <a class="footer-link" data-gallery-category="bouquets" href="gallery.html?category=bouquets">Bouquets</a>
              <a class="footer-link" data-gallery-category="standing-flowers" href="gallery.html?category=standing-flowers">Standing Flowers</a>
              <a class="footer-link" data-gallery-category="papan-bunga" href="gallery.html?category=papan-bunga">Papan Bunga</a>
              <a class="footer-link" data-gallery-category="artificial-flowers" href="gallery.html?category=artificial-flowers">Table Arrangements</a>
              <a class="footer-link" data-gallery-category="funerals" href="gallery.html?category=funerals">Funerals</a>
            </div>
          </div>
        </section>
      </div>
      <div class="footer-bottom">
        <p class="footer-copyright"><a class="footer-legal-link" href="privacy-policy.html">Privasi</a> · <a class="footer-legal-link" href="terms-conditions.html">Ketentuan</a> · <a class="footer-legal-link" href="faq.html">FAQ</a> · © 2006–2026 Marvell Florist</p>
      </div>
      <div class="footer-brand" aria-hidden="true">Marvell Florist</div>
      <p class="footer-brand-subline">Where every petal is a little more marvelous.</p>
    </div>
  `;

  const footer = existingFooter instanceof HTMLElement ? existingFooter : document.createElement("footer");
  footer.id = "site-footer";
  footer.innerHTML = footerMarkup;

  if (!(existingFooter instanceof HTMLElement)) {
    document.body.appendChild(footer);
  }

  if (!document.querySelector(".floating-whatsapp-btn")) {
    const whatsappFloat = document.createElement("a");
    whatsappFloat.className = "floating-whatsapp-btn no-smudge";
    whatsappFloat.href = "https://wa.me/6281275017456";
    whatsappFloat.target = "_blank";
    whatsappFloat.rel = "noopener noreferrer";
    whatsappFloat.setAttribute("aria-label", "Chat di WhatsApp");
    whatsappFloat.innerHTML = `
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="M16.01 3.18c-7.07 0-12.81 5.73-12.81 12.8 0 2.26.6 4.47 1.73 6.42L3 29l6.79-1.78a12.78 12.78 0 0 0 6.21 1.6h.01c7.06 0 12.8-5.74 12.8-12.8S23.07 3.18 16.01 3.18zm0 23.49h-.01a10.67 10.67 0 0 1-5.43-1.48l-.39-.23-4.03 1.06 1.08-3.93-.25-.4A10.67 10.67 0 0 1 5.35 16c0-5.88 4.79-10.66 10.67-10.66 2.85 0 5.52 1.11 7.53 3.12A10.58 10.58 0 0 1 26.68 16c0 5.88-4.79 10.67-10.67 10.67zm5.85-8c-.32-.16-1.92-.95-2.21-1.05-.29-.11-.51-.16-.72.16-.21.32-.82 1.05-1.01 1.27-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.58-1.6-.95-.84-1.6-1.89-1.79-2.21-.19-.32-.02-.49.14-.65.14-.14.32-.37.47-.56.16-.18.21-.31.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.74-.99-2.38-.26-.63-.53-.55-.72-.56h-.62c-.21 0-.59.08-.9.4-.31.32-1.18 1.15-1.18 2.8 0 1.65 1.2 3.24 1.37 3.47.16.22 2.35 3.59 5.69 5.04.8.35 1.42.56 1.91.71.81.26 1.55.22 2.14.14.65-.1 1.92-.79 2.19-1.56.27-.77.27-1.42.19-1.56-.08-.13-.29-.21-.61-.37z"/>
      </svg>
    `;
    document.body.appendChild(whatsappFloat);
  }

  const seasonalFooterLinks = Array.from(footer.querySelectorAll("[data-seasonal-featured-link]"));

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

  function syncFeaturedFooterLink(catalog) {
    const activeEvents = getRenderableActiveEvents(catalog);
    const primaryEvent = resolvePrimaryFeaturedEvent(activeEvents);
    const href = primaryEvent ? buildLocalizedFeaturedHref(String(primaryEvent.id || "").trim()) : buildLocalizedFeaturedHref("");
    const rawLabel = primaryEvent ? String(primaryEvent.title || "").trim() || "Collections" : "Collections";
    const label = localizeSeasonalCollectionTitle(rawLabel);
    seasonalFooterLinks.forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      link.href = href;
      link.textContent = label;
      link.dataset.seasonalManaged = "true";
      link.dataset.seasonalLabel = rawLabel;
    });
  }

  fetch("content/featured.json", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((catalog) => {
      if (catalog) syncFeaturedFooterLink(catalog);
    })
    .catch(() => {
      // Keep the static fallback if the featured catalog cannot be loaded.
    });

  const footerColumns = Array.from(footer.querySelectorAll(".footer-col"));
  const footerToggles = Array.from(footer.querySelectorAll(".footer-accordion-toggle"));

  const refreshFooterAccordionState = () => {
    const isMobile = window.matchMedia("(max-width: 899px)").matches;
    footerColumns.forEach((column) => {
      if (!(column instanceof HTMLElement)) return;
      if (!isMobile) column.classList.remove("is-open");
    });
    footerToggles.forEach((toggle) => {
      if (!(toggle instanceof HTMLButtonElement)) return;
      const owner = toggle.closest(".footer-col");
      const isOpen = !!(owner && owner.classList.contains("is-open"));
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  };

  footerToggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    toggle.addEventListener("click", () => {
      if (!window.matchMedia("(max-width: 899px)").matches) return;
      const owner = toggle.closest(".footer-col");
      if (!(owner instanceof HTMLElement)) return;
      const shouldOpen = !owner.classList.contains("is-open");
      footerColumns.forEach((column) => {
        if (!(column instanceof HTMLElement)) return;
        column.classList.remove("is-open");
      });
      if (shouldOpen) owner.classList.add("is-open");
      refreshFooterAccordionState();
    });
  });

  window.addEventListener("resize", refreshFooterAccordionState, { passive: true });
  window.addEventListener("orientationchange", refreshFooterAccordionState, { passive: true });
  refreshFooterAccordionState();
})();
