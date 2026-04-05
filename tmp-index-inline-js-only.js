
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-Z9PJ60V3CR');



const sections = document.querySelectorAll("section[data-parallax]");
const storySections = Array.from(document.querySelectorAll("section[id]"));
const navElement = document.querySelector(".section-rail");
const navLinks = Array.from(document.querySelectorAll(".section-rail a[href^='#']"));
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
const TABLET_VIEWPORT_QUERY = "(min-width: 769px) and (max-width: 1024px)";

function isTabletViewport() {
  return window.matchMedia(TABLET_VIEWPORT_QUERY).matches;
}

function applyDeviceClasses() {
  const ua = navigator.userAgent || "";
  const isAndroid = /\bAndroid\b/i.test(ua);
  const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
  const isAndroidHandset = isAndroid && window.matchMedia("(max-width: 1024px)").matches;
  const isMobile = isMobileViewport || isAndroidHandset;
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
const gyroState = {
  enabled: false,
  activated: false,
  targetX: 0,
  targetY: 0
};
const gyroConfig = {
  maxTiltDeg: 20,
  maxOffsetX: 16,
  maxOffsetY: 12
};
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
const portfolioHeroClickTarget = document.getElementById("portfolio-hero-click");
let mobileContactCardsRevealed = false;
let pendingPostIntroHash = "";
let mobileHeaderStackOffsetSmoothed = 0;
let lastAppliedMobileHeaderStackOffset = -1;
let desktopHeaderHoverActive = false;
const shouldSkipIntro = (() => {
  const params = new URLSearchParams(window.location.search || "");
  return params.has("noIntro") || params.has("nointro") || params.has("skipIntro") || params.has("skipintro");
})();

if (shouldSkipIntro) {
  document.body.classList.remove("intro-scroll-lock", "text-reveal-pending", "text-reveal-anim");
  document.documentElement.classList.remove("intro-scroll-lock");
  const introElement = document.getElementById("intro");
  if (introElement) introElement.remove();
}

if (homeHeroClickTarget instanceof HTMLButtonElement) {
  homeHeroClickTarget.addEventListener("click", () => {
    window.location.href = "gallery.html?entry=home-hero";
  });
}

if (featuredHeroClickTarget instanceof HTMLButtonElement) {
  featuredHeroClickTarget.addEventListener("click", () => {
    const target = document.getElementById("featured-showcase") || document.getElementById("seasonal-events") || document.getElementById("featured");
    scrollToElementWithHeaderOffset(target);
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
  headerElement.addEventListener("mouseenter", () => {
    if (!window.matchMedia("(min-width: 1025px)").matches) return;
    desktopHeaderHoverActive = true;
  }, { passive: true });
  headerElement.addEventListener("mouseleave", () => {
    desktopHeaderHoverActive = false;
  }, { passive: true });
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

function updateFooterAboutLinksForViewport() {
  const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
  footerAboutLinks.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    if (isMobileViewport) {
      const targetKey = link.dataset.bioTarget || "";
      const mobileHref = targetKey === "fg3"
        ? "about.html#journey"
        : (targetKey === "fg2"
          ? "about.html#craft"
          : "about.html#team");
      link.setAttribute("href", mobileHref);
      return;
    }
    link.setAttribute("href", "#about");
  });
}

function initializeFooterAboutLinkBehavior() {
  footerAboutLinks.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    if (link.dataset.aboutBound === "1") return;
    link.dataset.aboutBound = "1";
    link.addEventListener("click", (event) => {
      const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
      if (isMobileViewport) return;
      const targetKey = link.dataset.bioTarget || "";
      if (!targetKey) return;
      event.preventDefault();
      const aboutTarget = document.getElementById("about");
      if (!aboutTarget) return;
      aboutTarget.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        setActiveNav("about");
        setAboutActiveBio(targetKey, false, true);
      }, 380);
    });
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
const searchQueryFilterButton = document.getElementById("search-query-filter");
const searchFiltersModal = document.getElementById("search-filters-modal");
const searchFiltersClose = document.getElementById("search-filters-close");
const searchFiltersWrap = document.getElementById("search-filters-wrap");
const featuredLeadElement = document.getElementById("featured-lead");
const portfolioKickerElement = document.getElementById("portfolio-kicker");
const portfolioHeadingElement = document.getElementById("portfolio-heading");
const portfolioLeadElement = document.getElementById("portfolio-lead");
const portfolioRequestNoteElement = document.getElementById("portfolio-request-note");
const portfolioRequestButtonElement = document.getElementById("portfolio-request-btn");
const menuPanel = document.getElementById("menu-panel");
const menuClose = document.getElementById("menu-close");
const menuViews = menuPanel ? Array.from(menuPanel.querySelectorAll("[data-menu-view]")) : [];
const POPUPS_ENABLED = true;
const SEARCH_DEFAULT_KEYWORDS = [
  "Ramadan & Eid",
  "Bouquet",
  "Standing Flower",
  "Papan Bunga",
  "Parcel",
  "Artificial Flower",
  "Funeral",
  "By Request",
  "Graduation",
  "Grand Opening",
  "Duka Cita",
  "Pernikahan",
  "Toko Bunga"
];
const SEARCH_STOPWORDS = new Set([
  "collection", "flowers", "flower", "arrangement", "featured", "custom", "product", "the", "and",
  "untuk", "dan", "dengan", "yang", "dari", "di", "ke", "pada", "bunga", "karangan", "toko", "florist"
]);
const SEARCH_FEATURED_FALLBACK_TITLE = "Ramadan & Eid Collection";
const SEARCH_RECOMMENDED_ROW_SIZE = 4;
const SEARCH_CATEGORY_RULES = {
  "standing flowers": {
    singular: "Standing Flower",
    keywords: ["standing flower", "standing flowers", "bunga berdiri"]
  },
  "artificial flowers": {
    singular: "Artificial Flower",
    keywords: ["artificial flower", "artificial flowers", "bunga artificial", "bunga imitasi", "bunga plastik"]
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
  kicker: "OUR WORK",
  heading: "The Portfolio",
  lead: "A study of form, texture, and composition",
  requestNote: "Looking for something else?",
  requestButtonLabel: "Request a custom arrangement"
};
let searchFeaturedCollectionTitle = SEARCH_FEATURED_FALLBACK_TITLE;
let searchFeaturedCollectionProducts = [];
const SEARCH_FILTER_GROUP_IDS = ["category", "color", "type"];
let activeSearchFilters = {
  category: new Set(),
  color: new Set(),
  type: new Set()
};
let searchFiltersModalOpen = false;
const SEARCH_COLOR_DEFS = [
  { id: "white", label: "White", tokens: ["white", "ivory", "cream", "putih"] },
  { id: "red", label: "Red", tokens: ["red", "merah"] },
  { id: "pink", label: "Pink", tokens: ["pink", "merah muda"] },
  { id: "purple", label: "Purple", tokens: ["purple", "lavender", "lilac", "ungu"] },
  { id: "blue", label: "Blue", tokens: ["blue", "navy", "biru"] },
  { id: "yellow", label: "Yellow", tokens: ["yellow", "gold", "kuning"] },
  { id: "orange", label: "Orange", tokens: ["orange", "peach", "oranye", "jingga"] },
  { id: "green", label: "Green", tokens: ["green", "hijau"] },
  { id: "black", label: "Black", tokens: ["black", "hitam"] }
];
const SEARCH_TYPE_DEFS = [
  { id: "bouquet", label: "Bouquet", tokens: ["bouquet", "buket", "bunga tangan", "hand bouquet", "wisuda", "graduation"] },
  { id: "standing", label: "Standing Flower", tokens: ["standing", "standing flower", "bunga berdiri"] },
  { id: "papan", label: "Papan Bunga", tokens: ["papan", "board", "papan bunga", "karangan papan", "papan ucapan"] },
  { id: "parcel", label: "Parcel", tokens: ["parcel", "parsel", "hampers"] },
  { id: "artificial", label: "Artificial", tokens: ["artificial", "bunga artificial", "bunga imitasi", "bunga plastik"] },
  { id: "basket", label: "Basket", tokens: ["basket", "keranjang"] },
  { id: "bloom-box", label: "Bloom Box", tokens: ["bloom box", "bloombox", "box", "kotak bunga"] },
  { id: "pot", label: "Pot", tokens: ["pot"] },
  { id: "ribbon", label: "Ribbon", tokens: ["ribbon", "pita", "pita peresmian", "grand opening", "pembukaan"] }
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
  { id: "chrysanthemum", label: "Krisan", tokens: ["chrysanthemum", "krisan"] }
];
const SEARCH_SYNONYM_GROUPS = [
  ["bouquet", "bouquets", "buket", "buket bunga", "bunga tangan", "hand bouquet"],
  ["wisuda", "graduation", "buket wisuda", "bouquet wisuda"],
  ["anniversary", "ulang tahun", "jadian", "hbd", "birthday", "tahun"],
  ["standing", "standing flower", "standing flowers", "bunga berdiri", "karangan berdiri"],
  ["papan", "papan bunga", "flower board", "board", "karangan papan", "papan ucapan"],
  ["parcel", "parsel", "hampers", "gift box", "hadiah"],
  ["artificial", "bunga artificial", "bunga imitasi", "bunga plastik"],
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
    keywords: ["bouquet", "buket", "wisuda"]
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
    title: "Artificial Flower No. 01",
    category: "Artificial Flowers",
    image: "/assets/uploads/art-mf5299.webp",
    price: "",
    keywords: ["artificial", "bunga artificial", "bloom box", "pot"]
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
    if (optionId === "artificial") ["artificial", "bunga artificial", "bunga imitasi", "bunga plastik"].forEach((token) => terms.add(token));
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
    return "gallery.html?category=By%20Request";
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
    title: "By Request",
    category: "By Request",
    image,
    price: "",
    rawPrice: null,
    keywords: buildBilingualSearchKeywords("By Request", "By Request", ["custom", "request", "sesuai permintaan"]),
    href: "gallery.html?category=By%20Request"
  };
};
let searchBaseProductPool = [];
let searchSeasonalProductPool = [];
let searchProductPool = searchBaseProductPool.slice();
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
  .filter(Boolean);
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
    const hit = normalizedGroup.some((term) => seedTerms.some((seed) => seed.includes(term) || term.includes(seed)));
    if (!hit) return;
    normalizedGroup.forEach((term) => allTerms.add(term));
  });
  return Array.from(allTerms);
};
const hasAnyActiveSearchFilters = () => SEARCH_FILTER_GROUP_IDS.some((groupId) => activeSearchFilters[groupId] instanceof Set && activeSearchFilters[groupId].size > 0);
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
    label: "Color",
    options: SEARCH_COLOR_DEFS.map((entry) => ({
      id: entry.id,
      label: entry.label,
      match: (_item, rawText, compactText) => {
        if (entry.id === "mixed") return searchSourceHasAny(rawText, compactText, ["mixed"]) || countSearchColorHits(rawText, compactText) > 1;
        return entry.tokens.some((token) => searchImageHasToken(rawText, compactText, token));
      }
    }))
  };
  const sizeGroup = {
    id: "size",
    label: "Size",
    options: [
      { id: "small", label: "Small", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["small", "mini", "petite", "compact", "kecil"]) },
      { id: "medium", label: "Medium", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["medium", "regular", "standard", "sedang"]) },
      { id: "large", label: "Large", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["large", "big", "besar"]) },
      { id: "grand", label: "Grand", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["grand", "jumbo", "premium"]) }
    ]
  };
  const flowerConditionGroup = {
    id: "flower-condition",
    label: "Flower Condition",
    options: [
      { id: "artificial", label: "Artificial", match: () => categoryKey === "artificial-flowers" },
      { id: "fresh", label: "Fresh", match: () => false },
      { id: "preserved", label: "Preserved", match: () => false }
    ]
  };
  const flowerTypeGroup = (allowedIds = []) => {
    const allowedSet = new Set(allowedIds.map((entry) => normalizeSearchFilterToken(entry)));
    return {
      id: "flower-type",
      label: "Flower Type",
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
        label: "Type",
        options: [
          { id: "potted", label: "Potted", match: (item, rawText, compactText, fallbackIndex) => detectSearchArtificialType(item, rawText, compactText, fallbackIndex) === "potted" },
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
      flowerTypeGroup(["mawar", "tulip", "anggrek", "lily", "babys-breath", "aster", "sunflower", "carnation", "hydrangea", "peony", "gerbera", "chrysanthemum"])
    ];
  }
  if (categoryKey === "standing-flowers") {
    return [
      colorGroup,
      flowerConditionGroup,
      flowerTypeGroup(["mawar", "lily", "anggrek", "sunflower", "aster", "chrysanthemum"])
    ];
  }
  if (categoryKey === "funerals") {
    return [
      {
        id: "type",
        label: "Type",
        options: [
          { id: "cross", label: "Cross", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["cross", "salib"]) },
          { id: "frame", label: "Frame", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["frame", "framed"]) },
          { id: "standing-flowers", label: "Standing Flowers", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["standing", "sta-"]) },
          { id: "papan-bunga", label: "Papan Bunga", match: (_item, rawText, compactText) => searchSourceHasAny(rawText, compactText, ["papan", "pap-"]) }
        ]
      },
      colorGroup,
      flowerTypeGroup(["mawar", "lily", "anggrek", "aster", "chrysanthemum"])
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
        options: colorGroup.options.filter((option) => ["red", "gold", "green", "mixed"].includes(option.id))
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
    label: String(group.label || group.id || "Filter").trim() || "Filter",
    options: (Array.isArray(group.options) ? group.options : []).map((option) => {
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
const escapeAttr = (value) => escapeHTML(String(value ?? ""));
const getSearchItemKey = (item) => `${item.category || ""}|${item.image || ""}`;
const resolveSearchImage = (value) => normalizeSearchImagePath(value);
const buildSearchCardMarkup = (item, index = 0) => {
  const resolvedImage = resolveSearchImage(item.image);
  const mediaMarkup = resolvedImage
    ? `
      <img class="search-product-media search-product-media-cover" src="${escapeAttr(resolvedImage)}" alt="${escapeAttr(item.title || "Product")}" loading="lazy" decoding="async">
      <img class="search-product-media search-product-media-full" src="${escapeAttr(resolvedImage)}" alt="" aria-hidden="true" loading="lazy" decoding="async">
    `
    : '<div class="category-cover-placeholder" aria-hidden="true"></div>';
  return `
    <a class="search-product-card search-fade-item" href="${escapeAttr(resolveSearchHref(item))}" style="--search-fade-delay:${Math.min(index, 11) * 46}ms">
      <div class="search-product-media-wrap">
        ${mediaMarkup}
        <div class="search-product-caption">
          <div class="search-product-title">${escapeHTML(item.title || "Product")}</div>
          ${item.price ? `<div class="search-product-price">${escapeHTML(item.price)}</div>` : ""}
        </div>
      </div>
    </a>
  `;
};
const renderSearchCards = (target, items, emptyMessage = "No matching results yet. Try another keyword.") => {
  if (!(target instanceof HTMLElement)) return;
  if (!items.length) {
    target.innerHTML = `<p class="search-empty search-fade-item">${escapeHTML(emptyMessage)}</p>`;
    return;
  }
  target.innerHTML = items.map((item, index) => buildSearchCardMarkup(item, index)).join("");
};
const gatherKeywordCandidates = (items = []) => {
  const scopedItems = Array.isArray(items) && items.length ? items : searchProductPool;
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
    <p class="search-empty search-fade-item">
      No products matched this keyword.
      <span class="search-empty-query">"${escapeHTML(query)}"</span>
    </p>
  `;
};
const triggerSearchFadeIn = () => {
  if (!(searchDropdown instanceof HTMLElement)) return;
  const animatedItems = Array.from(searchDropdown.querySelectorAll(".search-fade-item"));
  requestAnimationFrame(() => {
    animatedItems.forEach((item) => item.classList.add("is-visible"));
  });
};
const getSearchMatches = (queryText = "") => {
  const normalized = normalizeSearchText(queryText);
  if (!normalized) return [];
  const queryVariantGroups = getQueryVariantGroups(normalized);
  if (!queryVariantGroups.length) return [];

  const scoredMatches = searchProductPool
    .map((entry) => {
      const category = normalizeSearchText(entry.category);
      const keywords = normalizeSearchText((entry.keywords || []).join(" "));
      const corpus = `${category} ${keywords}`;
      let bestScore = 0;
      let matchedTokenGroups = 0;
      let phraseScore = 0;

      queryVariantGroups.forEach((group) => {
        let groupScore = 0;
        group.variants.forEach((term) => {
          if (!term) return;
          const exactKeywordScore = tokenMatchesContext(keywords, term) ? 5 : 0;
          const exactCategoryScore = tokenMatchesContext(category, term) ? 4 : 0;
          const containsKeywordScore = keywords.includes(term) ? 3 : 0;
          const containsCategoryScore = category.includes(term) ? 2 : 0;
          const containsCorpusScore = corpus.includes(term) ? 1 : 0;
          groupScore = Math.max(groupScore, exactKeywordScore + exactCategoryScore + containsKeywordScore + containsCategoryScore + containsCorpusScore);
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
  const randomizedMatches = orderedScores.flatMap((score) => shuffleBySeed(scoreBuckets.get(score) || [], getDailySeedKey(`match-${normalized}-${score}`)));
  return randomizedMatches;
};
const setSearchClearButtonState = (hasQuery) => {
  if (!(searchClearButton instanceof HTMLButtonElement)) return;
  searchClearButton.classList.toggle("is-visible", Boolean(hasQuery));
};
const setSearchQueryShellState = (isQueryMode, resultCount) => {
  if (!(searchQueryShell instanceof HTMLElement)) return;
  if (!isQueryMode) {
    searchQueryShell.hidden = true;
    return;
  }
  searchQueryShell.hidden = false;
  if (searchQueryCount instanceof HTMLElement) {
    searchQueryCount.textContent = `${resultCount} search results`;
  }
  if (searchQueryTabProducts instanceof HTMLButtonElement) {
    searchQueryTabProducts.textContent = `Products (${resultCount})`;
  }
};
const setSearchFiltersModalOpen = (shouldOpen) => {
  searchFiltersModalOpen = Boolean(shouldOpen);
  if (searchQueryFilterButton instanceof HTMLButtonElement) {
    searchQueryFilterButton.setAttribute("aria-expanded", searchFiltersModalOpen ? "true" : "false");
  }
  if (searchFiltersModal instanceof HTMLElement) {
    searchFiltersModal.classList.toggle("is-open", searchFiltersModalOpen);
    searchFiltersModal.setAttribute("aria-hidden", searchFiltersModalOpen ? "false" : "true");
  }
};
const buildSearchFilterGroups = (items = []) => {
  const scopedItems = Array.from(items);
  const allCategoryOptions = Array.from(new Set(
    searchProductPool.map((entry) => toTitleCaseWords(entry?.category || "")).filter(Boolean)
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
    { id: "category", label: "Category", options: allCategoryOptions },
    { id: "color", label: "Colors", options: colorOptions },
    { id: "type", label: "Types", options: typeOptions }
  ].filter((group) => group.options.length > 0);
};
const renderSearchFiltersModal = (items = [], isQueryMode = false) => {
  if (!(searchFiltersWrap instanceof HTMLElement)) return;
  if (!isQueryMode) {
    searchFiltersWrap.innerHTML = "";
    setSearchFiltersModalOpen(false);
    return;
  }
  const groups = buildSearchFilterGroups(items);
  if (!groups.length) {
    searchFiltersWrap.innerHTML = "";
    setSearchFiltersModalOpen(false);
    return;
  }
  searchFiltersWrap.innerHTML = `
    <div class="search-filters-panel">
      ${groups.map((group, index) => `
        <fieldset class="search-filter-group ${index === 0 ? "is-open" : ""}" data-search-filter-group="${escapeAttr(group.id)}">
          <button class="search-filter-group-toggle" type="button" aria-expanded="${index === 0 ? "true" : "false"}" aria-controls="search-filter-group-panel-${escapeAttr(group.id)}">
            <span class="search-filter-group-title">${escapeHTML(group.label)}</span>
            <span class="search-filter-group-icon" aria-hidden="true">${index === 0 ? "−" : "+"}</span>
          </button>
          <div class="search-filter-group-panel" id="search-filter-group-panel-${escapeAttr(group.id)}">
            <div class="search-filter-options">
              ${group.options.map((option) => `
                <label class="search-filter-option">
                  <input type="checkbox" data-search-filter-group="${escapeAttr(group.id)}" value="${escapeAttr(option.id)}" ${(activeSearchFilters[group.id] || new Set()).has(option.id) ? "checked" : ""}>
                  <span>${escapeHTML(option.label)} (${option.count})</span>
                </label>
              `).join("")}
            </div>
          </div>
        </fieldset>
      `).join("")}
      <div class="search-filter-actions">
        <button type="button" class="search-filter-clear" id="search-filter-clear">Clear filters</button>
      </div>
    </div>
  `;
  window.requestAnimationFrame(() => {
    const openPanels = Array.from(searchFiltersWrap.querySelectorAll(".search-filter-group.is-open .search-filter-group-panel"));
    openPanels.forEach((panel) => {
      if (panel instanceof HTMLElement) panel.style.maxHeight = `${panel.scrollHeight}px`;
    });
  });
};
const renderSearchShelves = (queryText = "") => {
  const query = normalizeSearchText(queryText);
  const hasQuery = Boolean(query);
  const isByRequestCategoryQuery = hasQuery && isByRequestSearchQuery(query);
  if (!hasQuery) {
    resetActiveSearchFilters();
    setSearchFiltersModalOpen(false);
  }
  setSearchClearButtonState(hasQuery);

  if (searchFeaturedHeading instanceof HTMLElement) {
    searchFeaturedHeading.textContent = searchFeaturedCollectionTitle || SEARCH_FEATURED_FALLBACK_TITLE;
  }
  const featuredCards = searchFeaturedCollectionProducts.slice();
  const shouldShowFeatured = !hasQuery;
  if (searchFeaturedBlock instanceof HTMLElement) {
    searchFeaturedBlock.classList.toggle("is-hidden", !shouldShowFeatured);
  }
  if (shouldShowFeatured) {
    renderSearchCards(searchFeaturedList, featuredCards, "Featured seasonal products are being prepared.");
  } else if (searchFeaturedList instanceof HTMLElement) {
    searchFeaturedList.innerHTML = "";
  }

  const featuredKeys = new Set(featuredCards.map((item) => getSearchItemKey(item)));
  const recommendationPool = searchProductPool.filter((item) => !featuredKeys.has(getSearchItemKey(item)));
  const products = hasQuery
    ? (isByRequestCategoryQuery ? [buildByRequestCategorySearchCard()] : getSearchMatches(query))
    : selectDailySubset(recommendationPool, SEARCH_RECOMMENDED_ROW_SIZE, "recommended-products");
  renderSearchKeywords(queryText, hasQuery ? searchProductPool : recommendationPool);
  const baseProducts = hasQuery
    ? products.slice()
    : products.slice();
  const filteredProducts = hasQuery
    ? (isByRequestCategoryQuery ? baseProducts.slice() : applyActiveSearchFilters(baseProducts))
    : baseProducts.slice();
  const displayedProducts = filteredProducts.slice();
  const hasResults = displayedProducts.length > 0;
  if (searchDropdownBody instanceof HTMLElement) {
    searchDropdownBody.classList.toggle("is-query-mode", hasQuery);
    searchDropdownBody.classList.toggle("is-no-results", hasQuery && !hasResults);
  }
  setSearchQueryShellState(hasQuery, displayedProducts.length);
  renderSearchFiltersModal(baseProducts, hasQuery && !isByRequestCategoryQuery);
  if (searchKeywordsGroup instanceof HTMLElement) {
    searchKeywordsGroup.classList.toggle("is-hidden", hasQuery);
  }
  if (searchFaqGroup instanceof HTMLElement) searchFaqGroup.classList.remove("is-hidden");
  if (searchRecommendedGroup instanceof HTMLElement) {
    searchRecommendedGroup.classList.toggle("is-query-results", hasQuery);
  }
  renderSearchStatus(queryText, hasResults);
  if (searchKeywordsHeading instanceof HTMLElement) {
    searchKeywordsHeading.textContent = "Relevant Searches";
  }
  if (searchProductsHeading instanceof HTMLElement) {
    if (!hasQuery) {
      searchProductsHeading.textContent = "Recommended Products";
    } else {
      searchProductsHeading.textContent = hasResults ? "Search Results" : "No Matching Products";
    }
  }
  const recommendedFallback = hasResults
    ? displayedProducts
    : hasQuery
      ? []
      : selectDailySubset(recommendationPool, SEARCH_RECOMMENDED_ROW_SIZE, "recommended-fallback");
  renderSearchCards(
    searchProductsList,
    recommendedFallback,
    hasQuery ? "No matching products found." : "Products will appear soon."
  );
  triggerSearchFadeIn();
};
const applySiteSectionsCopy = (payload = {}) => {
  const homePortfolio = payload?.homePortfolio && typeof payload.homePortfolio === "object"
    ? payload.homePortfolio
    : {};
  const resolved = {
    kicker: String(homePortfolio.kicker || HOME_PORTFOLIO_DEFAULT_COPY.kicker).trim(),
    heading: String(homePortfolio.heading || HOME_PORTFOLIO_DEFAULT_COPY.heading).trim(),
    lead: String(homePortfolio.lead || HOME_PORTFOLIO_DEFAULT_COPY.lead).trim(),
    requestNote: String(homePortfolio.requestNote || HOME_PORTFOLIO_DEFAULT_COPY.requestNote).trim(),
    requestButtonLabel: String(homePortfolio.requestButtonLabel || HOME_PORTFOLIO_DEFAULT_COPY.requestButtonLabel).trim()
  };

  if (portfolioKickerElement instanceof HTMLElement) portfolioKickerElement.textContent = resolved.kicker;
  if (portfolioHeadingElement instanceof HTMLElement) portfolioHeadingElement.textContent = resolved.heading;
  if (portfolioLeadElement instanceof HTMLElement) portfolioLeadElement.textContent = resolved.lead;
  if (portfolioRequestNoteElement instanceof HTMLElement) portfolioRequestNoteElement.textContent = resolved.requestNote;
  if (portfolioRequestButtonElement instanceof HTMLElement) portfolioRequestButtonElement.textContent = resolved.requestButtonLabel;
};
const hydrateSearchFeaturedFromContent = (payload = {}) => {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const eventsWithProducts = events.filter((event) => Array.isArray(event?.products) && event.products.length > 0);
  const targetEvent = eventsWithProducts.find((event) => /ramadan|eid/i.test(`${event?.id || ""} ${event?.title || ""}`))
    || eventsWithProducts[0]
    || null;
  if (!targetEvent) {
    searchFeaturedCollectionProducts = [];
    searchSeasonalProductPool = [];
    rebuildSearchProductPool();
    return;
  }
  const eventTitle = String(targetEvent.title || SEARCH_FEATURED_FALLBACK_TITLE).trim();
  const eventProducts = Array.isArray(targetEvent.products) ? targetEvent.products : [];
  const mapped = eventProducts
    .filter((product) => product && product.src && product.name)
    .map((product) => {
      const title = String(product.name || "Featured Product").trim();
      const image = String(product.src || "").trim();
      const rawPrice = parseSearchPriceNumber(product.price);
      const priceLabel = formatRupiah(rawPrice) || "";
      return {
        title,
        category: "Featured",
        image: resolveSearchImage(image),
        rawPrice,
        price: priceLabel,
        keywords: buildBilingualSearchKeywords(title, "Featured", [eventTitle, "Featured", "Seasonal", "Ramadan", "Eid"]),
        href: buildSearchProductHref({
          category: "Featured",
          title,
          image: resolveSearchImage(image),
          price: rawPrice
        })
      };
    });
  if (!mapped.length) {
    searchFeaturedCollectionProducts = [];
    searchSeasonalProductPool = [];
    rebuildSearchProductPool();
    return;
  }
  searchFeaturedCollectionTitle = eventTitle;
  searchFeaturedCollectionProducts = mapped;
  searchSeasonalProductPool = mapped.map((item) => ({
    ...item,
    category: eventTitle || "Seasonal Collection",
    keywords: buildBilingualSearchKeywords(item.title, eventTitle || "Seasonal Collection", [
      ...(Array.isArray(item.keywords) ? item.keywords : []),
      "seasonal",
      "collection"
    ])
  }));
  rebuildSearchProductPool();
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
    .filter(Boolean);
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
    view.setAttribute("aria-hidden", isMatch ? "false" : "true");
  });
};
const setContactQuickOpen = (shouldOpen) => {
  if (!contactQuickPanel || !contactQuickTrigger || !contactQuickBackdrop) return;
  contactQuickPanel.classList.toggle("is-open", shouldOpen);
  contactQuickBackdrop.classList.toggle("is-open", shouldOpen);
  contactQuickPanel.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  contactQuickTrigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  document.body.classList.toggle("contact-quick-open", shouldOpen);
};
const setMenuOpen = (shouldOpen) => {
  if (!menuPanel || !contactQuickBackdrop || !menuToggle) return;
  menuPanel.classList.toggle("is-open", shouldOpen);
  contactQuickBackdrop.classList.toggle("is-open", shouldOpen);
  menuPanel.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  menuToggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  if (!shouldOpen) setMenuView("main");
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
if (menuPanel) setMenuView("main");
if (contactQuickTrigger) {
  if (!POPUPS_ENABLED) {
    contactQuickTrigger.setAttribute("aria-disabled", "true");
  } else {
    contactQuickTrigger.addEventListener("click", () => {
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
if (menuToggle && menuPanel) {
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
    searchToggle.addEventListener("click", () => {
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
    if (!(target instanceof HTMLElement)) return;
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
    const queryChip = target.closest("[data-search-query]");
    if (queryChip instanceof HTMLButtonElement && searchInput instanceof HTMLInputElement) {
      const query = String(queryChip.getAttribute("data-search-query") || "").trim();
      if (!query) return;
      searchInput.value = query;
      renderSearchShelves(query);
      return;
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
if (POPUPS_ENABLED) {
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
if (menuPanel) {
  if (POPUPS_ENABLED) {
    menuPanel.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const openButton = target.closest("[data-menu-open]");
      if (openButton instanceof HTMLElement) {
        const targetView = openButton.getAttribute("data-menu-open");
        if (targetView) setMenuView(targetView);
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
if (menuClose instanceof HTMLButtonElement) {
  if (POPUPS_ENABLED) {
    menuClose.addEventListener("click", () => setMenuOpen(false));
  }
}
if (contactQuickBackdrop) {
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

if (document.body.classList.contains("intro-scroll-lock")) {
  document.documentElement.classList.add("intro-scroll-lock");
}
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

function forceHomeWhileIntroLocked() {
  if (!document.body.classList.contains("intro-scroll-lock")) return;
  if (window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
  if (window.location.hash && window.location.hash !== "#home") {
    if (!pendingPostIntroHash) pendingPostIntroHash = window.location.hash;
    window.pendingPostIntroHash = pendingPostIntroHash;
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#home`);
  }
}
forceHomeWhileIntroLocked();
window.addEventListener("scroll", forceHomeWhileIntroLocked, { passive: true });
window.addEventListener("hashchange", forceHomeWhileIntroLocked);

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
  ".scene2-strip-fg-image",
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

  const preloadMargin = window.matchMedia("(max-width: 768px)").matches ? 2600 : 3200;
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

function updateGyroTargets(beta, gamma) {
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return;
  const normalizedX = clamp(gamma / gyroConfig.maxTiltDeg, -1, 1);
  const normalizedY = clamp(beta / gyroConfig.maxTiltDeg, -1, 1);
  gyroState.targetX = clamp(normalizedX * gyroConfig.maxOffsetX, -gyroConfig.maxOffsetX, gyroConfig.maxOffsetX);
  gyroState.targetY = clamp(normalizedY * gyroConfig.maxOffsetY, -gyroConfig.maxOffsetY, gyroConfig.maxOffsetY);
}

function handleDeviceOrientation(event) {
  updateGyroTargets(event.beta, event.gamma);
}

function enableGyroTracking() {
  if (gyroState.activated || typeof window === "undefined") return;
  window.addEventListener("deviceorientation", handleDeviceOrientation, true);
  gyroState.activated = true;
  gyroState.enabled = true;
}

async function requestGyroAccessFromGesture() {
  if (typeof DeviceOrientationEvent === "undefined") return;
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    try {
      const result = await DeviceOrientationEvent.requestPermission();
      if (result !== "granted") return;
      enableGyroTracking();
    } catch (_error) {
      // Keep mouse/touch fallback if sensor permission fails.
    }
    return;
  }
  enableGyroTracking();
}

const requestGyroOnFirstGesture = () => {
  requestGyroAccessFromGesture();
};
window.addEventListener("click", requestGyroOnFirstGesture, { once: true });
window.addEventListener("touchstart", requestGyroOnFirstGesture, { once: true, passive: true });
window.addEventListener("keydown", requestGyroOnFirstGesture, { once: true });

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
if (!document.body.classList.contains("intro-scroll-lock")
  && initialSectionFromHash
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

const galleryCategoryMeta = [
  {
    key: "artificial-flowers",
    name: "Artificial Flowers",
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
  "Artificial Flowers": "/assets/artificialcover.webp",
  Bouquets: "/assets/bouquetcover.webp",
  "Papan Bunga": "/assets/papancover.webp",
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
  const key = toSlug(entry.key || entry.name || fallbackKey) || fallbackKey;
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
      price: normalizedPrice
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
    const categoryItems = Array.isArray(categoryEntry?.items) ? categoryEntry.items : [];
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
    portfolioGrid.innerHTML = homeCards.map((item) => {
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
  }

  if (requestWrap instanceof HTMLElement) {
    const requestCategory = source.find((item) => normalizeGalleryCategory(item?.key || item?.name) === "by-request");
    const requestLink = requestWrap.querySelector(".portfolio-request-btn");
    if (requestLink instanceof HTMLAnchorElement && requestCategory) {
      requestLink.href = `gallery.html?category=${encodeURIComponent(requestCategory.key || "by-request")}`;
    }
  }

  initializePortfolioFade();
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
  const grid = document.querySelector(".portfolio-grid");
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
      if (grid instanceof HTMLElement) obs.unobserve(grid);
    });
  }, { threshold: 0.28 });

  if (grid instanceof HTMLElement) observer.observe(grid);
  else cards.forEach((card) => observer.observe(card));
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
  const textTargets = Array.from(document.querySelectorAll([
    "#home .section-content h1",
    "#home .section-content p",
    "#featured .section-content h1",
    "#featured .featured-lead",
    "#about .about-heading",
    "#about .about-slogan",
    "#services .contact-intro h1",
    "#services .contact-slogan"
  ].join(", ")));
  textTargets.forEach((item, index) => {
    prepareGalleryRevealItem(item, (index % 8) * 120, observer);
  });

  const servicesCardTargets = Array.from(document.querySelectorAll("#services .service-card"));
  servicesCardTargets.forEach((item, index) => {
    prepareGalleryRevealItem(item, index * 120, observer, true);
  });

  const contactCardTextTargets = Array.from(document.querySelectorAll([
    "#services .contact-card-title",
    "#services .contact-card-desc",
    "#services .contact-card-overlay .contact-card-label"
  ].join(", ")));
  contactCardTextTargets.forEach((item, index) => {
    prepareGalleryRevealItem(item, (index % 6) * 110, observer, true);
  });

  const aboutBioTextTargets = Array.from(document.querySelectorAll([
    "#about .about-bio h3",
    "#about .about-bio p"
  ].join(", ")));
  aboutBioTextTargets.forEach((item, index) => {
    prepareGalleryRevealItem(item, (index % 4) * 55, observer);
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

function updateReviewsCarouselState() {
  if (!reviewsTrack) return;
  reviewsTrack.style.transform = `translate3d(${-reviewsPageIndex * 100}%, 0, 0)`;
  if (reviewsPrevButton) reviewsPrevButton.disabled = reviewsPageIndex <= 0;
  if (reviewsNextButton) reviewsNextButton.disabled = reviewsPageIndex >= Math.max(reviewsPageCount - 1, 0);
}

function initializeReviewsCarousel() {
  if (!reviewsTrack) return;
  const reviewsHeadline = document.querySelector("#reviews .reviews-headline");
  const reviewsMetaLine = document.querySelector("#reviews .reviews-meta-line");
  if (reviewsHeadline) {
    reviewsHeadline.innerHTML = '<span class="reviews-stars" aria-hidden="true">★★★★★</span><span class="reviews-rating-line">Rated 5.0 on Google</span>';
  }
  if (reviewsMetaLine) {
    reviewsMetaLine.textContent = "From our valued customers.";
  }

  const quotedReviews = reviews.filter((entry) => String(entry?.text || "").trim().length > 0);
  const source = quotedReviews.length ? quotedReviews : reviews;
  let rotationSeed = 0;
  try {
    rotationSeed = Number(sessionStorage.getItem("reviews-mobile-quote-rotation") || "0") || 0;
    sessionStorage.setItem("reviews-mobile-quote-rotation", String(rotationSeed + 1));
  } catch (_error) {
    rotationSeed = 0;
  }

  const selected = [];
  const targetCount = Math.min(3, source.length);
  for (let index = 0; index < targetCount; index += 1) {
    selected.push(source[(rotationSeed + index) % source.length]);
  }

  reviewsTrack.innerHTML = `
    <div class="review-slide">
      ${selected.map((entry) => {
        const safeName = escapeHTML(entry.name || "Google Reviewer");
        const reviewText = String(entry.text || "").trim();
        const safeText = reviewText ? escapeHTML(reviewText) : "";
        return `
          <article class="review-card">
            <div class="review-card-head">
              <p class="review-author">${safeName}</p>
            </div>
            ${safeText ? `<p class="review-text">&ldquo;${safeText}&rdquo;</p>` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
  markNoSmudgeTargets(reviewsTrack);

  const observer = ensureGalleryRevealObserver();
  const reviewCards = Array.from(document.querySelectorAll("#reviews .review-card"));
  reviewCards.forEach((item, index) => {
    prepareGalleryRevealItem(item, (index % 3) * 90, observer);
  });
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
        if (!(target instanceof HTMLElement)) return;
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
      if (!(target instanceof HTMLElement)) return;
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
      if (!(target instanceof HTMLElement)) return;
      const link = card.querySelector(".featured-product-link");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (target.closest("a")) return;
      window.location.href = link.href;
    });
  });
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
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
  try {
    const embeddedGalleryPayload = getEmbeddedJsonPayload("embedded-gallery-json");
    const embeddedFeaturedPayload = getEmbeddedJsonPayload("embedded-featured-json");
    const embeddedCategoriesPayload = getEmbeddedJsonPayload("embedded-portfolio-categories-json");
    const embeddedSiteSectionsPayload = getEmbeddedJsonPayload("embedded-site-sections-json");

    if (embeddedCategoriesPayload) {
      applyPortfolioCategoryConfig(embeddedCategoriesPayload);
    } else {
      renderHomePortfolioCards(galleryCategoryMeta);
    }
    if (!searchBaseProductPool.length && embeddedGalleryPayload) {
      const embeddedGalleryItems = extractGalleryItems(embeddedGalleryPayload);
      if (embeddedGalleryItems.length) hydrateSearchPoolFromGallery(embeddedGalleryItems);
    }
    if (!searchFeaturedCollectionProducts.length && embeddedFeaturedPayload) {
      hydrateSearchFeaturedFromContent(embeddedFeaturedPayload);
    }
    applySiteSectionsCopy(embeddedSiteSectionsPayload || {});

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

    const [galleryPayload, legacyGalleryPayload, featuredPayload, categoriesPayload, siteSectionsPayload] = await Promise.all([
      fetchFirstAvailableJson(GALLERY_CONTENT_ENDPOINTS),
      fetchFirstAvailableJson(GALLERY_LEGACY_ENDPOINTS),
      fetchFirstAvailableJson(FEATURED_CONTENT_ENDPOINTS),
      fetchFirstAvailableJson(PORTFOLIO_CATEGORIES_ENDPOINTS),
      fetchFirstAvailableJson(SITE_SECTIONS_ENDPOINTS)
    ]);

    if (categoriesPayload) {
      applyPortfolioCategoryConfig(categoriesPayload);
    }
    applySiteSectionsCopy(siteSectionsPayload || embeddedSiteSectionsPayload || {});

    const resolvedGalleryPayload = galleryPayload || legacyGalleryPayload || embeddedGalleryPayload;
    if (!resolvedGalleryPayload) throw new Error("Unable to load gallery content.");

    const galleryItems = extractGalleryItems(resolvedGalleryPayload);
    hydrateSearchPoolFromGallery(galleryItems);
    renderGalleryFromData(resolvedGalleryPayload);

    hydrateSearchFeaturedFromContent(featuredPayload || embeddedFeaturedPayload || {});
  } catch (error) {
    const embeddedGalleryPayload = getEmbeddedJsonPayload("embedded-gallery-json");
    const embeddedFeaturedPayload = getEmbeddedJsonPayload("embedded-featured-json");
    const embeddedCategoriesPayload = getEmbeddedJsonPayload("embedded-portfolio-categories-json");
    const embeddedSiteSectionsPayload = getEmbeddedJsonPayload("embedded-site-sections-json");
    applySiteSectionsCopy(embeddedSiteSectionsPayload || {});
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
  }
  renderSearchShelves(searchInput instanceof HTMLInputElement ? searchInput.value : "");
  initializeGalleryInteractions();
  if (!document.body.classList.contains("intro-scroll-lock")) {
    const activeHash = pendingPostIntroHash || window.location.hash || "";
    if (activeHash) resolveDeepHashNavigation(activeHash);
  }
}

initializeReviewsCarousel();
initializeGlobalTextRevealAnimations();
initializePortfolioFade();
initializeGallery();

const aboutSection = document.getElementById("about");
const aboutFigures = aboutSection ? Array.from(aboutSection.querySelectorAll(".scene2-strip-fg-image[data-bio-target]")) : [];
const aboutBios = aboutSection ? Array.from(aboutSection.querySelectorAll(".about-bio")) : [];
const aboutBioPanel = aboutSection ? aboutSection.querySelector(".about-bio-panel") : null;
const aboutPixelSamplers = new WeakMap();
const aboutHoverOrder = ["fg3", "fg2", "fg1"];
const aboutBioOrder = ["fg1", "fg2", "fg3"];

function getAboutBioOrderIndex(targetKey) {
  return aboutBioOrder.indexOf(String(targetKey || "").trim());
}

function getAboutBioByOrderIndex(index) {
  const total = aboutBioOrder.length;
  if (!total) return "";
  const normalized = ((index % total) + total) % total;
  return aboutBioOrder[normalized];
}

function updateAboutMobileCardStack(activeKey) {
  const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
  const activeIndex = getAboutBioOrderIndex(activeKey);
  aboutBios.forEach((bio) => {
    bio.classList.remove("is-current", "is-next", "is-prev");
  });
  if (!isMobileViewport || activeIndex < 0) return;

  const nextKey = getAboutBioByOrderIndex(activeIndex + 1);
  const prevKey = getAboutBioByOrderIndex(activeIndex - 1);
  aboutBios.forEach((bio) => {
    const key = bio.dataset.bio || "";
    if (key === activeKey) bio.classList.add("is-current");
    else if (key === nextKey) bio.classList.add("is-next");
    else if (key === prevKey) bio.classList.add("is-prev");
  });
}

function syncAboutMobileCardPanelHeight() {
  if (!aboutBioPanel) return;
  const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
  if (!isMobileViewport) {
    aboutBioPanel.style.removeProperty("height");
    return;
  }

  const inlineSnapshots = aboutBios.map((bio) => ({
    position: bio.style.position,
    inset: bio.style.inset,
    transform: bio.style.transform,
    opacity: bio.style.opacity,
    pointerEvents: bio.style.pointerEvents,
    zIndex: bio.style.zIndex,
    visibility: bio.style.visibility
  }));

  aboutBios.forEach((bio) => {
    bio.style.position = "relative";
    bio.style.inset = "auto";
    bio.style.transform = "none";
    bio.style.opacity = "1";
    bio.style.pointerEvents = "none";
    bio.style.zIndex = "0";
    bio.style.visibility = "hidden";
  });

  const measuredHeight = aboutBios.reduce((maxHeight, bio) => {
    return Math.max(maxHeight, bio.scrollHeight);
  }, 0);

  aboutBios.forEach((bio, index) => {
    const snapshot = inlineSnapshots[index];
    bio.style.position = snapshot.position;
    bio.style.inset = snapshot.inset;
    bio.style.transform = snapshot.transform;
    bio.style.opacity = snapshot.opacity;
    bio.style.pointerEvents = snapshot.pointerEvents;
    bio.style.zIndex = snapshot.zIndex;
    bio.style.visibility = snapshot.visibility;
  });

  if (measuredHeight > 0) {
    aboutBioPanel.style.height = `${Math.ceil(measuredHeight)}px`;
  }
}

function ensureAboutMobileActiveCard() {
  if (!aboutSection) return;
  if (!window.matchMedia("(max-width: 768px)").matches) return;
  const activeKey = aboutSection.dataset.activeBio || "";
  if (getAboutBioOrderIndex(activeKey) >= 0) {
    updateAboutMobileCardStack(activeKey);
    syncAboutMobileCardPanelHeight();
    return;
  }
  const fallbackKey = aboutBioOrder[0];
  if (!fallbackKey) return;
  setAboutActiveBio(fallbackKey, false, true);
}

function setAboutActiveBio(targetKey, shouldScroll = false, forceState = false) {
  if (!aboutSection) return;
  const currentKey = aboutSection.dataset.activeBio || "";
  const nextKey = forceState ? targetKey : (currentKey === targetKey ? "" : targetKey);
  aboutSection.dataset.activeBio = nextKey;
  aboutSection.classList.toggle("about-selected", Boolean(nextKey));

  aboutFigures.forEach((figure) => {
    const isActive = figure.dataset.bioTarget === nextKey;
    figure.classList.toggle("is-active", isActive);
    figure.classList.toggle("is-dim", Boolean(nextKey) && !isActive);
    figure.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  aboutBios.forEach((bio) => {
    bio.classList.toggle("is-active", bio.dataset.bio === nextKey);
  });
  updateAboutMobileCardStack(nextKey);
  syncAboutMobileCardPanelHeight();

  if (nextKey && shouldScroll && window.matchMedia("(max-width: 768px)").matches && aboutBioPanel) {
    aboutBioPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function preparePixelSampler(imgElement) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const source = new Image();
  let ready = false;

  source.crossOrigin = "anonymous";
  source.src = imgElement.currentSrc || imgElement.src;

  source.onload = () => {
    canvas.width = source.naturalWidth || source.width;
    canvas.height = source.naturalHeight || source.height;
    if (!canvas.width || !canvas.height) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0);
    ready = true;
  };

  const sampleAlpha = (clientX, clientY) => {
    if (!ready || !canvas.width || !canvas.height) return 0;
    const rect = imgElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return 0;

    // Map pointer to source image pixels using object-fit/object-position geometry.
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const sourceW = canvas.width;
    const sourceH = canvas.height;
    const computed = window.getComputedStyle(imgElement);
    const objectFit = String(computed.objectFit || "cover").toLowerCase();
    let scale = Math.max(rect.width / sourceW, rect.height / sourceH);
    if (objectFit === "contain") {
      scale = Math.min(rect.width / sourceW, rect.height / sourceH);
    } else if (objectFit === "fill") {
      // Non-uniform scaling: map each axis directly.
      const srcXFill = (localX / rect.width) * sourceW;
      const srcYFill = (localY / rect.height) * sourceH;
      if (srcXFill < 0 || srcXFill >= sourceW || srcYFill < 0 || srcYFill >= sourceH) return 0;
      const x = Math.max(0, Math.min(sourceW - 1, Math.floor(srcXFill)));
      const y = Math.max(0, Math.min(sourceH - 1, Math.floor(srcYFill)));
      return ctx.getImageData(x, y, 1, 1).data[3];
    }
    const drawnW = sourceW * scale;
    const drawnH = sourceH * scale;

    const [rawPosX = "50%", rawPosY = "50%"] = computed.objectPosition.split(/\s+/);
    const parsePos = (value, axis) => {
      const token = String(value || "").toLowerCase();
      if (token.endsWith("%")) {
        const parsed = Number.parseFloat(token);
        return Number.isFinite(parsed) ? parsed / 100 : 0.5;
      }
      if (token === "left" || token === "top") return 0;
      if (token === "right" || token === "bottom") return 1;
      if (token === "center") return 0.5;
      const numeric = Number.parseFloat(token);
      if (Number.isFinite(numeric)) {
        const range = axis === "x" ? Math.abs(rect.width - drawnW) : Math.abs(rect.height - drawnH);
        if (range > 0) return clamp(numeric / range, 0, 1);
      }
      return 0.5;
    };

    const posX = parsePos(rawPosX, "x");
    const posY = parsePos(rawPosY, "y");
    const offsetX = (rect.width - drawnW) * posX;
    const offsetY = (rect.height - drawnH) * posY;
    const srcX = (localX - offsetX) / scale;
    const srcY = (localY - offsetY) / scale;

    if (srcX < 0 || srcX >= sourceW || srcY < 0 || srcY >= sourceH) return 0;
    const x = Math.max(0, Math.min(sourceW - 1, Math.floor(srcX)));
    const y = Math.max(0, Math.min(sourceH - 1, Math.floor(srcY)));
    return ctx.getImageData(x, y, 1, 1).data[3];
  };
  aboutPixelSamplers.set(imgElement, sampleAlpha);
}

function enterAboutFigure(imgElement) {
  imgElement.classList.add("is-pixel-hover");
}

function leaveAboutFigure(imgElement) {
  imgElement.classList.remove("is-pixel-hover");
}

aboutFigures.forEach((figure) => {
  preparePixelSampler(figure);

  figure.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const targetKey = figure.dataset.bioTarget;
    if (!targetKey) return;
    setAboutActiveBio(targetKey, true);
  });
});

function getTopAboutFigureAt(clientX, clientY) {
  const ordered = aboutHoverOrder
    .map((target) => aboutFigures.find((figure) => figure.dataset.bioTarget === target))
    .filter(Boolean);
  for (const figure of ordered) {
    const sample = aboutPixelSamplers.get(figure);
    if (!sample) continue;
    if (sample(clientX, clientY) > 10) return figure;
  }
  return null;
}

if (aboutSection) {
  let currentHoveredFigure = null;
  const isDesktopPointer = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1025px)").matches;
  let aboutSwipeStartX = 0;
  let aboutSwipeStartY = 0;
  const aboutRevealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        aboutSection.classList.add("about-once-visible");
        observer.disconnect();
      });
    }, { threshold: 0.2 })
    : null;
  if (aboutRevealObserver) aboutRevealObserver.observe(aboutSection);
  else aboutSection.classList.add("about-once-visible");

  const stopPulseOnMobileInteraction = () => {
    if (!window.matchMedia("(max-width: 768px)").matches) return;
    aboutSection.classList.add("about-pulse-stopped");
  };

  aboutSection.addEventListener("mousemove", (event) => {
    const activeFigure = getTopAboutFigureAt(event.clientX, event.clientY);
    aboutSection.style.cursor = activeFigure ? "pointer" : "default";
    currentHoveredFigure = activeFigure;
    aboutFigures.forEach((figure) => {
      if (figure === activeFigure) enterAboutFigure(figure);
      else leaveAboutFigure(figure);
    });
    if (isDesktopPointer) {
      const targetKey = activeFigure ? activeFigure.dataset.bioTarget : "";
      if (targetKey) setAboutActiveBio(targetKey, false, true);
      else setAboutActiveBio("", false, true);
    }
  });

  aboutSection.addEventListener("mouseleave", () => {
    currentHoveredFigure = null;
    aboutSection.style.cursor = "default";
    aboutFigures.forEach((figure) => leaveAboutFigure(figure));
    if (isDesktopPointer) setAboutActiveBio("", false, true);
  });

  aboutSection.addEventListener("click", (event) => {
    if (isDesktopPointer) return;
    const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
    const eventTarget = event.target;
    const tappedSubject = eventTarget instanceof HTMLElement
      && Boolean(eventTarget.closest(".scene2-strip-fg-image[data-bio-target]"));
    if (isMobileViewport && !tappedSubject) return;

    // Use the same resolved hover target so click area matches hover area 1:1.
    const activeFigure = currentHoveredFigure || getTopAboutFigureAt(event.clientX, event.clientY);
    if (!activeFigure) {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest(".section-content")) return;
      return;
    }
    const targetKey = activeFigure.dataset.bioTarget;
    if (!targetKey) return;
    setAboutActiveBio(targetKey, true);
  });
  aboutSection.addEventListener("touchend", (event) => {
    if (isDesktopPointer) return;
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;
    const activeFigure = getTopAboutFigureAt(touch.clientX, touch.clientY);
    if (!activeFigure) return;
    const targetKey = activeFigure.dataset.bioTarget;
    if (!targetKey) return;
    setAboutActiveBio(targetKey, true);
  }, { passive: true });

  aboutSection.addEventListener("touchstart", stopPulseOnMobileInteraction, { passive: true, once: true });
  aboutSection.addEventListener("click", stopPulseOnMobileInteraction, { passive: true, once: true });
  aboutSection.addEventListener("keydown", stopPulseOnMobileInteraction, { once: true });

  if (aboutBioPanel) {
    aboutBioPanel.addEventListener("touchstart", (event) => {
      if (!window.matchMedia("(max-width: 768px)").matches) return;
      const touch = event.touches[0];
      if (!touch) return;
      aboutSwipeStartX = touch.clientX;
      aboutSwipeStartY = touch.clientY;
    }, { passive: true });

    aboutBioPanel.addEventListener("touchend", (event) => {
      if (!window.matchMedia("(max-width: 768px)").matches) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - aboutSwipeStartX;
      const dy = touch.clientY - aboutSwipeStartY;
      if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) return;

      const activeKey = aboutSection.dataset.activeBio || aboutBioOrder[0];
      const activeIndex = getAboutBioOrderIndex(activeKey);
      if (activeIndex < 0) return;

      // Request: swipe right => next card, swipe left => previous card.
      const nextIndex = dx > 0 ? activeIndex + 1 : activeIndex - 1;
      const nextKey = getAboutBioByOrderIndex(nextIndex);
      if (!nextKey) return;
      setAboutActiveBio(nextKey, false, true);
    }, { passive: true });
  }

  ensureAboutMobileActiveCard();
  window.setTimeout(syncAboutMobileCardPanelHeight, 120);
  window.addEventListener("resize", ensureAboutMobileActiveCard, { passive: true });
  window.addEventListener("resize", syncAboutMobileCardPanelHeight, { passive: true });
  window.addEventListener("orientationchange", ensureAboutMobileActiveCard, { passive: true });
  window.addEventListener("orientationchange", syncAboutMobileCardPanelHeight, { passive: true });
}

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
  if (window.location.hash && window.location.hash !== "#home" && !pendingPostIntroHash) {
    pendingPostIntroHash = window.location.hash;
  }
  forceHomeWhileIntroLocked();
  syncContactSectionHeightToBackground();
  if (shouldSkipIntro) {
    if (window.location.hash) {
      resolveDeepHashNavigation(window.location.hash);
    } else {
      window.scrollTo(0, 0);
      setActiveNav("home");
    }
    return;
  }
  const intro = document.getElementById("intro");
  const textRevealDelayMs = 3000;
  const textRevealDurationMs = 3000;
  window.setTimeout(() => {
    forceHomeWhileIntroLocked();
    document.body.classList.remove("text-reveal-pending");
    document.body.classList.remove("intro-scroll-lock");
    document.documentElement.classList.remove("intro-scroll-lock");
    window.scrollTo(0, 0);
    if (pendingPostIntroHash) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}${pendingPostIntroHash}`);
      resolveDeepHashNavigation(pendingPostIntroHash);
      pendingPostIntroHash = "";
    }
    window.setTimeout(() => {
      document.body.classList.remove("text-reveal-anim");
    }, textRevealDurationMs);
  }, textRevealDelayMs);
  if (intro) {
    window.setTimeout(() => {
      intro.style.transition = "opacity 1s ease";
      intro.style.opacity = "0";
      window.setTimeout(() => {
        intro.remove();
      }, 1000);
    }, 1800);
    return;
  }
});
