(function () {
  if (typeof window === "undefined") return;
  if (window.MarvellConsultation) return;

  function getLanguage() {
    return window.MarvellLanguage?.getLanguage?.() === "id" ? "id" : "en";
  }

  function t(en, id) {
    return getLanguage() === "id" ? id : en;
  }

  function normalizeSingleLine(value) {
    return String(value ?? "")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");
  }

  function getBusinessDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      year: Number.parseInt(map.year || "0", 10),
      month: Number.parseInt(map.month || "0", 10),
      day: Number.parseInt(map.day || "0", 10),
      hour: Number.parseInt(map.hour || "0", 10)
    };
  }

  function buildBusinessDateValue(year, month, day) {
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  function toIsoDate(value) {
    const raw = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "";
    return [
      parsed.getUTCFullYear(),
      String(parsed.getUTCMonth() + 1).padStart(2, "0"),
      String(parsed.getUTCDate()).padStart(2, "0")
    ].join("-");
  }

  function formatDateShort(value) {
    const iso = toIsoDate(value);
    if (!iso) return "";
    const [year, month, day] = iso.split("-");
    return `${day}/${month}/${year.slice(-2)}`;
  }

  function formatPreferredDate(value) {
    const iso = toIsoDate(value);
    if (!iso) return "";
    const [year, month, day] = iso.split("-").map((part) => Number.parseInt(part, 10));
    const parsed = buildBusinessDateValue(year, month, day);
    return new Intl.DateTimeFormat(getLanguage() === "id" ? "id-ID" : "en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(parsed);
  }

  function getCurrentBusinessDateIso(date = new Date()) {
    const parts = getBusinessDateParts(date);
    return [
      parts.year,
      String(parts.month).padStart(2, "0"),
      String(parts.day).padStart(2, "0")
    ].join("-");
  }

  function getAvailableDateOptions(count = 7) {
    const nowParts = getBusinessDateParts(new Date());
    const startValue = buildBusinessDateValue(nowParts.year, nowParts.month, nowParts.day);
    return Array.from({ length: count }, (_, index) => {
      const next = new Date(startValue.getTime());
      next.setUTCDate(startValue.getUTCDate() + index);
      const iso = [
        next.getUTCFullYear(),
        String(next.getUTCMonth() + 1).padStart(2, "0"),
        String(next.getUTCDate()).padStart(2, "0")
      ].join("-");
      const isUnavailable = nowParts.hour >= 18 && index === 0;
      return {
        value: iso,
        shortLabel: formatDateShort(iso),
        longLabel: formatPreferredDate(iso),
        isUnavailable,
        availabilityNote: isUnavailable ? t("From Tomorrow", "Mulai Besok") : ""
      };
    });
  }

  function isMorningTimeUnavailable(preferredDate, date = new Date()) {
    const iso = toIsoDate(preferredDate);
    if (!iso) return false;
    const parts = getBusinessDateParts(date);
    return iso === getCurrentBusinessDateIso(date) && parts.hour >= 13;
  }

  function buildProductMessage(options = {}) {
    const productName = normalizeSingleLine(options.productName || options.title || "");
    const quantity = Math.max(0, Number.parseInt(String(options.quantity ?? 0), 10) || 0);
    const preferredDate = formatPreferredDate(options.preferredDate);
    const message = normalizeSingleLine(options.message);
    const notes = normalizeSingleLine(options.notes);
    const link = String(options.link || "").trim();
    const giftingEnabled = options.giftingEnabled === true || Boolean(options.cardChoice);
    const cardChoice = String(options.cardChoice || "").trim();
    const deliveryMethod = String(options.deliveryMethod || "").trim();
    const pickupAddress = normalizeSingleLine(options.pickupAddress || "");
    const timeWindow = String(options.timeWindow || "").trim();
    const subject = productName || t("this arrangement", "rangkaian ini");
    const lines = [
      getLanguage() === "id"
        ? `Halo, saya tertarik dengan ${subject}`
        : `Hello, I'm interested in ${subject}`
    ];

    if (quantity > 1) {
      lines.push(`${t("Quantity", "Jumlah")}: ${quantity}`);
    }
    if (giftingEnabled) {
      const cardLabel = cardChoice === "add-message"
        ? t("Add a message", "Tambah pesan")
        : t("Blank card", "Kartu kosong");
      lines.push(`${t("Card", "Kartu")}: ${cardLabel}`);
    }
    if (preferredDate) {
      lines.push(`${t("Date", "Tanggal")}: ${preferredDate}`);
    }
    if (deliveryMethod) {
      const deliveryLabel = deliveryMethod === "pickup"
        ? t("Pickup", "Ambil sendiri")
        : t("Delivery", "Pengantaran");
      lines.push(`${t("Delivery or pickup", "Pengantaran atau ambil sendiri")}: ${deliveryLabel}`);
      if (deliveryMethod === "pickup" && pickupAddress) {
        lines.push(`${t("Pickup point", "Titik pengambilan")}: ${pickupAddress}`);
      }
    }
    if (timeWindow) {
      const timeLabel = timeWindow === "afternoon"
        ? `${t("Afternoon", "Siang")} (13:00-18:00)`
        : `${t("Morning", "Pagi")} (08:00-13:00)`;
      lines.push(`${t("Time", "Waktu")}: ${timeLabel}`);
    }
    if (message) {
      lines.push(`${t("Message", "Pesan")}: ${message}`);
    }
    if (notes) {
      lines.push(`${t("Notes", "Catatan")}: ${notes}`);
    }
    if (link) {
      lines.push(`${t("Link", "Tautan")}: ${link}`);
    }

    return lines.join("\n");
  }

  function buildProductHref(phone, options = {}) {
    const digits = String(phone || "").replace(/[^\d]/g, "");
    const message = buildProductMessage(options);
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  window.MarvellConsultation = {
    buildProductHref,
    buildProductMessage,
    formatDateShort,
    formatPreferredDate,
    getCurrentBusinessDateIso,
    getAvailableDateOptions,
    getLanguage,
    isMorningTimeUnavailable,
    normalizeSingleLine,
    toIsoDate,
    t
  };
})();
