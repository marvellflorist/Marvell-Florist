/**
 * Repository check.
 *
 * The site has no build step, so this stands in for one: it parses every
 * shared script, every serverless function and every inline <script> in the
 * new commerce pages, and validates the JSON the CMS writes.
 *
 * Run with: npm run check
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();

const SHARED_SCRIPTS = [
  "assets/marvell-shop.js",
  "assets/bag.js",
  "assets/newsletter.js",
  "assets/favorites.js",
  "assets/consultation-config.js",
  "assets/shared-footer.js",
  "assets/secondary-menu.js",
  "assets/header-template.js"
];

const COMMERCE_PAGES = [
  "account.html",
  "shop-product.html",
  "bag.html",
  "checkout.html",
  "order.html"
];

const JSON_FILES = [
  "content/collections.json",
  "content/retail-products.json",
  "content/gallery.json",
  "content/featured.json",
  "content/site-sections.json",
  "content/stories.json",
  "content/portfolio-categories.json"
];

let failures = 0;
let checks = 0;

function pass(label) {
  checks += 1;
  console.log(`  ok   ${label}`);
}

function fail(label, detail) {
  checks += 1;
  failures += 1;
  console.error(`  FAIL ${label}\n       ${detail}`);
}

function checkSyntax(label, source, isModule = false) {
  try {
    // eslint-disable-next-line no-new
    new vm.Script(isModule ? `(async()=>{${source}})` : source);
    pass(label);
  } catch (error) {
    fail(label, error.message);
  }
}

async function checkSharedScripts() {
  console.log("\nShared browser scripts");
  for (const file of SHARED_SCRIPTS) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) {
      fail(file, "missing");
      continue;
    }
    checkSyntax(file, await readFile(full, "utf8"));
  }
}

async function checkInlinePageScripts() {
  console.log("\nCommerce page inline scripts");
  for (const file of COMMERCE_PAGES) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) {
      fail(file, "missing");
      continue;
    }
    const html = await readFile(full, "utf8");

    // Only inline blocks; src= scripts are checked separately.
    const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1])
      .filter((block) => block.trim());

    if (!blocks.length) {
      fail(file, "no inline script found");
      continue;
    }
    blocks.forEach((block, index) => {
      checkSyntax(`${file} [block ${index + 1}]`, block);
    });
  }
}

async function checkFunctions() {
  console.log("\nServerless functions");
  const dir = path.join(ROOT, "netlify/functions");
  if (!existsSync(dir)) {
    fail("netlify/functions", "missing");
    return;
  }

  const walk = async (current, prefix = "") => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const label = path.join(prefix, entry.name);
      if (entry.isDirectory()) {
        await walk(full, label);
      } else if (entry.name.endsWith(".mjs")) {
        try {
          await import(`file://${full}`);
          pass(`netlify/functions/${label}`);
        } catch (error) {
          fail(`netlify/functions/${label}`, error.message);
        }
      }
    }
  };
  await walk(dir);
}

async function checkJson() {
  console.log("\nContent JSON");
  for (const file of JSON_FILES) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) {
      fail(file, "missing");
      continue;
    }
    try {
      JSON.parse(await readFile(full, "utf8"));
      pass(file);
    } catch (error) {
      fail(file, error.message);
    }
  }
}

/**
 * Every retail SKU must exist in both halves of the model: editorial content
 * in Decap, and a seeded row for live price and stock. A SKU listed by a
 * collection but never defined would render as a silent gap in the grid.
 */
async function checkCatalogIntegrity() {
  console.log("\nCatalogue integrity");
  try {
    const products = JSON.parse(await readFile(path.join(ROOT, "content/retail-products.json"), "utf8")).products || [];
    const collections = JSON.parse(await readFile(path.join(ROOT, "content/collections.json"), "utf8")).collections || [];
    // Every file in supabase/seed, not one named file: a collection added
    // later gets its own seed, and naming only the first one meant a real
    // collection failed this check for having been seeded correctly.
    const seedDir = path.join(ROOT, "supabase/seed");
    const seedNames = (await readdir(seedDir)).filter((name) => name.endsWith(".sql")).sort();
    const seed = (await Promise.all(
      seedNames.map((name) => readFile(path.join(seedDir, name), "utf8"))
    )).join("\n");

    const skus = new Set(products.map((product) => product.sku));
    const collectionIds = new Set(collections.map((collection) => collection.id));
    const slugs = new Set();

    for (const product of products) {
      if (!/^[A-Z0-9]{2,6}-[0-9]{2,3}$/.test(product.sku || "")) {
        fail("sku format", `"${product.sku}" does not match the SKU pattern`);
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug || "")) {
        fail("slug format", `${product.sku}: slug "${product.slug}" is not URL-safe`);
      }
      if (slugs.has(product.slug)) {
        fail("slug uniqueness", `${product.slug} is used by more than one product`);
      }
      slugs.add(product.slug);

      if (!collectionIds.has(product.collection_id)) {
        fail("collection link", `${product.sku} points at unknown collection "${product.collection_id}"`);
      }
      if (!(product.images || []).length) {
        fail("product images", `${product.sku} has no images`);
      }
      if (!seed.includes(`'${product.sku}'`)) {
        fail("commerce seed", `${product.sku} has no row in any file under supabase/seed/`);
      }
    }

    for (const collection of collections) {
      for (const sku of collection.product_ids || []) {
        if (!skus.has(sku)) {
          fail("collection products", `${collection.id} lists ${sku}, which has no product entry`);
        }
      }
      if (!["active", "upcoming", "archived"].includes(collection.status)) {
        fail("collection status", `${collection.id} has status "${collection.status}"`);
      }
    }

    if (!failures) pass(`${products.length} SKUs across ${collections.length} collection(s)`);
  } catch (error) {
    fail("catalogue integrity", error.message);
  }
}

/** Nothing that reads a secret may be reachable from the browser. */
async function checkNoSecretsInFrontend() {
  console.log("\nSecret leakage");
  const forbidden = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "BREVO_API_KEY",
    "IPAYMU_VA",
    "IPAYMU_API_KEY"
  ];

  const frontendFiles = [
    ...SHARED_SCRIPTS,
    ...COMMERCE_PAGES,
    "assets/shop-pages.css"
  ];

  let leaked = false;
  for (const file of frontendFiles) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    const source = await readFile(full, "utf8");
    for (const token of forbidden) {
      if (source.includes(token)) {
        fail(file, `references ${token}, which must never reach the browser`);
        leaked = true;
      }
    }
  }
  if (!leaked) pass("no server-only secret names in frontend files");
}


/**
 * Every price in rupiah ends in 000.
 *
 * Nothing is priced to the rupiah here — the smallest note in circulation is
 * a thousand, and the whole catalogue is quoted in round thousands. So a
 * price that is not a multiple of 1000 is never a pricing decision; it is a
 * typed digit. 350001 and 349999 both sat in the gallery for exactly that
 * reason, and both rendered to a customer as a price.
 *
 * This reads the committed JSON rather than the database: these files are
 * what the CMS writes, and the CMS is where the slip happens.
 */
async function checkRoundPrices() {
  console.log("\nPrice rounding");
  const PRICE_KEY = /^(price|price_idr|priceMin|priceMax|amount|amount_idr|harga)$/;
  let offenders = 0;
  let seen = 0;

  const walk = (node, trail, report) => {
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${trail}[${i}]`, report));
    } else if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === "number" && PRICE_KEY.test(key)) {
          seen += 1;
          if (!Number.isInteger(value) || value % 1000 !== 0) {
            report(`${trail}.${key}`, value);
          }
        } else {
          walk(value, trail ? `${trail}.${key}` : key, report);
        }
      }
    }
  };

  for (const file of JSON_FILES) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    let data;
    try {
      data = JSON.parse(await readFile(full, "utf8"));
    } catch {
      continue; // checkJson() already reported this one.
    }
    walk(data, "", (where, value) => {
      offenders += 1;
      fail(`${file} price`, `${where} is ${value}, which does not end in 000`);
    });
  }

  if (!offenders) pass(`${seen} price(s) are round thousands`);
}

console.log("Marvell Florist — repository check");
await checkSharedScripts();
await checkInlinePageScripts();
await checkFunctions();
await checkJson();
await checkCatalogIntegrity();
await checkRoundPrices();
await checkNoSecretsInFrontend();

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
