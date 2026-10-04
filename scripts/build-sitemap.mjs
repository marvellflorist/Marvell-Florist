/**
 * Regenerates sitemap.xml.
 *
 * Static pages are listed here; commerce URLs are derived from the committed
 * CMS content so a new collection or SKU appears in the sitemap as soon as it
 * is published, without anyone remembering to edit XML.
 *
 * Cart, checkout and order pages are deliberately excluded — they are per
 * visitor and marked noindex in their own markup.
 *
 * Run with: node scripts/build-sitemap.mjs
 */

import { readFile, writeFile } from "node:fs/promises";

const ORIGIN = "https://marvellflorist.com";

const STATIC_PATHS = [
  "/",
  "/gallery",
  "/gallery?category=standing-flowers",
  "/gallery?category=artificial-flowers",
  "/gallery?category=bouquets",
  "/gallery?category=papan-bunga",
  "/gallery?category=funerals",
  "/gallery?category=parcels",
  "/custom-arrangements",
  "/about",
  "/contact",
  "/services",
  "/faq",
  "/privacy-policy",
  "/terms-conditions",
  "/featured",
  "/journals",
  "/journal"
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const collections = JSON.parse(await readFile("content/collections.json", "utf8")).collections || [];
const products = JSON.parse(await readFile("content/retail-products.json", "utf8")).products || [];

// A collection that has not launched stays out of the index, and so do its
// products: submitting a URL that says "coming soon" earns nothing and dates
// badly in search results.
const unlaunched = new Set(
  collections.filter((collection) => collection.status === "upcoming").map((c) => c.id)
);

// Collections have no pages to submit any more — they group the catalogue,
// and Featured is the retail entry point — but an unlaunched one still keeps
// its products out of the index, so they are read for that alone.
const paths = [
  ...STATIC_PATHS,
  ...products
    .filter((product) => !unlaunched.has(product.collection_id))
    .map((product) => `/product/${product.slug}`)
];

const unique = [...new Set(paths)];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...unique.map((path) => `  <url>\n    <loc>${escapeXml(ORIGIN + path)}</loc>\n  </url>`),
  "</urlset>",
  ""
].join("\n");

await writeFile("sitemap.xml", xml, "utf8");
console.log(`sitemap.xml written with ${unique.length} URLs`);
