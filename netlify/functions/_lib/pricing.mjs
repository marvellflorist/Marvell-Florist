/**
 * Cart pricing.
 *
 * The single place that turns a list of SKUs into money. Both the cart
 * endpoint and the checkout endpoint call this, so the number a shopper is
 * shown and the number they are charged are computed by the same code.
 *
 * Nothing here reads a price from its caller.
 */

import { fetchCommerce } from "./commerce.mjs";
import { loadProductNameMap, loadRetailProducts } from "./catalog.mjs";
import { config as appConfig } from "./env.mjs";

/**
 * Prices the cart against live state.
 * Shared with the checkout endpoint so both agree on every number.
 */
export async function priceCart(requestedLines, { deliveryMethod = "pickup" } = {}) {
  const [commerce, nameMap, products] = await Promise.all([
    fetchCommerce(requestedLines.map((line) => line.sku)),
    loadProductNameMap(),
    loadRetailProducts()
  ]);

  const imageBySku = new Map(
    products.map((product) => [product.sku, product.images?.[0]?.image || ""])
  );
  const slugBySku = new Map(products.map((product) => [product.sku, product.slug]));

  const lines = [];
  const corrections = [];
  let subtotal = 0;

  for (const requested of requestedLines) {
    const state = commerce.get(requested.sku);
    const name = nameMap.get(requested.sku) || requested.sku;

    // Unknown SKU, withdrawn, or consultation-only: drop the line entirely.
    if (!state || !state.active || !state.purchasable) {
      corrections.push({
        sku: requested.sku,
        name,
        type: "removed",
        reason: "unavailable",
        message: `${name} is no longer available and has been removed from your bag.`
      });
      continue;
    }

    if (state.available_quantity <= 0) {
      corrections.push({
        sku: requested.sku,
        name,
        type: "removed",
        reason: "sold_out",
        message: `${name} has just sold out and has been removed from your bag.`
      });
      continue;
    }

    // Partially available: keep what we can honour rather than failing the cart.
    let quantity = requested.quantity;
    if (quantity > state.available_quantity) {
      quantity = state.available_quantity;
      corrections.push({
        sku: requested.sku,
        name,
        type: "quantity_reduced",
        reason: "limited_stock",
        quantity,
        message: `Only ${quantity} of ${name} ${quantity === 1 ? "is" : "are"} still available, so your bag has been updated.`
      });
    }

    const lineTotal = state.price_idr * quantity;
    subtotal += lineTotal;

    lines.push({
      sku: requested.sku,
      name,
      slug: slugBySku.get(requested.sku) || "",
      image: imageBySku.get(requested.sku) || "",
      quantity,
      unit_price_idr: state.price_idr,
      line_total_idr: lineTotal,
      available_quantity: Math.min(state.available_quantity, 10)
    });
  }

  const deliveryFee = deliveryMethod === "delivery" && lines.length ? appConfig.deliveryFeeIdr : 0;

  return {
    lines,
    corrections,
    subtotal_idr: subtotal,
    delivery_fee_idr: deliveryFee,
    total_idr: subtotal + deliveryFee
  };
}
