/**
 * GET /api/catalog
 *
 * The single read the shop front-end makes. Merges the Decap-owned editorial
 * catalogue with live price and stock from Supabase, keyed by SKU.
 *
 * Deliberately returns availability, not inventory: `available_quantity` is
 * capped at 10 in the response so the exact stock ledger and pending-order
 * volume stay private.
 *
 * Degrades rather than fails: with Supabase unconfigured or unreachable the
 * editorial catalogue still renders, every piece marked unavailable, so the
 * collection can be browsed and nothing is ever sold from stale data.
 */

import { ok, serverError, methodNotAllowed } from "./_lib/http.mjs";
import { loadRetailProducts, loadRetailCollections } from "./_lib/catalog.mjs";
import { fetchCommerce, isPlaceholderMode } from "./_lib/commerce.mjs";
import { isSupabaseConfigured, isCommerceTestMode } from "./_lib/env.mjs";
import { publicPaymentConfig } from "./_lib/ipaymu.mjs";

const AVAILABILITY_DISPLAY_CAP = 10;

export default async (request) => {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);

  try {
    const [products, collections] = await Promise.all([
      loadRetailProducts(),
      loadRetailCollections()
    ]);

    const placeholder = isPlaceholderMode();
    let commerce = new Map();
    let commerceAvailable = false;

    if (isSupabaseConfigured() || placeholder || isCommerceTestMode()) {
      try {
        commerce = await fetchCommerce(products.map((product) => product.sku));
        commerceAvailable = commerce.size > 0;
      } catch (error) {
        // A database blip must not take the shop offline.
        console.error("[catalog] commerce state unavailable", error?.message);
      }
    }

    const merged = products.map((product) => {
      const state = commerce.get(product.sku) || null;
      const sellable = Boolean(state && state.active && state.purchasable);
      const available = sellable ? state.available_quantity : 0;

      return {
        ...product,
        price_idr: state?.price_idr ?? null,
        // "Is it live at all" vs "can I buy it right now" are different answers.
        listed: Boolean(state?.active),
        purchasable: sellable && available > 0,
        in_stock: sellable && available > 0,
        available_quantity: Math.min(available, AVAILABILITY_DISPLAY_CAP),
        availability: !state
          ? "unavailable"
          : !state.active
            ? "unavailable"
            : !state.purchasable
              ? "not_for_sale"
              : available > 0
                ? "in_stock"
                : "sold_out"
      };
    });

    const productsBySku = new Map(merged.map((product) => [product.sku, product]));

    const hydratedCollections = collections.map((collection) => {
      // Explicit product_ids order wins; anything tagged to the collection but
      // not listed is appended so a SKU is never silently invisible.
      const ordered = collection.product_ids
        .map((sku) => productsBySku.get(sku))
        .filter(Boolean);
      const orderedSkus = new Set(ordered.map((product) => product.sku));
      const extras = merged.filter(
        (product) => product.collection_id === collection.id && !orderedSkus.has(product.sku)
      );

      return { ...collection, products: [...ordered, ...extras] };
    });

    return ok({
      generated_at: new Date().toISOString(),
      commerce_available: commerceAvailable,
      // The site shows a preview notice when this is true, so nobody mistakes
      // placeholder pricing for the real thing.
      placeholder,
      // True while the Mother's Day prototype is merged in. Development only.
      commerce_test: isCommerceTestMode(),
      payments: publicPaymentConfig(),
      collections: hydratedCollections,
      products: merged
    });
  } catch (error) {
    return serverError("catalog", error);
  }
};

export const config = {
  path: "/api/catalog",
  rateLimit: { windowSize: 60, windowLimit: 120, aggregateBy: ["ip"] }
};
