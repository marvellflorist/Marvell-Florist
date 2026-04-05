import {
  getTopPrioritySeasonalEvent,
  buildWhatsAppOrderHref
} from "./seasonal-data.js";

const PROMO_COPY_BY_EVENT_ID = {
  eid: "Ramadan & Eid Collection — Explore the arrangements",
  valentine: "Valentine’s Collection — Discover the bouquets",
  graduation: "Graduation Collection — Celebrate the moment",
  graduation_late: "Graduation Collection — Celebrate the moment",
  mothers_day: "Mother’s Day Collection — Explore the arrangements",
  cny: "Chinese New Year Collection — Discover the arrangements",
  cny_mid: "Chinese New Year Collection — Discover the arrangements",
  christmas: "Christmas Collection — Explore the arrangements"
};
const FEATURED_HERO_FALLBACK = "/assets/ramadhan.webp";
const FEATURED_HERO_ALIASES = {
  "/assets/featured.png": FEATURED_HERO_FALLBACK,
  "/assets/valentines.jpeg": "/assets/valentine.webp",
  "/assets/mothersday.jpeg": "/assets/popupmothersday.webp",
  "/assets/christmas.jpeg": "/assets/popupchristmas.webp"
};
let featuredCatalogPromise = null;

function setSeasonalAvailabilityState(isActive) {
  if (typeof document === "undefined") return;
  document.body.classList.toggle("seasonal-inactive", !isActive);
  document.body.classList.toggle("seasonal-active", isActive);
  window.dispatchEvent(new CustomEvent("seasonalavailabilitychange", {
    detail: { isActive: Boolean(isActive) }
  }));

  const featuredAnchors = Array.from(document.querySelectorAll(
    '[data-seasonal-featured-link], a[href="#featured"], a[href="#featured-showcase"], a[href="index.html#featured-showcase"]'
  ));
  featuredAnchors.forEach((anchor) => {
    if (!(anchor instanceof HTMLElement)) return;
    anchor.hidden = !isActive;
    anchor.setAttribute("aria-hidden", isActive ? "false" : "true");
    anchor.style.display = isActive ? "" : "none";
    const parentItem = anchor.closest("li");
    if (parentItem instanceof HTMLElement) parentItem.hidden = !isActive;
  });

  const promoStrip = document.querySelector(".collection-promo-strip");
  if (promoStrip instanceof HTMLElement) {
    promoStrip.hidden = false;
    promoStrip.setAttribute("aria-hidden", isActive ? "false" : "true");
  }

  const promoFallback = document.querySelector(".promo-strip-fallback");
  if (promoFallback instanceof HTMLElement) promoFallback.hidden = false;

  const searchFeaturedBlock = document.getElementById("search-featured-block");
  if (searchFeaturedBlock instanceof HTMLElement) searchFeaturedBlock.hidden = !isActive;

  if (!isActive) {
    document.body.classList.remove("has-promo-strip");
    const currentHash = String(window.location.hash || "");
    const pointsToFeatured = currentHash === "#featured"
      || currentHash === "#featured-showcase"
      || currentHash.startsWith("#featured-product-")
      || currentHash.startsWith("#product-");
    if (pointsToFeatured) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#portfolio-showcase`);
    }
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeAssetPath(value) {
  const path = String(value || "").trim();
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return path;
  return `/${path.replace(/^\.?\//, "")}`;
}

function resolveFeaturedHeroImage(value) {
  const normalized = normalizeAssetPath(value);
  if (!normalized) return FEATURED_HERO_FALLBACK;
  return FEATURED_HERO_ALIASES[normalized] || normalized;
}

function preloadPriorityHeroAsset(src, scope = "seasonal") {
  const normalized = normalizeAssetPath(src);
  if (!normalized || typeof document === "undefined") return;
  let preload = document.head.querySelector(`link[data-priority-hero="${scope}"]`);
  if (!(preload instanceof HTMLLinkElement)) {
    preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "image";
    preload.setAttribute("fetchpriority", "high");
    preload.dataset.priorityHero = scope;
    document.head.appendChild(preload);
  }
  if (preload.href !== new URL(normalized, window.location.href).href) preload.href = normalized;
}

async function loadFeaturedCatalog(forceRefresh = false) {
  if (!forceRefresh && featuredCatalogPromise) return featuredCatalogPromise;
  featuredCatalogPromise = (async () => {
    const endpoints = ["/content/featured.json", "content/featured.json"];
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) continue;
        const payload = await response.json();
        return payload && typeof payload === "object" ? payload : null;
      } catch (_error) {
        // Try next endpoint variant.
      }
    }
    return null;
  })();
  return featuredCatalogPromise;
}

function parseMonthDay(value) {
  const [monthRaw, dayRaw] = String(value || "").split("-");
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

function toLocalStartOfDay(dateValue = new Date()) {
  return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
}

function isScheduledEventActive(event, today = new Date()) {
  const startPart = parseMonthDay(event?.start);
  const endPart = parseMonthDay(event?.end);
  if (!startPart || !endPart) return false;

  const now = toLocalStartOfDay(today);
  const year = now.getFullYear();
  const startDate = new Date(year, startPart.month - 1, startPart.day);
  const endDate = new Date(year, endPart.month - 1, endPart.day);

  if (endDate >= startDate) {
    return now >= startDate && now <= endDate;
  }
  return now >= startDate || now <= endDate;
}

function sortEventsByPriority(events = []) {
  return [...events].sort((a, b) => {
    const byPriority = (Number(b?.priority) || 0) - (Number(a?.priority) || 0);
    if (byPriority !== 0) return byPriority;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });
}

function resolveTopCatalogEvent(catalog, today = new Date()) {
  const events = Array.isArray(catalog?.events) ? catalog.events : [];
  if (!events.length) return null;

  const forced = sortEventsByPriority(events.filter((event) => event?.forceActive === true));
  if (forced.length) return forced[0];

  const withSchedule = events.filter((event) => parseMonthDay(event?.start) && parseMonthDay(event?.end));
  if (!withSchedule.length) return null;

  const active = sortEventsByPriority(withSchedule.filter((event) => isScheduledEventActive(event, today)));
  return active[0] || null;
}

function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
  if (Number.isFinite(numeric)) {
    return `Rp${new Intl.NumberFormat("id-ID").format(Math.round(numeric))}`;
  }
  return String(value).trim();
}

function renderFeaturedCard(eventTitle, imagePath, productName, productIndex, productPrice = "") {
  const safeImage = escapeHTML(imagePath || "");
  const imageMarkup = safeImage
    ? `<img class="featured-product-image" src="${safeImage}" alt="${escapeHTML(eventTitle)} product" loading="lazy" decoding="async">`
    : '<div class="featured-product-placeholder" aria-hidden="true"></div>';
  const displayName = productName || "Eid Arrangement";
  const priceLabel = formatRupiah(productPrice);
  const categorySlug = toSlug(eventTitle) || "featured";
  const productSlug = toSlug(displayName) || `produk-${productIndex + 1}`;
  const productAnchorId = `featured-product-${categorySlug}-${productSlug}`;
  const detailHref = `product.html?category=${encodeURIComponent(eventTitle || "Featured Collection")}&title=${encodeURIComponent(displayName)}&image=${encodeURIComponent(imagePath || "")}${priceLabel ? `&price=${encodeURIComponent(priceLabel)}` : ""}`;

  return `
    <article class="featured-product-card" data-featured-card data-featured-index="${productIndex}" id="${escapeHTML(productAnchorId)}">
      <a class="featured-product-link" href="${escapeHTML(detailHref)}">
        <div class="featured-media">
          ${imageMarkup}
        </div>
      </a>
      <div class="featured-product-body">
        <p class="featured-product-name">${escapeHTML(displayName)}</p>
        ${priceLabel ? `<p class="featured-product-price">${escapeHTML(priceLabel)}</p>` : ""}
      </div>
    </article>
  `;
}

function renderFeaturedGrid(eventTitle, images) {
  const cardsMarkup = images.map((item, index) => {
    return renderFeaturedCard(eventTitle, item.src, item.name, index, item.price || "");
  }).join("");
  return `
    <div class="featured-grid" data-featured-grid>
      ${cardsMarkup}
    </div>
  `;
}

function highlightFeaturedFromHash(rootElement) {
  const rawHash = String(window.location.hash || "").replace(/^#/, "");
  if (!rawHash) return;
  const normalizedHash = rawHash.startsWith("product-")
    ? `featured-${rawHash}`
    : rawHash;
  if (!normalizedHash.startsWith("featured-product-")) return;
  const target = rootElement.querySelector(`#${CSS.escape(normalizedHash)}`);
  if (!(target instanceof HTMLElement)) return;
  const featuredSection = document.getElementById("featured");
  if (featuredSection) {
    featuredSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  rootElement.querySelectorAll(".featured-product-card.is-active").forEach((item) => item.classList.remove("is-active"));
  target.classList.add("is-active");
  window.setTimeout(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 320);
}

function waitForIntroUnlock() {
  return new Promise((resolve) => {
    const isLocked = () => document.body.classList.contains("intro-scroll-lock");
    if (!isLocked()) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (!isLocked()) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    window.setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 8000);
  });
}

function scheduleFeaturedHashNavigation(rootElement, attempt = 0) {
  const hash = String(window.location.hash || "");
  if (!hash || (!hash.startsWith("#featured-product-") && !hash.startsWith("#product-"))) return;
  waitForIntroUnlock().then(() => {
    highlightFeaturedFromHash(rootElement);
    const normalizedHash = hash.replace(/^#/, "").startsWith("product-")
      ? `featured-${hash.replace(/^#/, "")}`
      : hash.replace(/^#/, "");
    if (rootElement.querySelector(`#${CSS.escape(normalizedHash)}`)) return;
    if (attempt < 30) {
      window.setTimeout(() => scheduleFeaturedHashNavigation(rootElement, attempt + 1), 150);
    }
  });
}

async function renderSeasonalPromotionStrip() {
  const strip = document.querySelector(".collection-promo-strip");
  const promoLink = document.getElementById("collection-promo-link");
  const promoClose = document.getElementById("collection-promo-close");
  if (!(strip instanceof HTMLElement) || !(promoLink instanceof HTMLAnchorElement)) return;

  const setStripVisible = (isVisible) => {
    document.body.classList.toggle("has-promo-strip", isVisible);
    strip.setAttribute("aria-hidden", isVisible ? "false" : "true");
  };

  const featuredCatalog = await loadFeaturedCatalog();
  const topEvent = resolveTopCatalogEvent(featuredCatalog, new Date());
  if (!topEvent) {
    setSeasonalAvailabilityState(false);
    setStripVisible(false);
    return;
  }
  setSeasonalAvailabilityState(true);

  const featuredEvents = Array.isArray(featuredCatalog?.events) ? featuredCatalog.events : [];
  if (!featuredEvents.length) {
    setSeasonalAvailabilityState(false);
    setStripVisible(false);
    return;
  }

  const eventConfig = featuredEvents.find((entry) => String(entry?.id || "").trim() === String(topEvent?.id || "").trim());
  if (!eventConfig) {
    setSeasonalAvailabilityState(false);
    setStripVisible(false);
    return;
  }

  const eventProducts = Array.isArray(eventConfig?.products) ? eventConfig.products : [];
  const validProducts = eventProducts.filter((item) => String(item?.src || "").trim().length > 0);
  if (!validProducts.length) {
    setSeasonalAvailabilityState(false);
    setStripVisible(false);
    return;
  }

  const promoCopy = String(eventConfig?.promoText || PROMO_COPY_BY_EVENT_ID[topEvent.id] || "").trim();
  if (!promoCopy) {
    setSeasonalAvailabilityState(false);
    setStripVisible(false);
    return;
  }

  setStripVisible(true);
  promoLink.textContent = promoCopy;
  promoLink.setAttribute("href", "#featured");
  if (promoClose instanceof HTMLButtonElement) {
    promoClose.onclick = () => {
      setStripVisible(false);
    };
  }
}

async function renderSeasonalPage() {
  const target = document.getElementById("seasonal-events");
  const featuredSection = document.getElementById("featured");
  const featuredHeroImage = document.getElementById("featured-hero-image");
  const featuredHeroClick = document.getElementById("featured-hero-click");
  const featuredKicker = document.getElementById("featured-kicker");
  const featuredLead = document.querySelector("#featured .featured-title-block .featured-lead");
  if (!target) return;
  const featuredTitle = document.getElementById("featured-title");
  const buildCuratedLead = () => "Each season brings a moment. We give it form.";
  const buildWarningText = () => "Each arrangement is custom-made. Final details and pricing are confirmed during consultation.";
  const buildConsultLabel = (title) => `Consult ${title || "This Collection"}`;
  const initializeFeaturedFadeIn = (scopeRoot) => {
    if (!(scopeRoot instanceof HTMLElement)) return;
    const cards = Array.from(scopeRoot.querySelectorAll(".featured-product-card"));
    if (!cards.length) return;
    cards.forEach((card, index) => {
      if (!(card instanceof HTMLElement)) return;
      card.style.setProperty("--featured-reveal-delay", `${Math.max(index, 0) * 70}ms`);
      card.classList.remove("is-visible");
    });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      cards.forEach((card) => card.classList.add("is-visible"));
      return;
    }
    const grid = scopeRoot.querySelector("[data-featured-grid]");
    const observer = new IntersectionObserver((entries, obs) => {
      const shouldReveal = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.18);
      if (!shouldReveal) return;
      cards.forEach((card) => card.classList.add("is-visible"));
      obs.disconnect();
    }, {
      threshold: [0, 0.18, 0.35],
      root: null,
      rootMargin: "0px 0px 20% 0px"
    });
    if (grid instanceof HTMLElement) observer.observe(grid);
    else cards.forEach((card) => observer.observe(card));
  };
  const setFeaturedVisibility = (isVisible) => {
    if (!(featuredSection instanceof HTMLElement)) return;
    setSeasonalAvailabilityState(isVisible);
    featuredSection.hidden = !isVisible;
    featuredSection.style.display = isVisible ? "" : "none";
    featuredSection.setAttribute("aria-hidden", isVisible ? "false" : "true");
  };
  const ensureCampaignCoverEagerLoad = () => {
    if (!(featuredHeroImage instanceof HTMLImageElement)) return;
    featuredHeroImage.loading = "eager";
    featuredHeroImage.decoding = "async";
    featuredHeroImage.fetchPriority = "high";
    preloadPriorityHeroAsset(featuredHeroImage.getAttribute("src") || FEATURED_HERO_FALLBACK);
    if (featuredHeroImage.dataset.fallbackBound === "1") return;
    featuredHeroImage.dataset.fallbackBound = "1";
    featuredHeroImage.addEventListener("error", () => {
      if (featuredHeroImage.src.endsWith(FEATURED_HERO_FALLBACK)) return;
      preloadPriorityHeroAsset(FEATURED_HERO_FALLBACK);
      featuredHeroImage.src = FEATURED_HERO_FALLBACK;
      featuredHeroImage.alt = "Featured seasonal campaign cover";
    });
  };

  if (featuredHeroClick instanceof HTMLButtonElement && featuredHeroClick.dataset.bound !== "1") {
    featuredHeroClick.dataset.bound = "1";
    featuredHeroClick.addEventListener("click", () => {
      const destination = target || featuredSection?.querySelector(".section-content");
      if (destination instanceof HTMLElement) destination.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  ensureCampaignCoverEagerLoad();

  const featuredCatalog = await loadFeaturedCatalog();
  const catalogTopEvent = resolveTopCatalogEvent(featuredCatalog, new Date());
  const fallbackTopEvent = getTopPrioritySeasonalEvent(new Date());
  const topEvent = catalogTopEvent || fallbackTopEvent;
  if (!topEvent) {
    setFeaturedVisibility(false);
    if (featuredTitle) featuredTitle.textContent = "Featured Collection";
    if (featuredKicker instanceof HTMLElement) featuredKicker.textContent = "Seasonal Collection";
    if (featuredLead instanceof HTMLElement) featuredLead.textContent = buildCuratedLead();
    if (featuredHeroImage instanceof HTMLImageElement) {
      ensureCampaignCoverEagerLoad();
      featuredHeroImage.src = FEATURED_HERO_FALLBACK;
      featuredHeroImage.alt = "Featured seasonal campaign cover";
    }
    target.innerHTML = "";
    return;
  }

  const featuredEvents = Array.isArray(featuredCatalog?.events) ? featuredCatalog.events : [];
  const eventConfig = featuredEvents.find((entry) => String(entry?.id || "").trim() === String(topEvent.id || "").trim());
  if (!eventConfig) {
    setFeaturedVisibility(false);
    target.innerHTML = "";
    return;
  }

  if (featuredTitle) featuredTitle.textContent = eventConfig.title || topEvent.title || "Featured Collection";
  if (featuredKicker instanceof HTMLElement) featuredKicker.textContent = eventConfig.kicker || featuredCatalog?.defaultKicker || "Seasonal Collection";
  if (featuredLead instanceof HTMLElement) {
    featuredLead.textContent = String(eventConfig.lead || "").trim() || buildCuratedLead();
  }
  if (featuredHeroImage instanceof HTMLImageElement) {
    ensureCampaignCoverEagerLoad();
    const headerImage = resolveFeaturedHeroImage(eventConfig.heroImage);
    preloadPriorityHeroAsset(headerImage);
    featuredHeroImage.src = headerImage;
    featuredHeroImage.alt = `${eventConfig.title || topEvent.title || "Featured Collection"} campaign cover`;
  }

  const eventProducts = Array.isArray(eventConfig.products) ? eventConfig.products : [];
  const validImages = eventProducts.filter((item) => String(item?.src || "").trim().length > 0);
  if (validImages.length === 0) {
    setFeaturedVisibility(false);
    target.innerHTML = "";
    return;
  }

  setFeaturedVisibility(true);
  const resolvedTitle = eventConfig.title || topEvent.title || "Featured Collection";
  const warningText = String(eventConfig.warningText || "").trim() || buildWarningText();
  const consultLabel = String(eventConfig.consultLabel || "").trim() || buildConsultLabel(resolvedTitle);
  target.innerHTML = `
    ${renderFeaturedGrid(resolvedTitle, validImages)}
    <p class="featured-warning">${escapeHTML(warningText)}</p>
    <div class="featured-consult-row">
      <a class="featured-collection-btn" href="${escapeHTML(buildWhatsAppOrderHref(resolvedTitle, "", null))}" target="_blank" rel="noopener noreferrer">
        ${escapeHTML(consultLabel)}
      </a>
    </div>
  `;

  const renderedImages = target.querySelectorAll(".featured-product-image");
  if (!renderedImages.length) {
    setFeaturedVisibility(false);
    target.innerHTML = "";
    return;
  }

  window.featuredHashNavigate = () => scheduleFeaturedHashNavigation(target);
  scheduleFeaturedHashNavigation(target);
  initializeFeaturedFadeIn(target);
  window.addEventListener("hashchange", () => scheduleFeaturedHashNavigation(target), { passive: true });
}

function initializeSeasonalSectionRendering() {
  void renderSeasonalPromotionStrip();

  const featuredSection = document.getElementById("featured");
  if (!featuredSection) {
    void renderSeasonalPage();
    return;
  }

  if (typeof IntersectionObserver !== "function") {
    void renderSeasonalPage();
    return;
  }

  let hasRendered = false;
  const initialHash = String(window.pendingPostIntroHash || window.location.hash || "");
  if (initialHash.startsWith("#featured-product-") || initialHash.startsWith("#product-")) {
    void renderSeasonalPage();
    hasRendered = true;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    const visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.18);
    if (!visible || hasRendered) return;
    hasRendered = true;
    void renderSeasonalPage();
    obs.unobserve(featuredSection);
  }, {
    threshold: [0, 0.18, 0.35, 0.5],
    root: null
  });
  observer.observe(featuredSection);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSeasonalSectionRendering, { once: true });
} else {
  initializeSeasonalSectionRendering();
}
