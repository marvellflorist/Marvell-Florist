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

async function loadFeaturedCatalog() {
  try {
    const response = await fetch("/content/featured.json", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload && typeof payload === "object" ? payload : null;
  } catch (_error) {
    return null;
  }
}

function renderFeaturedCard(eventTitle, imagePath, productName, productIndex, productPrice = "") {
  const safeImage = escapeHTML(imagePath || "");
  const imageMarkup = safeImage
    ? `<img class="featured-product-image" src="${safeImage}" alt="${escapeHTML(eventTitle)} product" loading="lazy" decoding="async">`
    : '<div class="featured-product-placeholder" aria-hidden="true"></div>';
  const displayName = productName || "Eid Arrangement";
  const categorySlug = toSlug(eventTitle) || "featured";
  const productSlug = toSlug(displayName) || `produk-${productIndex + 1}`;
  const productAnchorId = `featured-product-${categorySlug}-${productSlug}`;
  const detailHref = `product.html?category=${encodeURIComponent(eventTitle || "Featured Collection")}&title=${encodeURIComponent(displayName)}&image=${encodeURIComponent(imagePath || "")}&price=${encodeURIComponent(productPrice || "")}`;

  return `
    <article class="featured-product-card" data-featured-card data-featured-index="${productIndex}" id="${escapeHTML(productAnchorId)}">
      <a class="featured-product-link" href="${escapeHTML(detailHref)}">
        <div class="featured-media">
          ${imageMarkup}
        </div>
      </a>
      <div class="featured-product-body">
        <p class="featured-product-name">${escapeHTML(displayName)}</p>
        ${productPrice ? `<p class="featured-product-price">${escapeHTML(productPrice)}</p>` : ""}
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

function renderSeasonalPromotionStrip() {
  const strip = document.querySelector(".collection-promo-strip");
  const promoLink = document.getElementById("collection-promo-link");
  const promoClose = document.getElementById("collection-promo-close");
  if (!(strip instanceof HTMLElement) || !(promoLink instanceof HTMLAnchorElement)) return;

  const setStripVisible = (isVisible) => {
    document.body.classList.toggle("has-promo-strip", isVisible);
    strip.setAttribute("aria-hidden", isVisible ? "false" : "true");
  };

  const topEvent = getTopPrioritySeasonalEvent(new Date());
  const promoCopy = topEvent ? PROMO_COPY_BY_EVENT_ID[topEvent.id] : "";
  if (!promoCopy) {
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
  const featuredKicker = document.getElementById("featured-kicker");
  if (!target) return;
  const featuredTitle = document.getElementById("featured-title");
  const setFeaturedVisibility = (isVisible) => {
    if (!(featuredSection instanceof HTMLElement)) return;
    featuredSection.style.display = isVisible ? "" : "none";
    featuredSection.setAttribute("aria-hidden", isVisible ? "false" : "true");
  };

  const topEvent = getTopPrioritySeasonalEvent(new Date());
  if (!topEvent) {
    setFeaturedVisibility(false);
    if (featuredTitle) featuredTitle.textContent = "Featured Collection";
    if (featuredKicker instanceof HTMLElement) featuredKicker.textContent = "Seasonal Collection";
    if (featuredHeroImage instanceof HTMLImageElement) {
      featuredHeroImage.src = "/assets/featured.png";
      featuredHeroImage.alt = "Featured seasonal campaign cover";
    }
    target.innerHTML = "";
    return;
  }

  const featuredCatalog = await loadFeaturedCatalog();
  const featuredEvents = Array.isArray(featuredCatalog?.events) ? featuredCatalog.events : [];
  const eventConfig = featuredEvents.find((entry) => String(entry?.id || "").trim() === String(topEvent.id || "").trim());
  if (!eventConfig) {
    setFeaturedVisibility(false);
    target.innerHTML = "";
    return;
  }

  if (featuredTitle) featuredTitle.textContent = eventConfig.title || topEvent.title || "Featured Collection";
  if (featuredKicker instanceof HTMLElement) featuredKicker.textContent = eventConfig.kicker || featuredCatalog?.defaultKicker || "Seasonal Collection";
  if (featuredHeroImage instanceof HTMLImageElement) {
    const headerImage = String(eventConfig.heroImage || "").trim() || "/assets/featured.png";
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
  target.innerHTML = `
    ${renderFeaturedGrid(eventConfig.title || topEvent.title || "Featured Collection", validImages)}
    <p class="featured-warning">Each arrangement is custom-made. Final details and pricing are confirmed during consultation.</p>
    <div class="featured-consult-row">
      <a class="featured-collection-btn" href="${escapeHTML(buildWhatsAppOrderHref(eventConfig.title || topEvent.title || "Featured Collection", "", null))}" target="_blank" rel="noopener noreferrer">
        Consult ${escapeHTML(eventConfig.title || topEvent.title || "This Collection")}
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
  window.addEventListener("hashchange", () => scheduleFeaturedHashNavigation(target), { passive: true });
}

function initializeSeasonalSectionRendering() {
  renderSeasonalPromotionStrip();

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
