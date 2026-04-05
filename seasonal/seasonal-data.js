const ORDER_PHONE = "6281275017456";

const seasonalEvents = [
  {
    id: "eid",
    title: "Ramadan & Eid Collection",
    start: "03-07",
    end: "04-01",
    priority: 10,
    description: "",
    collectionHref: "#collection-eid",
    buttonTheme: "light",
    products: [
      { name: "Eid Parcel Signature", image: "", priceStart: 400000 },
      { name: "Festive Hamper Bloom", image: "", priceStart: 450000 },
      { name: "Golden Celebration Bouquet", image: "", priceStart: 250000 },
      { name: "White Blessing Bouquet", image: "", priceStart: 210000 },
      { name: "Soft Pink Eid Bouquet", image: "", priceStart: 180000 },
      { name: "Classic Red-Pink Bouquet", image: "", priceStart: 200000 },
      { name: "Family Gathering Bloom Box", image: "", priceStart: 220000 },
      { name: "Moonlight Bloom Arrangement", image: "", priceStart: 260000 }
    ]
  },
  {
    id: "valentine",
    title: "Valentine's Day Collection",
    start: "02-01",
    end: "02-16",
    priority: 9,
    description: "Romantic bouquets and rose-forward arrangements for Valentine's moments.",
    collectionHref: "#collection-valentine",
    buttonTheme: "light",
    products: [
      { name: "Romantic Rose Bloom", image: "", priceStart: 220000 },
      { name: "Heart Note Bouquet", image: "", priceStart: 250000 },
      { name: "Love Bloom Red-Pink", image: "", priceStart: 210000 },
      { name: "Sweet Pink Romance", image: "", priceStart: 180000 },
      { name: "Big Love Bouquet", image: "", priceStart: 320000 },
      { name: "Round Rose Statement", image: "", priceStart: 350000 },
      { name: "Petite Love Bloom", image: "", priceStart: 170000 },
      { name: "Pastel Romance", image: "", priceStart: 190000 }
    ]
  },
  {
    id: "cny",
    title: "Chinese New Year Collection",
    start: "01-01",
    end: "01-31",
    priority: 8,
    description: "Prosperity-themed arrangements and festive flowers for Lunar New Year gifting.",
    collectionHref: "#collection-cny",
    buttonTheme: "light",
    products: [
      { name: "Prosperity Hamper", image: "", priceStart: 500000 },
      { name: "CNY Parcel Premium", image: "", priceStart: 420000 },
      { name: "Golden Year Bouquet", image: "", priceStart: 280000 },
      { name: "Lucky Bloom Red Gold", image: "", priceStart: 300000 },
      { name: "Sunshine Prosperity Box", image: "", priceStart: 240000 },
      { name: "Fortune Basket Arrangement", image: "", priceStart: 230000 },
      { name: "Festive Standing Flower", image: "", priceStart: 1000000 },
      { name: "Auspicious Yellow Bloom", image: "", priceStart: 210000 }
    ]
  },
  {
    id: "cny_mid",
    title: "Chinese New Year Collection",
    start: "02-17",
    end: "03-06",
    priority: 8,
    description: "Prosperity-themed arrangements and festive flowers for Lunar New Year gifting.",
    collectionHref: "#collection-cny",
    buttonTheme: "light",
    products: [
      { name: "Prosperity Hamper", image: "", priceStart: 500000 },
      { name: "CNY Parcel Premium", image: "", priceStart: 420000 },
      { name: "Golden Year Bouquet", image: "", priceStart: 280000 },
      { name: "Lucky Bloom Red Gold", image: "", priceStart: 300000 },
      { name: "Sunshine Prosperity Box", image: "", priceStart: 240000 },
      { name: "Fortune Basket Arrangement", image: "", priceStart: 230000 },
      { name: "Festive Standing Flower", image: "", priceStart: 1000000 },
      { name: "Auspicious Yellow Bloom", image: "", priceStart: 210000 }
    ]
  },
  {
    id: "mothers_day",
    title: "Mother's Day Collection",
    start: "05-01",
    end: "05-16",
    priority: 7,
    description: "Pink bouquets and appreciation flowers designed for Mother's Day gifting.",
    collectionHref: "#collection-mothers-day",
    buttonTheme: "dark",
    products: [
      { name: "Blush Appreciation Bouquet", image: "", priceStart: 220000 },
      { name: "Rose Thank You Bouquet", image: "", priceStart: 230000 },
      { name: "Soft Bloom Pink", image: "", priceStart: 180000 },
      { name: "Mother's Day Round Bloom", image: "", priceStart: 340000 },
      { name: "Elegant Pink Purples", image: "", priceStart: 210000 },
      { name: "Classic White-Pink Stand", image: "", priceStart: 1000000 },
      { name: "Pastel Blessing Arrangement", image: "", priceStart: 1000000 },
      { name: "Warm Pink Bloom Box", image: "", priceStart: 240000 }
    ]
  },
  {
    id: "christmas",
    title: "Christmas Collection",
    start: "12-01",
    end: "12-27",
    priority: 6,
    description: "Festive bouquets and hampers for year-end celebrations and gifting.",
    collectionHref: "#collection-christmas",
    buttonTheme: "light",
    products: [
      { name: "Christmas Gift Hamper", image: "", priceStart: 450000 },
      { name: "Festive Red Bouquet", image: "", priceStart: 230000 },
      { name: "Holiday Pink-Red Round", image: "", priceStart: 350000 },
      { name: "Joyful Gold Accent Bouquet", image: "", priceStart: 280000 },
      { name: "Holiday Bloom Box", image: "", priceStart: 230000 },
      { name: "Winter White Arrangement", image: "", priceStart: 1000000 },
      { name: "Celebration Standing Flower", image: "", priceStart: 1000000 },
      { name: "Festive Sunflower Mix", image: "", priceStart: 220000 }
    ]
  },
  {
    id: "graduation",
    title: "Graduation Bouquets",
    start: "04-16",
    end: "04-30",
    priority: 4,
    description: "Graduation bouquets and teddy bouquet styles for campus celebrations.",
    collectionHref: "#collection-graduation",
    buttonTheme: "light",
    products: [
      { name: "Black-Gold Graduation Bouquet", image: "", priceStart: 260000 },
      { name: "Graduation Wood Board Flower", image: "", priceStart: 180000 },
      { name: "Money Bouquet Blue", image: "", priceStart: 270000 },
      { name: "Money Bouquet Round Blue", image: "", priceStart: 300000 },
      { name: "Classic Graduation Pink", image: "", priceStart: 180000 },
      { name: "Bright Congrats Bouquet", image: "", priceStart: 210000 },
      { name: "Premium Pink Congratulations", image: "", priceStart: 320000 },
      { name: "Compact Graduation Bouquet", image: "", priceStart: 170000 }
    ]
  },
  {
    id: "graduation_late",
    title: "Graduation Bouquets",
    start: "05-17",
    end: "07-31",
    priority: 4,
    description: "Graduation bouquets and teddy bouquet styles for campus celebrations.",
    collectionHref: "#collection-graduation",
    buttonTheme: "light",
    products: [
      { name: "Black-Gold Graduation Bouquet", image: "", priceStart: 260000 },
      { name: "Graduation Wood Board Flower", image: "", priceStart: 180000 },
      { name: "Money Bouquet Blue", image: "", priceStart: 270000 },
      { name: "Money Bouquet Round Blue", image: "", priceStart: 300000 },
      { name: "Classic Graduation Pink", image: "", priceStart: 180000 },
      { name: "Bright Congrats Bouquet", image: "", priceStart: 210000 },
      { name: "Premium Pink Congratulations", image: "", priceStart: 320000 },
      { name: "Compact Graduation Bouquet", image: "", priceStart: 170000 }
    ]
  }
];

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

function isSeasonalEventActive(event, today = new Date()) {
  const startPart = parseMonthDay(event?.start);
  const endPart = parseMonthDay(event?.end);
  if (!startPart || !endPart) return false;

  const now = toLocalStartOfDay(today);
  const year = now.getFullYear();

  const startDate = new Date(year, startPart.month - 1, startPart.day);
  const endDate = new Date(year, endPart.month - 1, endPart.day);

  // Supports both same-year and year-wrap windows.
  if (endDate >= startDate) {
    return now >= startDate && now <= endDate;
  }
  return now >= startDate || now <= endDate;
}

function sortSeasonalByPriority(events) {
  return [...events].sort((a, b) => {
    const byPriority = (Number(b.priority) || 0) - (Number(a.priority) || 0);
    if (byPriority !== 0) return byPriority;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

function getActiveSeasonalEvents(today = new Date()) {
  return sortSeasonalByPriority(seasonalEvents.filter((event) => isSeasonalEventActive(event, today)));
}

function getTopPrioritySeasonalEvent(today = new Date()) {
  return getActiveSeasonalEvents(today)[0] || null;
}

function formatRupiah(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `Rp${new Intl.NumberFormat("id-ID").format(Math.round(amount))}`;
}

function buildWhatsAppOrderHref(eventTitle, productName, priceStart, phone = ORDER_PHONE) {
  const lines = [
    "Halo Marvell Florist, saya ingin pesan dari koleksi ini.",
    "",
    `Koleksi: ${eventTitle}`
  ];
  const cleanProductName = String(productName || "").trim();
  if (cleanProductName) lines.push(`Produk: ${cleanProductName}`);
  const text = lines.join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export {
  ORDER_PHONE,
  seasonalEvents,
  isSeasonalEventActive,
  getActiveSeasonalEvents,
  getTopPrioritySeasonalEvent,
  formatRupiah,
  buildWhatsAppOrderHref
};
