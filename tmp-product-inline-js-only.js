
const FAQ_BY_GROUP = {
  bouquets: [
    { title: "Pricing", content: "Bouquets typically begin from around Rp120.000 for artificial arrangements and approximately Rp170.000 for fresh flower bouquets. The final price may vary depending on the flower selection, arrangement size, and the style requested.\n\nFinal pricing will be confirmed during consultation." },
    { title: "Customization", content: "Each bouquet is arranged individually for the order. Color palettes, wrapping styles, and flower varieties may be adjusted depending on the occasion and flower availability. If a particular flower is not available, a similar variety may be used while maintaining the overall character of the arrangement." },
    { title: "Delivery & Preparation", content: "Delivery is available across Batam. Same-day delivery may be possible depending on the preparation time required. Most bouquets can be prepared within approximately 30 minutes, though more detailed arrangements may require additional time." },
    { title: "Ordering Process", content: "Orders are arranged through WhatsApp consultation. After confirming the design and details of the arrangement, payment can be completed via transfer. The bouquet will then be prepared and scheduled for delivery." }
  ],
  artificialArrangement: [
    { title: "Pricing", content: "Artificial flower arrangements typically begin from around Rp200.000, depending on the container, arrangement size, and materials used.\nFinal pricing will be confirmed during consultation." },
    { title: "Customization", content: "Artificial arrangements can be adjusted in color palette, style, and container depending on the intended setting. These arrangements are often prepared for home decoration, gifts, or interior displays." },
    { title: "Delivery & Preparation", content: "Delivery is available across Batam. Preparation usually begins shortly after order confirmation, with timing depending on the complexity of the arrangement." },
    { title: "Ordering Process", content: "Orders are confirmed through WhatsApp consultation, where our team will assist in determining the arrangement style and final pricing before preparation begins." }
  ],
  bloomBox: [
    { title: "Pricing", content: "Bloom box arrangements generally begin from around Rp200.000, depending on the flower selection and the scale of the arrangement.\nFinal pricing will be confirmed during consultation." },
    { title: "Customization", content: "Bloom boxes may be arranged in different color themes and flower combinations depending on the occasion. If a particular flower variety is unavailable, a similar substitute may be used while maintaining the overall design." },
    { title: "Delivery & Preparation", content: "Delivery is available across Batam. Preparation time depends on the arrangement style and flower availability." },
    { title: "Ordering Process", content: "Orders are handled through WhatsApp consultation. Once the design and details are confirmed, payment is completed and the arrangement will be prepared accordingly." }
  ],
  balloonBloomBox: [
    { title: "Pricing", content: "Balloon bloom box arrangements typically begin from around Rp350.000, depending on balloon style, flower selection, and arrangement size.\nFinal pricing will be confirmed during consultation." },
    { title: "Customization", content: "Balloon colors, messages, and flower combinations can be adjusted depending on the occasion, including birthdays, graduations, and celebrations." },
    { title: "Delivery & Preparation", content: "Delivery is available across Batam. Preparation time may vary depending on the complexity of the arrangement." },
    { title: "Ordering Process", content: "Orders are arranged through WhatsApp consultation where details and pricing are confirmed before preparation begins." }
  ],
  papanSingle: [
    { title: "Pricing", content: "Flower boards typically begin from around Rp150.000 for a single board, depending on the design and floral style.\nFinal pricing will be confirmed during consultation." },
    { title: "Customization", content: "Message text, color combinations, and floral styles can be adjusted depending on the occasion and the intended tone of the arrangement." },
    { title: "Delivery & Installation", content: "Delivery and installation are available throughout Batam. In many cases, installation can be arranged within the same day depending on availability." },
    { title: "Ordering Process", content: "Orders are arranged through WhatsApp consultation where the message text, installation location, and design are confirmed before preparation begins." }
  ],
  papanDouble: [
    { title: "Pricing", content: "Flower boards typically begin from around Rp280.000 for a double board, depending on the design and floral style.\nFinal pricing will be confirmed during consultation." },
    { title: "Customization", content: "Message text, color combinations, and floral styles can be adjusted depending on the occasion and the intended tone of the arrangement." },
    { title: "Delivery & Installation", content: "Delivery and installation are available throughout Batam. In many cases, installation can be arranged within the same day depending on availability." },
    { title: "Ordering Process", content: "Orders are arranged through WhatsApp consultation where the message text, installation location, and design are confirmed before preparation begins." }
  ],
  funeralsSingle: [
    { title: "Pricing", content: "Condolence flower boards follow the same general pricing structure, beginning from around Rp150.000 for single boards, depending on the arrangement and floral design.\nFinal pricing will be confirmed during consultation." },
    { title: "Duration", content: "Flower boards are typically installed for around three days for most occasions. For condolence arrangements, installation may remain until the completion of the final tribute ceremonies, depending on the family’s wishes." },
    { title: "Delivery & Installation", content: "Delivery and installation are available across Batam, and arrangements can often be prepared within the same day." },
    { title: "Ordering Process", content: "Orders are handled through WhatsApp consultation where the message text, installation location, and design are confirmed before preparation." }
  ],
  funeralsDouble: [
    { title: "Pricing", content: "Condolence flower boards follow the same general pricing structure, beginning from around Rp280.000 for double boards, depending on the arrangement and floral design.\nFinal pricing will be confirmed during consultation." },
    { title: "Duration", content: "Flower boards are typically installed for around three days for most occasions. For condolence arrangements, installation may remain until the completion of the final tribute ceremonies, depending on the family’s wishes." },
    { title: "Delivery & Installation", content: "Delivery and installation are available across Batam, and arrangements can often be prepared within the same day." },
    { title: "Ordering Process", content: "Orders are handled through WhatsApp consultation where the message text, installation location, and design are confirmed before preparation." }
  ],
  standing: [
    { title: "Pricing", content: "Standing flower arrangements typically begin from around Rp1.000.000 for artificial arrangements and approximately Rp1.100.000 for fresh flower designs, depending on size and floral composition.\nFinal pricing will be confirmed during consultation." },
    { title: "Customization", content: "Standing arrangements can be adjusted in color palette and floral style depending on the event, whether for grand openings, celebrations, or formal occasions." },
    { title: "Delivery & Installation", content: "Delivery and installation are available throughout Batam." },
    { title: "Ordering Process", content: "Orders are confirmed through WhatsApp consultation where arrangement details and final pricing are discussed before preparation." }
  ],
  parcels: [
    { title: "Pricing", content: "Parcel arrangements typically begin from around Rp450.000, depending on the contents and presentation.\nFinal pricing will be confirmed during consultation." },
    { title: "Customization", content: "Parcel contents may be adjusted depending on the occasion, with options suitable for festive, celebratory, or seasonal arrangements." },
    { title: "Delivery & Preparation", content: "Delivery is available across Batam, with preparation depending on the parcel contents and presentation." },
    { title: "Ordering Process", content: "Orders are arranged through WhatsApp consultation where parcel contents and final pricing are confirmed before preparation." }
  ],
  customRequest: [
    { title: "Pricing", content: "Custom arrangements are priced based on request details, materials, and arrangement scale.\nFinal pricing will be confirmed after consultation." },
    { title: "Customization", content: "Each custom arrangement is developed by request. Style, palette, and structure are discussed first to match the intended concept before confirmation." },
    { title: "Delivery & Preparation", content: "Delivery is available across Batam. Preparation time depends on design complexity and material availability, and will be confirmed during consultation." },
    { title: "Ordering Process", content: "Orders are handled through WhatsApp consultation. After concept and details are confirmed, final pricing and timeline will be shared before preparation begins." }
  ],
  featuredConsult: [
    { title: "Customization", content: "Featured arrangements can be adjusted to your preferred palette, flower selection, and occasion concept after discussion with our team." },
    { title: "Delivery & Preparation", content: "Delivery and preparation timing are confirmed during consultation, depending on arrangement complexity and schedule." },
    { title: "Ordering Process", content: "Orders are arranged through WhatsApp consultation. Design direction, pricing, and timeline are confirmed first before preparation begins." }
  ]
};

function isFeaturedCategory(value) {
  const text = normalize(value);
  if (!text) return false;
  return text.includes("featured")
    || text.includes("collection")
    || text.includes("ramadan")
    || text.includes("eid")
    || text.includes("valentine")
    || text.includes("graduation")
    || text.includes("mother")
    || text.includes("chinese new year")
    || text.includes("christmas");
}

function resolveFeaturedPriceByTitle(title) {
  const key = normalize(title);
  if (!key) return "";
  if (key.includes("garden abundance")) return "Rp1.050.000";
  if (key.includes("golden gathering")) return "Rp1.200.000";
  if (key.includes("sunlit harmony")) return "Rp700.000";
  if (key.includes("crescent bloom")) return "Rp650.000";
  return "";
}

function normalize(value) { return String(value || "").trim().toLowerCase(); }
function decodeParam(value) { try { return decodeURIComponent(value || ""); } catch { return String(value || ""); } }
function getFileStem(path) {
  const raw = String(path || "").split("/").pop() || "";
  return raw.replace(/\.[a-z0-9]+$/i, "");
}
function toTitleCase(text) {
  return String(text || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
function withDisplayNumber(name, index) {
  const raw = String(name || "").trim() || "Arrangement";
  const label = raw.replace(/\s*No\.\s*\d{1,3}\b/gi, "").trim() || "Arrangement";
  const number = Math.max(1, Number(index) || 1);
  return `${label} No. ${String(number).padStart(2, "0")}`;
}
function normalizeCategoryKey(value) {
  const raw = normalize(value).replace(/\s+/g, " ");
  if (!raw) return raw;
  if (["papan bunga", "flower boards", "papan"].includes(raw)) return "flower boards";
  if (["artificial flowers", "artificial flower arrangements", "artificial"].includes(raw)) return "artificial flowers";
  if (["standing flowers", "standing flower"].includes(raw)) return "standing flowers";
  if (["parcels", "hampers", "parcel"].includes(raw)) return "parcels";
  if (["by request", "custom", "car decorations", "opening ribbons"].includes(raw)) return "by request";
  return raw;
}
function getCategoryItems(items, category) {
  const key = normalizeCategoryKey(category);
  const matches = items.filter((item) => normalizeCategoryKey(item?.category) === key);
  if (key !== "by request") return matches;
  return items.filter((item) => {
    const itemKey = normalizeCategoryKey(item?.category);
    return itemKey === "by request" || itemKey === "car decorations" || itemKey === "opening ribbons";
  });
}
function getItemNumberInCategory(items, category, image) {
  const categoryItems = getCategoryItems(items, category);
  const target = normalize(image);
  const idx = categoryItems.findIndex((item) => normalize(item?.image) === target);
  if (idx >= 0) return idx + 1;
  const globalIdx = items.findIndex((item) => normalize(item?.image) === target);
  return globalIdx >= 0 ? globalIdx + 1 : 0;
}
async function loadGalleryItems() {
  try {
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
    const payload = await fetchFirstAvailableJson([
      "/content/gallery.json",
      "content/gallery.json",
      "/data/gallery.json",
      "data/gallery.json"
    ]);
    if (!payload) return [];
    const normalizeItem = (item, fallbackCategory = "") => {
      if (!item || typeof item !== "object") return null;
      const priceRaw = item.price;
      const normalizedPrice = priceRaw === null || priceRaw === undefined || priceRaw === ""
        ? null
        : (Number.isFinite(Number(priceRaw)) && Number(priceRaw) > 0
          ? Number(priceRaw)
          : null);
      return {
        ...item,
        title: String(item.title || item.name || "").trim(),
        category: String(item.category || fallbackCategory).trim(),
        price: normalizedPrice
      };
    };

    if (Array.isArray(payload?.items)) {
      return payload.items
        .map((item) => normalizeItem(item))
        .filter(Boolean);
    }

    const categories = Array.isArray(payload?.categories) ? payload.categories : [];
    if (!categories.length) return [];

    const flattened = [];
    categories.forEach((categoryEntry) => {
      const fallbackCategory = String(categoryEntry?.name || categoryEntry?.key || "").trim();
      const categoryItems = Array.isArray(categoryEntry?.items) ? categoryEntry.items : [];
      categoryItems.forEach((item) => {
        const normalized = normalizeItem(item, fallbackCategory);
        if (!normalized) return;
        flattened.push(normalized);
      });
    });
    return flattened;
  } catch (_error) {
    return [];
  }
}
async function loadFeaturedItems() {
  try {
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
    const payload = await fetchFirstAvailableJson([
      "/content/featured.json",
      "content/featured.json"
    ]);
    const events = Array.isArray(payload?.events) ? payload.events : [];
    const flattened = [];
    events.forEach((event) => {
      const eventTitle = String(event?.title || "").trim();
      const products = Array.isArray(event?.products) ? event.products : [];
      products.forEach((product) => {
        const image = String(product?.src || "").trim();
        const title = String(product?.name || "").trim();
        const price = Number.isFinite(Number(product?.price)) && Number(product?.price) > 0
          ? Number(product.price)
          : null;
        if (!image || !title) return;
        flattened.push({
          category: eventTitle || "Seasonal Collection",
          title,
          image,
          price
        });
      });
    });
    return flattened;
  } catch (_error) {
    return [];
  }
}
function normalizeImagePath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw)) return raw.toLowerCase();
  const cleaned = raw.replace(/^\.?\//, "");
  return `/${cleaned}`.toLowerCase();
}
function findCanonicalGalleryMatch(items, category, image) {
  const targetImage = normalizeImagePath(image);
  const targetCategory = normalizeCategoryKey(category);
  if (!targetImage && !targetCategory) return null;
  const byImage = items.find((item) => normalizeImagePath(item?.image) === targetImage);
  if (byImage) return byImage;
  if (!targetCategory) return null;
  return items.find((item) => normalizeCategoryKey(item?.category) === targetCategory) || null;
}
function findCanonicalFeaturedMatch(items, category, title, image) {
  const targetImage = normalizeImagePath(image);
  const targetTitle = normalize(title);
  const targetCategory = normalize(category);
  const byImage = items.find((item) => normalizeImagePath(item?.image) === targetImage);
  if (byImage) return byImage;
  const byTitleAndCategory = items.find((item) => normalize(item?.title) === targetTitle && normalize(item?.category) === targetCategory);
  if (byTitleAndCategory) return byTitleAndCategory;
  return items.find((item) => normalize(item?.title) === targetTitle) || null;
}
function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) return String(value || "").trim();
  if (numeric <= 0) return "";
  return `Rp${new Intl.NumberFormat("id-ID").format(Math.round(numeric))}`;
}
function normalizeProductTitle(category, rawTitle, imagePath) {
  const base = rawTitle && rawTitle !== "Product" ? rawTitle : getFileStem(imagePath);
  const cleaned = normalize(base)
    .replace(/[_(),.-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  const tokenMap = {
    perp: "purple",
    purp: "purple",
    bloombal: "balloon",
    balon: "balloon",
    bloombox: "bloom box"
  };
  const skipTokens = new Set(["img", "image", "final", "copy", "edited", "new", "photo", "hasil", "mf", "webp", "jpeg", "jpg", "png", "art", "bou", "pap", "sta", "par"]);
  const tokens = cleaned
    .split(" ")
    .map((token) => tokenMap[token] || token)
    .flatMap((token) => token.split(" "))
    .filter((token) => token && !skipTokens.has(token));

  const cat = normalize(category);
  if (isFeaturedCategory(cat) && rawTitle && rawTitle !== "Product") return rawTitle.trim();
  if (cat.includes("by request") || cat.includes("custom")) return "Custom Arrangement";
  const colorWords = ["pink", "white", "red", "purple", "blue", "yellow", "orange", "black", "gold", "green", "pastel", "mixed"];
  const colors = colorWords.filter((word) => tokens.includes(word));
  const leadColor = colors[0] ? `${toTitleCase(colors[0])} ` : "";
  const hasMoney = tokens.includes("money");
  const hasGrad = tokens.includes("graduation") || tokens.includes("grad");
  const hasBalloon = tokens.includes("balloon");
  const hasBloomBox = tokens.includes("bloom") && tokens.includes("box");
  const hasCross = tokens.includes("cross") || tokens.includes("salib");
  const hasFrame = tokens.includes("frame") || tokens.includes("framed");
  const hasStanding = tokens.includes("standing");
  const hasPapan = cat.includes("papan") || tokens.includes("papan");
  const hasTwo = tokens.includes("2papan") || tokens.includes("2") || tokens.includes("papan2");
  const isRustic = tokens.includes("wood") || tokens.includes("wooden") || tokens.includes("round");

  if (cat.includes("bouquet")) {
    if (hasMoney) return `${leadColor}Money Bouquet`.trim();
    if (hasGrad) return `${leadColor}Graduation Bouquet`.trim();
    return `${leadColor}Bouquet Arrangement`.trim();
  }
  if (cat.includes("artificial")) {
    if (hasBalloon) return `${leadColor}Balloon Bloom Box`.trim();
    if (hasBloomBox) return `${leadColor}Bloom Box`.trim();
    if (tokens.includes("pot") || tokens.includes("potted") || tokens.includes("basket")) return `${leadColor}Potted Arrangement`.trim();
    return `${leadColor}Artificial Arrangement`.trim();
  }
  if (hasPapan) {
    const papanType = isRustic ? "Rustic" : "Suyuk";
    const sizeLabel = hasTwo ? "Double" : "Single";
    if (cat.includes("funeral") || tokens.includes("duka") || tokens.includes("funeral")) {
      return `Papan Bunga Duka ${sizeLabel} ${papanType}`;
    }
    return `Papan Bunga ${sizeLabel} ${papanType}`;
  }
  if (cat.includes("funeral")) {
    if (hasCross) return `${leadColor}Condolence Cross`.trim();
    if (hasFrame) return `${leadColor}Condolence Frame`.trim();
    if (hasStanding) return `${leadColor}Standing Tribute`.trim();
    return `${leadColor}Condolence Arrangement`.trim();
  }
  if (cat.includes("standing")) return `${leadColor}Standing Flower`.trim();
  if (cat.includes("parcel")) return `${leadColor}Gift Parcel`.trim();
  return `${leadColor}Floral Arrangement`.trim();
}
function adjustTitleByCategoryNumber(category, baseTitle, number) {
  const cat = normalize(category);
  const safeNumber = Number(number) || 0;
  if (cat.includes("papan") && safeNumber === 1) {
    return baseTitle.replace(/\bSuyuk\b/i, "Rustic");
  }
  if (cat.includes("artificial") && safeNumber === 15) {
    return "Bloom Box";
  }
  if (cat.includes("artificial") && (safeNumber === 13 || safeNumber === 18)) {
    return "Bloom Box";
  }
  if (cat.includes("artificial") && safeNumber === 22) {
    return "Bloom Box";
  }
  if (cat.includes("artificial") && (safeNumber === 20 || safeNumber === 21)) {
    return "Balloon Bloom Box";
  }
  if (cat.includes("artificial") && safeNumber >= 2 && safeNumber <= 4) {
    return "Balloon Bloom Box";
  }
  return baseTitle;
}
function resolveSpecialRetailPrice(category, number) {
  const cat = normalize(category);
  const safeNumber = Number(number) || 0;
  if (cat.includes("artificial") && safeNumber === 22) return "Retail price: Rp450.000";
  return "";
}
function inferFaqGroup(category, title, image, number = 0) {
  const text = `${normalize(category)} ${normalize(title)} ${normalize(image)}`;
  const isDoublePapan = text.includes("2papan") || text.includes("2 papan") || text.includes("papan2") || text.includes("double");
  if (isFeaturedCategory(category)) return "featuredConsult";
  if (text.includes("by request") || text.includes("custom")) return "customRequest";
  if (text.includes("parcel") || text.includes("hamper")) return "parcels";
  if (text.includes("standing")) return "standing";
  if (text.includes("funeral") || text.includes("duka")) return isDoublePapan ? "funeralsDouble" : "funeralsSingle";
  if (text.includes("papan")) return isDoublePapan ? "papanDouble" : "papanSingle";
  if (text.includes("balloon") || text.includes("bloombal")) return "balloonBloomBox";
  if (text.includes("artificial") || text.includes("bloom box") || text.includes("bloombox")) {
    const no = Number(number) || 0;
    if (no === 15 || no === 22) return "bloomBox";
    if ((no >= 2 && no <= 4) || no === 20 || no === 21) return "balloonBloomBox";
    if (text.includes("bloom box") || text.includes("bloombox")) return "bloomBox";
    return "artificialArrangement";
  }
  if (text.includes("bouquet")) return "bouquets";
  return "bouquets";
}
function resolvePhone(category, title, image) {
  const text = `${normalize(category)} ${normalize(title)} ${normalize(image)}`;
  if (text.includes("parcel") || text.includes("hamper")) return "628116667920";
  if (text.includes("by request") || text.includes("custom")) return "628116667457";
  return "6281275017456";
}
function buildWaLink(phone, title) {
  const link = window.location.href;
  const text = [
    "Halo Marvell Florist, saya ingin konsultasi produk ini.",
    "",
    `Produk: ${title}`,
    `Link: ${link}`
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
function renderFaq(group, title, image) {
  const wrap = document.getElementById("product-faq");
  if (!(wrap instanceof HTMLElement)) return;
  const faqs = FAQ_BY_GROUP[group] || FAQ_BY_GROUP.bouquets;
  const toFaqParagraphs = (content) => String(content || "")
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${part}</p>`)
    .join("");
  wrap.innerHTML = faqs.map((item, index) => `
    <article class="faq-item">
      <button class="faq-toggle" type="button" aria-expanded="false">
        <span>${item.title}</span>
        <span class="faq-icon" aria-hidden="true">+</span>
      </button>
      <div class="faq-panel">
        <div class="faq-content">${toFaqParagraphs(item.content)}</div>
      </div>
    </article>
  `).join("");

  const items = Array.from(wrap.querySelectorAll(".faq-item"));
  items.forEach((item) => {
    const toggle = item.querySelector(".faq-toggle");
    const panel = item.querySelector(".faq-panel");
    if (!(toggle instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return;
    toggle.addEventListener("click", () => {
      const willOpen = !item.classList.contains("is-open");
      items.forEach((other) => {
        const t = other.querySelector(".faq-toggle");
        const p = other.querySelector(".faq-panel");
        if (!(t instanceof HTMLButtonElement) || !(p instanceof HTMLElement)) return;
        other.classList.remove("is-open");
        t.setAttribute("aria-expanded", "false");
        p.style.maxHeight = "0px";
        p.style.opacity = "0";
      });
      if (willOpen) {
        item.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = `${panel.scrollHeight + 8}px`;
        panel.style.opacity = "1";
      }
    });
  });
}
async function initDetail() {
  const params = new URLSearchParams(window.location.search);
  const requestedCategory = decodeParam(params.get("category"));
  const requestedTitle = decodeParam(params.get("title")) || "Product";
  const requestedImage = decodeParam(params.get("image"));
  const priceParam = decodeParam(params.get("price"));
  const [galleryItems, featuredItems] = await Promise.all([
    loadGalleryItems(),
    loadFeaturedItems()
  ]);
  const matchedGalleryItem = findCanonicalGalleryMatch(galleryItems, requestedCategory, requestedImage);
  const matchedFeaturedItem = matchedGalleryItem
    ? null
    : findCanonicalFeaturedMatch(featuredItems, requestedCategory, requestedTitle, requestedImage);
  const category = String(
    matchedGalleryItem?.category
    || matchedFeaturedItem?.category
    || requestedCategory
    || ""
  ).trim();
  const image = String(
    matchedGalleryItem?.image
    || matchedFeaturedItem?.image
    || requestedImage
    || ""
  ).trim();
  const sourceTitle = String(
    matchedGalleryItem?.title
    || matchedFeaturedItem?.title
    || requestedTitle
    || "Product"
  ).trim();
  const hasExplicitTitle = Boolean(sourceTitle) && normalize(sourceTitle) !== "product";
  const productNumber = getItemNumberInCategory(galleryItems, category, image);
  const rawBaseTitle = hasExplicitTitle
    ? sourceTitle
    : normalizeProductTitle(category, sourceTitle, image);
  const baseTitle = hasExplicitTitle
    ? rawBaseTitle
    : adjustTitleByCategoryNumber(category, rawBaseTitle, productNumber);
  const title = isFeaturedCategory(category)
    ? baseTitle
    : (hasExplicitTitle ? baseTitle : withDisplayNumber(baseTitle, productNumber || 1));
  const imageEl = document.getElementById("product-image");
  const titleEl = document.getElementById("product-title");
  const priceEl = document.getElementById("product-price");
  const waBtn = document.getElementById("product-whatsapp");
  const breadcrumbEl = document.getElementById("product-breadcrumb");
  if (imageEl instanceof HTMLImageElement) {
    imageEl.src = image || "/assets/quotes.webp";
    imageEl.alt = title;
  }
  if (titleEl instanceof HTMLElement) titleEl.textContent = title;
  if (priceEl instanceof HTMLElement) {
    const priceText =
      formatRupiah(matchedGalleryItem?.price)
      || formatRupiah(matchedFeaturedItem?.price)
      || formatRupiah(priceParam)
      || (isFeaturedCategory(category) ? resolveFeaturedPriceByTitle(title) : "")
      || resolveSpecialRetailPrice(category, productNumber || 1);
    priceEl.textContent = priceText;
    priceEl.hidden = !priceText;
  }
  if (waBtn instanceof HTMLAnchorElement) {
    waBtn.href = buildWaLink(resolvePhone(category, title, image), title);
  }
  if (breadcrumbEl instanceof HTMLElement) {
    const categoryName = String(category || "Portfolio").trim() || "Portfolio";
    if (isFeaturedCategory(categoryName)) {
      breadcrumbEl.innerHTML = `
        <a href="index.html">Home</a>
        <span aria-hidden="true">/</span>
        <a href="index.html#featured">Featured</a>
        <span aria-hidden="true">/</span>
        <span class="crumb-current">${title}</span>
      `;
    } else {
      breadcrumbEl.innerHTML = `
        <a href="index.html">Home</a>
        <span aria-hidden="true">/</span>
        <a href="gallery.html">Portfolio</a>
        <span aria-hidden="true">/</span>
        <a href="gallery.html?category=${encodeURIComponent(categoryName)}">${categoryName}</a>
        <span aria-hidden="true">/</span>
        <span class="crumb-current">${title}</span>
      `;
    }
  }
  renderFaq(inferFaqGroup(category, title, image, productNumber || 0), title, image);
  renderRelatedProducts(category, image, galleryItems);
}

function renderRelatedProducts(category, currentImage, galleryItems = []) {
  const grid = document.getElementById("related-grid");
  if (!(grid instanceof HTMLElement)) return;
  const current = normalize(currentImage);
  const categoryItems = getCategoryItems(galleryItems, category);
  const related = categoryItems
    .map((item, index) => ({ item, categoryIndex: index + 1 }))
    .filter((entry) => normalize(entry.item?.image) !== current)
    .slice(0, 6);
  if (!related.length) {
    grid.innerHTML = '<p class="related-card-title">No additional items in this category yet.</p>';
    return;
  }
  grid.innerHTML = related.map(({ item, categoryIndex }) => {
    const image = String(item?.image || "").trim();
    const rawBaseTitle = normalizeProductTitle(category, String(item?.title || item?.name || ""), image);
    const baseTitle = adjustTitleByCategoryNumber(category, rawBaseTitle, categoryIndex);
    const title = withDisplayNumber(baseTitle, categoryIndex);
    const href = `product.html?category=${encodeURIComponent(category)}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`;
    return `
      <a class="related-card" href="${href}">
        <div class="related-card-image">${
          image
            ? `<img class="related-image-cover" src="${image}" alt="${title}" loading="lazy" decoding="async"><img class="related-image-full" src="${image}" alt="" aria-hidden="true" loading="lazy" decoding="async">`
            : ""
        }</div>
      </a>
    `;
  }).join("");
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

const contactTrigger = document.getElementById("contact-quick-trigger");
const contactBackdrop = document.getElementById("contact-quick-backdrop");
const contactPanel = document.getElementById("contact-quick-panel");
const contactClose = document.getElementById("contact-quick-close");
const menuToggle = document.getElementById("menu-toggle");
const menuPanel = document.getElementById("menu-panel");
const menuClose = document.getElementById("menu-close");
const menuViews = menuPanel ? Array.from(menuPanel.querySelectorAll("[data-menu-view]")) : [];
const footerCols = Array.from(document.querySelectorAll("#site-footer .footer-col"));
const footerToggles = Array.from(document.querySelectorAll("#site-footer .footer-accordion-toggle"));

const setMenuView = (view = "main") => {
  if (!menuPanel) return;
  menuPanel.setAttribute("data-menu-current", view);
  menuViews.forEach((v) => v.setAttribute("aria-hidden", v.getAttribute("data-menu-view") === view ? "false" : "true"));
};
const setContactOpen = (open) => {
  if (!contactPanel || !contactBackdrop || !contactTrigger) return;
  contactPanel.classList.toggle("is-open", open);
  contactBackdrop.classList.toggle("is-open", open);
  contactPanel.setAttribute("aria-hidden", open ? "false" : "true");
  contactTrigger.setAttribute("aria-expanded", open ? "true" : "false");
};
const setMenuOpen = (open) => {
  if (!menuPanel || !contactBackdrop || !menuToggle) return;
  menuPanel.classList.toggle("is-open", open);
  contactBackdrop.classList.toggle("is-open", open);
  menuPanel.setAttribute("aria-hidden", open ? "false" : "true");
  menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
  if (!open) setMenuView("main");
};
if (menuPanel) setMenuView("main");
if (contactTrigger) contactTrigger.addEventListener("click", () => setContactOpen(!(contactPanel && contactPanel.classList.contains("is-open"))));
if (contactClose) contactClose.addEventListener("click", () => setContactOpen(false));
if (menuToggle && menuPanel) menuToggle.addEventListener("click", () => { const o = menuPanel.classList.contains("is-open"); if (!o) setContactOpen(false); setMenuOpen(!o); });
if (menuClose) menuClose.addEventListener("click", () => setMenuOpen(false));
if (contactBackdrop) contactBackdrop.addEventListener("click", () => { setContactOpen(false); setMenuOpen(false); });
if (menuPanel) {
  menuPanel.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const openBtn = target.closest("[data-menu-open]");
    if (openBtn instanceof HTMLElement) { const v = openBtn.getAttribute("data-menu-open"); if (v) setMenuView(v); return; }
    const backBtn = target.closest("[data-menu-back]");
    if (backBtn instanceof HTMLElement) { const v = backBtn.getAttribute("data-menu-back") || "main"; setMenuView(v); return; }
    if (target instanceof HTMLAnchorElement) setMenuOpen(false);
  });
}
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { setContactOpen(false); setMenuOpen(false); } });

function syncFooterAccordion() {
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  footerCols.forEach((col) => {
    const toggle = col.querySelector(".footer-accordion-toggle");
    const panel = col.querySelector(".footer-accordion-panel");
    if (!(toggle instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return;
    if (!mobile) {
      col.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "true");
      panel.style.maxHeight = "none";
      panel.style.opacity = "1";
      return;
    }
    const open = col.classList.contains("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    panel.style.maxHeight = open ? `${panel.scrollHeight}px` : "0px";
    panel.style.opacity = open ? "1" : "0";
  });
}
footerToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    if (!mobile) return;
    const col = toggle.closest(".footer-col");
    if (!(col instanceof HTMLElement)) return;
    const willOpen = !col.classList.contains("is-open");
    footerCols.forEach((other) => other.classList.remove("is-open"));
    if (willOpen) col.classList.add("is-open");
    syncFooterAccordion();
  });
});
window.addEventListener("resize", syncFooterAccordion);

initDetail();
syncFooterAccordion();
setupEarlyLazyImageWarmup();
