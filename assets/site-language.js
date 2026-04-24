(function () {
  const STORAGE_KEY = "marvell-language";
  const SUPPORTED_LANGUAGES = new Set(["en", "id"]);
  const GA_MEASUREMENT_ID = "G-Z9PJ60V3CR";
  const ANALYTICS_OPT_OUT_STORAGE_KEY = "marvell-analytics-disabled";
  const THEME_FAVICONS = {
    light: { href: "/assets/logo.webp?v=5", type: "image/webp" },
    dark: { href: "/assets/darklogo.png?v=2", type: "image/png" }
  };
  let themeFaviconBound = false;
  let analyticsInitialized = false;
  let whatsappTrackingBound = false;

  function syncAnalyticsPreferenceFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const value = String(params.get("analytics") || "").trim().toLowerCase();
      if (value === "off") window.localStorage.setItem(ANALYTICS_OPT_OUT_STORAGE_KEY, "1");
      else if (value === "on") window.localStorage.removeItem(ANALYTICS_OPT_OUT_STORAGE_KEY);
    } catch (_error) {
      // Ignore storage and URL access failures.
    }
  }

  function isAnalyticsDisabled() {
    syncAnalyticsPreferenceFromUrl();
    try {
      return window.localStorage.getItem(ANALYTICS_OPT_OUT_STORAGE_KEY) === "1";
    } catch (_error) {
      return false;
    }
  }

  function applyAnalyticsDisabledFlag() {
    window[`ga-disable-${GA_MEASUREMENT_ID}`] = isAnalyticsDisabled();
  }

  applyAnalyticsDisabledFlag();
  window.MarvellAnalytics = window.MarvellAnalytics || {
    disable() {
      try {
        window.localStorage.setItem(ANALYTICS_OPT_OUT_STORAGE_KEY, "1");
      } catch (_error) {
        // Ignore storage failures.
      }
      applyAnalyticsDisabledFlag();
    },
    enable() {
      try {
        window.localStorage.removeItem(ANALYTICS_OPT_OUT_STORAGE_KEY);
      } catch (_error) {
        // Ignore storage failures.
      }
      applyAnalyticsDisabledFlag();
    },
    isDisabled() {
      return isAnalyticsDisabled();
    }
  };

  const PAGE_TITLES = {
    home: {
      en: "Marvell Florist | Batam Florist",
      id: "Marvell Florist | Toko Bunga Batam"
    },
    gallery: {
      en: "Gallery | Marvell Florist",
      id: "Galeri | Marvell Florist"
    },
    product: {
      en: "Product Detail | Marvell Florist",
      id: "Detail Produk | Marvell Florist"
    },
    about: {
      en: "About | Marvell Florist",
      id: "Tentang | Marvell Florist"
    },
    featured: {
      en: "Marvell Florist | Collections",
      id: "Marvell Florist | Koleksi"
    },
    faq: {
      en: "FAQ | Marvell Florist",
      id: "FAQ | Marvell Florist"
    },
    privacy: {
      en: "Privacy Policy | Marvell Florist",
      id: "Kebijakan Privasi | Marvell Florist"
    },
    terms: {
      en: "Terms & Conditions | Marvell Florist",
      id: "Ketentuan | Marvell Florist"
    },
    contact: {
      en: "Contact | Marvell Florist",
      id: "Kontak | Marvell Florist"
    },
    services: {
      en: "Services | Marvell Florist",
      id: "Layanan | Marvell Florist"
    },
    custom: {
      en: "Custom Arrangements | Marvell Florist",
      id: "Rangkaian Kustom | Marvell Florist"
    },
    stories: {
      en: "The Journals | Marvell Florist",
      id: "Jurnal | Marvell Florist"
    },
    story: {
      en: "Journal | Marvell Florist",
      id: "Jurnal | Marvell Florist"
    }
  };

  const PAGE_DESCRIPTIONS = {
    home: {
      en: "Marvell Florist is a florist in Batam offering bouquets, standing flowers, flower boards, parcels, and custom floral arrangements for meaningful occasions.",
      id: "Marvell Florist adalah toko bunga di Batam yang menghadirkan bouquet, standing flower, papan bunga, parcel, dan rangkaian kustom untuk berbagai momen istimewa."
    },
    gallery: {
      en: "Browse Marvell Florist collections by category.",
      id: "Jelajahi koleksi Marvell Florist berdasarkan kategori."
    },
    about: {
      en: "Learn about Marvell Florist: our journey, our craft, and our team.",
      id: "Kenali Marvell Florist: perjalanan kami, karya kami, dan tim kami."
    },
    faq: {
      en: "Frequently asked questions for Marvell Florist.",
      id: "Pertanyaan yang paling sering diajukan untuk Marvell Florist."
    },
    privacy: {
      en: "Read Marvell Florist's privacy policy.",
      id: "Baca kebijakan privasi Marvell Florist."
    },
    terms: {
      en: "Read the terms and conditions for Marvell Florist orders and services.",
      id: "Baca syarat dan ketentuan untuk pesanan dan layanan Marvell Florist."
    },
    contact: {
      en: "Get in touch with Marvell Florist for orders, inquiries, and floral consultations in Batam.",
      id: "Hubungi Marvell Florist untuk pemesanan, pertanyaan, dan konsultasi floral di Batam."
    },
    services: {
      en: "Explore Marvell Florist services: consultation, custom arrangements, message cards, delivery, pickup, and floral boards in Batam.",
      id: "Jelajahi layanan Marvell Florist: konsultasi, rangkaian kustom, kartu pesan, pengiriman, pickup, dan papan bunga di Batam."
    },
    custom: {
      en: "Explore consultation-led custom arrangements by Marvell Florist for gifting, reference-led requests, and one-off floral work in Batam.",
      id: "Jelajahi rangkaian kustom Marvell Florist yang dibentuk melalui konsultasi untuk gifting, permintaan berbasis referensi, dan kebutuhan floral khusus di Batam."
    },
    stories: {
      en: "Browse The Journals by Marvell Florist as simple editable visual lookbooks.",
      id: "Jelajahi The Journals dari Marvell Florist sebagai lookbook visual sederhana yang dapat diedit."
    },
    story: {
      en: "Explore a Marvell Florist journal presented as a visual lookbook.",
      id: "Jelajahi sebuah jurnal Marvell Florist yang ditampilkan sebagai lookbook visual."
    }
  };

  const CATEGORY_DATA = {
    "artificial-flowers": {
      en: "Table Arrangements",
      id: "Rangkaian Meja",
      subtitleEn: "Table arrangements for decorative styling and long-lasting display.",
      subtitleId: "Rangkaian meja untuk kebutuhan dekoratif dan display jangka panjang."
    },
    bouquets: {
      en: "Bouquets",
      id: "Buket",
      subtitleEn: "Custom bouquets for gifts, celebrations, and special moments.",
      subtitleId: "Buket kustom untuk hadiah, perayaan, dan momen spesial."
    },
    "papan-bunga": {
      en: "Flower Boards",
      id: "Papan Bunga",
      subtitleEn: "Flower boards for openings, condolences, and formal occasions.",
      subtitleId: "Papan bunga ucapan untuk peresmian, duka cita, dan momen formal lainnya."
    },
    funerals: {
      en: "Funerals",
      id: "Duka Cita",
      subtitleEn: "Condolence arrangements and funeral boards prepared with care and respect.",
      subtitleId: "Rangkaian belasungkawa dan papan duka yang disiapkan dengan hormat."
    },
    "standing-flowers": {
      en: "Standing Flowers",
      id: "Standing Flowers",
      subtitleEn: "Standing flower arrangements for events and formal displays.",
      subtitleId: "Standing flowers untuk dekorasi acara dan kebutuhan display formal."
    },
    parcels: {
      en: "Parcels",
      id: "Parcel",
      subtitleEn: "Gift parcels for celebrations, hampers, and festive moments.",
      subtitleId: "Parcel hadiah untuk perayaan, hampers, dan kebutuhan gifting."
    },
    "by-request": {
      en: "By Request",
      id: "Sesuai Permintaan",
      subtitleEn: "Custom floral work for special requests and personal concepts.",
      subtitleId: "Kategori kustom untuk kebutuhan khusus dan konsep personal."
    },
    featured: {
      en: "Collections",
      id: "Koleksi"
    }
  };

  const CATEGORY_ALIASES = new Map([
    ["table arrangements", "artificial-flowers"],
    ["table arrangement", "artificial-flowers"],
    ["rangkaian meja", "artificial-flowers"],
    ["artificial flowers", "artificial-flowers"],
    ["bunga artifisial", "artificial-flowers"],
    ["bouquets", "bouquets"],
    ["buket", "bouquets"],
    ["flower boards", "papan-bunga"],
    ["papan bunga", "papan-bunga"],
    ["funerals", "funerals"],
    ["duka cita", "funerals"],
    ["standing flowers", "standing-flowers"],
    ["parcels", "parcels"],
    ["parcel", "parcels"],
    ["by request", "by-request"],
    ["sesuai permintaan", "by-request"],
    ["featured", "featured"],
    ["unggulan", "featured"]
  ]);

  const FAQ_ITEMS = {
    en: [
      {
        question: "How do I place an order?",
        answer: "All orders begin with a consultation. You can contact us through WhatsApp to discuss your needs, design preferences, and order details."
      },
      {
        question: "Why do some products not have fixed prices?",
        answer: "Most of our arrangements are made to order. Final pricing depends on the flower selection, size, and design complexity."
      },
      {
        question: "Do you provide a fresh flower price list?",
        answer: "Yes. We can share a fresh flower price list, but availability and pricing may change depending on market conditions and stock."
      },
      {
        question: "Are all products always available?",
        answer: "Flower and arrangement availability may vary depending on seasonality and stock. We recommend confirming availability before placing an order."
      },
      {
        question: "Can I request a custom design?",
        answer: "Yes. We accept custom requests tailored to your needs, theme, and the occasion you want to celebrate."
      },
      {
        question: "Do you offer delivery?",
        answer: "We provide delivery across Batam. Delivery fees are adjusted based on the destination."
      },
      {
        question: "Is same-day ordering possible?",
        answer: "Same-day orders may be possible depending on availability and arrangement complexity. Please contact us first for confirmation."
      },
      {
        question: "What payment methods are available?",
        answer: "We accept bank transfer, cash, and other available payment methods."
      },
      {
        question: "When is my order considered confirmed?",
        answer: "Orders are processed once the design details are agreed upon and payment has been received."
      },
      {
        question: "Can an order be changed or cancelled?",
        answer: "Changes or cancellations may be possible before production begins. Please contact us as soon as possible for assistance."
      }
    ],
    id: [
      {
        question: "Bagaimana cara melakukan pemesanan?",
        answer: "Seluruh pesanan dilakukan melalui konsultasi. Anda dapat menghubungi kami melalui WhatsApp untuk mendiskusikan kebutuhan, preferensi desain, serta detail pesanan Anda."
      },
      {
        question: "Mengapa sebagian produk tidak memiliki harga tetap?",
        answer: "Sebagian besar rangkaian kami dibuat secara khusus. Harga akhir akan disesuaikan dengan pilihan bunga, ukuran, serta tingkat kompleksitas desain."
      },
      {
        question: "Apakah tersedia daftar harga bunga segar?",
        answer: "Ya, kami menyediakan daftar harga untuk bunga potong segar. Namun, ketersediaan dan harga dapat berubah mengikuti kondisi pasar dan stok."
      },
      {
        question: "Apakah semua produk selalu tersedia?",
        answer: "Ketersediaan bunga dan rangkaian dapat berbeda tergantung musim dan stok. Kami menyarankan untuk melakukan konfirmasi terlebih dahulu sebelum melakukan pemesanan."
      },
      {
        question: "Apakah saya dapat memesan desain khusus?",
        answer: "Tentu. Kami menerima pesanan khusus yang dirancang sesuai dengan kebutuhan, tema, dan momen yang ingin Anda rayakan."
      },
      {
        question: "Apakah tersedia layanan pengiriman?",
        answer: "Kami menyediakan layanan pengiriman untuk area Batam. Biaya pengiriman akan disesuaikan dengan lokasi tujuan."
      },
      {
        question: "Apakah memungkinkan untuk pemesanan di hari yang sama?",
        answer: "Pemesanan di hari yang sama dapat dilakukan tergantung pada ketersediaan dan kompleksitas pesanan. Silakan hubungi kami untuk konfirmasi lebih lanjut."
      },
      {
        question: "Metode pembayaran apa yang tersedia?",
        answer: "Kami menerima pembayaran melalui transfer bank, tunai, serta metode pembayaran lain yang tersedia."
      },
      {
        question: "Kapan pesanan saya dianggap selesai dikonfirmasi?",
        answer: "Pesanan akan diproses setelah detail desain disepakati dan pembayaran telah diterima."
      },
      {
        question: "Apakah pesanan dapat diubah atau dibatalkan?",
        answer: "Perubahan atau pembatalan dapat dilakukan selama pesanan belum memasuki tahap produksi. Silakan hubungi kami sesegera mungkin untuk bantuan lebih lanjut."
      }
    ]
  };

  const SIMPLE_LABELS = {
    "About": "Tentang",
    "Our Journey": "Perjalanan Kami",
    "Our Craft": "Karya Kami",
    "Our Team": "Tim Kami",
    "Contact": "Hubungi",
    "Contact Us": "Hubungi Kami",
    "Categories": "Kategori",
    "Category": "Kategori",
    "Privacy": "Privasi",
    "Terms": "Ketentuan",
    "FAQ": "FAQ",
    "Search": "Cari",
    "Search arrangements": "Cari rangkaian",
    "Reviews": "Ulasan",
    "Filter": "Filter",
    "Filters": "Filter",
    "Color": "Warna",
    "Type": "Jenis",
    "Flower Type": "Jenis Bunga",
    "Flower Condition": "Kondisi Bunga",
    "Size": "Ukuran",
    "Occasion": "Momen",
    "Material": "Material",
    "Boards": "Papan",
    "Style": "Gaya",
    "Price Range": "Rentang Harga",
    "Reset filter": "Atur ulang filter",
    "Fresh": "Segar",
    "Artificial": "Artifisial",
    "Preserved": "Preserved",
    "Pink": "Merah Muda",
    "White": "Putih",
    "Red": "Merah",
    "Purple": "Ungu",
    "Blue": "Biru",
    "Yellow": "Kuning",
    "Orange": "Oranye",
    "Green": "Hijau",
    "Black": "Hitam",
    "Gold": "Emas",
    "Mixed": "Campuran",
    "Small": "Kecil",
    "Medium": "Sedang",
    "Large": "Besar",
    "Grand": "Besar Sekali",
    "Pot": "Pot",
    "Bloom Box": "Bloom Box",
    "Cross": "Salib",
    "Frame": "Frame",
    "Wedding": "Pernikahan",
    "Graduation": "Wisuda",
    "Condolence": "Belasungkawa",
    "Success": "Sukses",
    "Idul Fitri": "Idul Fitri",
    "Christmas": "Natal",
    "Gift": "Hadiah",
    "Rustic": "Rustik",
    "Standard": "Standar",
    "1 Board": "1 Papan",
    "2 Boards": "2 Papan",
    "3 Boards": "3 Papan",
    "Discover More": "Lihat Lebih Lanjut",
    "The Collection": "Koleksi",
    "Collection": "Koleksi",
    "Featured": "Koleksi",
    "Collections": "Koleksi",
    "Products": "Produk",
    "Recommended Products": "Produk Rekomendasi",
    "Related Searches": "Pencarian Terkait",
    "Write a Review on Google": "Tulis Ulasan di Google",
    "Previous reviews": "Ulasan sebelumnya",
    "Next reviews": "Ulasan berikutnya",
    "Back": "Kembali",
    "Services": "Layanan",
    "Portfolio": "Portofolio"
  };

  const STYLE_TEXT = [
    ".language-switcher{display:inline-flex;align-items:center;gap:4px;margin-left:10px;pointer-events:auto;color:inherit;order:3;}",
    ".language-switcher__button{border:0;background:transparent;padding:0;font-family:\"Inter Tight\",sans-serif;font-size:11px;letter-spacing:.08em;color:currentColor;opacity:.54;cursor:pointer;transition:opacity .18s ease,color .18s ease;}",
    ".language-switcher__button.is-active{opacity:1;}",
    ".language-switcher__button:hover,.language-switcher__button:focus-visible{opacity:.72;outline:none;}",
    ".language-switcher__divider{font-family:\"Inter Tight\",sans-serif;font-size:10px;color:currentColor;opacity:.34;}",
    "body.desktop-header-hero-mode .language-switcher{color:rgba(242,236,224,.96)!important;}",
    "@media (max-width:768px){.language-switcher{margin-left:8px;gap:3px;}.language-switcher__button{font-size:10px;letter-spacing:.07em;}}"
  ].join("");

  function normalizeLanguage(value) {
    const text = String(value || "").trim().toLowerCase();
    return SUPPORTED_LANGUAGES.has(text) ? text : "";
  }

  function resolveInitialLanguage() {
    const search = new URLSearchParams(window.location.search);
    const fromQuery = normalizeLanguage(search.get("lang"));
    if (fromQuery) {
      window.localStorage.setItem(STORAGE_KEY, fromQuery);
      return fromQuery;
    }
    const fromStorage = normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
    if (fromStorage) return fromStorage;
    const browserLanguage = String(navigator.language || "").toLowerCase();
    return browserLanguage.startsWith("id") ? "id" : "en";
  }

  let currentLanguage = resolveInitialLanguage();
  document.documentElement.lang = currentLanguage;

  function t(english, indonesian) {
    return currentLanguage === "id" ? indonesian : english;
  }

  function pageNameFromPathname(pathname) {
    const name = String(pathname || "").split("/").pop() || "index.html";
    if (name === "index.html" || name === "") return "home";
    if (name === "gallery.html") return "gallery";
    if (name === "product.html") return "product";
    if (name === "about.html") return "about";
    if (name === "featured.html") return "featured";
    if (name === "faq.html") return "faq";
    if (name === "privacy-policy.html") return "privacy";
    if (name === "terms-conditions.html") return "terms";
    if (name === "contact.html") return "contact";
    if (name === "services.html") return "services";
    if (name === "custom-arrangements.html") return "custom";
    if (name === "journals.html") return "stories";
    if (name === "journal.html") return "story";
    return "";
  }

  function normalizeKey(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function categoryKeyFromValue(value) {
    const normalized = normalizeKey(value);
    if (!normalized) return "";
    if (CATEGORY_ALIASES.has(normalized)) return CATEGORY_ALIASES.get(normalized) || "";
    return normalized.replace(/\s+/g, "-");
  }

  function localizeCategory(value) {
    const key = categoryKeyFromValue(value);
    const record = CATEGORY_DATA[key];
    if (!record) return String(value || "").trim();
    return currentLanguage === "id" ? record.id : record.en;
  }

  function localizeCategorySubtitle(value) {
    const key = categoryKeyFromValue(value);
    const record = CATEGORY_DATA[key];
    if (!record) return String(value || "").trim();
    return currentLanguage === "id" ? record.subtitleId : record.subtitleEn;
  }

  function setDocumentMeta(pageName, options = {}) {
    const skipTitle = options && options.skipTitle === true;
    const skipDescription = options && options.skipDescription === true;
    const titleRecord = PAGE_TITLES[pageName];
    if (!skipTitle && titleRecord) document.title = currentLanguage === "id" ? titleRecord.id : titleRecord.en;
    const description = document.querySelector('meta[name="description"]');
    const descriptionRecord = PAGE_DESCRIPTIONS[pageName];
    if (!skipDescription && description instanceof HTMLMetaElement && descriptionRecord) {
      description.setAttribute("content", currentLanguage === "id" ? descriptionRecord.id : descriptionRecord.en);
    }
    document.documentElement.lang = currentLanguage;
  }

  function setText(node, value) {
    if (!(node instanceof HTMLElement) || typeof value !== "string") return;
    if (node.textContent !== value) node.textContent = value;
  }

  function setHtml(node, value) {
    if (!(node instanceof HTMLElement) || typeof value !== "string") return;
    if (node.innerHTML !== value) node.innerHTML = value;
  }

  function setSelectorText(selector, value, root = document) {
    const node = root.querySelector(selector);
    setText(node, value);
  }

  function setSelectorHtml(selector, value, root = document) {
    const node = root.querySelector(selector);
    setHtml(node, value);
  }

  function ensureLanguageStyles() {
    if (document.getElementById("site-language-style")) return;
    const style = document.createElement("style");
    style.id = "site-language-style";
    style.textContent = STYLE_TEXT;
    document.head.appendChild(style);
  }

  function buildLocalizedHref(rawHref, language) {
    const original = String(rawHref || "").trim();
    if (!original || original === "#" || /^mailto:|^tel:|^javascript:/i.test(original)) return original;
    const url = new URL(original, window.location.href);
    if (url.origin !== window.location.origin) return original;
    url.searchParams.set("lang", language);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function decorateInternalLinks(root = document) {
    const links = Array.from(root.querySelectorAll("a[href]"));
    links.forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      const href = link.getAttribute("href") || "";
      const nextHref = buildLocalizedHref(href, currentLanguage);
      if (nextHref && nextHref !== href) link.setAttribute("href", nextHref);
    });
  }

  function injectLanguageSwitcher() {
    const bars = Array.from(document.querySelectorAll(".header-bar"));
    bars.forEach((bar) => {
      if (!(bar instanceof HTMLElement)) return;
      let switcher = bar.querySelector(".language-switcher");
      if (!(switcher instanceof HTMLElement)) {
        switcher = document.createElement("div");
        switcher.className = "language-switcher";
        switcher.setAttribute("aria-label", "Language switcher");
        switcher.innerHTML = [
          '<button class="language-switcher__button" type="button" data-lang="en">EN</button>',
          '<span class="language-switcher__divider" aria-hidden="true">/</span>',
          '<button class="language-switcher__button" type="button" data-lang="id">ID</button>'
        ].join("");
      }

      const isMobileViewport = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 768px)").matches;
      if (isMobileViewport) {
        const logo = bar.querySelector(".header-logo");
        const favorites = bar.querySelector(".favorites-launcher");
        const searchToggle = bar.querySelector(".search-toggle, .search-mobile-trigger");
        if (logo && logo.parentNode === bar) {
          if (logo.nextSibling !== switcher) {
            bar.insertBefore(switcher, logo.nextSibling);
          }
        } else if (favorites && favorites.parentNode === bar) {
          bar.insertBefore(switcher, favorites);
        } else if (searchToggle && searchToggle.parentNode === bar) {
          bar.insertBefore(switcher, searchToggle);
        } else {
          bar.appendChild(switcher);
        }
      } else {
        const contactTrigger = bar.querySelector(".contact-quick-trigger, .header-contact");
        if (contactTrigger && contactTrigger.parentNode === bar && contactTrigger.nextSibling !== switcher) {
          bar.insertBefore(switcher, contactTrigger.nextSibling);
        } else if (contactTrigger && contactTrigger.parentNode === bar) {
          bar.appendChild(switcher);
        } else {
          const menuToggle = bar.querySelector(".menu-toggle");
          if (menuToggle && menuToggle.parentNode === bar) bar.insertBefore(switcher, menuToggle);
          else bar.appendChild(switcher);
        }
      }
    });

    if (!bars.length) {
      const nav = document.querySelector("header nav");
      if (nav instanceof HTMLElement && !nav.querySelector(".language-switcher")) {
        const switcher = document.createElement("div");
        switcher.className = "language-switcher";
        switcher.setAttribute("aria-label", "Language switcher");
        switcher.innerHTML = [
          '<button class="language-switcher__button" type="button" data-lang="en">EN</button>',
          '<span class="language-switcher__divider" aria-hidden="true">/</span>',
          '<button class="language-switcher__button" type="button" data-lang="id">ID</button>'
        ].join("");
        nav.appendChild(switcher);
      }
    }

    Array.from(document.querySelectorAll(".language-switcher__button")).forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.classList.toggle("is-active", button.dataset.lang === currentLanguage);
      if (button.dataset.bound === "1") return;
      button.dataset.bound = "1";
      button.addEventListener("click", () => {
        const nextLanguage = normalizeLanguage(button.dataset.lang);
        if (!nextLanguage || nextLanguage === currentLanguage) return;
        window.localStorage.setItem(STORAGE_KEY, nextLanguage);
        window.location.href = buildLocalizedHref(window.location.href, nextLanguage);
      });
    });
  }

  function localizeSimpleLabel(value) {
    const text = String(value || "").trim();
    if (!text) return text;
    if (currentLanguage === "id") {
      if (Object.prototype.hasOwnProperty.call(SIMPLE_LABELS, text)) return SIMPLE_LABELS[text];
      const countedMatch = text.match(/^(.*?)(\s*\(\d+\))$/);
      if (countedMatch && Object.prototype.hasOwnProperty.call(SIMPLE_LABELS, countedMatch[1])) {
        return `${SIMPLE_LABELS[countedMatch[1]]}${countedMatch[2]}`;
      }
      if (/^\d+\s+products$/i.test(text)) return text.replace(/products$/i, "produk");
      return text;
    }
    const englishMatch = Object.entries(SIMPLE_LABELS).find((entry) => entry[1] === text);
    if (englishMatch) return englishMatch[0];
    const countedMatch = text.match(/^(.*?)(\s*\(\d+\))$/);
    if (countedMatch) {
      const reverse = Object.entries(SIMPLE_LABELS).find((entry) => entry[1] === countedMatch[1]);
      if (reverse) return `${reverse[0]}${countedMatch[2]}`;
    }
    if (/^\d+\s+produk$/i.test(text)) return text.replace(/produk$/i, "products");
    return text;
  }

  function localizeSeasonalCollectionLabel(value) {
    const text = String(value || "").trim();
    if (!text) return text;
    if (currentLanguage !== "id") {
      const reverseMap = {
        "Koleksi Ramadan & Idul Fitri": "Ramadan & Eid Collection",
        "Koleksi Valentine": "Valentine's Collection",
        "Koleksi Wisuda": "Graduation Collection",
        "Koleksi Hari Ibu": "Mother's Day Collection",
        "Koleksi Tahun Baru Imlek": "Chinese New Year Collection",
        "Koleksi Natal": "Christmas Collection",
        "Koleksi Musiman": "Seasonal Collection",
        "Koleksi Pilihan": "Featured Collection",
        "Koleksi": "Collections"
      };
      return reverseMap[text] || text;
    }
    const directMap = {
      "Ramadan & Eid Collection": "Koleksi Ramadan & Idul Fitri",
      "Valentine's Collection": "Koleksi Valentine",
      "Graduation Collection": "Koleksi Wisuda",
      "Mother's Day Collection": "Koleksi Hari Ibu",
      "Chinese New Year Collection": "Koleksi Tahun Baru Imlek",
      "Christmas Collection": "Koleksi Natal",
      "Seasonal Collection": "Koleksi Musiman",
      "Featured Collection": "Koleksi Pilihan",
      "Collections": "Koleksi"
    };
    return directMap[text] || text;
  }

  function translateCommonHeader() {
    Array.from(document.querySelectorAll(".contact-quick-trigger,.header-contact")).forEach((node) => {
      setText(node, t("Contact Us", "Hubungi Kami"));
    });
    Array.from(document.querySelectorAll(".search-label")).forEach((node) => {
      setText(node, t("Search", "Cari"));
    });
    const mobileTriggerLabel = document.querySelector("#search-mobile-trigger span:last-child");
    setText(mobileTriggerLabel, t("Search arrangements", "Cari rangkaian"));
    Array.from(document.querySelectorAll(".menu-back")).forEach((node) => {
      setText(node, t("\u2190 Back", "\u2190 Kembali"));
    });
    Array.from(document.querySelectorAll(".menu-link")).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.dataset.seasonalManaged === "true") {
        setText(node, localizeSeasonalCollectionLabel(node.dataset.seasonalLabel || node.textContent || ""));
        return;
      }
      const visitType = node.getAttribute("data-visit-link") || "";
      if (visitType === "boutique") {
        setText(node, t("Florist Boutique", "Butik Florist"));
        return;
      }
      if (visitType === "supplies") {
        setText(node, t("Supplies Shop", "Toko Perlengkapan"));
        return;
      }
      const href = node.getAttribute("href") || "";
      if (href === "about.html" || href === "#about") setText(node, t("About", "Tentang"));
      if (href.includes("#services") || href.includes("services.html")) setText(node, t("Services", "Layanan"));
      if (href.includes("custom-arrangements.html")) setText(node, t("Custom Arrangements", "Rangkaian Kustom"));
      if (href.includes("journals.html")) setText(node, t("The Journals", "Jurnal"));
      if (href.includes("#reviews")) setText(node, t("Reviews", "Ulasan"));
      if ((href.includes("#featured") || href.includes("featured.html")) && node.dataset.seasonalManaged !== "true") {
        setText(node, t("Collections", "Koleksi"));
      }
      if (href.includes("gallery.html?category=")) {
        const category = new URL(node instanceof HTMLAnchorElement ? node.href : href, window.location.href).searchParams.get("category") || "";
        setText(node, localizeCategory(category));
      }
      if (href.includes("gallery.html?category=By%20Request") || href.includes("gallery.html?category=by-request")) {
        setText(node, t("By Request", "Sesuai Permintaan"));
      }
    });
    Array.from(document.querySelectorAll('[data-menu-open="featured"]')).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.dataset.seasonalManaged === "true") return;
      setText(node, t("Collections", "Koleksi"));
    });
    Array.from(document.querySelectorAll('[data-menu-open="visit"], [data-visit-entry="true"]')).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      setText(node, t("Visit Us", "Kunjungi Kami"));
    });
    Array.from(document.querySelectorAll('[data-menu-open="services"], [data-service-entry="true"]')).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      setText(node, t("Services", "Layanan"));
    });
    Array.from(document.querySelectorAll('[data-menu-open="about"], [data-about-entry="true"]')).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      setText(node, t("About", "Tentang"));
    });
    Array.from(document.querySelectorAll(".menu-link-contact")).forEach((node) => {
      setText(node, t("Contact Us", "Hubungi Kami"));
    });
    Array.from(document.querySelectorAll("[data-service-link]")).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const key = String(node.getAttribute("data-service-link") || "").trim();
      if (key === "all") setText(node, t("View All Services", "Lihat Semua Layanan"));
      if (key === "consultation") setText(node, t("Consultation", "Konsultasi"));
      if (key === "custom-arrangements") setText(node, t("Custom Arrangements", "Rangkaian Kustom"));
      if (key === "personal-message") setText(node, t("Message Cards", "Kartu Pesan"));
      if (key === "delivery-setup") setText(node, t("Delivery & Setup", "Pengiriman & Penataan"));
      if (key === "collection-pickup") setText(node, t("Pickup & Handover", "Pickup & Serah Terima"));
    });
    Array.from(document.querySelectorAll("[data-visit-link]")).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const key = String(node.getAttribute("data-visit-link") || "").trim();
      if (key === "boutique") setText(node, t("Florist Boutique", "Florist Boutique"));
      if (key === "supplies") setText(node, t("Supplies Shop", "Toko Perlengkapan"));
    });
    Array.from(document.querySelectorAll("[data-about-link]")).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const key = String(node.getAttribute("data-about-link") || "").trim();
      if (key === "overview") setText(node, t("View About", "Lihat Tentang"));
      if (key === "journey") setText(node, t("Our Journey", "Perjalanan Kami"));
      if (key === "craft") setText(node, t("Our Craft", "Karya Kami"));
      if (key === "batam") setText(node, t("Rooted in Batam", "Berakar di Batam"));
      if (key === "signature") setText(node, t("Signature Story", "Kisah Khas Kami"));
    });
  }

  function translateContactPanels() {
    Array.from(document.querySelectorAll(".contact-quick-body")).forEach((body) => {
      if (!(body instanceof HTMLElement)) return;
      const blocks = Array.from(body.querySelectorAll(":scope > .contact-quick-block"));
      blocks.forEach((block, index) => {
        if (!(block instanceof HTMLElement)) return;
        const label = block.querySelector(".contact-quick-label");
        const links = Array.from(block.querySelectorAll(".contact-quick-link"));
        const muted = Array.from(block.querySelectorAll(".contact-quick-text.is-muted"));
        if (index === 0) {
          setText(label, t("Contact Us", "Hubungi Kami"));
          setText(links[0], t("Floral Arrangements", "Rangkaian Bunga"));
          setText(links[1], t("Custom Orders", "Pesanan Kustom"));
          setText(links[2], t("Supplies", "Perlengkapan"));
          setText(muted[0], t("Available Monday - Saturday", "Tersedia Senin - Sabtu"));
          setText(muted[1], "8:00 - 18:00 (WIB)");
        }
        if (index === 1) {
          setText(label, t("Our Locations", "Lokasi Kami"));
          setText(links[0], t("Florist Boutique", "Rangkaian"));
          setText(links[1], t("Supplies Shop", "Perlengkapan"));
        }
        if (index === 2) setText(label, t("Stay Connected", "Tetap Terhubung"));
        if (index === 3) setText(label, t("Shop Online", "Belanja Online"));
      });
    });
  }

  function translateFooter(scope = document) {
    Array.from(scope.querySelectorAll(".footer-col-title")).forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      const raw = button.textContent || "";
      if (/Hubungi|Contact/i.test(raw)) {
        button.innerHTML = `${t("Contact", "Hubungi")} <span class="footer-accordion-icon" aria-hidden="true">+</span>`;
      } else if (/Tentang|About/i.test(raw)) {
        button.innerHTML = `${t("About", "Tentang")} <span class="footer-accordion-icon" aria-hidden="true">+</span>`;
      } else if (/Kategori|Categories/i.test(raw)) {
        button.innerHTML = `${t("Categories", "Kategori")} <span class="footer-accordion-icon" aria-hidden="true">+</span>`;
      }
    });

    Array.from(scope.querySelectorAll(".footer-link")).forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      const href = link.getAttribute("href") || "";
      if (link.dataset.seasonalManaged === "true") {
        setText(link, localizeSeasonalCollectionLabel(link.dataset.seasonalLabel || link.textContent || ""));
      }
      if (href.includes("#services") || href.includes("services.html#consultation")) setText(link, t("Contact Us", "Hubungi Kami"));
      if (href.includes("custom-arrangements.html")) setText(link, t("Custom Arrangements", "Rangkaian Kustom"));
      if (href.includes("journals.html")) setText(link, t("The Journals", "Jurnal"));
      if (href.includes("privacy-policy.html")) setText(link, t("Privacy", "Privasi"));
      if (href.includes("terms-conditions.html")) setText(link, t("Terms", "Ketentuan"));
      if (href.includes("faq.html")) setText(link, t("FAQ", "FAQ"));
      if ((href.includes("#featured") || href.includes("featured.html")) && link.dataset.seasonalManaged !== "true") {
        setText(link, t("Collections", "Koleksi"));
      }
      if (href.includes("gallery.html?category=")) {
        const category = new URL(link.href, window.location.href).searchParams.get("category") || "";
        setText(link, localizeCategory(category));
      }
      if (href.includes("about.html#journey") || href === "#journey") setText(link, t("Our Journey", "Perjalanan Kami"));
      if (href.includes("about.html#craft") || href === "#craft") setText(link, t("Our Craft", "Karya Kami"));
      if (href.includes("about.html#team") || href === "#team") setText(link, t("Our Team", "Tim Kami"));
      if (href.includes("about.html#foundation") || href === "#foundation") setText(link, t("Our Journey", "Perjalanan Kami"));
      if (href.includes("about.html#philosophy") || href === "#philosophy") setText(link, t("Our Craft", "Karya Kami"));
      if (href.includes("about.html#batam") || href === "#batam") setText(link, t("Rooted in Batam", "Berakar di Batam"));
      if (href.includes("about.html#signature") || href === "#signature") setText(link, t("Signature Story", "Kisah Khas Kami"));
    });

    Array.from(scope.querySelectorAll(".footer-about-link")).forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      const target = link.getAttribute("data-bio-target") || "";
      if (target === "fg2") setText(link, t("Our Journey", "Perjalanan Kami"));
      if (target === "fg3") setText(link, t("Our Craft", "Karya Kami"));
      if (target === "fg1") setText(link, t("Our Team", "Tim Kami"));
    });

    const footerBottom = scope.querySelector(".footer-bottom");
    if (footerBottom instanceof HTMLElement) {
      Array.from(footerBottom.querySelectorAll(".footer-legal-link")).forEach((link) => {
        if (!(link instanceof HTMLAnchorElement)) return;
        const href = link.getAttribute("href") || "";
        if (href.includes("privacy-policy.html")) setText(link, t("Privacy", "Privasi"));
        if (href.includes("terms-conditions.html")) setText(link, t("Terms", "Ketentuan"));
        if (href.includes("faq.html")) setText(link, t("FAQ", "FAQ"));
      });
    }

    Array.from(scope.querySelectorAll(".footer-descriptor p")).forEach((line) => {
      if (!(line instanceof HTMLElement)) return;
      const text = line.textContent || "";
      if (/^Alamat:/i.test(text) && currentLanguage === "en") {
        line.textContent = text.replace(/^Alamat:/i, "Address:");
      }
      if (/^Address:/i.test(text) && currentLanguage === "id") {
        line.textContent = text.replace(/^Address:/i, "Alamat:");
      }
    });

    setSelectorText(".footer-brand-subline", "Where every petal is a little more marvelous.", scope);
  }

  function translateIndexPage() {
    setDocumentMeta("home");
    const seasonalPromoLink = document.querySelector(".collection-promo-link");
    const seasonalKicker = document.getElementById("featured-kicker");
    const seasonalTitle = document.getElementById("featured-title");
    const seasonalLead = document.getElementById("featured-lead");
    const preserveSeasonalContent = [
      seasonalPromoLink,
      seasonalKicker,
      seasonalTitle,
      seasonalLead
    ].some((node) => node instanceof HTMLElement && node.dataset.seasonalManaged === "true");

    if (!preserveSeasonalContent) {
      setSelectorText(".collection-promo-link", t("Collections - Explore the arrangements", "Koleksi - Jelajahi rangkaian"));
      setSelectorText("#featured-kicker", t("Seasonal Collection", "Koleksi Musiman"));
      setSelectorText("#featured-title", t("Collections", "Koleksi"));
      setSelectorText("#featured-lead", t("Each arrangement is custom-made. Final details and pricing are confirmed during consultation.", "Setiap rangkaian dibuat khusus. Detail akhir dan harga dikonfirmasi saat konsultasi."));
    }
    setSelectorText(".home-hero-link", t("Discover the Collection", "Jelajahi Koleksi"));
    setSelectorText(".home-quote-cta", t("View the creations", "Lihat karya kami"));
    setSelectorText("#portfolio-kicker", t("Portfolio", "Portofolio"));
    setSelectorText("#portfolio-heading", t("Explore a Selection of Our Creations", "Jelajahi Pilihan dari Kreasi Kami"));
    setSelectorText("#portfolio-lead", t("A broader view of our work across categories and occasions.", "Tinjauan yang lebih luas atas karya kami di berbagai kategori dan momen."));
    setSelectorText("#portfolio-request-note", t("Looking for something else?", "Mencari sesuatu yang lain?"));
    setSelectorText("#portfolio-request-btn", t("Request a custom arrangement", "Ajukan rangkaian kustom"));

    Array.from(document.querySelectorAll(".portfolio-card")).forEach((card) => {
      const href = card.getAttribute("href") || "";
      if (!href.includes("gallery.html?category=")) return;
      const category = new URL(card.href, window.location.href).searchParams.get("category") || "";
      const label = card.querySelector(".portfolio-title");
      setText(label, localizeCategory(category));
    });

    setSelectorText(".about-kicker-mini", t("OUR STORY", "CERITA KAMI"));
    setSelectorText(".about-kicker", t("Discover Our Story", "Kenali Cerita Kami"));
    setSelectorText(".about-tap-instruction", t("Tap on the man, the woman, or the bush to discover each story.", "Pilih pria, wanita, atau semak untuk melihat melihat kisah kami."));
    setSelectorHtml('[data-bio="fg2"]', currentLanguage === "id"
      ? '<h3>Perjalanan Kami</h3><p>Marvell Florist dimulai sebagai usaha keluarga pada tahun 2006. Kami terus berkembang lewat berbagai renovasi, perpindahan lokasi, dan pengalaman yang kami jalani dari waktu ke waktu.</p><p>Hari ini, Marvell Florist menjadi tempat yang banyak dipilih untuk berbagai momen, mulai dari perayaan, belasungkawa, sampai kebutuhan sehari-hari. Bagi kami, bunga adalah cara sederhana untuk menyampaikan makna, dan itu yang terus kami pegang sampai sekarang.</p>'
      : '<h3>Our Journey</h3><p>Marvell Florist began as a family business in 2006. Over the years the shop has grown slowly, shaped by renovation, relocation, and the steady rhythm of everyday work. Each stage brought new experience and helped refine the way we approach floristry today.</p><p>What began as a small local florist gradually became a place people return to for meaningful moments. Through birthdays, celebrations, condolences, and quiet gestures, flowers continue to connect us with the people around us.</p>');
    setSelectorHtml('[data-bio="fg3"]', currentLanguage === "id"
      ? '<h3>Karya Kami</h3><p>Sebagian besar rangkaian di Marvell Florist dibuat khusus untuk setiap pelanggan. Kami fokus pada warna, bentuk, dan keseimbangan supaya setiap buket terlihat rapi dan terasa pas.</p><p>Pengalaman dan pelatihan yang kami jalani membentuk cara kami bekerja sampai hari ini. Setiap rangkaian disusun dengan teliti agar hasil akhirnya terasa utuh dan bermakna.</p>'
      : '<h3>Craft &amp; Arrangement</h3><p>Most arrangements at Marvell Florist are designed specifically for each customer. Rather than following fixed templates, we focus on balance, color, and movement so that every bouquet feels natural and intentional.</p><p>Years of experience in floristry, along with professional training both locally and abroad, shape the way we approach each piece. Every arrangement is assembled stem by stem, carefully considering how each element contributes to the whole.</p>');
    setSelectorHtml('[data-bio="fg1"]', currentLanguage === "id"
      ? '<h3>Tim Kami</h3><p>Marvell Florist dijalankan oleh tim kecil yang sudah berpengalaman dan bekerja bersama selama bertahun-tahun. Beberapa anggota tim sudah bersama kami sejak lama, jadi cara kerja dan kualitasnya tetap konsisten.</p><p>Setiap rangkaian disiapkan dengan perhatian, supaya bunga yang diterima terasa tulus, rapi, dan enak dilihat.</p>'
      : '<h3>The People Behind Marvell Florist</h3><p>Marvell Florist is run by a small and experienced team who have worked together for many years. The familiarity within the team allows each arrangement to be completed with care and efficiency.</p><p>Our florist has spent years developing his craft, and the shop continues to operate with the same values it began with: consistency, honesty, and respect for the customer\'s trust. When something does not meet expectations, we believe in making it right.</p>');
    setSelectorText(".about-caption", t("Since 2006, Marvell Florist has crafted floral arrangements guided by balance, detail, and the quiet beauty of nature.", "Sejak 2006, Marvell Florist merangkai bunga dengan keseimbangan, detail, dan keindahan alam yang tenang."));
    setSelectorText(".about-discover-link", t("Discover our collection \u2192", "Lihat koleksi kami \u2192"));

    setSelectorText(".contact-title-strong", t("Our Services", "Layanan Kami"));
    setSelectorText(".contact-title-mobile", t("Our Services", "Layanan Kami"));
    setSelectorText(".contact-slogan", t("Consultation-led services shaped for custom arrangements, delivery, and pickup.", "Layanan berbasis konsultasi untuk rangkaian kustom, pengiriman, dan pickup."));

    Array.from(document.querySelectorAll("#services .service-kicker")).forEach((node) => {
      setText(node, t("Service", "Layanan"));
    });

    const serviceCards = Array.from(document.querySelectorAll("#services .service-card"));
    if (serviceCards[0] instanceof HTMLElement) {
      setSelectorText(".service-title", t("Consultation", "Konsultasi"), serviceCards[0]);
      setSelectorText(".service-desc", t("Most orders begin with a conversation. We discuss the occasion, tone, scale, timing, and budget before anything is prepared.", "Sebagian besar pesanan dimulai dari percakapan. Kami membahas momen, nuansa, skala, waktu, dan anggaran sebelum apa pun disiapkan."), serviceCards[0]);
      setSelectorText(".service-link", t("Start Consultation", "Mulai Konsultasi"), serviceCards[0]);
    }
    if (serviceCards[1] instanceof HTMLElement) {
      setSelectorText(".service-title", t("Custom Arrangements", "Rangkaian Kustom"), serviceCards[1]);
      setSelectorText(".service-desc", t("Some requests begin with references, others begin with only the moment. We shape the final arrangement around color, scale, wrapping, and mood.", "Sebagian permintaan dimulai dari referensi, sebagian lainnya hanya dari momennya. Kami membentuk rangkaian akhir berdasarkan warna, skala, wrapping, dan suasana yang diinginkan."), serviceCards[1]);
      setSelectorText(".service-link", t("View Custom Work", "Lihat Karya Kustom"), serviceCards[1]);
    }
    if (serviceCards[2] instanceof HTMLElement) {
      setSelectorText(".service-title", t("Delivery & Pickup", "Pengiriman & Pickup"), serviceCards[2]);
      setSelectorText(".service-desc", t("We coordinate timing, handover, and handling after consultation so delivery or collection stays aligned with the request.", "Kami mengatur waktu, penyerahan, dan penanganan setelah konsultasi agar pengiriman maupun pengambilan tetap sesuai dengan kebutuhan pesanan."), serviceCards[2]);
      setSelectorText(".service-link", t("See Delivery Options", "Lihat Opsi Pengiriman"), serviceCards[2]);
    }

    setSelectorText(".reviews-rating-line", currentLanguage === "id"
      ? "5.0 Rating Rata-Rata"
      : "5.0 Average Rating");
    setSelectorText(".reviews-slogan", t("Real reviews from customers who trust Marvell Florist with their important moments.", "Ulasan nyata dari pelanggan yang mempercayakan momen mereka kepada Marvell Florist."));
    setSelectorText(".reviews-cta", t("Write a Review on Google", "Tulis Ulasan di Google"));

    translateSearchUi();
    translateFooter(document);
  }

  function translateSearchUi() {
    const searchInput = document.getElementById("search-input");
    if (searchInput instanceof HTMLInputElement) {
      searchInput.placeholder = t("Search bouquets, seasonal collections, and more", "Cari buket, koleksi musiman, dan lainnya");
    }
    setSelectorText("#search-clear-btn", t("Clear", "Hapus"));
    const productsTab = document.getElementById("search-query-tab-products");
    if (productsTab instanceof HTMLElement) {
      const countMatch = (productsTab.textContent || "").match(/\((\d+)\)/);
      const count = countMatch ? countMatch[1] : "0";
      productsTab.textContent = `${t("Products", "Produk")} (${count})`;
    }
    setSelectorText("#search-query-filter .search-query-filter-label", t("Filter", "Filter"));
    setSelectorText("#search-keywords-heading", t("Related Searches", "Pencarian Terkait"));
    setSelectorText("#search-products-heading", t("Recommended Products", "Produk Rekomendasi"));
    const featuredHeading = document.getElementById("search-featured-heading");
    if (featuredHeading instanceof HTMLElement) {
      const raw = featuredHeading.textContent || "";
      if (featuredHeading.dataset.seasonalManaged === "true") {
        featuredHeading.textContent = localizeSeasonalCollectionLabel(featuredHeading.dataset.seasonalLabel || raw);
      }
      if (featuredHeading.dataset.seasonalManaged !== "true" && !raw.trim()) {
        featuredHeading.textContent = t("Featured Collection", "Koleksi Pilihan");
      }
    }
    const searchSupport = document.querySelector(".search-support-note");
    if (searchSupport instanceof HTMLElement) {
      searchSupport.innerHTML = currentLanguage === "id"
        ? 'Untuk info lebih lanjut, hubungi kami di <a href="https://wa.me/6281275017456" target="_blank" rel="noopener noreferrer">WhatsApp</a>.'
        : 'For more information, contact us on <a href="https://wa.me/6281275017456" target="_blank" rel="noopener noreferrer">WhatsApp</a>.';
    }
    setSelectorText(".search-faq-link", t("FAQ", "FAQ"));
  }

  function translateAboutPage() {
    setDocumentMeta("about");
    setSelectorText(".search-label", t("Search", "Cari"));
    setSelectorText("#about-hero-kicker", t("About Marvell Florist", "Tentang Marvell Florist"));
    setSelectorText("#about-hero-title", t("About Marvell Florist", "Tentang Marvell Florist"));
    setSelectorText("#about-hero-subtitle", t("Rooted in thoughtful composition and restrained elegance, Marvell Florist approaches floral design as an experience. Layers of tone, movement, and texture are carefully assembled, allowing fresh, preserved, and artificial blooms to coexist in quiet harmony. From intimate bouquets to large-scale arrangements, each piece is tailored to its moment, reflecting the sentiment behind the gesture while maintaining a consistent language of softness, balance, and understated refinement.", "Marvell Florist berakar pada komposisi yang dipikirkan dengan saksama dan keanggunan yang tertahan, memandang desain floral sebagai sebuah pengalaman. Lapisan warna, gerak, dan tekstur dirangkai dengan hati-hati, memungkinkan bunga segar, preserved, dan artifisial hadir bersama dalam harmoni yang tenang. Dari buket yang intim hingga rangkaian berskala besar, setiap karya disesuaikan dengan momennya, mencerminkan perasaan di balik gestur tersebut sambil menjaga bahasa visual yang lembut, seimbang, dan anggun secara halus."));

    setSelectorText("#about-foundation-kicker", t("A family foundation", "Awal mula keluarga"));
    setSelectorText("#about-foundation-title", t("Since 2006, a family florist shaped by patience, change, and continuity.", "Sejak 2006, toko bunga keluarga yang dibentuk oleh kesabaran, perubahan, dan kesinambungan."));
    setSelectorText("#about-foundation-copy-1", t("Marvell Florist began as a family business in 2006. The name itself came from the founder's first-born child, and that sense of love has remained part of the brand from the beginning. Over time, the store has grown through relocation, renovation, and the quiet work of learning what customers need from flowers in real life.", "Marvell Florist dimulai sebagai usaha keluarga pada tahun 2006. Nama Marvell sendiri berasal dari anak pertama dari pendirinya, dan rasa kasih itu sudah menjadi bagian dari merek ini sejak awal. Seiring waktu, toko ini bertumbuh melalui perpindahan lokasi, renovasi, dan proses belajar yang tenang tentang apa yang benar-benar dibutuhkan pelanggan dari bunga dalam kehidupan sehari-hari."));
    setSelectorText("#about-foundation-copy-2", t("What has remained constant is the way arrangements are approached: with patience, consistency, and respect for the meaning they are meant to carry. That same affection behind the name continues to translate into the work itself, in pieces made to feel personal, considered, and lasting.", "Yang tetap sama adalah cara setiap rangkaian didekati: dengan kesabaran, konsistensi, dan penghormatan pada makna yang ingin disampaikan. Kasih yang menjadi asal nama itu juga terus diterjemahkan ke dalam karya, lewat rangkaian yang terasa personal, dipikirkan dengan matang, dan dibuat untuk meninggalkan kesan yang bertahan."));

    setSelectorText("#about-everyday-kicker", t("A florist shaped by everyday moments", "Toko bunga yang dibentuk oleh momen sehari-hari"));
    setSelectorText("#about-everyday-title", t("Celebrations, condolences, and the quieter gestures in between.", "Perayaan, belasungkawa, dan gestur yang lebih sunyi di antaranya."));
    setSelectorText("#about-everyday-copy-1", t("The work at Marvell moves between ceremony and daily life: bouquets for graduation and birthdays, standing flowers for openings and condolences, parcels, table pieces, and arrangements prepared simply because someone wishes to send something thoughtful.", "Pekerjaan di Marvell bergerak antara upacara dan kehidupan sehari-hari: buket untuk wisuda dan ulang tahun, standing flower untuk pembukaan dan belasungkawa, parcel, rangkaian meja, dan pesanan yang dibuat hanya karena seseorang ingin mengirim sesuatu yang berarti."));
    setSelectorText("#about-everyday-copy-2", t("People return not because every order follows a fixed formula, but because the store understands that flowers often speak in place of words. That role in Batam’s everyday life is what gives the work its real continuity.", "Orang-orang kembali bukan karena setiap pesanan mengikuti formula yang tetap, melainkan karena toko ini memahami bahwa bunga sering berbicara menggantikan kata-kata. Peran itulah yang membuat Marvell tetap dekat dengan keseharian Batam."));

    setSelectorText("#about-philosophy-kicker", t("Form, colour, and composition", "Bentuk, warna, dan komposisi"));
    setSelectorText("#about-philosophy-title", t("Crafted with balance and intention.", "Dirangkai dengan keseimbangan dan niat."));
    setSelectorText("#about-philosophy-copy-1", t("Custom work sits at the centre of the practice. Rather than relying only on fixed templates, arrangements are shaped through proportion, movement, colour, and the mood of the occasion.", "Pekerjaan kustom berada di pusat cara kami berkarya. Alih-alih hanya mengandalkan template tetap, setiap rangkaian dibentuk melalui proporsi, gerak, warna, dan suasana dari momennya."));
    setSelectorText("#about-philosophy-copy-2", t("Years of experience and training continue to inform how each stem is placed, how each palette is softened, and how a piece comes together as a whole. The result is not just variety, but a recognisable sense of balance.", "Pengalaman dan pelatihan terus membentuk cara setiap tangkai ditempatkan, bagaimana palet warna dilembutkan, dan bagaimana keseluruhan rangkaian terasa utuh. Hasilnya bukan sekadar variasi, tetapi rasa keseimbangan yang mudah dikenali."));
    setSelectorText("#about-philosophy-label-1", t("Bouquets", "Buket"));
    setSelectorText("#about-philosophy-label-2", t("Standing flowers", "Standing flower"));
    setSelectorText("#about-philosophy-label-3", t("Flower boards", "Papan bunga"));
    setSelectorText("#about-philosophy-label-4", t("Parcels", "Parcel"));
    setSelectorText("#about-philosophy-label-5", t("Artificial flowers", "Bunga artifisial"));

    setSelectorText("#about-team-kicker", t("Craft, care, and the people behind it", "Karya, perhatian, dan orang-orang di baliknya"));
    setSelectorText("#about-team-title", t("A team shaped by experience.", "Tim yang dibentuk oleh pengalaman."));
    setSelectorText("#about-team-copy-1", t("Marvell is supported by a small team whose familiarity shows in the work. Some have been part of the store for years, and that consistency matters. It means orders are handled with attention, preparation feels steady rather than rushed, and customers receive arrangements that feel considered.", "Marvell didukung oleh tim kecil yang kedekatannya terasa dalam hasil kerja. Beberapa telah menjadi bagian dari toko selama bertahun-tahun, dan konsistensi itu penting. Artinya pesanan ditangani dengan perhatian, persiapan terasa mantap, dan pelanggan menerima rangkaian yang benar-benar dipikirkan."));
    setSelectorText("#about-team-copy-2", t("Behind each finished piece is a sequence of practical gestures: preparing stems, checking materials, wrapping, adjusting colour, and refining proportion. Care comes not from scale, but from people who know the rhythm of the store well.", "Di balik setiap rangkaian jadi ada rangkaian gestur yang praktis: menyiapkan batang, memeriksa material, membungkus, menyesuaikan warna, dan menyempurnakan proporsi. Perhatian itu hadir bukan karena skala yang besar, tetapi karena orang-orang yang memahami ritme toko dengan baik."));

    setSelectorText("#about-batam-kicker", t("Rooted in Batam", "Berakar di Batam"));
    setSelectorText("#about-batam-title", t("From our store in Batam.", "Dari toko kami di Batam."));
    setSelectorText("#about-batam-copy-1", t("Marvell remains grounded in the city it serves. Customers can visit the store, consult through WhatsApp, arrange collection, or coordinate local delivery depending on the occasion. The experience is personal and direct, shaped by conversation rather than a distant checkout flow.", "Marvell tetap berakar pada kota yang dilayaninya. Pelanggan dapat datang ke toko, berkonsultasi melalui WhatsApp, mengatur pengambilan, atau mengoordinasikan pengiriman lokal sesuai kebutuhan momennya. Pengalamannya bersifat personal dan langsung, dibentuk oleh percakapan, bukan alur checkout yang terasa jauh."));
    setSelectorText("#about-batam-copy-2", t("That local presence matters. It means arrangements are made with knowledge of the people, events, and everyday rhythms of Batam, while still leaving room for each order to feel individual.", "Kehadiran lokal itu penting. Artinya setiap rangkaian dibuat dengan pemahaman tentang orang-orang, acara, dan ritme sehari-hari di Batam, sambil tetap memberi ruang agar setiap pesanan terasa individual."));

    setSelectorText("#about-signature-kicker", t("The final note", "Nada penutup"));
    setSelectorText("#about-signature-title", t("The quieter image behind Marvell.", "Gambaran yang lebih sunyi di balik Marvell."));
    setSelectorText("#about-signature-copy", t("Beyond the practical work of stems, ribbons, deliveries, and timing, Marvell is also shaped by memory, atmosphere, and the gentle drama that flowers can hold. This final section gathers those quieter ideas into one place.", "Di luar pekerjaan praktis seperti batang, pita, pengiriman, dan waktu, Marvell juga dibentuk oleh ingatan, suasana, dan drama lembut yang dapat dibawa oleh bunga. Bagian terakhir ini mengumpulkan gagasan-gagasan yang lebih tenang itu ke dalam satu ruang."));
    setSelectorText("#signature-instruction", t("Hover or tap the figures to reveal each story.", "Arahkan kursor atau ketuk figur untuk membuka tiap kisah."));
    setSelectorText("#signature-card-title-journey", t("The years that shaped us", "Tahun-tahun yang membentuk kami"));
    setSelectorText("#signature-card-copy-journey-1", t("Marvell grew through ordinary changes rather than sudden scale: moving spaces, renovating, learning, and continuing to show up for customers through different seasons of the city.", "Marvell tumbuh lewat perubahan-perubahan yang biasa, bukan ledakan yang besar: berpindah ruang, merenovasi, belajar, dan terus hadir untuk pelanggan melalui musim-musim kota yang berbeda."));
    setSelectorText("#signature-card-copy-journey-2", t("That slow continuity is part of the brand’s character. It gives the store a sense of familiarity that customers can feel, even when each order is made for a different moment.", "Kesinambungan yang lambat itu menjadi bagian dari karakter merek ini. Di situlah rasa akrab itu muncul, bahkan ketika setiap pesanan dibuat untuk momen yang berbeda."));
    setSelectorText("#signature-card-title-craft", t("The way we compose", "Cara kami menyusun"));
    setSelectorText("#signature-card-copy-craft-1", t("Every arrangement asks for judgement: how much softness to leave in a colour story, how much movement to give a bouquet, how to make a formal piece feel dignified without becoming stiff.", "Setiap rangkaian membutuhkan pertimbangan: seberapa lembut sebuah palet warna perlu ditahan, seberapa banyak gerak yang dibutuhkan buket, dan bagaimana sebuah karya formal tetap terasa anggun tanpa menjadi kaku."));
    setSelectorText("#signature-card-copy-craft-2", t("That is where composition matters most. Flowers are not only selected; they are arranged so the whole carries a mood that feels settled, balanced, and alive.", "Di situlah komposisi menjadi penting. Bunga tidak hanya dipilih; bunga disusun agar keseluruhannya membawa suasana yang terasa tenang, seimbang, dan hidup."));
    setSelectorText("#signature-card-title-team", t("The people who keep it personal", "Orang-orang yang membuatnya tetap personal"));
    setSelectorText("#signature-card-copy-team-1", t("Customers do not only remember the flowers. They remember the feeling of being guided, listened to, and helped with care, especially when the order carries emotional weight.", "Pelanggan tidak hanya mengingat bunganya. Mereka mengingat rasa dibimbing, didengarkan, dan dibantu dengan perhatian, terutama ketika pesanannya membawa beban emosional."));
    setSelectorText("#signature-card-copy-team-2", t("That human attention remains one of Marvell’s most important qualities. It is what keeps the store from feeling anonymous, even as the work continues to evolve.", "Perhatian manusiawi itu tetap menjadi salah satu kualitas terpenting Marvell. Itulah yang membuat toko ini tidak pernah terasa anonim, bahkan ketika pekerjaannya terus berkembang."));
    translateFooter(document);
  }

  function ensureLegalCluster(activePage) {
    const main = document.querySelector("main");
    if (!(main instanceof HTMLElement)) return;
    let cluster = main.querySelector(".legal-suite");
    if (!(cluster instanceof HTMLElement)) {
      cluster = document.createElement("section");
      cluster.className = "legal-suite";
      main.prepend(cluster);
    }
    const faqHref = buildLocalizedHref("faq.html", currentLanguage);
    const privacyHref = buildLocalizedHref("privacy-policy.html", currentLanguage);
    const termsHref = buildLocalizedHref("terms-conditions.html", currentLanguage);
    const contactHref = buildLocalizedHref("contact.html", currentLanguage);
    cluster.innerHTML = `
      <p class="legal-suite-label">${t("Customer Information", "Informasi Pelanggan")}</p>
      <nav class="legal-suite-nav" aria-label="${t("Customer information pages", "Halaman informasi pelanggan")}">
        <a class="legal-suite-link ${activePage === "faq" ? "is-active" : ""}" href="${faqHref}" onclick="return window.MarvellLegalNav ? window.MarvellLegalNav.go(this.href, event) : true;">${t("FAQ", "FAQ")}</a>
        <a class="legal-suite-link ${activePage === "privacy" ? "is-active" : ""}" href="${privacyHref}" onclick="return window.MarvellLegalNav ? window.MarvellLegalNav.go(this.href, event) : true;">${t("Privacy", "Privasi")}</a>
        <a class="legal-suite-link ${activePage === "terms" ? "is-active" : ""}" href="${termsHref}" onclick="return window.MarvellLegalNav ? window.MarvellLegalNav.go(this.href, event) : true;">${t("Terms", "Ketentuan")}</a>
        <a class="legal-suite-link ${activePage === "contact" ? "is-active" : ""}" href="${contactHref}" onclick="return window.MarvellLegalNav ? window.MarvellLegalNav.go(this.href, event) : true;">${t("Contact", "Kontak")}</a>
      </nav>
    `;
  }

  let legalNavigationBound = false;
  function scrollToLegalTarget(targetId, attempt = 0) {
    const section = document.getElementById(targetId);
    if (!(section instanceof HTMLElement)) {
      if (attempt < 8) {
        window.setTimeout(() => scrollToLegalTarget(targetId, attempt + 1), 80);
        return;
      }
      window.location.hash = `#${targetId}`;
      return;
    }
    const top = Math.max(0, section.getBoundingClientRect().top + window.scrollY - 96);
    if (window.location.hash !== `#${targetId}`) {
      window.history.replaceState(null, "", `#${targetId}`);
    }
    window.scrollTo({ top, behavior: "smooth" });
  }

  function bindLegalNavigation() {
    if (legalNavigationBound) return;
    legalNavigationBound = true;

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest(".legal-suite-link, .legal-toc-link");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const href = link.getAttribute("href") || "";
      if (!href) return;

      if (href.startsWith("#")) {
        const targetId = href.slice(1);
        event.preventDefault();
        scrollToLegalTarget(targetId);
        return;
      }

      const destination = new URL(link.href, window.location.href);
      if (
        destination.origin === window.location.origin
        && destination.pathname === window.location.pathname
        && destination.hash
      ) {
        event.preventDefault();
        scrollToLegalTarget(destination.hash.slice(1));
        return;
      }
      if (destination.href === window.location.href) return;
      event.preventDefault();
      window.location.assign(destination.href);
    }, true);
  }

  function renderLegalRichPage(config) {
    const page = document.querySelector(".legal-page");
    if (!(page instanceof HTMLElement)) return false;
    const title = page.querySelector(".legal-intro h1");
    const lead = page.querySelector(".legal-intro .lead");
    const content = page.querySelector(".legal-content");
    const toc = page.querySelector(".legal-toc");
    const tocLabel = page.querySelector(".legal-toc-label");
    const tocNav = page.querySelector(".legal-toc-nav");
    if (!(title instanceof HTMLElement) || !(lead instanceof HTMLElement) || !(content instanceof HTMLElement) || !(toc instanceof HTMLElement) || !(tocLabel instanceof HTMLElement) || !(tocNav instanceof HTMLElement)) {
      return false;
    }
    setText(title, config.title);
    setText(lead, config.lead);
    content.innerHTML = `
      <section class="legal-summary" aria-label="${config.summaryAria}">
        <p>${config.summary}</p>
      </section>
      ${config.sections.map((section, index) => `
        <section class="legal-card" id="${section.id}">
          <div class="legal-card-head">
            <p class="legal-card-index">${String(index + 1).padStart(2, "0")}</p>
            <h2 class="legal-card-title">${section.title}</h2>
          </div>
          <div class="legal-card-body">
            ${(section.paragraphs || []).map((paragraph) => `<p>${paragraph}</p>`).join("")}
            ${section.list && section.list.length ? `<ul>${section.list.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
          </div>
        </section>
      `).join("")}
    `;
    toc.setAttribute("aria-label", config.tocAria);
    setText(tocLabel, config.tocLabel);
    tocNav.innerHTML = config.sections.map((section, index) => `
      <a class="legal-toc-link" href="#${section.id}" onclick="return window.MarvellLegalNav ? window.MarvellLegalNav.jump('${section.id}', event) : true;">${String(index + 1).padStart(2, "0")}. ${section.tocTitle || section.title}</a>
    `).join("");
    return true;
  }

  function translateFaqPage() {
    setDocumentMeta("faq");
    ensureLegalCluster("faq");
    bindLegalNavigation();
    if (renderLegalRichPage({
      title: t("Frequently Asked Questions", "Pertanyaan yang Sering Diajukan"),
      lead: t(
        "Short answers to the questions customers usually ask before placing an order, arranging delivery, or requesting something custom.",
        "Jawaban singkat untuk hal-hal yang paling sering ditanyakan sebelum memesan, mengatur pengiriman, atau meminta sesuatu yang lebih personal."
      ),
      summary: t(
        "Every Marvell order begins with a conversation. These notes are here to make the process easier to understand before you message us.",
        "Setiap pesanan di Marvell dimulai dari percakapan. Catatan ini dibuat agar prosesnya terasa lebih jelas sebelum Anda menghubungi kami."
      ),
      summaryAria: t("FAQ summary", "Ringkasan FAQ"),
      tocAria: t("FAQ contents", "Daftar isi FAQ"),
      tocLabel: t("Contents", "Daftar Isi"),
      sections: currentLanguage === "id"
        ? [
            {
              id: "faq-01",
              title: "Bagaimana pesanan dimulai?",
              tocTitle: "Bagaimana pesanan dimulai",
              paragraphs: [
                "Pesanan dimulai melalui konsultasi, biasanya lewat WhatsApp. Kami akan mengonfirmasi momen, jenis rangkaian, referensi, waktu, perkiraan harga, dan detail pengiriman sebelum apa pun disiapkan."
              ]
            },
            {
              id: "faq-02",
              title: "Seberapa cepat rangkaian bisa disiapkan?",
              tocTitle: "Waktu persiapan",
              paragraphs: [
                "Waktu persiapan bergantung pada jenis rangkaian. Karya yang lebih sederhana sering kali dapat disiapkan lebih cepat, sementara pekerjaan yang lebih besar atau rinci membutuhkan waktu tambahan.",
                "Permintaan mendesak tetap kami tinjau per kasus."
              ]
            },
            {
              id: "faq-03",
              title: "Apakah tersedia pengiriman di hari yang sama?",
              tocTitle: "Pengiriman hari yang sama",
              paragraphs: [
                "Ya, pengiriman di hari yang sama bisa saja memungkinkan di Batam tergantung desain, ketersediaan bunga, waktu kurir, dan seberapa cepat permintaannya masuk."
              ]
            },
            {
              id: "faq-04",
              title: "Bisakah saya meminta desain kustom atau mengirim referensi?",
              tocTitle: "Permintaan kustom",
              paragraphs: [
                "Bisa. Anda dapat mengirim gambar inspirasi, warna yang diinginkan, atau arahan gaya. Pekerjaan kustom adalah bagian dari proses dan akan dikonfirmasi melalui konsultasi."
              ]
            },
            {
              id: "faq-05",
              title: "Apakah hasilnya akan sama persis dengan referensi?",
              tocTitle: "Kesesuaian referensi",
              paragraphs: [
                "Tidak sepenuhnya sama. Setiap rangkaian dibuat dengan tangan, dan ketersediaan bunga berubah mengikuti musim, stok, dan kondisi material. Jika perlu ada substitusi, karakter keseluruhan dan kualitas karya tetap kami jaga."
              ]
            },
            {
              id: "faq-06",
              title: "Bagaimana sistem pembayarannya?",
              tocTitle: "Pembayaran",
              paragraphs: [
                "Pembayaran diatur setelah konsultasi dan diperlukan sebelum pesanan dikonfirmasi. Website ini tidak menggunakan checkout mandiri, jadi produksi baru dimulai setelah detail pesanan disetujui dan pembayaran diterima."
              ]
            },
            {
              id: "faq-07",
              title: "Bisakah pesanan diubah atau dibatalkan?",
              tocTitle: "Perubahan dan pembatalan",
              paragraphs: [
                "Perubahan biasanya masih memungkinkan sebelum produksi dimulai. Pembatalan umumnya hanya bisa dilakukan sebelum tahap persiapan berjalan, tergantung posisi pesanannya."
              ]
            },
            {
              id: "faq-08",
              title: "Bagaimana cara menghubungi Marvell Florist?",
              tocTitle: "Kontak",
              paragraphs: [
                "WhatsApp adalah cara tercepat untuk memulai. Anda juga dapat menghubungi kami melalui Instagram atau email untuk pertanyaan lanjutan."
              ],
              list: [
                "WhatsApp: +62 812 7501 7456",
                "Email: floristmarvell@gmail.com"
              ]
            }
          ]
        : [
            {
              id: "faq-01",
              title: "How do orders begin?",
              tocTitle: "How orders begin",
              paragraphs: [
                "Orders begin through consultation, usually on WhatsApp. We confirm the occasion, arrangement type, reference, timing, approximate pricing, and delivery details before anything is prepared."
              ]
            },
            {
              id: "faq-02",
              title: "How quickly can an arrangement be prepared?",
              tocTitle: "Preparation timing",
              paragraphs: [
                "Preparation time depends on the type of arrangement. Simpler pieces can often be prepared quickly, while larger or more detailed work needs more time.",
                "Urgent requests are reviewed case by case."
              ]
            },
            {
              id: "faq-03",
              title: "Do you offer same-day delivery?",
              tocTitle: "Same-day delivery",
              paragraphs: [
                "Yes, same-day delivery may be possible in Batam depending on the design, flower availability, courier timing, and how soon the request comes in."
              ]
            },
            {
              id: "faq-04",
              title: "Can I request a custom design or send a reference?",
              tocTitle: "Custom requests",
              paragraphs: [
                "Yes. Customers may send inspiration images, preferred colors, or style directions. Custom work is part of the process and is confirmed through consultation."
              ]
            },
            {
              id: "faq-05",
              title: "Will the flowers match the reference exactly?",
              tocTitle: "Reference accuracy",
              paragraphs: [
                "Not exactly. Each arrangement is made by hand, and availability changes with season, stock, and material conditions. When substitutions are needed, we keep the overall character and quality of the arrangement."
              ]
            },
            {
              id: "faq-06",
              title: "How is payment handled?",
              tocTitle: "Payment",
              paragraphs: [
                "Payment is arranged after consultation and is required before the order is confirmed. The website does not use a self-serve checkout, so production only begins after the order has been approved and payment has been received."
              ]
            },
            {
              id: "faq-07",
              title: "Can I change or cancel an order?",
              tocTitle: "Changes and cancellations",
              paragraphs: [
                "Changes may be possible before production starts. Cancellations are usually only possible before preparation begins, depending on the stage of the order."
              ]
            },
            {
              id: "faq-08",
              title: "How do I contact Marvell Florist?",
              tocTitle: "Contact",
              paragraphs: [
                "WhatsApp is the fastest way to begin. You can also reach us through Instagram or email for follow-up questions."
              ],
              list: [
                "WhatsApp: +62 812 7501 7456",
                "Email: floristmarvell@gmail.com"
              ]
            }
          ]
    })) return;
    setSelectorText("main h1", t("Frequently Asked Questions", "Pertanyaan yang Sering Diajukan"));
    setSelectorText("main .lead", t("Find quick answers to the questions customers ask most often before placing an order.", "Temukan jawaban singkat untuk pertanyaan yang paling sering diajukan sebelum melakukan pemesanan."));
    const wrap = document.getElementById("faq-wrap");
    if (!(wrap instanceof HTMLElement)) return;
    const items = FAQ_ITEMS[currentLanguage];
    const shouldRenderFaq = wrap.dataset.faqRenderedLanguage !== currentLanguage || !wrap.querySelector(".faq-item");
    if (shouldRenderFaq) {
      wrap.innerHTML = items.map((item, index) => `
        <article class="faq-item" id="faq-item-${index + 1}" data-faq-index="${index + 1}">
          <button class="faq-toggle" type="button" aria-expanded="false">
            <strong>${item.question}</strong>
            <span class="faq-icon" aria-hidden="true">+</span>
          </button>
          <div class="faq-panel">
            <p class="faq-content">${item.answer}</p>
          </div>
        </article>
      `).join("");
      wrap.dataset.faqRenderedLanguage = currentLanguage;
    }
    const getFaqItems = () => Array.from(wrap.querySelectorAll(".faq-item"));
    const buildFaqStateUrl = (itemIndex = null) => {
      const params = new URLSearchParams(window.location.search || "");
      params.delete("open");
      const query = params.toString();
      const hash = Number.isInteger(itemIndex) && itemIndex >= 0 ? `#faq-item-${itemIndex + 1}` : "";
      return `${window.location.pathname}${query ? `?${query}` : ""}${hash}`;
    };
    const closeAllFaqItems = () => {
      const faqItems = getFaqItems();
      faqItems.forEach((item) => {
        item.classList.remove("is-open");
        const toggle = item.querySelector(".faq-toggle");
        const panel = item.querySelector(".faq-panel");
        if (toggle instanceof HTMLButtonElement) toggle.setAttribute("aria-expanded", "false");
        if (panel instanceof HTMLElement) panel.style.maxHeight = "0px";
      });
    };
    const openFaqItem = (targetIndex, shouldScroll = true) => {
      const faqItems = getFaqItems();
      const targetItem = faqItems[targetIndex];
      if (!(targetItem instanceof HTMLElement)) return;
      const targetToggle = targetItem.querySelector(".faq-toggle");
      const targetPanel = targetItem.querySelector(".faq-panel");
      if (!(targetToggle instanceof HTMLButtonElement) || !(targetPanel instanceof HTMLElement)) return;
      closeAllFaqItems();
      targetItem.classList.add("is-open");
      targetToggle.setAttribute("aria-expanded", "true");
      targetPanel.style.maxHeight = `${targetPanel.scrollHeight}px`;
      if (shouldScroll) {
        window.requestAnimationFrame(() => {
          const sharedHeader = document.querySelector("header");
          const headerOffset = sharedHeader instanceof HTMLElement ? sharedHeader.offsetHeight + 18 : 90;
          const targetTop = targetToggle.getBoundingClientRect().top + window.scrollY - headerOffset;
          window.scrollTo({
            top: Math.max(0, targetTop),
            behavior: "smooth"
          });
        });
      }
    };
    if (!wrap.dataset.faqBound) {
      wrap.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const toggle = target.closest(".faq-toggle");
        if (!(toggle instanceof HTMLButtonElement) || !wrap.contains(toggle)) return;
        const item = toggle.closest(".faq-item");
        if (!(item instanceof HTMLElement)) return;
        const currentFaqItems = Array.from(wrap.querySelectorAll(".faq-item"));
        const itemIndex = currentFaqItems.indexOf(item);
        if (itemIndex < 0) return;
        const shouldOpen = !item.classList.contains("is-open");
        if (!shouldOpen) {
          closeAllFaqItems();
          history.replaceState(null, "", buildFaqStateUrl());
          return;
        }
        openFaqItem(itemIndex, false);
        history.replaceState(null, "", buildFaqStateUrl(itemIndex));
      });
      wrap.dataset.faqBound = "true";
    }
    const searchParams = new URLSearchParams(window.location.search);
    const openParam = Number(searchParams.get("open"));
    const faqItems = getFaqItems();
    const hashMatch = window.location.hash.match(/faq-item-(\d+)/i);
    const targetIndex = Number.isInteger(openParam) && openParam >= 1 && openParam <= faqItems.length
      ? openParam - 1
      : (hashMatch ? Number(hashMatch[1]) - 1 : -1);
    if (Number.isInteger(targetIndex) && targetIndex >= 0 && targetIndex < faqItems.length) {
      const currentOpenIndex = faqItems.findIndex((item) => item.classList.contains("is-open"));
      if (currentOpenIndex !== targetIndex) {
        window.requestAnimationFrame(() => openFaqItem(targetIndex));
      }
    }
  }

  function translatePrivacyPage() {
    setDocumentMeta("privacy");
    ensureLegalCluster("privacy");
    bindLegalNavigation();
    if (renderLegalRichPage({
      title: t("Privacy Policy", "Kebijakan Privasi"),
      lead: t(
        "A clearer summary of what information may be collected, why it is used, how it is handled, and how customers can contact us about privacy-related requests.",
        "Ringkasan yang lebih jelas tentang informasi apa yang dapat dikumpulkan, mengapa digunakan, bagaimana ditangani, dan bagaimana Anda dapat menghubungi kami terkait privasi."
      ),
      summary: t(
        "At Marvell Florist, discretion is part of the experience. We only collect the information needed to guide each arrangement with care, precision, and personal attention.",
        "Di Marvell Florist, kerahasiaan adalah bagian dari pengalaman. Kami hanya mengumpulkan informasi yang diperlukan untuk menangani setiap rangkaian dengan perhatian, ketelitian, dan sentuhan personal."
      ),
      summaryAria: t("Privacy summary", "Ringkasan privasi"),
      tocAria: t("Privacy contents", "Daftar isi privasi"),
      tocLabel: t("Contents", "Daftar Isi"),
      sections: currentLanguage === "id"
        ? [
            {
              id: "privacy-01",
              title: "Gambaran umum",
              tocTitle: "Gambaran umum",
              paragraphs: [
                "Kebijakan ini menjelaskan bagaimana Marvell Florist menangani informasi pelanggan ketika Anda menelusuri website, menghubungi kami, atau melakukan pemesanan."
              ]
            },
            {
              id: "privacy-02",
              title: "Mengapa kami mengumpulkan informasi",
              tocTitle: "Mengapa kami mengumpulkan informasi",
              paragraphs: [
                "Informasi Anda membantu kami merespons dengan tepat, mengatur waktu dan pengiriman, mendukung konsultasi, membagikan pembaruan pesanan, dan memahami bagaimana website digunakan."
              ]
            },
            {
              id: "privacy-03",
              title: "Informasi yang dapat kami kumpulkan",
              tocTitle: "Informasi yang kami kumpulkan",
              paragraphs: [
                "Kami dapat mengumpulkan detail kontak seperti nama, nomor telepon, alamat email, atau preferensi komunikasi.",
                "Kami juga dapat mengumpulkan detail pesanan seperti jenis rangkaian, momen, catatan personalisasi, preferensi warna, informasi penerima, dan instruksi pengiriman.",
                "Saat Anda menelusuri website, data teknis seperti perangkat, browser, halaman yang dikunjungi, klik, dan pengaturan preferensi di perangkat juga dapat tersimpan atau tercatat.",
                "Ini mencakup preferensi yang disimpan di browser seperti bahasa, wishlist, penanda intro atau popup musiman, serta pengaturan tampilan tertentu."
              ]
            },
            {
              id: "privacy-04",
              title: "Bagaimana informasi dikumpulkan",
              tocTitle: "Bagaimana informasi dikumpulkan",
              paragraphs: [
                "Sebagian besar informasi pribadi diberikan langsung oleh Anda saat menghubungi kami, meminta konsultasi, atau melakukan pemesanan melalui WhatsApp, Instagram, atau saluran lain.",
                "Sebagian data teknis dikumpulkan secara otomatis melalui penyimpanan browser dan Google Analytics.",
                "Website ini juga mencatat interaksi tertentu, termasuk klik pada tautan WhatsApp, untuk memahami jalur kontak yang paling sering digunakan."
              ]
            },
            {
              id: "privacy-05",
              title: "Pembagian informasi",
              tocTitle: "Pembagian informasi",
              paragraphs: [
                "Kami tidak menjual informasi pribadi.",
                "Informasi hanya dapat dibagikan bila diperlukan untuk menyelesaikan atau mendukung pesanan Anda, misalnya kepada pihak pengiriman atau koordinasi acara atas permintaan Anda.",
                "Layanan pihak ketiga seperti WhatsApp, Instagram, penyedia email, Google Analytics, Shopee, atau Tokopedia dapat memproses informasi sesuai kebijakan mereka sendiri saat Anda menggunakan layanan tersebut."
              ]
            },
            {
              id: "privacy-06",
              title: "Penyimpanan dan retensi",
              tocTitle: "Penyimpanan dan retensi",
              paragraphs: [
                "Informasi yang dibagikan langsung kepada kami disimpan hanya selama diperlukan untuk menyelesaikan pesanan, memberikan dukungan lanjutan, atau menjaga catatan layanan jika memang diperlukan.",
                "Data preferensi yang tersimpan di browser Anda, seperti pengaturan bahasa, wishlist, intro, popup musiman, atau pengaturan tampilan, dapat tetap berada di sana sampai Anda menghapusnya sendiri."
              ]
            },
            {
              id: "privacy-07",
              title: "Pilihan Anda",
              tocTitle: "Pilihan Anda",
              paragraphs: [
                "Anda dapat meminta akses, koreksi, atau penghapusan atas informasi yang telah Anda bagikan langsung kepada kami, dan Anda dapat memilih berhenti menerima komunikasi kapan saja dengan menghubungi kami."
              ]
            },
            {
              id: "privacy-08",
              title: "Keamanan",
              tocTitle: "Keamanan",
              paragraphs: [
                "Kami mengambil langkah yang wajar untuk melindungi informasi melalui akses internal yang terbatas, penanganan pesanan yang terkontrol, dan saluran komunikasi aman yang disediakan oleh layanan yang kami gunakan."
              ]
            },
            {
              id: "privacy-09",
              title: "Kontak",
              tocTitle: "Kontak",
              paragraphs: [
                "Untuk permintaan terkait privasi, silakan hubungi Marvell Florist di Batam, Indonesia."
              ],
              list: [
                "WhatsApp: +62 812 7501 7456",
                "Email: floristmarvell@gmail.com"
              ]
            }
          ]
        : [
            {
              id: "privacy-01",
              title: "Overview",
              tocTitle: "Overview",
              paragraphs: [
                "This policy explains how Marvell Florist handles customer information when you browse the website, contact us, or place an order."
              ]
            },
            {
              id: "privacy-02",
              title: "Why we collect information",
              tocTitle: "Why we collect information",
              paragraphs: [
                "Your information helps us respond properly, coordinate timing and delivery, support consultation, share order updates, and understand how the website is used."
              ]
            },
            {
              id: "privacy-03",
              title: "What we may collect",
              tocTitle: "What we may collect",
              paragraphs: [
                "We may collect contact details such as your name, phone number, email address, or messaging preference.",
                "We may also collect order-related details such as arrangement type, occasion, personalization notes, color preference, recipient information, and delivery instructions.",
                "When you browse the site, technical data such as device, browser, page visits, clicks, and on-device preference settings may also be stored or recorded.",
                "This includes browser-side preferences such as language, wishlist items, intro or seasonal-popup dismissal state, and certain display settings."
              ]
            },
            {
              id: "privacy-04",
              title: "How information is collected",
              tocTitle: "How information is collected",
              paragraphs: [
                "Most personal information is provided directly by you when you message us, request consultation, or place an order through WhatsApp, Instagram, or other contact channels.",
                "Some technical information is collected automatically through browser storage and Google Analytics.",
                "The website also records certain interaction events, including clicks on WhatsApp links, to understand which contact paths are being used."
              ]
            },
            {
              id: "privacy-05",
              title: "Sharing information",
              tocTitle: "Sharing information",
              paragraphs: [
                "We do not sell personal information.",
                "Information may be shared only when needed to complete or support your order, such as with delivery support or event coordination at your request.",
                "Third-party services such as WhatsApp, Instagram, email providers, Google Analytics, Shopee, or Tokopedia may process information according to their own policies when you use those services."
              ]
            },
            {
              id: "privacy-06",
              title: "Storage and retention",
              tocTitle: "Storage and retention",
              paragraphs: [
                "Information shared directly with us is kept only as long as needed to complete your order, provide follow-up support, or maintain service records where appropriate.",
                "Preference data stored in your browser, such as language, wishlist, intro, seasonal-popup, or display settings, may remain until you clear them yourself."
              ]
            },
            {
              id: "privacy-07",
              title: "Your choices",
              tocTitle: "Your choices",
              paragraphs: [
                "You may request access to, correction of, or deletion of the information you have shared directly with us, and you may opt out of future communication at any time by contacting us."
              ]
            },
            {
              id: "privacy-08",
              title: "Security",
              tocTitle: "Security",
              paragraphs: [
                "We take reasonable steps to protect information through limited internal access, controlled order handling, and the secure communication channels provided by the services we use."
              ]
            },
            {
              id: "privacy-09",
              title: "Contact",
              tocTitle: "Contact",
              paragraphs: [
                "For privacy-related requests, please contact Marvell Florist in Batam, Indonesia."
              ],
              list: [
                "WhatsApp: +62 812 7501 7456",
                "Email: floristmarvell@gmail.com"
              ]
            }
          ]
    })) return;
    const stack = document.querySelector(".stack");
    if (!(stack instanceof HTMLElement)) return;
    setSelectorText("main h1", t("Privacy Policy", "Kebijakan Privasi"));
    stack.innerHTML = currentLanguage === "id"
      ? `<section class="section">
          <p>Di Marvell Florist, kerahasiaan adalah bagian dari pengalaman.</p>
          <p>Kami hanya mengumpulkan informasi yang diperlukan untuk menangani setiap rangkaian dengan perhatian, ketelitian, dan sentuhan personal.</p>
        </section>
        <section class="section">
          <h2>Mengapa kami mengumpulkan informasi</h2>
          <p>Informasi Anda membantu kami merespons dengan tepat, mengatur pengiriman dan waktu, memberikan dukungan konsultasi, membagikan pembaruan pesanan, dan meningkatkan performa pengalaman website.</p>
        </section>
        <section class="section">
          <h2>Informasi yang dapat kami kumpulkan</h2>
          <p>Tergantung pada cara Anda berinteraksi dengan Marvell Florist, kami dapat mengumpulkan detail kontak seperti nama, nomor telepon, alamat email, atau preferensi komunikasi.</p>
          <p>Kami juga dapat mengumpulkan detail pesanan seperti jenis rangkaian, momen, preferensi warna, catatan personalisasi, dan instruksi pengiriman.</p>
          <p>Saat Anda menelusuri website, kami dapat mengumpulkan data teknis dan interaksi seperti halaman yang dikunjungi, klik, pola penggunaan secara umum, informasi perangkat atau browser, serta preferensi yang tersimpan di browser Anda.</p>
        </section>
        <section class="section">
          <h2>Bagaimana informasi dikumpulkan</h2>
          <p>Sebagian besar informasi pribadi diberikan langsung oleh Anda saat menghubungi kami, meminta konsultasi, melakukan pemesanan, atau mengirim pesan melalui WhatsApp maupun Instagram.</p>
          <p>Beberapa data teknis dan penggunaan dikumpulkan secara otomatis melalui alat website seperti penyimpanan browser, analitik, dan pelacakan interaksi.</p>
        </section>
        <section class="section">
          <h2>Pembagian informasi</h2>
          <p>Kami tidak menjual informasi pribadi.</p>
          <p>Informasi hanya dapat dibagikan bila diperlukan untuk menyelesaikan atau mendukung pesanan Anda, termasuk kepada mitra pengiriman, penyedia pembayaran, atau koordinator acara sesuai permintaan Anda.</p>
          <p>Platform pihak ketiga seperti WhatsApp, Instagram, penyedia email, dan Google Analytics juga dapat memproses informasi sesuai kebijakan mereka sendiri ketika Anda menggunakan layanan tersebut.</p>
        </section>
        <section class="section">
          <h2>Penyimpanan dan retensi</h2>
          <p>Informasi yang Anda bagikan langsung kepada kami disimpan hanya selama diperlukan untuk menyelesaikan pesanan, memberikan layanan lanjutan, atau menyimpan catatan layanan yang relevan.</p>
          <p>Preferensi di perangkat seperti pilihan bahasa, item wishlist, status pop-up, dan pengaturan pengalaman serupa dapat tetap tersimpan di browser Anda sampai dihapus.</p>
        </section>
        <section class="section">
          <h2>Pilihan Anda</h2>
          <p>Anda dapat meminta akses, koreksi, atau penghapusan atas informasi yang Anda bagikan langsung kepada kami, dan Anda dapat memilih berhenti menerima komunikasi kapan saja dengan menghubungi kami.</p>
        </section>
        <section class="section">
          <h2>Keamanan</h2>
          <p>Kami mengambil langkah yang wajar untuk melindungi informasi melalui akses internal yang terbatas, penanganan pesanan yang terkontrol, dan saluran aman yang disediakan oleh layanan yang kami gunakan.</p>
        </section>
        <section class="section">
          <h2>Kontak</h2>
          <p>Untuk permintaan terkait privasi, silakan hubungi Marvell Florist di Batam, Indonesia.</p>
          <p>WhatsApp: +62 812 7501 7456</p>
          <p>Email: floristmarvell@gmail.com</p>
        </section>`
      : `<section class="section">
          <p>At Marvell Florist, discretion is part of the experience.</p>
          <p>We collect only the information needed to guide each arrangement with care, precision, and personal attention.</p>
        </section>
        <section class="section">
          <h2>Why we collect information</h2>
          <p>Your information helps us respond thoughtfully, coordinate delivery and timing, provide consultation support, share order updates, and improve how the website performs.</p>
        </section>
        <section class="section">
          <h2>What we may collect</h2>
          <p>Depending on how you interact with Marvell Florist, we may collect contact details such as your name, phone number, email address, or messaging preferences.</p>
          <p>We may also collect order details such as arrangement type, occasion, color preferences, personalization notes, and delivery instructions.</p>
          <p>When you browse the website, we may collect technical and interaction data such as pages visited, clicks, approximate usage patterns, device or browser information, and preference data stored in your browser.</p>
        </section>
        <section class="section">
          <h2>How information is collected</h2>
          <p>Most personal information is provided directly by you when you contact us, request a consultation, place an order, or message us through WhatsApp or Instagram.</p>
          <p>Some technical and usage information is collected automatically through website tools such as browser storage, analytics, and interaction tracking.</p>
        </section>
        <section class="section">
          <h2>Sharing information</h2>
          <p>We do not sell personal information.</p>
          <p>Information may be shared only when needed to complete or support your order, including with delivery partners, payment providers, or event coordinators at your request.</p>
          <p>Third-party platforms such as WhatsApp, Instagram, email providers, and Google Analytics may also process information according to their own policies when you use those services.</p>
        </section>
        <section class="section">
          <h2>Storage and retention</h2>
          <p>Information shared directly with us is kept only as long as needed to complete your order, provide follow-up support, or maintain service records where appropriate.</p>
          <p>Certain on-device preferences such as language selection, wishlist items, popup dismissals, and similar experience settings may remain in your browser until cleared.</p>
        </section>
        <section class="section">
          <h2>Your choices</h2>
          <p>You may request access to, correction of, or deletion of information you have shared directly with us, and you may opt out of future communications at any time by contacting us.</p>
        </section>
        <section class="section">
          <h2>Security</h2>
          <p>We take reasonable steps to protect information through limited internal access, controlled order handling, and the secure channels provided by the services we use.</p>
        </section>
        <section class="section">
          <h2>Contact</h2>
          <p>For any privacy-related request, please contact Marvell Florist in Batam, Indonesia.</p>
          <p>WhatsApp: +62 812 7501 7456</p>
          <p>Email: floristmarvell@gmail.com</p>
        </section>`;
  }

  function translateTermsPage() {
    setDocumentMeta("terms");
    ensureLegalCluster("terms");
    bindLegalNavigation();
    if (renderLegalRichPage({
      title: t("Terms & Conditions", "Syarat & Ketentuan"),
      lead: t(
        "A clearer outline of how Marvell Florist handles orders, payment, customization, delivery, timing, and after-order issues.",
        "Gambaran yang lebih jelas tentang bagaimana Marvell Florist menangani pesanan, pembayaran, kustomisasi, pengiriman, waktu, dan hal-hal setelah pesanan berjalan."
      ),
      summary: t(
        "Every arrangement is prepared by hand and confirmed through consultation. These terms are here to make the order process easier to understand before payment and production begin.",
        "Setiap rangkaian disiapkan dengan tangan dan dikonfirmasi melalui konsultasi. Ketentuan ini dibuat agar proses pemesanan lebih mudah dipahami sebelum pembayaran dan produksi dimulai."
      ),
      summaryAria: t("Terms summary", "Ringkasan ketentuan"),
      tocAria: t("Terms contents", "Daftar isi ketentuan"),
      tocLabel: t("Contents", "Daftar Isi"),
      sections: currentLanguage === "id"
        ? [
            {
              id: "terms-01",
              title: "Pesanan dan konfirmasi",
              tocTitle: "Pesanan dan konfirmasi",
              paragraphs: [
                "Semua pesanan dimulai dari konsultasi. Desain, waktu, ketersediaan, kisaran harga, dan detail pengiriman dibahas terlebih dahulu sebelum rangkaian disiapkan.",
                "Pesanan hanya dianggap terkonfirmasi setelah pembayaran diterima."
              ]
            },
            {
              id: "terms-02",
              title: "Pembayaran",
              tocTitle: "Pembayaran",
              paragraphs: [
                "Pembayaran penuh diperlukan untuk mengonfirmasi pesanan.",
                "Pembayaran dilakukan melalui metode yang disepakati saat konsultasi. Website ini tidak menyediakan checkout mandiri, dan produksi baru dimulai setelah pembayaran selesai."
              ]
            },
            {
              id: "terms-03",
              title: "Kustomisasi dan kesesuaian produk",
              tocTitle: "Kustomisasi dan kesesuaian",
              paragraphs: [
                "Setiap rangkaian dibuat secara khusus.",
                "Pelanggan dapat meminta warna, gaya, atau referensi tertentu, tetapi hasil yang persis sama tidak selalu dapat dijamin karena ketersediaan bunga, material, dan musim dapat berubah.",
                "Jika substitusi diperlukan, tampilan dan kualitas keseluruhan karya tetap menjadi prioritas.",
                "Foto, kategori, dan harga yang ditampilkan di website bersifat referensial sampai detail akhirnya dikonfirmasi melalui konsultasi."
              ]
            },
            {
              id: "terms-04",
              title: "Pengiriman",
              tocTitle: "Pengiriman",
              paragraphs: [
                "Pengiriman tersedia di seluruh Batam.",
                "Waktu pengiriman dapat berubah tergantung volume pesanan, jarak, ketersediaan kurir, dan waktu persiapan. Pengiriman di hari yang sama hanya mungkin jika sudah dikonfirmasi.",
                "Jika penerima tidak tersedia, kami akan menghubungi pelanggan untuk menentukan langkah berikutnya. Setelah pesanan berhasil dikirim, tanggung jawab pengiriman kami dianggap selesai."
              ]
            },
            {
              id: "terms-05",
              title: "Perubahan dan pembatalan",
              tocTitle: "Perubahan dan pembatalan",
              paragraphs: [
                "Perubahan masih dapat diminta sebelum produksi dimulai, tergantung pada kelayakan dan waktunya.",
                "Pembatalan dapat diterima sebelum tahap persiapan berjalan. Setelah rangkaian sedang diproses atau selesai, pembatalan mungkin tidak lagi memungkinkan."
              ]
            },
            {
              id: "terms-06",
              title: "Refund",
              tocTitle: "Refund",
              paragraphs: [
                "Refund ditinjau per kasus.",
                "Jika masalah terjadi dari pihak kami, kami akan meninjaunya dan menyelesaikannya dengan tepat. Refund umumnya tidak berlaku untuk perubahan preferensi, ketidakhadiran penerima, atau keadaan di luar kendali kami."
              ]
            },
            {
              id: "terms-07",
              title: "Waktu dan pesanan mendesak",
              tocTitle: "Waktu dan pesanan mendesak",
              paragraphs: [
                "Rangkaian standar sering kali dapat disiapkan dalam waktu singkat, tergantung desainnya.",
                "Permintaan mendesak atau di hari yang sama bergantung pada ketersediaan material, beban kerja, dan jadwal. Kelayakannya selalu kami konfirmasi terlebih dahulu."
              ]
            },
            {
              id: "terms-08",
              title: "Catatan akhir",
              tocTitle: "Catatan akhir",
              paragraphs: [
                "Dengan melakukan pemesanan, pelanggan memahami bahwa semua rangkaian dibuat dengan tangan dan dapat memiliki sedikit variasi alami. Tujuan kami adalah menghadirkan setiap karya dengan perhatian, konsistensi, dan hasil yang tetap terasa sesuai dengan permintaan."
              ]
            }
          ]
        : [
            {
              id: "terms-01",
              title: "Orders and confirmation",
              tocTitle: "Orders and confirmation",
              paragraphs: [
                "All orders begin as a consultation. Design, timing, availability, approximate pricing, and delivery details are discussed before any arrangement is prepared.",
                "An order is only considered confirmed once payment has been received."
              ]
            },
            {
              id: "terms-02",
              title: "Payment",
              tocTitle: "Payment",
              paragraphs: [
                "Full payment is required to confirm an order.",
                "Payment is made through the method agreed during consultation. The website does not provide a self-serve checkout, and production begins only after payment is completed."
              ]
            },
            {
              id: "terms-03",
              title: "Customization and product accuracy",
              tocTitle: "Customization and accuracy",
              paragraphs: [
                "Each arrangement is custom-made.",
                "Customers may request specific colors, styles, or references, but exact replication cannot be guaranteed because flower availability, materials, and seasonality vary.",
                "When substitutions are necessary, the overall look and quality of the arrangement remain the priority.",
                "Images, categories, and listed prices on the website are provided as reference until the final details are confirmed through consultation."
              ]
            },
            {
              id: "terms-04",
              title: "Delivery",
              tocTitle: "Delivery",
              paragraphs: [
                "Delivery is available across Batam.",
                "Delivery timing may vary depending on order volume, distance, courier availability, and preparation time. Same-day delivery is possible only when confirmed.",
                "If the recipient is unavailable, we will contact the customer to decide the next step. Once the order has been successfully delivered, our delivery responsibility is considered fulfilled."
              ]
            },
            {
              id: "terms-05",
              title: "Changes and cancellations",
              tocTitle: "Changes and cancellations",
              paragraphs: [
                "Changes may be requested before production begins, depending on feasibility and timing.",
                "Cancellations may be accepted before preparation starts. Once the arrangement is in progress or completed, cancellation may no longer be possible."
              ]
            },
            {
              id: "terms-06",
              title: "Refunds",
              tocTitle: "Refunds",
              paragraphs: [
                "Refunds are reviewed case by case.",
                "If an issue arises from our side, we will review it and resolve it appropriately. Refunds are not generally applicable for preference changes, recipient unavailability, or circumstances outside our control."
              ]
            },
            {
              id: "terms-07",
              title: "Timing and urgent orders",
              tocTitle: "Timing and urgent orders",
              paragraphs: [
                "Standard arrangements can often be prepared within a short timeframe, depending on the design.",
                "Urgent or same-day requests depend on material availability, current workload, and scheduling. Feasibility is always confirmed first."
              ]
            },
            {
              id: "terms-08",
              title: "Final note",
              tocTitle: "Final note",
              paragraphs: [
                "By placing an order, customers acknowledge that all arrangements are handcrafted and may include slight natural variation. Our aim is to deliver each piece with care, consistency, and a result that still feels true to the request."
              ]
            }
          ]
    })) return;
    const main = document.querySelector("main");
    if (!(main instanceof HTMLElement)) return;
    main.innerHTML = currentLanguage === "id"
      ? `<h1>Syarat &amp; Ketentuan</h1>
      <p>Di Marvell Florist, setiap rangkaian disiapkan dengan perhatian dan ketelitian. Ketentuan berikut menjelaskan bagaimana pesanan kami tangani agar kedua belah pihak memiliki kejelasan.</p>
      <div class="divider"></div>
      <section class="section"><h2>Pesanan &amp; Konfirmasi</h2><p>Semua pesanan dimulai dari konsultasi. Detail seperti desain, ketersediaan, dan pengiriman dibahas sebelum rangkaian disiapkan.</p><p>Pesanan hanya dianggap terkonfirmasi setelah pembayaran diterima. Kami tidak memulai produksi tanpa konfirmasi.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Pembayaran</h2><p>Pembayaran penuh diperlukan untuk mengonfirmasi pesanan.</p><p>Pembayaran dapat dilakukan melalui transfer atau tunai, sesuai kesepakatan. Pesanan diproses setelah pembayaran selesai.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Kustomisasi &amp; Kesesuaian Produk</h2><p>Setiap rangkaian dibuat secara khusus.</p><p>Pelanggan dapat meminta warna, gaya, atau referensi tertentu. Namun, reproduksi yang persis sama tidak dapat dijamin karena perbedaan ketersediaan bunga, material, dan musim.</p><p>Penggantian bunga atau material dapat dilakukan bila diperlukan, sambil tetap menjaga tampilan dan kualitas keseluruhan rangkaian.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Pengiriman</h2><p>Kami melayani pengiriman di seluruh Batam.</p><p>Waktu pengiriman dapat berbeda tergantung volume pesanan, jarak, dan ketersediaan kurir. Pengiriman di hari yang sama dapat dilakukan untuk pesanan tertentu, dengan konfirmasi terlebih dahulu.</p><p>Jika penerima tidak tersedia saat pengiriman, kami akan menghubungi pelanggan untuk menentukan langkah berikutnya. Pengaturan tambahan mungkin diperlukan.</p><p>Setelah pesanan berhasil dikirim, tanggung jawab dianggap telah dipenuhi.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Perubahan &amp; Pembatalan</h2><p>Perubahan pesanan dapat diajukan sebelum produksi dimulai, tergantung pada tingkat memungkinkan atau tidaknya perubahan.</p><p>Pembatalan dapat diterima sebelum proses persiapan dimulai. Setelah rangkaian sedang dikerjakan atau telah selesai, pembatalan mungkin tidak dapat dilakukan.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Refund</h2><p>Refund dipertimbangkan berdasarkan kasus.</p><p>Jika terdapat masalah yang disebabkan oleh pihak kami, kami akan meninjau dan menyelesaikannya dengan tepat. Refund tidak berlaku untuk perubahan preferensi, ketidakhadiran penerima, atau keadaan di luar kendali kami.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Waktu &amp; Pesanan Mendesak</h2><p>Pesanan standar umumnya dapat disiapkan dalam waktu singkat, tergantung desain.</p><p>Permintaan mendesak atau hari yang sama bergantung pada ketersediaan material, beban kerja, dan waktu. Kami akan selalu mengonfirmasi kelayakannya sebelum melanjutkan.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Catatan Akhir</h2><p>Dengan melakukan pemesanan, pelanggan memahami bahwa semua rangkaian dibuat dengan tangan dan dapat memiliki sedikit perbedaan. Kami berupaya menghadirkan setiap karya dengan teliti dan konsisten.</p></section>`
      : `<h1>Terms &amp; Conditions</h1>
      <p>At Marvell Florist, every arrangement is prepared with care and attention. The following terms outline how orders are handled to ensure clarity for both sides.</p>
      <div class="divider"></div>
      <section class="section"><h2>Orders &amp; Confirmation</h2><p>All orders begin as a consultation. Details such as design, availability, and delivery are discussed before any arrangement is prepared.</p><p>An order is only considered confirmed once payment has been received. We do not proceed with production without confirmation.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Payment</h2><p>Full payment is required to confirm an order.</p><p>Payments can be made via transfer or cash, depending on the arrangement discussed. Orders are processed only after payment is completed.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Customization &amp; Product Accuracy</h2><p>Each arrangement is custom-made.</p><p>Customers may request specific colors, styles, or references. However, exact replication of any image cannot be guaranteed due to differences in flower availability, materials, and seasonality.</p><p>Substitutions may be made when necessary, while maintaining the overall look and quality of the arrangement.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Delivery</h2><p>We provide delivery across Batam.</p><p>Delivery timing may vary depending on order volume, distance, and courier availability. Same-day delivery is possible for certain orders, subject to confirmation.</p><p>If the recipient is unavailable at the time of delivery, we will contact the customer to arrange the next step. Additional arrangements may be required.</p><p>Once the order has been successfully delivered, responsibility is considered fulfilled.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Changes &amp; Cancellations</h2><p>Changes to an order can be requested before production begins, depending on feasibility.</p><p>Cancellations may be accepted prior to preparation. Once the arrangement is in progress or completed, cancellations may not be possible.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Refunds</h2><p>Refunds are considered on a case-by-case basis.</p><p>If an issue arises due to our side, we will review and resolve it appropriately. Refunds are not applicable for changes in preference, recipient unavailability, or circumstances outside our control.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Timing &amp; Urgent Orders</h2><p>Standard orders can typically be prepared within a short timeframe, depending on the design.</p><p>Urgent or same-day requests are subject to availability of materials, workload, and timing. We will always confirm feasibility before proceeding.</p></section>
      <div class="divider"></div>
      <section class="section"><h2>Final Note</h2><p>By placing an order, customers acknowledge that all arrangements are handcrafted and may involve slight variations. We aim to deliver each piece as intended, with care and consistency.</p></section>`;
    ensureLegalCluster("terms");
  }

  function translateGalleryDynamicText() {
    const activeGalleryCategory = new URL(window.location.href).searchParams.get("category") || "";
    setSelectorText(
      "#mobile-category-label",
      activeGalleryCategory ? localizeCategory(activeGalleryCategory) : t("Categories", "Kategori")
    );
    setSelectorText(".mobile-category-title", t("Categories", "Kategori"));
    setSelectorText("#gallery-portfolio-note", t("Most pieces are made to order, so availability and flower selection should be confirmed first.", "Sebagian besar karya dibuat khusus, jadi ketersediaan dan pilihan bunga perlu dikonfirmasi terlebih dahulu."));
    setSelectorText("#collection-hook-copy", "");
    setSelectorText("#custom-arrangements-link", "");
    setSelectorText("#consult-collection", t("Consult This Collection", "Konsultasikan Koleksi Ini"));
    Array.from(document.querySelectorAll(".filters-trigger-label")).forEach((node) => {
      setText(node, t("Filter", "Filter"));
    });
    setSelectorText("#filters-panel h3", t("Filter", "Filter"));

    const heroTitle = document.getElementById("hero-title");
    if (heroTitle instanceof HTMLElement) heroTitle.textContent = localizeCategory(heroTitle.textContent);
    const metaTitle = document.getElementById("meta-title");
    if (metaTitle instanceof HTMLElement) metaTitle.textContent = localizeCategory(metaTitle.textContent);
    const heroSubtitle = document.getElementById("hero-subtitle");
    if (heroSubtitle instanceof HTMLElement) heroSubtitle.textContent = localizeCategorySubtitle(heroTitle ? heroTitle.textContent : heroSubtitle.textContent);
    const metaSubtitle = document.getElementById("meta-subtitle");
    if (metaSubtitle instanceof HTMLElement) metaSubtitle.textContent = localizeCategorySubtitle(metaTitle ? metaTitle.textContent : metaSubtitle.textContent);

    Array.from(document.querySelectorAll("#category-nav-list a, #mobile-category-list a, #footer-categories a")).forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      const category = new URL(link.href, window.location.href).searchParams.get("category") || "";
      const localized = localizeCategory(category);
      const check = link.querySelector(".mobile-category-check");
      if (check) {
        const text = localized;
        link.innerHTML = `${text}${link.classList.contains("is-active") ? '<span class="mobile-category-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 13l5 5L20 6"/></svg></span>' : ""}`;
      } else {
        setText(link, localized);
      }
    });

    Array.from(document.querySelectorAll(".portfolio-gateway-card")).forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      const categoryKey = card.getAttribute("data-category-key") || "";
      const kicker = card.querySelector(".portfolio-gateway-card-kicker");
      const title = card.querySelector(".portfolio-gateway-card-title");
      const cta = card.querySelector(".portfolio-gateway-card-cta");
      if (card.classList.contains("portfolio-gateway-card--intro")) {
        setText(kicker, "Marvell Florist");
        setText(title, t("For Moments That Matter", "Untuk Momen yang Bermakna"));
        setText(cta, t("The Collection", "Koleksi"));
      } else {
        setText(kicker, t("Collection", "Koleksi"));
        setText(title, localizeCategory(categoryKey));
        setText(cta, t("Discover More", "Lihat Lebih Lanjut"));
      }
    });

    Array.from(document.querySelectorAll(".filter-group-title,.filter-option:not(.filter-option--color) .filter-option-label,.filter-color-text,.filter-range-note,.filter-clear,.filters-count,#products-grid p,.collection-cta,.search-query-tab,.search-query-count")).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const raw = node.textContent || "";
      let next = localizeSimpleLabel(raw);
      if (currentLanguage === "id") {
        next = next
          .replace("This collection will be updated soon.", "Koleksi ini akan segera diperbarui.")
          .replace("Slide to choose the minimum and maximum price.", "Geser untuk memilih batas harga minimum dan maksimum.")
          .replace("No products match all selected filters.", "Tidak ada produk yang cocok dengan semua filter yang dipilih.")
          .replace(" products still match part of your filters.", " produk masih cocok dengan sebagian filter.")
          .replace(" Filters that still have results: ", " Filter yang masih punya hasil: ")
          .replace("No additional items in this category yet.", "Belum ada item tambahan di kategori ini.");
      } else {
        next = next
          .replace("Koleksi ini akan segera diperbarui.", "This collection will be updated soon.")
          .replace("Geser untuk memilih batas harga minimum dan maksimum.", "Slide to choose the minimum and maximum price.")
          .replace("Tidak ada produk yang cocok dengan semua filter yang dipilih.", "No products match all selected filters.")
          .replace(" produk masih cocok dengan sebagian filter.", " products still match part of your filters.")
          .replace(" Filter yang masih punya hasil: ", " Filters that still have results: ")
          .replace("Belum ada item tambahan di kategori ini.", "No additional items in this category yet.");
      }
      setText(node, next);
    });
  }

  function translateGalleryPage() {
    setDocumentMeta("gallery", { skipTitle: true, skipDescription: true });
    const seasonalPromoLink = document.querySelector(".collection-promo-link");
    if (!(seasonalPromoLink instanceof HTMLElement) || seasonalPromoLink.dataset.seasonalManaged !== "true") {
      setSelectorText(".collection-promo-link", t("Collections - Explore the arrangements", "Koleksi - Jelajahi rangkaian"));
    }
    translateGalleryDynamicText();
    if (typeof window.syncGallerySeoMeta === "function") window.syncGallerySeoMeta();
    translateFooter(document);
  }

  function translateProductPage() {
    setDocumentMeta("product");
    setSelectorText("#product-whatsapp", t("Consult via WhatsApp", "Konsultasi via WhatsApp"));
    setSelectorText("#product-order-title", t("How to order", "Cara memesan"));
    setSelectorText("#product-order-copy", t("Use this page as a reference, then continue on WhatsApp to confirm design details, availability, delivery timing, and final pricing before we prepare your arrangement.", "Gunakan halaman ini sebagai referensi, lalu lanjutkan di WhatsApp untuk mengonfirmasi detail desain, ketersediaan, waktu pengiriman, dan harga akhir sebelum kami menyiapkan rangkaiannya."));
    setSelectorText(".product-faq-label", t("Frequently Asked Questions", "FAQ"));
    setSelectorText(".related-products h2", t("You May Also Like", "Anda Mungkin Suka"));

    const breadcrumb = document.getElementById("product-breadcrumb");
    if (breadcrumb instanceof HTMLElement) {
      Array.from(breadcrumb.querySelectorAll("a")).forEach((link) => {
        if (!(link instanceof HTMLAnchorElement)) return;
        const href = link.getAttribute("href") || "";
        if (href === "index.html" || href === "index.html?lang=en" || href === "index.html?lang=id") setText(link, "Home");
        if (href.startsWith("gallery.html")) {
          if (href === "gallery.html" || href.startsWith("gallery.html?lang=")) setText(link, t("Portfolio", "Portofolio"));
          if (href.includes("category=")) {
            const category = new URL(link.href, window.location.href).searchParams.get("category") || link.textContent || "";
            setText(link, localizeCategory(category));
          }
        }
      });
    }

    Array.from(document.querySelectorAll(".faq-toggle span:first-child")).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      setText(node, localizeSimpleLabel(node.textContent || ""));
    });

    Array.from(document.querySelectorAll("#related-grid p")).forEach((node) => {
      setText(node, t("No additional items in this category yet.", "Belum ada item tambahan di kategori ini."));
    });

    translateFooter(document);
  }

  function translateFeaturedPage() {
    setDocumentMeta("featured");
    const seasonalKicker = document.getElementById("featured-kicker");
    const seasonalCollectionCurrent = document.getElementById("featured-collection-current");
    const seasonalCollectionLabel = seasonalCollectionCurrent instanceof HTMLElement
      ? seasonalCollectionCurrent.querySelector("[data-featured-collection-label]")
      : null;
    const seasonalCollectionMenuTitle = document.querySelector("[data-featured-collection-menu-title]");
    const seasonalCollectionKicker = seasonalCollectionMenuTitle instanceof HTMLElement
      ? seasonalCollectionMenuTitle
      : null;
    const seasonalTitle = document.getElementById("featured-title");
    const seasonalLead = document.getElementById("featured-lead");
    if (!(seasonalKicker instanceof HTMLElement) || seasonalKicker.dataset.seasonalManaged !== "true") {
      setSelectorText("#featured-kicker", t("Seasonal Collection", "Koleksi Musiman"));
    }
    if (seasonalCollectionKicker instanceof HTMLElement) {
      seasonalCollectionKicker.textContent = t("Seasonal Collection", "Koleksi Musiman");
    }
    if (!(seasonalCollectionCurrent instanceof HTMLElement) || seasonalCollectionCurrent.dataset.seasonalManaged !== "true") {
      if (seasonalCollectionLabel instanceof HTMLElement) {
        seasonalCollectionLabel.textContent = t("Collections", "Koleksi");
      } else {
        setSelectorText("#featured-collection-current", t("Collections", "Koleksi"));
      }
    } else {
      const localizedLabel = localizeSeasonalCollectionLabel(seasonalCollectionCurrent.dataset.seasonalLabel || seasonalCollectionCurrent.textContent || "");
      if (seasonalCollectionLabel instanceof HTMLElement) seasonalCollectionLabel.textContent = localizedLabel;
      else seasonalCollectionCurrent.textContent = localizedLabel;
    }
    if (!(seasonalTitle instanceof HTMLElement) || seasonalTitle.dataset.seasonalManaged !== "true") {
      setSelectorText("#featured-title", t("Collections", "Koleksi"));
    } else {
      seasonalTitle.textContent = localizeSeasonalCollectionLabel(seasonalTitle.dataset.seasonalLabel || seasonalTitle.textContent || "");
    }
    if (!(seasonalLead instanceof HTMLElement) || seasonalLead.dataset.seasonalManaged !== "true") {
      setSelectorText("#featured-lead", t("The active campaign collection is shown below.", "Koleksi kampanye aktif ditampilkan di bawah ini."));
    }
    Array.from(document.querySelectorAll(".featured-consult-btn,.featured-collection-btn")).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const raw = node.textContent || "";
      if (/discover/i.test(raw) || /collection/i.test(raw) || /view all/i.test(raw)) {
        setText(node, t("Discover the Collection", "Jelajahi Koleksi"));
      }
      else if (/consult/i.test(raw)) setText(node, t("Consult", "Konsultasi"));
    });
    if (!/\/featured\.html(?:$|\?)/i.test(String(window.location.pathname || ""))) {
      Array.from(document.querySelectorAll(".featured-warning")).forEach((node) => {
        setText(node, t("Prices and availability may vary based on seasonal flowers.", "Harga dan ketersediaan dapat berubah sesuai bunga musiman."));
      });
    }
    setSelectorText(".whatsapp-float-label", t("Chat with us", "Chat dengan kami"));
  }

  function translateContactPage() {
    setDocumentMeta("contact");
    setSelectorText(".contact-hero h1", t("Contact Us", "Hubungi Kami"));
    setSelectorText(".contact-lead", t(
      "Choose the most direct way to reach us for floral orders, custom requests, store visits, or a faster answer before you place an arrangement.",
      "Pilih cara paling langsung untuk menghubungi kami terkait pesanan bunga, permintaan kustom, kunjungan toko, atau jawaban yang lebih cepat sebelum Anda memesan."
    ));
    setSelectorText(".contact-summary p", t(
      "Reach Marvell Florist directly for consultations, custom arrangements, delivery timing, and store visits across Batam.",
      "Hubungi Marvell Florist secara langsung untuk konsultasi, rangkaian kustom, penjadwalan pengiriman, dan kunjungan toko di Batam."
    ));
    setSelectorText(".legal-suite-label", t("Customer Information", "Informasi Pelanggan"));
    setSelectorText(".legal-toc-label", t("Contents", "Daftar Isi"));
    Array.from(document.querySelectorAll(".legal-suite-link")).forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      const href = link.getAttribute("href") || "";
      if (href.includes("faq.html")) setText(link, t("FAQ", "FAQ"));
      if (href.includes("privacy-policy.html")) setText(link, t("Privacy", "Privasi"));
      if (href.includes("terms-conditions.html")) setText(link, t("Terms", "Ketentuan"));
      if (href.includes("contact.html")) setText(link, t("Contact", "Kontak"));
    });
    Array.from(document.querySelectorAll(".legal-toc-link")).forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      const href = link.getAttribute("href") || "";
      if (href === "#contact-message") setText(link, t("01. Message us", "01. Kirim pesan"));
      if (href === "#contact-social") setText(link, t("02. Email and social", "02. Email dan sosial"));
      if (href === "#contact-visit") setText(link, t("03. Visit us", "03. Kunjungi kami"));
      if (href === "#contact-services") setText(link, t("04. Service details", "04. Detail layanan"));
    });
    setSelectorText("#contact-message .contact-section-title", t("Message Us", "Kirim Pesan"));
    const messageParagraphs = Array.from(document.querySelectorAll("#contact-message .contact-section-body p"));
    setText(messageParagraphs[0], t("Monday to Saturday: 8am to 6pm WIB.", "Senin hingga Sabtu: 8 pagi sampai 6 sore WIB."));
    setText(messageParagraphs[1], t(
      "Use the line that best matches your request so the conversation starts in the right place.",
      "Gunakan jalur yang paling sesuai dengan kebutuhan Anda agar percakapan langsung dimulai di tempat yang tepat."
    ));
    const messageLinks = Array.from(document.querySelectorAll("#contact-message .contact-link"));
    setText(messageLinks[0], t("Floral Orders", "Pesanan Bunga"));
    setText(messageLinks[1], t("Custom Requests", "Permintaan Kustom"));
    setText(messageLinks[2], t("Supplies", "Perlengkapan"));

    setSelectorText("#contact-social .contact-section-title", t("Email & Social", "Email & Sosial"));
    const socialParagraphs = Array.from(document.querySelectorAll("#contact-social .contact-section-body p"));
    setText(socialParagraphs[0], t(
      "For documents, event briefs, or requests that are easier to explain in writing, email keeps everything in one place.",
      "Untuk dokumen, brief, atau permintaan yang lebih mudah dijelaskan secara tertulis, email membantu semuanya tetap rapi dalam satu tempat."
    ));
    const socialLinks = Array.from(document.querySelectorAll("#contact-social .contact-link"));
    setText(socialLinks[0], t("Send an Email", "Kirim Email"));
    setText(socialLinks[1], t("View Instagram", "Lihat Instagram"));
    setText(socialLinks[2], t("View Facebook", "Lihat Facebook"));

    setSelectorText("#contact-visit .contact-section-title", t("Visit Us", "Kunjungi Kami"));
    const visitParagraphs = Array.from(document.querySelectorAll("#contact-visit .contact-section-body p"));
    setText(visitParagraphs[0], t(
      "Choose the location that fits your visit best, whether you are coming for the florist boutique or the supplies shop.",
      "Pilih lokasi yang paling sesuai untuk kunjungan Anda, baik ke butik florist maupun toko perlengkapan."
    ));
    const visitLinks = Array.from(document.querySelectorAll("#contact-visit .contact-link"));
    setText(visitLinks[0], t("Florist Boutique", "Butik Florist"));
    setText(visitLinks[1], t("Supplies Shop", "Toko Perlengkapan"));

    setSelectorText("#contact-services .contact-section-title", t("Need care or service details?", "Butuh detail layanan?"));
    const serviceParagraphs = Array.from(document.querySelectorAll("#contact-services .contact-section-body p"));
    setText(serviceParagraphs[0], t(
      "For consultations, custom arrangements, delivery coordination, and pickup, the services page gives a more complete view of how Marvell handles each request.",
      "Untuk konsultasi, rangkaian kustom, koordinasi pengiriman, dan pickup, halaman layanan memberi gambaran yang lebih lengkap tentang bagaimana Marvell menangani setiap kebutuhan."
    ));
    const serviceLinks = Array.from(document.querySelectorAll("#contact-services .contact-link"));
    setText(serviceLinks[0], t("Explore Services", "Jelajahi Layanan"));
  }

  function translateServicesPage() {
    setDocumentMeta("services");
    setSelectorText(".services-hero-kicker", t("Our Services", "Layanan Kami"));
    setSelectorText(".services-hero-title", t("Marvell Florist Services", "Layanan Marvell Florist"));
    setSelectorText(".services-hero-copy", t(
      "Consultation-led floral help for orders, custom work, timing, and the details around them.",
      "Bantuan floral berbasis konsultasi untuk pesanan, karya kustom, penentuan waktu, dan detail di sekitarnya."
    ));
    setSelectorText(".services-hero-copy-secondary", t(
      "A shorter guide to how we work.",
      "Panduan yang lebih singkat tentang cara kami bekerja."
    ));

    setSelectorText("#consultation .services-accordion-title", t("Consultation", "Konsultasi"));
    const consultationParagraphs = Array.from(document.querySelectorAll("#consultation .services-accordion-copy"));
    setText(consultationParagraphs[0], t(
      "Most requests begin with a conversation. We clarify the occasion, the recipient, the tone, the palette, and the budget before the work starts so the order feels intentional from the outset.",
      "Sebagian besar permintaan dimulai lewat percakapan. Kami memperjelas momennya, penerimanya, tone, palet warna, dan anggarannya sebelum pengerjaan dimulai agar pesanan terasa sengaja sejak awal."
    ));
    setText(consultationParagraphs[1], t(
      "That first exchange also helps us recommend the most suitable format, whether it belongs in a ready collection or needs a more tailored direction.",
      "Percakapan awal itu juga membantu kami menyarankan format yang paling sesuai, apakah kebutuhan tersebut cocok dengan koleksi siap pilih atau memerlukan arahan yang lebih tailored."
    ));
    const consultationLinks = Array.from(document.querySelectorAll("#consultation .services-accordion-link"));
    setText(consultationLinks[0], t("Contact page", "Halaman kontak"));
    setText(consultationLinks[1], t("WhatsApp", "WhatsApp"));

    setSelectorText("#custom-arrangements .services-accordion-title", t("Custom Arrangements", "Rangkaian Kustom"));
    const customParagraphs = Array.from(document.querySelectorAll("#custom-arrangements .services-accordion-copy"));
    setText(customParagraphs[0], t(
      "Some pieces start with a reference image, a wrapping idea, or a very specific silhouette. Others begin with only a mood and a setting. This is where that more directed work belongs.",
      "Beberapa karya dimulai dari gambar referensi, ide wrapping, atau siluet yang sangat spesifik. Yang lain dimulai hanya dari mood dan setting. Di sinilah karya yang lebih terarah seperti itu berada."
    ));
    setText(customParagraphs[1], t(
      "We shape the final piece around your references, available flowers, scale, and intended setting rather than forcing it into a standard category.",
      "Kami membentuk karya akhirnya berdasarkan referensi Anda, ketersediaan bunga, skala, dan setting yang dituju, bukan memaksanya masuk ke kategori standar."
    ));
    setSelectorText("#custom-arrangements .services-accordion-link", t("Start consultation on WhatsApp", "Mulai konsultasi di WhatsApp"));

    setSelectorText("#personal-message .services-accordion-title", t("Message Cards", "Kartu Pesan"));
    const messageParagraphs = Array.from(document.querySelectorAll("#personal-message .services-accordion-copy"));
    setText(messageParagraphs[0], t(
      "A message card often finishes the arrangement properly. It gives the flowers context when the gesture is personal, ceremonial, grateful, or quietly private.",
      "Kartu pesan sering kali menyelesaikan rangkaian dengan lebih tepat. Ia memberi konteks ketika gesturnya bersifat personal, seremonial, penuh terima kasih, atau lebih private."
    ));
    setText(messageParagraphs[1], t(
      "If needed, we can help keep the wording clean, warm, and appropriate to the tone of the arrangement.",
      "Jika diperlukan, kami dapat membantu menjaga kalimatnya tetap rapi, hangat, dan sesuai dengan tone rangkaiannya."
    ));
    setSelectorText("#personal-message .services-accordion-link", t("Ask about message cards", "Tanya soal kartu pesan"));

    setSelectorText("#delivery-setup .services-accordion-title", t("Delivery Coordination", "Koordinasi Pengiriman"));
    const deliveryParagraphs = Array.from(document.querySelectorAll("#delivery-setup .services-accordion-copy"));
    setText(deliveryParagraphs[0], t(
      "Timing, recipient details, and handling are confirmed directly before dispatch. For more delicate orders, we discuss placement and condition in advance rather than relying on a generic courier flow.",
      "Waktu, detail penerima, dan penanganan dikonfirmasi langsung sebelum pengiriman. Untuk pesanan yang lebih sensitif, kami membahas penempatan dan kondisinya lebih dulu daripada mengandalkan alur kurir yang generik."
    ));
    setText(deliveryParagraphs[1], t(
      "This is especially useful when the arrangement has a tighter delivery window or needs careful arrival handling.",
      "Ini sangat membantu ketika rangkaiannya memiliki jendela pengiriman yang lebih ketat atau membutuhkan penanganan kedatangan yang lebih hati-hati."
    ));
    setSelectorText("#delivery-setup .services-accordion-link", t("Discuss timing", "Bahas waktunya"));

    setSelectorText("#collection-pickup .services-accordion-title", t("Collection & Handover", "Pengambilan & Serah Terima"));
    const pickupParagraphs = Array.from(document.querySelectorAll("#collection-pickup .services-accordion-copy"));
    setText(pickupParagraphs[0], t(
      "Orders can also be prepared for store pickup in Batam. We coordinate the pickup window in advance so the arrangement is ready, checked, and finished when you arrive.",
      "Pesanan juga dapat disiapkan untuk diambil langsung di toko Batam. Kami mengatur jendela pengambilannya lebih dulu agar rangkaian sudah siap, dicek, dan selesai saat Anda datang."
    ));
    setText(pickupParagraphs[1], t(
      "For surprises and timed handovers, we can also help align the final pickup with the moment you need.",
      "Untuk kejutan dan serah terima yang sensitif terhadap waktu, kami juga dapat membantu menyelaraskan pengambilan akhirnya dengan momen yang Anda butuhkan."
    ));
    setSelectorText("#collection-pickup .services-accordion-link", t("Get store directions", "Lihat lokasi toko"));

    setSelectorText("#floral-styling .services-accordion-title", t("Floral Styling", "Floral Styling"));
    const stylingParagraphs = Array.from(document.querySelectorAll("#floral-styling .services-accordion-copy"));
    setText(stylingParagraphs[0], t(
      "Some requests are less about a gift and more about how flowers sit inside a space, a table, an opening, or a vehicle. We handle those with more attention to placement, proportion, and setting.",
      "Beberapa permintaan bukan terutama tentang hadiah, melainkan tentang bagaimana bunga hadir di dalam ruang, di meja, pada pembukaan, atau pada kendaraan. Kami menanganinya dengan perhatian lebih pada penempatan, proporsi, dan setting."
    ));
    setText(stylingParagraphs[1], t(
      "That includes lighter styling help, event-adjacent floral moments, and requests that need a more spatial point of view.",
      "Itu mencakup bantuan styling yang lebih ringan, momen floral yang berkaitan dengan acara, dan permintaan yang membutuhkan sudut pandang yang lebih spasial."
    ));
    setSelectorText("#floral-styling .services-accordion-link", t("See custom work", "Lihat karya kustom"));
  }

  function translateCustomPage() {
    setDocumentMeta("custom");
    setSelectorText(".custom-kicker", t("Marvell Florist Services", "Layanan Marvell Florist"));
    setSelectorText(".custom-title", t("Custom Arrangements", "Rangkaian Kustom"));
    setSelectorText(".custom-subline", t(
      "For requests shaped by references, placement, ribbons, vehicle details, and one-off floral directions that do not belong in a fixed collection.",
      "Untuk permintaan yang dibentuk oleh referensi, penempatan, pita, detail kendaraan, dan arah floral satu kali yang tidak cocok masuk ke koleksi tetap."
    ));

    Array.from(document.querySelectorAll(".custom-subnav-link")).forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      const href = link.getAttribute("href") || "";
      if (href === "#custom-categories") setText(link, t("Custom Work", "Karya Kustom"));
      if (href === "#custom-process") setText(link, t("The Process", "Prosesnya"));
      if (href === "#custom-fit") setText(link, t("Where It Fits", "Posisi Kebutuhan"));
    });

    const categoriesSection = document.getElementById("custom-categories");
    if (categoriesSection instanceof HTMLElement) {
      setSelectorText(".section-title", t("Selected Custom Work", "Pilihan Karya Kustom"), categoriesSection);
      setSelectorText(".section-copy", t(
        "Instead of treating custom work as one broad category, this page breaks it into the kinds of requests that tend to need a more specific hand.",
        "Alih-alih memperlakukan karya kustom sebagai satu kategori besar, halaman ini membaginya ke dalam jenis permintaan yang biasanya membutuhkan tangan yang lebih spesifik."
      ), categoriesSection);
      const scopeCards = Array.from(categoriesSection.querySelectorAll(".custom-scope-card"));
      const scopeData = currentLanguage === "id"
        ? [
            ["Detail Garnish & Meja", "Momen floral yang lebih kecil untuk meja makan, welcome table, permukaan yang ditata, atau detail dekoratif yang lebih tenang tetapi tetap membutuhkan proporsi dan finishing."],
            ["Pita Pembukaan", "Karya berbasis pita untuk momen pembukaan yang membutuhkan format seremonial yang lebih rapi, dengan perhatian pada skala, posisi pesan, dan bagaimana tampilannya di ruang tersebut."],
            ["Dekorasi Mobil", "Permintaan floral untuk kendaraan yang membutuhkan lebih banyak perencanaan dalam pemasangan, pergerakan, keseimbangan, dan bagaimana bunganya bertahan saat mobil benar-benar digunakan."],
            ["Dan Banyak Lagi", "Jika permintaannya berada di luar koleksi tetap tetapi sudah punya referensi, setting, atau arah visual yang jelas, kami membentuknya dari situ alih-alih memaksanya ke kategori yang salah."]
          ]
        : [
            ["Garnishes & Table Details", "Smaller floral moments for a meal, a welcome table, a styled surface, or a quieter decorative detail that still needs proportion and finish."],
            ["Opening Ribbons", "Ribbon-based opening work that needs a cleaner ceremonial format, with attention to scale, message placement, and how the piece reads in the room."],
            ["Car Decorations", "Vehicle-based floral requests that need more planning for attachment, movement, balance, and how the flowers hold together once the car is actually in use."],
            ["And Much More", "If the request sits outside a fixed collection but already has a reference, a setting, or a clear visual direction, we shape it from there rather than forcing it into the wrong category."]
          ];
      scopeCards.forEach((card, index) => {
        const [title, copy] = scopeData[index] || [];
        setSelectorText("h3", title, card);
        setSelectorText("p", copy, card);
      });
    }

    const processSection = document.getElementById("custom-process");
    if (processSection instanceof HTMLElement) {
      setSelectorText(".section-title", t("How a Custom Request Takes Shape", "Bagaimana Permintaan Kustom Mulai Terbentuk"), processSection);
      setSelectorText(".section-copy", t(
        "The process stays direct, but custom work needs a little more context than a ready-made order so the final piece feels deliberate instead of improvised.",
        "Prosesnya tetap langsung, tetapi karya kustom membutuhkan sedikit lebih banyak konteks daripada pesanan siap pilih agar hasil akhirnya terasa sengaja, bukan improvisasi."
      ), processSection);
      const processCards = Array.from(processSection.querySelectorAll(".process-card"));
      const processData = currentLanguage === "id"
        ? [
            ["Langkah 01", "Referensi", "Kirimkan momennya, setting-nya, dan gambar, ide wrapping, format pita, atau referensi visual kasar apa pun yang sudah Anda pikirkan."],
            ["Langkah 02", "Arah", "Kami menyaring permintaan tersebut berdasarkan skala, ketersediaan bunga, waktu, dan bagaimana rangkaiannya harus terasa saat benar-benar ditempatkan."],
            ["Langkah 03", "Konfirmasi", "Setelah arahnya jelas, kami mengonfirmasi harga, waktu, dan detail pengiriman atau pengambilan sebelum karya masuk ke tahap persiapan."]
          ]
        : [
            ["Step 01", "Reference", "Send the occasion, the setting, and any image, wrapping idea, ribbon format, or rough visual reference you already have in mind."],
            ["Step 02", "Direction", "We refine the request around scale, flower availability, timing, and how the arrangement should feel once it is actually placed."],
            ["Step 03", "Confirmation", "Once the direction is clear, we confirm pricing, timing, and delivery or pickup details before the piece moves into preparation."]
          ];
      processCards.forEach((card, index) => {
        const [step, title, copy] = processData[index] || [];
        setSelectorText(".process-card-step", step, card);
        setSelectorText("h3", title, card);
        setSelectorText("p:last-of-type", copy, card);
      });
    }

    const fitSection = document.getElementById("custom-fit");
    if (fitSection instanceof HTMLElement) {
      setSelectorText(".section-title", t("Where Custom Work Fits", "Di Mana Karya Kustom Terasa Tepat"), fitSection);
      setSelectorText(".section-copy", t(
        "This page no longer treats gifting as its own custom category. The better split is based on what is leading the request.",
        "Halaman ini tidak lagi memperlakukan gifting sebagai kategori kustom tersendiri. Pembagian yang lebih tepat adalah berdasarkan apa yang memimpin permintaannya."
      ), fitSection);
      const fitCards = Array.from(fitSection.querySelectorAll(".custom-fit-card"));
      const fitData = currentLanguage === "id"
        ? [
            ["Permintaan Berbasis Referensi", "Jika Anda sudah punya gambar, arah bouquet, ide wrapping, atau visual yang disimpan, kami menggunakannya sebagai titik awal lalu menyesuaikannya dengan ketersediaan bunga, skala, dan finishing."],
            ["Karya Berbasis Ruang", "Beberapa kebutuhan lebih dibentuk oleh ruangan, meja, storefront, atau kendaraan daripada referensi bouquet. Kebutuhan seperti ini membutuhkan proporsi, penempatan, dan keseimbangan visual terlebih dulu."],
            ["Instalasi Berbasis Momen", "Pita pembukaan, setup seremonial, dan momen floral satu kali pakai sering kali membutuhkan struktur praktis lebih dulu dan styling bunga sesudahnya agar benar-benar bekerja di setting nyata."]
          ]
        : [
            ["Reference-Led Requests", "If you already have an image, bouquet direction, wrapping idea, or saved visual, we use that as the starting point and adapt it to flower availability, scale, and finish."],
            ["Space-Led Pieces", "Some requests are shaped more by the room, table, storefront, or vehicle than by a bouquet reference. Those need proportion, placement, and visual balance first."],
            ["Moment-Led Installations", "Ribbon openings, ceremonial setups, and one-off floral moments often need a practical structure first and floral styling second so the piece works in the real setting."]
          ];
      fitCards.forEach((card, index) => {
        const [title, copy] = fitData[index] || [];
        setSelectorText("h3", title, card);
        setSelectorText("p", copy, card);
      });
    }

    const closingSection = document.querySelector(".closing-panel");
    if (closingSection instanceof HTMLElement) {
      setSelectorText(".section-title", t("If You Already Have an Image in Mind, Send It", "Jika Anda Sudah Punya Gambar di Kepala, Kirimkan Saja"), closingSection);
      setSelectorText(".section-copy", t(
        "A custom request does not need a polished brief. One image, one saved reference, or one rough description is enough for us to start shaping the right piece with you.",
        "Permintaan kustom tidak membutuhkan brief yang rapi. Satu gambar, satu referensi tersimpan, atau satu deskripsi kasar sudah cukup bagi kami untuk mulai membentuk karya yang tepat bersama Anda."
      ), closingSection);
      setSelectorText(".custom-primary", t("Share a Reference", "Kirim Referensi"), closingSection);
      setSelectorText(".custom-secondary", t("Back to Services", "Kembali ke Layanan"), closingSection);
    }
  }

  function translateStoriesPage() {
    setDocumentMeta("stories");
    setSelectorText(".stories-empty-title", t("No Journals Yet", "Belum Ada Jurnal"));
    setSelectorText(".stories-empty-copy", t("Add journals from the CMS to fill this page.", "Tambahkan jurnal dari CMS untuk mengisi halaman ini."));
  }

  function translateStoryPage() {
    setDocumentMeta("story");
    setSelectorText(".story-empty-title", t("Journal Not Found", "Jurnal Tidak Ditemukan"));
    setSelectorText(".story-empty-copy", t("Choose a journal from The Journals page.", "Pilih sebuah jurnal dari halaman The Journals."));
    setSelectorText(".related-journals-kicker", t("More to Read", "Baca Juga"));
    setSelectorText(".related-journals-title", t("Related Journals", "Jurnal Terkait"));
  }

  function applyPageTranslations() {
    const pageName = pageNameFromPathname(window.location.pathname);
    translateCommonHeader();
    translateContactPanels();
    if (pageName === "home") translateIndexPage();
    if (pageName === "about") translateAboutPage();
    if (pageName === "faq") translateFaqPage();
    if (pageName === "privacy") translatePrivacyPage();
    if (pageName === "terms") translateTermsPage();
    if (pageName === "gallery") translateGalleryPage();
    if (pageName === "product") translateProductPage();
    if (pageName === "featured") translateFeaturedPage();
    if (pageName === "contact") translateContactPage();
    if (pageName === "services") translateServicesPage();
    if (pageName === "custom") translateCustomPage();
    if (pageName === "stories") translateStoriesPage();
    if (pageName === "story") translateStoryPage();
    translateFooter(document);
    decorateInternalLinks();
    Array.from(document.querySelectorAll(".language-switcher__button")).forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.classList.toggle("is-active", button.dataset.lang === currentLanguage);
    });
  }

  function syncThemeFavicon() {
    const prefersDark = typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const activeTheme = prefersDark ? "dark" : "light";
    const activeIcon = THEME_FAVICONS[activeTheme];
    const lightIcon = THEME_FAVICONS.light;
    const darkIcon = THEME_FAVICONS.dark;

    const defaultIcons = Array.from(document.head.querySelectorAll('link[rel~="icon"]:not([media])'));
    defaultIcons.forEach((link) => {
      if (!(link instanceof HTMLLinkElement)) return;
      link.href = activeIcon.href;
      link.type = activeIcon.type;
    });

    const lightMediaIcon = document.head.querySelector('link[rel~="icon"][media="(prefers-color-scheme: light)"]');
    if (lightMediaIcon instanceof HTMLLinkElement) {
      lightMediaIcon.href = lightIcon.href;
      lightMediaIcon.type = lightIcon.type;
    }

    const darkMediaIcon = document.head.querySelector('link[rel~="icon"][media="(prefers-color-scheme: dark)"]');
    if (darkMediaIcon instanceof HTMLLinkElement) {
      darkMediaIcon.href = darkIcon.href;
      darkMediaIcon.type = darkIcon.type;
    }
  }

  function initializeThemeFavicon() {
    syncThemeFavicon();
    if (themeFaviconBound || typeof window.matchMedia !== "function") return;
    themeFaviconBound = true;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = () => syncThemeFavicon();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleThemeChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleThemeChange);
    }
    window.addEventListener("pageshow", handleThemeChange);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) handleThemeChange();
    });
  }

  function initializeAnalytics() {
    if (analyticsInitialized || !GA_MEASUREMENT_ID) return;
    applyAnalyticsDisabledFlag();
    if (window[`ga-disable-${GA_MEASUREMENT_ID}`]) return;
    analyticsInitialized = true;

    const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`);
    if (!(existingScript instanceof HTMLScriptElement)) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);
    }

    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== "function") {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }

    const existingConfig = Array.isArray(window.dataLayer)
      && window.dataLayer.some((entry) => Array.isArray(entry) && entry[0] === "config" && entry[1] === GA_MEASUREMENT_ID);
    const existingJs = Array.isArray(window.dataLayer)
      && window.dataLayer.some((entry) => Array.isArray(entry) && entry[0] === "js");

    if (!existingJs) window.gtag("js", new Date());
    if (!existingConfig) window.gtag("config", GA_MEASUREMENT_ID);
  }

  function bindWhatsAppTracking() {
    if (whatsappTrackingBound) return;
    whatsappTrackingBound = true;

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a[href*="wa.me/"], a[href*="api.whatsapp.com/"]');
      if (!(link instanceof HTMLAnchorElement)) return;
      if (typeof window.gtag !== "function") return;

      const href = link.href || "";
      const label = (link.getAttribute("aria-label") || link.textContent || "WhatsApp").trim().replace(/\s+/g, " ");
      const section = link.closest("section[id], footer[id], header")?.getAttribute("id") || "";

      window.gtag("event", "whatsapp_click", {
        event_category: "contact",
        event_label: label,
        link_url: href,
        page_path: window.location.pathname,
        page_location: window.location.href,
        section_name: section,
        transport_type: "beacon"
      });
    }, { capture: true });
  }

  let translationScheduled = false;
  function scheduleTranslationPass() {
    if (translationScheduled) return;
    translationScheduled = true;
    window.requestAnimationFrame(() => {
      translationScheduled = false;
      applyPageTranslations();
    });
  }

  function startObserver() {
    if (!(document.body instanceof HTMLElement) || typeof MutationObserver !== "function") return;
    const observer = new MutationObserver(() => {
      scheduleTranslationPass();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  window.MarvellLanguage = {
    getLanguage: function () { return currentLanguage; },
    t: t,
    localizeCategory: localizeCategory,
    localizeCategorySubtitle: localizeCategorySubtitle,
    scheduleTranslationPass: scheduleTranslationPass,
    decorateInternalLinks: decorateInternalLinks
  };

  document.addEventListener("DOMContentLoaded", () => {
    initializeAnalytics();
    bindWhatsAppTracking();
    initializeThemeFavicon();
    ensureLanguageStyles();
    injectLanguageSwitcher();
    window.addEventListener("resize", injectLanguageSwitcher);
    applyPageTranslations();
    startObserver();
  });
}());
