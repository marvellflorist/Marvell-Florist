(function () {
  const STORAGE_KEY = "marvell-language";
  const SUPPORTED_LANGUAGES = new Set(["en", "id"]);
  const GA_MEASUREMENT_ID = "G-Z9PJ60V3CR";
  const THEME_FAVICONS = {
    light: { href: "/assets/logo.webp?v=5", type: "image/webp" },
    dark: { href: "/assets/darklogo.png?v=2", type: "image/png" }
  };
  let themeFaviconBound = false;
  let analyticsInitialized = false;
  let whatsappTrackingBound = false;

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
      en: "Marvell Florist | Featured Collection",
      id: "Marvell Florist | Koleksi Unggulan"
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
    }
  };

  const CATEGORY_DATA = {
    "artificial-flowers": {
      en: "Artificial Flowers",
      id: "Bunga Artifisial",
      subtitleEn: "Artificial floral arrangements for decorative use and long-lasting display.",
      subtitleId: "Rangkaian bunga artifisial untuk kebutuhan dekoratif dan penggunaan jangka panjang."
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
      en: "Featured",
      id: "Unggulan"
    }
  };

  const CATEGORY_ALIASES = new Map([
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
    "Featured": "Unggulan",
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
    ".language-switcher{display:inline-flex;align-items:center;gap:4px;margin-left:10px;pointer-events:auto;color:inherit;}",
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
        const searchToggle = bar.querySelector(".search-mobile-trigger, .search-toggle");
        const menuToggle = bar.querySelector(".menu-toggle");
        if (searchToggle && searchToggle.parentNode === bar) {
          if (searchToggle.previousSibling !== switcher) {
            bar.insertBefore(switcher, searchToggle);
          }
        } else if (menuToggle && menuToggle.parentNode === bar) {
          bar.insertBefore(switcher, menuToggle);
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
      const href = node.getAttribute("href") || "";
      if (href === "about.html" || href === "#about") setText(node, t("About", "Tentang"));
      if (href.includes("#services")) setText(node, t("Services", "Layanan"));
      if (href.includes("#reviews")) setText(node, t("Reviews", "Ulasan"));
      if (href.includes("#featured")) setText(node, t("Featured", "Unggulan"));
      if (href.includes("gallery.html?category=By%20Request") || href.includes("gallery.html?category=by-request")) {
        setText(node, t("By Request", "Sesuai Permintaan"));
      }
    });
    Array.from(document.querySelectorAll(".menu-link-contact")).forEach((node) => {
      setText(node, t("Contact Us", "Hubungi Kami"));
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
      if (href.includes("#services")) setText(link, t("Contact Us", "Hubungi Kami"));
      if (href.includes("privacy-policy.html")) setText(link, t("Privacy", "Privasi"));
      if (href.includes("terms-conditions.html")) setText(link, t("Terms", "Ketentuan"));
      if (href.includes("faq.html")) setText(link, t("FAQ", "FAQ"));
      if (href.includes("#featured")) setText(link, t("Featured", "Unggulan"));
      if (href.includes("gallery.html?category=")) {
        const category = new URL(link.href, window.location.href).searchParams.get("category") || "";
        setText(link, localizeCategory(category));
      }
      if (href.includes("about.html#journey") || href === "#journey") setText(link, t("Our Journey", "Perjalanan Kami"));
      if (href.includes("about.html#craft") || href === "#craft") setText(link, t("Our Craft", "Karya Kami"));
      if (href.includes("about.html#team") || href === "#team") setText(link, t("Our Team", "Tim Kami"));
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
    setSelectorText(".collection-promo-link", t("Featured Collection - Explore the arrangements", "Koleksi Unggulan - Jelajahi rangkaian"));
    setSelectorText(".home-hero-link", t("Discover the Collection", "Jelajahi Koleksi"));
    setSelectorText(".home-quote-cta", t("View the creations", "Lihat karya kami"));
    setSelectorText("#featured-kicker", t("Seasonal Collection", "Koleksi Musiman"));
    setSelectorText("#featured-title", t("Featured Collection", "Koleksi Unggulan"));
    setSelectorText("#featured-lead", t("Each arrangement is custom-made. Final details and pricing are confirmed during consultation.", "Setiap rangkaian dibuat khusus. Detail akhir dan harga dikonfirmasi saat konsultasi."));
    setSelectorText("#portfolio-kicker", t("OUR WORK", "KARYA KAMI"));
    setSelectorText("#portfolio-heading", t("The Portfolio", "Portofolio"));
    setSelectorText("#portfolio-lead", t("A study of form, texture, and composition", "Sebuah studi tentang bentuk, tekstur, dan komposisi"));
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
    setSelectorText(".contact-slogan", t("An array of thoughtfully tailored floral services, designed for every moment and setting.", "Rangkaian layanan bunga yang disesuaikan untuk setiap momen, ruang, dan kebutuhan Anda."));

    Array.from(document.querySelectorAll("#services .service-kicker")).forEach((node) => {
      setText(node, t("Service", "Layanan"));
    });

    const serviceCards = Array.from(document.querySelectorAll("#services .service-card"));
    if (serviceCards[0] instanceof HTMLElement) {
      setSelectorText(".service-title", t("Book an Appointment", "Jadwalkan Konsultasi"), serviceCards[0]);
      setSelectorText(".service-desc", t("Enjoy priority access to our boutique at the time that fits you. Our florist will guide you through tailored options for your occasion.", "Dapatkan akses prioritas ke butik kami di waktu yang paling sesuai. Florist kami akan membantu menyiapkan pilihan terbaik untuk momen Anda."), serviceCards[0]);
      setSelectorText(".service-link", t("Book an In-Store Appointment", "Buat Janji Kunjungan"), serviceCards[0]);
    }
    if (serviceCards[1] instanceof HTMLElement) {
      setSelectorText(".service-title", t("Personalization", "Personalisasi"), serviceCards[1]);
      setSelectorText(".service-desc", t("Refine bouquet style, wrapping, cards, and finishing details to create a gift that feels personal and memorable.", "Sesuaikan gaya buket, wrapping, kartu, dan detail akhir agar hadiah terasa lebih personal dan berkesan."), serviceCards[1]);
      setSelectorText(".service-link", t("Discuss Personalization", "Diskusikan Personalisasi"), serviceCards[1]);
    }
    if (serviceCards[2] instanceof HTMLElement) {
      setSelectorText(".service-title", t("Collect In Store", "Ambil di Toko"), serviceCards[2]);
      setSelectorText(".service-desc", t("Order ahead and collect directly from our Batam location with timing coordinated by our team for a smooth pickup.", "Pesan terlebih dahulu dan ambil langsung di lokasi kami di Batam dengan waktu pengambilan yang diatur bersama tim kami."), serviceCards[2]);
      setSelectorText(".service-link", t("Get Store Directions", "Lihat Arah Toko"), serviceCards[2]);
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
    setSelectorText("#search-query-filter", t("Filter", "Filter"));
    setSelectorText("#search-keywords-heading", t("Related Searches", "Pencarian Terkait"));
    setSelectorText("#search-products-heading", t("Recommended Products", "Produk Rekomendasi"));
    const featuredHeading = document.getElementById("search-featured-heading");
    if (featuredHeading instanceof HTMLElement) {
      const raw = featuredHeading.textContent || "";
      if (!raw.trim() || /ramadan|eid|koleksi/i.test(raw)) {
        featuredHeading.textContent = t("Ramadan & Eid Collection", "Koleksi Ramadan & Eid");
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
    const breadcrumb = document.querySelector(".breadcrumb");
    if (breadcrumb instanceof HTMLElement) {
      const nodes = breadcrumb.querySelectorAll("span");
      setText(nodes[0], t("About", "Tentang"));
    }
    setSelectorText(".hero h1", t("About Marvell Florist", "Tentang Marvell Florist"));
    setSelectorText(".hero-lead", t("Since 2006 we have served Batam with custom floral work built on consistency, detail, and trust.", "Sejak 2006 kami melayani Batam dengan karya floral kustom yang dibangun atas konsistensi, detail, dan kepercayaan."));
    setSelectorText("#journey h2", t("Our Journey", "Perjalanan Kami"));
    setSelectorHtml("#journey p", currentLanguage === "id"
      ? '<span class="lede-sentence">Marvell Florist dimulai sebagai usaha keluarga pada tahun 2006.</span>Kami terus berkembang lewat berbagai renovasi, perpindahan lokasi, dan pengalaman yang kami jalani dari waktu ke waktu. Hari ini, Marvell Florist menjadi tempat yang banyak dipilih untuk berbagai momen, mulai dari perayaan, belasungkawa, sampai kebutuhan sehari-hari. Bagi kami, bunga adalah cara sederhana untuk menyampaikan makna, dan itu yang terus kami pegang sampai sekarang.'
      : '<span class="lede-sentence">Marvell Florist began as a small family business in 2006.</span>Over the years the shop has grown slowly through renovation, relocation, and continuous learning. What started as a neighborhood florist gradually became a place people return to for celebrations, condolences, and everyday gestures. Flowers remain a quiet way for people to express meaning, and that is the role we continue to serve today.');
    setSelectorText("#craft h2", t("Our Craft", "Karya Kami"));
    setSelectorHtml("#craft p", currentLanguage === "id"
      ? '<span class="lede-sentence">Sebagian besar rangkaian di Marvell Florist dibuat khusus untuk setiap pelanggan.</span>Kami fokus pada warna, bentuk, dan keseimbangan supaya setiap buket terlihat rapi dan terasa pas. Pengalaman dan pelatihan yang kami jalani membentuk cara kami bekerja sampai hari ini. Setiap rangkaian disusun dengan teliti agar hasil akhirnya terasa utuh dan bermakna.'
      : '<span class="lede-sentence">Most arrangements at Marvell Florist are designed specifically for each customer.</span>Instead of following fixed templates, we focus on balance, color, and movement so every bouquet feels intentional and natural. Years of experience and professional training have shaped the way we approach floral work, allowing each arrangement to be assembled carefully with attention to detail.');
    setSelectorText("#team h2", t("Our Team", "Tim Kami"));
    setSelectorHtml("#team p", currentLanguage === "id"
      ? '<span class="lede-sentence">Marvell Florist dijalankan oleh tim kecil yang sudah berpengalaman dan bekerja bersama selama bertahun-tahun.</span>Beberapa anggota tim sudah bersama kami sejak lama, jadi cara kerja dan kualitasnya tetap konsisten. Setiap rangkaian disiapkan dengan perhatian, supaya bunga yang diterima terasa tulus, rapi, dan enak dilihat.'
      : '<span class="lede-sentence">Marvell Florist is supported by a small and experienced team that has worked together for many years.</span>Some members have been part of the shop since the early days, contributing to the consistency and character of the store. Every arrangement is prepared with care so customers receive flowers that feel thoughtful, balanced, and meaningful.');
    translateFooter(document);
  }

  function translateFaqPage() {
    setDocumentMeta("faq");
    setSelectorText("main h1", t("Frequently Asked Questions", "Pertanyaan yang Sering Diajukan"));
    setSelectorText("main .lead", t("Find quick answers to the questions customers ask most often before placing an order.", "Temukan jawaban singkat untuk pertanyaan yang paling sering diajukan sebelum melakukan pemesanan."));
    const wrap = document.getElementById("faq-wrap");
    if (!(wrap instanceof HTMLElement)) return;
    const items = FAQ_ITEMS[currentLanguage];
    wrap.innerHTML = items.map((item) => `
      <article class="faq-item">
        <button class="faq-toggle" type="button" aria-expanded="false">
          <strong>${item.question}</strong>
          <span class="faq-icon" aria-hidden="true">+</span>
        </button>
        <div class="faq-panel">
          <p class="faq-content">${item.answer}</p>
        </div>
      </article>
    `).join("");
    const faqItems = Array.from(wrap.querySelectorAll(".faq-item"));
    faqItems.forEach((item) => {
      const toggle = item.querySelector(".faq-toggle");
      const panel = item.querySelector(".faq-panel");
      if (!(toggle instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return;
      toggle.addEventListener("click", () => {
        const shouldOpen = !item.classList.contains("is-open");
        faqItems.forEach((other) => {
          other.classList.remove("is-open");
          const otherToggle = other.querySelector(".faq-toggle");
          const otherPanel = other.querySelector(".faq-panel");
          if (otherToggle instanceof HTMLButtonElement) otherToggle.setAttribute("aria-expanded", "false");
          if (otherPanel instanceof HTMLElement) otherPanel.style.maxHeight = "0px";
        });
        if (!shouldOpen) return;
        item.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = `${panel.scrollHeight}px`;
      });
    });
  }

  function translatePrivacyPage() {
    setDocumentMeta("privacy");
    const stack = document.querySelector(".stack");
    if (!(stack instanceof HTMLElement)) return;
    setSelectorText("main h1", t("Privacy Policy", "Kebijakan Privasi"));
    stack.innerHTML = currentLanguage === "id"
      ? '<p>Marvell Florist menghormati privasi Anda.</p><p>Situs ini tidak secara langsung mengumpulkan data pribadi. Namun, ketika Anda menghubungi kami melalui WhatsApp atau platform lain, kami dapat menerima informasi seperti nama dan detail kontak Anda.</p><p>Informasi tersebut hanya digunakan untuk:</p><ul><li>menanggapi pertanyaan</li><li>memberikan layanan dan menyiapkan rangkaian</li></ul><p>Kami tidak menjual, membagikan, atau mendistribusikan informasi pribadi Anda kepada pihak ketiga.</p><p>Beberapa data teknis dasar, seperti alamat IP atau jenis browser, dapat diproses secara otomatis untuk memastikan situs berfungsi dengan baik.</p><p>Jika Anda memiliki pertanyaan, Anda dapat menghubungi kami melalui WhatsApp.</p>'
      : '<p>Marvell Florist respects your privacy.</p><p>This website does not directly collect personal data. However, when you contact us through WhatsApp or other platforms, we may receive information such as your name and contact details.</p><p>This information is used solely to:</p><ul><li>respond to inquiries</li><li>provide services and arrangements</li></ul><p>We do not sell, share, or distribute your personal information to third parties.</p><p>Some basic technical data, such as IP address or browser type, may be processed automatically to ensure the website functions properly.</p><p>If you have any questions, you may contact us through WhatsApp.</p>';
  }

  function translateTermsPage() {
    setDocumentMeta("terms");
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
  }

  function translateGalleryDynamicText() {
    const activeGalleryCategory = new URL(window.location.href).searchParams.get("category") || "";
    setSelectorText(
      "#mobile-category-label",
      activeGalleryCategory ? localizeCategory(activeGalleryCategory) : t("Categories", "Kategori")
    );
    setSelectorText(".mobile-category-title", t("Categories", "Kategori"));
    setSelectorText("#gallery-portfolio-note", t("Most pieces are made to order, so availability and flower selection should be confirmed first.", "Sebagian besar karya dibuat khusus, jadi ketersediaan dan pilihan bunga perlu dikonfirmasi terlebih dahulu."));
    setSelectorText("#collection-hook", t("Not every arrangement begins in a catalog. Some start with a conversation.", "Tidak semua rangkaian berawal dari katalog. Sebagiannya dimulai dari percakapan."));
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

    Array.from(document.querySelectorAll(".filter-group-title,.filter-option span,.filter-range-note,.filter-clear,.filters-count,#products-grid p,.collection-cta,.search-query-tab,.search-query-count")).forEach((node) => {
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
    translateGalleryDynamicText();
    if (typeof window.syncGallerySeoMeta === "function") window.syncGallerySeoMeta();
    translateFooter(document);
  }

  function translateProductPage() {
    setDocumentMeta("product");
    setSelectorText("#product-whatsapp", t("Consult via WhatsApp", "Konsultasi via WhatsApp"));
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
    setSelectorText("#featured-title", t("Featured Collection", "Koleksi Unggulan"));
    setSelectorText("#featured-lead", t("The active campaign collection is shown below.", "Koleksi kampanye aktif ditampilkan di bawah ini."));
    Array.from(document.querySelectorAll(".featured-consult-btn,.featured-collection-btn")).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const raw = node.textContent || "";
      if (/view all/i.test(raw)) setText(node, t("View All Products", "Lihat Semua Produk"));
      else if (/consult/i.test(raw)) setText(node, t("Consult", "Konsultasi"));
    });
    Array.from(document.querySelectorAll(".featured-warning")).forEach((node) => {
      setText(node, t("Prices and availability may vary based on seasonal flowers.", "Harga dan ketersediaan dapat berubah sesuai bunga musiman."));
    });
  }

  function translateContactPage() {
    setDocumentMeta("contact");
    Array.from(document.querySelectorAll(".nav-links a")).forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      const href = link.getAttribute("href") || "";
      if (href === "index.html") setText(link, t("Home", "Beranda"));
      if (href === "about.html") setText(link, t("About", "Tentang"));
      if (href === "contact.html") setText(link, t("Contact", "Kontak"));
    });
    setSelectorText(".nav-links a.active", t("Contact", "Kontak"));
    setSelectorText(".page-header h1", t("Contact Us", "Hubungi Kami"));
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
