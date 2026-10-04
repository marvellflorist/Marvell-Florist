/**
 * Supabase access, service-role only.
 *
 * The browser never receives a Supabase key of any kind. Every read and write
 * in this project passes through a function in this directory, which is why
 * the anon key is not configured anywhere in the site.
 */

import { createClient } from "@supabase/supabase-js";
import { config, isSupabaseConfigured } from "./env.mjs";

let client = null;

export function getServiceClient() {
  if (!isSupabaseConfigured()) {
    const error = new Error("supabase_not_configured");
    error.publicCode = "not_configured";
    throw error;
  }
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-marvell-source": "netlify-function" } }
    });
  }
  return client;
}

/**
 * Fetches live price and stock for the given SKUs.
 * Returns a Map keyed by SKU. Unknown SKUs are simply absent.
 */
export async function fetchCommerceState(skus) {
  const unique = [...new Set((skus || []).filter(Boolean))];
  if (!unique.length) return new Map();

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("products_commerce")
    .select("sku, price_idr, stock_quantity, reserved_quantity, active, purchasable, updated_at")
    .in("sku", unique);

  if (error) throw error;

  const map = new Map();
  for (const row of data || []) {
    const available = Math.max((row.stock_quantity || 0) - (row.reserved_quantity || 0), 0);
    map.set(row.sku, {
      sku: row.sku,
      price_idr: row.price_idr,
      available_quantity: available,
      in_stock: available > 0,
      active: row.active,
      purchasable: row.purchasable,
      // stock_quantity and reserved_quantity are deliberately not surfaced:
      // exact inventory and pending-order volume stay server-side.
      updated_at: row.updated_at
    });
  }
  return map;
}

/**
 * Translates a Postgres exception raised by our order functions into a code
 * the frontend understands. Anything unrecognised is treated as a server fault
 * so that raw database text never reaches a customer.
 */
export function parsePostgresError(error) {
  const message = String(error?.message || "");

  if (message.includes("INSUFFICIENT_STOCK")) {
    return { code: "insufficient_stock", sku: message.split(":")[1]?.trim() || "" };
  }
  if (message.includes("SKU_UNAVAILABLE")) {
    return { code: "sku_unavailable", sku: message.split(":")[1]?.trim() || "" };
  }
  if (message.includes("PRICE_CHANGED")) return { code: "price_changed" };
  if (message.includes("EMPTY_CART")) return { code: "empty_cart" };
  if (message.includes("ORDER_NOT_FOUND")) return { code: "order_not_found" };
  if (message.includes("ORDER_NOT_PAID")) return { code: "order_not_paid" };

  return { code: "server_error" };
}
