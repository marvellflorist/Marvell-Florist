
const PORTFOLIO_CATEGORIES_ENDPOINT = "/content/portfolio-categories.json";
const GALLERY_CONTENT_ENDPOINT = "/content/gallery.json";
const GALLERY_LEGACY_ENDPOINT = "/data/gallery.json";
const SITE_SECTIONS_ENDPOINTS = ["/content/site-sections.json", "content/site-sections.json"];
const GALLERY_PAGE_DEFAULT_COPY = {
  note: "Most pieces are custom made, so availability and flower selection must be confirmed first.",
  byRequestHook: "Not every arrangement begins in a catalog. Some start with a conversation.",
  consultButtonLabel: "Consult This Collection"
};
const CATEGORY_META = [
  {
    name: "Artificial Flowers",
    key: "artificial-flowers",
    aliases: ["artificial flowers"],
    subtitle: "Rangkaian bunga artifisial untuk kebutuhan dekoratif dan penggunaan jangka panjang.",
    phone: "6281275017456",
    coverImage: "/assets/artificialcover.webp"
  },
  {
    name: "Bouquets",
    key: "bouquets",
    aliases: ["bouquets"],
    subtitle: "Bouquet custom untuk hadiah, perayaan, dan momen spesial.",
    phone: "6281275017456",
    coverImage: "/assets/bouquetcover.webp"
  },
  {
    name: "Papan Bunga",
    key: "papan-bunga",
    aliases: ["flower boards", "papan bunga"],
    subtitle: "Papan bunga ucapan untuk peresmian, duka cita, dan momen formal lainnya.",
    phone: "6281275017456",
    coverImage: "/assets/papancover.webp"
  },
  {
    name: "Funerals",
    key: "funerals",
    aliases: ["funerals", "funeral", "duka", "duka cita"],
    matchCategories: ["funerals", "funeral", "duka", "duka cita"],
    subtitle: "Rangkaian bunga belasungkawa dan papan duka untuk menyampaikan penghormatan yang tulus.",
    phone: "6281275017456",
    coverImage: "/assets/funeral.webp"
  },
  {
    name: "Standing Flowers",
    key: "standing-flowers",
    aliases: ["standing flowers"],
    subtitle: "Standing flowers untuk dekorasi acara dan kebutuhan display formal.",
    phone: "6281275017456",
    coverImage: "/assets/standingcover.webp"
  },
  {
    name: "Parcels",
    key: "parcels",
    aliases: ["parcels"],
    subtitle: "Parcel hadiah untuk perayaan, hampers, dan kebutuhan gifting.",
    phone: "628116667920",
    coverImage: "/assets/parcelcover.webp"
  },
  {
    name: "By Request",
    key: "by-request",
    aliases: ["by request", "custom"],
    matchCategories: ["by request", "custom", "car decorations", "opening ribbons"],
    subtitle: "Kategori custom by request untuk kebutuhan khusus dan konsep personal.",
    phone: "628116667457",
    coverImage: "/assets/request.webp"
  }
];

function normalizeTextList(value) {
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

function normalizeAssetPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("/") ? raw : `/${raw.replace(/^\.?\//, "")}`;
}

function normalizeFilterOptionRecord(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const fallbackId = `option-${index + 1}`;
  const id = toSlug(entry.id || entry.value || entry.label || fallbackId) || fallbackId;
  const label = String(entry.label || entry.name || entry.id || fallbackId).trim() || fallbackId;
  return { id, label };
}

function normalizeFilterGroupRecord(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const fallbackId = `group-${index + 1}`;
  const id = toSlug(entry.id || entry.label || fallbackId) || fallbackId;
  const label = String(entry.label || entry.name || entry.id || fallbackId).trim() || fallbackId;
  const options = Array.isArray(entry.options)
    ? entry.options
      .map((option, optionIndex) => normalizeFilterOptionRecord(option, optionIndex))
      .filter(Boolean)
    : [];
  if (!options.length) return null;
  return { id, label, options };
}

function normalizeCategoryMetaRecord(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const fallbackKey = `category-${index + 1}`;
  const key = toSlug(entry.key || entry.name || fallbackKey) || fallbackKey;
  const name = String(entry.name || entry.key || fallbackKey).trim() || fallbackKey;
  const aliases = Array.from(new Set([
    ...normalizeTextList(entry.aliases),
    name,
    key.replace(/-/g, " ")
  ]));
  const matchCategories = normalizeTextList(entry.matchCategories);
  const filterGroups = Array.isArray(entry.filterGroups)
    ? entry.filterGroups
      .map((group, groupIndex) => normalizeFilterGroupRecord(group, groupIndex))
      .filter(Boolean)
    : [];

  return {
    name,
    key,
    aliases,
    matchCategories,
    filterGroups,
    subtitle: String(entry.subtitle || "").trim(),
    phone: String(entry.phone || "").trim(),
    coverImage: normalizeAssetPath(entry.coverImage || ""),
    enablePriceFilter: entry.enablePriceFilter !== false && key !== "by-request",
    priceMin: Number.isFinite(Number(entry.priceMin)) && Number(entry.priceMin) > 0 ? Number(entry.priceMin) : null,
    priceMax: Number.isFinite(Number(entry.priceMax)) && Number(entry.priceMax) > 0 ? Number(entry.priceMax) : null,
    showOnHome: entry.showOnHome !== false,
    showInGallery: entry.showInGallery !== false,
    order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : (index + 1)
  };
}

async function hydrateCategoryMetaFromContent() {
  try {
    const response = await fetch(PORTFOLIO_CATEGORIES_ENDPOINT, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    const records = Array.isArray(payload?.categories) ? payload.categories : [];
    const normalized = records
      .map((entry, index) => normalizeCategoryMetaRecord(entry, index))
      .filter((entry) => Boolean(entry) && entry.showInGallery !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!normalized.length) return;
    CATEGORY_META.splice(0, CATEGORY_META.length, ...normalized);
  } catch (_error) {
    // Keep static fallback categories when content loading fails.
  }
}

function extractGalleryItems(payload) {
  const normalizeGalleryItemRecord = (item, fallbackCategory = "") => {
    if (!item || typeof item !== "object") return null;
    const normalizedTitle = String(item.title || item.name || "").trim();
    const normalizedPriceRaw = item.price;
    const normalizedPrice = normalizedPriceRaw === null || normalizedPriceRaw === undefined || normalizedPriceRaw === ""
      ? null
      : (Number.isFinite(Number(normalizedPriceRaw)) && Number(normalizedPriceRaw) > 0
        ? Number(normalizedPriceRaw)
        : null);
    return {
      ...item,
      title: normalizedTitle ? titleCaseWords(normalizedTitle) : "",
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

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function formatRupiah(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return `Rp${new Intl.NumberFormat("id-ID").format(Math.round(amount))}`;
}

function formatFilterCount(value) {
  const safeValue = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return String(Math.round(safeValue));
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

function buildConsultHref(phone, collectionName) {
  const text = [
    "Halo Marvell Florist, saya ingin konsultasi koleksi ini.",
    "",
    `Koleksi: ${collectionName}`
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function getItemSourceText(item) {
  const imagePath = String(item?.image || "").trim();
  const title = String(item?.title || item?.name || "").trim();
  const filename = imagePath.split("/").pop() || "";
  let decoded = filename;
  try {
    decoded = decodeURIComponent(filename);
  } catch (_error) {
    decoded = filename;
  }
  return `${decoded} ${title}`.toLowerCase();
}

function toCompactText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function buildSourceContext(item) {
  const raw = getItemSourceText(item);
  const compact = toCompactText(raw);
  return { raw, compact };
}

function sourceHasAny(context, candidates) {
  return candidates.some((candidate) => {
    const token = toCompactText(candidate);
    return token && context.compact.includes(token);
  });
}

const ARTIFICIAL_BLOOM_BOX_INDEXES = new Set([5, 13, 18, 22]);

function getArtificialItemNumber(item, fallbackIndex = -1) {
  const explicit = Number(item?.artificialIndex);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const normalizedFallback = Number(fallbackIndex);
  if (Number.isFinite(normalizedFallback) && normalizedFallback >= 0) return normalizedFallback + 1;
  return 0;
}

function detectArtificialType(item, context, fallbackIndex = -1) {
  const itemNumber = getArtificialItemNumber(item, fallbackIndex);
  if (ARTIFICIAL_BLOOM_BOX_INDEXES.has(itemNumber)) return "bloom-box";
  if (sourceHasAny(context, ["balloon", "bloombal", "balon", "bloombox", "bloom box"])) return "bloom-box";
  if (sourceHasAny(context, ["pot", "potted", "basket"])) return "potted";
  return "potted";
}

function countColorHits(context) {
  const groups = [
    ["pink"],
    ["white"],
    ["red"],
    ["purple", "purp", "perp"],
    ["blue"],
    ["yellow"],
    ["orange"],
    ["gold"],
    ["black"]
  ];
  return groups.reduce((total, group) => total + (sourceHasAny(context, group) ? 1 : 0), 0);
}

function titleCaseWords(value) {
  return String(value || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildCategoryLabel(activeCategory, item, context) {
  const categoryName = String(activeCategory?.name || "Product").trim();
  const categoryKey = String(activeCategory?.key || "").trim();

  if (categoryKey === "artificial-flowers") {
    const artificialType = detectArtificialType(item, context, Number(item?.artificialIndex || 0) - 1);
    if (artificialType === "bloom-box") {
      if (sourceHasAny(context, ["balloon", "bloombal", "balon"])) return "Artificial Flowers Balloons";
      return "Artificial Flowers Bloom Box";
    }
    return "Artificial Flowers Pot";
  }

  if (categoryKey === "bouquets") {
    if (sourceHasAny(context, ["money"])) return "Bouquets Money Bouquet";
    if (sourceHasAny(context, ["graduation", "grad"])) return "Bouquets Graduation";
    return "Bouquets Everyday";
  }

  if (categoryKey === "papan-bunga") {
    if (sourceHasAny(context, ["2papan", "2 papan", "papan2"])) return "Papan Bunga 2 Papan";
    if (sourceHasAny(context, ["1papan", "1 papan", "papan1"])) return "Papan Bunga 1 Papan";
    return "Papan Bunga";
  }

  if (categoryKey === "funerals") {
    if (sourceHasAny(context, ["cross", "salib"])) return "Funerals Cross";
    if (sourceHasAny(context, ["frame", "framed"])) return "Funerals Frame";
    if (sourceHasAny(context, ["standing", "sta-"])) return "Funerals Standing Flowers";
    return "Funerals";
  }

  if (categoryKey === "standing-flowers") return "Standing Flowers";
  if (categoryKey === "parcels") return "Parcels";
  if (categoryKey === "by-request") return "By Request";
  return categoryName || "Product";
}

function buildDisplayName(item, activeCategory) {
  const titleRaw = String(item?.title || item?.name || "").trim();
  if (titleRaw) return titleCaseWords(titleRaw);
  const imagePath = String(item?.image || "").trim();
  const filename = imagePath.split("/").pop() || "";
  const decoded = (() => {
    try { return decodeURIComponent(filename); } catch (_error) { return filename; }
  })();
  const context = buildSourceContext(item);
  const rawBase = decoded.replace(/\.[a-z0-9]+$/i, "");
  const cleaned = rawBase
    .replace(/[_(),.-]+/g, " ")
    .replace(/\b(art|bou|pap|sta|par|dek|mf|hbltc|webp|jpeg|jpg|png)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b(perp|purp)\b/g, "purple")
    .replace(/\bholo\b/g, "holo")
    .replace(/\bblk\b/g, "black");

  const categoryLabel = buildCategoryLabel(activeCategory, item, context);
  if (String(activeCategory?.key || "") === "by-request") {
    return "Custom Arrangement";
  }
  if (!cleaned) return categoryLabel;
  return `${categoryLabel} - ${titleCaseWords(cleaned)}`;
}

function withDisplayNumber(name, index) {
  const raw = String(name || "").trim() || "Arrangement";
  const label = raw.replace(/\s*No\.\s*\d{1,3}\b/gi, "").trim() || "Arrangement";
  const number = Math.max(1, Number(index) || 1);
  return `${label} No. ${String(number).padStart(2, "0")}`;
}

function normalizeFilterToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function readStructuredFilterField(item, groupId) {
  const filters = item?.filters && typeof item.filters === "object" ? item.filters : {};
  if (groupId === "color") {
    if (Object.prototype.hasOwnProperty.call(filters, "colors")) return filters.colors;
    if (Object.prototype.hasOwnProperty.call(item || {}, "filterColors")) return item.filterColors;
    return undefined;
  }
  if (groupId === "type") {
    if (Object.prototype.hasOwnProperty.call(filters, "type")) return filters.type;
    if (Object.prototype.hasOwnProperty.call(item || {}, "filterType")) return item.filterType;
    return undefined;
  }
  if (groupId === "flower-condition") {
    if (Object.prototype.hasOwnProperty.call(filters, "flowerCondition")) return filters.flowerCondition;
    if (Object.prototype.hasOwnProperty.call(item || {}, "filterFlowerCondition")) return item.filterFlowerCondition;
    return undefined;
  }
  if (groupId === "flower-type") {
    if (Object.prototype.hasOwnProperty.call(filters, "flowerTypes")) return filters.flowerTypes;
    if (Object.prototype.hasOwnProperty.call(item || {}, "filterFlowerTypes")) return item.filterFlowerTypes;
    return undefined;
  }
  if (groupId === "occasion") {
    if (Object.prototype.hasOwnProperty.call(filters, "occasion")) return filters.occasion;
    if (Object.prototype.hasOwnProperty.call(item || {}, "filterOccasion")) return item.filterOccasion;
    return undefined;
  }
  if (groupId === "material") {
    if (Object.prototype.hasOwnProperty.call(filters, "material")) return filters.material;
    if (Object.prototype.hasOwnProperty.call(item || {}, "filterMaterial")) return item.filterMaterial;
    return undefined;
  }
  if (groupId === "size") {
    if (Object.prototype.hasOwnProperty.call(filters, "size")) return filters.size;
    if (Object.prototype.hasOwnProperty.call(item || {}, "filterSize")) return item.filterSize;
    return undefined;
  }
  return undefined;
}

function getStructuredFilterTokens(item, groupId) {
  const raw = readStructuredFilterField(item, groupId);
  if (raw === undefined || raw === null || raw === "") return null;
  if (Array.isArray(raw)) {
    return raw.map((entry) => normalizeFilterToken(entry)).filter(Boolean);
  }
  return [normalizeFilterToken(raw)].filter(Boolean);
}

function matchStructuredFilterOption(item, groupId, optionId) {
  const tokens = getStructuredFilterTokens(item, groupId);
  if (tokens === null) return null;
  const normalizedOption = normalizeFilterToken(optionId);
  return tokens.includes(normalizedOption);
}

function buildColorFilterGroup() {
  return {
    id: "color",
    label: "Color",
    options: [
      { id: "pink", label: "Pink", match: (_item, context) => sourceHasAny(context, ["pink"]) },
      { id: "white", label: "White", match: (_item, context) => sourceHasAny(context, ["white"]) },
      { id: "red", label: "Red", match: (_item, context) => sourceHasAny(context, ["red"]) },
      { id: "purple", label: "Purple", match: (_item, context) => sourceHasAny(context, ["purple", "purp", "perp"]) },
      { id: "blue", label: "Blue", match: (_item, context) => sourceHasAny(context, ["blue"]) },
      { id: "yellow", label: "Yellow", match: (_item, context) => sourceHasAny(context, ["yellow"]) },
      { id: "orange", label: "Orange", match: (_item, context) => sourceHasAny(context, ["orange"]) },
      { id: "green", label: "Green", match: (_item, context) => sourceHasAny(context, ["green"]) },
      { id: "black", label: "Black", match: (_item, context) => sourceHasAny(context, ["black"]) },
      { id: "gold", label: "Gold", match: (_item, context) => sourceHasAny(context, ["gold"]) },
      { id: "mixed", label: "Mixed", match: (_item, context) => sourceHasAny(context, ["mixed"]) || countColorHits(context) > 1 }
    ]
  };
}

const FLOWER_TYPE_DEFINITIONS = [
  { id: "mawar", label: "Mawar", keywords: ["mawar", "rose", "roses"] },
  { id: "tulip", label: "Tulip", keywords: ["tulip"] },
  { id: "anggrek", label: "Anggrek", keywords: ["anggrek", "orchid", "orchids"] },
  { id: "lily", label: "Lily", keywords: ["lily", "lilies"] },
  { id: "babys-breath", label: "Baby's Breath", keywords: ["baby's breath", "babys breath", "babysbreath", "gypsophila"] },
  { id: "aster", label: "Aster", keywords: ["aster"] },
  { id: "sunflower", label: "Sunflower", keywords: ["sunflower", "sun flower"] },
  { id: "carnation", label: "Carnation", keywords: ["carnation", "carnations"] },
  { id: "hydrangea", label: "Hydrangea", keywords: ["hydrangea", "hortensia"] },
  { id: "peony", label: "Peony", keywords: ["peony", "peonies"] },
  { id: "gerbera", label: "Gerbera", keywords: ["gerbera"] },
  { id: "chrysanthemum", label: "Krisan", keywords: ["chrysanthemum", "krisan"] }
];

function buildFlowerTypeFilterGroup(allowedIds = []) {
  const allowedSet = new Set((Array.isArray(allowedIds) ? allowedIds : []).map((entry) => normalizeFilterToken(entry)));
  const definitions = FLOWER_TYPE_DEFINITIONS.filter((entry) => !allowedSet.size || allowedSet.has(entry.id));
  if (!definitions.length) return null;
  return {
    id: "flower-type",
    label: "Flower Type",
    options: definitions.map((entry) => ({
      id: entry.id,
      label: entry.label,
      match: (_item, context) => sourceHasAny(context, entry.keywords)
    }))
  };
}

function matchFlowerCondition(context, conditionId, categoryKey) {
  const normalizedCondition = normalizeFilterToken(conditionId);

  if (normalizedCondition === "artificial") {
    if (categoryKey === "artificial-flowers") return true;
    return false;
  }

  if (normalizedCondition === "preserved") {
    if (categoryKey === "artificial-flowers") return false;
    return false;
  }

  if (normalizedCondition === "fresh") {
    if (categoryKey === "artificial-flowers") return false;
    return false;
  }

  return false;
}

function buildFlowerConditionFilterGroup(categoryKey) {
  return {
    id: "flower-condition",
    label: "Flower Condition",
    options: [
      {
        id: "artificial",
        label: "Artificial",
        match: (_item, context) => matchFlowerCondition(context, "artificial", categoryKey)
      },
      {
        id: "fresh",
        label: "Fresh",
        match: (_item, context) => matchFlowerCondition(context, "fresh", categoryKey)
      },
      {
        id: "preserved",
        label: "Preserved",
        match: (_item, context) => matchFlowerCondition(context, "preserved", categoryKey)
      }
    ]
  };
}

function buildSizeFilterGroup() {
  return {
    id: "size",
    label: "Size",
    options: [
      {
        id: "small",
        label: "Small",
        match: (_item, context) => sourceHasAny(context, ["small", "mini", "petite", "compact", "kecil"])
      },
      {
        id: "medium",
        label: "Medium",
        match: (_item, context) => sourceHasAny(context, ["medium", "regular", "standard", "sedang"])
      },
      {
        id: "large",
        label: "Large",
        match: (_item, context) => sourceHasAny(context, ["large", "big", "besar"])
      },
      {
        id: "grand",
        label: "Grand",
        match: (_item, context) => sourceHasAny(context, ["grand", "jumbo", "premium"])
      }
    ]
  };
}

function getPriceFilterStep(min, max) {
  const span = Math.max(0, Number(max) - Number(min));
  if (span <= 100000) return 5000;
  if (span <= 500000) return 10000;
  return 25000;
}

function getNumericPrice(item) {
  const amount = Number(item?.price);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function buildPriceFilterGroup(activeCategory, allItems) {
  const prices = allItems
    .map((item) => getNumericPrice(item))
    .filter((value) => Number.isFinite(value));
  const explicitMin = Number.isFinite(Number(activeCategory?.priceMin)) && Number(activeCategory.priceMin) > 0
    ? Number(activeCategory.priceMin)
    : null;
  const explicitMax = Number.isFinite(Number(activeCategory?.priceMax)) && Number(activeCategory.priceMax) > 0
    ? Number(activeCategory.priceMax)
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
    step: getPriceFilterStep(min, max)
  };
}

function buildLegacyCategoryFilters(activeCategory) {
  const colorGroup = buildColorFilterGroup();
  const sizeGroup = buildSizeFilterGroup();

  if (activeCategory.key === "artificial-flowers") {
    return [
      {
        id: "type",
        label: "Type",
        options: [
          { id: "potted", label: "Pot", match: (item, context, index) => detectArtificialType(item, context, index) === "potted" },
          { id: "bloom-box", label: "Bloom Box", match: (item, context, index) => detectArtificialType(item, context, index) === "bloom-box" }
        ]
      },
      colorGroup
    ].filter(Boolean);
  }

  if (activeCategory.key === "bouquets") {
    return [
      colorGroup,
      sizeGroup,
      buildFlowerConditionFilterGroup(activeCategory.key),
      buildFlowerTypeFilterGroup([
        "mawar",
        "tulip",
        "anggrek",
        "lily",
        "babys-breath",
        "aster",
        "sunflower",
        "carnation",
        "hydrangea",
        "peony",
        "gerbera",
        "chrysanthemum"
      ])
    ].filter(Boolean);
  }

  if (activeCategory.key === "standing-flowers") {
    return [
      colorGroup,
      buildFlowerConditionFilterGroup(activeCategory.key),
      buildFlowerTypeFilterGroup(["mawar", "lily", "anggrek", "sunflower", "aster", "chrysanthemum"])
    ].filter(Boolean);
  }

  if (activeCategory.key === "funerals") {
    return [
      {
        id: "type",
        label: "Type",
        options: [
          { id: "cross", label: "Cross", match: (_item, context) => sourceHasAny(context, ["cross", "salib"]) },
          { id: "frame", label: "Frame", match: (_item, context) => sourceHasAny(context, ["frame", "framed"]) },
          { id: "standing", label: "Standing Flowers", match: (_item, context) => sourceHasAny(context, ["standing", "sta-"]) },
          { id: "papan", label: "Papan Bunga", match: (_item, context) => sourceHasAny(context, ["papan", "pap-"]) }
        ]
      },
      colorGroup,
      buildFlowerTypeFilterGroup(["mawar", "lily", "anggrek", "aster", "chrysanthemum"])
    ].filter(Boolean);
  }

  if (activeCategory.key === "papan-bunga") {
    return [
      {
        id: "occasion",
        label: "Occasion",
        options: [
          { id: "pernikahan", label: "Pernikahan", match: (_item, context) => sourceHasAny(context, ["nikah", "wedding", "pernikahan"]) },
          { id: "wisuda", label: "Wisuda", match: (_item, context) => sourceHasAny(context, ["wisuda", "graduation", "grad"]) },
          { id: "belasungkawa", label: "Belasungkawa", match: (_item, context) => sourceHasAny(context, ["duka", "funeral", "belasungkawa"]) },
          { id: "sukses", label: "Sukses", match: (_item, context) => sourceHasAny(context, ["sukses", "success", "selamat", "opening", "grand opening"]) }
        ]
      },
      {
        id: "size",
        label: "Boards",
        options: [
          { id: "1-papan", label: "1 Board", match: (_item, context) => sourceHasAny(context, ["1papan", "1 papan", "papan1"]) },
          { id: "2-papan", label: "2 Boards", match: (_item, context) => sourceHasAny(context, ["2papan", "2 papan", "papan2"]) },
          { id: "3-papan", label: "3 Boards", match: (_item, context) => sourceHasAny(context, ["3papan", "3 papan", "papan3"]) }
        ]
      },
      {
        id: "material",
        label: "Style",
        options: [
          { id: "rustic", label: "Rustic", match: (_item, context) => sourceHasAny(context, ["wood", "wooden", "round"]) },
          { id: "standard", label: "Standard", match: (_item, context) => !sourceHasAny(context, ["wood", "wooden", "round"]) }
        ]
      }
    ];
  }

  if (activeCategory.key === "parcels") {
    return [
      {
        id: "occasion",
        label: "Occasion",
        options: [
          { id: "idul-fitri", label: "Idul Fitri", match: (_item, context) => sourceHasAny(context, ["ramadan", "ramadhan", "eid", "lebaran", "idul fitri"]) },
          { id: "imlek", label: "Imlek", match: (_item, context) => sourceHasAny(context, ["chinese new year", "cny", "imlek", "gong xi"]) },
          { id: "natal", label: "Natal", match: (_item, context) => sourceHasAny(context, ["christmas", "xmas", "natal"]) },
          {
            id: "hadiah",
            label: "Hadiah",
            match: (_item, context) => sourceHasAny(context, ["gift", "hadiah", "parcel"]) && !sourceHasAny(context, ["chinese new year", "cny", "imlek", "gong xi", "christmas", "xmas", "natal", "ramadan", "ramadhan", "eid", "lebaran", "idul fitri"])
          }
        ]
      },
      {
        id: "color",
        label: "Color",
        options: colorGroup.options.filter((option) => ["red", "gold", "green", "mixed"].includes(option.id))
      }
    ];
  }

  if (activeCategory.key === "by-request") {
    return [];
  }

  return [colorGroup];
}

function findLegacyMatcher(legacyGroups, groupId, optionId) {
  const group = legacyGroups.find((entry) => normalizeFilterToken(entry?.id) === normalizeFilterToken(groupId));
  if (!group) return null;
  const option = (Array.isArray(group.options) ? group.options : [])
    .find((entry) => normalizeFilterToken(entry?.id) === normalizeFilterToken(optionId));
  if (!option || typeof option.match !== "function") return null;
  return option.match;
}

function buildCategoryFilters(activeCategory, allItems) {
  const categoryFilterGroups = Array.isArray(activeCategory?.filterGroups) ? activeCategory.filterGroups : [];
  const legacyGroups = buildLegacyCategoryFilters(activeCategory);
  const cmsDrivenGroups = categoryFilterGroups.length ? categoryFilterGroups
    .map((group, groupIndex) => {
      const options = Array.isArray(group?.options) ? group.options : [];
      if (!options.length) return null;
      return {
        id: String(group.id || "").trim() || `group-${groupIndex + 1}`,
        label: String(group.label || group.id || "Filter").trim() || "Filter",
        options: options.map((option) => {
          const optionId = String(option.id || "").trim() || toSlug(option.label || "option");
          const optionLabel = String(option.label || optionId).trim() || optionId;
          const legacyMatch = findLegacyMatcher(legacyGroups, group.id, optionId);
          return {
            id: optionId,
            label: optionLabel,
            match: (item, context, index) => {
              const explicitMatch = matchStructuredFilterOption(item, group.id, optionId);
              if (explicitMatch !== null) return explicitMatch;
              if (typeof legacyMatch === "function") return legacyMatch(item, context, index);
              return false;
            }
          };
        })
      };
    })
    .filter(Boolean) : [];

  const filters = cmsDrivenGroups.length ? cmsDrivenGroups : legacyGroups;
  if (activeCategory?.enablePriceFilter !== false && activeCategory?.key !== "by-request") {
    const priceFilterGroup = buildPriceFilterGroup(activeCategory, allItems);
    if (priceFilterGroup) filters.push(priceFilterGroup);
  }
  return filters;
}

function renderProductGrid(activeCategory, items) {
  const grid = document.getElementById("products-grid");
  if (!(grid instanceof HTMLElement)) return;
  grid.classList.add("is-transitioning");
  if (!items.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;font-family:Inter Tight,sans-serif;color:rgba(42,33,24,.66);padding:18px 0;">This collection will be updated soon.</p>';
    window.requestAnimationFrame(() => grid.classList.remove("is-transitioning"));
    return;
  }

  grid.innerHTML = items.map((item, itemIndex) => {
    const baseName = buildDisplayName(item, activeCategory);
    const name = withDisplayNumber(baseName, itemIndex + 1);
    const canonicalTitle = titleCaseWords(String(item?.title || item?.name || "").trim()) || baseName;
    const image = String(item.image || "").trim();
    const price = formatRupiah(item.price);
    const productSlug = toSlug(`${name}-${itemIndex + 1}`);
    const productId = `product-${productSlug || `item-${itemIndex + 1}`}`;
    const detailHref = `product.html?category=${encodeURIComponent(activeCategory.name)}&title=${encodeURIComponent(canonicalTitle)}&image=${encodeURIComponent(image)}${price ? `&price=${encodeURIComponent(price)}` : ""}`;
    return `
      <article class="product-card" id="${escapeHTML(productId)}" style="--item-index:${itemIndex};">
        ${image ? `<a class="product-detail-link" href="${escapeHTML(detailHref)}"><img class="product-image-cover" src="${escapeHTML(image)}" alt="${escapeHTML(name)}" loading="lazy" decoding="async"><img class="product-image-full" src="${escapeHTML(image)}" alt="" aria-hidden="true" loading="lazy" decoding="async"></a>` : ""}
      </article>
    `;
  }).join("");
  window.requestAnimationFrame(() => grid.classList.remove("is-transitioning"));
}

function updateFiltersCount(count) {
  const countElement = document.getElementById("filters-count");
  if (!(countElement instanceof HTMLElement)) return;
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
  countElement.textContent = `${safeCount} produk`;
}

function setupFilters(activeCategory, allItems) {
  const filtersWrap = document.getElementById("filters-wrap");
  if (!(filtersWrap instanceof HTMLElement)) return;
  const allFilters = buildCategoryFilters(activeCategory, allItems);
  if (!allFilters.length) {
    filtersWrap.innerHTML = "";
    updateFiltersCount(allItems.length);
    renderProductGrid(activeCategory, allItems);
    return;
  }

  const itemContexts = allItems.map((item) => buildSourceContext(item));
  const optionCountMap = new Map();
  allFilters.forEach((group) => {
    if (group.kind === "range" || !Array.isArray(group.options)) return;
    group.options.forEach((option) => {
      const count = allItems.reduce((total, item, index) => total + (option.match(item, itemContexts[index], index) ? 1 : 0), 0);
      optionCountMap.set(`${group.id}:${option.id}`, count);
    });
  });
  const filters = allFilters
    .map((group) => {
      if (group.kind === "range") return group;
      const visibleOptions = Array.isArray(group.options)
        ? group.options.filter((option) => (optionCountMap.get(`${group.id}:${option.id}`) ?? 0) > 0)
        : [];
      if (!visibleOptions.length) return null;
      return {
        ...group,
        options: visibleOptions
      };
    })
    .filter(Boolean);
  if (!filters.length) {
    filtersWrap.innerHTML = "";
    updateFiltersCount(allItems.length);
    renderProductGrid(activeCategory, allItems);
    return;
  }

  const renderFilterGroup = (group) => {
    if (group.kind === "range") {
      return `
        <fieldset class="filter-group" data-filter-group="${escapeHTML(group.id)}" data-filter-kind="range">
          <button class="filter-group-toggle" type="button" aria-expanded="false" aria-controls="filter-panel-${escapeHTML(group.id)}">
            <span class="filter-group-title">${escapeHTML(group.label)}</span>
            <span class="filter-group-icon" aria-hidden="true">+</span>
          </button>
          <div class="filter-group-panel" id="filter-panel-${escapeHTML(group.id)}">
            <div class="filter-range" data-filter-range="${escapeHTML(group.id)}">
              <div class="filter-range-values">
                <span data-range-value="min">${escapeHTML(formatRupiah(group.min))}</span>
                <span data-range-value="max">${escapeHTML(formatRupiah(group.max))}</span>
              </div>
              <div class="filter-range-sliders">
                <div class="filter-range-track"></div>
                <div class="filter-range-fill" data-range-fill></div>
                <input class="filter-range-input filter-range-input-min" type="range" min="${escapeHTML(group.min)}" max="${escapeHTML(group.max)}" step="${escapeHTML(group.step)}" value="${escapeHTML(group.min)}" data-range-bound="min" data-filter-group="${escapeHTML(group.id)}" aria-label="${escapeHTML(group.label)} minimum">
                <input class="filter-range-input filter-range-input-max" type="range" min="${escapeHTML(group.min)}" max="${escapeHTML(group.max)}" step="${escapeHTML(group.step)}" value="${escapeHTML(group.max)}" data-range-bound="max" data-filter-group="${escapeHTML(group.id)}" aria-label="${escapeHTML(group.label)} maksimum">
              </div>
              <p class="filter-range-note">Geser untuk memilih batas harga minimum dan maksimum.</p>
            </div>
          </div>
        </fieldset>
      `;
    }

    return `
      <fieldset class="filter-group" data-filter-group="${escapeHTML(group.id)}">
        <button class="filter-group-toggle" type="button" aria-expanded="false" aria-controls="filter-panel-${escapeHTML(group.id)}">
          <span class="filter-group-title">${escapeHTML(group.label)}</span>
          <span class="filter-group-icon" aria-hidden="true">+</span>
        </button>
        <div class="filter-group-panel" id="filter-panel-${escapeHTML(group.id)}">
          <div class="filter-options">
            ${group.options.map((option) => `
              <label class="filter-option">
                <input type="checkbox" data-filter-group="${escapeHTML(group.id)}" value="${escapeHTML(option.id)}">
                <span>${escapeHTML(option.label)} (${formatFilterCount(optionCountMap.get(`${group.id}:${option.id}`) ?? 0)})</span>
              </label>
            `).join("")}
          </div>
        </div>
      </fieldset>
    `;
  };

  filtersWrap.innerHTML = `
    <div class="filters-panel">
      ${filters.map((group) => renderFilterGroup(group)).join("")}
      <div class="filter-actions">
        <button type="button" class="filter-clear" id="filter-clear">Reset filter</button>
      </div>
    </div>
  `;

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
  const checks = Array.from(filtersWrap.querySelectorAll("input[type='checkbox'][data-filter-group]"));
  const rangeInputs = Array.from(filtersWrap.querySelectorAll("input[type='range'][data-filter-group]"));
  const groupToggles = Array.from(filtersWrap.querySelectorAll(".filter-group-toggle"));
  const clearButton = filtersWrap.querySelector("#filter-clear");

  const isRangeFilterActive = (groupId) => {
    const state = rangeStateByGroup.get(groupId);
    if (!state) return false;
    return state.min !== state.initialMin || state.max !== state.initialMax;
  };

  const doesRangeFilterMatch = (group, item) => {
    const state = rangeStateByGroup.get(group.id);
    if (!state || !isRangeFilterActive(group.id)) return true;
    const price = getNumericPrice(item);
    if (!Number.isFinite(price)) return false;
    return price >= state.min && price <= state.max;
  };

  const updateRangeUI = (groupId) => {
    const group = filters.find((entry) => entry.id === groupId && entry.kind === "range");
    const state = rangeStateByGroup.get(groupId);
    const rangeWrap = filtersWrap.querySelector(`[data-filter-range="${groupId}"]`);
    if (!group || !state || !(rangeWrap instanceof HTMLElement)) return;
    const minValue = rangeWrap.querySelector('[data-range-value="min"]');
    const maxValue = rangeWrap.querySelector('[data-range-value="max"]');
    const fill = rangeWrap.querySelector("[data-range-fill]");
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
    const filtered = allItems.filter((item, index) => {
      const source = itemContexts[index];
      return filters.every((group) => {
        if (group.kind === "range") {
          return doesRangeFilterMatch(group, item);
        }
        const selected = selectedByGroup.get(group.id);
        if (!selected || selected.size === 0) return true;
        const selectedOptions = group.options.filter((option) => selected.has(option.id));
        return selectedOptions.some((option) => option.match(item, source, index));
      });
    });

    if (filtered.length > 0) {
      updateFiltersCount(filtered.length);
      renderProductGrid(activeCategory, filtered);
      return;
    }

    const hasSelection = Array.from(selectedByGroup.values()).some((set) => set.size > 0)
      || Array.from(rangeStateByGroup.keys()).some((groupId) => isRangeFilterActive(groupId));
    if (!hasSelection) {
      updateFiltersCount(0);
      renderProductGrid(activeCategory, filtered);
      return;
    }

    const relaxedMatches = allItems.filter((item, index) => {
      const source = itemContexts[index];
      return filters.some((group) => {
        if (group.kind === "range") {
          return isRangeFilterActive(group.id) && doesRangeFilterMatch(group, item);
        }
        const selected = selectedByGroup.get(group.id);
        if (!selected || selected.size === 0) return false;
        return group.options.some((option) => selected.has(option.id) && option.match(item, source, index));
      });
    });
    const partiallyMatchedLabels = [];
    filters.forEach((group) => {
      if (group.kind === "range") {
        if (!isRangeFilterActive(group.id)) return;
        const hasAny = allItems.some((item) => doesRangeFilterMatch(group, item));
        if (hasAny) partiallyMatchedLabels.push(group.label);
        return;
      }
      const selected = selectedByGroup.get(group.id);
      if (!selected || selected.size === 0) return;
      group.options.forEach((option) => {
        if (!selected.has(option.id)) return;
        const hasAny = allItems.some((item, index) => option.match(item, itemContexts[index], index));
        if (hasAny) partiallyMatchedLabels.push(option.label);
      });
    });

    const grid = document.getElementById("products-grid");
    if (!(grid instanceof HTMLElement)) return;
    updateFiltersCount(0);
    grid.innerHTML = `
      <p style="grid-column:1/-1;font-family:Inter Tight,sans-serif;color:rgba(42,33,24,.72);padding:18px 0;">
        Tidak ada produk yang cocok dengan semua filter yang dipilih.
        ${relaxedMatches.length ? ` ${relaxedMatches.length} produk masih cocok dengan sebagian filter.` : ""}
        ${partiallyMatchedLabels.length ? ` Filter yang masih punya hasil: ${partiallyMatchedLabels.join(", ")}.` : ""}
      </p>
    `;
  };

  groupToggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    toggle.addEventListener("click", () => {
      const fieldset = toggle.closest(".filter-group");
      if (!(fieldset instanceof HTMLElement)) return;
      const panel = fieldset.querySelector(".filter-group-panel");
      if (!(panel instanceof HTMLElement)) return;
      const isOpen = fieldset.classList.contains("is-open");
      fieldset.classList.toggle("is-open", !isOpen);
      toggle.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      const icon = toggle.querySelector(".filter-group-icon");
      if (icon instanceof HTMLElement) icon.textContent = !isOpen ? "−" : "+";
      panel.style.maxHeight = !isOpen ? `${panel.scrollHeight}px` : "0px";
    });
  });

  checks.forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.addEventListener("change", () => {
      const groupId = input.dataset.filterGroup || "";
      const selected = selectedByGroup.get(groupId);
      if (!selected) return;
      if (input.checked) selected.add(input.value);
      else selected.delete(input.value);
      applyFilters();
    });
  });

  rangeInputs.forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    const groupId = input.dataset.filterGroup || "";
    const group = filters.find((entry) => entry.id === groupId && entry.kind === "range");
    const state = rangeStateByGroup.get(groupId);
    if (!group || !state) return;
    updateRangeUI(groupId);
    input.addEventListener("input", () => {
      const nextValue = Number(input.value);
      if (input.dataset.rangeBound === "min") {
        state.min = Math.min(nextValue, state.max);
        input.value = String(state.min);
      } else {
        state.max = Math.max(nextValue, state.min);
        input.value = String(state.max);
      }
      updateRangeUI(groupId);
      applyFilters();
    });
  });

  if (clearButton instanceof HTMLButtonElement) {
    clearButton.addEventListener("click", () => {
      selectedByGroup.forEach((set) => set.clear());
      checks.forEach((input) => {
        if (input instanceof HTMLInputElement) input.checked = false;
      });
      rangeStateByGroup.forEach((state, groupId) => {
        state.min = state.initialMin;
        state.max = state.initialMax;
        const minInput = filtersWrap.querySelector(`input[data-filter-group="${groupId}"][data-range-bound="min"]`);
        const maxInput = filtersWrap.querySelector(`input[data-filter-group="${groupId}"][data-range-bound="max"]`);
        if (minInput instanceof HTMLInputElement) minInput.value = String(state.min);
        if (maxInput instanceof HTMLInputElement) maxInput.value = String(state.max);
        updateRangeUI(groupId);
      });
      applyFilters();
    });
  }

  updateFiltersCount(allItems.length);
  applyFilters();
}

function resolveCategoryFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const raw = normalizeValue(params.get("category") || "");
  return resolveCategoryFromRaw(raw);
}

function resolvePortfolioGatewayEntrySource() {
  const params = new URLSearchParams(window.location.search);
  const raw = normalizeValue(params.get("entry") || params.get("source") || "");
  return ["home-hero", "home-cta", "portfolio-hero"].includes(raw) ? raw : "";
}

function shouldShowPortfolioGateway() {
  const params = new URLSearchParams(window.location.search);
  if (normalizeValue(params.get("category") || "")) return false;
  return Boolean(resolvePortfolioGatewayEntrySource());
}

function resolveCategoryFromRaw(rawValue) {
  const raw = normalizeValue(rawValue || "");
  if (!raw) return CATEGORY_META[0];
  return CATEGORY_META.find((item) => {
    if (normalizeValue(item.key) === raw) return true;
    if (normalizeValue(item.name) === raw) return true;
    return (item.aliases || []).some((alias) => normalizeValue(alias) === raw);
  }) || CATEGORY_META[0];
}

function renderCategoryNav(activeCategory) {
  const nav = document.getElementById("category-nav-list");
  const footerCategories = document.getElementById("footer-categories");
  const mobileCategoryList = document.getElementById("mobile-category-list");
  const mobileCategoryLabel = document.getElementById("mobile-category-label");
  if (!(nav instanceof HTMLElement) || !(footerCategories instanceof HTMLElement)) return;
  const categoryLinksMarkup = CATEGORY_META.map((item) => {
    const isActive = item.key === activeCategory.key;
    return `<a class="${isActive ? "is-active" : ""}" href="gallery.html?category=${encodeURIComponent(item.key)}">${escapeHTML(item.name)}</a>`;
  }).join("");
  nav.innerHTML = categoryLinksMarkup;
  if (mobileCategoryList instanceof HTMLElement) {
    const activeFirst = [
      ...CATEGORY_META.filter((item) => item.key === activeCategory.key),
      ...CATEGORY_META.filter((item) => item.key !== activeCategory.key)
    ];
    mobileCategoryList.innerHTML = `
      <p class="mobile-category-title">Categories</p>
      ${activeFirst.map((item) => {
        const isActive = item.key === activeCategory.key;
        return `<a class="${isActive ? "is-active" : ""}" href="gallery.html?category=${encodeURIComponent(item.key)}">${escapeHTML(item.name)}${isActive ? '<span class="mobile-category-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 13l5 5L20 6"/></svg></span>' : ""}</a>`;
      }).join("")}
    `;
  }
  if (mobileCategoryLabel instanceof HTMLElement) {
    mobileCategoryLabel.textContent = activeCategory.name;
  }
  footerCategories.innerHTML = CATEGORY_META.map((item) => (
    `<a class="footer-link" href="gallery.html?category=${encodeURIComponent(item.key)}">${escapeHTML(item.name)}</a>`
  )).join("");
  syncFooterAccordion();
}

let galleryItemsCache = [];
let activeCategoryState = CATEGORY_META[0];
let portfolioGatewayActive = false;

function renderPortfolioGateway() {
  const gatewaySection = document.getElementById("portfolio-gateway");
  const gatewayGrid = document.getElementById("portfolio-gateway-grid");
  if (!(gatewaySection instanceof HTMLElement) || !(gatewayGrid instanceof HTMLElement)) return;

  gatewayGrid.innerHTML = CATEGORY_META.map((item) => `
    <a class="portfolio-gateway-card" href="gallery.html?category=${encodeURIComponent(item.key)}" data-category-key="${escapeHTML(item.key)}" aria-label="Enter ${escapeHTML(item.name)} collection">
      ${item.coverImage ? `<img src="${escapeHTML(item.coverImage)}" alt="${escapeHTML(item.name)} cover" loading="eager" decoding="async">` : ""}
      <div class="portfolio-gateway-card-copy">
        <h2 class="portfolio-gateway-card-title">${escapeHTML(item.name)}</h2>
        <p class="portfolio-gateway-card-subtitle">${escapeHTML(item.subtitle || "Enter this collection")}</p>
        <p class="portfolio-gateway-card-cta">Enter Collection</p>
      </div>
    </a>
  `).join("");

  gatewaySection.hidden = false;
  document.body.classList.add("portfolio-gateway-active");
  portfolioGatewayActive = true;
}

function getItemsForCategory(activeCategory, items) {
  const matched = items.filter((item) => {
    const category = normalizeValue(item?.category);
    const isBaseMatch = normalizeValue(activeCategory.name) === category
      || (activeCategory.aliases || []).some((alias) => normalizeValue(alias) === category)
      || (activeCategory.matchCategories || []).some((alias) => normalizeValue(alias) === category);
    if (activeCategory.key !== "funerals") return isBaseMatch;
    if (isBaseMatch) return true;
    const sourceContext = buildSourceContext(item);
    return sourceHasAny(sourceContext, ["funeral", "duka", "duka cita"]);
  });
  if (activeCategory.key !== "artificial-flowers") return matched;
  return matched.map((item, index) => ({ ...item, artificialIndex: index + 1 }));
}

function applyActiveCategory(nextCategory, options = {}) {
  const { updateUrl = false, replaceUrl = false } = options;
  const gatewaySection = document.getElementById("portfolio-gateway");
  if (gatewaySection instanceof HTMLElement) gatewaySection.hidden = true;
  document.body.classList.remove("portfolio-gateway-active");
  portfolioGatewayActive = false;
  activeCategoryState = nextCategory;
  renderCategoryNav(nextCategory);
  const categoryItems = getItemsForCategory(nextCategory, galleryItemsCache);
  renderCategoryPage(nextCategory, categoryItems);
  activateProductFromHash();
  if (updateUrl) {
    const params = new URLSearchParams(window.location.search);
    params.set("category", nextCategory.key);
    params.delete("entry");
    params.delete("source");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash || ""}`;
    window.history[replaceUrl ? "replaceState" : "pushState"]({ category: nextCategory.key }, "", nextUrl);
  }
}

function setupCategoryNavigation() {
  const nav = document.getElementById("category-nav-list");
  const mobileCategoryList = document.getElementById("mobile-category-list");
  const gatewayGrid = document.getElementById("portfolio-gateway-grid");
  const handleCategoryLinkClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const link = target.closest("a");
    if (!(link instanceof HTMLAnchorElement)) return;
    const url = new URL(link.href, window.location.origin);
    const rawCategory = url.searchParams.get("category") || "";
    const nextCategory = resolveCategoryFromRaw(rawCategory);
    if (nextCategory.key === activeCategoryState.key) {
      event.preventDefault();
      setCategoryPickerOpen(false);
      return;
    }
    event.preventDefault();
    applyActiveCategory(nextCategory, { updateUrl: true });
    setCategoryPickerOpen(false);
  };
  if (nav instanceof HTMLElement) nav.addEventListener("click", handleCategoryLinkClick);
  if (mobileCategoryList instanceof HTMLElement) mobileCategoryList.addEventListener("click", handleCategoryLinkClick);
  if (gatewayGrid instanceof HTMLElement) {
    gatewayGrid.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const link = target.closest(".portfolio-gateway-card");
      if (!(link instanceof HTMLAnchorElement)) return;
      event.preventDefault();
      window.location.replace(link.href);
    });
  }
}

let heroCoverSwapToken = 0;
function preloadPriorityHeroAsset(src) {
  const normalizedSrc = normalizeAssetPath(src);
  if (!normalizedSrc) return;
  let preload = document.head.querySelector('link[data-priority-hero="gallery"]');
  if (!(preload instanceof HTMLLinkElement)) {
    preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "image";
    preload.setAttribute("fetchpriority", "high");
    preload.dataset.priorityHero = "gallery";
    document.head.appendChild(preload);
  }
  if (preload.href !== new URL(normalizedSrc, window.location.href).href) preload.href = normalizedSrc;
}
function swapHeroCover(heroImage, nextSrc, nextAlt) {
  if (!(heroImage instanceof HTMLImageElement)) return;
  const resolvedSrc = normalizeAssetPath(nextSrc);
  if (!resolvedSrc) return;
  heroImage.loading = "eager";
  heroImage.decoding = "async";
  heroImage.fetchPriority = "high";
  preloadPriorityHeroAsset(resolvedSrc);
  if (heroImage.dataset.coverInitialized !== "1") {
    heroImage.src = resolvedSrc;
    heroImage.alt = nextAlt;
    heroImage.dataset.coverInitialized = "1";
    return;
  }
  const currentSrc = heroImage.getAttribute("src") || "";
  if (currentSrc === resolvedSrc) {
    heroImage.alt = nextAlt;
    return;
  }

  const swapToken = ++heroCoverSwapToken;
  heroImage.classList.add("is-switching");
  const preload = new Image();
  const finalizeSwap = () => {
    if (swapToken !== heroCoverSwapToken) return;
    heroImage.src = resolvedSrc;
    heroImage.alt = nextAlt;
    window.requestAnimationFrame(() => {
      if (swapToken !== heroCoverSwapToken) return;
      heroImage.classList.remove("is-switching");
    });
  };
  preload.onload = finalizeSwap;
  preload.onerror = finalizeSwap;
  preload.src = resolvedSrc;
}

function renderCategoryPage(activeCategory, items) {
  const heroImage = document.getElementById("hero-image");
  const heroTitle = document.getElementById("hero-title");
  const heroSubtitle = document.getElementById("hero-subtitle");
  const metaTitle = document.getElementById("meta-title");
  const metaSubtitle = document.getElementById("meta-subtitle");
  const consultBtn = document.getElementById("consult-collection");
  const collectionHook = document.getElementById("collection-hook");
  const productsGrid = document.getElementById("products-grid");
  const ctaWrap = consultBtn instanceof HTMLElement ? consultBtn.closest(".cta-wrap") : null;

  if (!(heroImage instanceof HTMLImageElement) || !(heroTitle instanceof HTMLElement) || !(heroSubtitle instanceof HTMLElement)
    || !(metaTitle instanceof HTMLElement) || !(metaSubtitle instanceof HTMLElement)
    || !(consultBtn instanceof HTMLAnchorElement)) return;

  swapHeroCover(heroImage, activeCategory.coverImage, `${activeCategory.name} cover`);
  heroTitle.textContent = activeCategory.name;
  heroSubtitle.textContent = activeCategory.subtitle;
  metaTitle.textContent = activeCategory.name;
  metaSubtitle.textContent = activeCategory.subtitle;
  consultBtn.href = buildConsultHref(activeCategory.phone, activeCategory.name);
  const isByRequest = activeCategory.key === "by-request";
  if (collectionHook instanceof HTMLElement) {
    collectionHook.hidden = !isByRequest;
  }
  if (ctaWrap instanceof HTMLElement) {
    ctaWrap.classList.toggle("is-by-request", isByRequest);
  }
  if (productsGrid instanceof HTMLElement) {
    productsGrid.classList.toggle("by-request-row", isByRequest);
  }
  setupFilters(activeCategory, items);
}

function applyGalleryPageCopy(payload = {}) {
  const noteElement = document.getElementById("gallery-portfolio-note");
  const collectionHook = document.getElementById("collection-hook");
  const consultButton = document.getElementById("consult-collection");
  const galleryPage = payload?.galleryPage && typeof payload.galleryPage === "object"
    ? payload.galleryPage
    : {};
  const resolved = {
    note: String(galleryPage.note || GALLERY_PAGE_DEFAULT_COPY.note).trim(),
    byRequestHook: String(galleryPage.byRequestHook || GALLERY_PAGE_DEFAULT_COPY.byRequestHook).trim(),
    consultButtonLabel: String(galleryPage.consultButtonLabel || GALLERY_PAGE_DEFAULT_COPY.consultButtonLabel).trim()
  };

  if (noteElement instanceof HTMLElement) noteElement.textContent = resolved.note;
  if (collectionHook instanceof HTMLElement) collectionHook.textContent = resolved.byRequestHook;
  if (consultButton instanceof HTMLAnchorElement) consultButton.textContent = resolved.consultButtonLabel;
}

function activateProductFromHash() {
  const hash = (window.location.hash || "").replace("#", "");
  const activeCard = hash ? document.getElementById(hash) : null;
  document.querySelectorAll(".product-card.is-active").forEach((card) => card.classList.remove("is-active"));
  if (activeCard) {
    activeCard.classList.add("is-active");
    activeCard.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function syncFooterAccordion() {
  const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
  footerAccordionColumns.forEach((column) => {
    if (!(column instanceof HTMLElement)) return;
    const toggle = column.querySelector(".footer-accordion-toggle");
    const panel = column.querySelector(".footer-accordion-panel");
    if (!(toggle instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return;

    if (!isMobileViewport) {
      column.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "true");
      panel.style.maxHeight = "none";
      panel.style.opacity = "1";
      return;
    }

    const isOpen = column.classList.contains("is-open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    panel.style.maxHeight = isOpen ? `${panel.scrollHeight}px` : "0px";
    panel.style.opacity = isOpen ? "1" : "0";
  });
}

function bindFooterAccordion() {
  footerAccordionToggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) return;
    if (toggle.dataset.footerAccordionBound === "1") return;
    toggle.dataset.footerAccordionBound = "1";
    toggle.addEventListener("click", () => {
      const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
      if (!isMobileViewport) return;
      const column = toggle.closest(".footer-col");
      if (!(column instanceof HTMLElement)) return;
      const willOpen = !column.classList.contains("is-open");
      footerAccordionColumns.forEach((candidate) => {
        if (candidate instanceof HTMLElement) candidate.classList.remove("is-open");
      });
      if (willOpen) column.classList.add("is-open");
      syncFooterAccordion();
    });
  });
}

const contactTrigger = document.getElementById("contact-quick-trigger");
const contactBackdrop = document.getElementById("contact-quick-backdrop");
const contactPanel = document.getElementById("contact-quick-panel");
const contactClose = contactPanel ? contactPanel.querySelector(".contact-quick-close") : null;
const menuToggle = document.getElementById("menu-toggle");
const menuPanel = document.getElementById("menu-panel");
const menuClose = document.getElementById("menu-close");
const menuViews = menuPanel ? Array.from(menuPanel.querySelectorAll("[data-menu-view]")) : [];
const filtersTrigger = document.getElementById("filters-trigger");
const filtersTriggerMobile = document.getElementById("filters-trigger-mobile");
const filtersPanel = document.getElementById("filters-panel");
const filtersClose = document.getElementById("filters-close");
const heroGatewayHit = document.getElementById("hero-gateway-hit");
const mobileCategoryTrigger = document.getElementById("mobile-category-trigger");
const mobileCategoryPanel = document.getElementById("mobile-category-panel");
const mobileCategoryBackdrop = document.getElementById("mobile-category-backdrop");
const footerAccordionColumns = Array.from(document.querySelectorAll("#site-footer .footer-col"));
const footerAccordionToggles = Array.from(document.querySelectorAll("#site-footer .footer-accordion-toggle"));
const POPUPS_ENABLED = true;
const setMenuView = (viewName = "main") => {
  if (!menuViews.length || !menuPanel) return;
  menuPanel.setAttribute("data-menu-current", viewName);
  menuViews.forEach((view) => {
    const isMatch = view.getAttribute("data-menu-view") === viewName;
    view.setAttribute("aria-hidden", isMatch ? "false" : "true");
  });
};

const setContactOpen = (isOpen) => {
  if (!contactPanel || !contactBackdrop || !contactTrigger) return;
  contactPanel.classList.toggle("is-open", isOpen);
  contactBackdrop.classList.toggle("is-open", isOpen);
  contactPanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
  contactTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  document.body.classList.toggle("contact-quick-open", isOpen);
};
const setMenuOpen = (isOpen) => {
  if (!menuPanel || !contactBackdrop || !menuToggle) return;
  menuPanel.classList.toggle("is-open", isOpen);
  contactBackdrop.classList.toggle("is-open", isOpen);
  menuPanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
  menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  if (!isOpen) setMenuView("main");
};
if (menuPanel) setMenuView("main");
const setFiltersOpen = (isOpen) => {
  const filterButtons = [filtersTrigger, filtersTriggerMobile].filter((button) => button instanceof HTMLButtonElement);
  if (!filtersPanel || !contactBackdrop || !filterButtons.length) return;
  filtersPanel.classList.toggle("is-open", isOpen);
  contactBackdrop.classList.toggle("is-open", isOpen);
  filtersPanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
  filterButtons.forEach((button) => button.setAttribute("aria-expanded", isOpen ? "true" : "false"));
};
const setCategoryPickerOpen = (isOpen) => {
  if (!mobileCategoryPanel || !mobileCategoryTrigger) return;
  mobileCategoryPanel.classList.toggle("is-open", isOpen);
  mobileCategoryPanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
  mobileCategoryTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  if (mobileCategoryBackdrop instanceof HTMLElement) {
    mobileCategoryBackdrop.classList.toggle("is-open", isOpen);
    mobileCategoryBackdrop.setAttribute("aria-hidden", isOpen ? "false" : "true");
  }
};

if (contactTrigger) {
  if (!POPUPS_ENABLED) {
    contactTrigger.setAttribute("aria-disabled", "true");
  } else {
    contactTrigger.addEventListener("click", () => {
      const isOpen = contactPanel && contactPanel.classList.contains("is-open");
      if (!isOpen) {
        setMenuOpen(false);
        setFiltersOpen(false);
        setCategoryPickerOpen(false);
      }
      setContactOpen(!isOpen);
    });
  }
}
if (contactBackdrop) {
  if (POPUPS_ENABLED) {
    contactBackdrop.addEventListener("click", () => setContactOpen(false));
  }
}
if (contactClose instanceof HTMLButtonElement) {
  if (POPUPS_ENABLED) {
    contactClose.addEventListener("click", () => setContactOpen(false));
  }
}
if (menuToggle && menuPanel) {
  if (!POPUPS_ENABLED) {
    menuToggle.setAttribute("aria-disabled", "true");
  } else {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuPanel.classList.contains("is-open");
      if (!isOpen) {
        setMenuView("main");
        setContactOpen(false);
        setFiltersOpen(false);
        setCategoryPickerOpen(false);
      }
      setMenuOpen(!isOpen);
    });
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
const filterTriggerButtons = [filtersTrigger, filtersTriggerMobile].filter((button) => button instanceof HTMLButtonElement);
if (filterTriggerButtons.length && filtersPanel) {
  if (!POPUPS_ENABLED) {
    filterTriggerButtons.forEach((button) => button.setAttribute("aria-disabled", "true"));
  } else {
    filterTriggerButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const isOpen = filtersPanel.classList.contains("is-open");
        if (!isOpen) {
          setContactOpen(false);
          setMenuOpen(false);
          setCategoryPickerOpen(false);
        }
        setFiltersOpen(!isOpen);
      });
    });
  }
}
if (mobileCategoryTrigger instanceof HTMLButtonElement && mobileCategoryPanel instanceof HTMLElement) {
  if (!POPUPS_ENABLED) {
    mobileCategoryTrigger.setAttribute("aria-disabled", "true");
  } else {
    mobileCategoryTrigger.addEventListener("click", () => {
      const isOpen = mobileCategoryPanel.classList.contains("is-open");
      if (!isOpen) {
        setContactOpen(false);
        setMenuOpen(false);
        setFiltersOpen(false);
      }
      setCategoryPickerOpen(!isOpen);
    });
  }
}
if (mobileCategoryBackdrop instanceof HTMLElement) {
  if (POPUPS_ENABLED) {
    mobileCategoryBackdrop.addEventListener("click", () => setCategoryPickerOpen(false));
  }
}
if (filtersClose instanceof HTMLButtonElement) {
  if (POPUPS_ENABLED) {
    filtersClose.addEventListener("click", () => setFiltersOpen(false));
  }
}
if (heroGatewayHit instanceof HTMLButtonElement) {
  heroGatewayHit.addEventListener("click", () => {
    window.location.href = "gallery.html?entry=portfolio-hero";
  });
}
if (menuClose instanceof HTMLButtonElement) {
  if (POPUPS_ENABLED) {
    menuClose.addEventListener("click", () => setMenuOpen(false));
  }
}
if (contactBackdrop) {
  if (POPUPS_ENABLED) {
    contactBackdrop.addEventListener("click", () => setMenuOpen(false));
    contactBackdrop.addEventListener("click", () => setFiltersOpen(false));
  }
}
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!POPUPS_ENABLED) return;
  setContactOpen(false);
  setMenuOpen(false);
  setFiltersOpen(false);
  setCategoryPickerOpen(false);
});

async function initialize() {
  await hydrateCategoryMetaFromContent();
  setupCategoryNavigation();
  bindFooterAccordion();
  syncFooterAccordion();

  if (shouldShowPortfolioGateway()) {
    renderPortfolioGateway();
    activeCategoryState = resolveCategoryFromRaw("");
    return;
  }

  activeCategoryState = resolveCategoryFromQuery();

  try {
    let siteSectionsPayload = null;
    for (const endpoint of SITE_SECTIONS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) continue;
        siteSectionsPayload = await response.json();
        break;
      } catch (_fetchError) {
        // Try next endpoint variant.
      }
    }
    applyGalleryPageCopy(siteSectionsPayload || {});
  } catch (_error) {
    applyGalleryPageCopy({});
  }

  galleryItemsCache = [];
  try {
    let payload = null;
    const primaryResponse = await fetch(GALLERY_CONTENT_ENDPOINT, { cache: "no-store" });
    if (primaryResponse.ok) {
      payload = await primaryResponse.json();
    } else {
      const fallbackResponse = await fetch(GALLERY_LEGACY_ENDPOINT, { cache: "no-store" });
      if (fallbackResponse.ok) payload = await fallbackResponse.json();
    }
    if (payload) {
      galleryItemsCache = extractGalleryItems(payload);
    }
  } catch (_error) {
    galleryItemsCache = [];
  }

  applyActiveCategory(activeCategoryState, { updateUrl: false });
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

setupEarlyLazyImageWarmup();
initialize();
window.addEventListener("hashchange", activateProductFromHash);
window.addEventListener("popstate", () => {
  const nextCategory = resolveCategoryFromQuery();
  applyActiveCategory(nextCategory, { updateUrl: false });
});
window.addEventListener("resize", syncFooterAccordion);
