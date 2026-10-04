/**
 * CMS content sanitisation.
 *
 * Decap writes JSON straight into the repository. A mistaken or malicious
 * entry must not be able to point an <img> or an <iframe> anywhere it likes,
 * so paths and trailer URLs are narrowed to an allowlist server-side, before
 * the browser ever sees them.
 */

import test from "node:test";
import assert from "node:assert/strict";

process.env.SITE_ORIGIN = "https://marvellflorist.com";

const { safeImagePath, safeTrailerUrl, loadRetailProducts, loadRetailCollections } =
  await import("../netlify/functions/_lib/catalog.mjs");

test("safeImagePath allows site-relative paths", () => {
  assert.equal(safeImagePath("/assets/uploads/a.webp"), "/assets/uploads/a.webp");
});

test("safeImagePath rewrites same-origin absolute URLs to paths", () => {
  assert.equal(
    safeImagePath("https://marvellflorist.com/assets/uploads/a.webp"),
    "/assets/uploads/a.webp"
  );
});

test("safeImagePath blocks scripts, data URIs and off-site hosts", () => {
  const blocked = [
    "javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "//evil.example.com/pixel.png",
    "https://evil.example.com/tracker.gif",
    "vbscript:msgbox(1)",
    ""
  ];
  for (const value of blocked) {
    assert.equal(safeImagePath(value), "", `should block ${value}`);
  }
});

test("safeTrailerUrl allows only https YouTube and Vimeo", () => {
  assert.equal(
    safeTrailerUrl("https://www.youtube.com/embed/abc"),
    "https://www.youtube.com/embed/abc"
  );
  assert.equal(
    safeTrailerUrl("https://player.vimeo.com/video/123"),
    "https://player.vimeo.com/video/123"
  );

  const blocked = [
    "http://www.youtube.com/embed/abc",       // not https
    "https://evil.example.com/embed/abc",     // wrong host
    "https://youtube.com.evil.example.com/x", // lookalike host
    "javascript:alert(1)",
    "not a url"
  ];
  for (const value of blocked) {
    assert.equal(safeTrailerUrl(value), "", `should block ${value}`);
  }
});

test("the committed catalogue loads and normalises", async () => {
  const products = await loadRetailProducts();
  const collections = await loadRetailCollections();

  assert.ok(products.length > 0, "at least one retail product");
  assert.ok(collections.length > 0, "at least one collection");

  for (const product of products) {
    assert.match(product.sku, /^[A-Z0-9]{2,6}-[0-9]{2,3}$/);
    assert.match(product.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(product.images.length > 0, `${product.sku} has images`);
    for (const image of product.images) {
      assert.ok(image.image.startsWith("/"), "images are site-relative after normalisation");
    }
    // Live commerce state is not the CMS's business.
    assert.ok(!("price_idr" in product), "price must not come from the CMS");
    assert.ok(!("stock_quantity" in product), "stock must not come from the CMS");
  }

  for (const collection of collections) {
    assert.ok(["active", "upcoming", "archived"].includes(collection.status));
    for (const swatch of collection.palette) {
      assert.match(swatch.hex, /^#[0-9a-fA-F]{3,8}$/);
    }
  }
});

test("every SKU a collection lists exists as a product", async () => {
  const [products, collections] = await Promise.all([
    loadRetailProducts(),
    loadRetailCollections()
  ]);
  const skus = new Set(products.map((product) => product.sku));

  for (const collection of collections) {
    for (const sku of collection.product_ids) {
      assert.ok(skus.has(sku), `${collection.id} lists unknown SKU ${sku}`);
    }
  }
});
