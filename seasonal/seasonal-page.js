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
const GRADUATION_EVENT_IDS = new Set(["graduation", "graduation_late"]);
const PROMO_SEEN_STORAGE_KEY = "marvell-seasonal-promo-cooldown";
const PROMO_SEEN_COOLDOWN_MS = 15 * 60 * 1000;
let featuredCatalogPromise = null;
let stopPromoSeenMonitor = null;

function readPromoSeenState() {
  if (typeof window === "undefined" || !window.localStorage) return 0;
  try {
    const raw = window.localStorage.getItem(PROMO_SEEN_STORAGE_KEY);
    const parsed = Number(raw || "0");
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (_error) {
    return 0;
  }
}

function writePromoSeenState(nextState) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(PROMO_SEEN_STORAGE_KEY, String(Math.max(0, Number(nextState) || 0)));
  } catch (_error) {
    // Ignore storage failures.
  }
}

function hasSeenPromoRecently() {
  const lastSeenAt = readPromoSeenState();
  if (!lastSeenAt) return false;
  return (Date.now() - lastSeenAt) < PROMO_SEEN_COOLDOWN_MS;
}

function markPromoSeen() {
  writePromoSeenState(Date.now());
}

function clearPromoSeenMonitor() {
  if (typeof stopPromoSeenMonitor === "function") stopPromoSeenMonitor();
  stopPromoSeenMonitor = null;
}

function monitorPromoStripSeen(strip) {
  clearPromoSeenMonitor();
  if (!(strip instanceof HTMLElement)) return;

  const isActuallyVisible = () => {
    if (!document.body.classList.contains("has-promo-strip")) return false;
    if (strip.getAttribute("aria-hidden") === "true") return false;
    if (document.body.classList.contains("desktop-promo-deferred")) return false;
    const styles = window.getComputedStyle(strip);
    if (styles.display === "none" || styles.visibility === "hidden") return false;
    if (Number(styles.opacity) <= 0.01) return false;
    const rect = strip.getBoundingClientRect();
    return rect.height > 0 && rect.bottom > 0;
  };

  const checkVisibility = () => {
    if (!isActuallyVisible()) return;
    markPromoSeen();
    clearPromoSeenMonitor();
  };

  const scheduleCheck = () => window.requestAnimationFrame(checkVisibility);
  const options = { passive: true };
  window.addEventListener("scroll", scheduleCheck, options);
  window.addEventListener("resize", scheduleCheck);
  window.addEventListener("pageshow", scheduleCheck);
  strip.addEventListener("transitionend", scheduleCheck);
  strip.addEventListener("animationend", scheduleCheck);
  const timeoutId = window.setTimeout(scheduleCheck, 700);

  stopPromoSeenMonitor = () => {
    window.removeEventListener("scroll", scheduleCheck, options);
    window.removeEventListener("resize", scheduleCheck);
    window.removeEventListener("pageshow", scheduleCheck);
    strip.removeEventListener("transitionend", scheduleCheck);
    strip.removeEventListener("animationend", scheduleCheck);
    window.clearTimeout(timeoutId);
  };

  scheduleCheck();
}

function setSeasonalAvailabilityState(isActive) {
  if (typeof document === "undefined") return;
  document.body.classList.toggle("seasonal-inactive", !isActive);
  document.body.classList.toggle("seasonal-active", isActive);
  window.dispatchEvent(new CustomEvent("seasonalavailabilitychange", {
    detail: { isActive: Boolean(isActive) }
  }));

  const featuredAnchors = Array.from(document.querySelectorAll(
    '[data-seasonal-featured-link], a[href="#featured"], a[href="#featured-showcase"], a[href="index.html#featured-showcase"], a[href="featured.html"]'
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

function markSeasonalManagedContent(isManaged) {
  if (typeof document === "undefined") return;
  [
    document.getElementById("collection-promo-link"),
    document.getElementById("featured-collection-current"),
    document.getElementById("featured-kicker"),
    document.getElementById("featured-title"),
    document.getElementById("featured-lead")
  ].forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (isManaged) node.dataset.seasonalManaged = "true";
    else {
      delete node.dataset.seasonalManaged;
      delete node.dataset.seasonalLabel;
    }
  });
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

function getSeasonalHeroMobilePosition(eventConfig) {
  const eventId = String(eventConfig?.id || "").trim().toLowerCase();
  if (GRADUATION_EVENT_IDS.has(eventId)) return "60% center";
  return "center center";
}

function applySeasonalFeaturedHeroPosition(imageElement, eventConfig) {
  if (!(imageElement instanceof HTMLImageElement)) return;
  const isMobileViewport = window.matchMedia("(max-width: 1024px)").matches;
  imageElement.style.objectPosition = isMobileViewport
    ? getSeasonalHeroMobilePosition(eventConfig)
    : "center";
}

function applySeasonalHomeHeroPosition(backgroundElement, eventConfig) {
  if (!(backgroundElement instanceof HTMLElement)) return;
  const isMobileViewport = window.matchMedia("(max-width: 1024px)").matches;
  backgroundElement.style.backgroundPosition = isMobileViewport
    ? getSeasonalHeroMobilePosition(eventConfig)
    : "center center";
}

function normalizeAdditionalImageUsage(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "hover" || raw === "carousel" || raw === "both") return raw;
  return "both";
}

function normalizeMediaPosition(value) {
  const raw = String(value || "").trim();
  return raw || "center center";
}

function normalizeAdditionalImages(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === "string") {
      const image = normalizeAssetPath(entry);
      if (!image) return null;
      return {
        image,
        usage: "both",
        hoverPosition: "center center",
        scrollPosition: "center center"
      };
    }
    if (!entry || typeof entry !== "object") return null;
    const image = normalizeAssetPath(entry.image || entry.src || "");
    if (!image) return null;
    return {
      image,
      usage: normalizeAdditionalImageUsage(entry.usage),
      hoverPosition: normalizeMediaPosition(entry.hoverPosition),
      scrollPosition: normalizeMediaPosition(entry.scrollPosition)
    };
  }).filter(Boolean);
}

function buildFeaturedCardSlides(item) {
  const primaryImage = normalizeAssetPath(item?.src || item?.image || "");
  const slides = [];
  let hoverIndex = -1;
  if (primaryImage) {
    slides.push({
      image: primaryImage,
      scrollPosition: "center center"
    });
  }
  const extras = normalizeAdditionalImages(item?.additionalImages);
  const hoverEntry = extras.find((entry) => entry?.image && entry.usage !== "carousel") || null;
  if (hoverEntry?.image) {
    hoverIndex = slides.length;
    slides.push({
      image: hoverEntry.image,
      scrollPosition: hoverEntry.hoverPosition || hoverEntry.scrollPosition || "center center"
    });
  }
  extras.forEach((entry) => {
    if (!entry?.image || entry.usage === "hover") return;
    if (hoverEntry && entry.image === hoverEntry.image) return;
    slides.push({
      image: entry.image,
      scrollPosition: entry.scrollPosition || "center center"
    });
  });
  return { slides, hoverIndex };
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
    const embeddedPayload = document.getElementById("embedded-featured-json");
    if (embeddedPayload instanceof HTMLScriptElement) {
      try {
        const parsed = JSON.parse(embeddedPayload.textContent || "{}");
        if (parsed && typeof parsed === "object") return parsed;
      } catch (_error) {
        // Ignore invalid embedded fallback.
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

function resolveActiveCatalogEvents(catalog, today = new Date()) {
  const events = Array.isArray(catalog?.events) ? catalog.events : [];
  if (!events.length) return [];

  const combined = sortEventsByPriority([
    ...events.filter((event) => event?.forceActive === true),
    ...events.filter((event) => isScheduledEventActive(event, today))
  ]);

  const deduped = [];
  const seen = new Set();
  combined.forEach((event) => {
    const key = String(event?.id || "").trim();
    const dedupeKey = key || JSON.stringify([event?.title || "", event?.start || "", event?.end || ""]);
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    deduped.push(event);
  });
  return deduped;
}

function getRenderableCatalogEvents(events = []) {
  return events.filter((event) => {
    const eventProducts = Array.isArray(event?.products) ? event.products : [];
    return eventProducts.some((item) => String(item?.src || "").trim().length > 0);
  });
}

function getRequestedFeaturedEventId() {
  if (typeof window === "undefined") return "";
  const params = new URL(window.location.href).searchParams;
  return String(params.get("event") || "").trim();
}

function isDedicatedFeaturedPage() {
  if (typeof window === "undefined") return false;
  const pathname = String(window.location.pathname || "").toLowerCase();
  return pathname.endsWith("/featured.html") || pathname === "/featured.html" || pathname.endsWith("featured.html");
}

function resolvePrimaryFeaturedEvent(events = []) {
  const requestedId = getRequestedFeaturedEventId();
  if (requestedId) {
    const requestedMatch = events.find((event) => String(event?.id || "").trim() === requestedId);
    if (requestedMatch) return requestedMatch;
  }
  return events[0] || null;
}

function getHomepageFeaturedEvents(events = [], limit = 2) {
  if (!Array.isArray(events) || !events.length) return [];
  return events.slice(0, Math.max(0, Number(limit) || 0));
}

function getActiveUiLanguage() {
  if (typeof window === "undefined") return "en";
  const params = new URL(window.location.href).searchParams;
  const fromUrl = String(params.get("lang") || "").trim().toLowerCase();
  if (fromUrl === "en" || fromUrl === "id") return fromUrl;
  try {
    const fromStorage = String(window.localStorage?.getItem("marvell-language") || "").trim().toLowerCase();
    if (fromStorage === "en" || fromStorage === "id") return fromStorage;
  } catch (_error) {
    // Ignore storage access issues.
  }
  const fromDocument = String(document.documentElement.lang || "").trim().toLowerCase();
  return fromDocument === "id" ? "id" : "en";
}

function buildLocalizedFeaturedHref(eventId = "") {
  const href = eventId
    ? `featured.html?event=${encodeURIComponent(eventId)}`
    : "featured.html";
  if (typeof window === "undefined") return href;
  const url = new URL(href, window.location.href);
  const activeLanguage = getActiveUiLanguage();
  if (activeLanguage === "en" || activeLanguage === "id") {
    url.searchParams.set("lang", activeLanguage);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function localizeSeasonalCollectionTitle(title = "", language = getActiveUiLanguage()) {
  const raw = String(title || "").trim();
  if (!raw) return language === "id" ? "Koleksi" : "Collections";
  if (language !== "id") return raw;
  const map = {
    "Ramadan & Eid Collection": "Koleksi Ramadan & Idul Fitri",
    "Valentine's Collection": "Koleksi Valentine",
    "Graduation Collection": "Koleksi Wisuda",
    "Mother's Day Collection": "Koleksi Hari Ibu",
    "Chinese New Year Collection": "Koleksi Tahun Baru Imlek",
    "Christmas Collection": "Koleksi Natal",
    "Featured Collection": "Koleksi Pilihan",
    "Collections": "Koleksi",
    "Seasonal Collection": "Koleksi Musiman"
  };
  return map[raw] || raw;
}

function syncFeaturedMenuTriggers(events = []) {
  const triggers = Array.from(document.querySelectorAll('[data-seasonal-featured-link][data-menu-open], [data-seasonal-featured-link][data-seasonal-direct-href]'));
  if (!triggers.length) return;

  const activeLanguage = getActiveUiLanguage();
  const hasMultiple = events.length > 1;
  const primaryEvent = resolvePrimaryFeaturedEvent(events);
  const fallbackLabel = activeLanguage === "id" ? "Koleksi" : "Collections";

  triggers.forEach((trigger) => {
    if (!(trigger instanceof HTMLElement)) return;
    const rawLabel = !hasMultiple && primaryEvent
      ? String(primaryEvent.title || "").trim() || "Collections"
      : "Collections";
    const nextLabel = !hasMultiple && primaryEvent
      ? localizeSeasonalCollectionTitle(rawLabel, activeLanguage)
      : fallbackLabel;

    trigger.textContent = nextLabel;
    trigger.dataset.seasonalManaged = "true";
    trigger.dataset.seasonalLabel = rawLabel;

    if (hasMultiple || !primaryEvent) {
      trigger.setAttribute("data-menu-open", "featured");
      trigger.removeAttribute("data-seasonal-direct-href");
    } else {
      trigger.setAttribute("data-seasonal-direct-href", buildLocalizedFeaturedHref(String(primaryEvent.id || "").trim()));
      trigger.removeAttribute("data-menu-open");
    }
  });
}

function renderFeaturedMenuList(events = []) {
  const menuLists = Array.from(document.querySelectorAll("[data-featured-menu-list]"));
  const markup = events.map((eventConfig) => {
    const eventId = String(eventConfig?.id || "").trim();
    const eventTitle = String(eventConfig?.title || "").trim() || "Collections";
    const localizedTitle = localizeSeasonalCollectionTitle(eventTitle);
    if (!eventId) return "";
    return `<a class="menu-link" data-seasonal-managed="true" data-seasonal-label="${escapeHTML(eventTitle)}" href="${escapeHTML(buildLocalizedFeaturedHref(eventId))}">${escapeHTML(localizedTitle)}</a>`;
  }).join("");

  syncFeaturedMenuTriggers(events);
  if (!menuLists.length) return;
  menuLists.forEach((container) => {
    if (!(container instanceof HTMLElement)) return;
    container.innerHTML = markup;
  });
}

function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
  if (Number.isFinite(numeric)) {
    return `Rp${new Intl.NumberFormat("id-ID").format(Math.round(numeric))}`;
  }
  return String(value).trim();
}

const FEATURED_TYPE_DEFS = [
  { id: "bouquet", label: "Bouquet", tokens: ["bouquet", "bouquets", "buket", "hand bouquet"] },
  { id: "artificial", label: "Table Arrangements", tokens: ["table arrangement", "table arrangements", "floral arrangement", "centerpiece", "rangkaian meja"] },
  { id: "standing", label: "Standing Flowers", tokens: ["standing", "standing flower", "standing flowers", "bunga berdiri"] },
  { id: "papan", label: "Papan Bunga", tokens: ["papan bunga", "flower board", "karangan papan", "papan"] },
  { id: "parcel", label: "Parcels", tokens: ["parcel", "parcels", "parsel", "hampers"] },
  { id: "bloom-box", label: "Bloom Box", tokens: ["bloom box", "bloombox", "bloom-box"] },
  { id: "pot", label: "Pot", tokens: ["pot", "potted"] },
  { id: "basket", label: "Basket", tokens: ["basket", "keranjang"] }
];

const FEATURED_COLOR_DEFS = [
  { id: "white", label: "White", tokens: ["white", "putih"] },
  { id: "red", label: "Red", tokens: ["red", "merah"] },
  { id: "pink", label: "Pink", tokens: ["pink"] },
  { id: "purple", label: "Purple", tokens: ["purple", "ungu", "purp", "perp"] },
  { id: "blue", label: "Blue", tokens: ["blue", "biru"] },
  { id: "yellow", label: "Yellow", tokens: ["yellow", "kuning"] },
  { id: "orange", label: "Orange", tokens: ["orange", "oranye"] },
  { id: "peach", label: "Peach", tokens: ["peach"] },
  { id: "brown", label: "Brown", tokens: ["brown", "cokelat", "coklat", "mocha", "tan"] },
  { id: "gray", label: "Gray", tokens: ["gray", "grey", "abu", "abu-abu"] },
  { id: "green", label: "Green", tokens: ["green", "hijau"] },
  { id: "black", label: "Black", tokens: ["black", "hitam"] },
  { id: "gold", label: "Gold", tokens: ["gold", "emas"] }
];

const FEATURED_FLOWER_CONDITION_DEFS = [
  { id: "fresh", label: "Fresh", tokens: ["fresh", "segar"] },
  { id: "artificial", label: "Artificial", tokens: ["artificial", "silk", "faux", "imitasi"] },
  { id: "preserved", label: "Preserved", tokens: ["preserved", "dried", "everlasting", "awet"] }
];

const FEATURED_FLOWER_TYPE_DEFS = [
  { id: "mawar", label: "Roses", tokens: ["mawar", "rose", "roses"] },
  { id: "tulip", label: "Tulips", tokens: ["tulip"] },
  { id: "anggrek", label: "Orchids", tokens: ["anggrek", "orchid", "orchids"] },
  { id: "lily", label: "Lily", tokens: ["lily", "lilies"] },
  { id: "babys-breath", label: "Baby's Breath", tokens: ["baby's breath", "babys breath", "babysbreath", "gypsophila"] },
  { id: "aster", label: "Aster", tokens: ["aster"] },
  { id: "sunflower", label: "Sunflowers", tokens: ["sunflower", "sun flower"] },
  { id: "carnation", label: "Carnations", tokens: ["carnation", "carnations"] },
  { id: "hydrangea", label: "Hydrangeas", tokens: ["hydrangea", "hydrangeas", "hortensia"] },
  { id: "peony", label: "Peonies", tokens: ["peony", "peonies"] },
  { id: "gerbera", label: "Gerberas", tokens: ["gerbera"] },
  { id: "chrysanthemum", label: "Chrysanthemums", tokens: ["chrysanthemum", "chrysanthemums", "krisan"] }
];

function normalizeFeaturedFilterToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function buildFeaturedSourceContext(item) {
  const source = [
    String(item?.name || item?.title || "").trim(),
    String(item?.src || item?.image || "").trim()
  ].join(" ").toLowerCase();
  const compact = source.replace(/[^a-z0-9]+/g, "");
  return { raw: source, compact };
}

function featuredSourceHasAny(context, candidates) {
  return candidates.some((candidate) => {
    const raw = String(candidate || "").trim().toLowerCase();
    if (!raw) return false;
    const compact = raw.replace(/[^a-z0-9]+/g, "");
    return context.raw.includes(raw) || (compact && context.compact.includes(compact));
  });
}

function getFeaturedStructuredFilterTokens(item, groupId) {
  const filters = item?.filters && typeof item.filters === "object" ? item.filters : {};
  let raw = null;
  if (groupId === "type") raw = filters.type;
  if (groupId === "color") raw = filters.colors;
  if (groupId === "flower-condition") raw = filters.flowerCondition;
  if (groupId === "flower-type") raw = filters.flowerTypes;
  if (raw === undefined || raw === null || raw === "") return [];
  if (Array.isArray(raw)) {
    return raw.map((entry) => normalizeFeaturedFilterToken(entry)).filter(Boolean);
  }
  return [normalizeFeaturedFilterToken(raw)].filter(Boolean);
}

function resolveFeaturedTypeTokens(item) {
  const structured = getFeaturedStructuredFilterTokens(item, "type");
  if (structured.length) return structured;
  const context = buildFeaturedSourceContext(item);
  return FEATURED_TYPE_DEFS
    .filter((definition) => featuredSourceHasAny(context, definition.tokens))
    .map((definition) => definition.id);
}

function resolveFeaturedColorTokens(item) {
  const structured = getFeaturedStructuredFilterTokens(item, "color");
  if (structured.length) return structured;
  const context = buildFeaturedSourceContext(item);
  const inferred = FEATURED_COLOR_DEFS
    .filter((definition) => featuredSourceHasAny(context, definition.tokens))
    .map((definition) => definition.id);
  return inferred;
}

function getFeaturedColorSwatchValue(colorId) {
  const normalized = normalizeFeaturedFilterToken(colorId);
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
  return palette[normalized] || "#d7cfc2";
}

function resolveFeaturedFlowerConditionTokens(item, typeTokens = []) {
  const structured = getFeaturedStructuredFilterTokens(item, "flower-condition");
  if (structured.length) return structured;
  const context = buildFeaturedSourceContext(item);
  const inferred = FEATURED_FLOWER_CONDITION_DEFS
    .filter((definition) => featuredSourceHasAny(context, definition.tokens))
    .map((definition) => definition.id);
  if (inferred.length) return inferred;
  if (Array.isArray(typeTokens) && typeTokens.includes("artificial")) return ["artificial"];
  if (Array.isArray(typeTokens) && typeTokens.length) return ["fresh"];
  return [];
}

function resolveFeaturedFlowerTypeTokens(item) {
  const structured = getFeaturedStructuredFilterTokens(item, "flower-type");
  if (structured.length) return structured;
  const context = buildFeaturedSourceContext(item);
  return FEATURED_FLOWER_TYPE_DEFS
    .filter((definition) => featuredSourceHasAny(context, definition.tokens))
    .map((definition) => definition.id);
}

function parseFeaturedNumericPrice(value) {
  const numeric = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function getFeaturedPriceFilterStep(min, max) {
  const span = Math.max(0, Number(max) - Number(min));
  if (span <= 100000) return 5000;
  if (span <= 500000) return 10000;
  return 25000;
}

function buildFeaturedPriceFilterConfig(eventConfig, items) {
  if (eventConfig?.enablePriceFilter === false) return null;
  const prices = items
    .map((item) => parseFeaturedNumericPrice(item?.price))
    .filter((value) => Number.isFinite(value));
  const explicitMin = Number.isFinite(Number(eventConfig?.priceMin)) && Number(eventConfig.priceMin) > 0
    ? Number(eventConfig.priceMin)
    : null;
  const explicitMax = Number.isFinite(Number(eventConfig?.priceMax)) && Number(eventConfig.priceMax) > 0
    ? Number(eventConfig.priceMax)
    : null;
  const min = explicitMin ?? (prices.length ? Math.min(...prices) : null);
  const max = explicitMax ?? (prices.length ? Math.max(...prices) : null);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return null;
  return {
    id: "price-range",
    label: "Price Range",
    kind: "range",
    min,
    max,
    step: getFeaturedPriceFilterStep(min, max)
  };
}

function renderFeaturedFiltersMarkup(filters) {
  return filters.map((group) => {
    if (group.kind === "range") {
      return `
        <fieldset class="filter-group" data-featured-filter-group="${escapeHTML(group.id)}" data-featured-filter-kind="range">
          <button class="filter-group-toggle" type="button" aria-expanded="false" aria-controls="featured-filter-panel-${escapeHTML(group.id)}">
            <span class="filter-group-title">${escapeHTML(group.label)}</span>
            <span class="filter-group-icon" aria-hidden="true">+</span>
          </button>
          <div class="filter-group-panel" id="featured-filter-panel-${escapeHTML(group.id)}">
            <div class="filter-range" data-filter-range="${escapeHTML(group.id)}">
              <div class="filter-range-values">
                <span data-range-value="min">${escapeHTML(formatRupiah(group.min))}</span>
                <span data-range-value="max">${escapeHTML(formatRupiah(group.max))}</span>
              </div>
              <div class="filter-range-sliders">
                <div class="filter-range-track"></div>
                <div class="filter-range-fill" data-range-fill></div>
                <input class="filter-range-input filter-range-input-min" type="range" min="${escapeHTML(group.min)}" max="${escapeHTML(group.max)}" step="${escapeHTML(group.step)}" value="${escapeHTML(group.min)}" data-range-bound="min" data-filter-group="${escapeHTML(group.id)}" aria-label="${escapeHTML(group.label)} minimum">
                <input class="filter-range-input filter-range-input-max" type="range" min="${escapeHTML(group.min)}" max="${escapeHTML(group.max)}" step="${escapeHTML(group.step)}" value="${escapeHTML(group.max)}" data-range-bound="max" data-filter-group="${escapeHTML(group.id)}" aria-label="${escapeHTML(group.label)} maximum">
              </div>
              <p class="filter-range-note">Move to set the minimum and maximum price.</p>
            </div>
          </div>
        </fieldset>
      `;
    }

    if (group.id === "color") {
      return `
        <fieldset class="filter-group" data-featured-filter-group="${escapeHTML(group.id)}">
          <button class="filter-group-toggle" type="button" aria-expanded="false" aria-controls="featured-filter-panel-${escapeHTML(group.id)}">
            <span class="filter-group-title">${escapeHTML(group.label)}</span>
            <span class="filter-group-icon" aria-hidden="true">+</span>
          </button>
          <div class="filter-group-panel" id="featured-filter-panel-${escapeHTML(group.id)}">
            <div class="filter-options filter-options--color">
              ${group.options.map((option) => `
                <label class="filter-option filter-option--color" data-color-id="${escapeHTML(option.id)}" title="${escapeHTML(option.label)} (${escapeHTML(option.count)})" aria-label="${escapeHTML(option.label)} (${escapeHTML(option.count)})">
                  <input type="checkbox" data-filter-group="${escapeHTML(group.id)}" value="${escapeHTML(option.id)}" aria-label="${escapeHTML(option.label)} (${escapeHTML(option.count)})">
                  <span class="filter-option-label" style="--filter-swatch:${escapeHTML(getFeaturedColorSwatchValue(option.id))};">
                    <span class="filter-color-swatch" aria-hidden="true"></span>
                    <span class="filter-color-meta">
                      <span class="filter-color-text">${escapeHTML(`${option.label} (${option.count})`)}</span>
                    </span>
                  </span>
                </label>
              `).join("")}
            </div>
          </div>
        </fieldset>
      `;
    }

    return `
      <fieldset class="filter-group" data-featured-filter-group="${escapeHTML(group.id)}">
        <button class="filter-group-toggle" type="button" aria-expanded="false" aria-controls="featured-filter-panel-${escapeHTML(group.id)}">
          <span class="filter-group-title">${escapeHTML(group.label)}</span>
          <span class="filter-group-icon" aria-hidden="true">+</span>
        </button>
        <div class="filter-group-panel" id="featured-filter-panel-${escapeHTML(group.id)}">
          <div class="filter-options">
            ${group.options.map((option) => `
              <label class="filter-option">
                <input type="checkbox" data-filter-group="${escapeHTML(group.id)}" value="${escapeHTML(option.id)}">
                <span class="filter-option-label">${escapeHTML(option.label)} (${escapeHTML(option.count)})</span>
              </label>
            `).join("")}
          </div>
        </div>
      </fieldset>
    `;
  }).join("");
}

function initializeDedicatedFeaturedFilters(scopeRoot, eventConfig, eventProducts) {
  if (!(scopeRoot instanceof HTMLElement) || !isDedicatedFeaturedPage()) return;
  const filtersAnchor = document.getElementById("featured-filters-anchor");
  const existingShell = document.querySelector("[data-featured-filters-shell]");
  const existingModal = document.getElementById("featured-filters-modal");
  const existingBackdrop = document.querySelector("[data-featured-filters-backdrop]");
  const existingEmptyState = document.querySelector("[data-featured-filters-empty]");
  if (existingShell instanceof HTMLElement) existingShell.remove();
  if (existingModal instanceof HTMLElement) existingModal.remove();
  if (existingBackdrop instanceof HTMLElement) existingBackdrop.remove();
  if (existingEmptyState instanceof HTMLElement) existingEmptyState.remove();

  const grid = scopeRoot.querySelector("[data-featured-grid]");
  if (!(grid instanceof HTMLElement)) return;
  const cards = Array.from(grid.querySelectorAll("[data-featured-card]"));
  const products = Array.isArray(eventProducts) ? eventProducts : [];
  const records = products.map((item, index) => {
    const typeTokens = resolveFeaturedTypeTokens(item);
    return {
      item,
      card: cards[index] instanceof HTMLElement ? cards[index] : null,
      typeTokens: new Set(typeTokens),
      colorTokens: new Set(resolveFeaturedColorTokens(item)),
      flowerConditionTokens: new Set(resolveFeaturedFlowerConditionTokens(item, typeTokens)),
      flowerTypeTokens: new Set(resolveFeaturedFlowerTypeTokens(item)),
      price: parseFeaturedNumericPrice(item?.price)
    };
  }).filter((record) => record.card instanceof HTMLElement);
  if (!records.length) return;

  const typeOptions = FEATURED_TYPE_DEFS
    .map((definition) => {
      const count = records.reduce((total, record) => total + (record.typeTokens.has(definition.id) ? 1 : 0), 0);
      return { id: definition.id, label: definition.label, count };
    })
    .filter((option) => option.count > 0);
  const colorOptions = FEATURED_COLOR_DEFS
    .map((definition) => {
      const count = records.reduce((total, record) => total + (record.colorTokens.has(definition.id) ? 1 : 0), 0);
      return { id: definition.id, label: definition.label, count };
    })
    .filter((option) => option.count > 0);
  const flowerConditionOptions = FEATURED_FLOWER_CONDITION_DEFS
    .map((definition) => {
      const count = records.reduce((total, record) => total + (record.flowerConditionTokens.has(definition.id) ? 1 : 0), 0);
      return { id: definition.id, label: definition.label, count };
    })
    .filter((option) => option.count > 0);
  const flowerTypeOptions = FEATURED_FLOWER_TYPE_DEFS
    .map((definition) => {
      const count = records.reduce((total, record) => total + (record.flowerTypeTokens.has(definition.id) ? 1 : 0), 0);
      return { id: definition.id, label: definition.label, count };
    })
    .filter((option) => option.count > 0);
  const filters = [
    typeOptions.length ? { id: "type", label: "Type", options: typeOptions } : null,
    colorOptions.length ? { id: "color", label: "Color", options: colorOptions } : null,
    flowerConditionOptions.length ? { id: "flower-condition", label: "Flower Type", options: flowerConditionOptions } : null,
    flowerTypeOptions.length ? { id: "flower-type", label: "Flowers", options: flowerTypeOptions } : null,
    buildFeaturedPriceFilterConfig(eventConfig, products)
  ].filter(Boolean);
  if (!filters.length) return;

  const shellMarkup = `
    <div class="featured-filters-shell" data-featured-filters-shell>
      <div class="filters-toolbar">
        <button class="filters-trigger" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="featured-filters-modal">
          <span class="filters-trigger-label">Filter</span>
          <span class="filters-trigger-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings2-icon lucide-settings-2"><path d="M14 17H5"/><path d="M19 7h-9"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg></span>
        </button>
      </div>
    </div>
  `;
  const portalMarkup = `
    <aside class="filters-panel-modal" id="featured-filters-modal" aria-hidden="true" tabindex="-1">
      <div class="filters-head">
        <h3>Filter</h3>
        <button class="filters-close" type="button" aria-label="Close filters panel">&#10005;</button>
      </div>
      <div class="filters-body">
        <div class="filters-panel">
          ${renderFeaturedFiltersMarkup(filters)}
          <div class="filter-actions">
            <button type="button" class="filter-clear">Reset filter</button>
          </div>
        </div>
      </div>
    </aside>
    <div class="featured-filters-backdrop" data-featured-filters-backdrop hidden></div>
  `;
  if (filtersAnchor instanceof HTMLElement) {
    filtersAnchor.innerHTML = shellMarkup;
  } else {
    grid.insertAdjacentHTML("beforebegin", shellMarkup);
  }
  document.body.insertAdjacentHTML("beforeend", portalMarkup);
  grid.insertAdjacentHTML("afterend", '<p class="featured-filters-empty" data-featured-filters-empty hidden>No products match these filters.</p>');

  const shellRoot = filtersAnchor instanceof HTMLElement ? filtersAnchor : scopeRoot;
  const panelRoot = document;
  const shell = shellRoot.querySelector("[data-featured-filters-shell]");
  const trigger = shellRoot.querySelector(".filters-trigger");
  const modal = panelRoot.getElementById("featured-filters-modal");
  const closeButton = panelRoot.querySelector(".filters-close");
  const clearButton = panelRoot.querySelector(".filter-clear");
  const backdrop = panelRoot.querySelector("[data-featured-filters-backdrop]");
  const emptyState = document.querySelector("[data-featured-filters-empty]");
  const checks = Array.from(panelRoot.querySelectorAll("#featured-filters-modal input[type='checkbox'][data-filter-group]"));
  const rangeInputs = Array.from(panelRoot.querySelectorAll("#featured-filters-modal input[type='range'][data-filter-group]"));
  const groupToggles = Array.from(panelRoot.querySelectorAll("#featured-filters-modal .filter-group-toggle"));
  const selectedByGroup = new Map(
    filters
      .filter((group) => group.kind !== "range")
      .map((group) => [group.id, new Set()])
  );
  const rangeStateByGroup = new Map(
    filters
      .filter((group) => group.kind === "range")
      .map((group) => [group.id, { min: group.min, max: group.max, initialMin: group.min, initialMax: group.max }])
  );
  let backdropHideTimer = 0;

  const setFiltersOpen = (isOpen) => {
    if (!(modal instanceof HTMLElement) || !(trigger instanceof HTMLButtonElement)) return;
    modal.classList.toggle("is-open", isOpen);
    modal.setAttribute("aria-hidden", isOpen ? "false" : "true");
    trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (backdrop instanceof HTMLElement) {
      if (backdropHideTimer) {
        window.clearTimeout(backdropHideTimer);
        backdropHideTimer = 0;
      }
      if (isOpen) {
        backdrop.hidden = false;
        requestAnimationFrame(() => {
          backdrop.classList.add("is-open");
        });
      } else {
        backdrop.classList.remove("is-open");
        backdropHideTimer = window.setTimeout(() => {
          backdrop.hidden = true;
          backdropHideTimer = 0;
        }, 520);
      }
    }
    document.body.classList.toggle("featured-filters-open", isOpen);
    if (isOpen) modal.focus();
  };

  const isRangeFilterActive = (groupId) => {
    const state = rangeStateByGroup.get(groupId);
    if (!state) return false;
    return state.min !== state.initialMin || state.max !== state.initialMax;
  };

  const updateRangeUi = (groupId) => {
    const group = filters.find((entry) => entry.id === groupId && entry.kind === "range");
    const state = rangeStateByGroup.get(groupId);
    const wrap = panelRoot.querySelector(`#featured-filters-modal [data-filter-range="${groupId}"]`);
    if (!group || !state || !(wrap instanceof HTMLElement)) return;
    const minValue = wrap.querySelector('[data-range-value="min"]');
    const maxValue = wrap.querySelector('[data-range-value="max"]');
    const fill = wrap.querySelector("[data-range-fill]");
    if (minValue instanceof HTMLElement) minValue.textContent = formatRupiah(state.min);
    if (maxValue instanceof HTMLElement) maxValue.textContent = formatRupiah(state.max);
    if (fill instanceof HTMLElement) {
      const span = Math.max(1, group.max - group.min);
      const start = ((state.min - group.min) / span) * 100;
      const end = ((state.max - group.min) / span) * 100;
      fill.style.left = `${Math.max(0, Math.min(100, start))}%`;
      fill.style.right = `${Math.max(0, 100 - Math.max(0, Math.min(100, end)))}%`;
    }
  };

  const applyFilters = () => {
    const visibleCount = records.reduce((total, record) => {
      const isVisible = filters.every((group) => {
        if (group.kind === "range") {
          const state = rangeStateByGroup.get(group.id);
          if (!state || !isRangeFilterActive(group.id)) return true;
          if (!Number.isFinite(record.price)) return false;
          return record.price >= state.min && record.price <= state.max;
        }
        const selected = selectedByGroup.get(group.id);
        if (!selected || selected.size === 0) return true;
        const tokenSet = group.id === "type"
          ? record.typeTokens
          : group.id === "color"
            ? record.colorTokens
            : group.id === "flower-condition"
              ? record.flowerConditionTokens
              : record.flowerTypeTokens;
        return Array.from(selected).some((token) => tokenSet.has(token));
      });
      if (record.card instanceof HTMLElement) record.card.hidden = !isVisible;
      return total + (isVisible ? 1 : 0);
    }, 0);

    if (emptyState instanceof HTMLElement) emptyState.hidden = visibleCount !== 0;
  };

  checks.forEach((input) => {
    input.addEventListener("change", () => {
      const groupId = String(input.getAttribute("data-filter-group") || "").trim();
      const selected = selectedByGroup.get(groupId);
      if (!selected) return;
      if (input.checked) selected.add(normalizeFeaturedFilterToken(input.value));
      else selected.delete(normalizeFeaturedFilterToken(input.value));
      applyFilters();
    });
  });

  rangeInputs.forEach((input) => {
    input.addEventListener("input", () => {
      const groupId = String(input.getAttribute("data-filter-group") || "").trim();
      const bound = String(input.getAttribute("data-range-bound") || "").trim();
      const state = rangeStateByGroup.get(groupId);
      const group = filters.find((entry) => entry.id === groupId && entry.kind === "range");
      if (!state || !group) return;
      const value = Number(input.value);
      if (bound === "min") {
        state.min = Math.min(value, state.max);
        input.value = String(state.min);
      } else {
        state.max = Math.max(value, state.min);
        input.value = String(state.max);
      }
      const minInput = panelRoot.querySelector(`#featured-filters-modal input[data-filter-group="${groupId}"][data-range-bound="min"]`);
      const maxInput = panelRoot.querySelector(`#featured-filters-modal input[data-filter-group="${groupId}"][data-range-bound="max"]`);
      if (minInput instanceof HTMLInputElement) minInput.value = String(state.min);
      if (maxInput instanceof HTMLInputElement) maxInput.value = String(state.max);
      updateRangeUi(groupId);
      applyFilters();
    });
  });

  groupToggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    toggle.addEventListener("click", () => {
      const fieldset = toggle.closest(".filter-group");
      if (!(fieldset instanceof HTMLElement)) return;
      const panel = fieldset.querySelector(".filter-group-panel");
      if (!(panel instanceof HTMLElement)) return;
      const willOpen = !fieldset.classList.contains("is-open");
      fieldset.classList.toggle("is-open", willOpen);
      toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
      const icon = toggle.querySelector(".filter-group-icon");
      if (icon instanceof HTMLElement) icon.textContent = willOpen ? "−" : "+";
      panel.style.maxHeight = willOpen ? `${panel.scrollHeight}px` : "0px";
    });
  });

  if (trigger instanceof HTMLButtonElement) {
    trigger.addEventListener("click", () => setFiltersOpen(!(modal instanceof HTMLElement && modal.classList.contains("is-open"))));
  }
  if (closeButton instanceof HTMLButtonElement) closeButton.addEventListener("click", () => setFiltersOpen(false));
  if (backdrop instanceof HTMLElement) backdrop.addEventListener("click", () => setFiltersOpen(false));
  if (clearButton instanceof HTMLButtonElement) {
    clearButton.addEventListener("click", () => {
      selectedByGroup.forEach((set) => set.clear());
      checks.forEach((input) => { input.checked = false; });
      rangeStateByGroup.forEach((state, groupId) => {
        state.min = state.initialMin;
        state.max = state.initialMax;
        const minInput = panelRoot.querySelector(`#featured-filters-modal input[data-filter-group="${groupId}"][data-range-bound="min"]`);
        const maxInput = panelRoot.querySelector(`#featured-filters-modal input[data-filter-group="${groupId}"][data-range-bound="max"]`);
        if (minInput instanceof HTMLInputElement) minInput.value = String(state.min);
        if (maxInput instanceof HTMLInputElement) maxInput.value = String(state.max);
        updateRangeUi(groupId);
      });
      applyFilters();
    });
  }

  filters.forEach((group) => {
    if (group.kind === "range") updateRangeUi(group.id);
  });
  applyFilters();

  if (shell instanceof HTMLElement) {
    shell.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setFiltersOpen(false);
    });
  }
}

function renderFeaturedCard(eventTitle, eventKey, imagePath, productName, productIndex, productPrice = "") {
  const displayName = productName || "Eid Arrangement";
  const priceLabel = formatRupiah(productPrice);
  const categorySlug = toSlug(eventKey || eventTitle) || "featured";
  const productSlug = toSlug(displayName) || `produk-${productIndex + 1}`;
  const productAnchorId = `featured-product-${categorySlug}-${productSlug}`;
  const favoriteId = `featured:${categorySlug}:${productSlug}`;
  const productRecord = typeof imagePath === "object" && imagePath !== null
    ? imagePath
    : { src: imagePath, name: productName, price: productPrice };
  const primaryImage = normalizeAssetPath(productRecord?.src || imagePath || "");
  const detailHref = `product.html?category=${encodeURIComponent(eventTitle || "Featured Collection")}&title=${encodeURIComponent(displayName)}&image=${encodeURIComponent(primaryImage || "")}${priceLabel ? `&price=${encodeURIComponent(priceLabel)}` : ""}`;
  const { slides: carouselMedia, hoverIndex } = buildFeaturedCardSlides(productRecord);
  const safeSlides = carouselMedia.length ? carouselMedia : [{ image: normalizeAssetPath(imagePath || ""), scrollPosition: "center center" }];
  const hoverPreviewSlide = hoverIndex > 0 && hoverIndex < safeSlides.length ? safeSlides[hoverIndex] : null;
  const hasSingleFullPreview = !hoverPreviewSlide && safeSlides.length === 1 && !!safeSlides[0]?.image;
  const previewSlide = hoverPreviewSlide || (hasSingleFullPreview ? safeSlides[0] : null);
  const hoverPreviewMarkup = previewSlide && previewSlide.image ? `
          <div class="featured-hover-preview" data-featured-hover-preview aria-hidden="true">
            <img class="featured-hover-preview-image${hasSingleFullPreview ? " is-full-preview" : ""}" src="${escapeHTML(previewSlide.image)}" alt="" loading="lazy" decoding="async" style="object-position:${escapeHTML(previewSlide.scrollPosition || "center center")};">
          </div>
  ` : "";
  const slidesMarkup = safeSlides.map((entry, index) => {
    if (!entry.image) {
      return `<div class="featured-slide" data-featured-slide="${index}"><a class="featured-product-link" href="${escapeHTML(detailHref)}" aria-label="${escapeHTML(displayName)}"><div class="featured-product-placeholder" aria-hidden="true"></div></a></div>`;
    }
    return `
      <div class="featured-slide" data-featured-slide="${index}">
        <a class="featured-product-link" href="${escapeHTML(detailHref)}" aria-label="${escapeHTML(displayName)}">
          <img class="featured-product-image" src="${escapeHTML(entry.image)}" alt="${index === 0 ? escapeHTML(displayName) : ""}" ${index === 0 ? "" : 'aria-hidden="true"'} loading="lazy" decoding="async" style="object-position:${escapeHTML(entry.scrollPosition || "center center")};">
        </a>
      </div>
    `;
  }).join("");

  return `
    <article class="featured-product-card" data-featured-card data-featured-index="${productIndex}" id="${escapeHTML(productAnchorId)}">
      <div class="featured-media">
        <div class="featured-carousel ${safeSlides.length <= 1 ? "is-single" : ""}" data-featured-card-carousel data-featured-card-hover-index="${hoverIndex}" ${hasSingleFullPreview ? 'data-featured-card-single-full-preview="1"' : ""}>
          <div class="featured-viewport" data-featured-card-viewport>
            <div class="featured-track">
              ${slidesMarkup}
            </div>
          </div>
          ${hoverPreviewMarkup}
          <button class="featured-nav-btn featured-nav-btn--prev" type="button" aria-label="Previous image" data-featured-card-prev>&#8249;</button>
          <button class="featured-nav-btn featured-nav-btn--next" type="button" aria-label="Next image" data-featured-card-next>&#8250;</button>
          <div class="featured-carousel-meta" aria-hidden="true">
            <div class="featured-carousel-counter" data-featured-card-counter>1 / ${safeSlides.length}</div>
            <div class="featured-carousel-progress"><span class="featured-carousel-progress-fill" data-featured-card-progress-fill></span></div>
          </div>
        </div>
        <button class="favorite-toggle" type="button" data-favorite-toggle data-favorite-id="${escapeHTML(favoriteId)}" data-favorite-title="${escapeHTML(displayName)}" data-favorite-image="${escapeHTML(primaryImage)}" data-favorite-href="${escapeHTML(detailHref)}" data-favorite-price="${escapeHTML(priceLabel)}" data-favorite-category="${escapeHTML(eventTitle || "Collections")}" data-favorite-source="featured" aria-label="Save ${escapeHTML(displayName)}" onclick="return window.MarvellFavorites && window.MarvellFavorites.handleToggleClick ? window.MarvellFavorites.handleToggleClick(event, this) : false;">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.5 4.9 13.74a4.79 4.79 0 0 1 0-6.98 5.18 5.18 0 0 1 7.1 0L12 7.77l.01-.01a5.18 5.18 0 0 1 7.1 0 4.79 4.79 0 0 1 0 6.98L12 20.5Z"/></svg>
        </button>
      </div>
      <div class="featured-product-body">
        <p class="featured-product-name">${escapeHTML(displayName)}</p>
        ${priceLabel ? `<p class="featured-product-price">${escapeHTML(priceLabel)}</p>` : ""}
      </div>
    </article>
  `;
}

function renderFeaturedGrid(eventTitle, eventKey, images, options = {}) {
  const limit = Number.isFinite(Number(options?.limit)) ? Math.max(0, Number(options.limit)) : null;
  const scopedImages = limit === null ? images : images.slice(0, limit);
  const cardsMarkup = scopedImages.map((item, index) => {
    return renderFeaturedCard(eventTitle, eventKey, item, item.name, index, item.price || "");
  }).join("");
  return `
    <div class="featured-grid" data-featured-grid>
      ${cardsMarkup}
    </div>
  `;
}

function buildFeaturedCollectionHref(eventConfig) {
  const eventId = String(eventConfig?.id || "").trim();
  return eventId
    ? `featured.html?event=${encodeURIComponent(eventId)}`
    : "featured.html";
}

function buildFeaturedJournalHref(eventConfig) {
  const journalSlug = String(eventConfig?.journalSlug || "").trim();
  return journalSlug ? `journal.html?journal=${encodeURIComponent(journalSlug)}` : "";
}

function renderFeaturedCollectionCta(eventConfig) {
  if (isDedicatedFeaturedPage()) return "";
  return `
    <div class="featured-consult-row">
      <a class="featured-collection-btn" href="${escapeHTML(buildFeaturedCollectionHref(eventConfig))}">
        Discover the Collection
      </a>
    </div>
  `;
}

function renderFeaturedEndcap(eventConfig) {
  if (!isDedicatedFeaturedPage()) return "";
  const footerImage = normalizeAssetPath(eventConfig?.footerImage || "");
  const footerSlogan = String(eventConfig?.footerSlogan || "").trim();
  const journalHref = buildFeaturedJournalHref(eventConfig);
  if (!footerImage && !footerSlogan) return "";
  return `
    <section class="featured-endcap" aria-label="${escapeHTML(String(eventConfig?.title || "Collection"))} editorial footer">
      ${footerImage ? `
        ${journalHref
          ? `
        <a class="featured-endcap-media" href="${escapeHTML(journalHref)}" aria-label="Open ${escapeHTML(String(eventConfig?.title || "Collection"))} journal">
          <img src="${escapeHTML(footerImage)}" alt="${escapeHTML(String(eventConfig?.title || "Collection"))} editorial image" loading="lazy" decoding="async">
        </a>
      `
          : `
        <div class="featured-endcap-media">
          <img src="${escapeHTML(footerImage)}" alt="${escapeHTML(String(eventConfig?.title || "Collection"))} editorial image" loading="lazy" decoding="async">
        </div>
      `}
      ` : ""}
      ${footerSlogan ? `<p class="featured-endcap-copy">${escapeHTML(footerSlogan)}</p>` : ""}
    </section>
  `;
}

function renderFeaturedEventSection(eventConfig, index, defaultKicker, options = {}) {
  const includeHeroImage = options?.includeHeroImage === true;
  const forceHeader = options?.forceHeader === true;
  const sectionVariantClass = options?.splitPage === true ? " featured-event-block--split" : "";
  const resolvedTitle = String(eventConfig?.title || "").trim() || "Collections";
  const resolvedKicker = String(eventConfig?.kicker || "").trim() || String(defaultKicker || "").trim() || "Seasonal Collection";
  const resolvedLead = String(eventConfig?.lead || "").trim();
  const warningText = String(eventConfig?.warningText || "").trim() || "Each arrangement is custom-made. Final details and pricing are confirmed during consultation.";
  const warningMarkup = isDedicatedFeaturedPage()
    ? ""
    : `<p class="featured-warning">${escapeHTML(warningText)}</p>`;
  const eventProducts = Array.isArray(eventConfig?.products) ? eventConfig.products : [];
  const validImages = eventProducts.filter((item) => String(item?.src || "").trim().length > 0);
  const homepageLimit = isDedicatedFeaturedPage() ? null : 4;
  if (!validImages.length) return "";

  const showHeader = forceHeader || index > 0;
  const innerClass = includeHeroImage ? "featured-event-inner featured-event-inner--overlay" : "featured-event-inner";
  return `
    <section class="featured-event-block${showHeader ? "" : " featured-event-block--primary"}${sectionVariantClass}" data-featured-event-id="${escapeHTML(String(eventConfig?.id || resolvedTitle))}">
      ${includeHeroImage ? `
        <div class="featured-event-hero">
          <button class="hero-priority-hit featured-event-hero-hit" type="button" aria-label="Jump to ${escapeHTML(resolvedTitle)} collection" data-featured-event-jump></button>
          <img src="${escapeHTML(resolveFeaturedHeroImage(eventConfig?.heroImage))}" alt="${escapeHTML(resolvedTitle)} campaign cover" loading="lazy" decoding="async">
        </div>
      ` : ""}
      <div class="${innerClass}">
        ${showHeader ? `
          <div class="featured-event-header">
            <p class="featured-event-kicker">${escapeHTML(resolvedKicker)}</p>
            <h2 class="featured-event-title">${escapeHTML(resolvedTitle)}</h2>
            ${resolvedLead ? `<p class="featured-event-lead">${escapeHTML(resolvedLead)}</p>` : ""}
          </div>
        ` : ""}
        ${renderFeaturedGrid(resolvedTitle, String(eventConfig?.id || resolvedTitle), validImages, { limit: homepageLimit })}
        ${warningMarkup}
        ${renderFeaturedCollectionCta(eventConfig)}
        ${renderFeaturedEndcap(eventConfig)}
      </div>
    </section>
  `;
}

function renderFeaturedHomeFollowupSection(eventConfig, defaultKicker) {
  const resolvedTitle = String(eventConfig?.title || "").trim() || "Collections";
  const resolvedKicker = String(eventConfig?.kicker || "").trim() || String(defaultKicker || "").trim() || "Seasonal Collection";
  const warningText = String(eventConfig?.warningText || "").trim() || "Each arrangement is custom-made. Final details and pricing are confirmed during consultation.";
  const eventProducts = Array.isArray(eventConfig?.products) ? eventConfig.products : [];
  const validImages = eventProducts.filter((item) => String(item?.src || "").trim().length > 0);
  const homepageLimit = 4;
  if (!validImages.length) return "";

  return `
    <section class="featured-home-followup" data-featured-event-id="${escapeHTML(String(eventConfig?.id || resolvedTitle))}">
      <div class="featured-home-followup-hero">
        <button class="hero-priority-hit featured-event-hero-hit" type="button" aria-label="Jump to ${escapeHTML(resolvedTitle)} collection" data-featured-event-jump></button>
        <img src="${escapeHTML(resolveFeaturedHeroImage(eventConfig?.heroImage))}" alt="${escapeHTML(resolvedTitle)} campaign cover" loading="lazy" decoding="async">
      </div>
      <div class="featured-home-followup-inner">
        <div class="featured-title-block featured-title-block--followup">
          <p class="featured-kicker">${escapeHTML(resolvedKicker)}</p>
          <h2 class="featured-home-followup-title">${escapeHTML(resolvedTitle)}</h2>
        </div>
        ${renderFeaturedGrid(resolvedTitle, String(eventConfig?.id || resolvedTitle), validImages, { limit: homepageLimit })}
        <p class="featured-warning">${escapeHTML(warningText)}</p>
        ${renderFeaturedCollectionCta(eventConfig)}
      </div>
    </section>
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

function initializeFeaturedCardCarousels(scope = document) {
  const carousels = Array.from(scope.querySelectorAll("[data-featured-card-carousel]"));
  carousels.forEach((carousel) => {
    if (!(carousel instanceof HTMLElement)) return;
    const viewport = carousel.querySelector("[data-featured-card-viewport]");
    const track = viewport instanceof HTMLElement ? viewport.querySelector(".featured-track") : null;
    const hoverPreview = carousel.querySelector("[data-featured-hover-preview]");
    const hoverPreviewImage = hoverPreview instanceof HTMLElement ? hoverPreview.querySelector(".featured-hover-preview-image") : null;
    const prev = carousel.querySelector("[data-featured-card-prev]");
    const next = carousel.querySelector("[data-featured-card-next]");
    const counter = carousel.querySelector("[data-featured-card-counter]");
    const progressFill = carousel.querySelector("[data-featured-card-progress-fill]");
    if (!(viewport instanceof HTMLElement) || !(track instanceof HTMLElement)) return;

    const slides = Array.from(carousel.querySelectorAll("[data-featured-slide]"));
    const slideCount = Math.max(1, slides.length);
    const hoverIndex = Number.parseInt(carousel.dataset.featuredCardHoverIndex || "-1", 10);
    const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const canAutoHover = Number.isFinite(hoverIndex) && hoverIndex > 0 && hoverIndex < slideCount && hoverPreview instanceof HTMLElement;
    const canSingleFullPreview = carousel.dataset.featuredCardSingleFullPreview === "1" && slideCount === 1 && hoverPreview instanceof HTMLElement;
    const canHoverPreview = canAutoHover || canSingleFullPreview;
    let currentIndex = 0;
    let hoverPreviewActive = false;
    let pendingNavigationTimer = 0;
    const card = carousel.closest(".featured-product-card");
    const getActiveIndex = () => (hoverPreviewActive && canAutoHover ? hoverIndex : currentIndex);
    const getSlideMeta = (index) => {
      const slide = slides[index];
      if (!(slide instanceof HTMLElement)) return null;
      const image = slide.querySelector(".featured-product-image");
      if (!(image instanceof HTMLImageElement)) return null;
      return {
        src: image.getAttribute("src") || "",
        position: image.style.objectPosition || "center center"
      };
    };
    const setPreviewImageFromIndex = (index) => {
      if (!(hoverPreviewImage instanceof HTMLImageElement)) return;
      const slideMeta = getSlideMeta(index);
      if (!slideMeta?.src) return;
      if (hoverPreviewImage.getAttribute("src") !== slideMeta.src) hoverPreviewImage.setAttribute("src", slideMeta.src);
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
      if (card instanceof HTMLElement) {
        card.classList.toggle("is-carousel-engaged", activeIndex > 0);
      }
      carousel.classList.toggle("is-carousel-engaged", activeIndex > 0);
      if (counter instanceof HTMLElement) counter.textContent = `${activeIndex + 1} / ${slideCount}`;
      if (progressFill instanceof HTMLElement) progressFill.style.width = `${((activeIndex + 1) / slideCount) * 100}%`;
      if (prev instanceof HTMLButtonElement) prev.disabled = activeIndex <= 0;
      if (next instanceof HTMLButtonElement) next.disabled = activeIndex >= slideCount - 1;
    };
    const goToIndex = (index, behavior = "smooth", options = {}) => {
      const nextIndex = Math.max(0, Math.min(slideCount - 1, index));
      if (typeof options.hoverPreviewActive === "boolean") hoverPreviewActive = options.hoverPreviewActive;
      currentIndex = nextIndex;
      syncTrackPosition(behavior);
      updateUi();
    };
    const activateHoverSlide = () => {
      if (!supportsHover || !canHoverPreview) return;
      if (hoverPreviewActive || currentIndex !== 0) return;
      setPreviewImageFromIndex(canAutoHover ? hoverIndex : 0);
      hoverPreviewActive = true;
      setPreviewVisible(true);
      updateUi();
    };
    const commitPreviewToTrack = () => {
      if (!hoverPreviewActive || !canAutoHover) return;
      currentIndex = hoverIndex;
      syncTrackPosition("auto");
      clearHoverPreview({ instant: true });
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
    const commitManualNavigation = () => {
      if (hoverPreviewActive) commitPreviewToTrack();
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
        commitManualNavigation();
        goToIndex(currentIndex - 1);
      });
    }
    if (next instanceof HTMLButtonElement && next.dataset.bound !== "1") {
      next.dataset.bound = "1";
      next.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (navigateFromHoverPreview(1)) return;
        commitManualNavigation();
        goToIndex(currentIndex + 1);
      });
    }

    viewport.addEventListener("wheel", () => {
      commitManualNavigation();
    }, { passive: true });
    viewport.addEventListener("pointerdown", commitManualNavigation, { passive: true });
    viewport.addEventListener("touchstart", commitManualNavigation, { passive: true });

    if (card instanceof HTMLElement && card.dataset.carouselResetBound !== "1") {
      card.dataset.carouselResetBound = "1";
      if (supportsHover) {
        card.addEventListener("mouseenter", activateHoverSlide);
        card.addEventListener("mouseleave", resetHoverSlide);
      }
    }

    if (carousel.dataset.featuredResizeBound !== "1") {
      carousel.dataset.featuredResizeBound = "1";
      window.addEventListener("resize", () => {
        syncTrackPosition("auto");
      });
    }

    syncTrackPosition("auto");
    updateUi();
  });
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
  const hasStripUi = strip instanceof HTMLElement && promoLink instanceof HTMLAnchorElement;
  let closeTimerId = 0;

  const setStripVisible = (isVisible) => {
    document.body.classList.toggle("has-promo-strip", isVisible);
    if (!isVisible) {
      document.body.classList.remove("promo-strip-closing");
    }
    if (strip instanceof HTMLElement) {
      if (isVisible) {
        strip.classList.remove("is-closing");
      }
      strip.setAttribute("aria-hidden", isVisible ? "false" : "true");
    }
  };

  const featuredCatalog = await loadFeaturedCatalog();
  const activeEvents = resolveActiveCatalogEvents(featuredCatalog, new Date());
  const renderableEvents = getRenderableCatalogEvents(activeEvents);
  renderFeaturedMenuList(renderableEvents);
  const topEvent = renderableEvents[0] || null;
  if (!topEvent) {
    setSeasonalAvailabilityState(false);
    markSeasonalManagedContent(false);
    setStripVisible(false);
    return;
  }
  setSeasonalAvailabilityState(true);

  const promoCopy = String(topEvent?.promoText || PROMO_COPY_BY_EVENT_ID[topEvent.id] || "").trim();
  if (!promoCopy) {
    setSeasonalAvailabilityState(false);
    markSeasonalManagedContent(false);
    setStripVisible(false);
    return;
  }

  markSeasonalManagedContent(true);
  const isDedicatedPage = isDedicatedFeaturedPage();
  const shouldLinkToHomeFeaturedSection = !isDedicatedPage && renderableEvents.length > 1;
  if (promoLink instanceof HTMLAnchorElement) {
    promoLink.textContent = promoCopy;
    promoLink.setAttribute("href", shouldLinkToHomeFeaturedSection ? "#featured" : buildLocalizedFeaturedHref(String(topEvent.id || "").trim()));
  }

  if (!hasStripUi || hasSeenPromoRecently()) {
    setStripVisible(false);
    clearPromoSeenMonitor();
  } else {
    setStripVisible(true);
    monitorPromoStripSeen(strip);
  }

  if (hasStripUi && promoClose instanceof HTMLButtonElement) {
    promoClose.onclick = () => {
      markPromoSeen();
      clearPromoSeenMonitor();
      if (!(strip instanceof HTMLElement)) {
        setStripVisible(false);
        return;
      }
      window.clearTimeout(closeTimerId);
      document.body.classList.add("promo-strip-closing");
      strip.classList.add("is-closing");
      closeTimerId = window.setTimeout(() => {
        document.body.classList.remove("promo-strip-closing");
        setStripVisible(false);
      }, 500);
    };
  }
}

async function renderSeasonalPage() {
  const target = document.getElementById("seasonal-events");
  const featuredSection = document.getElementById("featured");
  const featuredCollectionBar = document.getElementById("featured-collection-bar");
  const featuredHeroImage = document.getElementById("featured-hero-image");
  const featuredHeroClick = document.getElementById("featured-hero-click");
  const featuredCollectionCurrent = document.getElementById("featured-collection-current");
  const featuredCollectionLabel = featuredCollectionCurrent instanceof HTMLElement
    ? featuredCollectionCurrent.querySelector("[data-featured-collection-label]")
    : null;
  const featuredCollectionMenu = document.getElementById("featured-collection-menu");
  const featuredCollectionOptions = featuredCollectionMenu instanceof HTMLElement
    ? featuredCollectionMenu.querySelector("[data-featured-collection-options]")
    : null;
  const featuredKicker = document.getElementById("featured-kicker");
  const featuredLead = document.querySelector("#featured .featured-title-block .featured-lead");
  const homeHeroButton = document.getElementById("home-hero-click");
  const homeHeroTitle = document.getElementById("home-hero-title");
  const homeHeroSubtitle = document.getElementById("home-hero-subtitle");
  const homeHeroLink = document.getElementById("home-hero-link");
  const homeHeroBackground = document.querySelector("#home .layer-depth-bg .layer-bg");
  if (!target) return;
  const featuredTitle = document.getElementById("featured-title");
  const buildCuratedLead = () => "Each season brings a moment. We give it form.";
  const buildWarningText = () => "Each arrangement is custom-made. Final details and pricing are confirmed during consultation.";
  const setFeaturedCollectionCurrentText = (rawLabel, localizedLabel) => {
    if (!(featuredCollectionCurrent instanceof HTMLElement)) return;
    const targetNode = featuredCollectionLabel instanceof HTMLElement ? featuredCollectionLabel : featuredCollectionCurrent;
    targetNode.textContent = localizedLabel;
    featuredCollectionCurrent.dataset.seasonalLabel = rawLabel;
  };
  const setFeaturedCollectionMenuOpen = (isOpen) => {
    if (!(featuredCollectionCurrent instanceof HTMLButtonElement) || !(featuredCollectionMenu instanceof HTMLElement)) return;
    const canOpen = featuredCollectionCurrent.dataset.hasOptions === "true";
    const nextState = canOpen && isOpen;
    window.clearTimeout(featuredCollectionMenu._hideTimer);
    featuredCollectionCurrent.setAttribute("aria-expanded", nextState ? "true" : "false");
    if (nextState) {
      featuredCollectionMenu.hidden = false;
      window.requestAnimationFrame(() => {
        featuredCollectionMenu.classList.add("is-open");
      });
      return;
    }
    featuredCollectionMenu.classList.remove("is-open");
    featuredCollectionMenu._hideTimer = window.setTimeout(() => {
      if (featuredCollectionCurrent.getAttribute("aria-expanded") === "true") return;
      featuredCollectionMenu.hidden = true;
    }, 320);
  };
  const syncFeaturedCollectionSwitcher = (events, activeEvent) => {
    if (!(featuredCollectionCurrent instanceof HTMLButtonElement) || !(featuredCollectionMenu instanceof HTMLElement) || !(featuredCollectionOptions instanceof HTMLElement)) return;
    const hasMultiple = Array.isArray(events) && events.length > 1;
    const rawLabel = String(activeEvent?.title || "").trim() || "Collections";
    const localizedLabel = localizeSeasonalCollectionTitle(rawLabel);
    setFeaturedCollectionCurrentText(rawLabel, localizedLabel);
    featuredCollectionCurrent.dataset.hasOptions = hasMultiple ? "true" : "false";
    featuredCollectionCurrent.setAttribute("aria-disabled", hasMultiple ? "false" : "true");
    featuredCollectionCurrent.setAttribute("aria-haspopup", hasMultiple ? "menu" : "false");
    featuredCollectionCurrent.setAttribute("aria-expanded", "false");
    if (!hasMultiple) {
      featuredCollectionMenu.classList.remove("is-open");
      featuredCollectionMenu.hidden = true;
      featuredCollectionOptions.innerHTML = "";
      return;
    }
    const activeEventId = String(activeEvent?.id || "").trim();
    featuredCollectionOptions.innerHTML = events.map((eventConfig) => {
      const eventId = String(eventConfig?.id || "").trim();
      const eventTitle = String(eventConfig?.title || "").trim() || "Collections";
      const localizedTitle = localizeSeasonalCollectionTitle(eventTitle);
      return `<a class="featured-collection-option${eventId === activeEventId ? " is-active" : ""}" href="${escapeHTML(buildLocalizedFeaturedHref(eventId))}">${escapeHTML(localizedTitle)}</a>`;
    }).join("");
  };
  const setFeaturedSectionVisibility = (isVisible) => {
    if (!(featuredSection instanceof HTMLElement)) return;
    featuredSection.hidden = !isVisible;
    featuredSection.style.display = isVisible ? "" : "none";
    featuredSection.setAttribute("aria-hidden", isVisible ? "false" : "true");
  };
  const getSiteSectionsHomeHero = () => {
    const payload = window.__MARVELL_SITE_SECTIONS__ && typeof window.__MARVELL_SITE_SECTIONS__ === "object"
      ? window.__MARVELL_SITE_SECTIONS__
      : {};
    const homeHero = payload?.homeHero && typeof payload.homeHero === "object" ? payload.homeHero : {};
    return {
      image: String(homeHero.image || "").trim(),
      eyebrow: String(homeHero.eyebrow || "").trim() || "Marvell Florist",
      heading: String(homeHero.heading || "").trim() || "For Moments That Matter",
      ctaLabel: String(homeHero.ctaLabel || "").trim() || "Discover the Collection",
      ctaTarget: String(homeHero.ctaTarget || "").trim() || "gallery-entry"
    };
  };
  const resolveHomeHeroHref = (targetMode, eventConfig) => {
    if (targetMode === "featured-primary" && eventConfig) {
      return buildLocalizedFeaturedHref(String(eventConfig?.id || "").trim());
    }
    return "gallery.html?entry=home-hero";
  };
  const setHomeHeroCopy = (eventConfig, options = {}) => {
    if (!(homeHeroTitle instanceof HTMLElement) || !(homeHeroSubtitle instanceof HTMLElement)) return;
    const heroConfig = getSiteSectionsHomeHero();
    const fallbackTitle = heroConfig.heading;
    const fallbackSubtitle = heroConfig.eyebrow;
    const fallbackHref = resolveHomeHeroHref(heroConfig.ctaTarget, eventConfig);
    const preserveConfiguredText = options?.preserveConfiguredText === true;
    if (!eventConfig) {
      homeHeroTitle.textContent = fallbackTitle;
      homeHeroSubtitle.textContent = fallbackSubtitle;
      delete homeHeroTitle.dataset.seasonalManaged;
      delete homeHeroTitle.dataset.seasonalLabel;
      if (homeHeroButton instanceof HTMLElement) {
        homeHeroButton.setAttribute("data-seasonal-direct-href", fallbackHref);
      }
      if (homeHeroLink instanceof HTMLAnchorElement) {
        homeHeroLink.textContent = heroConfig.ctaLabel;
        homeHeroLink.setAttribute("href", fallbackHref);
      }
      return;
    }
    if (preserveConfiguredText) {
      homeHeroTitle.textContent = fallbackTitle;
      homeHeroSubtitle.textContent = fallbackSubtitle;
      delete homeHeroTitle.dataset.seasonalManaged;
      delete homeHeroTitle.dataset.seasonalLabel;
      if (homeHeroButton instanceof HTMLElement) {
        homeHeroButton.setAttribute("data-seasonal-direct-href", fallbackHref);
      }
      if (homeHeroLink instanceof HTMLAnchorElement) {
        homeHeroLink.textContent = heroConfig.ctaLabel;
        homeHeroLink.setAttribute("href", fallbackHref);
      }
      return;
    }
    const rawTitle = String(eventConfig.title || "").trim() || "Collections";
    homeHeroTitle.textContent = localizeSeasonalCollectionTitle(rawTitle);
    homeHeroSubtitle.textContent = "Seasonal Collection";
    homeHeroTitle.dataset.seasonalManaged = "true";
    homeHeroTitle.dataset.seasonalLabel = rawTitle;
    if (homeHeroButton instanceof HTMLElement) {
      homeHeroButton.setAttribute("data-seasonal-direct-href", resolveHomeHeroHref(heroConfig.ctaTarget, eventConfig));
    }
    if (homeHeroLink instanceof HTMLAnchorElement) {
      homeHeroLink.textContent = heroConfig.ctaLabel;
      homeHeroLink.setAttribute("href", resolveHomeHeroHref(heroConfig.ctaTarget, eventConfig));
    }
  };
  const setHomeHeroMedia = (eventConfig) => {
    if (!(homeHeroBackground instanceof HTMLElement)) return;
    const heroConfig = getSiteSectionsHomeHero();
    const configuredImage = normalizeAssetPath(heroConfig.image);
    const fallbackImage = configuredImage ? `url("${configuredImage}")` : 'url("assets/home.webp")';
    if (!eventConfig) {
      homeHeroBackground.style.backgroundImage = fallbackImage;
      homeHeroBackground.style.backgroundPosition = "center center";
      return;
    }
    const heroImage = resolveFeaturedHeroImage(eventConfig.heroImage);
    if (!heroImage) {
      homeHeroBackground.style.backgroundImage = fallbackImage;
      homeHeroBackground.style.backgroundPosition = "center center";
      return;
    }
    homeHeroBackground.style.backgroundImage = `url("${heroImage}")`;
    applySeasonalHomeHeroPosition(homeHeroBackground, eventConfig);
  };
  const initializeFeaturedFadeIn = (scopeRoot) => {
    if (!(scopeRoot instanceof HTMLElement)) return;
    const cards = Array.from(scopeRoot.querySelectorAll(".featured-product-card"));
    if (!cards.length) return;
    const groupCardsByRenderedRows = (items, rowsPerBatch = 1) => {
      const rows = [];
      items.forEach((item) => {
        if (!(item instanceof HTMLElement)) return;
        const top = Math.round(item.getBoundingClientRect().top);
        const lastRow = rows[rows.length - 1];
        if (lastRow && Math.abs(lastRow.top - top) <= 12) {
          lastRow.items.push(item);
          return;
        }
        rows.push({ top, items: [item] });
      });
      return rows.map((row, index) => ({
        items: row.items,
        batchIndex: Math.floor(index / Math.max(1, rowsPerBatch))
      }));
    };
    const getPrimaryCardImage = (card) => card.querySelector(".featured-product-image");
    const waitForCardImage = (card) => new Promise((resolve) => {
      if (!(card instanceof HTMLElement)) {
        resolve();
        return;
      }
      const image = getPrimaryCardImage(card);
      if (!(image instanceof HTMLImageElement)) {
        resolve();
        return;
      }
      if (image.complete && image.naturalWidth > 0) {
        resolve();
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        image.removeEventListener("load", finish);
        image.removeEventListener("error", finish);
        resolve();
      };
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, 900);
    });
    const revealBatches = () => {
      const batches = groupCardsByRenderedRows(cards, 1);
      batches.forEach(({ items, batchIndex }) => {
        items.forEach((card) => {
          if (!(card instanceof HTMLElement)) return;
          card.style.setProperty("--featured-reveal-delay", `${Math.max(batchIndex, 0) * 110}ms`);
        });
      });
      batches.forEach(({ items, batchIndex }) => {
        Promise.all(items.map((card) => waitForCardImage(card))).then(() => {
          window.setTimeout(() => {
          items.forEach((card) => {
            if (card instanceof HTMLElement) card.classList.add("is-visible");
          });
          }, Math.max(batchIndex, 0) * 110);
        });
      });
    };
    cards.forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      card.classList.remove("is-visible");
    });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      revealBatches();
      return;
    }
    const grid = scopeRoot.querySelector("[data-featured-grid]");
    const observer = new IntersectionObserver((entries, obs) => {
      const shouldReveal = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.18);
      if (!shouldReveal) return;
      revealBatches();
      obs.disconnect();
    }, {
      threshold: [0, 0.18, 0.35],
      root: null,
      rootMargin: "0px 0px 20% 0px"
    });
    if (grid instanceof HTMLElement) observer.observe(grid);
    else cards.forEach((card) => observer.observe(card));
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

  if (featuredCollectionCurrent instanceof HTMLButtonElement && featuredCollectionCurrent.dataset.bound !== "1") {
    featuredCollectionCurrent.dataset.bound = "1";
    featuredCollectionCurrent.addEventListener("click", (event) => {
      event.preventDefault();
      const isOpen = featuredCollectionCurrent.getAttribute("aria-expanded") === "true";
      setFeaturedCollectionMenuOpen(!isOpen);
    });
    document.addEventListener("click", (event) => {
      if (!(featuredCollectionCurrent instanceof HTMLElement) || !(featuredCollectionMenu instanceof HTMLElement)) return;
      const targetNode = event.target;
      if (!(targetNode instanceof Node)) return;
      if (featuredCollectionCurrent.contains(targetNode) || featuredCollectionMenu.contains(targetNode)) return;
      setFeaturedCollectionMenuOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setFeaturedCollectionMenuOpen(false);
    });
  }

  ensureCampaignCoverEagerLoad();

  const featuredCatalog = await loadFeaturedCatalog();
  const activeEvents = resolveActiveCatalogEvents(featuredCatalog, new Date());
  const renderableEvents = getRenderableCatalogEvents(activeEvents);
  const homepageRenderableEvents = getHomepageFeaturedEvents(renderableEvents, 2);
  const isHomePage = !isDedicatedFeaturedPage();
  const showCollectionBar = isDedicatedFeaturedPage();
  renderFeaturedMenuList(renderableEvents);
  if (featuredCollectionBar instanceof HTMLElement) {
    featuredCollectionBar.hidden = !showCollectionBar;
  }
  const primaryEvent = resolvePrimaryFeaturedEvent(isHomePage ? homepageRenderableEvents : renderableEvents);
  if (!primaryEvent) {
    setSeasonalAvailabilityState(false);
    setFeaturedSectionVisibility(false);
    markSeasonalManagedContent(false);
    setHomeHeroCopy(null);
    setHomeHeroMedia(null);
    if (featuredCollectionCurrent instanceof HTMLElement) {
      setFeaturedCollectionCurrentText("Collections", "Collections");
      if (featuredCollectionCurrent instanceof HTMLButtonElement) {
        featuredCollectionCurrent.dataset.hasOptions = "false";
        featuredCollectionCurrent.setAttribute("aria-disabled", "true");
        featuredCollectionCurrent.setAttribute("aria-expanded", "false");
      }
    }
    if (featuredCollectionMenu instanceof HTMLElement) {
      featuredCollectionMenu.classList.remove("is-open");
      featuredCollectionMenu.hidden = true;
      if (featuredCollectionOptions instanceof HTMLElement) featuredCollectionOptions.innerHTML = "";
    }
    if (featuredTitle) featuredTitle.textContent = "Collections";
    if (featuredKicker instanceof HTMLElement) featuredKicker.textContent = "Seasonal Collection";
    if (featuredLead instanceof HTMLElement) {
      featuredLead.textContent = buildCuratedLead();
      featuredLead.hidden = false;
    }
    if (featuredHeroImage instanceof HTMLImageElement) {
      ensureCampaignCoverEagerLoad();
      featuredHeroImage.src = FEATURED_HERO_FALLBACK;
      featuredHeroImage.alt = "Featured seasonal campaign cover";
    }
    if (featuredCollectionBar instanceof HTMLElement) {
      featuredCollectionBar.hidden = true;
    }
    target.innerHTML = "";
    return;
  }

  markSeasonalManagedContent(true);
  setSeasonalAvailabilityState(true);
  if (isHomePage) {
    setHomeHeroCopy(primaryEvent, { preserveConfiguredText: true });
    setHomeHeroMedia(null);
  } else {
    setHomeHeroCopy(primaryEvent);
    setHomeHeroMedia(primaryEvent);
  }
  const rawCollectionTitle = String(primaryEvent.title || "").trim() || "Collections";
  const localizedCollectionTitle = localizeSeasonalCollectionTitle(rawCollectionTitle);
  syncFeaturedCollectionSwitcher(renderableEvents, primaryEvent);
  if (featuredTitle instanceof HTMLElement) {
    featuredTitle.textContent = localizedCollectionTitle;
    featuredTitle.dataset.seasonalLabel = rawCollectionTitle;
  }
  if (featuredKicker instanceof HTMLElement) {
    featuredKicker.textContent = primaryEvent.kicker || featuredCatalog?.defaultKicker || "Seasonal Collection";
  }
  if (featuredLead instanceof HTMLElement) {
    if (isHomePage) {
      featuredLead.textContent = "";
      featuredLead.hidden = true;
    } else {
      const resolvedLead = String(primaryEvent.lead || "").trim() || buildCuratedLead();
      featuredLead.textContent = resolvedLead;
      featuredLead.hidden = false;
    }
  }
  if (featuredHeroImage instanceof HTMLImageElement) {
    ensureCampaignCoverEagerLoad();
    const headerImage = resolveFeaturedHeroImage(primaryEvent.heroImage);
    preloadPriorityHeroAsset(headerImage);
    featuredHeroImage.src = headerImage;
    featuredHeroImage.alt = `${primaryEvent.title || "Collections"} campaign cover`;
    applySeasonalFeaturedHeroPosition(featuredHeroImage, primaryEvent);
  }

  const requestedEventId = getRequestedFeaturedEventId();
  const shouldShowFeaturedSection = isDedicatedFeaturedPage()
    || Boolean(requestedEventId)
    || (isHomePage ? homepageRenderableEvents.length > 0 : Boolean(primaryEvent));
  setFeaturedSectionVisibility(shouldShowFeaturedSection);
  featuredSection?.classList.remove("featured-split-pages");

  if (!shouldShowFeaturedSection) {
    target.innerHTML = "";
    return;
  }

  let renderedProducts = [];
  if (isHomePage && !requestedEventId) {
    const defaultKicker = featuredCatalog?.defaultKicker || "Seasonal Collection";
    target.innerHTML = homepageRenderableEvents
      .map((eventConfig, index) => (
        index === 0
          ? renderFeaturedEventSection(eventConfig, index, defaultKicker)
          : renderFeaturedHomeFollowupSection(eventConfig, defaultKicker)
      ))
      .join("");
  } else {
    const primaryProducts = Array.isArray(primaryEvent.products) ? primaryEvent.products : [];
    const validImages = primaryProducts.filter((item) => String(item?.src || "").trim().length > 0);
    renderedProducts = validImages;
    const warningMarkup = isDedicatedFeaturedPage()
      ? ""
      : `<p class="featured-warning">${escapeHTML(String(primaryEvent.warningText || "").trim() || buildWarningText())}</p>`;
    target.innerHTML = `
      ${renderFeaturedGrid(primaryEvent.title, String(primaryEvent.id || primaryEvent.title || "featured"), validImages)}
      ${warningMarkup}
      ${renderFeaturedCollectionCta(primaryEvent)}
      ${renderFeaturedEndcap(primaryEvent)}
    `;
  }

  const renderedImages = target.querySelectorAll(".featured-product-image");
  if (!renderedImages.length) {
    setFeaturedSectionVisibility(false);
    target.innerHTML = "";
    return;
  }

  window.featuredHashNavigate = () => scheduleFeaturedHashNavigation(target);
  scheduleFeaturedHashNavigation(target);
  initializeFeaturedFadeIn(target);
  if (isDedicatedFeaturedPage()) initializeDedicatedFeaturedFilters(target, primaryEvent, renderedProducts);
  initializeFeaturedCardCarousels(target);
  if (target.dataset.featuredHeroJumpBound !== "1") {
    target.dataset.featuredHeroJumpBound = "1";
    target.addEventListener("click", (event) => {
      const clickTarget = event.target;
      if (!(clickTarget instanceof HTMLElement)) return;
      const jumpButton = clickTarget.closest("[data-featured-event-jump]");
      if (!(jumpButton instanceof HTMLButtonElement)) return;
      const eventBlock = jumpButton.closest(".featured-event-block");
      if (!(eventBlock instanceof HTMLElement)) return;
      const destination = eventBlock.querySelector(".featured-event-header, [data-featured-grid], .featured-warning");
      if (destination instanceof HTMLElement) {
        destination.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
  window.addEventListener("hashchange", () => scheduleFeaturedHashNavigation(target), { passive: true });
}

function initializeSeasonalSectionRendering() {
  void (async () => {
    const featuredCatalog = await loadFeaturedCatalog();
    const activeEvents = resolveActiveCatalogEvents(featuredCatalog, new Date());
    const renderableEvents = getRenderableCatalogEvents(activeEvents);
    renderFeaturedMenuList(renderableEvents);
  })();

  void renderSeasonalPromotionStrip();

  const featuredSection = document.getElementById("featured");
  if (!featuredSection) {
    void renderSeasonalPage();
    return;
  }
  void renderSeasonalPage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSeasonalSectionRendering, { once: true });
} else {
  initializeSeasonalSectionRendering();
}
