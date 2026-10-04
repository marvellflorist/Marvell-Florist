const sections = document.querySelectorAll("section[data-parallax]");
const storySections = Array.from(document.querySelectorAll("section[id]"));
const navElement = document.querySelector(".section-rail");
const navLinks = Array.from(document.querySelectorAll('.section-rail a[href^="#"]'));
const navIndicator = navElement ? navElement.querySelector(".nav-indicator") : null;
const galleryNavItem = navElement ? navElement.querySelector(".gallery-nav-item") : null;
const galleryNavMenu = document.getElementById("gallery-nav-menu");
const editionsMenu = document.querySelector(".editions-menu");
const editionsToggle = document.querySelector(".editions-cta");
const editionsPanel = document.getElementById("editions-panel");
const EDITIONS = [
  {
    id: "edition-i",
    label: "Chapter I — Study In Light",
    available: true
  },
  {
    id: "edition-ii",
    label: "Chapter II — Coming Soon",
    available: false
  }
];
const EDITION_CLASSES = EDITIONS.map((edition) => edition.id);
const cursorHalo = document.getElementById("cursor-halo");
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const DEVICE_CLASSES = ["device-mobile", "device-desktop", "platform-android"];
const TABLET_VIEWPORT_QUERY = "(min-width: 769px) and (max-width: 768px)";

function isTabletViewport() {
  return window.matchMedia(TABLET_VIEWPORT_QUERY).matches;
}

function applyDeviceClasses() {
  const ua = navigator.userAgent || "";
  const isAndroid = /\bAndroid\b/i.test(ua);
  const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
  const isMobile = isMobileViewport;
  const isDesktop = !isMobile;

  document.body.classList.remove(...DEVICE_CLASSES);
  if (isMobile) document.body.classList.add("device-mobile");
  if (isDesktop) document.body.classList.add("device-desktop");
  if (isAndroid) document.body.classList.add("platform-android");
}

applyDeviceClasses();
window.addEventListener("resize", applyDeviceClasses, { passive: true });
window.addEventListener("orientationchange", applyDeviceClasses, { passive: true });
let activeNavSectionId = "";
let navPreviewing = false;
let haloX = window.innerWidth * 0.5;
let haloY = window.innerHeight * 0.5;
let haloTargetX = haloX;
let haloTargetY = haloY;
let haloOpacity = 0;
let haloTargetOpacity = 0;
let lastCursorMoveAt = Date.now();
const haloIdleDelayMs = 900;
const state = new Map();
sections.forEach((section) => {
  state.set(section, {
    bg: 0,
    fg: 0,
    aboutFg1: 0,
    aboutFg2: 0,
    aboutFg3: 0,
    mouseX: 0,
    mouseY: 0,
    mouseTargetX: 0,
    mouseTargetY: 0
  });
});
const homeSectionElement = document.getElementById("home");
const homeSceneTiltElement = homeSectionElement ? homeSectionElement.querySelector(".scene-3d-tilt") : null;
const homeDepthBgElement = homeSectionElement ? homeSectionElement.querySelector(".layer-depth-bg") : null;
const homeDepthFgElement = homeSectionElement ? homeSectionElement.querySelector(".layer-depth-fg") : null;
const homeParticlesElement = homeSectionElement ? homeSectionElement.querySelector(".ambient-particles") : null;
const contactSectionElement = document.getElementById("services");
const contactBgImageElement = contactSectionElement ? contactSectionElement.querySelector(".layer-bg .background-image") : null;
const contactSocialsElement = contactSectionElement ? contactSectionElement.querySelector(".contact-socials") : null;
const contactIntroElement = contactSectionElement ? contactSectionElement.querySelector(".contact-intro") : null;
const gallerySectionElement = document.getElementById("gallery");
const headerElement = document.querySelector("header");
const promoStripElement = document.querySelector(".collection-promo-strip");
const featuredCoverImageElement = document.querySelector(".featured-campaign-hero img");
const portfolioCoverImageElement = document.querySelector(".portfolio-campaign-hero img");
const footerSectionElement = document.getElementById("site-footer");
const footerAboutLinks = Array.from(document.querySelectorAll(".footer-about-link"));
const footerCategoryLinks = Array.from(document.querySelectorAll("#site-footer a[data-gallery-category]"));
const footerAccordionColumns = Array.from(document.querySelectorAll("#site-footer .footer-col"));
const footerAccordionToggles = Array.from(document.querySelectorAll("#site-footer .footer-accordion-toggle"));
const homeHeroClickTarget = document.getElementById("home-hero-click");
const featuredHeroClickTarget = document.getElementById("featured-hero-click");
const featuredTitleClickTarget = document.getElementById("featured-title-click");
const portfolioHeroClickTarget = document.getElementById("portfolio-hero-click");
let mobileContactCardsRevealed = false;
let pendingPostIntroHash = "";
let mobileHeaderStackOffsetSmoothed = 0;
let lastAppliedMobileHeaderStackOffset = -1;
let desktopHeaderHoverActive = false;
document.body.classList.remove("intro-scroll-lock", "text-reveal-pending", "text-reveal-anim");
document.documentElement.classList.remove("intro-scroll-lock");
const introElement = document.getElementById("intro");
if (introElement) introElement.remove();

if (homeHeroClickTarget instanceof HTMLButtonElement) {
  homeHeroClickTarget.addEventListener("click", () => {
    const href = String(homeHeroClickTarget.getAttribute("data-seasonal-direct-href") || "gallery.html?entry=home-hero").trim() || "gallery.html?entry=home-hero";
    window.location.href = href;
  });
}

if (featuredHeroClickTarget instanceof HTMLButtonElement) {
  featuredHeroClickTarget.addEventListener("click", () => {
    const href = String(featuredHeroClickTarget.getAttribute("data-seasonal-direct-href") || "featured.html").trim() || "featured.html";
    window.location.href = href;
  });
}

if (featuredTitleClickTarget instanceof HTMLElement) {
  const featuredTargetHref = String(featuredTitleClickTarget.getAttribute("data-direct-href") || "featured.html").trim() || "featured.html";
  const goToFeaturedPage = () => {
    window.location.href = featuredTargetHref;
  };
  featuredTitleClickTarget.addEventListener("click", goToFeaturedPage);
  featuredTitleClickTarget.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    goToFeaturedPage();
  });
}

if (portfolioHeroClickTarget instanceof HTMLButtonElement) {
  portfolioHeroClickTarget.addEventListener("click", () => {
    window.location.href = "gallery.html?entry=portfolio-hero";
  });
}

if (window.matchMedia("(min-width: 1025px)").matches) {
  document.body.classList.add("desktop-header-hero-mode", "desktop-promo-deferred");
}

if (headerElement instanceof HTMLElement) {
  const handleDesktopHeaderEnter = () => {
    if (!window.matchMedia("(min-width: 1025px)").matches) return;
    desktopHeaderHoverActive = true;
    syncDesktopHeroHeaderTransition();
  };
  const handleDesktopHeaderLeave = () => {
    desktopHeaderHoverActive = false;
    syncDesktopHeroHeaderTransition();
  };
  headerElement.addEventListener("mouseenter", handleDesktopHeaderEnter, { passive: true });
  headerElement.addEventListener("mouseleave", handleDesktopHeaderLeave, { passive: true });
  headerElement.addEventListener("focusin", handleDesktopHeaderEnter);
  headerElement.addEventListener("focusout", handleDesktopHeaderLeave);
}

function syncDesktopHeroHeaderTransition() {
  const isDesktopViewport = window.matchMedia("(min-width: 1025px)").matches;
  if (!isDesktopViewport) {
    document.body.classList.remove("desktop-header-hero-mode", "desktop-promo-deferred");
    desktopHeaderHoverActive = false;
    return;
  }

  const headerHeight = headerElement instanceof HTMLElement ? headerElement.offsetHeight : 72;
  const homeRect = homeSectionElement instanceof HTMLElement ? homeSectionElement.getBoundingClientRect() : null;
  const homeBottom = homeRect ? homeRect.bottom : Number.POSITIVE_INFINITY;
  const hasScrolledPastHome = homeBottom <= (headerHeight + 8);
  const hasStartedScroll = window.scrollY > 6;
  const shouldActivateHeader = hasStartedScroll || desktopHeaderHoverActive;

  document.body.classList.toggle("desktop-header-hero-mode", !shouldActivateHeader);
  document.body.classList.toggle("desktop-promo-deferred", !hasScrolledPastHome);
}

window.addEventListener("scroll", syncDesktopHeroHeaderTransition, { passive: true });
window.addEventListener("resize", syncDesktopHeroHeaderTransition, { passive: true });
window.addEventListener("pageshow", syncDesktopHeroHeaderTransition);
syncDesktopHeroHeaderTransition();

function updateFooterAboutLinksForViewport() {
  footerAboutLinks.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    const targetKey = link.dataset.bioTarget || "";
    const aboutHref = targetKey === "fg3"
      ? "about.html#philosophy"
      : (targetKey === "fg2"
        ? "about.html#foundation"
        : "about.html#team");
    link.setAttribute("href", aboutHref);
  });
}

function initializeFooterAboutLinkBehavior() {
  footerAboutLinks.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    if (link.dataset.aboutBound === "1") return;
    link.dataset.aboutBound = "1";
  });
}

function initializeFooterAccordion() {
  const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
  footerAccordionColumns.forEach((column) => {
    const panel = column.querySelector(".footer-accordion-panel");
    if (!(column instanceof HTMLElement)) return;
    if (!(panel instanceof HTMLElement)) return;
    if (!isMobileViewport) {
      column.classList.remove("is-open");
      panel.style.maxHeight = "none";
      panel.style.opacity = "1";
      return;
    }
    if (!column.classList.contains("is-open")) {
      column.classList.remove("is-open");
    }
  });
  footerAccordionToggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    const column = toggle.closest(".footer-col");
    const panel = column ? column.querySelector(".footer-accordion-panel") : null;
    const isOpen = Boolean(column && column.classList.contains("is-open"));
    if (!isMobileViewport) {
      toggle.setAttribute("aria-expanded", "true");
      if (panel instanceof HTMLElement) {
        panel.style.maxHeight = "none";
        panel.style.opacity = "1";
      }
      return;
    }
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (panel instanceof HTMLElement) {
      panel.style.maxHeight = isOpen ? `${panel.scrollHeight}px` : "0px";
      panel.style.opacity = isOpen ? "1" : "0";
    }
  });
}

function bindFooterAccordionInteractions() {
  footerAccordionToggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    if (toggle.dataset.accordionBound === "1") return;
    toggle.dataset.accordionBound = "1";
    toggle.addEventListener("click", () => {
      const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
      if (!isMobileViewport) return;
      const column = toggle.closest(".footer-col");
      if (!(column instanceof HTMLElement)) return;
      const willOpen = !column.classList.contains("is-open");
      footerAccordionColumns.forEach((candidate) => {
        if (!(candidate instanceof HTMLElement)) return;
        candidate.classList.remove("is-open");
      });
      if (willOpen) column.classList.add("is-open");
      requestAnimationFrame(() => {
        initializeFooterAccordion();
      });
    });
  });
}

function initializeFooterCategoryLinks() {
  footerCategoryLinks.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    if (link.dataset.categoryBound === "1") return;
    link.dataset.categoryBound = "1";
    link.addEventListener("click", (event) => {
      const categoryName = link.dataset.galleryCategory || "";
      if (!categoryName) return;
      event.preventDefault();
      pendingGalleryCategoryFromNav = categoryName;
      navPreviewing = false;
      setActiveNav("gallery");
      if (openGalleryCategoryFromNav(categoryName)) {
        pendingGalleryCategoryFromNav = "";
      }
    });
  });
}

updateFooterAboutLinksForViewport();
initializeFooterAboutLinkBehavior();
bindFooterAccordionInteractions();
initializeFooterAccordion();
initializeFooterCategoryLinks();
window.addEventListener("resize", updateFooterAboutLinksForViewport, { passive: true });
window.addEventListener("orientationchange", updateFooterAboutLinksForViewport, { passive: true });
window.addEventListener("resize", initializeFooterAccordion, { passive: true });
window.addEventListener("orientationchange", initializeFooterAccordion, { passive: true });

function renderEditionsPanel() {
  if (!editionsPanel) return;
  editionsPanel.innerHTML = "";
  EDITIONS.forEach((edition) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "edition-option";
    option.dataset.edition = edition.id;
    option.textContent = edition.label;
    if (!edition.available) {
      option.disabled = true;
      option.setAttribute("aria-disabled", "true");
    }
    option.addEventListener("click", () => {
      if (!edition.available) return;
      applyEditionClass(edition.id, true);
      setEditionsPanelOpen(false);
    });
    editionsPanel.appendChild(option);
  });
}

function setEditionsPanelOpen(isOpen) {
  if (!editionsMenu || !editionsToggle || !editionsPanel) return;
  editionsMenu.classList.toggle("is-open", Boolean(isOpen));
  editionsToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function getCurrentEditionClass() {
  return EDITION_CLASSES.find((editionClass) => document.body.classList.contains(editionClass)) || "edition-i";
}

function applyEditionClass(editionClass, persist = true) {
  const targetEdition = EDITIONS.find((edition) => edition.id === editionClass);
  if (!targetEdition || !targetEdition.available) return;
  EDITION_CLASSES.forEach((candidate) => document.body.classList.remove(candidate));
  document.body.classList.add(editionClass);
  if (editionsToggle) editionsToggle.dataset.edition = editionClass;
  if (editionsPanel) {
    const options = Array.from(editionsPanel.querySelectorAll(".edition-option"));
    options.forEach((option) => {
      const isSelected = option.dataset.edition === editionClass;
      option.classList.toggle("is-active", isSelected);
      if (isSelected) option.setAttribute("aria-current", "true");
      else option.removeAttribute("aria-current");
    });
  }
  if (persist) {
    try {
      localStorage.setItem("marvell-edition", editionClass);
    } catch (_error) {
      // Skip persistence if storage is unavailable.
    }
  }
}

let preferredEditionClass = getCurrentEditionClass();
try {
  const storedEditionClass = localStorage.getItem("marvell-edition");
  const storedEdition = EDITIONS.find((edition) => edition.id === storedEditionClass);
  if (storedEdition && storedEdition.available) {
    preferredEditionClass = storedEditionClass;
  }
} catch (_error) {
  // Keep current class if storage is unavailable.
}
const currentEdition = EDITIONS.find((edition) => edition.id === preferredEditionClass);
if (!currentEdition || !currentEdition.available) {
  preferredEditionClass = "edition-i";
}
renderEditionsPanel();
applyEditionClass(preferredEditionClass, false);
if (editionsToggle) {
  editionsToggle.addEventListener("click", (event) => {
    event.preventDefault();
    const shouldOpen = !(editionsMenu && editionsMenu.classList.contains("is-open"));
    setEditionsPanelOpen(shouldOpen);
  });
}
if (editionsMenu) {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (editionsMenu.contains(target)) return;
    setEditionsPanelOpen(false);
  });
}
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  setEditionsPanelOpen(false);
});

const contactQuickTrigger = document.querySelector(".contact-quick-trigger");
const footerContactTriggers = Array.from(document.querySelectorAll(".footer-contact-trigger"));
const contactQuickPanel = document.getElementById("contact-quick-panel");
const contactQuickBackdrop = document.getElementById("contact-quick-backdrop");
const contactQuickClose = contactQuickPanel ? contactQuickPanel.querySelector(".contact-quick-close") : null;
const menuToggle = document.getElementById("menu-toggle");
const searchToggle = document.getElementById("search-toggle");
const searchMobileTrigger = document.getElementById("search-mobile-trigger");
const searchDropdown = document.getElementById("search-dropdown");
const searchDropdownBackdrop = document.getElementById("search-dropdown-backdrop");
const searchDropdownClose = document.getElementById("search-dropdown-close");
const searchDropdownBody = searchDropdown ? searchDropdown.querySelector(".search-dropdown-body") : null;
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchClearButton = document.getElementById("search-clear-btn");
const searchFeaturedList = document.getElementById("search-featured-list");
const searchProductsList = document.getElementById("search-products-list");
const searchProductsHeading = document.getElementById("search-products-heading");
const searchKeywordList = document.getElementById("search-keyword-list");
const searchFeaturedHeading = document.getElementById("search-featured-heading");
const searchStatus = document.getElementById("search-status");
const searchFeaturedBlock = document.getElementById("search-featured-block");
const searchKeywordsHeading = document.getElementById("search-keywords-heading");
const searchKeywordsGroup = document.getElementById("search-keywords-group");
const searchRecommendedGroup = document.getElementById("search-recommended-group");
const searchFaqGroup = document.getElementById("search-faq-group");
const searchQueryShell = document.getElementById("search-query-shell");
const searchQueryCount = document.getElementById("search-query-count");
const searchQueryTabProducts = document.getElementById("search-query-tab-products");
const searchQueryTabFaq = document.getElementById("search-query-tab-faq");
const searchQueryFilterButton = document.getElementById("search-query-filter");
const searchFiltersModal = document.getElementById("search-filters-modal");
const searchFiltersClose = document.getElementById("search-filters-close");
const searchFiltersWrap = document.getElementById("search-filters-wrap");
const searchFiltersApply = document.getElementById("search-filters-apply");
const featuredLeadElement = document.getElementById("featured-lead");
const portfolioKickerElement = document.getElementById("portfolio-kicker");
const portfolioHeadingElement = document.getElementById("portfolio-heading");
const portfolioLeadElement = document.getElementById("portfolio-lead");
const portfolioRequestNoteElement = document.getElementById("portfolio-request-note");
const portfolioRequestButtonElement = document.getElementById("portfolio-request-btn");
const menuPanel = document.getElementById("menu-panel");
/**
 * Whether assets/secondary-menu.js is the menu on this page. It always is.
 *
 * Everything below guarded by this is the home page's own older menu code, and
 * the two must never both bind to the same panel. The check used to be the
 * attribute that the shared script sets when it adopts the panel, which only
 * reads true if that script has already run — and the home page now loads it
 * last, in the order every other page uses. The script tag is enough: it says
 * the shared menu is coming, whether or not it has arrived yet.
 */
const SHARED_MENU_MANAGED = !!(
  menuPanel
  && (
    menuPanel.dataset.sharedManaged === "true"
    || document.querySelector('script[src*="secondary-menu.js"]')
  )
);
const menuClose = document.getElementById("menu-close");
const menuViews = menuPanel ? Array.from(menuPanel.querySelectorAll("[data-menu-view]")) : [];
const menuQuickPane = menuPanel ? menuPanel.querySelector("[data-menu-quickpane]") : null;
const menuQuickPanels = menuQuickPane instanceof HTMLElement ? Array.from(menuQuickPane.querySelectorAll("[data-quick-panel]")) : [];
const menuQuickTriggers = menuPanel ? Array.from(menuPanel.querySelectorAll("[data-menu-quick]")) : [];
const POPUPS_ENABLED = true;
const SEARCH_DEFAULT_KEYWORDS = [
  "Featured Collection",
  "Bouquet",
  "Standing Flower",
  "Papan Bunga",
  "Parcel",
  "Table Arrangement",
  "Funeral",
  "Graduation",
  "Grand Opening",
  "Duka Cita",
  "Pernikahan",
  "Toko Bunga"
];
const SEARCH_STOPWORDS = new Set([
  "collection", "flowers", "flower", "arrangement", "featured", "custom", "product", "the", "and",
  "s", "untuk", "dan", "dengan", "yang", "dari", "di", "ke", "pada", "bunga", "karangan", "toko", "florist"
]);
const SEARCH_FEATURED_FALLBACK_TITLE = "Featured Collection";
const getSearchRecommendedRowSize = () => {
  const viewportWidth = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
  if (viewportWidth <= 980) return 6;
  if (viewportWidth <= 1100) return 4;
  if (viewportWidth <= 1320) return 5;
  return 6;
};
const SEARCH_RECOMMENDED_SESSION_SEED = `search-recommend-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const SEARCH_CATEGORY_RULES = {
  "standing flowers": {
    singular: "Standing Flower",
    keywords: ["standing flower", "standing flowers", "bunga berdiri"]
  },
  "artificial flowers": {
    singular: "Table Arrangement",
    keywords: ["table arrangement", "table arrangements", "rangkaian meja", "artificial flower", "artificial flowers", "bunga artificial", "bunga imitasi", "bunga plastik"]
  },
  bouquets: {
    singular: "Bouquet",
    keywords: ["bouquet", "bouquets", "buket", "bunga tangan", "hand bouquet"]
  },
  "papan bunga": {
    singular: "Papan Bunga",
    keywords: ["papan bunga", "flower board", "karangan papan", "papan ucapan"]
  },
  parcels: {
    singular: "Parcel",
    keywords: ["parcel", "parcels", "parsel", "hampers"]
  },
  funerals: {
    singular: "Funeral",
    keywords: ["funeral", "funerals", "duka cita", "belasungkawa", "condolence"]
  },
  "by request": {
    singular: "By Request",
    keywords: ["by request", "custom", "custom arrangement", "sesuai permintaan"]
  }
};
const GALLERY_CONTENT_ENDPOINTS = ["/content/gallery.json", "content/gallery.json"];
const GALLERY_LEGACY_ENDPOINTS = ["/data/gallery.json", "data/gallery.json"];
const FEATURED_CONTENT_ENDPOINTS = ["/content/featured.json", "content/featured.json"];
const PORTFOLIO_CATEGORIES_ENDPOINTS = ["/content/portfolio-categories.json", "content/portfolio-categories.json"];
const SITE_SECTIONS_ENDPOINTS = ["/content/site-sections.json", "content/site-sections.json"];
const IS_LOCAL_CONTENT_HOST = ["127.0.0.1", "localhost"].includes(String(window.location.hostname || "").toLowerCase());
const SITE_SECTIONS_LIVE_SYNC_INTERVAL_MS = IS_LOCAL_CONTENT_HOST ? 1000 : 30000;
const getEmbeddedJsonPayload = (scriptId) => {
  const element = document.getElementById(scriptId);
  if (!(element instanceof HTMLScriptElement)) return null;
  const raw = String(element.textContent || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
};
const HOME_PORTFOLIO_DEFAULT_COPY = {
  kicker: "Portfolio",
  heading: "Explore a Selection of Our Creations",
  lead: "A broader view of our work across categories and occasions.",
  requestNote: "Looking for something else?",
  requestButtonLabel: "Request a custom arrangement"
};
let latestSiteSectionsSignature = "";
let siteSectionsLiveSyncTimer = 0;
const serializeComparablePayload = (payload = {}) => {
  try {
    return JSON.stringify(payload && typeof payload === "object" ? payload : {});
  } catch (_error) {
    return "";
  }
};
const fetchFirstAvailableJson = async (endpoints = []) => {
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) continue;
      return await response.json();
    } catch (_error) {
      // Try next endpoint variant.
    }
  }
  return null;
};
let searchFeaturedCollectionTitle = SEARCH_FEATURED_FALLBACK_TITLE;
let searchFeaturedCollectionProducts = [];
let searchFeaturedCollections = [];
const SEARCH_FILTER_GROUP_IDS = ["category", "color", "type"];
let activeSearchFilters = {
  category: new Set(),
  color: new Set(),
  type: new Set()
};
let searchFiltersModalOpen = false;
let activeSearchQueryView = "products";
const SEARCH_COLOR_DEFS = [
  { id: "white", label: "Putih", tokens: ["white", "ivory", "cream", "putih"] },
  { id: "red", label: "Merah", tokens: ["red", "merah"] },
  { id: "pink", label: "Pink", tokens: ["pink", "merah muda"] },
  { id: "purple", label: "Ungu", tokens: ["purple", "lavender", "lilac", "ungu"] },
  { id: "blue", label: "Biru", tokens: ["blue", "navy", "biru"] },
  { id: "yellow", label: "Kuning", tokens: ["yellow", "gold", "kuning"] },
  { id: "orange", label: "Oranye", tokens: ["orange", "oranye", "jingga"] },
  { id: "peach", label: "Peach", tokens: ["peach"] },
  { id: "brown", label: "Cokelat", tokens: ["brown", "cokelat", "coklat", "mocha", "tan"] },
  { id: "gray", label: "Abu-abu", tokens: ["gray", "grey", "abu", "abu-abu"] },
  { id: "green", label: "Hijau", tokens: ["green", "hijau"] },
  { id: "black", label: "Hitam", tokens: ["black", "hitam"] },
  { id: "gold", label: "Gold", tokens: ["gold", "emas"] }
];
const getSearchColorSwatchValue = (colorId) => {
  const palette = {
    pink: "#e78bb2",
    white: "#fffdf8",
    red: "#d9546d",
    purple: "#9267d8",
    blue: "#5d8fda",
    yellow: "#e1bc33",
    orange: "#e58d39",
    peach: "#efb29a",
    brown: "#9d6b43",
    gray: "#b3adab",
    green: "#6da65f",
    black: "#2a241f",
    gold: "#d5ab2d"
  };
  return palette[normalizeSearchFilterToken(colorId)] || "#d7cfc2";
};
const SEARCH_TYPE_DEFS = [
  { id: "bouquet", label: "Buket", tokens: ["bouquet", "buket", "bunga tangan", "hand bouquet"] },
  { id: "standing", label: "Standing Flower", tokens: ["standing", "standing flower", "bunga berdiri"] },
  { id: "papan", label: "Papan Bunga", tokens: ["papan", "board", "papan bunga", "karangan papan", "papan ucapan"] },
  { id: "parcel", label: "Parcel", tokens: ["parcel", "parsel", "hampers"] },
  { id: "artificial", label: "Table Arrangements", tokens: ["table arrangement", "table arrangements", "rangkaian meja", "artificial", "bunga artificial", "bunga imitasi", "bunga plastik"] },
  { id: "basket", label: "Keranjang", tokens: ["basket", "keranjang"] },
  { id: "bloom-box", label: "Bloom Box", tokens: ["bloom box", "bloombox", "box", "kotak bunga"] },
  { id: "pot", label: "Pot", tokens: ["pot"] },
  { id: "ribbon", label: "Pita", tokens: ["ribbon", "pita", "pita peresmian"] }
];
const SEARCH_QUERY_CATEGORY_INTENT_DEFS = [
  { id: "bouquets", tokens: ["bouquet", "bouquets", "buket", "bunga tangan", "hand bouquet"] },
  { id: "standing flowers", tokens: ["standing flower", "standing flowers", "standing", "bunga berdiri"] },
  { id: "papan bunga", tokens: ["papan bunga", "papan", "flower board", "karangan papan", "board"] },
  { id: "parcels", tokens: ["parcel", "parcels", "parsel", "hampers"] },
  { id: "artificial flowers", tokens: ["table arrangement", "table arrangements", "rangkaian meja", "artificial flower", "artificial flowers", "artificial", "bunga artificial", "bunga imitasi"] },
  { id: "funerals", tokens: ["funeral", "funerals", "belasungkawa", "duka cita", "condolence"] },
  { id: "by request", tokens: ["by request", "custom", "request", "sesuai permintaan"] }
];
const SEARCH_QUERY_OCCASION_INTENT_DEFS = [
  { id: "graduation", tokens: ["graduation", "wisuda", "grad"], matchTerms: ["graduation", "wisuda"] },
  { id: "wedding", tokens: ["wedding", "pernikahan", "nikah"], matchTerms: ["wedding", "pernikahan", "nikah"] },
  { id: "funeral", tokens: ["funeral", "duka", "duka cita", "belasungkawa", "condolence"], matchTerms: ["funeral", "duka", "duka cita", "belasungkawa", "condolence"] },
  { id: "opening", tokens: ["opening", "grand opening", "pembukaan", "peresmian", "sukses"], matchTerms: ["opening", "grand opening", "pembukaan", "peresmian", "sukses"] }
];
const SEARCH_FLOWER_TYPE_DEFS = [
  { id: "mawar", label: "Mawar", tokens: ["mawar", "rose", "roses"] },
  { id: "tulip", label: "Tulip", tokens: ["tulip"] },
  { id: "anggrek", label: "Anggrek", tokens: ["anggrek", "orchid", "orchids"] },
  { id: "lily", label: "Lily", tokens: ["lily", "lilies"] },
  { id: "babys-breath", label: "Baby's Breath", tokens: ["baby's breath", "babys breath", "babysbreath", "gypsophila"] },
  { id: "aster", label: "Aster", tokens: ["aster"] },
  { id: "sunflower", label: "Sunflower", tokens: ["sunflower", "sun flower"] },
  { id: "carnation", label: "Carnation", tokens: ["carnation", "carnations"] },
  { id: "hydrangea", label: "Hydrangea", tokens: ["hydrangea", "hortensia"] },
  { id: "peony", label: "Peony", tokens: ["peony", "peonies"] },
  { id: "gerbera", label: "Gerbera", tokens: ["gerbera"] },
  { id: "chrysanthemum", label: "Krisan", tokens: ["chrysanthemum", "krisan"] },
  { id: "poms", label: "Poms", tokens: ["poms", "pom", "pom poms", "pompom", "pompon"] },
  { id: "snap-dragons", label: "Snap Dragons", tokens: ["snap dragons", "snap dragon", "snapdragons", "snapdragon"] },
  { id: "gompie", label: "Gompie", tokens: ["gompie"] },
  { id: "aranthera-azimah", label: "Aranthera Azimah", tokens: ["aranthera azimah", "aranthera", "azimah"] },
  { id: "lysianthus", label: "Lysianthus", tokens: ["lysianthus", "lisianthus"] }
];
const SEARCH_SYNONYM_GROUPS = [
  ["mother's day", "mothers day", "mother day", "hari ibu", "mothers_day"],
  ["bouquet", "bouquets", "buket", "buket bunga", "bunga tangan", "hand bouquet"],
  ["wisuda", "graduation", "buket wisuda", "bouquet wisuda"],
  ["anniversary", "ulang tahun", "jadian", "hbd", "birthday", "tahun"],
  ["standing", "standing flower", "standing flowers", "bunga berdiri", "karangan berdiri"],
  ["papan", "papan bunga", "flower board", "board", "karangan papan", "papan ucapan"],
  ["parcel", "parsel", "hampers", "gift box", "hadiah"],
  ["table arrangement", "table arrangements", "rangkaian meja", "artificial", "bunga artificial", "bunga imitasi", "bunga plastik"],
  ["funeral", "duka", "duka cita", "belasungkawa", "rip", "condolence"],
  ["wedding", "nikah", "pernikahan", "marriage"],
  ["grand opening", "opening", "pembukaan", "peresmian", "pita peresmian", "ribbon"],
  ["florist", "toko bunga", "rangkaian bunga", "karangan bunga"],
  ["delivery", "antar", "pengiriman", "kirim"],
  ["custom", "request", "by request", "sesuai permintaan"]
];
const SEARCH_FALLBACK_PRODUCTS = [
  {
    title: "Standing Flower No. 01",
    category: "Standing Flowers",
    image: "/assets/uploads/sta-mf5226.webp",
    price: "",
    keywords: ["standing", "standing flowers", "bunga berdiri"]
  },
  {
    title: "Bouquet No. 01",
    category: "Bouquets",
    image: "/assets/uploads/bou-pinkhbltc.webp",
    price: "",
    keywords: ["bouquet", "buket", "bunga tangan"]
  },
  {
    title: "Papan Bunga No. 01",
    category: "Papan Bunga",
    image: "/assets/uploads/pap-wedding1papan.webp",
    price: "",
    keywords: ["papan bunga", "board", "ucapan"]
  },
  {
    title: "Parcel No. 01",
    category: "Parcels",
    image: "/assets/uploads/parcelcny.webp",
    price: "",
    keywords: ["parcel", "parsel", "hampers"]
  },
  {
    title: "Table Arrangement No. 01",
    category: "Table Arrangements",
    image: "/assets/uploads/art-mf5299.webp",
    price: "",
    keywords: ["table arrangement", "table arrangements", "rangkaian meja", "artificial", "bunga artificial", "bloom box", "pot"]
  }
];
const toTitleCaseWords = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .split(/\s+/)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(" ");
const getSearchCategoryRule = (categoryLabel) => {
  const normalized = String(categoryLabel || "").trim().toLowerCase();
  return SEARCH_CATEGORY_RULES[normalized] || null;
};
const getSingularProductCategoryLabel = (categoryLabel) => {
  const rule = getSearchCategoryRule(categoryLabel);
  return rule?.singular || toTitleCaseWords(categoryLabel || "Collection") || "Collection";
};
const decodeSearchFileStem = (imagePath) => {
  const filename = String(imagePath || "").trim().split("/").pop() || "";
  try {
    return decodeURIComponent(filename).replace(/\.[a-z0-9]+$/i, "");
  } catch (_error) {
    return filename.replace(/\.[a-z0-9]+$/i, "");
  }
};
const normalizeSearchCompactText = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const SEARCH_ARTIFICIAL_BLOOM_BOX_INDEXES = new Set([5, 13, 18, 22]);
const searchImageHasToken = (rawText, compactText, token) => {
  const normalizedToken = normalizeSearchText(token);
  if (!normalizedToken) return false;
  if (rawText.includes(normalizedToken)) return true;
  const compactToken = normalizeSearchCompactText(normalizedToken);
  return Boolean(compactToken) && compactText.includes(compactToken);
};
const searchSourceHasAny = (rawText, compactText, candidates = []) => candidates.some((candidate) => searchImageHasToken(rawText, compactText, candidate));
const countSearchColorHits = (rawText, compactText) => {
  const groups = [
    ["pink"],
    ["white"],
    ["red"],
    ["purple", "purp", "perp"],
    ["blue"],
    ["yellow"],
    ["orange"],
    ["peach"],
    ["brown", "cokelat", "coklat", "mocha", "tan"],
    ["gray", "grey", "abu", "abu-abu"],
    ["gold"],
    ["black"],
    ["green"]
  ];
  return groups.reduce((total, group) => total + (searchSourceHasAny(rawText, compactText, group) ? 1 : 0), 0);
};
const getSearchArtificialItemNumber = (item, fallbackIndex = -1) => {
  const explicit = Number(item?.artificialIndex);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const normalizedFallback = Number(fallbackIndex);
  if (Number.isFinite(normalizedFallback) && normalizedFallback >= 0) return normalizedFallback + 1;
  return 0;
};
const detectSearchArtificialType = (item, rawText, compactText, fallbackIndex = -1) => {
  const itemNumber = getSearchArtificialItemNumber(item, fallbackIndex);
  if (SEARCH_ARTIFICIAL_BLOOM_BOX_INDEXES.has(itemNumber)) return "bloom-box";
  if (searchSourceHasAny(rawText, compactText, ["balloon", "bloombal", "balon", "bloombox", "bloom box"])) return "bloom-box";
  if (searchSourceHasAny(rawText, compactText, ["pot", "potted", "basket"])) return "potted";
  return "potted";
};
const findSearchOptionDefinition = (definitions, optionId) => {
  const normalized = normalizeSearchFilterToken(optionId);
  return definitions.find((entry) => normalizeSearchFilterToken(entry.id) === normalized) || null;
};
const buildSearchFilterOptionTerms = (groupId, option) => {
  const optionId = normalizeSearchFilterToken(option?.id || option?.label || "");
  const label = String(option?.label || option?.id || "").trim();
  const terms = new Set([
    normalizeSearchText(label),
    normalizeSearchText(optionId.replace(/-/g, " "))
  ]);
  if (groupId === "color") {
    const def = findSearchOptionDefinition(SEARCH_COLOR_DEFS, optionId);
    if (def) def.tokens.forEach((token) => terms.add(normalizeSearchText(token)));
  }
  if (groupId === "type") {
    const def = findSearchOptionDefinition(SEARCH_TYPE_DEFS, optionId);
    if (def) def.tokens.forEach((token) => terms.add(normalizeSearchText(token)));
    if (optionId === "cross") ["cross", "salib"].forEach((token) => terms.add(token));
    if (optionId === "frame") ["frame", "framed"].forEach((token) => terms.add(token));
    if (optionId === "standing-flowers") ["standing flowers", "standing flower", "bunga berdiri"].forEach((token) => terms.add(token));
    if (optionId === "papan-bunga") ["papan bunga", "flower board", "karangan papan"].forEach((token) => terms.add(token));
    if (optionId === "potted") ["pot", "potted"].forEach((token) => terms.add(token));
  }
  if (groupId === "flower-type") {
    const def = findSearchOptionDefinition(SEARCH_FLOWER_TYPE_DEFS, optionId);
    if (def) def.tokens.forEach((token) => terms.add(normalizeSearchText(token)));
  }
  if (groupId === "flower-condition") {
    if (optionId === "artificial") ["table arrangement", "table arrangements", "rangkaian meja", "artificial", "bunga artificial", "bunga imitasi", "bunga plastik"].forEach((token) => terms.add(token));
    if (optionId === "fresh") ["fresh", "segar"].forEach((token) => terms.add(token));
    if (optionId === "preserved") ["preserved", "awet"].forEach((token) => terms.add(token));
  }
  if (groupId === "occasion") {
    if (optionId === "pernikahan") ["pernikahan", "wedding", "nikah"].forEach((token) => terms.add(token));
    if (optionId === "wisuda") ["wisuda", "graduation", "grad"].forEach((token) => terms.add(token));
    if (optionId === "belasungkawa") ["belasungkawa", "duka cita", "condolence", "funeral"].forEach((token) => terms.add(token));
    if (optionId === "sukses") ["sukses", "success", "grand opening", "opening", "peresmian", "pembukaan", "selamat"].forEach((token) => terms.add(token));
    if (optionId === "idul-fitri") ["idul fitri", "eid", "lebaran", "ramadan", "ramadhan"].forEach((token) => terms.add(token));
    if (optionId === "imlek") ["imlek", "chinese new year", "cny", "gong xi"].forEach((token) => terms.add(token));
    if (optionId === "natal") ["natal", "christmas", "xmas"].forEach((token) => terms.add(token));
    if (optionId === "hadiah") ["hadiah", "gift"].forEach((token) => terms.add(token));
  }
  if (groupId === "material") {
    if (optionId === "rustic") ["rustic", "wood", "wooden"].forEach((token) => terms.add(token));
    if (optionId === "standard") ["standard", "regular"].forEach((token) => terms.add(token));
  }
  if (groupId === "size") {
    if (optionId === "small") ["small", "mini", "petite", "compact", "kecil"].forEach((token) => terms.add(token));
    if (optionId === "medium") ["medium", "regular", "standard", "sedang"].forEach((token) => terms.add(token));
    if (optionId === "large") ["large", "big", "besar"].forEach((token) => terms.add(token));
    if (optionId === "grand") ["grand", "jumbo", "premium"].forEach((token) => terms.add(token));
    if (optionId === "1-board") ["1 board", "1 boards", "1 papan"].forEach((token) => terms.add(token));
    if (optionId === "2-boards") ["2 board", "2 boards", "2 papan"].forEach((token) => terms.add(token));
    if (optionId === "3-boards") ["3 board", "3 boards", "3 papan"].forEach((token) => terms.add(token));
  }
  return Array.from(terms).filter(Boolean);
};
const inferSearchKeywordsFromImage = (imagePath, categoryLabel) => {
  const rawText = normalizeSearchText(decodeSearchFileStem(imagePath))
    .replace(/[_(),.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compactText = normalizeSearchCompactText(rawText);
  const inferred = new Set((getSearchCategoryRule(categoryLabel)?.keywords) || [normalizeSearchText(categoryLabel)]);

  SEARCH_COLOR_DEFS.forEach((colorDef) => {
    if (colorDef.tokens.some((token) => searchImageHasToken(rawText, compactText, token))) {
      inferred.add(normalizeSearchText(colorDef.label));
      colorDef.tokens.forEach((token) => inferred.add(normalizeSearchText(token)));
    }
  });

  SEARCH_TYPE_DEFS.forEach((typeDef) => {
    if (typeDef.tokens.some((token) => searchImageHasToken(rawText, compactText, token))) {
      inferred.add(normalizeSearchText(typeDef.label));
      typeDef.tokens.forEach((token) => inferred.add(normalizeSearchText(token)));
    }
  });

  SEARCH_FLOWER_TYPE_DEFS.forEach((flowerTypeDef) => {
    if (flowerTypeDef.tokens.some((token) => searchImageHasToken(rawText, compactText, token))) {
      inferred.add(normalizeSearchText(flowerTypeDef.label));
      flowerTypeDef.tokens.forEach((token) => inferred.add(normalizeSearchText(token)));
    }
  });

  [
    { tokens: ["graduation", "wisuda"], keywords: ["graduation", "wisuda"] },
    { tokens: ["wedding", "nikah", "pernikahan"], keywords: ["wedding", "nikah", "pernikahan"] },
    { tokens: ["funeral", "duka", "dukacita", "belasungkawa"], keywords: ["funeral", "duka cita", "belasungkawa"] },
    { tokens: ["grandopening", "opening", "pembukaan", "peresmian"], keywords: ["grand opening", "pembukaan", "peresmian"] },
    { tokens: ["anniversary", "birthday", "ulangtahun", "hbd"], keywords: ["anniversary", "birthday", "ulang tahun"] },
    { tokens: ["imlek", "cny", "chinese"], keywords: ["imlek", "chinese new year"] },
    { tokens: ["ramadan", "eid", "idulfitri"], keywords: ["ramadan", "eid", "idul fitri"] },
    { tokens: ["christmas", "natal"], keywords: ["christmas", "natal"] },
    { tokens: ["valentine"], keywords: ["valentine"] },
    { tokens: ["cross", "salib"], keywords: ["cross", "salib"] },
    { tokens: ["frame"], keywords: ["frame"] },
    { tokens: ["basket", "keranjang"], keywords: ["basket", "keranjang"] },
    { tokens: ["money", "duit", "cash"], keywords: ["money", "money bouquet", "duit", "cash"] },
    { tokens: ["pot", "potted"], keywords: ["pot", "potted"] },
    { tokens: ["bloombox", "bloom box", "box"], keywords: ["bloom box", "kotak bunga"] },
    { tokens: ["bloombal", "balloon", "balon"], keywords: ["balloon", "balon"] },
    { tokens: ["request", "custom", "weddingcar", "cardoorflowers", "doorflowers", "dekor"], keywords: ["by request", "custom", "dekorasi"] }
  ].forEach((rule) => {
    if (rule.tokens.some((token) => searchImageHasToken(rawText, compactText, token))) {
      rule.keywords.forEach((keyword) => inferred.add(normalizeSearchText(keyword)));
    }
  });

  return Array.from(inferred).filter(Boolean);
};
const formatProductNumberLabel = (value) => {
  const numeric = Number(value);
  const safeNumber = Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 1;
  return `No. ${String(safeNumber).padStart(2, "0")}`;
};
const normalizeNumberedProductTitle = (rawTitle, categoryLabel, fallbackNumber = 1) => {
  const safeCategory = getSingularProductCategoryLabel(categoryLabel);
  const source = String(rawTitle || "").trim();
  const match = source.match(/(?:no\.?\s*)?(\d{1,4})\s*$/i);
  const numberValue = match ? Number(match[1]) : Number(fallbackNumber);
  return `${safeCategory} ${formatProductNumberLabel(numberValue)}`;
};
const normalizeSearchText = (value) => String(value || "").toLowerCase().trim();
const normalizeSearchImagePath = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  const cleaned = raw.replace(/^\.?\//, "");
  return `/${cleaned}`;
};
const parseSearchPriceNumber = (value) => {
  const numeric = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};
const buildSearchProductHref = ({ category, title, image, price }) => {
  const safeCategory = String(category || "Collection").trim() || "Collection";
  const safeTitle = String(title || "Product").trim() || "Product";
  const safeImage = normalizeSearchImagePath(image);
  const safePrice = formatRupiah(price);
  return `product.html?category=${encodeURIComponent(safeCategory)}&title=${encodeURIComponent(safeTitle)}&image=${encodeURIComponent(safeImage)}${safePrice ? `&price=${encodeURIComponent(safePrice)}` : ""}`;
};
const buildSearchFeaturedCollectionHref = ({ eventId, eventTitle, productTitle } = {}) => {
  const slugify = (value) => String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const eventSlug = slugify(String(eventId || eventTitle || "").trim()) || "featured";
  const productSlug = slugify(String(productTitle || "").trim());
  return productSlug ? `index.html#featured-product-${eventSlug}-${productSlug}` : "index.html#featured";
};
const isSearchExcludedItem = (item) => normalizeSearchText(item?.category || "") === "by request";
const isByRequestSearchItem = (item) => {
  const category = normalizeSearchText(item?.category || "");
  if (category === "by request") return true;
  const keywords = Array.isArray(item?.keywords) ? item.keywords.map((entry) => normalizeSearchText(entry)).filter(Boolean) : [];
  return keywords.some((keyword) => (
    keyword.includes("by request")
    || keyword.includes("custom")
    || keyword.includes("sesuai permintaan")
  ));
};
const resolveSearchHref = (item) => {
  if (isByRequestSearchItem(item)) {
    return "https://wa.me/6281275017456?text=Hello%20Marvell%20Florist%2C%20I%20would%20like%20to%20consult%20about%20an%20arrangement.";
  }
  const href = String(item?.href || "").trim();
  if (href && href !== "#") return href;
  return buildSearchProductHref({
    category: item?.category,
    title: item?.title,
    image: item?.image,
    price: item?.rawPrice
  });
};
const isByRequestSearchQuery = (queryText = "") => {
  const normalized = normalizeSearchText(queryText);
  if (!normalized) return false;
  const tokens = new Set([
    normalized,
    ...tokenizeSearchQuery(normalized),
    ...getQuerySynonymVariants(normalized)
  ]);
  return Array.from(tokens).some((term) => (
    term === "request"
    || term === "custom"
    || term.includes("by request")
    || term.includes("sesuai permintaan")
  ));
};
const buildByRequestCategorySearchCard = () => {
  const categoryMeta = findSearchCategoryMeta("By Request");
  const image = normalizeSearchImagePath(
    categoryMeta?.coverImage
    || GALLERY_CATEGORY_COVER_IMAGES["By Request"]
    || "/assets/request.webp"
  );
  return {
    title: "Custom Arrangements",
    category: "Custom Arrangements",
    image,
    price: "",
    rawPrice: null,
    keywords: buildBilingualSearchKeywords("Sesuai Permintaan", "By Request", ["custom", "request", "sesuai permintaan"]),
    href: "https://wa.me/6281275017456?text=Hello%20Marvell%20Florist%2C%20I%20would%20like%20to%20consult%20about%20an%20arrangement."
  };
};
let searchBaseProductPool = [];
let searchSeasonalProductPool = [];
let searchProductPool = searchBaseProductPool.slice();
const getVisibleSearchFeaturedCards = () => searchFeaturedCollectionProducts.slice();
const getVisibleSearchFeaturedCollections = () => searchFeaturedCollections
  .map((collection) => ({
    ...collection,
    products: Array.isArray(collection?.products) ? collection.products.slice() : []
  }))
  .filter((collection) => collection.products.length > 0);
const getVisibleSearchProductPool = () => searchProductPool.filter((item) => !isSearchExcludedItem(item));
const rebuildSearchProductPool = () => {
  const merged = [...searchBaseProductPool, ...searchSeasonalProductPool];
  const deduped = new Map();
  merged.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const key = [
      normalizeSearchText(item.category),
      normalizeSearchImagePath(item.image)
    ].join("|");
    if (!key.trim()) return;
    if (!deduped.has(key)) deduped.set(key, item);
  });
  searchProductPool = Array.from(deduped.values());
};
const getQuerySynonymVariants = (value) => {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  const variants = new Set([normalized]);
  SEARCH_SYNONYM_GROUPS.forEach((group) => {
    const normalizedGroup = group.map((item) => normalizeSearchText(item)).filter(Boolean);
    const hasMatch = normalizedGroup.some((term) => term === normalized || term.includes(normalized) || normalized.includes(term));
    if (!hasMatch) return;
    normalizedGroup.forEach((term) => variants.add(term));
  });
  return Array.from(variants);
};
const tokenizeSearchQuery = (value) => normalizeSearchText(value)
  .replace(/[^a-z0-9]+/g, " ")
  .split(/\s+/)
  .map((entry) => entry.trim())
  .filter((entry) => entry && (!SEARCH_STOPWORDS.has(entry) || /^\d+$/.test(entry)));
const getQueryVariantGroups = (value) => {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  const tokens = tokenizeSearchQuery(normalized);
  const groups = [];
  const seen = new Set();

  if (tokens.length > 1) {
    const phraseVariants = getQuerySynonymVariants(normalized).filter(Boolean);
    if (phraseVariants.length) {
      groups.push({ kind: "phrase", variants: phraseVariants, raw: normalized });
      seen.add(normalized);
    }
  }

  tokens.forEach((token) => {
    if (!token || seen.has(token)) return;
    const variants = getQuerySynonymVariants(token).filter(Boolean);
    if (!variants.length) return;
    groups.push({ kind: "token", variants, raw: token });
    seen.add(token);
  });

  if (!groups.length) {
    groups.push({ kind: "token", variants: [normalized], raw: normalized });
  }
  return groups;
};
const buildBilingualSearchKeywords = (title, category, extraKeywords = []) => {
  const seedTerms = [
    category,
    ...(Array.isArray(extraKeywords) ? extraKeywords : [])
  ].map((value) => normalizeSearchText(value)).filter(Boolean);
  const allTerms = new Set(seedTerms);
  SEARCH_SYNONYM_GROUPS.forEach((group) => {
    const normalizedGroup = group.map((item) => normalizeSearchText(item)).filter(Boolean);
    const hit = normalizedGroup.some((term) => seedTerms.some((seed) => seed === term));
    if (!hit) return;
    normalizedGroup.forEach((term) => allTerms.add(term));
  });
  return Array.from(allTerms);
};
const hasAnyActiveSearchFilters = () => SEARCH_FILTER_GROUP_IDS.some((groupId) => activeSearchFilters[groupId] instanceof Set && activeSearchFilters[groupId].size > 0);
const updateSearchFiltersApplyState = () => {
  if (!(searchFiltersApply instanceof HTMLButtonElement)) return;
  const shouldEnable = hasAnyActiveSearchFilters();
  searchFiltersApply.disabled = !shouldEnable;
  searchFiltersApply.classList.toggle("is-disabled", !shouldEnable);
};
const resetActiveSearchFilters = () => {
  activeSearchFilters = {
    category: new Set(),
    color: new Set(),
    type: new Set()
  };
};
const getSearchItemTextContext = (item) => normalizeSearchText([
  item?.category || "",
  Array.isArray(item?.keywords) ? item.keywords.join(" ") : "",
  item?.image || ""
].join(" "));
const tokenMatchesContext = (context, token) => {
  const normalizedToken = normalizeSearchText(token);
  if (!normalizedToken) return false;
  const escaped = normalizedToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, "i").test(context);
};
const normalizeSearchFilterToken = (value) => normalizeSearchText(value).replace(/[_\s]+/g, "-");
const readSearchStructuredFilterField = (item, groupId) => {
  const filters = item?.filters && typeof item.filters === "object" ? item.filters : {};
  if (groupId === "color") return Object.prototype.hasOwnProperty.call(filters, "colors") ? filters.colors : undefined;
  if (groupId === "type") return Object.prototype.hasOwnProperty.call(filters, "type") ? filters.type : undefined;
  if (groupId === "flower-condition") return Object.prototype.hasOwnProperty.call(filters, "flowerCondition") ? filters.flowerCondition : undefined;
  if (groupId === "flower-type") return Object.prototype.hasOwnProperty.call(filters, "flowerTypes") ? filters.flowerTypes : undefined;
  if (groupId === "occasion") return Object.prototype.hasOwnProperty.call(filters, "occasion") ? filters.occasion : undefined;
  if (groupId === "material") return Object.prototype.hasOwnProperty.call(filters, "material") ? filters.material : undefined;
  if (groupId === "size") return Object.prototype.hasOwnProperty.call(filters, "size") ? filters.size : undefined;
  return undefined;
};
const getSearchStructuredFilterTokens = (item, groupId) => {
  const raw = readSearchStructuredFilterField(item, groupId);
  if (raw === undefined || raw === null || raw === "") return null;
  if (Array.isArray(raw)) return raw.map((entry) => normalizeSearchFilterToken(entry)).filter(Boolean);
  return [normalizeSearchFilterToken(raw)].filter(Boolean);
};
const itemMatchesSearchOccasionIntent = (item, intentId = "") => {
  const normalizedIntent = normalizeSearchFilterToken(intentId);
  if (!normalizedIntent) return false;
  const structuredOccasion = getSearchStructuredFilterTokens(item, "occasion");
  const definition = SEARCH_QUERY_OCCASION_INTENT_DEFS.find((entry) => entry.id === normalizedIntent);
  const matchTerms = Array.isArray(definition?.matchTerms) ? definition.matchTerms : [];

  if (structuredOccasion !== null) {
    if (normalizedIntent === "graduation" && structuredOccasion.includes("wisuda")) return true;
    if (normalizedIntent === "wedding" && structuredOccasion.includes("pernikahan")) return true;
    if (normalizedIntent === "funeral" && structuredOccasion.includes("belasungkawa")) return true;
    if (normalizedIntent === "opening" && structuredOccasion.includes("sukses")) return true;
  }

  const context = getSearchItemTextContext(item);
  return matchTerms.some((term) => tokenMatchesContext(context, term));
};
const itemMatchesColorFilter = (item, colorId) => {
  const structured = getSearchStructuredFilterTokens(item, "color");
  if (structured !== null && structured.includes(normalizeSearchFilterToken(colorId))) return true;
  const colorDef = SEARCH_COLOR_DEFS.find((entry) => entry.id === colorId);
  if (!colorDef) return false;
  const context = getSearchItemTextContext(item);
  return colorDef.tokens.some((token) => tokenMatchesContext(context, token));
};
const itemMatchesTypeFilter = (item, typeId) => {
  const structured = getSearchStructuredFilterTokens(item, "type");
  if (structured !== null && structured.includes(normalizeSearchFilterToken(typeId))) return true;
  const typeDef = SEARCH_TYPE_DEFS.find((entry) => entry.id === typeId);
  if (!typeDef) return false;
  const context = getSearchItemTextContext(item);
  return typeDef.tokens.some((token) => tokenMatchesContext(context, token));
};
const normalizeSearchCategorySlug = (value) => normalizeSearchFilterToken(String(value || "").replace(/[^a-z0-9]+/gi, " "));
const findSearchCategoryMeta = (categoryLabel = "") => {
  const normalizedLabel = normalizeSearchText(categoryLabel);
  const normalizedSlug = normalizeSearchCategorySlug(categoryLabel);
  if (typeof galleryCategoryMeta !== "undefined" && Array.isArray(galleryCategoryMeta)) {
    const matched = galleryCategoryMeta.find((entry) => {
      const candidates = [
        entry?.name,
        entry?.key,
        ...(Array.isArray(entry?.aliases) ? entry.aliases : []),
        ...(Array.isArray(entry?.matchCategories) ? entry.matchCategories : [])
      ];
      return candidates.some((candidate) => {
        const normalizedCandidate = normalizeSearchText(candidate);
        const normalizedCandidateSlug = normalizeSearchCategorySlug(candidate);
        return normalizedCandidate === normalizedLabel || normalizedCandidateSlug === normalizedSlug;
      });
    });
    if (matched) return matched;
  }
  return null;
};
const findSearchLegacyMatcher = (groups = [], groupId = "", optionId = "") => {
  const normalizedGroup = normalizeSearchFilterToken(groupId);
  const normalizedOption = normalizeSearchFilterToken(optionId);
  const group = groups.find((entry) => normalizeSearchFilterToken(entry?.id) === normalizedGroup);
  if (!group) return null;
  const option = Array.isArray(group.options)
    ? group.options.find((entry) => normalizeSearchFilterToken(entry?.id) === normalizedOption)
    : null;
  return option && typeof option.match === "function" ? option.match : null;
};
const buildSearchLegacyCategoryFilters = (categoryMeta = null) => {
  const categoryKey = normalizeSearchCategorySlug(categoryMeta?.key || categoryMeta?.name || "");
  const colorGroup = {
    id: "color",
    label: "Warna",
    options: SEARCH_COLOR_DEFS.map((entry) => ({
      id: entry.id,
      label: entry.label,
      match: (_item, rawText, compactText) => entry.tokens.some((token) => searchImageHasToken(rawText, compactText, token))
    }))
  };
  const sizeGroup = {
    id: "size",
    label: "Ukuran",
    options: [
      { id: "small", label: "Kecil", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["small", "mini", "petite", "compact", "kecil"]) },
      { id: "medium", label: "Sedang", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["medium", "regular", "standard", "sedang"]) },
      { id: "large", label: "Besar", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["large", "big", "besar"]) },
      { id: "grand", label: "Grand", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["grand", "jumbo", "premium"]) }
    ]
  };
  const flowerConditionGroup = {
    id: "flower-condition",
    label: "Kondisi Bunga",
    options: [
      { id: "artificial", label: "Table Arrangements", match: () => categoryKey === "artificial-flowers" },
      { id: "fresh", label: "Segar", match: () => false },
      { id: "preserved", label: "Preserved", match: () => false }
    ]
  };
  const flowerTypeGroup = (allowedIds = []) => {
    const allowedSet = new Set(allowedIds.map((entry) => normalizeSearchFilterToken(entry)));
    return {
      id: "flower-type",
      label: "Jenis Bunga",
      options: SEARCH_FLOWER_TYPE_DEFS
        .filter((entry) => !allowedSet.size || allowedSet.has(normalizeSearchFilterToken(entry.id)))
        .map((entry) => ({
          id: entry.id,
          label: entry.label,
          match: (_item, rawText, compactText) => entry.tokens.some((token) => searchImageHasToken(rawText, compactText, token))
        }))
    };
  };

  if (categoryKey === "artificial-flowers") {
    return [
      {
        id: "type",
        label: "Tipe",
        options: [
          { id: "potted", label: "Pot", match: (item, rawText, compactText, fallbackIndex) => detectSearchArtificialType(item, rawText, compactText, fallbackIndex) === "potted" },
          { id: "bloom-box", label: "Bloom Box", match: (item, rawText, compactText, fallbackIndex) => detectSearchArtificialType(item, rawText, compactText, fallbackIndex) === "bloom-box" }
        ]
      },
      colorGroup
    ];
  }
  if (categoryKey === "bouquets") {
    return [
      colorGroup,
      sizeGroup,
      flowerConditionGroup,
      flowerTypeGroup(["mawar", "tulip", "anggrek", "lily", "babys-breath", "aster", "sunflower", "carnation", "hydrangea", "peony", "gerbera", "chrysanthemum", "poms", "snap-dragons", "gompie", "aranthera-azimah", "lysianthus"])
    ];
  }
  if (categoryKey === "standing-flowers") {
    return [
      colorGroup,
      flowerConditionGroup,
      flowerTypeGroup(["mawar", "lily", "anggrek", "sunflower", "aster", "chrysanthemum", "poms", "snap-dragons", "gompie", "aranthera-azimah", "lysianthus"])
    ];
  }
  if (categoryKey === "funerals") {
    return [
      {
        id: "type",
        label: "Tipe",
        options: [
          { id: "cross", label: "Salib", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["cross", "salib"]) },
          { id: "frame", label: "Frame", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["frame", "framed"]) },
          { id: "standing-flowers", label: "Standing Flowers", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["standing", "sta-"]) },
          { id: "papan-bunga", label: "Papan Bunga", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["papan", "pap-"]) }
        ]
      },
      colorGroup,
      flowerTypeGroup(["mawar", "lily", "anggrek", "aster", "chrysanthemum", "poms", "snap-dragons", "gompie", "aranthera-azimah", "lysianthus"])
    ];
  }
  if (categoryKey === "papan-bunga") {
    return [
      {
        id: "occasion",
        label: "Occasion",
        options: [
          { id: "pernikahan", label: "Pernikahan", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["nikah", "wedding", "pernikahan"]) },
          { id: "wisuda", label: "Wisuda", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["wisuda", "graduation", "grad"]) },
          { id: "belasungkawa", label: "Belasungkawa", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["duka", "funeral", "belasungkawa"]) },
          { id: "sukses", label: "Sukses", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["sukses", "success", "selamat", "opening", "grand opening"]) }
        ]
      },
      {
        id: "size",
        label: "Boards",
        options: [
          { id: "1-board", label: "1 Board", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["1papan", "1 papan", "papan1"]) },
          { id: "2-boards", label: "2 Boards", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["2papan", "2 papan", "papan2"]) },
          { id: "3-boards", label: "3 Boards", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["3papan", "3 papan", "papan3"]) }
        ]
      },
      {
        id: "material",
        label: "Style",
        options: [
          { id: "rustic", label: "Rustic", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["wood", "wooden", "round"]) },
          { id: "standard", label: "Standard", match: (_item, rawText, compactText) => !searchSourceHasAny(rawText, compactText, ["wood", "wooden", "round"]) }
        ]
      }
    ];
  }
  if (categoryKey === "parcels") {
    return [
      {
        id: "occasion",
        label: "Occasion",
        options: [
          { id: "idul-fitri", label: "Idul Fitri", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["ramadan", "ramadhan", "eid", "lebaran", "idul fitri"]) },
          { id: "imlek", label: "Imlek", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["chinese new year", "cny", "imlek", "gong xi"]) },
          { id: "natal", label: "Natal", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["christmas", "xmas", "natal"]) },
          { id: "hadiah", label: "Hadiah", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["gift", "hadiah", "parcel"]) && !searchSourceHasAny(rawText, compactText, ["chinese new year", "cny", "imlek", "gong xi", "christmas", "xmas", "natal", "ramadan", "ramadhan", "eid", "lebaran", "idul fitri"]) }
        ]
      },
      {
        id: "color",
        label: "Color",
        options: colorGroup.options.filter((option) => ["red", "gold", "green"].includes(option.id))
      }
    ];
  }
  if (categoryKey === "by-request") return [];
  return [colorGroup];
};
const getSearchCategoryFilterGroups = (categoryMeta = null) => {
  const legacyGroups = buildSearchLegacyCategoryFilters(categoryMeta);
  const cmsFilterGroups = Array.isArray(categoryMeta?.filterGroups) ? categoryMeta.filterGroups : [];
  if (!cmsFilterGroups.length) return legacyGroups;
  return cmsFilterGroups.map((group) => ({
    id: String(group.id || "").trim() || "filter",
    label: String(group.label || group.id || "Filters").trim() || "Filters",
    options: (Array.isArray(group.options) ? group.options : []).filter((option) => {
      return !(normalizeSearchFilterToken(group.id || "") === "color" && normalizeSearchFilterToken(option?.id || option?.label || "") === "mixed");
    }).map((option) => {
      const legacyMatch = findSearchLegacyMatcher(legacyGroups, group.id, option?.id || option?.label || "");
      return {
        id: String(option?.id || option?.label || "").trim() || "option",
        label: String(option?.label || option?.id || "Option").trim() || "Option",
        match: legacyMatch
      };
    })
  })).filter((group) => group.options.length);
};
const inferSearchKeywordsFromGalleryFilters = (item, categoryMeta, fallbackIndex = -1) => {
  const imagePath = String(item?.image || "").trim();
  const rawText = normalizeSearchText(decodeSearchFileStem(imagePath))
    .replace(/[_(),.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compactText = normalizeSearchCompactText(rawText);
  const inferred = new Set();
  const groups = getSearchCategoryFilterGroups(categoryMeta);
  groups.forEach((group) => {
    group.options.forEach((option) => {
      const explicitMatch = getSearchStructuredFilterTokens(item, group.id);
      const normalizedOption = normalizeSearchFilterToken(option.id);
      const matches = explicitMatch !== null
        ? explicitMatch.includes(normalizedOption)
        : (typeof option.match === "function" ? option.match(item, rawText, compactText, fallbackIndex) : false);
      if (!matches) return;
      buildSearchFilterOptionTerms(group.id, option).forEach((term) => inferred.add(term));
    });
  });
  return Array.from(inferred).filter(Boolean);
};
const applyActiveSearchFilters = (items = []) => {
  if (!hasAnyActiveSearchFilters()) return Array.from(items);
  return Array.from(items).filter((item) => {
    const selectedCategories = activeSearchFilters.category;
    if (selectedCategories.size > 0 && !selectedCategories.has(normalizeSearchText(item?.category || ""))) return false;
    const selectedColors = activeSearchFilters.color;
    if (selectedColors.size > 0 && !Array.from(selectedColors).some((id) => itemMatchesColorFilter(item, id))) return false;
    const selectedTypes = activeSearchFilters.type;
    if (selectedTypes.size > 0 && !Array.from(selectedTypes).some((id) => itemMatchesTypeFilter(item, id))) return false;
    return true;
  });
};
const hashString = (value) => {
  let hash = 2166136261;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
const createSeededRandom = (seedValue) => {
  let seed = hashString(seedValue);
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
};
const shuffleBySeed = (items, seedValue) => {
  const next = items.slice();
  const rand = createSeededRandom(seedValue);
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};
const getDailySeedKey = (suffix = "default") => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");
  return `${year}${month}${date}-${suffix}`;
};
const selectDailySubset = (items, count, seedSuffix) => {
  if (!Array.isArray(items) || !items.length) return [];
  return shuffleBySeed(items, getDailySeedKey(seedSuffix)).slice(0, Math.max(0, count));
};
const selectSessionSubset = (items, count, seedSuffix) => {
  if (!Array.isArray(items) || !items.length) return [];
  return shuffleBySeed(items, `${SEARCH_RECOMMENDED_SESSION_SEED}-${seedSuffix}`).slice(0, Math.max(0, count));
};
const escapeAttr = (value) => escapeHTML(String(value ?? ""));
const getSearchItemKey = (item) => `${item.category || ""}|${item.image || ""}`;
const resolveSearchImage = (value) => normalizeSearchImagePath(value);
const normalizeSearchAdditionalImageUsage = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "hover" || raw === "carousel" || raw === "both") return raw;
  return "both";
};
const normalizeSearchMediaPosition = (value) => {
  const raw = String(value || "").trim();
  return raw || "center center";
};
const normalizeSearchAdditionalImages = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === "string") {
      const image = resolveSearchImage(entry);
      if (!image) return null;
      return {
        image,
        usage: "both",
        hoverPosition: "center center",
        scrollPosition: "center center"
      };
    }
    if (!entry || typeof entry !== "object") return null;
    const image = resolveSearchImage(entry.image || entry.src || "");
    if (!image) return null;
    return {
      image,
      usage: normalizeSearchAdditionalImageUsage(entry.usage),
      hoverPosition: normalizeSearchMediaPosition(entry.hoverPosition),
      scrollPosition: normalizeSearchMediaPosition(entry.scrollPosition)
    };
  }).filter(Boolean);
};
const getSearchHoverMedia = (item) => {
  const extras = Array.isArray(item?.additionalImages) ? item.additionalImages : [];
  return extras.find((entry) => entry?.image && entry.usage !== "carousel") || null;
};
const buildSearchCardSlides = (item) => {
  const primaryImage = resolveSearchImage(item?.image || "");
  const slides = [];
  if (primaryImage) {
    slides.push({
      image: primaryImage,
      hoverPosition: "center center",
      scrollPosition: "center center"
    });
  }
  const extras = Array.isArray(item?.additionalImages) ? item.additionalImages : [];
  extras.forEach((entry) => {
    const image = resolveSearchImage(entry?.image || entry?.src || "");
    if (!image) return;
    if (slides.some((slide) => slide.image === image)) return;
    if (entry?.usage === "carousel") {
      slides.push({
        image,
        hoverPosition: entry?.hoverPosition || "center center",
        scrollPosition: entry?.scrollPosition || "center center"
      });
      return;
    }
    slides.splice(Math.min(1, slides.length), 0, {
      image,
      hoverPosition: entry?.hoverPosition || "center center",
      scrollPosition: entry?.scrollPosition || "center center"
    });
  });
  let hoverIndex = -1;
  if (slides.length > 1) hoverIndex = 1;
  return { slides: slides.length ? slides : [{ image: "", hoverPosition: "center center", scrollPosition: "center center" }], hoverIndex };
};
const buildSearchCardMarkup = (item, index = 0) => {
  const resolvedImage = resolveSearchImage(item.image);
  const { slides, hoverIndex } = buildSearchCardSlides(item);
  const favoriteButtonMarkup = window.MarvellFavorites?.createCardButtonMarkup?.({
    id: item.id || "",
    title: item.title || "",
    image: resolvedImage || "",
    href: resolveSearchHref(item),
    price: item.price || "",
    category: item.category || "",
    sku: item.sku || "",
    purchaseMode: item.purchaseMode || item.purchase_mode || "",
    source: "search"
  }) || "";
  const detailHref = resolveSearchHref(item);
  const hasSingleFullPreview = hoverIndex < 0 && slides.length === 1 && !!slides[0]?.image;
  const previewSlide = hoverIndex > 0 && slides[hoverIndex]?.image
    ? slides[hoverIndex]
    : (hasSingleFullPreview ? slides[0] : null);
  const slidesMarkup = slides.map((entry, slideIndex) => {
    if (!entry.image) {
      return `<div class="search-product-slide" data-search-card-slide="${slideIndex}"><a class="search-product-detail-link" href="${escapeAttr(detailHref)}" aria-label="${escapeAttr(item.title || "Produk")}"><div class="category-cover-placeholder" aria-hidden="true"></div></a></div>`;
    }
    return `
      <div class="search-product-slide" data-search-card-slide="${slideIndex}">
        <a class="search-product-detail-link" href="${escapeAttr(detailHref)}" aria-label="${escapeAttr(item.title || "Produk")}">
          <img class="search-product-media" ${slideIndex === 0 ? `src="${escapeAttr(entry.image)}"` : `data-src="${escapeAttr(entry.image)}"`} alt="${slideIndex === 0 ? escapeAttr(item.title || "Produk") : ""}" ${slideIndex === 0 ? "" : 'aria-hidden="true"'} loading="lazy" decoding="async" style="object-position:${escapeAttr(entry.scrollPosition || "center center")};">
        </a>
      </div>
    `;
  }).join("");
  const hoverPreviewMarkup = previewSlide?.image ? `
    <div class="search-product-hover-preview" data-search-card-hover-preview aria-hidden="true">
      <img class="search-product-hover-preview-image${hasSingleFullPreview ? " is-full-preview" : ""}" data-src="${escapeAttr(previewSlide.image)}" alt="" loading="lazy" decoding="async" style="object-position:${escapeAttr(previewSlide.hoverPosition || "center center")};">
    </div>
  ` : "";
  return `
    <article class="search-product-card search-fade-item" style="--search-fade-delay:${Math.min(index, 11) * 46}ms">
      <div class="search-product-media-wrap">
        <div class="search-product-media-shell">
          <div class="search-product-carousel ${slides.length <= 1 ? "is-single" : ""}" data-search-card-carousel data-search-card-hover-index="${hoverIndex}" ${hasSingleFullPreview ? 'data-search-card-single-full-preview="1"' : ""}>
            <div class="search-product-viewport" data-search-card-viewport>
              <div class="search-product-track">
                ${slidesMarkup}
              </div>
            </div>
            ${hoverPreviewMarkup}
            <button class="search-product-nav-btn search-product-nav-btn--prev" type="button" aria-label="Previous image" data-search-card-prev>&#8249;</button>
            <button class="search-product-nav-btn search-product-nav-btn--next" type="button" aria-label="Next image" data-search-card-next>&#8250;</button>
          </div>
          ${favoriteButtonMarkup}
        </div>
        <div class="search-product-caption">
          <div class="search-product-title">${escapeHTML(item.title || "Produk")}</div>
          ${item.price ? `<div class="search-product-price">${escapeHTML(item.price)}</div>` : ""}
        </div>
      </div>
    </article>
  `;
};
const searchProgressiveRenderObservers = new WeakMap();
const getSearchGridColumnCount = (target) => {
  if (!(target instanceof HTMLElement)) return 2;
  const columns = window.getComputedStyle(target).gridTemplateColumns.split(" ").filter(Boolean);
  return Math.max(1, columns.length || (window.innerWidth <= 768 ? 2 : 4));
};
const renderSearchCards = (target, items, emptyMessage = "Belum ada hasil yang cocok. Coba kata kunci lain.", options = {}) => {
  if (!(target instanceof HTMLElement)) return;
  const existingObserver = searchProgressiveRenderObservers.get(target);
  if (existingObserver) existingObserver.disconnect();
  searchProgressiveRenderObservers.delete(target);
  if (!items.length) {
    target.innerHTML = `<p class="search-empty search-fade-item">${escapeHTML(emptyMessage)}</p>`;
    return;
  }
  const columnCount = getSearchGridColumnCount(target);
  const renderAllImmediately = options?.renderAllImmediately === true;
  const batchSize = renderAllImmediately ? items.length : Math.max(columnCount * 2, 2);
  let renderedCount = Math.min(items.length, batchSize);
  const renderSlice = (from, to) => items.slice(from, to).map((item, index) => buildSearchCardMarkup(item, from + index)).join("");
  target.innerHTML = `${renderSlice(0, renderedCount)}${renderedCount < items.length ? '<div class="search-progressive-sentinel" aria-hidden="true"></div>' : ""}`;
  initializeSearchCardCarousels(target);
  if (renderedCount >= items.length) return;
  const appendNextBatch = () => {
    const sentinel = target.querySelector(".search-progressive-sentinel");
    if (!(sentinel instanceof HTMLElement)) return;
    const nextCount = Math.min(items.length, renderedCount + batchSize);
    sentinel.insertAdjacentHTML("beforebegin", renderSlice(renderedCount, nextCount));
    const newCards = Array.from(target.querySelectorAll(".search-product-card")).slice(renderedCount, nextCount);
    renderedCount = nextCount;
    initializeSearchCardCarousels(target);
    window.requestAnimationFrame(() => {
      newCards.forEach((card) => {
        if (card instanceof HTMLElement) card.classList.add("is-visible");
      });
    });
    if (renderedCount >= items.length) {
      const observer = searchProgressiveRenderObservers.get(target);
      if (observer) observer.disconnect();
      searchProgressiveRenderObservers.delete(target);
      sentinel.remove();
    }
  };
  if (typeof IntersectionObserver === "undefined") {
    while (renderedCount < items.length) appendNextBatch();
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) appendNextBatch();
  }, {
    root: searchDropdownBody instanceof HTMLElement ? searchDropdownBody : null,
    rootMargin: "320px 0px 460px 0px",
    threshold: 0
  });
  const sentinel = target.querySelector(".search-progressive-sentinel");
  if (sentinel instanceof HTMLElement) {
    observer.observe(sentinel);
    searchProgressiveRenderObservers.set(target, observer);
  }
};
const initializeSearchCardCarousels = (scope = document) => {
  const carousels = Array.from(scope.querySelectorAll("[data-search-card-carousel]"));
  carousels.forEach((carousel) => {
    if (!(carousel instanceof HTMLElement)) return;
    const viewport = carousel.querySelector("[data-search-card-viewport]");
    const track = viewport instanceof HTMLElement ? viewport.querySelector(".search-product-track") : null;
    const hoverPreview = carousel.querySelector("[data-search-card-hover-preview]");
    const hoverPreviewImage = hoverPreview instanceof HTMLElement ? hoverPreview.querySelector(".search-product-hover-preview-image") : null;
    const prev = carousel.querySelector("[data-search-card-prev]");
    const next = carousel.querySelector("[data-search-card-next]");
    if (!(viewport instanceof HTMLElement) || !(track instanceof HTMLElement)) return;

    const slides = Array.from(carousel.querySelectorAll("[data-search-card-slide]"));
    const slideCount = Math.max(1, slides.length);
    const hoverIndex = Number.parseInt(carousel.dataset.searchCardHoverIndex || "-1", 10);
    const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const canAutoHover = Number.isFinite(hoverIndex) && hoverIndex > 0 && hoverIndex < slideCount && hoverPreview instanceof HTMLElement;
    const canSingleFullPreview = carousel.dataset.searchCardSingleFullPreview === "1" && slideCount === 1 && hoverPreview instanceof HTMLElement;
    const canHoverPreview = canAutoHover || canSingleFullPreview;
    let currentIndex = 0;
    let hoverPreviewActive = false;
    let pendingNavigationTimer = 0;
    const card = carousel.closest(".search-product-card");
    const getActiveIndex = () => (hoverPreviewActive && canAutoHover ? hoverIndex : currentIndex);
    const ensureImageLoaded = (image) => {
      if (!(image instanceof HTMLImageElement)) return;
      const src = String(image.dataset.src || "").trim();
      if (!src) return;
      image.src = src;
      delete image.dataset.src;
    };
    const ensureSlideImageLoaded = (index) => {
      const slide = slides[index];
      if (!(slide instanceof HTMLElement)) return;
      ensureImageLoaded(slide.querySelector(".search-product-media"));
    };
    const getSlideMeta = (index) => {
      const slide = slides[index];
      if (!(slide instanceof HTMLElement)) return null;
      const image = slide.querySelector(".search-product-media");
      if (!(image instanceof HTMLImageElement)) return null;
      return {
        src: image.getAttribute("src") || image.dataset.src || "",
        position: image.style.objectPosition || "center center"
      };
    };
    const setPreviewImageFromIndex = (index) => {
      if (!(hoverPreviewImage instanceof HTMLImageElement)) return;
      const slideMeta = getSlideMeta(index);
      if (!slideMeta?.src) return;
      if (hoverPreviewImage.getAttribute("src") !== slideMeta.src) hoverPreviewImage.setAttribute("src", slideMeta.src);
      delete hoverPreviewImage.dataset.src;
      hoverPreviewImage.style.objectPosition = slideMeta.position;
    };
    const setPreviewVisible = (isVisible, { instant = false } = {}) => {
      if (!(hoverPreview instanceof HTMLElement)) return;
      if (instant) hoverPreview.style.transition = "none";
      carousel.classList.toggle("is-hover-preview-active", isVisible);
      if (instant) {
        void hoverPreview.offsetWidth;
        hoverPreview.style.transition = "";
      }
    };
    const syncTrackPosition = (behavior = "smooth") => {
      const viewportWidth = viewport.clientWidth || viewport.getBoundingClientRect().width || 0;
      const offset = Math.max(0, viewportWidth * currentIndex);
      track.style.transition = behavior === "auto" ? "none" : "transform 0.42s cubic-bezier(0.12, 0.85, 0.22, 1)";
      track.style.transform = `translate3d(-${offset}px, 0, 0)`;
    };
    const clearHoverPreview = ({ instant = false } = {}) => {
      hoverPreviewActive = false;
      setPreviewVisible(false, { instant });
    };
    const updateUi = () => {
      const activeIndex = getActiveIndex();
      if (card instanceof HTMLElement) card.classList.toggle("is-carousel-engaged", activeIndex > 0);
      if (prev instanceof HTMLButtonElement) prev.disabled = activeIndex <= 0;
      if (next instanceof HTMLButtonElement) next.disabled = activeIndex >= slideCount - 1;
    };
    const goToIndex = (index, behavior = "smooth") => {
      currentIndex = Math.max(0, Math.min(slideCount - 1, index));
      ensureSlideImageLoaded(currentIndex);
      syncTrackPosition(behavior);
      updateUi();
    };
    const activateHoverSlide = () => {
      if (!supportsHover || !canHoverPreview) return;
      if (hoverPreviewActive || currentIndex !== 0) return;
      if (canAutoHover) ensureSlideImageLoaded(hoverIndex);
      else if (hoverPreviewImage instanceof HTMLImageElement) ensureImageLoaded(hoverPreviewImage);
      setPreviewImageFromIndex(canAutoHover ? hoverIndex : 0);
      hoverPreviewActive = true;
      setPreviewVisible(true);
      updateUi();
    };
    const fadeBackToFirstSlide = () => {
      if (pendingNavigationTimer) {
        window.clearTimeout(pendingNavigationTimer);
        pendingNavigationTimer = 0;
      }
      if (hoverPreviewActive && canSingleFullPreview && !canAutoHover) {
        clearHoverPreview();
        updateUi();
        return;
      }
      const visibleIndex = getActiveIndex();
      if (visibleIndex <= 0) {
        clearHoverPreview();
        currentIndex = 0;
        syncTrackPosition("auto");
        updateUi();
        return;
      }
      setPreviewImageFromIndex(visibleIndex);
      setPreviewVisible(true, { instant: true });
      hoverPreviewActive = false;
      currentIndex = 0;
      syncTrackPosition("auto");
      updateUi();
      window.setTimeout(() => {
        setPreviewVisible(false);
        updateUi();
      }, 18);
    };
    const resetHoverSlide = () => {
      if (!supportsHover) return;
      fadeBackToFirstSlide();
    };
    const navigateFromHoverPreview = (delta) => {
      if (!hoverPreviewActive || !canAutoHover) return false;
      const previewIndex = hoverIndex;
      const targetIndex = Math.max(0, Math.min(slideCount - 1, previewIndex + delta));
      if (targetIndex === previewIndex) return true;
      if (pendingNavigationTimer) {
        window.clearTimeout(pendingNavigationTimer);
        pendingNavigationTimer = 0;
      }
      clearHoverPreview({ instant: true });
      currentIndex = previewIndex;
      syncTrackPosition("auto");
      updateUi();
      pendingNavigationTimer = window.setTimeout(() => {
        pendingNavigationTimer = 0;
        currentIndex = targetIndex;
        syncTrackPosition("smooth");
        updateUi();
      }, 18);
      return true;
    };

    if (prev instanceof HTMLButtonElement && prev.dataset.bound !== "1") {
      prev.dataset.bound = "1";
      prev.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (navigateFromHoverPreview(-1)) return;
        goToIndex(currentIndex - 1);
      });
    }
    if (next instanceof HTMLButtonElement && next.dataset.bound !== "1") {
      next.dataset.bound = "1";
      next.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (navigateFromHoverPreview(1)) return;
        goToIndex(currentIndex + 1);
      });
    }

    viewport.addEventListener("pointerdown", () => {
      if (hoverPreviewActive && canAutoHover) {
        clearHoverPreview({ instant: true });
        currentIndex = hoverIndex;
        syncTrackPosition("auto");
        updateUi();
      }
    }, { passive: true });
    viewport.addEventListener("touchstart", () => {
      if (hoverPreviewActive && canAutoHover) {
        clearHoverPreview({ instant: true });
        currentIndex = hoverIndex;
        syncTrackPosition("auto");
        updateUi();
      }
    }, { passive: true });

    if (card instanceof HTMLElement && card.dataset.searchCarouselHoverBound !== "1") {
      card.dataset.searchCarouselHoverBound = "1";
      if (supportsHover) {
        card.addEventListener("mouseenter", activateHoverSlide);
        card.addEventListener("mouseleave", resetHoverSlide);
      }
    }

    if (card instanceof HTMLElement && card.dataset.searchCardLinkBound !== "1") {
      card.dataset.searchCardLinkBound = "1";
      card.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest("a, button, [data-favorite-toggle]")) return;
        const link = card.querySelector(".search-product-detail-link");
        if (!(link instanceof HTMLAnchorElement)) return;
        window.location.href = link.href;
      });
    }

    if (carousel.dataset.searchResizeBound !== "1") {
      carousel.dataset.searchResizeBound = "1";
      window.addEventListener("resize", () => syncTrackPosition("auto"));
    }

    syncTrackPosition("auto");
    updateUi();
  });
};
const gatherKeywordCandidates = (items = []) => {
  const scopedItems = Array.isArray(items) && items.length ? items : getVisibleSearchProductPool();
  const categorySet = new Set();
  scopedItems.forEach((item) => {
    const cleanCategory = toTitleCaseWords(item?.category || "");
    if (!cleanCategory || cleanCategory.length > 28) return;
    if (normalizeSearchText(cleanCategory) === "featured") return;
    if (normalizeSearchText(cleanCategory) === "by request") return;
    categorySet.add(cleanCategory);
  });
  return Array.from(categorySet).sort((a, b) => a.localeCompare(b));
};
const renderSearchKeywords = (queryText, sourceItems = []) => {
  if (!(searchKeywordList instanceof HTMLElement)) return;
  const normalized = normalizeSearchText(queryText);
  const candidates = gatherKeywordCandidates(sourceItems);
  const filtered = normalized
    ? candidates.filter((candidate) => normalizeSearchText(candidate).includes(normalized) || normalized.includes(normalizeSearchText(candidate)))
    : candidates;
  const fallbackCandidates = filtered.length >= 4 ? filtered : Array.from(new Set([...filtered, ...candidates]));
  const dailyKeywords = selectDailySubset(fallbackCandidates, 4, `keywords-${normalized || "all"}`);
  searchKeywordList.innerHTML = dailyKeywords.map((keyword, index) => `
    <button class="search-chip search-fade-item" type="button" data-search-query="${escapeAttr(keyword)}" style="--search-fade-delay:${Math.min(index, 9) * 40}ms">${escapeHTML(keyword)}</button>
  `).join("");
};
const renderSearchStatus = (queryText, hasResults) => {
  if (!(searchStatus instanceof HTMLElement)) return;
  const query = String(queryText || "").trim();
  if (!query || hasResults) {
    searchStatus.innerHTML = "";
    return;
  }
  searchStatus.innerHTML = `
    <div class="search-fade-item">
      <p class="search-status-copy"><strong>No results were found for "${escapeHTML(query)}"</strong></p>
      <p class="search-status-note">Try improving your results by double checking your spelling or trying a more general keyword.</p>
    </div>
  `;
};
const SEARCH_FAQ_ENTRIES = {
  en: [
    { question: "How do I place an order?", answer: "All orders begin with a consultation through WhatsApp to discuss design preferences, needs, and timing." },
    { question: "Why do some products not have fixed prices?", answer: "Most arrangements are made to order and priced after flowers, size, and complexity are confirmed." },
    { question: "Do you provide a fresh flower price list?", answer: "Yes. We can share a fresh flower price list, although pricing and availability can change." },
    { question: "Are all products always available?", answer: "Availability depends on stock and seasonality, so we recommend confirming before ordering." },
    { question: "Can I request a custom design?", answer: "Yes. We accept custom requests tailored to your needs, theme, and occasion." },
    { question: "Do you offer delivery?", answer: "We provide delivery across Batam, with fees adjusted based on destination." },
    { question: "Is same-day ordering possible?", answer: "Same-day ordering may be possible depending on availability and complexity." },
    { question: "What payment methods are available?", answer: "We accept bank transfer, cash, and other available payment methods." },
    { question: "When is my order considered confirmed?", answer: "Orders are confirmed after design details are agreed upon and payment has been received." },
    { question: "Can an order be changed or cancelled?", answer: "Changes or cancellations may be possible before production begins." }
  ],
  id: [
    { question: "Bagaimana cara melakukan pemesanan?", answer: "Seluruh pesanan dilakukan melalui konsultasi WhatsApp untuk mendiskusikan kebutuhan, desain, dan waktu." },
    { question: "Mengapa sebagian produk tidak memiliki harga tetap?", answer: "Sebagian besar rangkaian dibuat khusus, sehingga harga akhir mengikuti pilihan bunga, ukuran, dan kompleksitas desain." },
    { question: "Apakah tersedia daftar harga bunga segar?", answer: "Ya, kami menyediakan daftar harga bunga segar, namun harga dan ketersediaan dapat berubah." },
    { question: "Apakah semua produk selalu tersedia?", answer: "Ketersediaan bunga dan rangkaian bergantung pada stok dan musim, jadi sebaiknya dikonfirmasi terlebih dahulu." },
    { question: "Apakah saya dapat memesan desain khusus?", answer: "Tentu. Kami menerima pesanan khusus sesuai kebutuhan, tema, dan momen Anda." },
    { question: "Apakah tersedia layanan pengiriman?", answer: "Kami menyediakan layanan pengiriman untuk area Batam dengan biaya menyesuaikan lokasi tujuan." },
    { question: "Apakah memungkinkan untuk pemesanan di hari yang sama?", answer: "Pemesanan di hari yang sama mungkin dilakukan tergantung ketersediaan dan tingkat kompleksitasnya." },
    { question: "Metode pembayaran apa yang tersedia?", answer: "Kami menerima pembayaran melalui transfer bank, tunai, serta metode lain yang tersedia." },
    { question: "Kapan pesanan saya dianggap selesai dikonfirmasi?", answer: "Pesanan diproses setelah detail desain disepakati dan pembayaran diterima." },
    { question: "Apakah pesanan dapat diubah atau dibatalkan?", answer: "Perubahan atau pembatalan bisa dilakukan selama pesanan belum masuk tahap produksi." }
  ]
};
const SEARCH_FAQ_TOPIC_KEYWORDS = [
  ["order", "place order", "ordering", "book", "booking", "pesan", "pemesanan", "order bunga", "consultation", "konsultasi", "whatsapp"],
  ["price", "pricing", "fixed price", "harga", "price quote", "quotation", "cost", "biaya", "estimate", "estimasi"],
  ["price list", "fresh flower price", "daftar harga", "bunga segar", "flower price", "catalog price", "list harga"],
  ["available", "availability", "stock", "in stock", "tersedia", "ketersediaan", "seasonal", "musim", "ready"],
  ["custom", "custom design", "request", "special request", "desain khusus", "sesuai permintaan", "personalized"],
  ["delivery", "deliver", "shipping", "courier", "send", "pengiriman", "antar", "kirim", "ongkir"],
  ["same day", "urgent", "today", "hari yang sama", "mendadak", "express", "rush order"],
  ["payment", "pay", "transfer", "cash", "metode pembayaran", "bayar", "pembayaran", "qris"],
  ["confirmed", "confirmation", "confirm", "when confirmed", "kapan konfirmasi", "dikonfirmasi", "confirmed order"],
  ["change order", "cancel", "cancellation", "ubah pesanan", "batalkan", "pembatalan", "reschedule"]
];
const buildSearchFaqContext = (entry, index, lang) => {
  const siblingLang = lang === "id" ? "en" : "id";
  const siblingEntry = SEARCH_FAQ_ENTRIES[siblingLang]?.[index];
  const topicKeywords = SEARCH_FAQ_TOPIC_KEYWORDS[index] || [];
  return normalizeSearchText([
    entry?.question || "",
    entry?.answer || "",
    siblingEntry?.question || "",
    siblingEntry?.answer || "",
    topicKeywords.join(" ")
  ].join(" "));
};
const getSearchFaqMatches = (queryText = "") => {
  const normalized = normalizeSearchText(queryText);
  if (!normalized) return [];
  const compact = normalizeSearchCompactText(normalized);
  const queryVariantGroups = getQueryVariantGroups(normalized);
  const lang = String(document.documentElement.lang || "en").toLowerCase().startsWith("id") ? "id" : "en";
  const source = SEARCH_FAQ_ENTRIES[lang] || SEARCH_FAQ_ENTRIES.en;
  return source
    .map((entry, index) => {
      const haystack = buildSearchFaqContext(entry, index, lang);
      const compactHaystack = normalizeSearchCompactText(haystack);
      let score = 0;
      if (haystack.includes(normalized)) score += 4;
      if (compactHaystack.includes(compact)) score += 3;
      queryVariantGroups.forEach((group) => {
        let groupScore = 0;
        group.variants.forEach((term) => {
          if (!term) return;
          if (tokenMatchesContext(haystack, term)) {
            groupScore = Math.max(groupScore, group.kind === "phrase" ? 4 : 2);
            return;
          }
          if (haystack.includes(term)) {
            groupScore = Math.max(groupScore, group.kind === "phrase" ? 3 : 1);
            return;
          }
          const compactTerm = normalizeSearchCompactText(term);
          if (compactTerm && compactHaystack.includes(compactTerm)) {
            groupScore = Math.max(groupScore, 1);
          }
        });
        score += groupScore;
      });
      tokenizeSearchQuery(normalized).forEach((token) => {
        if (tokenMatchesContext(haystack, token)) score += 1;
      });
      return { ...entry, score, index };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 4);
};
const renderSearchFaqMatches = (queryText = "", matches = []) => {
  if (!(searchFaqGroup instanceof HTMLElement)) return;
  const faqLang = String(document.documentElement.lang || "en").toLowerCase().startsWith("id") ? "id" : "en";
  if (!String(queryText || "").trim()) {
    searchFaqGroup.classList.remove("is-query-results", "is-hidden");
    searchFaqGroup.innerHTML = `<a class="search-faq-link search-fade-item" href="faq.html?lang=${faqLang}" style="--search-fade-delay:90ms">Pertanyaan Umum</a>`;
    return;
  }
  if (!matches.length) {
    searchFaqGroup.classList.add("is-hidden");
    searchFaqGroup.classList.remove("is-query-results");
    searchFaqGroup.innerHTML = "";
    return;
  }
  searchFaqGroup.classList.remove("is-hidden");
  searchFaqGroup.classList.add("is-query-results");
  searchFaqGroup.innerHTML = matches.map((entry, index) => `
    <a class="search-faq-link search-fade-item" href="faq.html?lang=${faqLang}&open=${entry.index + 1}#faq-item-${entry.index + 1}" title="${escapeAttr(entry.answer)}" style="--search-fade-delay:${Math.min(index, 5) * 40}ms">${escapeHTML(entry.question)}</a>
  `).join("");
};
const setSearchQueryView = (view = "products", hasFaqResults = false) => {
  activeSearchQueryView = view === "faq" && hasFaqResults ? "faq" : "products";
  if (searchDropdownBody instanceof HTMLElement) {
    searchDropdownBody.classList.toggle("is-query-view-faq", activeSearchQueryView === "faq");
    searchDropdownBody.classList.toggle("is-query-view-products", activeSearchQueryView === "products");
  }
  if (searchQueryTabProducts instanceof HTMLButtonElement) {
    searchQueryTabProducts.classList.toggle("is-active", activeSearchQueryView === "products");
  }
  if (searchQueryTabFaq instanceof HTMLButtonElement) {
    searchQueryTabFaq.classList.toggle("is-active", activeSearchQueryView === "faq");
    searchQueryTabFaq.disabled = !hasFaqResults;
    searchQueryTabFaq.hidden = !hasFaqResults;
  }
  if (searchQueryFilterButton instanceof HTMLButtonElement) {
    searchQueryFilterButton.hidden = activeSearchQueryView === "faq" || searchQueryFilterButton.hidden;
  }
};
let searchFadeObserver = null;
const clearSearchFadeObserver = () => {
  if (!searchFadeObserver) return;
  searchFadeObserver.disconnect();
  searchFadeObserver = null;
};
const triggerSearchFadeIn = () => {
  if (!(searchDropdown instanceof HTMLElement)) return;
  clearSearchFadeObserver();
  const animatedItems = Array.from(searchDropdown.querySelectorAll(".search-fade-item"));
  const nonCardItems = animatedItems.filter((item) => !item.classList.contains("search-product-card"));
  requestAnimationFrame(() => {
    nonCardItems.forEach((item) => item.classList.add("is-visible"));
  });
  const rootNode = searchDropdownBody instanceof HTMLElement ? searchDropdownBody : null;
  const grids = Array.from(searchDropdown.querySelectorAll(".search-product-grid"));
  const allCards = [];
  grids.forEach((grid, gridIndex) => {
    const cards = Array.from(grid.querySelectorAll(".search-product-card"));
    if (!cards.length) return;
    const templateColumns = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean);
    const columnCount = Math.max(1, templateColumns.length || 1);
    const groupSize = Math.max(1, columnCount * 2);
    cards.forEach((card, index) => {
      card.classList.remove("is-visible");
      card.style.setProperty("--search-fade-delay", "0ms");
      card.setAttribute("data-search-fade-group", `${gridIndex}-${Math.floor(index / groupSize)}`);
      allCards.push(card);
    });
  });
  if (!allCards.length) return;
  const revealGroup = (groupId) => {
    if (!groupId) return;
    allCards.forEach((card) => {
      if (card.getAttribute("data-search-fade-group") !== groupId) return;
      card.classList.add("is-visible");
      if (searchFadeObserver) searchFadeObserver.unobserve(card);
    });
  };
  if (typeof IntersectionObserver === "undefined") {
    allCards.forEach((card) => card.classList.add("is-visible"));
    return;
  }
  searchFadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      revealGroup(entry.target.getAttribute("data-search-fade-group"));
    });
  }, {
    root: rootNode,
    threshold: 0.16,
    rootMargin: "0px 0px -8% 0px"
  });
  allCards.forEach((card) => searchFadeObserver.observe(card));
};
const getSearchCategoryIntentId = (value = "") => normalizeSearchText(value).replace(/\s+/g, " ");
const detectSearchQueryCategoryIntents = (queryText = "") => {
  const normalized = normalizeSearchText(queryText);
  if (!normalized) return new Set();
  const compact = normalizeSearchCompactText(normalized);
  const intents = new Set();
  SEARCH_QUERY_CATEGORY_INTENT_DEFS.forEach((definition) => {
    const hit = definition.tokens.some((token) => {
      const normalizedToken = normalizeSearchText(token);
      return searchImageHasToken(normalized, compact, normalizedToken);
    });
    if (hit) intents.add(definition.id);
  });
  return intents;
};
const detectSearchQueryOccasionIntents = (queryText = "") => {
  const normalized = normalizeSearchText(queryText);
  if (!normalized) return new Set();
  const compact = normalizeSearchCompactText(normalized);
  const intents = new Set();
  SEARCH_QUERY_OCCASION_INTENT_DEFS.forEach((definition) => {
    const hit = definition.tokens.some((token) => {
      const normalizedToken = normalizeSearchText(token);
      return searchImageHasToken(normalized, compact, normalizedToken);
    });
    if (hit) intents.add(definition.id);
  });
  return intents;
};
const getSearchProductNumber = (title = "") => {
  const match = normalizeSearchText(title).match(/(?:^|\s)no\.?\s*(\d{1,4})$/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};
const resolveExactNumberedQueryMatch = (queryText = "", pool = []) => {
  const normalized = normalizeSearchText(queryText).replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const exactTitleMatches = pool.filter((entry) => normalizeSearchText(entry?.title || "").replace(/\s+/g, " ").trim() === normalized);
  if (exactTitleMatches.length) return exactTitleMatches;

  const numberedMatch = normalized.match(/^(.*?)(?:\s+)?no\.?\s*(\d{1,4})$/i);
  if (!numberedMatch) return [];

  const prefix = normalizeSearchText(numberedMatch[1] || "").trim();
  const number = Number(numberedMatch[2]);
  if (!Number.isFinite(number)) return [];

  const intents = detectSearchQueryCategoryIntents(prefix);
  return pool.filter((entry) => {
    const productNumber = getSearchProductNumber(entry?.title || "");
    if (productNumber !== number) return false;
    if (!intents.size) return true;
    return intents.has(getSearchCategoryIntentId(entry?.category || ""));
  });
};
const getSearchMatches = (queryText = "", pool = null) => {
  const normalized = normalizeSearchText(queryText);
  if (!normalized) return [];
  const queryVariantGroups = getQueryVariantGroups(normalized);
  if (!queryVariantGroups.length) return [];
  const visibleSearchPool = Array.isArray(pool) ? pool.slice() : getVisibleSearchProductPool();
  const exactMatches = resolveExactNumberedQueryMatch(queryText, visibleSearchPool);
  if (exactMatches.length) return exactMatches;
  const queryCategoryIntents = detectSearchQueryCategoryIntents(queryText);
  const queryOccasionIntents = detectSearchQueryOccasionIntents(queryText);

  const scoredMatches = visibleSearchPool
    .map((entry) => {
      const title = normalizeSearchText(entry?.title || "");
      const category = normalizeSearchText(entry.category);
      const keywords = normalizeSearchText((entry.keywords || []).join(" "));
      const corpus = `${title} ${category} ${keywords}`;
      let bestScore = 0;
      let matchedTokenGroups = 0;
      let phraseScore = 0;

      queryVariantGroups.forEach((group) => {
        let groupScore = 0;
        group.variants.forEach((term) => {
          if (!term) return;
          const exactTitleScore = tokenMatchesContext(title, term) ? 7 : 0;
          const exactKeywordScore = tokenMatchesContext(keywords, term) ? 5 : 0;
          const exactCategoryScore = tokenMatchesContext(category, term) ? 4 : 0;
          const containsTitleScore = title.includes(term) ? 4 : 0;
          const containsKeywordScore = keywords.includes(term) ? 3 : 0;
          const containsCategoryScore = category.includes(term) ? 2 : 0;
          const containsCorpusScore = corpus.includes(term) ? 1 : 0;
          groupScore = Math.max(groupScore, exactTitleScore + exactKeywordScore + exactCategoryScore + containsTitleScore + containsKeywordScore + containsCategoryScore + containsCorpusScore);
        });

        if (group.kind === "phrase") {
          phraseScore = Math.max(phraseScore, groupScore);
          return;
        }

        if (groupScore > 0) {
          matchedTokenGroups += 1;
          bestScore += groupScore;
        }
      });

      const requiredTokenGroups = queryVariantGroups.filter((group) => group.kind !== "phrase").length;
      if (requiredTokenGroups > 0 && matchedTokenGroups < requiredTokenGroups) {
        return { entry, score: 0 };
      }

      return { entry, score: bestScore + phraseScore };
    })
    .filter(({ score }) => score > 0);

  const scoreBuckets = new Map();
  scoredMatches.forEach(({ entry, score }) => {
    if (!scoreBuckets.has(score)) scoreBuckets.set(score, []);
    scoreBuckets.get(score).push(entry);
  });
  const orderedScores = Array.from(scoreBuckets.keys()).sort((a, b) => b - a);
  let randomizedMatches = orderedScores.flatMap((score) => shuffleBySeed(scoreBuckets.get(score) || [], getDailySeedKey(`match-${normalized}-${score}`)));
  if (queryCategoryIntents.size) {
    randomizedMatches = randomizedMatches.filter((entry) => queryCategoryIntents.has(getSearchCategoryIntentId(entry?.category || "")));
  }
  if (queryOccasionIntents.size) {
    const focusedMatches = randomizedMatches.filter((entry) => (
      Array.from(queryOccasionIntents).every((intentId) => itemMatchesSearchOccasionIntent(entry, intentId))
    ));
    if (focusedMatches.length) randomizedMatches = focusedMatches;
  }
  return randomizedMatches;
};
const setSearchClearButtonState = (hasQuery) => {
  if (!(searchClearButton instanceof HTMLButtonElement)) return;
  searchClearButton.classList.toggle("is-visible", Boolean(hasQuery));
};
const setSearchQueryShellState = (isQueryMode, productCount, faqCount, hasResults, filterEnabled = true) => {
  if (!(searchQueryShell instanceof HTMLElement)) return;
  if (!isQueryMode || !hasResults) {
    searchQueryShell.hidden = true;
    return;
  }
  searchQueryShell.hidden = false;
  if (searchQueryCount instanceof HTMLElement) {
    const total = Math.max(0, productCount + faqCount);
    searchQueryCount.textContent = total === 1 ? "1 arrangement found" : `${total} arrangements found`;
  }
  if (searchQueryTabProducts instanceof HTMLButtonElement) {
    searchQueryTabProducts.textContent = `Products (${productCount})`;
  }
  if (searchQueryTabFaq instanceof HTMLButtonElement) {
    searchQueryTabFaq.textContent = `FAQ (${faqCount})`;
    searchQueryTabFaq.hidden = faqCount <= 0;
  }
  if (searchQueryFilterButton instanceof HTMLButtonElement) {
    searchQueryFilterButton.hidden = !filterEnabled || activeSearchQueryView === "faq";
  }
};
const setSearchFiltersModalOpen = (shouldOpen) => {
  searchFiltersModalOpen = Boolean(shouldOpen);
  if (searchQueryFilterButton instanceof HTMLButtonElement) {
    searchQueryFilterButton.setAttribute("aria-expanded", searchFiltersModalOpen ? "true" : "false");
  }
  if (searchDropdownBody instanceof HTMLElement) {
    searchDropdownBody.classList.toggle("is-filters-open", searchFiltersModalOpen);
  }
  if (searchDropdown instanceof HTMLElement) {
    searchDropdown.classList.toggle("is-filters-open", searchFiltersModalOpen);
  }
  if (searchFiltersModal instanceof HTMLElement) {
    searchFiltersModal.classList.toggle("is-open", searchFiltersModalOpen);
    searchFiltersModal.setAttribute("aria-hidden", searchFiltersModalOpen ? "false" : "true");
  }
  updateSearchFiltersApplyState();
};
const buildSearchFilterGroups = (items = []) => {
  const scopedItems = Array.from(items);
  const allCategoryOptions = Array.from(new Set(
    getVisibleSearchProductPool().map((entry) => toTitleCaseWords(entry?.category || "")).filter(Boolean)
  ))
    .sort((a, b) => a.localeCompare(b))
    .map((label) => {
      const key = normalizeSearchText(label);
      const count = scopedItems.reduce((total, item) => total + (normalizeSearchText(item?.category || "") === key ? 1 : 0), 0);
      return { id: key, label, count };
    })
    .filter((option) => option.count > 0 || activeSearchFilters.category.has(option.id));

  const colorOptions = SEARCH_COLOR_DEFS
    .map((colorDef) => {
      const count = scopedItems.reduce((total, item) => total + (itemMatchesColorFilter(item, colorDef.id) ? 1 : 0), 0);
      return { id: colorDef.id, label: colorDef.label, count };
    })
    .filter((option) => option.count > 0 || activeSearchFilters.color.has(option.id));

  const typeOptions = SEARCH_TYPE_DEFS
    .map((typeDef) => {
      const count = scopedItems.reduce((total, item) => total + (itemMatchesTypeFilter(item, typeDef.id) ? 1 : 0), 0);
      return { id: typeDef.id, label: typeDef.label, count };
    })
    .filter((option) => option.count > 0 || activeSearchFilters.type.has(option.id));

  return [
    { id: "category", label: "Kategori", options: allCategoryOptions },
    { id: "color", label: "Warna", options: colorOptions },
    { id: "type", label: "Tipe", options: typeOptions }
  ].filter((group) => group.options.length > 0);
};
const localizeSearchFilterGroupLabel = (group) => {
  const label = String(group?.label || group?.id || "Filters").trim();
  return window.MarvellLanguage?.localizeFilterLabel?.(label, group?.id) || label;
};
const localizeSearchFilterOptionLabel = (group, option) => {
  const label = String(option?.label || option?.id || "").trim();
  return window.MarvellLanguage?.localizeFilterOptionLabel?.(option?.id, label, group?.id) || label;
};
const localizeSearchLabel = (label) => {
  const text = String(label || "").trim();
  return window.MarvellLanguage?.localizeLabel?.(text) || text;
};
const renderSearchFiltersModal = (items = [], isQueryMode = false) => {
  if (!(searchFiltersWrap instanceof HTMLElement)) return;
  if (!isQueryMode) {
    searchFiltersWrap.innerHTML = "";
    setSearchFiltersModalOpen(false);
    updateSearchFiltersApplyState();
    return;
  }
  const groups = buildSearchFilterGroups(items);
  if (!groups.length) {
    searchFiltersWrap.innerHTML = "";
    setSearchFiltersModalOpen(false);
    updateSearchFiltersApplyState();
    return;
  }
  searchFiltersWrap.innerHTML = `
    <div class="search-filters-panel">
      ${groups.map((group) => {
        const groupLabel = localizeSearchFilterGroupLabel(group);
        return `
        <fieldset class="search-filter-group" data-search-filter-group="${escapeAttr(group.id)}">
          <button class="search-filter-group-toggle" type="button" aria-expanded="false" aria-controls="search-filter-group-panel-${escapeAttr(group.id)}">
            <span class="search-filter-group-title">${escapeHTML(groupLabel)}</span>
            <span class="search-filter-group-icon" aria-hidden="true">+</span>
          </button>
          <div class="search-filter-group-panel" id="search-filter-group-panel-${escapeAttr(group.id)}">
            <div class="search-filter-options${group.id === "color" ? " search-filter-options--color" : ""}">
              ${group.options.map((option) => {
                const optionLabel = localizeSearchFilterOptionLabel(group, option);
                const countedLabel = `${optionLabel} (${option.count})`;
                return `
                <label class="search-filter-option${group.id === "color" ? ` search-filter-option--color" data-color-id="${escapeAttr(option.id)}" title="${escapeAttr(countedLabel)}` : ""}">
                  <input type="checkbox" data-search-filter-group="${escapeAttr(group.id)}" value="${escapeAttr(option.id)}" ${(activeSearchFilters[group.id] || new Set()).has(option.id) ? "checked" : ""}${group.id === "color" ? ` aria-label="${escapeAttr(countedLabel)}"` : ""}>
                  <span class="search-filter-option-label"${group.id === "color" ? ` style="--filter-swatch:${escapeAttr(getSearchColorSwatchValue(option.id))};"` : ""}>${group.id === "color" ? `<span class="search-filter-color-swatch" aria-hidden="true"></span><span class="search-filter-color-meta"><span class="search-filter-color-text">${escapeHTML(countedLabel)}</span></span>` : `${escapeHTML(countedLabel)}`}</span>
                </label>
              `;
              }).join("")}
            </div>
          </div>
        </fieldset>
      `;
      }).join("")}
      <div class="search-filter-actions">
        <button type="button" class="search-filter-clear" id="search-filter-clear">${escapeHTML(localizeSearchLabel("Reset filter"))}</button>
      </div>
    </div>
  `;
  window.requestAnimationFrame(() => {
    const openPanels = Array.from(searchFiltersWrap.querySelectorAll(".search-filter-group.is-open .search-filter-group-panel"));
    openPanels.forEach((panel) => {
      if (panel instanceof HTMLElement) panel.style.maxHeight = `${panel.scrollHeight}px`;
    });
  });
  updateSearchFiltersApplyState();
};
const reopenSearchFilterGroup = (groupId = "") => {
  if (!(searchFiltersWrap instanceof HTMLElement)) return;
  const normalizedGroupId = normalizeSearchText(groupId);
  if (!normalizedGroupId) return;
  const group = Array.from(searchFiltersWrap.querySelectorAll(".search-filter-group"))
    .find((node) => node instanceof HTMLElement && normalizeSearchText(node.getAttribute("data-search-filter-group") || "") === normalizedGroupId);
  if (!(group instanceof HTMLElement)) return;
  const toggle = group.querySelector(".search-filter-group-toggle");
  const panel = group.querySelector(".search-filter-group-panel");
  const icon = group.querySelector(".search-filter-group-icon");
  group.classList.add("is-open");
  if (toggle instanceof HTMLButtonElement) toggle.setAttribute("aria-expanded", "true");
  if (icon instanceof HTMLElement) icon.textContent = "−";
  if (panel instanceof HTMLElement) panel.style.maxHeight = `${panel.scrollHeight}px`;
};
const searchFeaturedCollectionMatchesQuery = (collection, queryText = "") => {
  const normalized = normalizeSearchText(queryText);
  if (!normalized) return false;
  const haystack = normalizeSearchText([
    collection?.title || "",
    collection?.id || ""
  ].join(" "));
  const compactHaystack = normalizeSearchCompactText(haystack);
  const groups = getQueryVariantGroups(normalized);
  if (!groups.length) return false;
  return groups.every((group) => group.variants.some((term) => searchImageHasToken(haystack, compactHaystack, term)));
};
const getSearchFeaturedCollectionDisplay = (queryText = "", collections = []) => {
  const normalized = normalizeSearchText(queryText);
  const hasQuery = Boolean(normalized);
  const visibleCollections = Array.isArray(collections) ? collections.filter((collection) => Array.isArray(collection?.products) && collection.products.length) : [];
  if (!visibleCollections.length) return null;
  if (!hasQuery) {
    return {
      collection: visibleCollections[0],
      products: visibleCollections[0].products.slice()
    };
  }
  const titleMatchedCollection = visibleCollections.find((collection) => searchFeaturedCollectionMatchesQuery(collection, normalized));
  if (titleMatchedCollection) {
    return {
      collection: titleMatchedCollection,
      products: titleMatchedCollection.products.slice()
    };
  }
  for (const collection of visibleCollections) {
    const products = getSearchMatches(normalized, collection.products);
    if (products.length) {
      return { collection, products };
    }
  }
  return null;
};
const renderSearchShelves = (queryText = "") => {
  const query = normalizeSearchText(queryText);
  const hasQuery = Boolean(query);
  const searchIsVisible = searchDropdown instanceof HTMLElement && searchDropdown.classList.contains("is-open");
  const searchRequestedInUrl = /(?:\?|&)search(?:[=&]|$)/.test(window.location.search || "");
  // The search drawer is off-canvas at first paint. Rendering its image cards
  // here made browsers download megabytes of hidden product photography before
  // the hero. Build the shelves when somebody actually opens or queries it.
  if (!hasQuery && !searchIsVisible && !searchRequestedInUrl) return;
  if (!hasQuery) {
    resetActiveSearchFilters();
    setSearchFiltersModalOpen(false);
  }
  setSearchClearButtonState(hasQuery);

  const visibleSearchPool = getVisibleSearchProductPool();
  const visibleFeaturedCollections = getVisibleSearchFeaturedCollections();
  const recommendedRowSize = getSearchRecommendedRowSize();
  const featuredDisplay = getSearchFeaturedCollectionDisplay(queryText, visibleFeaturedCollections);
  const visibleFeaturedCards = featuredDisplay
    ? (hasQuery ? applyActiveSearchFilters(featuredDisplay.products) : featuredDisplay.products.slice(0, recommendedRowSize))
    : [];
  const featuredDisplayTitle = String(featuredDisplay?.collection?.title || searchFeaturedCollectionTitle || SEARCH_FEATURED_FALLBACK_TITLE).trim();
  const shouldShowFeatured = visibleFeaturedCards.length > 0;
  if (searchFeaturedHeading instanceof HTMLElement) {
    searchFeaturedHeading.textContent = featuredDisplayTitle || SEARCH_FEATURED_FALLBACK_TITLE;
    searchFeaturedHeading.dataset.seasonalManaged = "true";
    searchFeaturedHeading.dataset.seasonalLabel = featuredDisplayTitle || SEARCH_FEATURED_FALLBACK_TITLE;
  }
  if (searchFeaturedBlock instanceof HTMLElement) {
    searchFeaturedBlock.classList.toggle("is-hidden", !shouldShowFeatured);
    searchFeaturedBlock.hidden = !shouldShowFeatured;
  }
  if (shouldShowFeatured) {
    renderSearchCards(searchFeaturedList, visibleFeaturedCards, "Produk unggulan musiman sedang disiapkan.", { renderAllImmediately: hasQuery });
  } else if (searchFeaturedList instanceof HTMLElement) {
    searchFeaturedList.innerHTML = "";
  }

  const featuredKeys = new Set(visibleFeaturedCards.map((item) => getSearchItemKey(item)));
  const recommendationPool = visibleSearchPool.filter((item) => !featuredKeys.has(getSearchItemKey(item)));
  const products = hasQuery
    ? getSearchMatches(query)
    : selectSessionSubset(recommendationPool, recommendedRowSize, "recommended-products");
  renderSearchKeywords(queryText, hasQuery ? visibleSearchPool : recommendationPool);
  const baseProducts = products.slice();
  const filteredProducts = hasQuery
    ? applyActiveSearchFilters(baseProducts)
    : baseProducts.slice();
  const displayedProducts = hasQuery
    ? filteredProducts.filter((item) => !featuredKeys.has(getSearchItemKey(item)))
    : filteredProducts.slice();
  const faqMatches = [];
  const featuredProductCount = shouldShowFeatured ? visibleFeaturedCards.length : 0;
  const hasProductResults = displayedProducts.length > 0 || featuredProductCount > 0;
  const hasFaqResults = faqMatches.length > 0;
  const hasResults = hasProductResults || hasFaqResults;
  if (searchDropdownBody instanceof HTMLElement) {
    searchDropdownBody.classList.toggle("is-query-mode", hasQuery);
    searchDropdownBody.classList.toggle("is-no-results", hasQuery && !hasResults);
  }
  setSearchQueryShellState(hasQuery, displayedProducts.length + featuredProductCount, faqMatches.length, hasResults, hasQuery && (baseProducts.length > 0 || featuredProductCount > 0));
  if (!hasQuery) {
    setSearchQueryView("products", hasFaqResults);
  } else if (activeSearchQueryView === "faq" && !hasFaqResults) {
    setSearchQueryView("products", hasFaqResults);
  } else if (activeSearchQueryView === "products" && !hasProductResults && hasFaqResults) {
    setSearchQueryView("faq", hasFaqResults);
  } else {
    setSearchQueryView(activeSearchQueryView, hasFaqResults);
  }
  renderSearchFiltersModal(baseProducts, hasQuery && baseProducts.length > 0);
  if (searchKeywordsGroup instanceof HTMLElement) {
    searchKeywordsGroup.classList.toggle("is-hidden", hasQuery && hasResults);
  }
  renderSearchFaqMatches(queryText, faqMatches);
  const shouldHideProductsGroup = hasQuery && displayedProducts.length === 0;
  if (searchRecommendedGroup instanceof HTMLElement) {
    searchRecommendedGroup.classList.toggle("is-query-results", hasQuery);
    searchRecommendedGroup.classList.toggle("is-hidden", shouldHideProductsGroup);
    searchRecommendedGroup.hidden = shouldHideProductsGroup;
  }
  renderSearchStatus(queryText, hasResults);
  if (searchKeywordsHeading instanceof HTMLElement) {
    searchKeywordsHeading.textContent = hasQuery && !hasResults ? "Trending Searches" : "Related Searches";
  }
  if (searchProductsHeading instanceof HTMLElement) {
    searchProductsHeading.textContent = hasQuery ? "Search Results" : "Recommended Products";
  }
  const productsToRender = hasQuery
    ? displayedProducts
    : (hasProductResults ? displayedProducts : selectSessionSubset(recommendationPool, recommendedRowSize, "recommended-fallback"));
  if (shouldHideProductsGroup && searchProductsList instanceof HTMLElement) {
    searchProductsList.innerHTML = "";
  } else {
    renderSearchCards(
      searchProductsList,
      productsToRender,
      hasQuery ? "No products match this search." : "Products will appear soon."
    );
  }
  triggerSearchFadeIn();
};
const applySiteSectionsCopy = (payload = {}) => {
  window.__MARVELL_SITE_SECTIONS__ = payload && typeof payload === "object" ? payload : {};
  latestSiteSectionsSignature = serializeComparablePayload(window.__MARVELL_SITE_SECTIONS__);
  const homePortfolio = payload?.homePortfolio && typeof payload.homePortfolio === "object"
    ? payload.homePortfolio
    : {};
  const homeHero = payload?.homeHero && typeof payload.homeHero === "object"
    ? payload.homeHero
    : {};
  const resolved = {
    kicker: String(homePortfolio.kicker || HOME_PORTFOLIO_DEFAULT_COPY.kicker).trim(),
    heading: String(homePortfolio.heading || HOME_PORTFOLIO_DEFAULT_COPY.heading).trim(),
    lead: String(homePortfolio.lead || HOME_PORTFOLIO_DEFAULT_COPY.lead).trim(),
    requestNote: String(homePortfolio.requestNote || HOME_PORTFOLIO_DEFAULT_COPY.requestNote).trim(),
    requestButtonLabel: String(homePortfolio.requestButtonLabel || HOME_PORTFOLIO_DEFAULT_COPY.requestButtonLabel).trim()
  };
  const homeHeroResolved = {
    image: String(homeHero.image || "").trim(),
    eyebrow: String(homeHero.eyebrow || "").trim() || "Marvell Florist",
    heading: String(homeHero.heading || "").trim() || "For Moments That Matter",
    ctaLabel: String(homeHero.ctaLabel || "").trim() || "Discover the Collection",
    ctaTarget: String(homeHero.ctaTarget || "").trim() || "gallery-entry"
  };
  const activeFeaturedHref = String(window.__MARVELL_HOMEPAGE_FEATURED_HREF__ || "").trim();
  const homeHeroHref = homeHeroResolved.ctaTarget === "featured-primary"
    ? (activeFeaturedHref || "featured.html")
    : "gallery.html?entry=home-hero";

  if (portfolioKickerElement instanceof HTMLElement) portfolioKickerElement.textContent = resolved.kicker;
  if (portfolioHeadingElement instanceof HTMLElement) portfolioHeadingElement.textContent = resolved.heading;
  if (portfolioLeadElement instanceof HTMLElement) portfolioLeadElement.textContent = resolved.lead;
  if (portfolioRequestNoteElement instanceof HTMLElement) portfolioRequestNoteElement.textContent = resolved.requestNote;
  if (portfolioRequestButtonElement instanceof HTMLElement) portfolioRequestButtonElement.textContent = resolved.requestButtonLabel;
  const homeHeroSubtitleElement = document.getElementById("home-hero-subtitle");
  const homeHeroTitleElement = document.getElementById("home-hero-title");
  const homeHeroLinkElement = document.getElementById("home-hero-link");
  const homeHeroBackgroundElement = document.querySelector("#home .layer-depth-bg .layer-bg");
  if (homeHeroSubtitleElement instanceof HTMLElement) homeHeroSubtitleElement.textContent = homeHeroResolved.eyebrow;
  if (homeHeroTitleElement instanceof HTMLElement) homeHeroTitleElement.textContent = homeHeroResolved.heading;
  if (homeHeroLinkElement instanceof HTMLAnchorElement) {
    homeHeroLinkElement.textContent = homeHeroResolved.ctaLabel;
    homeHeroLinkElement.setAttribute("href", homeHeroHref);
    homeHeroLinkElement.dataset.siteSectionsManaged = "true";
  }
  if (homeHeroClickTarget instanceof HTMLButtonElement) {
    homeHeroClickTarget.setAttribute("data-seasonal-direct-href", homeHeroHref);
  }
  if (homeHeroBackgroundElement instanceof HTMLImageElement) {
    const heroImagePath = String(homeHeroResolved.image || "").trim();
    const fallbackHeroImage = "assets/home-current-2200.webp";
    const resolvedHeroImage = heroImagePath || fallbackHeroImage;
    const usesCanonicalHero = /img_4371|home-current-/.test(resolvedHeroImage);
    if (!usesCanonicalHero) {
      homeHeroBackgroundElement.removeAttribute("srcset");
      homeHeroBackgroundElement.removeAttribute("sizes");
      homeHeroBackgroundElement.src = resolvedHeroImage;
    }
  }
  window.dispatchEvent(new CustomEvent("sitesectionsupdated", {
    detail: window.__MARVELL_SITE_SECTIONS__
  }));
};
const refreshSiteSectionsCopy = async (force = false) => {
  const fetchedPayload = await fetchFirstAvailableJson(SITE_SECTIONS_ENDPOINTS);
  if (!fetchedPayload || typeof fetchedPayload !== "object") return false;
  const nextSignature = serializeComparablePayload(fetchedPayload);
  if (!force && nextSignature && nextSignature === latestSiteSectionsSignature) return true;
  applySiteSectionsCopy(fetchedPayload);
  return true;
};
const scheduleSiteSectionsLiveSync = () => {
  if (siteSectionsLiveSyncTimer) window.clearTimeout(siteSectionsLiveSyncTimer);
  siteSectionsLiveSyncTimer = window.setTimeout(async () => {
    await refreshSiteSectionsCopy(false);
    scheduleSiteSectionsLiveSync();
  }, SITE_SECTIONS_LIVE_SYNC_INTERVAL_MS);
};
const initializeSiteSectionsContent = async () => {
  const embeddedSiteSectionsPayload = getEmbeddedJsonPayload("embedded-site-sections-json");
  if (embeddedSiteSectionsPayload && typeof embeddedSiteSectionsPayload === "object" && Object.keys(embeddedSiteSectionsPayload).length) {
    applySiteSectionsCopy(embeddedSiteSectionsPayload);
  }
  const fetchedPayload = await fetchFirstAvailableJson(SITE_SECTIONS_ENDPOINTS);
  if (fetchedPayload && typeof fetchedPayload === "object") {
    applySiteSectionsCopy(fetchedPayload);
  }
  if (IS_LOCAL_CONTENT_HOST) scheduleSiteSectionsLiveSync();
};
const hydrateSearchFeaturedFromContent = (payload = {}) => {
  const parseMonthDay = (value) => {
    const [monthRaw, dayRaw] = String(value || "").split("-");
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { month, day };
  };
  const isEventScheduledActive = (event, today = new Date()) => {
    const startPart = parseMonthDay(event?.start);
    const endPart = parseMonthDay(event?.end);
    if (!startPart || !endPart) return false;
    const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const year = now.getFullYear();
    const startDate = new Date(year, startPart.month - 1, startPart.day);
    const endDate = new Date(year, endPart.month - 1, endPart.day);
    if (endDate >= startDate) return now >= startDate && now <= endDate;
    return now >= startDate || now <= endDate;
  };
  const sortByPriority = (events = []) => [...events].sort((a, b) => {
    const byPriority = (Number(b?.priority) || 0) - (Number(a?.priority) || 0);
    if (byPriority !== 0) return byPriority;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const eventsWithProducts = events.filter((event) => (
    Array.isArray(event?.products)
    && event.products.some((product) => String(product?.src || "").trim() && String(product?.name || "").trim())
  ));
  const activeEvents = sortByPriority([
    ...events.filter((event) => event?.forceActive === true),
    ...events.filter((event) => isEventScheduledActive(event, new Date()))
  ]);
  const dedupedActiveEvents = [];
  const seen = new Set();
  activeEvents.forEach((event) => {
    const key = String(event?.id || "").trim() || JSON.stringify([event?.title || "", event?.start || "", event?.end || ""]);
    if (seen.has(key)) return;
    seen.add(key);
    dedupedActiveEvents.push(event);
  });
  const renderableActiveEvents = dedupedActiveEvents.filter((event) => (
    Array.isArray(event?.products)
    && event.products.some((product) => String(product?.src || "").trim() && String(product?.name || "").trim())
  ));
  const searchableEvents = renderableActiveEvents;
  const targetEvent = searchableEvents[0] || null;
  if (!targetEvent) {
    searchFeaturedCollectionProducts = [];
    searchFeaturedCollections = [];
    searchSeasonalProductPool = [];
    rebuildSearchProductPool();
    renderSearchShelves(searchInput instanceof HTMLInputElement ? searchInput.value : "");
    return;
  }
  const eventTitle = String(targetEvent.title || SEARCH_FEATURED_FALLBACK_TITLE).trim();
  const mapEventProducts = (eventConfig) => {
    const mappedEventTitle = String(eventConfig?.title || SEARCH_FEATURED_FALLBACK_TITLE).trim();
    const mappedEventId = String(eventConfig?.id || "").trim();
    const eventProducts = Array.isArray(eventConfig?.products) ? eventConfig.products : [];
    return eventProducts
    .filter((product) => product && product.src && product.name)
    .map((product) => {
      const title = String(product.name || "Produk Unggulan").trim();
      const image = String(product.src || "").trim();
      const rawPrice = parseSearchPriceNumber(product.price);
      const priceLabel = formatRupiah(rawPrice) || "";
      const itemFilters = product?.filters && typeof product.filters === "object" ? product.filters : {};
      const colorKeywords = Array.isArray(itemFilters.colors) ? itemFilters.colors : [];
      const typeKeyword = String(itemFilters.type || "").trim();
      return {
        title,
        category: mappedEventTitle || SEARCH_FEATURED_FALLBACK_TITLE,
        image: resolveSearchImage(image),
        additionalImages: normalizeSearchAdditionalImages(product.additionalImages),
        rawPrice,
        price: priceLabel,
        filters: {
          colors: colorKeywords.length ? colorKeywords : undefined,
          type: typeKeyword || undefined
        },
        keywords: buildBilingualSearchKeywords(title, "Featured", [
          mappedEventTitle,
          mappedEventId,
          ...tokenizeSearchQuery(mappedEventTitle),
          "Featured",
          "Seasonal",
          "Collection",
          ...colorKeywords,
          typeKeyword
        ]),
        href: buildSearchFeaturedCollectionHref({
          eventId: mappedEventId,
          eventTitle: mappedEventTitle,
          productTitle: title
        })
      };
    });
  };
  const mapped = mapEventProducts(targetEvent);
  const searchableMapped = searchableEvents.flatMap((eventConfig) => mapEventProducts(eventConfig));
  const mappedCollections = searchableEvents
    .map((eventConfig) => ({
      id: String(eventConfig?.id || "").trim(),
      title: String(eventConfig?.title || SEARCH_FEATURED_FALLBACK_TITLE).trim() || SEARCH_FEATURED_FALLBACK_TITLE,
      products: mapEventProducts(eventConfig)
    }))
    .filter((collection) => collection.products.length > 0);
  if (!mapped.length) {
    searchFeaturedCollectionProducts = [];
    searchFeaturedCollections = [];
    searchSeasonalProductPool = [];
    rebuildSearchProductPool();
    renderSearchShelves(searchInput instanceof HTMLInputElement ? searchInput.value : "");
    return;
  }
  searchFeaturedCollectionTitle = eventTitle;
  searchFeaturedCollectionProducts = mapped;
  searchFeaturedCollections = mappedCollections;
  searchSeasonalProductPool = searchableMapped.map((item) => ({
    ...item,
    category: item.category || "Seasonal Collection",
    keywords: buildBilingualSearchKeywords(item.title, item.category || "Seasonal Collection", [
      ...(Array.isArray(item.keywords) ? item.keywords : []),
      "seasonal",
      "collection"
    ])
  }));
  rebuildSearchProductPool();
  renderSearchShelves(searchInput instanceof HTMLInputElement ? searchInput.value : "");
};
const hydrateSearchPoolFromGallery = (items = []) => {
  const categoryCounters = new Map();
  const mappedRaw = Array.from(items)
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const category = toTitleCaseWords(item.category || "Collection");
      const categoryMeta = findSearchCategoryMeta(category);
      const categoryKey = normalizeSearchText(category);
      const nextNumber = (categoryCounters.get(categoryKey) || 0) + 1;
      categoryCounters.set(categoryKey, nextNumber);
      const title = normalizeNumberedProductTitle(item.title || item.name || "", category, nextNumber);
      const image = String(item.image || "").trim();
      if (!title || !image) return null;
      const rawPrice = parseSearchPriceNumber(item.price);
      const itemFilters = item?.filters && typeof item.filters === "object" ? item.filters : {};
      const inferredKeywords = inferSearchKeywordsFromImage(image, category);
      const filterKeywords = inferSearchKeywordsFromGalleryFilters(item, categoryMeta, nextNumber - 1);
      const categoryKeywords = [
        ...(Array.isArray(categoryMeta?.aliases) ? categoryMeta.aliases : []),
        ...(Array.isArray(categoryMeta?.matchCategories) ? categoryMeta.matchCategories : [])
      ];
      return {
        title,
        category: category || "Collection",
        href: buildSearchProductHref({
          category: category || "Collection",
          title,
          image: resolveSearchImage(image),
          price: rawPrice
        }),
        image: resolveSearchImage(image),
        additionalImages: normalizeSearchAdditionalImages(item.additionalImages),
        rawPrice,
        filters: {
          colors: Array.isArray(itemFilters.colors) ? itemFilters.colors : undefined,
          type: itemFilters.type || undefined,
          flowerCondition: itemFilters.flowerCondition || undefined,
          flowerTypes: Array.isArray(itemFilters.flowerTypes) ? itemFilters.flowerTypes : undefined,
          occasion: itemFilters.occasion || undefined,
          material: itemFilters.material || undefined,
          size: itemFilters.size || undefined
        },
        keywords: buildBilingualSearchKeywords(title, category, [...categoryKeywords, ...inferredKeywords, ...filterKeywords, "florist", "toko bunga", "rangkaian bunga", "batam"])
      };
    })
    .filter((item) => item && !isSearchExcludedItem(item));
  if (mappedRaw.length > 0) {
    searchBaseProductPool = mappedRaw.map((item) => ({
      ...item,
      // Only show exact product price when provided; do not fabricate "start from" per item.
      price: formatRupiah(item.rawPrice) || ""
    }));
    rebuildSearchProductPool();
    renderSearchShelves(searchInput instanceof HTMLInputElement ? searchInput.value : "");
  }
};
const bootstrapSearchDataFromEmbeddedPayloads = () => {
  if (searchBaseProductPool.length && searchFeaturedCollectionProducts.length) return;
  const embeddedGalleryPayload = getEmbeddedJsonPayload("embedded-gallery-json");
  const embeddedFeaturedPayload = getEmbeddedJsonPayload("embedded-featured-json");

  if (!searchBaseProductPool.length && embeddedGalleryPayload) {
    const embeddedGalleryItems = extractGalleryItems(embeddedGalleryPayload);
    if (embeddedGalleryItems.length) hydrateSearchPoolFromGallery(embeddedGalleryItems);
  }

  if (!searchFeaturedCollectionProducts.length && embeddedFeaturedPayload) {
    hydrateSearchFeaturedFromContent(embeddedFeaturedPayload);
  }
};
const setMenuView = (viewName = "main") => {
  if (!menuViews.length || !menuPanel) return;
  menuPanel.setAttribute("data-menu-current", viewName);
  menuViews.forEach((view) => {
    const isMatch = view.getAttribute("data-menu-view") === viewName;
    const isMainView = view.getAttribute("data-menu-view") === "main";
    view.setAttribute("aria-hidden", isMatch ? "false" : "true");
    view.style.opacity = isMatch ? "1" : "0";
    view.style.pointerEvents = isMatch ? "auto" : "none";
    view.style.visibility = isMatch ? "visible" : "hidden";
    view.style.transform = isMatch
      ? "translateX(0)"
      : (isMainView && viewName !== "main" ? "translateX(-18px)" : "translateX(18px)");
  });
};
const isDesktopMenuQuickPane = () => window.matchMedia("(min-width: 769px)").matches;
let menuQuickSwitchTimer = 0;
const clearMenuQuickSwitch = () => {
  if (menuQuickSwitchTimer) {
    window.clearTimeout(menuQuickSwitchTimer);
    menuQuickSwitchTimer = 0;
  }
};
const setMenuQuickPane = (panelName = "") => {
  if (SHARED_MENU_MANAGED) return;
  if (!(menuQuickPane instanceof HTMLElement)) return;
  const normalized = String(panelName || "").trim();
  const currentPanel = menuQuickPane.getAttribute("data-quick-current") || "";
  const wasActive = menuPanel.getAttribute("data-menu-quick-active") === "true";
  const isSwitchingBetweenPanels = Boolean(normalized && currentPanel && currentPanel !== normalized);
  clearMenuQuickSwitch();
  if (wasActive && !normalized) {
    menuPanel.setAttribute("data-menu-quick-closing", "true");
    window.setTimeout(() => {
      if (menuPanel.getAttribute("data-menu-quick-active") !== "true") {
        menuPanel.removeAttribute("data-menu-quick-closing");
      }
    }, 560);
  } else if (normalized) {
    menuPanel.removeAttribute("data-menu-quick-closing");
  }
  if (isSwitchingBetweenPanels) {
    menuQuickPanels.forEach((panelNode) => {
      if (!(panelNode instanceof HTMLElement)) return;
      panelNode.style.transform = "translateX(0)";
    });
  }
  menuQuickPane.setAttribute("data-quick-current", normalized);
  menuPanel.setAttribute("data-menu-quick-active", normalized ? "true" : "false");
  if (!isSwitchingBetweenPanels) {
    menuQuickPanels.forEach((panelNode) => {
      if (!(panelNode instanceof HTMLElement)) return;
      const isActive = normalized !== "" && panelNode.getAttribute("data-quick-panel") === normalized;
      panelNode.style.transform = isActive ? "translateX(0)" : "translateX(-22px)";
    });
  }
  menuQuickTriggers.forEach((trigger) => {
    if (!(trigger instanceof HTMLElement)) return;
    const isActive = normalized !== "" && trigger.getAttribute("data-menu-quick") === normalized;
    trigger.classList.toggle("is-quick-active", isActive);
    trigger.setAttribute("aria-expanded", isActive ? "true" : "false");
  });
  if (isSwitchingBetweenPanels) {
    menuQuickSwitchTimer = window.setTimeout(() => {
      menuQuickPanels.forEach((panelNode) => {
        if (!(panelNode instanceof HTMLElement)) return;
        const isActive = normalized !== "" && panelNode.getAttribute("data-quick-panel") === normalized;
        panelNode.style.transform = isActive ? "translateX(0)" : "translateX(-22px)";
      });
      menuQuickSwitchTimer = 0;
    }, 260);
  }
};
const setContactQuickOpen = (shouldOpen) => {
  if (contactQuickPanel?.dataset.sharedManaged === "true" && window.MarvellContact) {
    if (shouldOpen) window.MarvellContact.open();
    else window.MarvellContact.close();
    return;
  }
  if (!contactQuickPanel || !contactQuickTrigger || !contactQuickBackdrop) return;
  contactQuickPanel.classList.toggle("is-open", shouldOpen);
  contactQuickBackdrop.classList.toggle("is-open", shouldOpen);
  contactQuickPanel.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  contactQuickTrigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  document.body.classList.toggle("contact-quick-open", shouldOpen);
};
const setMenuOpen = (shouldOpen) => {
  if (!menuPanel || !menuToggle) return;
  if (SHARED_MENU_MANAGED) {
    const sharedBackdrop = document.getElementById("menu-backdrop");
    if (!shouldOpen) {
      menuPanel.classList.remove("is-open");
      menuPanel.style.setProperty(
        "transform",
        window.matchMedia("(min-width: 769px)").matches ? "translateX(-100%)" : "translateY(100%)",
        "important"
      );
      menuPanel.setAttribute("aria-hidden", "true");
      menuPanel.setAttribute("data-menu-current", "main");
      menuPanel.removeAttribute("data-menu-quick-active");
      menuPanel.removeAttribute("data-menu-quick-closing");
      if (sharedBackdrop instanceof HTMLElement) {
        sharedBackdrop.classList.remove("is-open");
        sharedBackdrop.setAttribute("aria-hidden", "true");
      }
      menuToggle.setAttribute("aria-expanded", "false");
    }
    return;
  }
  if (!contactQuickBackdrop) return;
  menuPanel.classList.toggle("is-open", shouldOpen);
  contactQuickBackdrop.classList.toggle("is-open", shouldOpen);
  menuPanel.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  menuToggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  if (!shouldOpen) {
    setMenuView("main");
    setMenuQuickPane("");
  } else {
    setMenuQuickPane("");
  }
};
const hasSearchQueryFlag = () => /(?:\?|&)search(?:[=&]|$)/.test(window.location.search || "");
const buildSearchStateUrl = (includeSearch) => {
  const hash = window.location.hash || "";
  return includeSearch ? `${window.location.pathname}?search${hash}` : `${window.location.pathname}${hash}`;
};
const syncSearchQueryState = (isOpen, mode = "replace") => {
  const hasFlag = hasSearchQueryFlag();
  if (isOpen && !hasFlag) {
    history[mode === "push" ? "pushState" : "replaceState"](null, "", buildSearchStateUrl(true));
    return;
  }
  if (!isOpen && hasFlag) {
    history[mode === "push" ? "pushState" : "replaceState"](null, "", buildSearchStateUrl(false));
  }
};
const setSearchOpen = (shouldOpen, options = {}) => {
  const { syncUrl = true, historyMode = "replace" } = options;
  if (!searchDropdown || !searchDropdownBackdrop) return;
  searchDropdown.classList.toggle("is-open", shouldOpen);
  searchDropdownBackdrop.classList.toggle("is-open", shouldOpen);
  searchDropdown.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  if (searchToggle) searchToggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  if (searchMobileTrigger) searchMobileTrigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  document.body.classList.toggle("search-open", shouldOpen);
  if (syncUrl) syncSearchQueryState(shouldOpen, historyMode);
  if (shouldOpen && searchInput instanceof HTMLInputElement) {
    renderSearchShelves(searchInput.value);
    window.setTimeout(() => searchInput.focus(), 140);
  } else {
    if (searchInput instanceof HTMLInputElement) searchInput.value = "";
    resetActiveSearchFilters();
    renderSearchShelves("");
    setSearchFiltersModalOpen(false);
  }
};
if (menuPanel && !SHARED_MENU_MANAGED) setMenuView("main");
if (menuQuickTriggers.length && !SHARED_MENU_MANAGED) {
  menuQuickTriggers.forEach((trigger) => {
    if (!(trigger instanceof HTMLElement)) return;
    const quickName = String(trigger.getAttribute("data-menu-quick") || "").trim();
    if (!quickName) return;
    trigger.addEventListener("click", () => {
      if (!isDesktopMenuQuickPane()) return;
      setMenuQuickPane(quickName);
    });
  });
}
if (contactQuickTrigger) {
  if (!POPUPS_ENABLED) {
    contactQuickTrigger.setAttribute("aria-disabled", "true");
  } else {
    contactQuickTrigger.addEventListener("click", () => {
      if (contactQuickPanel?.dataset.sharedManaged === "true") return;
      const isOpen = contactQuickPanel && contactQuickPanel.classList.contains("is-open");
      setSearchOpen(false);
      setContactQuickOpen(!isOpen);
    });
  }
}
if (footerContactTriggers.length) {
  if (POPUPS_ENABLED) {
    footerContactTriggers.forEach((trigger) => {
      if (!(trigger instanceof HTMLElement)) return;
      trigger.addEventListener("click", (event) => {
        if (event) event.preventDefault();
        setSearchOpen(false);
        setContactQuickOpen(true);
      });
    });
  }
}
if (contactQuickBackdrop) {
  if (POPUPS_ENABLED) {
    contactQuickBackdrop.addEventListener("click", () => setContactQuickOpen(false));
  }
}
if (contactQuickClose instanceof HTMLButtonElement) {
  if (POPUPS_ENABLED) {
    contactQuickClose.addEventListener("click", () => setContactQuickOpen(false));
  }
}
if (menuToggle && menuPanel && !SHARED_MENU_MANAGED) {
  if (!POPUPS_ENABLED) {
    menuToggle.setAttribute("aria-disabled", "true");
  } else {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuPanel.classList.contains("is-open");
      if (!isOpen) setMenuView("main");
      setSearchOpen(false);
      setMenuOpen(!isOpen);
    });
  }
}
if (POPUPS_ENABLED) {
  if (searchToggle && searchDropdown) {
    searchToggle.addEventListener("click", (event) => {
      event.preventDefault();
      const isOpen = searchDropdown.classList.contains("is-open");
      setContactQuickOpen(false);
      setMenuOpen(false);
      setSearchOpen(!isOpen, { historyMode: isOpen ? "replace" : "push" });
    });
  }
  if (searchMobileTrigger && searchDropdown) {
    searchMobileTrigger.addEventListener("click", () => {
      const isOpen = searchDropdown.classList.contains("is-open");
      setContactQuickOpen(false);
      setMenuOpen(false);
      setSearchOpen(!isOpen, { historyMode: isOpen ? "replace" : "push" });
    });
  }
}
if (searchDropdownBackdrop && POPUPS_ENABLED) {
  searchDropdownBackdrop.addEventListener("click", () => setSearchOpen(false));
}
if (searchDropdownClose instanceof HTMLButtonElement && POPUPS_ENABLED) {
  searchDropdownClose.addEventListener("click", () => setSearchOpen(false));
}
if (searchQueryFilterButton instanceof HTMLButtonElement && POPUPS_ENABLED) {
  searchQueryFilterButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (!(searchDropdownBody instanceof HTMLElement) || !searchDropdownBody.classList.contains("is-query-mode")) return;
    setSearchFiltersModalOpen(!searchFiltersModalOpen);
  });
}
if (searchFiltersClose instanceof HTMLButtonElement && POPUPS_ENABLED) {
  searchFiltersClose.addEventListener("click", () => setSearchFiltersModalOpen(false));
}
if (searchDropdown && POPUPS_ENABLED) {
  searchDropdown.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const groupToggle = target.closest(".search-filter-group-toggle");
    if (groupToggle instanceof HTMLButtonElement) {
      const group = groupToggle.closest(".search-filter-group");
      if (!(group instanceof HTMLElement)) return;
      const panel = group.querySelector(".search-filter-group-panel");
      if (!(panel instanceof HTMLElement)) return;
      const isOpen = group.classList.contains("is-open");
      group.classList.toggle("is-open", !isOpen);
      groupToggle.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      const icon = groupToggle.querySelector(".search-filter-group-icon");
      if (icon) icon.textContent = !isOpen ? "−" : "+";
      panel.style.maxHeight = !isOpen ? `${panel.scrollHeight}px` : "0px";
      return;
    }
    const clearFiltersButton = target.closest("#search-filter-clear");
    if (clearFiltersButton instanceof HTMLButtonElement) {
      resetActiveSearchFilters();
      renderSearchShelves(searchInput instanceof HTMLInputElement ? searchInput.value : "");
      setSearchFiltersModalOpen(true);
      return;
    }
    if (target.closest("#search-filters-modal")) return;
    const queryChip = target.closest("[data-search-query]");
    if (queryChip instanceof HTMLButtonElement && searchInput instanceof HTMLInputElement) {
      const query = String(queryChip.getAttribute("data-search-query") || "").trim();
      if (!query) return;
      searchInput.value = query;
      renderSearchShelves(query);
      return;
    }
    const seasonalFeaturedLink = target.closest(".search-product-detail-link");
    if (seasonalFeaturedLink instanceof HTMLAnchorElement) {
      const href = String(seasonalFeaturedLink.getAttribute("href") || "").trim();
      if (href === "index.html#featured" || href.startsWith("index.html#featured-product-")) {
        event.preventDefault();
        setSearchOpen(false);
        const hash = href.replace(/^index\.html/, "");
        history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
        window.setTimeout(() => resolveDeepHashNavigation(hash), 120);
        return;
      }
    }
    if (target.closest(".search-product-card")) return;
    if (!target.closest("#search-query-filter") && !target.closest("#search-filters-modal")) {
      setSearchFiltersModalOpen(false);
    }
  });
}
if (searchFiltersWrap instanceof HTMLElement && POPUPS_ENABLED) {
  searchFiltersWrap.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches("input[data-search-filter-group]")) return;
    const groupId = normalizeSearchText(target.getAttribute("data-search-filter-group") || "");
    if (!SEARCH_FILTER_GROUP_IDS.includes(groupId)) return;
    const checkedInputs = Array.from(searchFiltersWrap.querySelectorAll(`input[data-search-filter-group='${groupId}']:checked`));
    activeSearchFilters[groupId] = new Set(
      checkedInputs.map((input) => normalizeSearchText(input.value || "")).filter(Boolean)
    );
    renderSearchShelves(searchInput instanceof HTMLInputElement ? searchInput.value : "");
    setSearchFiltersModalOpen(true);
    window.requestAnimationFrame(() => reopenSearchFilterGroup(groupId));
  });
}
if (searchFiltersApply instanceof HTMLButtonElement && POPUPS_ENABLED) {
  searchFiltersApply.addEventListener("click", () => {
    if (searchFiltersApply.disabled) return;
    setSearchFiltersModalOpen(false);
  });
}
if (searchForm && searchInput instanceof HTMLInputElement && POPUPS_ENABLED) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderSearchShelves(searchInput.value);
  });
  searchInput.addEventListener("input", () => renderSearchShelves(searchInput.value));
  if (searchClearButton instanceof HTMLButtonElement) {
    searchClearButton.addEventListener("click", () => {
      searchInput.value = "";
      renderSearchShelves("");
      searchInput.focus();
    });
  }
}
if (searchQueryTabProducts instanceof HTMLButtonElement && POPUPS_ENABLED) {
  searchQueryTabProducts.addEventListener("click", () => {
    setSearchQueryView("products", true);
    setSearchFiltersModalOpen(false);
    window.requestAnimationFrame(() => triggerSearchFadeIn());
  });
}
if (searchQueryTabFaq instanceof HTMLButtonElement && POPUPS_ENABLED) {
  searchQueryTabFaq.addEventListener("click", () => {
    setSearchQueryView("faq", true);
    setSearchFiltersModalOpen(false);
    window.requestAnimationFrame(() => triggerSearchFadeIn());
  });
}
window.addEventListener("seasonalavailabilitychange", () => {
  renderSearchShelves(searchInput instanceof HTMLInputElement ? searchInput.value : "");
});
if (POPUPS_ENABLED) {
  let searchResizeFrame = null;
  window.addEventListener("resize", () => {
    if (searchResizeFrame) cancelAnimationFrame(searchResizeFrame);
    searchResizeFrame = window.requestAnimationFrame(() => {
      renderSearchShelves(searchInput instanceof HTMLInputElement ? searchInput.value : "");
    });
  });
  window.addEventListener("popstate", () => {
    const shouldOpen = hasSearchQueryFlag();
    const isOpen = Boolean(searchDropdown && searchDropdown.classList.contains("is-open"));
    if (shouldOpen === isOpen) return;
    setSearchOpen(shouldOpen, { syncUrl: false });
  });
  if (hasSearchQueryFlag()) {
    setSearchOpen(true, { syncUrl: false });
  }
}
if (menuPanel && !SHARED_MENU_MANAGED) {
  if (POPUPS_ENABLED) {
    menuPanel.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const openButton = target.closest("[data-menu-open]");
      if (openButton instanceof HTMLElement) {
        const quickName = String(openButton.getAttribute("data-menu-quick") || "").trim();
        if (quickName && isDesktopMenuQuickPane()) {
          setMenuQuickPane(quickName);
          return;
        }
        const mobileHref = String(openButton.getAttribute("data-menu-mobile-href") || "").trim();
        if (mobileHref && window.matchMedia("(max-width: 768px)").matches) {
          setMenuOpen(false);
          window.location.href = mobileHref;
          return;
        }
        const directHref = openButton.getAttribute("data-seasonal-direct-href");
        if (directHref) {
          setMenuOpen(false);
          window.location.href = directHref;
          return;
        }
        const targetView = openButton.getAttribute("data-menu-open");
        if (targetView === "contact" && window.MarvellContact?.open) {
          setMenuOpen(false);
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
          setMenuOpen(false);
          window.location.href = directHref;
        }
        return;
      }
      const backButton = target.closest("[data-menu-back]");
      if (backButton instanceof HTMLElement) {
        const backView = backButton.getAttribute("data-menu-back") || "main";
        setMenuView(backView);
        return;
      }
      if (target instanceof HTMLAnchorElement) {
        setMenuOpen(false);
      }
    });
  }
}
if (menuClose instanceof HTMLButtonElement && !SHARED_MENU_MANAGED) {
  if (POPUPS_ENABLED) {
    menuClose.addEventListener("click", () => setMenuOpen(false));
  }
}
if (contactQuickBackdrop && !SHARED_MENU_MANAGED) {
  if (POPUPS_ENABLED) {
    contactQuickBackdrop.addEventListener("click", () => setMenuOpen(false));
  }
}
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!POPUPS_ENABLED) return;
  setContactQuickOpen(false);
  setMenuOpen(false);
  setSearchOpen(false);
});

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

function resolveDeepHashNavigation(hashValue, attempt = 0) {
  const hash = String(hashValue || "").trim();
  if (!hash) return;
  const sectionId = hash.replace(/^#/, "");
  if (!sectionId) return;

  const showcaseAliasMap = {
    featured: "featured-showcase",
    "featured-showcase": "featured-showcase",
    gallery: "portfolio-showcase",
    "portfolio-showcase": "portfolio-showcase"
  };
  const showcaseTargetId = showcaseAliasMap[sectionId];
  if (showcaseTargetId) {
    const showcaseTarget = document.getElementById(showcaseTargetId);
    if (!showcaseTarget) return;
    const navSectionId = showcaseTargetId === "featured-showcase" ? "featured" : "gallery";
    setActiveNav(navSectionId);
    showcaseTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (["home", "about", "reviews", "services"].includes(sectionId)) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    setActiveNav(sectionId);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (sectionId.startsWith("featured-product-")) {
    if (typeof window.featuredHashNavigate === "function") {
      window.featuredHashNavigate();
      return;
    }
    if (attempt < 36) {
      window.setTimeout(() => resolveDeepHashNavigation(hash, attempt + 1), 150);
    }
    return;
  }

  if (!sectionId.startsWith("product-")) return;

  const targetItem = document.getElementById(sectionId);
  if (!targetItem) {
    if (typeof window.featuredHashNavigate === "function") {
      window.featuredHashNavigate();
      return;
    }
    if (attempt < 36) {
      window.setTimeout(() => resolveDeepHashNavigation(hash, attempt + 1), 150);
    }
    return;
  }

  if (gallerySectionElement) {
    gallerySectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const category = targetItem.closest(".gallery-category");
  const toggle = category ? category.querySelector(".category-toggle") : null;
  if (category && toggle instanceof HTMLButtonElement && !category.classList.contains("is-open")) {
    toggle.click();
  }
  setActiveNav("gallery");
  window.setTimeout(() => {
    const refreshedCategory = targetItem.closest(".gallery-category");
    const refreshedPanel = refreshedCategory ? refreshedCategory.querySelector(".category-panel") : null;
    if (refreshedCategory && refreshedPanel && refreshedCategory.classList.contains("is-open")) {
      const panelTargetHeight = Math.min(refreshedPanel.scrollHeight, getOpenPanelHeight());
      refreshedPanel.style.maxHeight = `${panelTargetHeight}px`;
    }
    if (refreshedCategory) {
      refreshedCategory.querySelectorAll(".masonry-item.is-active").forEach((item) => {
        if (item !== targetItem) item.classList.remove("is-active");
      });
    }
    targetItem.classList.add("is-active");
    targetItem.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 320);
}

window.addEventListener("hashchange", () => {
  if (document.body.classList.contains("intro-scroll-lock")) return;
  resolveDeepHashNavigation(window.location.hash || "");
});

function positionNavIndicator(link, opacity = 1) {
  if (!navElement || !navIndicator || !link) return;
  const navRect = navElement.getBoundingClientRect();
  const label = link.querySelector(".nav-label");
  const refRect = label ? label.getBoundingClientRect() : link.getBoundingClientRect();
  const x = refRect.left - navRect.left;
  const width = Math.max(20, refRect.width);
  navElement.style.setProperty("--nav-indicator-x", `${x.toFixed(2)}px`);
  navElement.style.setProperty("--nav-indicator-w", `${width.toFixed(2)}px`);
  navElement.style.setProperty("--nav-indicator-o", `${clamp(opacity, 0, 1)}`);
}

function getActiveNavLink() {
  return navLinks.find((link) => link.classList.contains("is-active")) || navLinks[0] || null;
}

function restoreNavIndicator() {
  navPreviewing = false;
  const activeLink = getActiveNavLink();
  if (activeLink) positionNavIndicator(activeLink, 1);
  else if (navElement) navElement.style.setProperty("--nav-indicator-o", "0");
}

function setActiveNav(sectionId) {
  if (!sectionId) {
    activeNavSectionId = "";
    navLinks.forEach((link) => {
      link.classList.remove("is-active");
      link.removeAttribute("aria-current");
    });
    if (galleryNavItem) galleryNavItem.classList.remove("is-active");
    if (navElement) navElement.style.setProperty("--nav-indicator-o", "0");
    return;
  }
  activeNavSectionId = sectionId;
  let activeLink = null;
  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${sectionId}`;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
    if (isActive) activeLink = link;
  });
  if (galleryNavItem) {
    galleryNavItem.classList.toggle("is-active", sectionId === "gallery");
  }
  if (!navPreviewing && activeLink) positionNavIndicator(activeLink, 1);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const HALO_SIZE = 120;
const HALO_HALF = HALO_SIZE * 0.5;
const HALO_BLOCK_RADIUS = HALO_HALF * 0.9;
const defaultNoSmudgeSelector = [
  "header",
  ".section-rail a",
  ".section-content h1",
  ".section-content h2",
  ".section-content h3",
  ".section-content p",
  ".section-content a",
  ".section-content button",
  ".contact-card",
  ".category-toggle",
  ".design-consult-btn",
  ".category-consult-btn",
  ".masonry-item",
  ".review-card",
  ".seasonal-product-card",
  ".seasonal-order-btn",
  ".seasonal-nav-btn",
  ".reviews-cta",
  ".reviews-nav-btn"
].join(", ");
let haloPointerInside = false;
let smudgeIntensity = 0;
let smudgeMouseX = haloX;
let smudgeMouseY = haloY;
let smudgePrevMouseX = haloX;
let smudgePrevMouseY = haloY;
let smudgeVelocityX = 0;
let smudgeVelocityY = 0;

function shouldSuppressHalo() {
  return false;
}

function markNoSmudgeTargets(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  root.querySelectorAll(defaultNoSmudgeSelector).forEach((element) => {
    element.classList.add("no-smudge");
  });
}

function initializeHomeAmbientParticles() {
  if (!(homeParticlesElement instanceof HTMLElement)) return;
  if (homeParticlesElement.childElementCount > 0) return;
  const particleCount = window.matchMedia("(max-width: 768px)").matches ? 12 : 20;
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < particleCount; i += 1) {
    const particle = document.createElement("span");
    particle.style.setProperty("--x", `${(Math.random() * 100).toFixed(2)}%`);
    particle.style.setProperty("--size", `${(1.4 + (Math.random() * 2.8)).toFixed(2)}px`);
    particle.style.setProperty("--alpha", `${(0.08 + (Math.random() * 0.16)).toFixed(3)}`);
    particle.style.setProperty("--dur", `${(42 + (Math.random() * 38)).toFixed(2)}s`);
    particle.style.setProperty("--delay", `${(-Math.random() * 80).toFixed(2)}s`);
    particle.style.setProperty("--sway", `${(8 + (Math.random() * 20)).toFixed(2)}px`);
    fragment.appendChild(particle);
  }
  homeParticlesElement.appendChild(fragment);
}

function setupEarlyLazyImageWarmup() {
  const bindLazyImage = (img, observer) => {
    if (!(img instanceof HTMLImageElement)) return;
    if (img.dataset.lazyWarmupBound === "1") return;
    if ((img.getAttribute("loading") || "").toLowerCase() !== "lazy") return;
    img.dataset.lazyWarmupBound = "1";
    img.loading = "eager";
    img.decoding = "async";
    warmImage(img);
    if (observer) observer.observe(img);
  };

  const warmImage = (img) => {
    if (!(img instanceof HTMLImageElement)) return;
    img.loading = "eager";
    img.decoding = "async";
    const source = img.currentSrc || img.src;
    if (!source) return;
    const preloader = new Image();
    preloader.decoding = "async";
    preloader.src = source;
  };

  const preloadMargin = window.matchMedia("(max-width: 768px)").matches ? 900 : 1400;
  const lazyObserver = typeof IntersectionObserver === "function"
    ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        if (img instanceof HTMLImageElement) warmImage(img);
        observer.unobserve(entry.target);
      });
    }, {
      root: null,
      rootMargin: `${preloadMargin}px 0px ${preloadMargin}px 0px`,
      threshold: 0
    })
    : null;

  document.querySelectorAll('img[loading="eager"]').forEach((img) => bindLazyImage(img, lazyObserver));

  if (typeof MutationObserver !== "function" || !(document.body instanceof HTMLElement)) return;
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node instanceof HTMLImageElement) bindLazyImage(node, lazyObserver);
        node.querySelectorAll?.('img[loading="eager"]').forEach((img) => bindLazyImage(img, lazyObserver));
      });
    });
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function initializeMobileContactCardEntrance() {
  if (!(contactSectionElement instanceof HTMLElement)) return;
  const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
  if (!isMobileViewport) {
    document.body.classList.remove("mobile-contact-cards-stacked", "mobile-contact-cards-fade-pending", "mobile-contact-cards-faded");
    return;
  }
  if (mobileContactCardsRevealed) {
    document.body.classList.remove("mobile-contact-cards-fade-pending", "mobile-contact-cards-stacked");
    document.body.classList.add("mobile-contact-cards-faded");
    return;
  }
  document.body.classList.add("mobile-contact-cards-fade-pending");
  document.body.classList.remove("mobile-contact-cards-faded", "mobile-contact-cards-stacked");

  if (typeof IntersectionObserver !== "function") {
    document.body.classList.remove("mobile-contact-cards-fade-pending", "mobile-contact-cards-stacked");
    document.body.classList.add("mobile-contact-cards-faded");
    mobileContactCardsRevealed = true;
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    const shouldReveal = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.24);
    if (!shouldReveal) return;
    mobileContactCardsRevealed = true;
    document.body.classList.remove("mobile-contact-cards-fade-pending", "mobile-contact-cards-stacked");
    document.body.classList.add("mobile-contact-cards-faded");
    obs.disconnect();
  }, {
    threshold: [0, 0.24, 0.45],
    root: null,
    rootMargin: "0px 0px 18% 0px"
  });
  observer.observe(contactSectionElement);
}

function syncContactSectionHeightToBackground() {
  if (!(contactSectionElement instanceof HTMLElement)) return;
  contactSectionElement.style.removeProperty("height");
  contactSectionElement.style.removeProperty("min-height");
}

function circleIntersectsRect(cx, cy, radius, rect) {
  if (!rect || rect.width <= 0 || rect.height <= 0) return false;
  const closestX = clamp(cx, rect.left, rect.right);
  const closestY = clamp(cy, rect.top, rect.bottom);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx) + (dy * dy) <= radius * radius;
}

function getVisibleMobileHeaderStackHeight() {
  let maxBottom = 0;

  const headerBottom = getVisibleBottom(headerElement);
  if (headerBottom > maxBottom) maxBottom = headerBottom;

  const promoVisible = document.body.classList.contains("has-promo-strip");
  if (promoVisible) {
    const promoBottom = getVisibleBottom(promoStripElement);
    if (promoBottom > maxBottom) maxBottom = promoBottom;
  }

  return maxBottom;
}

function getVisibleBottom(element) {
  if (!(element instanceof HTMLElement)) return 0;
  const rect = element.getBoundingClientRect();
  if (rect.height <= 0) return 0;
  return Math.max(0, Math.min(rect.bottom, window.innerHeight || rect.bottom));
}

function getVisibleHeaderStackHeight() {
  let maxBottom = getVisibleBottom(headerElement);
  if (document.body.classList.contains("has-promo-strip")) {
    const promoBottom = getVisibleBottom(promoStripElement);
    if (promoBottom > maxBottom) maxBottom = promoBottom;
  }
  return Math.max(0, maxBottom);
}

function scrollToElementWithHeaderOffset(target, behavior = "smooth") {
  if (!(target instanceof HTMLElement)) return;
  const headerOffset = getVisibleHeaderStackHeight();
  const targetTop = target.getBoundingClientRect().top + window.scrollY;
  const scrollTop = Math.max(0, targetTop - headerOffset);
  window.scrollTo({ top: scrollTop, behavior });
}

function getMobileHeaderContactOffset() {
  return getVisibleMobileHeaderStackHeight();
}

function syncMobileHeaderStackOffset() {
  const measuredOffset = getMobileHeaderContactOffset();
  if (!Number.isFinite(measuredOffset) || measuredOffset <= 0) return 0;

  if (mobileHeaderStackOffsetSmoothed <= 0) {
    mobileHeaderStackOffsetSmoothed = measuredOffset;
  } else {
    // Smooth sudden layout jumps (especially when promo strip is present).
    mobileHeaderStackOffsetSmoothed = lerp(mobileHeaderStackOffsetSmoothed, measuredOffset, 0.28);
  }

  const roundedOffset = Number(mobileHeaderStackOffsetSmoothed.toFixed(2));
  if (Math.abs(roundedOffset - lastAppliedMobileHeaderStackOffset) >= 0.35) {
    document.documentElement.style.setProperty("--mobile-header-stack-height", `${roundedOffset.toFixed(2)}px`);
    lastAppliedMobileHeaderStackOffset = roundedOffset;
  }
  return mobileHeaderStackOffsetSmoothed;
}

function brushIntersectsNoSmudge(clientX, clientY, radius) {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return false;
  const candidates = document.querySelectorAll(".no-smudge");
  for (const element of candidates) {
    if (!(element instanceof HTMLElement)) continue;
    const styles = window.getComputedStyle(element);
    if (styles.display === "none" || styles.visibility === "hidden" || Number(styles.opacity) === 0) continue;
    const rect = element.getBoundingClientRect();
    if (circleIntersectsRect(clientX, clientY, radius, rect)) return true;
  }
  return false;
}

function isPowerOfTwo(value) {
  return value > 0 && (value & (value - 1)) === 0;
}

function initializeSmudgeEngine(wrapperElement) {
  if (!hasFinePointer || !(wrapperElement instanceof HTMLElement)) return null;
  if (
    window.matchMedia("(max-width: 768px)").matches &&
    wrapperElement.classList.contains("layer-fg") &&
    wrapperElement.closest("#home")
  ) {
    return null;
  }
  const canvas = wrapperElement.querySelector(".smudge-canvas");
  const image = wrapperElement.querySelector(".background-image");
  if (!(canvas instanceof HTMLCanvasElement) || !(image instanceof HTMLImageElement)) return null;

  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true });
  if (!gl) return null;

  const vertexShaderSource = `
    attribute vec2 aPosition;
    attribute vec2 aUv;
    varying vec2 vUv;
    void main() {
      vUv = aUv;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;
  const fragmentShaderSource = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec2 uResolution;
    uniform vec2 uMousePx;
    uniform vec2 uVelocityPx;
    uniform float uBrushRadiusPx;
    uniform float uStrength;
    uniform float uImageAspect;
    uniform float uRectAspect;

    vec2 coverUv(vec2 uv) {
      vec2 mapped = uv;
      if (uRectAspect > uImageAspect) {
        float scale = uImageAspect / max(uRectAspect, 0.0001);
        mapped.y = (uv.y - 0.5) * scale + 0.5;
      } else {
        float scale = uRectAspect / max(uImageAspect, 0.0001);
        mapped.x = (uv.x - 0.5) * scale + 0.5;
      }
      return clamp(mapped, 0.0, 1.0);
    }

    void main() {
      float distPx = distance(vUv * uResolution, uMousePx);
      float normalized = clamp(1.0 - (distPx / max(uBrushRadiusPx, 1.0)), 0.0, 1.0);
      float falloff = normalized * normalized * (3.0 - 2.0 * normalized);
      falloff *= falloff;
      vec2 displacementUv = (uVelocityPx / max(uResolution, vec2(1.0))) * (falloff * uStrength * 2.2);
      vec2 displacedUv = clamp(vUv - displacementUv, 0.0, 1.0);
      vec2 sampleUv = coverUv(displacedUv);
      vec4 color = texture2D(uTexture, sampleUv);
      gl_FragColor = vec4(color.rgb, color.a);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(vertexSource, fragmentSource) {
    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return null;
    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    return program;
  }

  const program = createProgram(vertexShaderSource, fragmentShaderSource);
  if (!program) return null;

  const locations = {
    attribPosition: gl.getAttribLocation(program, "aPosition"),
    attribUv: gl.getAttribLocation(program, "aUv"),
    uTexture: gl.getUniformLocation(program, "uTexture"),
    uResolution: gl.getUniformLocation(program, "uResolution"),
    uMousePx: gl.getUniformLocation(program, "uMousePx"),
    uVelocityPx: gl.getUniformLocation(program, "uVelocityPx"),
    uBrushRadiusPx: gl.getUniformLocation(program, "uBrushRadiusPx"),
    uStrength: gl.getUniformLocation(program, "uStrength"),
    uImageAspect: gl.getUniformLocation(program, "uImageAspect"),
    uRectAspect: gl.getUniformLocation(program, "uRectAspect")
  };

  const quadBuffer = gl.createBuffer();
  if (!quadBuffer) return null;

  const fullscreenQuad = new Float32Array([
    -1, -1, 0, 1,
     1, -1, 1, 1,
    -1,  1, 0, 0,
    -1,  1, 0, 0,
     1, -1, 1, 1,
     1,  1, 1, 0
  ]);

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, fullscreenQuad, gl.STATIC_DRAW);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const texture = gl.createTexture();
  if (!texture) return null;
  const shouldFlipY = !wrapperElement.classList.contains("layer-fg");

  let textureReady = false;
  let imageAspect = 1;
  let lastDpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeCanvas() {
    const rect = wrapperElement.getBoundingClientRect();
    const baseDpr = Math.min(window.devicePixelRatio || 1, 2);
    let nextWidth = Math.max(Math.round(rect.width * baseDpr), 1);
    let nextHeight = Math.max(Math.round(rect.height * baseDpr), 1);
    const maxCanvasDimension = 1800;
    const largestDimension = Math.max(nextWidth, nextHeight);
    if (largestDimension > maxCanvasDimension) {
      const scale = maxCanvasDimension / largestDimension;
      nextWidth = Math.max(Math.round(nextWidth * scale), 1);
      nextHeight = Math.max(Math.round(nextHeight * scale), 1);
    }
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    lastDpr = canvas.width / Math.max(rect.width, 1);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function uploadTextureFromImage() {
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) return false;
    const maxTextureDimension = 2048;
    let source = image;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;

    if (Math.max(sourceWidth, sourceHeight) > maxTextureDimension) {
      const scale = maxTextureDimension / Math.max(sourceWidth, sourceHeight);
      const downscaleCanvas = document.createElement("canvas");
      downscaleCanvas.width = Math.max(1, Math.round(sourceWidth * scale));
      downscaleCanvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = downscaleCanvas.getContext("2d");
      if (context) {
        context.drawImage(image, 0, 0, downscaleCanvas.width, downscaleCanvas.height);
        source = downscaleCanvas;
        sourceWidth = downscaleCanvas.width;
        sourceHeight = downscaleCanvas.height;
      }
    }

    imageAspect = sourceWidth / Math.max(sourceHeight, 1);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, shouldFlipY);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const canUseMipmaps = isPowerOfTwo(sourceWidth) && isPowerOfTwo(sourceHeight);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, canUseMipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    if (canUseMipmaps) gl.generateMipmap(gl.TEXTURE_2D);

    textureReady = true;
    wrapperElement.classList.add("is-smudge-ready");
    return true;
  }

  if (!uploadTextureFromImage()) {
    image.addEventListener("load", () => {
      uploadTextureFromImage();
    }, { once: true });
  }

  function clear() {
    resizeCanvas();
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  function render(renderState) {
    resizeCanvas();
    if (!textureReady) {
      clear();
      return;
    }

    const rect = wrapperElement.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      clear();
      return;
    }

    const pointerX = clamp(renderState.pointerX, rect.left, rect.right) - rect.left;
    const pointerY = clamp(renderState.pointerY, rect.top, rect.bottom) - rect.top;
    const pointerPxX = pointerX * lastDpr;
    const pointerPxY = pointerY * lastDpr;
    const velocityPxX = (renderState.velocityX || 0) * lastDpr;
    const velocityPxY = (renderState.velocityY || 0) * lastDpr;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(locations.attribPosition);
    gl.vertexAttribPointer(locations.attribPosition, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(locations.attribUv);
    gl.vertexAttribPointer(locations.attribUv, 2, gl.FLOAT, false, 16, 8);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(locations.uTexture, 0);
    gl.uniform2f(locations.uResolution, canvas.width, canvas.height);
    gl.uniform2f(locations.uMousePx, pointerPxX, pointerPxY);
    gl.uniform2f(locations.uVelocityPx, velocityPxX, velocityPxY);
    gl.uniform1f(locations.uBrushRadiusPx, Math.max(1, renderState.radiusPx * lastDpr));
    gl.uniform1f(locations.uStrength, clamp(renderState.brushStrength, 0, 1));
    gl.uniform1f(locations.uImageAspect, imageAspect);
    gl.uniform1f(locations.uRectAspect, rect.width / Math.max(rect.height, 1));

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  return { wrapper: wrapperElement, render, clear };
}

const smudgeEngines = [];

if (navElement && navIndicator) {
  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const targetId = href.startsWith("#") ? href.slice(1) : "";

    link.addEventListener("mouseenter", () => {
      navPreviewing = true;
      positionNavIndicator(link, 0.84);
    });

    link.addEventListener("focus", () => {
      navPreviewing = true;
      positionNavIndicator(link, 0.92);
    });

    link.addEventListener("click", () => {
      if (!targetId) return;
      navPreviewing = false;
      setActiveNav(targetId);
      positionNavIndicator(link, 1);
    });
  });

  navElement.addEventListener("mouseleave", restoreNavIndicator);
  navElement.addEventListener("focusout", () => {
    requestAnimationFrame(() => {
      const activeEl = document.activeElement;
      if (!(activeEl instanceof HTMLElement) || !navElement.contains(activeEl)) {
        restoreNavIndicator();
      }
    });
  });

  window.addEventListener("resize", () => {
    if (navPreviewing) return;
    restoreNavIndicator();
  });

  restoreNavIndicator();
}

if (galleryNavItem) {
  galleryNavItem.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLAnchorElement) return;
    if (!gallerySectionElement) return;
    event.preventDefault();
    navPreviewing = false;
    setActiveNav("gallery");
    gallerySectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

if (galleryNavMenu) {
  galleryNavMenu.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLAnchorElement)) return;
    const categoryName = target.dataset.galleryCategory || "";
    if (!categoryName) return;
    event.preventDefault();
    pendingGalleryCategoryFromNav = categoryName;
    navPreviewing = false;
    setActiveNav("gallery");
    if (openGalleryCategoryFromNav(categoryName)) {
      pendingGalleryCategoryFromNav = "";
    }
  });
}

const initialSectionFromHash = (window.location.hash || "").replace(/^#/, "");
if (initialSectionFromHash
  && navLinks.some((link) => link.getAttribute("href") === `#${initialSectionFromHash}`)) {
  setActiveNav(initialSectionFromHash);
} else {
  setActiveNav("home");
}
markNoSmudgeTargets();
initializeHomeAmbientParticles();
initializeMobileContactCardEntrance();
setupEarlyLazyImageWarmup();
if (contactBgImageElement) {
  if (contactBgImageElement.complete && contactBgImageElement.naturalWidth > 0) {
    syncContactSectionHeightToBackground();
  } else {
    contactBgImageElement.addEventListener("load", syncContactSectionHeightToBackground, { once: true });
  }
  window.addEventListener("resize", syncContactSectionHeightToBackground);
}

const gallerySection = document.getElementById("gallery");
const galleryList = document.getElementById("gallery-list");
const reviewsTrack = document.getElementById("reviews-track");
const reviewsPrevButton = document.getElementById("reviews-prev");
const reviewsNextButton = document.getElementById("reviews-next");
const reviewsViewport = document.getElementById("reviews-viewport");
const reviewsSection = document.getElementById("reviews");
const reviewsProgress = document.getElementById("reviews-progress");
let galleryCategories = [];
let pendingGalleryCategoryFromNav = "";
const REVIEW_PAGE_SIZE = 3;
const reviews = [
  {
    name: "Kendrick Yap",
    rating: 5,
    text: "Beautiful flowers, excellent service, and fast delivery. Everything was perfect. 10/10 would recommend!"
  },
  {
    name: "William Lim",
    rating: 5,
    text: ""
  },
  {
    name: "Tristan Constantiniely",
    rating: 5,
    text: "Bunganya bagus bagus, dan always ready stock."
  },
  {
    name: "Salukha Hiola",
    rating: 5,
    text: "BAGUS BGTTT POKOKNYA LOVE LOVE LOVE SM TOKO BUNGA INI!"
  },
  {
    name: "vera nika",
    rating: 5,
    text: ""
  },
  {
    name: "Justin Xp",
    rating: 5,
    text: ""
  },
  {
    name: "xingxing siska",
    rating: 5,
    text: ""
  },
  {
    name: "Azzah Joohsumnida Dara Lamza",
    rating: 5,
    text: "Kualitas produk sangat bagus, orang orangnya ramah banget."
  },
  {
    name: "Bryan Tan",
    rating: 5,
    text: ""
  },
  {
    name: "Victor Widjaja",
    rating: 5,
    text: "fast respond and excellent service, would repeat order"
  },
  {
    name: "mol",
    rating: 5,
    text: "bagus sekali bunga bunganya"
  },
  {
    name: "Jason Muwardi",
    rating: 5,
    text: "mantap"
  },
  {
    name: "彭裕善",
    rating: 5,
    text: "Bagus, gk nyesel beli di sini"
  },
  {
    name: "Violaveysilia00",
    rating: 5,
    text: "cantik indahh dan bersih+rapihh"
  },
  {
    name: "ferdy Leonardoo",
    rating: 5,
    text: "bunganya sesuai yang ekspektasi dan harganya"
  },
  {
    name: "Chuck Park",
    rating: 5,
    text: "서비스도 빠르고 친절해요. 한글로도 출력해줘요 ㅎㅎ 👍👍👍"
  },
  {
    name: "Austin Johnathan Lai",
    rating: 5,
    text: "very good"
  },
  {
    name: "Clara rapunjel",
    rating: 5,
    text: "the flowers are fresh and have many variety of choices"
  },
  {
    name: "Kayleen Fayola",
    rating: 5,
    text: "High quality bouquets!"
  },
  {
    name: "velove yh",
    rating: 5,
    text: "I had an amazing experience with this florist shop! The flowers were incredibly fresh, vibrant, and beautifully arranged. You can really tell they put a lot of care and creativity into every bouquet. The staff was also very friendly and helpful, making it easy to choose the perfect arrangement for the occasion."
  },
  {
    name: "Gavrill",
    rating: 5,
    text: "i love the details of the flowers"
  },
  {
    name: "jaysen",
    rating: 5,
    text: "Nice flower and service"
  },
  {
    name: "Thomas Regina Putra",
    rating: 5,
    text: "Great service!!"
  },
  {
    name: "Erwanto Lee",
    rating: 5,
    text: "Easy to find"
  },
  {
    name: "Yun Yun",
    rating: 5,
    text: "Nice Flower"
  },
  {
    name: "Mac Arthurson",
    rating: 5,
    text: "good flowers, kind florist always give advice for flowers. thanks yiyi"
  },
  {
    name: "Franscolin Gan",
    rating: 5,
    text: "i like the flowers and the detailing is amazing"
  },
  {
    name: "Jason Lim",
    rating: 5,
    text: ""
  },
  {
    name: "David Lee",
    rating: 5,
    text: "layanannya sangat bagus"
  }
];
let reviewsPageIndex = 0;
let reviewsPageCount = 0;
let reviewsAutoShuffleTimer = 0;
let reviewsAutoShuffleSlots = [];
let reviewsAutoShuffleSource = [];
let reviewsAutoShuffleCursor = 0;
let reviewsAutoShuffleStep = 0;
let reviewsAutoShuffleDirection = 1;
let reviewsAutoShuffleResizeBound = false;
let reviewsMobileLoopTimer = 0;
let reviewsMobileLoopPauseTimer = 0;
let reviewsMobileLoopIndex = 0;
let reviewsMobileLoopUniqueCount = 0;
let reviewsMobileLoopBound = false;
let reviewsResponsiveModeWasMobile = null;
let reviewsResponsiveModeTimer = 0;

const galleryCategoryMeta = [
  {
    key: "artificial-flowers",
    name: "Table Arrangements",
    subtitle: "Rangkaian bunga artifisial untuk kebutuhan dekoratif dan penggunaan jangka panjang.",
    phone: "6281275017456"
  },
  {
    key: "bouquets",
    name: "Bouquets",
    subtitle: "Bouquet custom untuk hadiah, perayaan, dan momen spesial.",
    phone: "6281275017456"
  },
  {
    key: "papan-bunga",
    name: "Papan Bunga",
    aliases: ["flower boards"],
    subtitle: "Papan bunga ucapan untuk peresmian, duka cita, dan momen formal lainnya.",
    phone: "6281275017456"
  },
  {
    key: "standing-flowers",
    name: "Standing Flowers",
    subtitle: "Standing flowers untuk dekorasi acara dan kebutuhan display formal.",
    phone: "6281275017456"
  },
  {
    key: "parcels",
    name: "Parcels",
    subtitle: "Parcel hadiah untuk perayaan, hampers, dan kebutuhan gifting.",
    phone: "628116667920"
  },
  {
    key: "funerals",
    name: "Funerals",
    aliases: ["funeral", "duka", "duka cita"],
    subtitle: "Rangkaian bunga belasungkawa dan papan duka untuk menyampaikan penghormatan yang tulus.",
    phone: "6281275017456"
  },
  {
    key: "by-request",
    name: "By Request",
    aliases: ["by request", "custom"],
    subtitle: "Kategori custom by request untuk kebutuhan khusus dan konsep personal.",
    phone: "628116667457"
  }
];
bootstrapSearchDataFromEmbeddedPayloads();
renderSearchShelves("");
const GALLERY_CATEGORY_COVER_IMAGES = {
  "Table Arrangements": "/assets/artificialcover.webp",
  Bouquets: "/assets/bouquetcover.webp",
  "Papan Bunga": "/assets/papancover-1600.webp",
  "Standing Flowers": "/assets/standingcover.webp",
  Parcels: "/assets/parcelcover.webp",
  Funerals: "/assets/funeral.webp",
  "By Request": "/assets/request.webp"
};

function normalizePortfolioTextList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (item && typeof item === "object") {
        return String(item.alias || item.keyword || item.value || "").trim();
      }
      return String(item || "").trim();
    })
    .filter(Boolean);
}

function normalizePortfolioAssetPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("/") ? raw : `/${raw.replace(/^\.?\//, "")}`;
}

function normalizePortfolioFilterOptionRecord(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const fallbackId = `option-${index + 1}`;
  const id = normalizeSearchFilterToken(entry.id || entry.value || entry.label || fallbackId) || fallbackId;
  const label = String(entry.label || entry.name || entry.id || fallbackId).trim() || fallbackId;
  return { id, label };
}

function normalizePortfolioFilterGroupRecord(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const fallbackId = `group-${index + 1}`;
  const id = normalizeSearchFilterToken(entry.id || entry.label || fallbackId) || fallbackId;
  const label = String(entry.label || entry.name || entry.id || fallbackId).trim() || fallbackId;
  const options = Array.isArray(entry.options)
    ? entry.options
      .map((option, optionIndex) => normalizePortfolioFilterOptionRecord(option, optionIndex))
      .filter(Boolean)
    : [];
  if (!options.length) return null;
  return { id, label, options };
}

function normalizePortfolioCategoryRecord(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const fallbackKey = `category-${index + 1}`;
  const key = normalizeSearchCategorySlug(entry.key || entry.name || fallbackKey) || fallbackKey;
  const name = String(entry.name || entry.key || fallbackKey).trim() || fallbackKey;
  const aliases = Array.from(new Set([
    ...normalizePortfolioTextList(entry.aliases),
    name,
    key.replace(/-/g, " ")
  ]));
  const matchCategories = normalizePortfolioTextList(entry.matchCategories);
  const filterGroups = Array.isArray(entry.filterGroups)
    ? entry.filterGroups
      .map((group, groupIndex) => normalizePortfolioFilterGroupRecord(group, groupIndex))
      .filter(Boolean)
    : [];

  return {
    key,
    name,
    aliases,
    matchCategories,
    filterGroups,
    subtitle: String(entry.subtitle || "").trim(),
    phone: String(entry.phone || "").trim(),
    coverImage: normalizePortfolioAssetPath(entry.coverImage || ""),
    showOnHome: entry.showOnHome !== false,
    showInGallery: entry.showInGallery !== false,
    order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : (index + 1)
  };
}

function extractGalleryItems(payload = {}) {
  const normalizeAdditionalImageRecord = (entry) => {
    if (typeof entry === "string") {
      const image = String(entry || "").trim();
      if (!image) return null;
      return {
        image,
        usage: "both",
        hoverPosition: "center center",
        scrollPosition: "center center"
      };
    }
    if (!entry || typeof entry !== "object") return null;
    const image = String(entry.image || entry.src || "").trim();
    if (!image) return null;
    return {
      image,
      usage: normalizeSearchAdditionalImageUsage(entry.usage),
      hoverPosition: normalizeSearchMediaPosition(entry.hoverPosition),
      scrollPosition: normalizeSearchMediaPosition(entry.scrollPosition)
    };
  };
  const normalizeGalleryItemRecord = (item, fallbackCategory = "") => {
    if (!item || typeof item !== "object") return null;
    const normalizedTitle = String(item.title || item.name || "").trim();
    const normalizedPriceRaw = item.price;
    const normalizedPrice = Number.isFinite(Number(normalizedPriceRaw))
      ? Number(normalizedPriceRaw)
      : (normalizedPriceRaw === null || normalizedPriceRaw === undefined || normalizedPriceRaw === "" ? null : normalizedPriceRaw);
    return {
      ...item,
      title: normalizedTitle ? toTitleCaseWords(normalizedTitle) : "",
      category: String(item.category || fallbackCategory).trim(),
      price: normalizedPrice,
      additionalImages: Array.isArray(item.additionalImages)
        ? item.additionalImages.map((entry) => normalizeAdditionalImageRecord(entry)).filter(Boolean)
        : []
    };
  };

  const directItems = Array.isArray(payload?.items) ? payload.items : null;
  if (directItems) {
    return directItems
      .map((item) => normalizeGalleryItemRecord(item))
      .filter(Boolean);
  }

  const categories = Array.isArray(payload?.categories) ? payload.categories : [];
  if (!categories.length) return [];

  const flattened = [];
  categories.forEach((categoryEntry) => {
    const fallbackCategory = String(categoryEntry?.name || categoryEntry?.key || "").trim();
    const categoryItems = Array.isArray(categoryEntry?.items)
      ? categoryEntry.items
      : (Array.isArray(categoryEntry?.products) ? categoryEntry.products : []);
    categoryItems.forEach((item) => {
      const normalized = normalizeGalleryItemRecord(item, fallbackCategory);
      if (!normalized) return;
      flattened.push(normalized);
    });
  });
  return flattened;
}

function renderHomePortfolioCards(categories = []) {
  const gallerySection = document.getElementById("gallery");
  if (!(gallerySection instanceof HTMLElement)) return;
  const portfolioGrid = gallerySection.querySelector(".portfolio-grid");
  const requestWrap = gallerySection.querySelector(".portfolio-request-wrap");
  if (!(portfolioGrid instanceof HTMLElement)) return;

  const source = Array.isArray(categories) && categories.length ? categories : galleryCategoryMeta;
  const homeCards = source
    .filter((item) => item && item.showOnHome !== false && normalizeGalleryCategory(item.key) !== "by-request")
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (homeCards.length) {
    const cardsMarkup = homeCards.map((item) => {
      const categoryLabel = String(item.name || item.key || "Category").trim();
      const categoryParam = String(item.key || item.name || "").trim();
      const coverImage = String(item.coverImage || GALLERY_CATEGORY_COVER_IMAGES[categoryLabel] || "").trim();
      return `
        <a class="portfolio-card" href="gallery.html?category=${encodeURIComponent(categoryParam)}" aria-label="Open ${escapeHTML(categoryLabel)} portfolio">
          <div class="portfolio-thumb">
            ${coverImage
              ? `<img src="${escapeHTML(coverImage)}" alt="${escapeHTML(categoryLabel)} portfolio cover" loading="lazy" decoding="async">`
              : '<div class="category-cover-placeholder" aria-hidden="true"></div>'}
          </div>
          <span class="portfolio-title">${escapeHTML(categoryLabel)}</span>
        </a>
      `;
    }).join("");
    const totalCards = String(homeCards.length).padStart(2, "0");
    portfolioGrid.innerHTML = `
      <div class="portfolio-carousel-head">
        <div class="portfolio-progress" data-portfolio-progress>01 / 03</div>
        <div class="portfolio-nav" aria-label="Portfolio carousel controls">
          <button class="portfolio-arrow" type="button" data-portfolio-prev aria-label="Scroll portfolio categories left">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6"></path></svg>
          </button>
          <button class="portfolio-arrow" type="button" data-portfolio-next aria-label="Scroll portfolio categories right">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
          </button>
        </div>
      </div>
      <div class="portfolio-viewport" data-portfolio-viewport>
        <div class="portfolio-track">
          ${cardsMarkup}
        </div>
      </div>
    `;
  }

  if (requestWrap instanceof HTMLElement) {
    const requestCategory = source.find((item) => normalizeGalleryCategory(item?.key || item?.name) === "by-request");
    const requestLink = requestWrap.querySelector(".portfolio-request-btn");
    if (requestWrap instanceof HTMLElement) {
      requestWrap.hidden = true;
    }
    if (requestLink instanceof HTMLAnchorElement && requestCategory) {
      requestLink.href = "https://wa.me/6281275017456?text=Hello%20Marvell%20Florist%2C%20I%20would%20like%20to%20consult%20about%20an%20arrangement.";
    }
  }

  initializePortfolioFade();
  initializeHomePortfolioCarousel();
}

function applyPortfolioCategoryConfig(payload = {}) {
  const records = Array.isArray(payload?.categories) ? payload.categories : [];
  const normalized = records
    .map((entry, index) => normalizePortfolioCategoryRecord(entry, index))
    .filter((entry) => Boolean(entry))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!normalized.length) {
    renderHomePortfolioCards(galleryCategoryMeta);
    return;
  }

  const galleryVisible = normalized.filter((entry) => entry.showInGallery !== false);
  if (galleryVisible.length) {
    galleryCategoryMeta.splice(0, galleryCategoryMeta.length, ...galleryVisible);
  }

  Object.keys(GALLERY_CATEGORY_COVER_IMAGES).forEach((key) => {
    delete GALLERY_CATEGORY_COVER_IMAGES[key];
  });
  normalized.forEach((entry) => {
    if (entry.coverImage) GALLERY_CATEGORY_COVER_IMAGES[entry.name] = entry.coverImage;
  });

  renderHomePortfolioCards(normalized);
  renderGalleryNavMenu();
}

let galleryCatalogGrouped = new Map();
let activeGalleryCategoryName = "";
let galleryProductsGridElement = null;
let galleryRenderProductsForCategory = null;

function setActiveGalleryCategory(categoryName, shouldScrollGrid = false) {
  const targetMeta = galleryCategoryMeta.find(
    (meta) => normalizeGalleryCategory(meta.name) === normalizeGalleryCategory(categoryName)
  );
  if (!targetMeta || typeof galleryRenderProductsForCategory !== "function") return false;
  activeGalleryCategoryName = targetMeta.name;
  galleryCategories.forEach((card) => {
    if (!(card instanceof HTMLElement)) return;
    const isActive = normalizeGalleryCategory(card.dataset.categoryName) === normalizeGalleryCategory(targetMeta.name);
    card.classList.toggle("is-active", isActive);
    card.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  galleryRenderProductsForCategory(targetMeta.name);
  if (shouldScrollGrid && galleryProductsGridElement instanceof HTMLElement) {
    galleryProductsGridElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return true;
}

function normalizeGalleryCategory(value) {
  return String(value || "").trim().toLowerCase();
}

function openGalleryCategoryFromNav(categoryName) {
  const normalizedTarget = normalizeGalleryCategory(categoryName);
  if (!normalizedTarget) return false;
  const targetMeta = galleryCategoryMeta.find((meta) => normalizeGalleryCategory(meta.name) === normalizedTarget);
  if (!targetMeta) return false;
  if (!galleryList || !galleryList.querySelector(".gallery-catalog-slider")) return false;
  setActiveGalleryCategory(targetMeta.name, true);
  const targetCard = galleryList.querySelector(`.gallery-catalog-card[data-category-name="${CSS.escape(targetMeta.name)}"]`);
  if (targetCard instanceof HTMLElement) {
    targetCard.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
  return true;
}

function renderGalleryNavMenu() {
  if (!galleryNavMenu) return;
  const itemsMarkup = galleryCategoryMeta.map((meta) => `
    <li><a href="gallery.html?category=${encodeURIComponent(meta.name)}">${escapeHTML(meta.cardTitle || meta.name)}</a></li>
  `).join("");
  galleryNavMenu.innerHTML = itemsMarkup;
}
renderGalleryNavMenu();

function initializePortfolioFade() {
  const cards = Array.from(document.querySelectorAll(".portfolio-card"));
  if (!cards.length) return;
  const viewport = document.querySelector(".portfolio-viewport");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || typeof IntersectionObserver === "undefined") {
    cards.forEach((card) => card.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      cards.forEach((card) => {
        card.style.transitionDelay = "0ms";
        card.classList.add("is-visible");
      });
      if (viewport instanceof HTMLElement) obs.unobserve(viewport);
    });
  }, { threshold: 0.28 });

  if (viewport instanceof HTMLElement) observer.observe(viewport);
  else cards.forEach((card) => card.classList.add("is-visible"));
}

function initializeHomePortfolioCarousel() {
  const portfolioViewport = document.querySelector("[data-portfolio-viewport]");
  const portfolioCards = Array.from(document.querySelectorAll(".portfolio-card"));
  const portfolioPrev = document.querySelector("[data-portfolio-prev]");
  const portfolioNext = document.querySelector("[data-portfolio-next]");
  const portfolioProgress = document.querySelector("[data-portfolio-progress]");
  if (!(portfolioViewport instanceof HTMLElement) || !portfolioCards.length) return;

  const updatePortfolioCarousel = () => {
    const viewportLeft = portfolioViewport.scrollLeft;
    const maxScroll = Math.max(portfolioViewport.scrollWidth - portfolioViewport.clientWidth, 0);
    const baseCard = portfolioCards[0];
    const gap = portfolioCards.length > 1
      ? portfolioCards[1].offsetLeft - portfolioCards[0].offsetLeft - portfolioCards[0].offsetWidth
      : 18;
    const stepWidth = (baseCard?.offsetWidth || 304) + Math.max(gap, 18);
    const visibleCards = Math.max(1, Math.round(portfolioViewport.clientWidth / Math.max(stepWidth, 1)));
    const totalPages = Math.max(1, portfolioCards.length - visibleCards + 1);
    let activeIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    portfolioCards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - viewportLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });

    if (portfolioProgress instanceof HTMLElement) {
      const currentPage = Math.min(totalPages, Math.max(1, Math.round(viewportLeft / Math.max(stepWidth, 1)) + 1));
      const current = String(currentPage).padStart(2, "0");
      const total = String(totalPages).padStart(2, "0");
      portfolioProgress.textContent = `${current} / ${total}`;
    }

    if (portfolioPrev instanceof HTMLButtonElement) portfolioPrev.disabled = viewportLeft <= 8;
    if (portfolioNext instanceof HTMLButtonElement) portfolioNext.disabled = viewportLeft >= maxScroll - 8;
  };

  const scrollPortfolio = (direction) => {
    const baseCard = portfolioCards[0];
    const gap = portfolioCards.length > 1
      ? portfolioCards[1].offsetLeft - portfolioCards[0].offsetLeft - portfolioCards[0].offsetWidth
      : 18;
    const amount = baseCard.offsetWidth + Math.max(gap, 18);
    portfolioViewport.scrollBy({ left: amount * direction, behavior: "smooth" });
  };

  if (portfolioViewport.dataset.carouselBound !== "1") {
    portfolioViewport.dataset.carouselBound = "1";
    portfolioViewport.addEventListener("scroll", updatePortfolioCarousel, { passive: true });
    window.addEventListener("resize", updatePortfolioCarousel);
    portfolioPrev?.addEventListener("click", () => scrollPortfolio(-1));
    portfolioNext?.addEventListener("click", () => scrollPortfolio(1));
  }

  updatePortfolioCarousel();
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatRupiah(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const numeric = Number(raw.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) return "";
  return `Rp${new Intl.NumberFormat("id-ID").format(Math.round(numeric))}`;
}

function buildConsultHref(phone, text) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

let galleryRevealObserver = null;
const GALLERY_REVEAL_ENTER_RATIO = 0.18;
const GALLERY_REVEAL_EXIT_RATIO = 0.01;
const GALLERY_REVEAL_EXIT_BUFFER = 0.22;

function isRevealFarOutsideViewport(entry) {
  if (!entry) return true;
  const bounds = entry.rootBounds;
  if (!bounds) return !entry.isIntersecting;
  const buffer = bounds.height * GALLERY_REVEAL_EXIT_BUFFER;
  return (
    entry.boundingClientRect.bottom < bounds.top - buffer ||
    entry.boundingClientRect.top > bounds.bottom + buffer
  );
}

function ensureGalleryRevealObserver() {
  if (galleryRevealObserver || typeof IntersectionObserver === "undefined") return galleryRevealObserver;
  galleryRevealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      const target = entry.target;
      if (!(target instanceof HTMLElement)) return;
      const isVisibleEnough = entry.isIntersecting && entry.intersectionRatio >= GALLERY_REVEAL_ENTER_RATIO;
      const isRevealed = target.classList.contains("is-revealed");
      const revealOnce = target.dataset.revealOnce === "1";
      if (revealOnce) {
        if (!isVisibleEnough) return;
        target.classList.add("is-revealed");
        observer.unobserve(target);
        return;
      }

      if (!isRevealed) {
        if (isVisibleEnough) target.classList.add("is-revealed");
        return;
      }

      const shouldKeepVisible =
        entry.isIntersecting || entry.intersectionRatio > GALLERY_REVEAL_EXIT_RATIO || !isRevealFarOutsideViewport(entry);
      if (!shouldKeepVisible) target.classList.remove("is-revealed");
    });
  }, {
    threshold: [0, GALLERY_REVEAL_EXIT_RATIO, GALLERY_REVEAL_ENTER_RATIO, 0.35, 0.6],
    root: null,
    rootMargin: "0px 0px 20% 0px"
  });
  return galleryRevealObserver;
}

function prepareGalleryRevealItem(element, delayMs, observer, revealOnce = false) {
  if (!(element instanceof HTMLElement)) return;
  if (element.dataset.revealPrepared === "1") return;
  element.dataset.revealPrepared = "1";
  if (revealOnce) element.dataset.revealOnce = "1";
  element.style.setProperty("--reveal-delay", `${Math.max(delayMs, 0)}ms`);
  element.classList.add("gallery-reveal-item");
  if (observer) observer.observe(element);
  else element.classList.add("is-revealed");
}

function initializeGalleryRevealAnimations() {
  if (!gallerySection) return;
  const observer = ensureGalleryRevealObserver();

  const headingTargets = [
    gallerySection.querySelector(".section-content > h1"),
    gallerySection.querySelector(".gallery-lead")
  ];
  headingTargets.forEach((element, index) => {
    prepareGalleryRevealItem(element, index * 120, observer);
  });

  const panelTargets = Array.from(
    gallerySection.querySelectorAll(".gallery-catalog-card, .gallery-product-card")
  );
  panelTargets.forEach((item, index) => {
    prepareGalleryRevealItem(item, (index % 8) * 80, observer);
  });
}

function initializeGlobalTextRevealAnimations() {
  const observer = ensureGalleryRevealObserver();
  const isMobileServicesCarousel = window.matchMedia("(max-width: 768px)").matches;
  const textTargets = Array.from(document.querySelectorAll([
    "#home .section-content h1",
    "#home .section-content p",
    "#featured .section-content h1",
    "#featured .featured-lead",
    "#services .contact-intro"
  ].join(", ")));
  textTargets.forEach((item, index) => {
    prepareGalleryRevealItem(item, (index % 8) * 120, observer);
  });

  if (isMobileServicesCarousel) {
    const servicesCarouselTargets = Array.from(document.querySelectorAll([
      "#services .services-grid",
      "#services .services-carousel-dots"
    ].join(", ")));
    servicesCarouselTargets.forEach((item) => {
      prepareGalleryRevealItem(item, 0, observer, true);
    });
  } else {
    const servicesCardTargets = Array.from(document.querySelectorAll("#services .service-card"));
    servicesCardTargets.forEach((item, index) => {
      prepareGalleryRevealItem(item, index * 120, observer, true);
    });
  }

  const contactCardTextTargets = Array.from(document.querySelectorAll([
    "#services .contact-card-title",
    "#services .contact-card-desc",
    "#services .contact-card-overlay .contact-card-label"
  ].join(", ")));
  contactCardTextTargets.forEach((item, index) => {
    prepareGalleryRevealItem(item, (index % 6) * 110, observer, true);
  });

  const reviewsTargets = Array.from(document.querySelectorAll([
    "#reviews .section-content > h1",
    "#reviews .reviews-header",
    "#reviews .review-slide",
    "#reviews .reviews-footer"
  ].join(", ")));
  reviewsTargets.forEach((item, index) => {
    prepareGalleryRevealItem(item, (index % 5) * 90, observer);
  });
}

function buildStaticReviewStars(ratingValue) {
  const rating = clamp(Math.round(Number(ratingValue) || 0), 0, 5);
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

function buildReviewCardMarkup(entry) {
  const safeName = escapeHTML(entry?.name || "Google Reviewer");
  const reviewText = String(entry?.text || "").trim();
  const safeText = reviewText ? escapeHTML(reviewText) : "";
  return `
    <div class="review-card-head">
      <p class="review-author">${safeName}</p>
    </div>
    ${safeText ? `<p class="review-text" data-review-text="${safeText}">&ldquo;${safeText}&rdquo;</p>` : ""}
  `;
}

function stopReviewsAutoShuffle() {
  if (reviewsAutoShuffleTimer) {
    window.clearTimeout(reviewsAutoShuffleTimer);
    reviewsAutoShuffleTimer = 0;
  }
}

function stopReviewsMobileLoop() {
  if (reviewsMobileLoopTimer) {
    window.clearTimeout(reviewsMobileLoopTimer);
    reviewsMobileLoopTimer = 0;
  }
  if (reviewsMobileLoopPauseTimer) {
    window.clearTimeout(reviewsMobileLoopPauseTimer);
    reviewsMobileLoopPauseTimer = 0;
  }
}

function setReviewTextMarkup(textElement, text) {
  if (!(textElement instanceof HTMLElement)) return;
  const normalized = String(text || "").trim();
  if (!normalized) {
    textElement.textContent = "";
    return;
  }
  textElement.innerHTML = `&ldquo;${escapeHTML(normalized)}&rdquo;`;
}

/**
 * Shows the review. All of it.
 *
 * This used to drop sentences off the end, one at a time, until what was left
 * fitted the height measured from the tallest review — so the tallest review
 * was the one thing guaranteed not to fit, and it ended in "..." on a card
 * with room to spare beside it. Somebody took the trouble to write it; the
 * card is a floor now, not a ceiling (see --reviews-card-min-height in
 * index.html), so it grows instead and every card in the row grows with it.
 */
function fitReviewCardText(card) {
  if (!(card instanceof HTMLElement)) return;
  const textElement = card.querySelector(".review-text");
  if (!(textElement instanceof HTMLElement)) return;
  const fullText = String(textElement.dataset.reviewText || "").trim();
  if (!fullText) return;
  setReviewTextMarkup(textElement, fullText);
}

function fitVisibleReviewCards() {
  const cards = reviewsAutoShuffleSlots.length
    ? reviewsAutoShuffleSlots
    : Array.from(document.querySelectorAll("#reviews .review-card"));
  cards.forEach((card) => fitReviewCardText(card));
}

function requestReviewsAutoShuffleLayoutSync() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      syncReviewsAutoShuffleLayout();
    });
  });
}

function getReviewsColumns() {
  if (window.matchMedia("(max-width: 768px)").matches) return 1;
  if (window.matchMedia("(max-width: 1024px)").matches) return 2;
  return 3;
}

function shouldUseMobileReviewsLoop() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function syncReviewsAutoShuffleLayout() {
  if (!(reviewsViewport instanceof HTMLElement) || !reviewsAutoShuffleSource.length) return;
  const viewportWidth = reviewsViewport.clientWidth || reviewsTrack?.clientWidth || 0;
  if (!viewportWidth) return;
  const reviewsCarouselElement = reviewsViewport.closest(".reviews-carousel");
  const reviewsSectionContent = reviewsSection?.querySelector(".section-content");

  const slide = reviewsTrack?.querySelector(".review-slide");
  const slideStyles = slide ? window.getComputedStyle(slide) : null;
  const gap = slideStyles ? parseFloat(slideStyles.rowGap || slideStyles.gap || "16") || 16 : 16;
  const columns = getReviewsColumns();
  const isSingleColumn = columns === 1;
  const renderedCard = reviewsTrack?.querySelector(".review-card");
  const renderedCardWidth = renderedCard instanceof HTMLElement ? renderedCard.getBoundingClientRect().width : 0;
  const cardWidth = Math.max(isSingleColumn && renderedCardWidth ? renderedCardWidth : ((viewportWidth - (gap * (columns - 1))) / columns), 120);

  const measureWrap = document.createElement("div");
  measureWrap.style.position = "absolute";
  measureWrap.style.left = "-99999px";
  measureWrap.style.top = "0";
  measureWrap.style.width = `${cardWidth}px`;
  measureWrap.style.visibility = "hidden";
  measureWrap.style.pointerEvents = "none";
  measureWrap.style.contain = "layout style";
  document.body.appendChild(measureWrap);

  let maxCardHeight = 0;
  reviewsAutoShuffleSource.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "review-card";
    card.style.minHeight = "0";
    card.style.height = "auto";
    card.innerHTML = buildReviewCardMarkup(entry);
    measureWrap.appendChild(card);
    maxCardHeight = Math.max(maxCardHeight, Math.ceil(card.getBoundingClientRect().height));
    measureWrap.removeChild(card);
  });

  measureWrap.remove();

  const safeCardHeight = Math.max(maxCardHeight, isSingleColumn ? 132 : 132);
  const slideHeight = safeCardHeight;

  const targets = [
    reviewsSection,
    reviewsSectionContent,
    reviewsCarouselElement,
    reviewsViewport,
    reviewsTrack,
    slide
  ];
  targets.forEach((target) => {
    if (!(target instanceof HTMLElement)) return;
    target.style.setProperty("--reviews-card-min-height", `${safeCardHeight}px`);
    target.style.setProperty("--reviews-slide-min-height", `${slideHeight}px`);
  });
  fitVisibleReviewCards();
}

function scheduleNextReviewsAutoShuffle(delayMs = 3600) {
  stopReviewsAutoShuffle();
  reviewsAutoShuffleTimer = window.setTimeout(runReviewsAutoShuffleStep, delayMs);
}

function runReviewsAutoShuffleStep() {
  if (!reviewsAutoShuffleSlots.length) return;
  const slot = reviewsAutoShuffleSlots[reviewsAutoShuffleStep];
  if (!(slot instanceof HTMLElement)) return;

  slot.classList.add("is-shuffling");
  window.setTimeout(() => {
    const nextEntry = reviewsAutoShuffleSource[reviewsAutoShuffleCursor % reviewsAutoShuffleSource.length];
    reviewsAutoShuffleCursor += 1;
    slot.innerHTML = buildReviewCardMarkup(nextEntry);
    requestReviewsAutoShuffleLayoutSync();
    slot.classList.remove("is-shuffling");

    if (reviewsAutoShuffleSlots.length > 1) {
      if (reviewsAutoShuffleDirection > 0 && reviewsAutoShuffleStep >= reviewsAutoShuffleSlots.length - 1) {
        reviewsAutoShuffleDirection = -1;
      } else if (reviewsAutoShuffleDirection < 0 && reviewsAutoShuffleStep <= 0) {
        reviewsAutoShuffleDirection = 1;
      }
      reviewsAutoShuffleStep = clamp(reviewsAutoShuffleStep + reviewsAutoShuffleDirection, 0, reviewsAutoShuffleSlots.length - 1);
    }

    scheduleNextReviewsAutoShuffle();
  }, 420);
}

function startReviewsAutoShuffle(selectedIndices) {
  stopReviewsAutoShuffle();
  reviewsAutoShuffleSlots = Array.from(document.querySelectorAll("#reviews .review-card"));
  if (reviewsAutoShuffleSlots.length <= 1 || reviewsAutoShuffleSource.length <= reviewsAutoShuffleSlots.length) return;

  requestReviewsAutoShuffleLayoutSync();
  if (!reviewsAutoShuffleResizeBound) {
    window.addEventListener("resize", requestReviewsAutoShuffleLayoutSync);
    window.addEventListener("load", requestReviewsAutoShuffleLayoutSync, { once: true });
    if (document.fonts && typeof document.fonts.ready?.then === "function") {
      document.fonts.ready.then(() => {
        requestReviewsAutoShuffleLayoutSync();
      }).catch(() => {});
    }
    reviewsAutoShuffleResizeBound = true;
  }

  reviewsAutoShuffleCursor = selectedIndices.length ? Math.max(...selectedIndices) + 1 : reviewsAutoShuffleSlots.length;
  reviewsAutoShuffleStep = 0;
  reviewsAutoShuffleDirection = 1;
  scheduleNextReviewsAutoShuffle(3200);
}

function scheduleNextReviewsMobileLoop(delayMs = 3400) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!(reviewsViewport instanceof HTMLElement) || reviewsMobileLoopUniqueCount <= 1) return;
  if (reviewsMobileLoopTimer) window.clearTimeout(reviewsMobileLoopTimer);
  reviewsMobileLoopTimer = window.setTimeout(runReviewsMobileLoopStep, delayMs);
}

function updateReviewsMobileProgress() {
  const target = reviewsProgress;
  if (!(target instanceof HTMLElement)) return;
  if (!reviewsMobileLoopUniqueCount || !shouldUseMobileReviewsLoop()) {
    target.style.setProperty("--reviews-progress", "0");
    return;
  }
  const visibleIndex = reviewsMobileLoopIndex >= reviewsMobileLoopUniqueCount
    ? reviewsMobileLoopUniqueCount - 1
    : clamp(reviewsMobileLoopIndex, 0, reviewsMobileLoopUniqueCount - 1);
  const progress = (visibleIndex + 1) / reviewsMobileLoopUniqueCount;
  target.style.setProperty("--reviews-progress", progress.toFixed(4));
}

function scrollReviewsMobileLoopTo(index, behavior = "smooth") {
  if (!(reviewsViewport instanceof HTMLElement) || !(reviewsTrack instanceof HTMLElement)) return;
  const cards = Array.from(reviewsTrack.querySelectorAll(".review-card"));
  const card = cards[index];
  if (!(card instanceof HTMLElement)) return;
  const centeredLeft = card.offsetLeft - ((reviewsViewport.clientWidth - card.clientWidth) / 2);
  reviewsViewport.scrollTo({ left: Math.max(0, centeredLeft), behavior });
}

function runReviewsMobileLoopStep() {
  if (!(reviewsViewport instanceof HTMLElement) || reviewsMobileLoopUniqueCount <= 1) return;
  reviewsMobileLoopIndex += 1;
  updateReviewsMobileProgress();
  scrollReviewsMobileLoopTo(reviewsMobileLoopIndex, "smooth");

  if (reviewsMobileLoopIndex >= reviewsMobileLoopUniqueCount) {
    window.setTimeout(() => {
      reviewsMobileLoopIndex = 0;
      updateReviewsMobileProgress();
      scrollReviewsMobileLoopTo(0, "auto");
      scheduleNextReviewsMobileLoop();
    }, 620);
    return;
  }

  scheduleNextReviewsMobileLoop();
}

function pauseReviewsMobileLoop() {
  if (reviewsMobileLoopTimer) {
    window.clearTimeout(reviewsMobileLoopTimer);
    reviewsMobileLoopTimer = 0;
  }
  if (reviewsMobileLoopPauseTimer) window.clearTimeout(reviewsMobileLoopPauseTimer);
  reviewsMobileLoopPauseTimer = window.setTimeout(() => {
    reviewsMobileLoopPauseTimer = 0;
    scheduleNextReviewsMobileLoop(2200);
  }, 2600);
}

function bindReviewsMobileLoopControls() {
  if (reviewsMobileLoopBound || !(reviewsViewport instanceof HTMLElement)) return;
  reviewsMobileLoopBound = true;
  reviewsViewport.addEventListener("pointerdown", pauseReviewsMobileLoop, { passive: true });
  reviewsViewport.addEventListener("touchstart", pauseReviewsMobileLoop, { passive: true });
  reviewsViewport.addEventListener("wheel", pauseReviewsMobileLoop, { passive: true });
  reviewsViewport.addEventListener("scroll", () => {
    if (!shouldUseMobileReviewsLoop() || !reviewsMobileLoopUniqueCount) return;
    if (reviewsMobileLoopTimer) return;
    const cards = Array.from(reviewsTrack?.querySelectorAll(".review-card") || []).slice(0, reviewsMobileLoopUniqueCount);
    let closestIndex = reviewsMobileLoopIndex;
    let closestDistance = Infinity;
    cards.forEach((card, index) => {
      if (!(card instanceof HTMLElement)) return;
      const distance = Math.abs(card.offsetLeft - reviewsViewport.scrollLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    reviewsMobileLoopIndex = closestIndex;
    updateReviewsMobileProgress();
  }, { passive: true });
}

function startReviewsMobileLoop() {
  stopReviewsMobileLoop();
  reviewsAutoShuffleSlots = Array.from(document.querySelectorAll("#reviews .review-card"));
  reviewsMobileLoopUniqueCount = Math.floor(reviewsAutoShuffleSlots.length / 2);
  reviewsMobileLoopIndex = 0;
  requestReviewsAutoShuffleLayoutSync();
  bindReviewsMobileLoopControls();
  updateReviewsMobileProgress();
  window.requestAnimationFrame(() => scrollReviewsMobileLoopTo(0, "auto"));
  scheduleNextReviewsMobileLoop(2600);
}

function updateReviewsCarouselState() {
  if (!reviewsTrack) return;
  reviewsTrack.style.transform = `translate3d(${-reviewsPageIndex * 100}%, 0, 0)`;
  if (reviewsPrevButton) reviewsPrevButton.disabled = reviewsPageIndex <= 0;
  if (reviewsNextButton) reviewsNextButton.disabled = reviewsPageIndex >= Math.max(reviewsPageCount - 1, 0);
}

function initializeReviewsCarousel() {
  if (!reviewsTrack) return;
  stopReviewsAutoShuffle();
  stopReviewsMobileLoop();
  reviewsResponsiveModeWasMobile = shouldUseMobileReviewsLoop();
  const reviewsHeadline = document.querySelector("#reviews .reviews-headline");
  const reviewsMetaLine = document.querySelector("#reviews .reviews-meta-line");
  if (reviewsHeadline) {
    const ratingLine = reviewsHeadline.querySelector(".reviews-rating-line");
    if (ratingLine instanceof HTMLElement) ratingLine.textContent = "Rated 5.0 on Google";
  }
  if (reviewsMetaLine) {
    reviewsMetaLine.textContent = "From our valued customers.";
  }

  const quotedReviews = reviews.filter((entry) => String(entry?.text || "").trim().length > 0);
  const source = quotedReviews.length ? quotedReviews : reviews;
  reviewsAutoShuffleSource = source.slice();
  if (!shouldUseMobileReviewsLoop()) updateReviewsMobileProgress();
  let rotationSeed = 0;
  try {
    rotationSeed = Number(sessionStorage.getItem("reviews-mobile-quote-rotation") || "0") || 0;
    sessionStorage.setItem("reviews-mobile-quote-rotation", String(rotationSeed + 1));
  } catch (_error) {
    rotationSeed = 0;
  }

  if (shouldUseMobileReviewsLoop()) {
    const rotatedSource = source.map((_, index) => source[(rotationSeed + index) % source.length]);
    reviewsTrack.innerHTML = `
      <div class="review-slide">
        ${rotatedSource.concat(rotatedSource).map((entry) => {
          return `
            <article class="review-card">
              ${buildReviewCardMarkup(entry)}
            </article>
          `;
        }).join("")}
      </div>
    `;
    markNoSmudgeTargets(reviewsTrack);
    startReviewsMobileLoop();
    return;
  }

  const selected = [];
  const selectedIndices = [];
  const targetCount = Math.min(getReviewsColumns(), source.length);
  for (let index = 0; index < targetCount; index += 1) {
    const sourceIndex = (rotationSeed + index) % source.length;
    selected.push(source[sourceIndex]);
    selectedIndices.push(sourceIndex);
  }

  reviewsTrack.innerHTML = `
    <div class="review-slide">
      ${selected.map((entry) => {
        return `
          <article class="review-card">
            ${buildReviewCardMarkup(entry)}
          </article>
        `;
      }).join("")}
    </div>
  `;
  markNoSmudgeTargets(reviewsTrack);
  requestReviewsAutoShuffleLayoutSync();
  startReviewsAutoShuffle(selectedIndices);
}

function scheduleReviewsResponsiveModeCheck() {
  if (reviewsResponsiveModeTimer) window.clearTimeout(reviewsResponsiveModeTimer);
  reviewsResponsiveModeTimer = window.setTimeout(() => {
    reviewsResponsiveModeTimer = 0;
    const isMobileMode = shouldUseMobileReviewsLoop();
    if (reviewsResponsiveModeWasMobile === null) {
      reviewsResponsiveModeWasMobile = isMobileMode;
      return;
    }
    if (isMobileMode !== reviewsResponsiveModeWasMobile) {
      initializeReviewsCarousel();
      return;
    }
    requestReviewsAutoShuffleLayoutSync();
  }, 180);
}


function renderGalleryFromData(data) {
  if (!galleryList) return;
  const items = extractGalleryItems(data);
  const grouped = new Map();
  const normalizeCategoryKey = (value) => String(value || "").trim().toLowerCase();
  const toSlug = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  galleryCategoryMeta.forEach((meta) => grouped.set(meta.name, []));
  items.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const normalizedItemCategory = normalizeCategoryKey(item.category);
    const normalizedCategory = galleryCategoryMeta.find((meta) => {
      const metaKeys = [meta.name, ...(Array.isArray(meta.aliases) ? meta.aliases : [])]
        .map((value) => normalizeCategoryKey(value));
      return metaKeys.includes(normalizedItemCategory);
    })?.name;
    if (!normalizedCategory) return;
    grouped.get(normalizedCategory).push(item);
  });
  galleryCatalogGrouped = grouped;

  const resolveCategoryCover = (meta) => {
    const explicitCover = String(meta?.coverImage || GALLERY_CATEGORY_COVER_IMAGES[meta.name] || "").trim();
    return explicitCover;
  };

  const sliderMarkup = galleryCategoryMeta.map((meta) => {
    const displayCategoryName = meta.cardTitle || meta.name;
    const coverImage = resolveCategoryCover(meta);
    const safeCover = escapeHTML(coverImage || "");
    const categoryPageHref = `gallery.html?category=${encodeURIComponent(toSlug(meta.name) || meta.name)}`;
    return `
      <a class="gallery-catalog-card" href="${categoryPageHref}" data-category-name="${escapeHTML(meta.name)}" aria-label="Open ${escapeHTML(displayCategoryName)} collection page">
        ${safeCover ? `<img src="${safeCover}" alt="${escapeHTML(displayCategoryName)} category cover" loading="lazy" decoding="async">` : '<div class="category-cover-placeholder" aria-hidden="true"></div>'}
        <span class="gallery-catalog-card-title">${escapeHTML(displayCategoryName)}</span>
      </a>
    `;
  }).join("");

  galleryList.innerHTML = `
    <div class="gallery-catalog-slider" id="gallery-category-slider">${sliderMarkup}</div>
    <div class="gallery-products-grid" id="gallery-products-grid"></div>
  `;

  const productsGrid = galleryList.querySelector("#gallery-products-grid");
  galleryProductsGridElement = productsGrid instanceof HTMLElement ? productsGrid : null;
  const renderProductsForCategory = (categoryName) => {
    if (!(galleryProductsGridElement instanceof HTMLElement)) return;
    const categoryItems = grouped.get(categoryName) || [];
    const categoryMeta = galleryCategoryMeta.find((meta) => meta.name === categoryName);
    if (!categoryMeta) return;
    const displayCategoryName = categoryMeta.cardTitle || categoryMeta.name;

    if (!categoryItems.length) {
      galleryProductsGridElement.innerHTML = '<p class="gallery-products-empty">This collection will be updated soon.</p>';
      return;
    }

    const productCardsMarkup = categoryItems.map((item, itemIndex) => {
      const productName = String(item.title || item.name || "Produk").trim();
      const safeName = escapeHTML(productName);
      const safePrice = formatRupiah(item.price);
      const safeImage = escapeHTML(item.image || "");
      const categorySlug = toSlug(displayCategoryName) || "kategori";
      const productSlugBase = toSlug(`${productName}-${itemIndex + 1}`) || `produk-${itemIndex + 1}`;
      const productAnchorId = `product-${categorySlug}-${productSlugBase}`;
      return `
        <article class="gallery-product-card" id="${escapeHTML(productAnchorId)}">
          ${safeImage ? `<img src="${safeImage}" alt="${safeName}" loading="lazy" decoding="async">` : '<div class="category-cover-placeholder" aria-hidden="true"></div>'}
          <div class="gallery-product-overlay">
            <p class="gallery-product-name">${safeName}</p>
            ${safePrice ? `<p class="gallery-product-price">${safePrice}</p>` : ""}
          </div>
        </article>
      `;
    }).join("");

    galleryProductsGridElement.innerHTML = productCardsMarkup;
    markNoSmudgeTargets(galleryProductsGridElement);
    initializeGalleryRevealAnimations();
  };
  galleryRenderProductsForCategory = renderProductsForCategory;
  galleryCategories = Array.from(galleryList.querySelectorAll(".gallery-catalog-card"));
  galleryCategories.forEach((card) => {
    card.setAttribute("aria-pressed", "false");
  });

  const defaultCategory = galleryCategoryMeta.find((meta) => (grouped.get(meta.name) || []).length > 0)?.name || galleryCategoryMeta[0]?.name || "";
  if (defaultCategory) setActiveGalleryCategory(defaultCategory, false);

  markNoSmudgeTargets(galleryList);
  initializeGalleryRevealAnimations();
  if (pendingGalleryCategoryFromNav) {
    if (openGalleryCategoryFromNav(pendingGalleryCategoryFromNav)) pendingGalleryCategoryFromNav = "";
  }
}

if (hasFinePointer) {
  if (cursorHalo) {
    window.addEventListener("mousemove", (event) => {
      haloPointerInside = true;
      haloTargetX = event.clientX;
      haloTargetY = event.clientY;
      lastCursorMoveAt = Date.now();
    });
    window.addEventListener("mouseleave", () => {
      haloPointerInside = false;
    });
    window.addEventListener("blur", () => {
      haloPointerInside = false;
    });
  }

  sections.forEach((section) => {
    section.addEventListener("mousemove", (event) => {
      const rect = section.getBoundingClientRect();
      const nx = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      const ny = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      const current = state.get(section);
      if (!current) return;
      if (section.id === "home") {
        const deadZone = 0.06;
        const nxAbs = Math.abs(nx);
        const nyAbs = Math.abs(ny);
        const nxNorm = nxAbs <= deadZone ? 0 : (nxAbs - deadZone) / (1 - deadZone);
        const nyNorm = nyAbs <= deadZone ? 0 : (nyAbs - deadZone) / (1 - deadZone);
        const edgeCurveX = Math.pow(nxNorm, 1.85);
        const edgeCurveY = Math.pow(nyNorm, 1.85);
        current.mouseTargetX = Math.sign(nx) * edgeCurveX * 48;
        current.mouseTargetY = Math.sign(ny) * edgeCurveY * 56;
      } else {
        current.mouseTargetX = nx * 14;
        current.mouseTargetY = ny * 10;
      }
    });

    section.addEventListener("mouseleave", () => {
      const current = state.get(section);
      if (!current) return;
      current.mouseTargetX = 0;
      current.mouseTargetY = 0;
    });
  });
}

function getOpenPanelHeight() {
  if (window.innerWidth <= 768) {
    return Math.round(Math.min(520, Math.max(340, window.innerHeight * 0.58)));
  }
  return Math.round(Math.min(760, Math.max(480, window.innerHeight * 0.68)));
}

function updateGalleryOpenState() {
  const hasOpen = Array.from(galleryCategories).some((item) => item.classList.contains("is-open"));
  let isGalleryInView = false;
  if (gallerySection) {
    const rect = gallerySection.getBoundingClientRect();
    isGalleryInView = rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.4;
  }
  document.body.classList.toggle("gallery-open", hasOpen && isGalleryInView);
}

function initializeGalleryInteractions() {
  let stopAllCategoryPreviews = () => {};
  const hasAnyOpenCategory = () => galleryCategories.some((item) => item.classList.contains("is-open"));

  galleryCategories.forEach((category, index) => {
    const toggle = category.querySelector(".category-toggle");
    const panel = category.querySelector(".category-panel");
    if (!toggle || !panel) return;

    const panelId = `gallery-panel-${index + 1}`;
    panel.id = panelId;
    toggle.setAttribute("aria-controls", panelId);
    toggle.setAttribute("aria-expanded", "false");
    panel.style.maxHeight = "0px";

    toggle.addEventListener("click", () => {
      const isOpen = category.classList.contains("is-open");

      galleryCategories.forEach((item) => {
        const itemToggle = item.querySelector(".category-toggle");
        const itemPanel = item.querySelector(".category-panel");
        const activeItems = item.querySelectorAll(".masonry-item.is-active");
        item.classList.remove("is-open");
        if (itemToggle) itemToggle.setAttribute("aria-expanded", "false");
        if (itemPanel) itemPanel.style.maxHeight = "0px";
        activeItems.forEach((active) => active.classList.remove("is-active"));
      });

      if (!isOpen) {
        category.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        requestAnimationFrame(() => {
          const targetHeight = Math.min(panel.scrollHeight, getOpenPanelHeight());
          panel.style.maxHeight = `${targetHeight}px`;
        });
      }

      updateGalleryOpenState();
      if (hasAnyOpenCategory()) stopAllCategoryPreviews();
    });
  });

  window.addEventListener("resize", () => {
    galleryCategories.forEach((category) => {
      const panel = category.querySelector(".category-panel");
      if (!panel) return;
      if (category.classList.contains("is-open")) {
        const targetHeight = Math.min(panel.scrollHeight, getOpenPanelHeight());
        panel.style.maxHeight = `${targetHeight}px`;
      }
    });
    updateGalleryOpenState();
  });

  window.addEventListener("scroll", updateGalleryOpenState, { passive: true });

  if (gallerySection) {
    const masonryItems = gallerySection.querySelectorAll(".masonry-item");
    masonryItems.forEach((item) => {
      item.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest(".design-consult-btn")) return;

        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        if (!isMobile) return;

        event.preventDefault();
        const panel = item.closest(".category-panel");
        if (!panel) return;

        panel.querySelectorAll(".masonry-item.is-active").forEach((active) => {
          if (active !== item) active.classList.remove("is-active");
        });
        item.classList.toggle("is-active");
      });
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".masonry-item")) return;
      gallerySection.querySelectorAll(".masonry-item.is-active").forEach((item) => {
        item.classList.remove("is-active");
      });
    });
  }

  const featuredCards = document.querySelectorAll(".featured-product-card");
  featuredCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = card.querySelector(".featured-product-link");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (target.closest("a")) return;
      window.location.href = link.href;
    });
  });
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(".featured-product-card")) return;
  });

  const canHoverPreview = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const previewTimers = new WeakMap();
  const previewStopHandlers = [];
  stopAllCategoryPreviews = () => {
    previewStopHandlers.forEach((stop) => stop());
  };
  galleryCategories.forEach((category) => {
    const coverElement = category.querySelector(".category-cover");
    const coverImage = coverElement ? coverElement.querySelector("img") : null;
    const panelImages = Array.from(category.querySelectorAll(".masonry-grid img"));
    if (!coverElement || !coverImage) return;

    const frames = Array.from(
      new Set([
        coverImage.getAttribute("src"),
        ...panelImages.map((img) => img.getAttribute("src"))
      ].filter(Boolean))
    ).slice(0, 5);

    if (frames.length < 2) return;
    coverElement.classList.add("has-crossfade");
    coverImage.classList.add("is-visible");

    let crossfadeImage = coverElement.querySelector("img[data-preview-layer='secondary']");
    if (!(crossfadeImage instanceof HTMLImageElement)) {
      crossfadeImage = document.createElement("img");
      crossfadeImage.setAttribute("data-preview-layer", "secondary");
      crossfadeImage.setAttribute("aria-hidden", "true");
      crossfadeImage.setAttribute("alt", "");
      crossfadeImage.setAttribute("decoding", "async");
      crossfadeImage.setAttribute("loading", "lazy");
      crossfadeImage.setAttribute("src", frames[0]);
      coverElement.appendChild(crossfadeImage);
    }

    let activeImage = coverImage;
    let idleImage = crossfadeImage;
    let frameIndex = 0;
    let randomQueue = [];
    let transitionTimer = null;
    let holdTimer = null;
    let holdTriggered = false;
    let isTransitioning = false;
    const CROSSFADE_MS = 360;
    const PREVIEW_INTERVAL_MS = 1200;

    const refillRandomQueue = () => {
      randomQueue = Array.from({ length: frames.length }, (_, index) => index);
      for (let i = randomQueue.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [randomQueue[i], randomQueue[j]] = [randomQueue[j], randomQueue[i]];
      }
      if (randomQueue[0] === frameIndex && randomQueue.length > 1) {
        [randomQueue[0], randomQueue[1]] = [randomQueue[1], randomQueue[0]];
      }
    };

    const nextRandomFrame = () => {
      if (!randomQueue.length) refillRandomQueue();
      return randomQueue.shift();
    };

    const clearPreviewInterval = () => {
      const timer = previewTimers.get(category);
      if (timer) {
        window.clearInterval(timer);
        previewTimers.delete(category);
      }
    };

    const renderFrame = (index, immediate = false) => {
      const nextSrc = frames[index];
      if (!nextSrc) return;
      if (transitionTimer) {
        window.clearTimeout(transitionTimer);
        transitionTimer = null;
      }
      if (immediate) {
        activeImage.setAttribute("src", nextSrc);
        idleImage.setAttribute("src", nextSrc);
        activeImage.classList.add("is-visible");
        idleImage.classList.remove("is-visible");
        isTransitioning = false;
        return;
      }
      if (isTransitioning || nextSrc === activeImage.getAttribute("src")) return;
      isTransitioning = true;
      idleImage.setAttribute("src", nextSrc);
      idleImage.classList.add("is-visible");
      activeImage.classList.remove("is-visible");
      transitionTimer = window.setTimeout(() => {
        const previousActive = activeImage;
        activeImage = idleImage;
        idleImage = previousActive;
        isTransitioning = false;
      }, CROSSFADE_MS + 40);
    };

    const stopPreview = () => {
      clearPreviewInterval();
      if (holdTimer) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      randomQueue = [];
      frameIndex = 0;
      renderFrame(0, true);
    };
    previewStopHandlers.push(stopPreview);

    const startPreview = () => {
      if (category.classList.contains("is-open") || hasAnyOpenCategory()) return;
      clearPreviewInterval();
      const timer = window.setInterval(() => {
        if (category.classList.contains("is-open") || hasAnyOpenCategory()) {
          stopPreview();
          return;
        }
        if (isTransitioning) return;
        frameIndex = nextRandomFrame();
        renderFrame(frameIndex, false);
      }, PREVIEW_INTERVAL_MS);
      previewTimers.set(category, timer);
    };

    if (canHoverPreview) {
      category.addEventListener("mouseenter", startPreview);
      category.addEventListener("mouseleave", stopPreview);
      category.addEventListener("focusin", startPreview);
      category.addEventListener("focusout", () => {
        requestAnimationFrame(() => {
          const active = document.activeElement;
          if (!(active instanceof HTMLElement) || !category.contains(active)) {
            stopPreview();
          }
        });
      });
    }

    const startMobileHoldPreview = () => {
      if (category.classList.contains("is-open") || hasAnyOpenCategory()) return;
      holdTriggered = false;
      if (holdTimer) window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(() => {
        holdTriggered = true;
        startPreview();
      }, 520);
    };
    const stopMobileHoldPreview = () => {
      if (holdTimer) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      stopPreview();
    };

    category.addEventListener("touchstart", startMobileHoldPreview, { passive: true });
    category.addEventListener("touchend", stopMobileHoldPreview, { passive: true });
    category.addEventListener("touchcancel", stopMobileHoldPreview, { passive: true });
    category.addEventListener("touchmove", stopMobileHoldPreview, { passive: true });
    category.addEventListener("click", () => {
      if (category.classList.contains("is-open") || hasAnyOpenCategory()) {
        stopAllCategoryPreviews();
      }
    });
    category.addEventListener("click", (event) => {
      if (!holdTriggered) return;
      holdTriggered = false;
      event.preventDefault();
      event.stopPropagation();
    }, true);
  });

  updateGalleryOpenState();
}

async function initializeGallery() {
  const embeddedGalleryPayload = getEmbeddedJsonPayload("embedded-gallery-json");
  const embeddedFeaturedPayload = getEmbeddedJsonPayload("embedded-featured-json");
  const embeddedCategoriesPayload = getEmbeddedJsonPayload("embedded-portfolio-categories-json");
  const scheduleNonCriticalWork = (callback, timeout = 900) => {
    if (typeof callback !== "function") return;
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(callback, { timeout });
      return;
    }
    window.setTimeout(callback, timeout);
  };
  const fetchFirstAvailableJson = async (endpoints = []) => {
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) continue;
        return await response.json();
      } catch (_error) {
        // Try next endpoint variant.
      }
    }
    return null;
  };
  const renderEmbeddedGallery = () => {
    if (embeddedCategoriesPayload) {
      applyPortfolioCategoryConfig(embeddedCategoriesPayload);
    } else {
      renderHomePortfolioCards(galleryCategoryMeta);
    }
    if (embeddedGalleryPayload) {
      const embeddedGalleryItems = extractGalleryItems(embeddedGalleryPayload);
      hydrateSearchPoolFromGallery(embeddedGalleryItems);
      renderGalleryFromData(embeddedGalleryPayload);
    } else {
      renderGalleryFromData({ items: [] });
    }
    hydrateSearchFeaturedFromContent(embeddedFeaturedPayload || {});
  };
  const refreshGalleryContent = async () => {
    try {
      const [galleryPayload, legacyGalleryPayload, featuredPayload, categoriesPayload] = await Promise.all([
        fetchFirstAvailableJson(GALLERY_CONTENT_ENDPOINTS),
        fetchFirstAvailableJson(GALLERY_LEGACY_ENDPOINTS),
        fetchFirstAvailableJson(FEATURED_CONTENT_ENDPOINTS),
        fetchFirstAvailableJson(PORTFOLIO_CATEGORIES_ENDPOINTS)
      ]);

      if (categoriesPayload) {
        applyPortfolioCategoryConfig(categoriesPayload);
      }

      const resolvedGalleryPayload = galleryPayload || legacyGalleryPayload || embeddedGalleryPayload;
      if (resolvedGalleryPayload) {
        const galleryItems = extractGalleryItems(resolvedGalleryPayload);
        hydrateSearchPoolFromGallery(galleryItems);
        renderGalleryFromData(resolvedGalleryPayload);
      }

      hydrateSearchFeaturedFromContent(featuredPayload || embeddedFeaturedPayload || {});
      renderSearchShelves(searchInput instanceof HTMLInputElement ? searchInput.value : "");
    } catch (_error) {
      // The embedded payload keeps the page usable if the fresh CMS fetch is slow or unavailable.
    }
  };

  renderEmbeddedGallery();

  if (embeddedGalleryPayload) {
    scheduleNonCriticalWork(refreshGalleryContent, hasSearchQueryFlag() ? 250 : 1200);
  } else {
    await refreshGalleryContent();
  }
  renderSearchShelves(searchInput instanceof HTMLInputElement ? searchInput.value : "");
  initializeGalleryInteractions();
  const activeHash = pendingPostIntroHash || window.location.hash || "";
  if (activeHash) resolveDeepHashNavigation(activeHash);
}

initializeReviewsCarousel();
initializeGlobalTextRevealAnimations();
initializePortfolioFade();
initializeHomePortfolioCarousel();
void initializeSiteSectionsContent();
initializeGallery();
window.addEventListener("resize", scheduleReviewsResponsiveModeCheck);

const serviceCards = Array.from(document.querySelectorAll("#services .service-card"));
const servicesGrid = document.querySelector("#services .services-grid");
const servicesCarouselDots = document.getElementById("services-carousel-dots");

function initializeServicesAccordion() {
  if (!serviceCards.length) return;
  serviceCards.forEach((card) => {
    if (!(card instanceof HTMLElement)) return;
    const toggle = card.querySelector(".service-toggle");
    if (!(toggle instanceof HTMLButtonElement) || toggle.dataset.bound === "1") return;
    toggle.dataset.bound = "1";
    toggle.setAttribute("aria-expanded", card.classList.contains("is-open") ? "true" : "false");
    toggle.addEventListener("click", () => {
      const isOpen = card.classList.contains("is-open");
      card.classList.toggle("is-open", !isOpen);
      toggle.setAttribute("aria-expanded", !isOpen ? "true" : "false");
    });
  });
}

initializeServicesAccordion();

function initializeServicesCarouselDots() {
  if (!(servicesGrid instanceof HTMLElement) || !(servicesCarouselDots instanceof HTMLElement) || !serviceCards.length) return;

  servicesCarouselDots.innerHTML = serviceCards.map((card, index) => {
    const title = card.querySelector(".service-title")?.textContent?.trim() || `Service ${index + 1}`;
    return `<button class="services-carousel-dot${index === 0 ? " is-active" : ""}" type="button" aria-label="Go to ${escapeHTML(title)}" aria-pressed="${index === 0 ? "true" : "false"}"></button>`;
  }).join("");

  const dots = Array.from(servicesCarouselDots.querySelectorAll(".services-carousel-dot"));
  if (!dots.length) return;

  const setActiveDot = (activeIndex) => {
    dots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  const getActiveServiceIndex = () => {
    const gridRect = servicesGrid.getBoundingClientRect();
    const viewportCenter = gridRect.left + (gridRect.width / 2);
    let activeIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    serviceCards.forEach((card, index) => {
      if (!(card instanceof HTMLElement)) return;
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + (rect.width / 2);
      const distance = Math.abs(cardCenter - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });
    return activeIndex;
  };

  let scrollFrame = 0;
  const syncActiveDot = () => {
    if (window.matchMedia("(max-width: 768px)").matches) {
      setActiveDot(getActiveServiceIndex());
    }
    scrollFrame = 0;
  };

  const requestSync = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(syncActiveDot);
  };

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      const card = serviceCards[index];
      if (!(card instanceof HTMLElement)) return;
      card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      setActiveDot(index);
    });
  });

  servicesGrid.addEventListener("scroll", requestSync, { passive: true });
  window.addEventListener("resize", requestSync);
  requestSync();
}

initializeServicesCarouselDots();

const PARALLAX_ENABLED = false;
const MOBILE_COVER_ZOOM_ENABLED = true;
const MOBILE_COVER_ZOOM_MAX_SCALE_DELTA = 0.18;

function animate() {
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const disableHomeParallax = isMobile || isTabletViewport();

  sections.forEach((section) => {
    const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
    const progress = clamp((window.scrollY - section.offsetTop) / travel, 0, 1);
    const bg = section.querySelector(".layer-bg");
    const fg = section.querySelector(".layer-fg");
    const current = state.get(section);

    if (!PARALLAX_ENABLED) {
      if (bg) {
        bg.style.removeProperty("filter");
        bg.style.removeProperty("transform");
      }
      if (fg) {
        fg.style.removeProperty("transform");
      }
      if (section.id === "home") {
        if (homeSceneTiltElement) homeSceneTiltElement.style.removeProperty("transform");
        if (homeDepthBgElement) homeDepthBgElement.style.removeProperty("transform");
        if (homeDepthFgElement) homeDepthFgElement.style.removeProperty("transform");
        if (homeParticlesElement) homeParticlesElement.style.removeProperty("transform");
      }
      return;
    }

    const isContact = section.id === "contact";
    let bgTarget = progress * (isMobile ? -44 : -78);
    let fgRange = 360;

    if (section.id === "home" && fg) {
      const maxSafeTravel = Math.max((fg.offsetHeight - section.offsetHeight) / 2, 0);
      if (disableHomeParallax) {
        bgTarget = 0;
        fgRange = 0;
      } else {
        bgTarget = progress * -128;
        fgRange = clamp(maxSafeTravel, 280, 760);
      }
    } else if (isMobile && fg) {
      const maxSafeTravel = Math.max((fg.offsetHeight - section.offsetHeight) / 2, 0);
      const desiredRange = 48;
      fgRange = Math.min(desiredRange, maxSafeTravel * 0.22);
    }

    const fgTarget = progress * -fgRange;
    if (isContact && bg) {
      const bgMaxScale = isMobile ? 1.035 : 1;
      const bgSafeTravel = Math.max((bg.offsetHeight * bgMaxScale - section.offsetHeight) / 2, 0);
      const bgDesiredRange = isMobile ? 8 : 14;
      bgTarget = progress * -Math.min(bgDesiredRange, bgSafeTravel);
    }

    current.bg = lerp(current.bg, bgTarget, isContact ? 0.022 : 0.05);
    const fgLerp = isMobile ? 0.03 : (section.id === "home" ? 0.07 : 0.045);
    current.fg = lerp(current.fg, fgTarget, fgLerp);

    const allowDesktopMouseDepth = false;
    const allowGyroDepth = false;
    const allowMouseDepth = false;
    const targetMouseX = 0;
    const targetMouseY = 0;
    const mouseLerp = section.id === "home" ? 0.085 : 0.08;
    current.mouseX = lerp(current.mouseX, targetMouseX, mouseLerp);
    current.mouseY = lerp(current.mouseY, targetMouseY, mouseLerp);
    const allowLayerMouseDepth = allowMouseDepth && section.id !== "home";

    if (bg) {
      bg.style.removeProperty("filter");
      if (section.id === "about") {
        bg.style.transform = "none";
      } else if (section.id === "home" && disableHomeParallax) {
        bg.style.transform = "none";
      } else if (isContact) {
        const bgScale = isMobile ? 1.035 : 1;
        bg.style.transform = `translateY(${current.bg}px) scale(${bgScale})`;
      } else {
        const bgX = allowLayerMouseDepth ? current.mouseX : 0;
        const bgY = allowLayerMouseDepth ? current.mouseY : 0;
        bg.style.transform = `translate3d(${bgX}px, ${current.bg + bgY}px, 0)`;
      }
    }

    if (fg) {
      if (isContact || (section.id === "home" && disableHomeParallax)) {
        fg.style.transform = section.id === "home" ? "translateX(-50%)" : "none";
      } else {
        const baseFgOffset = isMobile
          ? (section.id === "home" ? -33 : (section.id === "about" ? -24 : -37))
          : (section.id === "home" ? -20 : -50);
        fg.style.transform = `translate(-50%, calc(${baseFgOffset}% + ${current.fg}px))`;
      }
    }

    if (section.id === "home") {
      const tiltRotateY = clamp(current.mouseX * 0.16, -7.4, 7.4);
      const tiltRotateX = clamp(current.mouseY * -0.15, -6.4, 6.4);
      if (homeSceneTiltElement) {
        homeSceneTiltElement.style.transform = `translateZ(0px) rotateX(${tiltRotateX.toFixed(3)}deg) rotateY(${tiltRotateY.toFixed(3)}deg)`;
      }
      if (homeDepthBgElement) {
        if (disableHomeParallax) {
          homeDepthBgElement.style.transform = "none";
        } else {
          const depthBgX = current.mouseX * 1.14;
          const depthBgY = current.mouseY * 0.98;
          const depthBgRotateY = clamp(current.mouseX * 0.052, -2.6, 2.6);
          const depthBgRotateX = clamp(current.mouseY * -0.046, -2.1, 2.1);
          homeDepthBgElement.style.transform = `translate3d(${depthBgX.toFixed(2)}px, ${depthBgY.toFixed(2)}px, -50px) rotateX(${depthBgRotateX.toFixed(3)}deg) rotateY(${depthBgRotateY.toFixed(3)}deg)`;
        }
      }
      if (homeDepthFgElement) {
        homeDepthFgElement.style.transform = disableHomeParallax ? "none" : "translate3d(0px, 0px, 50px)";
      }
      if (homeParticlesElement) {
        const particleX = current.mouseX * 0.32;
        const particleY = current.mouseY * 0.24;
        homeParticlesElement.style.transform = `translate3d(${particleX.toFixed(2)}px, ${particleY.toFixed(2)}px, 50px)`;
      }
    }
  });

  if (gallerySectionElement) {
    if (!PARALLAX_ENABLED) {
      gallerySectionElement.style.setProperty("--gallery-bg-shift", "0px");
    } else {
    const rect = gallerySectionElement.getBoundingClientRect();
    const viewportHeight = Math.max(window.innerHeight || 0, 1);
    const travel = rect.height + viewportHeight;
    const progress = clamp((viewportHeight - rect.top) / Math.max(travel, 1), 0, 1);
    const shiftRange = isMobile ? 26 : 54;
    const bgShift = (progress - 0.5) * shiftRange;
    gallerySectionElement.style.setProperty("--gallery-bg-shift", `${bgShift.toFixed(2)}px`);
    }
  }

  const shouldApplyMobileCoverZoom = MOBILE_COVER_ZOOM_ENABLED && (isMobile || document.body.classList.contains("device-mobile"));
  if (shouldApplyMobileCoverZoom) {
    const mobileHeaderContactOffset = syncMobileHeaderStackOffset();
    const applyCoverZoom = (imgEl) => {
      if (!(imgEl instanceof HTMLImageElement)) return;
      const hero = imgEl.closest(".featured-campaign-hero, .portfolio-campaign-hero");
      const parentSection = imgEl.closest("section");
      if (!(hero instanceof HTMLElement) || !(parentSection instanceof HTMLElement)) {
        imgEl.style.removeProperty("--mobile-cover-zoom");
        return;
      }

      const sectionRect = parentSection.getBoundingClientRect();
      const sectionHeight = Math.max(parentSection.offsetHeight, sectionRect.height, 1);
      const heroHeight = Math.max(hero.offsetHeight, 1);
      const stickyTravel = Math.max(sectionHeight - heroHeight - mobileHeaderContactOffset, 1);
      const travelProgress = clamp((mobileHeaderContactOffset - sectionRect.top) / stickyTravel, 0, 1);
      const targetScale = 1 + (travelProgress * MOBILE_COVER_ZOOM_MAX_SCALE_DELTA);
      const previousScale = Number(imgEl.dataset.mobileCoverZoom || "1");
      const nextScale = Number.isFinite(previousScale)
        ? lerp(previousScale, targetScale, 0.24)
        : targetScale;
      imgEl.dataset.mobileCoverZoom = nextScale.toFixed(4);
      imgEl.style.setProperty("--mobile-cover-zoom", nextScale.toFixed(4));
    };
    applyCoverZoom(featuredCoverImageElement);
    applyCoverZoom(portfolioCoverImageElement);
  } else {
    if (featuredCoverImageElement instanceof HTMLImageElement) {
      delete featuredCoverImageElement.dataset.mobileCoverZoom;
      featuredCoverImageElement.style.removeProperty("--mobile-cover-zoom");
    }
    if (portfolioCoverImageElement instanceof HTMLImageElement) {
      delete portfolioCoverImageElement.dataset.mobileCoverZoom;
      portfolioCoverImageElement.style.removeProperty("--mobile-cover-zoom");
    }
  }

  if (cursorHalo) {
    const haloIsIdle = Date.now() - lastCursorMoveAt > haloIdleDelayMs;
    const haloBlocked = brushIntersectsNoSmudge(haloTargetX, haloTargetY, HALO_BLOCK_RADIUS);
    const shouldShowHalo = haloPointerInside && !haloIsIdle && !shouldSuppressHalo() && !haloBlocked;
    haloTargetOpacity = shouldShowHalo ? 1 : 0;
    haloX = lerp(haloX, haloTargetX, 0.22);
    haloY = lerp(haloY, haloTargetY, 0.22);
    haloOpacity = lerp(haloOpacity, haloTargetOpacity, shouldShowHalo ? 0.2 : 0.45);
    cursorHalo.style.transform = `translate3d(${haloX - HALO_HALF}px, ${haloY - HALO_HALF}px, 0)`;
    cursorHalo.style.opacity = haloOpacity.toFixed(3);
  }

  let targetSectionId = "home";
  let strongestScore = -1;
  storySections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const sectionCenter = rect.top + rect.height / 2;
    const centerDistance = Math.abs(sectionCenter - window.innerHeight * 0.52);
    const revealRaw = clamp(1 - centerDistance / (window.innerHeight * 0.9), 0, 1);
    const revealProgress = 1 - Math.pow(1 - revealRaw, 2.2);
    section.style.setProperty("--section-reveal", revealProgress.toFixed(4));

    const visiblePx = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    const visibleRatio = visiblePx / Math.max(Math.min(rect.height, window.innerHeight), 1);
    const centerScore = 1 - clamp(Math.abs((rect.top + rect.height / 2) - window.innerHeight * 0.5) / (window.innerHeight * 0.82), 0, 1);
    const score = visibleRatio * 0.64 + centerScore * 0.36;
    if (score > strongestScore) {
      strongestScore = score;
      targetSectionId = section.id;
    }
  });

  if (footerSectionElement) {
    const footerRect = footerSectionElement.getBoundingClientRect();
    const footerIsPrimaryView = footerRect.top <= window.innerHeight * 0.72 && footerRect.bottom >= window.innerHeight * 0.2;
    if (footerIsPrimaryView) targetSectionId = "";
  }
  syncDesktopHeroHeaderTransition();
  setActiveNav(targetSectionId);

  requestAnimationFrame(animate);
}

animate();

window.addEventListener("load", () => {
  syncContactSectionHeightToBackground();
  if (window.location.hash) {
    resolveDeepHashNavigation(window.location.hash);
  } else {
    window.scrollTo(0, 0);
    setActiveNav("home");
  }
});
