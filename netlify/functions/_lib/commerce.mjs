/**
 * Commerce state resolver.
 *
 * Normally this is Supabase: live price, live stock, the real ledger. Before
 * Supabase exists there is a second source — a committed placeholder file —
 * so the shop can be designed, reviewed and demonstrated end to end without
 * inventing a database first.
 *
 * Placeholder mode is deliberately hard to switch on by accident, because a
 * shop quoting invented prices to real customers would be worse than a shop
 * with nothing in it. Three conditions must all hold:
 *
 *   1. SHOP_PLACEHOLDER_MODE is explicitly "true"  (defaults to off)
 *   2. Supabase is NOT configured                  (real data always wins)
 *   3. IPAYMU_ENVIRONMENT is "sandbox"             (production is unsupported)
 *
 * Checkout refuses regardless: it requires both Supabase and iPaymu keys, so
 * nothing can be bought at a placeholder price even with the flag on.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { config, boolEnv, isSupabaseConfigured, isCommerceTestMode } from "./env.mjs";
import { fetchCommerceState } from "./supabase.mjs";

const CACHE_TTL_MS = 60_000;
let cache = null;
let cachedAt = 0;
let retailCache = null;
let retailCachedAt = 0;

export function isPlaceholderMode() {
  if (!boolEnv("SHOP_PLACEHOLDER_MODE", false)) return false;
  if (isSupabaseConfigured()) return false;
  if (config.ipaymuEnvironment !== "sandbox") return false;
  return true;
}

async function loadPlaceholderFile() {
  if (cache && Date.now() - cachedAt < CACHE_TTL_MS) return cache;

  for (const candidate of [
    path.join(process.cwd(), "content/placeholder-commerce.json"),
    path.join(process.cwd(), "..", "content/placeholder-commerce.json")
  ]) {
    try {
      cache = JSON.parse(await readFile(candidate, "utf8"));
      cachedAt = Date.now();
      return cache;
    } catch (_error) {
      // Try the next location.
    }
  }

  try {
    const response = await fetch(`${config.siteOrigin}/content/placeholder-commerce.json`, {
      headers: { accept: "application/json" }
    });
    if (response.ok) {
      cache = await response.json();
      cachedAt = Date.now();
      return cache;
    }
  } catch (error) {
    console.error("[commerce] placeholder fetch failed", error?.message);
  }

  cache = { products: {} };
  cachedAt = Date.now();
  return cache;
}

/** Same Map shape fetchCommerceState returns, so callers cannot tell them apart. */
async function fetchPlaceholderState(skus) {
  const file = await loadPlaceholderFile();
  const rows = file?.products || {};
  const map = new Map();

  for (const sku of new Set((skus || []).filter(Boolean))) {
    const row = rows[sku];
    if (!row) continue;

    const stock = Math.max(Number.parseInt(row.stock_quantity, 10) || 0, 0);
    map.set(sku, {
      sku,
      price_idr: Math.max(Number.parseInt(row.price_idr, 10) || 0, 0),
      available_quantity: stock,
      in_stock: stock > 0,
      active: row.active !== false,
      purchasable: row.purchasable !== false,
      updated_at: null
    });
  }
  return map;
}

/**
 * The admin's own rows: content/retail-commerce.json, edited in the CMS.
 *
 * Read through the same cache-then-disk-then-published-file path as the
 * placeholder file, because it is deployed exactly the same way.
 */
async function loadRetailCommerceFile() {
  if (retailCache && Date.now() - retailCachedAt < CACHE_TTL_MS) return retailCache;

  for (const candidate of [
    path.join(process.cwd(), "content/retail-commerce.json"),
    path.join(process.cwd(), "..", "content/retail-commerce.json")
  ]) {
    try {
      retailCache = JSON.parse(await readFile(candidate, "utf8"));
      retailCachedAt = Date.now();
      return retailCache;
    } catch (_error) {
      // Try the next location.
    }
  }

  try {
    const response = await fetch(`${config.siteOrigin}/content/retail-commerce.json`, {
      headers: { accept: "application/json" }
    });
    if (response.ok) {
      retailCache = await response.json();
      retailCachedAt = Date.now();
      return retailCache;
    }
  } catch (error) {
    console.error("[commerce] retail-commerce fetch failed", error?.message);
  }

  retailCache = { products: [] };
  retailCachedAt = Date.now();
  return retailCache;
}

/** SKU -> the admin's row, for the SKUs asked about. */
async function fetchRetailCommerceRows(skus) {
  const file = await loadRetailCommerceFile();
  const list = Array.isArray(file?.products) ? file.products : [];
  const wanted = new Set((skus || []).filter(Boolean));
  const map = new Map();

  for (const row of list) {
    const sku = String(row?.sku || "").trim().toUpperCase();
    if (!sku || !wanted.has(sku)) continue;
    const stock = Math.max(Number.parseInt(row.stock_quantity, 10) || 0, 0);
    map.set(sku, {
      sku,
      price_idr: Math.max(Number.parseInt(row.price_idr, 10) || 0, 0),
      available_quantity: stock,
      in_stock: stock > 0,
      active: row.active !== false,
      // The switch. Absent means on sale; false takes the piece off sale.
      purchasable: row.available !== false && row.purchasable !== false,
      updated_at: null
    });
  }
  return map;
}

/**
 * Mock price and stock for the Mother's Day prototype, in the same shape.
 *
 * Kept separate from the placeholder file because the two answer different
 * questions: the placeholder stands in for a missing database, while this
 * stands in for inventory that was never for sale online. It only ever covers
 * MD-* SKUs, so it cannot shadow a real product's price.
 */
async function fetchCommerceTestState(skus) {
  const { loadCommerceTestOverlay } = await import("./catalog.mjs");
  const overlay = await loadCommerceTestOverlay();
  const rows = overlay?.commerce || {};
  const map = new Map();

  for (const sku of new Set((skus || []).filter(Boolean))) {
    const row = rows[sku];
    if (!row) continue;
    const stock = Math.max(Number.parseInt(row.stock_quantity, 10) || 0, 0);
    map.set(sku, {
      sku,
      price_idr: Math.max(Number.parseInt(row.price_idr, 10) || 0, 0),
      available_quantity: stock,
      in_stock: stock > 0,
      active: row.active !== false,
      purchasable: row.purchasable !== false,
      updated_at: null
    });
  }
  return map;
}

/**
 * The single entry point for price and stock. Returns an empty Map when
 * neither source is available, which renders every piece as unavailable.
 *
 * The prototype's rows are merged in last and only for SKUs no real source
 * answered for, so switching the test flag on can never change the price of
 * something Marvell actually sells.
 */
export async function fetchCommerce(skus) {
  const base = isSupabaseConfigured()
    ? await fetchCommerceState(skus)
    : isPlaceholderMode()
      ? await fetchPlaceholderState(skus)
      : new Map();

  if (isCommerceTestMode()) {
    const test = await fetchCommerceTestState(skus);
    test.forEach((row, sku) => {
      if (!base.has(sku)) base.set(sku, row);
    });
  }

  /**
   * The admin's rows, last.
   *
   * Two jobs, and the difference between them is the whole safety argument.
   *
   * For a SKU nothing else answered for, the row is simply used: that is how
   * a collection goes on sale before anybody has written it into Supabase.
   *
   * For a SKU Supabase already answered for, the row may only take the piece
   * off sale. Its price and its stock figure are ignored, because a file in
   * git cannot hold stock against a concurrent order and letting it raise a
   * quantity would be how two customers are sold the same arrangement. So
   * `available: false` is honoured and nothing else is, which makes the
   * switch something the admin can throw at any moment without having to
   * think about what else it might do.
   */
  const admin = await fetchRetailCommerceRows(skus);
  admin.forEach((row, sku) => {
    const existing = base.get(sku);
    if (!existing) {
      base.set(sku, row);
      return;
    }
    if (row.purchasable) return;
    base.set(sku, { ...existing, in_stock: false, available_quantity: 0, purchasable: false });
  });

  return base;
}
