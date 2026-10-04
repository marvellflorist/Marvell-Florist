/**
 * Server-side reader for the Decap-owned catalogue.
 *
 * content/retail-products.json and content/collections.json are committed to
 * git and deployed as static files. Functions read them from disk (bundled via
 * `included_files` in netlify.toml) and fall back to fetching them from the
 * deployed site if the bundle ever misses them.
 *
 * Content from the CMS is sanitised here, not at render time, because it is
 * also written into WhatsApp links and order snapshots.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { config, isCommerceTestMode } from "./env.mjs";

const CACHE_TTL_MS = 60_000;
const cache = new Map();

async function loadJson(relativePath) {
  const cached = cache.get(relativePath);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  let parsed = null;

  // Preferred: the file bundled alongside the function.
  for (const candidate of [
    path.join(process.cwd(), relativePath),
    path.join(process.cwd(), "..", relativePath)
  ]) {
    try {
      parsed = JSON.parse(await readFile(candidate, "utf8"));
      break;
    } catch (_error) {
      // Try the next location.
    }
  }

  // Fallback: the published static file.
  if (!parsed) {
    try {
      const response = await fetch(`${config.siteOrigin}/${relativePath}`, {
        headers: { accept: "application/json" }
      });
      if (response.ok) parsed = await response.json();
    } catch (error) {
      console.error("[catalog] remote fetch failed", error?.message);
    }
  }

  const value = parsed || null;
  cache.set(relativePath, { at: Date.now(), value });
  return value;
}

function text(value, max = 2000) {
  return String(value ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

/**
 * Image paths from the CMS are forced to be site-relative. This stops a
 * compromised or mistaken CMS entry from pointing at an external tracker, and
 * blocks `javascript:` and `data:` URLs from reaching an <img> or <a>.
 */
export function safeImagePath(value) {
  const raw = text(value, 500);
  if (!raw) return "";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const origin = new URL(config.siteOrigin);
      if (url.hostname === origin.hostname) return `${url.pathname}${url.search}`;
    } catch (_error) {
      return "";
    }
  }
  return "";
}

/** Only YouTube and Vimeo embeds are accepted as collection trailers. */
export function safeTrailerUrl(value) {
  const raw = text(value, 500);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return "";
    const allowed = [
      "youtube.com",
      "www.youtube.com",
      "youtu.be",
      "player.vimeo.com",
      "vimeo.com"
    ];
    return allowed.includes(url.hostname) ? url.toString() : "";
  } catch (_error) {
    return "";
  }
}

function normaliseProduct(raw) {
  if (!raw || typeof raw !== "object") return null;
  const sku = text(raw.sku, 20).toUpperCase();
  if (!/^[A-Z0-9]{2,6}-[0-9]{2,3}$/.test(sku)) return null;

  const images = (Array.isArray(raw.images) ? raw.images : [])
    .map((entry) => {
      const image = safeImagePath(typeof entry === "string" ? entry : entry?.image);
      if (!image) return null;
      return { image, alt: text(typeof entry === "object" ? entry?.alt : "", 200) };
    })
    .filter(Boolean);

  return {
    sku,
    slug: text(raw.slug, 120).toLowerCase(),
    name: text(raw.name, 160) || sku,
    collection_id: text(raw.collection_id, 120),
    images,
    description: text(raw.description, 2000),
    composition: text(raw.composition, 1000),
    dimensions: text(raw.dimensions, 200),
    care_notes: text(raw.care_notes, 1000),
    fresh_interpretation_available: raw.fresh_interpretation_available !== false,
    tags: (Array.isArray(raw.tags) ? raw.tags : []).map((tag) => text(tag, 40)).filter(Boolean).slice(0, 12),
    styling_notes: text(raw.styling_notes, 1000)
  };
}

function normaliseCollection(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = text(raw.id, 120);
  const slug = text(raw.slug, 120).toLowerCase();
  if (!id || !slug) return null;

  const status = ["active", "upcoming", "archived"].includes(text(raw.status, 20))
    ? text(raw.status, 20)
    : "upcoming";

  return {
    id,
    slug,
    title: text(raw.title, 160) || id,
    status,
    kicker: text(raw.kicker, 80),
    launch_date: text(raw.launch_date, 20),
    end_date: text(raw.end_date, 20),
    hero_image: safeImagePath(raw.hero_image),
    trailer_url: safeTrailerUrl(raw.trailer_url),
    description: text(raw.description, 2000),
    editorial_copy: text(raw.editorial_copy, 4000),
    palette: (Array.isArray(raw.palette) ? raw.palette : [])
      .map((entry) => {
        const hex = text(entry?.hex, 9);
        if (!/^#[0-9a-fA-F]{3,8}$/.test(hex)) return null;
        return { name: text(entry?.name, 60), hex };
      })
      .filter(Boolean)
      .slice(0, 12),
    product_ids: (Array.isArray(raw.product_ids) ? raw.product_ids : [])
      .map((sku) => text(sku, 20).toUpperCase())
      .filter((sku) => /^[A-Z0-9]{2,6}-[0-9]{2,3}$/.test(sku)),
    seo_title: text(raw.seo_title, 200),
    seo_description: text(raw.seo_description, 400)
  };
}

/**
 * The Mother's Day commerce prototype, or null.
 *
 * Read through the same loader and the same normalisers as real inventory, so
 * the prototype cannot take a shortcut the catalogue would not allow. Returns
 * nothing at all unless MARVELL_COMMERCE_TEST is on.
 */
export async function loadCommerceTestOverlay() {
  if (!isCommerceTestMode()) return null;
  const data = await loadJson("content/_dev-mothers-day-commerce.json");
  if (!data) return null;
  return {
    collection: normaliseCollection(data.collection),
    products: (Array.isArray(data.products) ? data.products : [])
      .map(normaliseProduct)
      .filter(Boolean),
    commerce: data.commerce && typeof data.commerce === "object" ? data.commerce : {}
  };
}

export async function loadRetailProducts() {
  const data = await loadJson("content/retail-products.json");
  const list = Array.isArray(data?.products) ? data.products : [];
  const products = list.map(normaliseProduct).filter(Boolean);

  const overlay = await loadCommerceTestOverlay();
  if (!overlay?.products.length) return products;

  // Real inventory wins on a SKU collision; the prototype is only ever added.
  const existing = new Set(products.map((product) => product.sku));
  return [...products, ...overlay.products.filter((product) => !existing.has(product.sku))];
}

export async function loadRetailCollections() {
  const data = await loadJson("content/collections.json");
  const list = Array.isArray(data?.collections) ? data.collections : [];
  const collections = list.map(normaliseCollection).filter(Boolean);

  const overlay = await loadCommerceTestOverlay();
  if (!overlay?.collection) return collections;

  const existing = new Set(collections.map((collection) => collection.id));
  return existing.has(overlay.collection.id) ? collections : [...collections, overlay.collection];
}

/** SKU -> product name, used to snapshot names onto order lines. */
export async function loadProductNameMap() {
  const products = await loadRetailProducts();
  return new Map(products.map((product) => [product.sku, product.name]));
}
