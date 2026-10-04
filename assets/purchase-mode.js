/**
 * purchaseMode — how a product may be bought.
 *
 * Marvell has two commerce models running side by side, and product.html is
 * one shared detail page serving both. Rather than building a second product
 * system for retail, every product carries a mode and the page renders the
 * actions that mode allows:
 *
 *   direct        price, availability, quantity, Add to Bag, and later checkout
 *   consultation  the existing WhatsApp flow, and no Add to Bag
 *   unavailable   viewable, but nothing to act on
 *
 * CONSULTATION IS THE DEFAULT, ALWAYS.
 *
 * Everything Marvell has published so far is consultation work: a Gallery
 * reference piece, a made-to-order arrangement, a past seasonal bouquet. None
 * of it becomes purchasable because a shop exists. A product is only direct
 * when its own content says so, which is what keeps the October 2026 retail
 * model from reaching backwards over ten years of archive.
 *
 * A product opts in by carrying BOTH:
 *   sku           the retail SKU the bag and the server know it by
 *   purchaseMode  "direct"
 *
 * A SKU on its own is not enough, and neither is a price: Gallery and Featured
 * have shown prices for years without ever selling anything online.
 */
(function () {
  if (typeof window === "undefined") return;
  if (window.MarvellPurchase) return;

  const MODES = {
    DIRECT: "direct",
    CONSULTATION: "consultation",
    UNAVAILABLE: "unavailable"
  };

  const VALID = new Set(Object.values(MODES));

  // The retail SKU shape the server validates against. A product claiming
  // direct purchase without one cannot be added to a bag, so it stays on the
  // consultation path rather than rendering a button that would fail.
  const SKU_PATTERN = /^[A-Z0-9]{2,6}-[0-9]{2,3}$/;

  const TEST_PARAM = "commerce-test";
  const TEST_KEY = "marvell-commerce-test";

  /**
   * The live site, by name. Anywhere else — localhost, a Netlify preview, a
   * branch deploy — is development, and the Mother's Day prototype is on by
   * default there so the journey from Featured to the bag can be walked
   * without typing a parameter first.
   *
   * A hostname this cannot read is treated as production. The safe failure is
   * the same as it has always been: not selling something.
   */
  const PRODUCTION_HOSTS = new Set(["marvellflorist.com", "www.marvellflorist.com"]);

  function isProductionHost() {
    try {
      return PRODUCTION_HOSTS.has(String(window.location.hostname || "").toLowerCase());
    } catch (_error) {
      return true;
    }
  }

  /**
   * The Mother's Day prototype.
   *
   * Development only. On by default away from marvellflorist.com, so the
   * journey from Featured through Product to Cart can be walked as a customer
   * would walk it. On the live site it stays off unless ?commerce-test=1 is
   * typed, and either way the server refuses to serve the prototype's SKUs at
   * all unless MARVELL_COMMERCE_TEST is on there too — which the production
   * payment configuration forces off.
   *
   * ?commerce-test=0 turns it off and is remembered for the tab, so the
   * consultation path can still be checked on a development host.
   *
   * Delete this, and every caller of isCommerceTest(), once the October 2026
   * collection is selling real inventory.
   */
  function isCommerceTest() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has(TEST_PARAM)) {
        const on = params.get(TEST_PARAM) !== "0";
        try {
          // "0" is stored rather than cleared: on a development host an
          // absent value means on, so switching it off has to be recorded.
          window.sessionStorage.setItem(TEST_KEY, on ? "1" : "0");
        } catch (_error) {
          // Private browsing. The parameter still works for this page.
        }
        return on;
      }
      const stored = window.sessionStorage.getItem(TEST_KEY);
      if (stored === "1") return true;
      if (stored === "0") return false;
      return !isProductionHost();
    } catch (_error) {
      return false;
    }
  }

  /** Carries ?commerce-test=1 across an internal link, so the flow holds. */
  function decorateHref(href) {
    const raw = String(href || "");
    if (!raw || !isCommerceTest()) return raw;
    if (/^(?:https?:)?\/\//i.test(raw) || raw.startsWith("mailto:") || raw.startsWith("#")) return raw;
    return raw.includes(`${TEST_PARAM}=`)
      ? raw
      : `${raw}${raw.includes("?") ? "&" : "?"}${TEST_PARAM}=1`;
  }

  function normalizeSku(value) {
    const sku = String(value ?? "").trim().toUpperCase();
    return SKU_PATTERN.test(sku) ? sku : "";
  }

  /**
   * The mode a product record asks for, before any gate is applied.
   * Anything unrecognised — missing, misspelled, a stray boolean — is
   * consultation, because the safe failure is not selling something.
   */
  function declaredMode(product) {
    const raw = String(product?.purchaseMode ?? product?.purchase_mode ?? "").trim().toLowerCase();
    return VALID.has(raw) ? raw : MODES.CONSULTATION;
  }

  /**
   * The mode a product actually renders in.
   *
   * A product is bought here when its own content says so: it declares
   * `direct` and it names a SKU the server knows. That is the durable rule,
   * and it is what makes a collection sellable — somebody wrote those two
   * fields onto it, deliberately, in the CMS.
   *
   * The commerce-test flag is no longer part of that decision, and gating on
   * it was the bug: Mother's Day was promoted to real inventory, with real
   * SKUs in content/featured.json and content/retail-products.json, and its
   * Add to Bag still did not appear anywhere but a development host. The flag
   * now gates only what it was always about — the name-matched prototype
   * overlay in resolveRetail, whose SKUs are invented. A SKU that came from
   * there carries `isCommerceTest`, and only that path is still held back.
   *
   * `allowDirect` remains the caller's override, for a caller that wants to
   * decide for itself.
   */
  function resolve(product, { allowDirect } = {}) {
    const declared = declaredMode(product);
    if (declared === MODES.UNAVAILABLE) return MODES.UNAVAILABLE;
    if (declared !== MODES.DIRECT) return MODES.CONSULTATION;
    if (!normalizeSku(product?.sku)) return MODES.CONSULTATION;

    const permitted = allowDirect === undefined
      ? (product?.isCommerceTest !== true || isCommerceTest())
      : allowDirect;
    return permitted ? MODES.DIRECT : MODES.CONSULTATION;
  }

  // -- the retail link -----------------------------------------------------

  /**
   * The SKU and mode a Featured or Gallery product should be rendered with.
   *
   * The durable path is the first one: a product in the CMS names its retail
   * SKU and asks for direct purchase, and the catalogue is then the authority
   * for its price and availability. That is how October 2026 collections will
   * work, and it requires nothing from this function but passing the values
   * through.
   *
   * The second path exists only for the Mother's Day prototype, which must not
   * write SKUs into real business content to prove the flow. It reads the
   * dev-only overlay and matches by name. It runs only when the test flag is
   * on, and goes away with the prototype.
   */
  async function resolveRetail(product) {
    const declaredSku = normalizeSku(product?.sku);
    if (declaredSku) {
      return { sku: declaredSku, purchaseMode: declaredMode(product) };
    }
    if (!isCommerceTest()) return { sku: "", purchaseMode: declaredMode(product) };

    const overlay = await loadTestOverlay();
    const sku = overlay.get(matchKey(product?.title || product?.name));
    return sku
      ? { sku, purchaseMode: MODES.DIRECT, isCommerceTest: true }
      : { sku: "", purchaseMode: declaredMode(product) };
  }

  function matchKey(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/œ/g, "oe")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  let overlayPromise = null;

  /** Name -> SKU for the prototype. Empty unless the test flag is on. */
  function loadTestOverlay() {
    if (!isCommerceTest()) return Promise.resolve(new Map());
    if (overlayPromise) return overlayPromise;
    overlayPromise = (async () => {
      try {
        const response = await fetch("/content/_dev-mothers-day-commerce.json", {
          headers: { accept: "application/json" },
          cache: "no-store"
        });
        if (!response.ok) return new Map();
        const data = await response.json();
        const products = Array.isArray(data?.products) ? data.products : [];
        return new Map(
          products
            .map((product) => [matchKey(product?.name), normalizeSku(product?.sku)])
            .filter(([key, sku]) => key && sku)
        );
      } catch (_error) {
        return new Map();
      }
    })();
    return overlayPromise;
  }

  window.MarvellPurchase = {
    MODES,
    isCommerceTest,
    decorateHref,
    normalizeSku,
    declaredMode,
    resolve,
    resolveRetail
  };
})();
