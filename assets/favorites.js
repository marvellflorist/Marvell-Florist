(function () {
  const STORAGE_KEY = "marvell-favorites-v1";
  /**
   * The wishlist has two homes and one shape. A signed-out visitor's list
   * lives in this browser under STORAGE_KEY. A signed-in customer's list
   * lives in the account, mirrored here under ACCOUNT_KEY so the panel can
   * draw at once instead of waiting for the network.
   *
   * Two keys rather than one, deliberately: signing out empties the account
   * mirror, so the next person to use a shared browser cannot read the list
   * of the person before them.
   */
  const ACCOUNT_KEY = "marvell-account-favorites-v1";
  const UNSEEN_KEY = "marvell-favorites-unseen-v1";
  const WISHLIST_API = "/api/account/wishlist";
  const MAX_ITEMS = 48;
  /**
   * Two different questions, which used to be one flag.
   *
   *   signedIn     is the account list the live one? This is a fact about
   *                the *store*: it is true only once the wishlist endpoint
   *                has actually answered, because until then there is no
   *                account list to read from.
   *
   *   unavailable  we are signed in, and the store would not answer.
   *
   * Whether the *person* is signed in is a third thing, and it belongs to
   * account.js, not here — `accountIsSignedIn()` below. Collapsing the two
   * was the bug: one failed wishlist call ran dropToGuest(), which set
   * signedIn false, and every piece of interface that asked this module
   * "are they signed in?" then told a signed-in customer to sign in and
   * hid their lists behind a guest view they could not get out of.
   */
  const account = { signedIn: false, unavailable: false, listId: "", lists: [], items: {} };

  /**
   * The person, as account.js knows them. Never inferred from the store.
   *
   * account.js is the authority whenever it is on the page. It is not always:
   * a page may load this file without it, and the account-change event can
   * arrive before it has been reached. So the last thing that event said is
   * kept as a fallback, and `null` means nobody has said anything yet.
   */
  let identitySaid = null;

  /**
   * Registered here, at load, rather than inside watchAccount() — which runs
   * at DOMContentLoaded, by which time the wishlist page has already
   * registered its own listener for the same event and will therefore run
   * first. That ordering meant the page redrew while this module still
   * believed nobody was signed in, and wrote a guest's sign-in offer onto a
   * customer's page. Recording the fact is separate from acting on it, so it
   * happens as early as this file is evaluated.
   */
  window.addEventListener("marvell:account-change", (event) => {
    identitySaid = Boolean(event?.detail?.signed_in);
  });

  function accountIsSignedIn() {
    try {
      const api = window.MarvellAccount;
      if (api && typeof api.isSignedIn === "function") return Boolean(api.isSignedIn());
    } catch (_error) {
      // Fall through to whatever the event last said.
    }
    return identitySaid === true;
  }
  let pending = Promise.resolve();
  let frame = 0;
  let launcher = document.querySelector(".favorites-launcher");
  let drawer = null;
  let toast = null;
  let toastOverlay = null;
  let toastTimer = 0;
  let lastDrawerSignature = "";
  let focusBeforeDrawer = null;
  let pickerItem = null;
  let pickerBusy = false;
  let pickerNote = "";

  function getLanguage() {
    return window.MarvellLanguage?.getLanguage?.() === "id" ? "id" : "en";
  }

  function t(en, id) {
    return getLanguage() === "id" ? id : en;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeQuantity(value) {
    const parsed = Number.parseInt(String(value ?? "").trim(), 10);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, Math.min(9, parsed));
  }

  function canonicalItemId(item) {
    if (!item || typeof item !== "object") return "";
    return buildItemId({
      href: item.href,
      image: item.image,
      category: item.category,
      title: item.title
    }) || String(item.id || "").trim();
  }

  function normalizeFavoriteItem(item) {
    if (!item || typeof item !== "object") return null;
    return {
      ...item,
      id: canonicalItemId(item),
      quantity: normalizeQuantity(item.quantity),
      href: normalizeHref(item.href),
      savedAt: Number.isFinite(item.savedAt) ? item.savedAt : Date.now()
    };
  }

  /** Whichever list this visitor is currently looking at. */
  function activeKey() {
    return account.signedIn ? ACCOUNT_KEY : STORAGE_KEY;
  }

  function readStore(key) {
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      const normalized = parsed.map((item) => normalizeFavoriteItem(item)).filter(Boolean);
      const deduped = [];
      const seen = new Set();
      normalized.forEach((item) => {
        const id = String(item.id || "");
        if (!id || seen.has(id)) return;
        seen.add(id);
        deduped.push(item);
      });
      return deduped;
    } catch (_error) {
      return [];
    }
  }

  function readFavorites() {
    return readStore(activeKey());
  }

  function writeStore(key, items) {
    try {
      window.localStorage.setItem(key, JSON.stringify(items.slice(0, MAX_ITEMS)));
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  function writeFavorites(items) {
    writeStore(activeKey(), items);
    // Announced the way the bag announces itself, so the Saved section of the
    // bag page and the panel are never looking at different lists.
    window.dispatchEvent(new CustomEvent("marvell:favorites-change", {
      detail: { items: items.slice(0, MAX_ITEMS) }
    }));
  }

  function hasUnseenFavorites() {
    try {
      return window.localStorage.getItem(UNSEEN_KEY) === "true";
    } catch (_error) {
      return false;
    }
  }

  function markFavoritesUnseen() {
    try {
      window.localStorage.setItem(UNSEEN_KEY, "true");
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  function markFavoritesSeen() {
    try {
      window.localStorage.setItem(UNSEEN_KEY, "false");
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  function normalizeHref(href) {
    const raw = String(href || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.origin);
      if (url.origin === window.location.origin) {
        url.searchParams.delete("lang");
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return url.toString();
    } catch (_error) {
      return raw;
    }
  }

  function localizedHref(href) {
    const raw = String(href || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.origin);
      if (url.origin !== window.location.origin) return url.toString();
      url.searchParams.set("lang", getLanguage());
      return `${url.pathname}${url.search}${url.hash}`;
    } catch (_error) {
      return raw;
    }
  }

  /** The bag still has a Saved section for moving a piece into a purchase. */
  const SAVED_SECTION = "#saved";

  function savedItemsHref() {
    return localizedHref((window.MarvellShop?.BAG_PAGE || "/bag.html") + SAVED_SECTION);
  }

  /** The full page is for viewing and optionally organising saved pieces. */
  function wishlistPageHref() {
    return localizedHref("/wishlist");
  }

  function hasSavedWishlistItems() {
    if (readFavorites().length) return true;
    return account.signedIn && Object.values(account.items).some((items) => items.length > 0);
  }

  /**
   * The heart opens the panel. Always.
   *
   * It used to leave for the wishlist page the moment anything was saved, on
   * the theory that a filled list belongs to its own room. Two things were
   * wrong with that. The control announces aria-controls="favorites-drawer",
   * so a panel is what it promises; and on a page whose header ships its own
   * markup the control is a <button>, which has no navigation to fall back
   * on — the heart on the home page did nothing at all once the first piece
   * was saved. The panel carries the way through to the full page in its
   * foot, which is where a way out of a panel belongs.
   */
  function openWishlist() {
    markFavoritesSeen();
    hideToast();
    setDrawerOpen(true);
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function buildItemId(item) {
    const href = normalizeHref(item.href);
    if (href) return `href:${href}`;
    const image = String(item.image || "").trim();
    const category = slugify(item.category || "");
    const title = slugify(item.title || "");
    return `item:${category}:${title}:${image}`;
  }

  function extractItemFromButton(button) {
    if (!(button instanceof HTMLElement)) return null;
    const item = {
      id: "",
      title: String(button.dataset.favoriteTitle || "").trim(),
      image: String(button.dataset.favoriteImage || "").trim(),
      href: String(button.dataset.favoriteHref || "").trim(),
      price: String(button.dataset.favoritePrice || "").trim(),
      category: String(button.dataset.favoriteCategory || "").trim(),
      source: String(button.dataset.favoriteSource || "").trim(),
      sku: String(button.dataset.favoriteSku || "").trim().toUpperCase(),
      purchaseMode: String(button.dataset.favoritePurchaseMode || "").trim().toLowerCase(),
      quantity: normalizeQuantity(button.dataset.favoriteQuantity || 1),
      savedAt: Date.now()
    };
    item.id = canonicalItemId(item) || String(button.dataset.favoriteId || "").trim();
    if (!item.title && !item.image && !item.href) return null;
    return item;
  }

  function isSaved(id) {
    if (!id) return false;
    if (account.signedIn) {
      return Object.values(account.items).some((items) => items.some(
        (item) => String(item.id || "") === String(id)
      ));
    }
    return readFavorites().some((item) => String(item.id || "") === String(id));
  }

  function toggleFavorite(item) {
    if (!item) return false;
    const favorites = readFavorites();
    const existingIndex = favorites.findIndex((entry) => String(entry.id || "") === String(item.id || ""));
    if (existingIndex >= 0) {
      const [removed] = favorites.splice(existingIndex, 1);
      writeFavorites(favorites);
      push({ operation: "remove_item", item_key: String(removed.id || "") });
      window.MarvellAnalytics?.track?.("wishlist_remove", {}, removed.sku || "");
      return false;
    }
    const saved = {
      ...normalizeFavoriteItem(item),
      quantity: normalizeQuantity(item.quantity),
      savedAt: Date.now()
    };
    favorites.unshift(saved);
    writeFavorites(favorites);
    push({ operation: "add_item", item: toServerItem(saved) });
    window.MarvellAnalytics?.track?.("wishlist_add", {}, saved.sku || "");
    return true;
  }

  function setFavoriteQuantity(id, quantity) {
    const normalizedId = String(id || "");
    if (!normalizedId) return;
    const favorites = readFavorites();
    const target = favorites.find((item) => String(item.id || "") === normalizedId);
    if (!target) return;
    target.quantity = normalizeQuantity(quantity);
    writeFavorites(favorites);
    push({ operation: "update_item", item: toServerItem(target) });
  }

  function removeFavorite(id) {
    const favorites = readFavorites().filter((item) => String(item.id || "") !== String(id || ""));
    writeFavorites(favorites);
    push({ operation: "remove_item", item_key: String(id || "") });
  }

  function clearFavorites() {
    writeFavorites([]);
    push({ operation: "clear_list" });
  }

  // -- Account -----------------------------------------------------------

  /**
   * One request shape for the whole wishlist endpoint. Ownership is decided
   * server-side from the account session cookie; nothing here names a user,
   * a list or a key that the browser could be persuaded to change.
   */
  async function callWishlist(body) {
    const response = await window.fetch(WISHLIST_API, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => null);
    if (!data?.ok) {
      const error = new Error(data?.code || "wishlist_unavailable");
      error.code = data?.code || "";
      error.status = response.status;
      throw error;
    }
    return data;
  }

  /** The stored shape, reduced to what the server keeps. */
  function toServerItem(item) {
    return {
      id: String(item.id || ""),
      title: String(item.title || ""),
      image: String(item.image || ""),
      href: String(item.href || ""),
      price: String(item.price || ""),
      category: String(item.category || ""),
      source: String(item.source || ""),
      sku: String(item.sku || ""),
      purchaseMode: String(item.purchaseMode || ""),
      quantity: normalizeQuantity(item.quantity)
    };
  }

  /** A saved price alone never makes a piece purchasable. */
  async function bagProductFor(item) {
    const shop = window.MarvellShop;
    if (!shop?.findProductBySku) return null;
    const purchase = window.MarvellPurchase;
    const rawSku = String(item?.sku || "").trim().toUpperCase();
    let sku = purchase?.normalizeSku?.(rawSku)
      || (/^[A-Z0-9]{2,6}-[0-9]{2,3}$/.test(rawSku) ? rawSku : "");
    let retail = null;

    if (!sku && item?.href) {
      try {
        const url = new URL(item.href, window.location.origin);
        const slug = url.origin === window.location.origin
          ? url.pathname.match(/^\/product\/([^/]+)\/?$/)?.[1] : "";
        if (slug) {
          const product = await shop.findProductBySlug?.(decodeURIComponent(slug));
          return product?.purchasable === true ? product : null;
        }
      } catch (_error) {
        return null;
      }
    }

    if (!sku && purchase?.resolveRetail) {
      retail = await purchase.resolveRetail({
        title: item?.title, name: item?.title, purchaseMode: item?.purchaseMode
      });
      sku = purchase.normalizeSku(retail?.sku);
    }
    const direct = purchase
      ? purchase.resolve({ ...item, ...retail, sku }) === purchase.MODES.DIRECT
      : item?.purchaseMode === "direct";
    if (!sku || !direct) return null;
    const product = await shop.findProductBySku(sku);
    return product?.purchasable === true ? product : null;
  }

  function bindBagActions(root, items) {
    if (!root?.querySelectorAll) return;
    const byId = new Map(items.map((item) => [String(item.id || ""), item]));
    root.querySelectorAll("[data-wishlist-bag]").forEach((button) => {
      const item = byId.get(button.getAttribute("data-wishlist-bag") || "");
      if (!item) return;
      bagProductFor(item).then((product) => {
        if (!product || !button.isConnected) return;
        button.dataset.bagAdd = product.sku;
        button.dataset.bagName = product.name || item.title || product.sku;
        button.dataset.bagImage = item.image || product.images?.[0]?.image || "";
        button.hidden = false;
      }).catch(() => {});
    });
  }

  /** And back again. The server owns the order, so savedAt comes from it. */
  function fromServerRow(row) {
    const data = row?.item_data && typeof row.item_data === "object" ? row.item_data : {};
    const savedAt = Date.parse(row?.created_at || "");
    const key = String(row?.item_key || data.id || "");
    // The item key also carries the canonical product path. Earlier account
    // rows lost both item_data.href and item_data.image because their query
    // strings contained characters the old validator rejected. Restore the
    // same-origin path from the key first, then recover its image parameter.
    let href = String(data.href || "").trim();
    const keyHref = key.startsWith("href:") ? key.slice(5) : "";
    if (!href && keyHref.startsWith("/") && !keyHref.startsWith("//")) href = keyHref;
    // Rows written while the old server validator was active can have an
    // empty image even though the legacy product URL still contains it.
    // Recover it for display without trusting a cross-origin URL.
    let image = String(data.image || "").trim();
    if (!image && href) {
      try {
        const productUrl = new URL(href, window.location.origin);
        const candidate = String(productUrl.searchParams.get("image") || "").trim();
        if (productUrl.origin === window.location.origin && candidate.startsWith("/") && !candidate.startsWith("//")) {
          image = candidate;
        }
      } catch (_error) {
        // The card can still be shown without photography.
      }
    }
    return normalizeFavoriteItem({
      ...data,
      href,
      image,
      id: key,
      savedAt: Number.isFinite(savedAt) ? savedAt : Date.now()
    });
  }

  /**
   * The panel shows the default list. Other lists belong to the management
   * view and are carried here only so it does not have to ask again.
   */
  function adoptSnapshot(data) {
    account.unavailable = false;
    account.listId = String(data?.default_list_id || "");
    account.lists = Array.isArray(data?.lists) ? data.lists : [];
    // Every list's items are kept, keyed by list, because the wishlist page
    // draws all of them. Only the default list reaches the panel's cache.
    account.items = {};
    for (const row of Array.isArray(data?.items) ? data.items : []) {
      const listId = String(row?.list_id || "");
      const item = fromServerRow(row);
      if (!listId || !item || !item.id) continue;
      (account.items[listId] = account.items[listId] || []).push(item);
    }
    const items = account.items[account.listId] || [];
    writeStore(ACCOUNT_KEY, items);
    window.dispatchEvent(new CustomEvent("marvell:favorites-change", {
      detail: { items: items.slice(0, MAX_ITEMS) }
    }));
    scheduleRefresh();
  }

  /**
   * Signing out of the account list is not a failure the customer should be
   * shown; it is a return to the visitor's own device list. The mirror is
   * emptied on the way, so nothing of theirs is left in this browser.
   */
  function dropToGuest({ unavailable = false } = {}) {
    account.signedIn = false;
    // Signed out is not the same as unreachable, and the interface reads the
    // difference: one is a guest, the other is a customer whose lists we
    // could not fetch. Neither is ever told to sign in when they already are.
    account.unavailable = unavailable && accountIsSignedIn();
    account.listId = "";
    account.lists = [];
    account.items = {};
    try {
      window.localStorage.removeItem(ACCOUNT_KEY);
    } catch (_error) {
      // Ignore storage failures.
    }
    // The pieces on screen have just changed from the account's list to this
    // device's, which is exactly what this event is for. Without it the
    // wishlist page kept whatever it drew before the store failed, including
    // a sign-in offer written while the identity was still unknown.
    window.dispatchEvent(new CustomEvent("marvell:favorites-change", {
      detail: { items: readFavorites().slice(0, MAX_ITEMS) }
    }));
    scheduleRefresh();
  }

  /**
   * Every change the heart makes is already on screen by the time this runs.
   * The queue exists so that a fast run of taps reaches the server in the
   * order they were made; a failed write re-reads the account list rather
   * than guessing, so the panel can never drift from what was stored.
   */
  function push(body) {
    if (!account.signedIn) return pending;
    pending = pending
      .then(() => callWishlist(body))
      .then((data) => adoptSnapshot(data))
      .catch((error) => {
        if (["not_signed_in", "profile_incomplete"].includes(error?.code)) return dropToGuest();
        return callWishlist(null)
          .then((data) => adoptSnapshot(data))
          .catch((readError) => {
            reportUnavailable(readError);
            dropToGuest({ unavailable: true });
          });
      });
    return pending;
  }

  /**
   * The wishlist store being unreachable is not the same thing as being
   * signed out, and the difference used to be invisible: every failure ended
   * in the device list, where the panel read "saved on this device" to a
   * customer who was signed in and looking at their own account.
   *
   * The fallback itself is right — the device list is the only copy left, and
   * losing it would be worse. What was missing is anybody being told. The
   * usual cause is migration 0008 never having been run, which leaves
   * wishlist_lists and wishlist_items absent and every call failing.
   */
  let reportedUnavailable = false;
  function reportUnavailable(error) {
    if (reportedUnavailable) return;
    if (["not_signed_in", "profile_incomplete"].includes(error?.code)) return;
    reportedUnavailable = true;
    try {
      window.console?.warn?.(
        "[marvell] account wishlist unreachable (%s) — falling back to this device's list. "
          + "If this persists, check that supabase/migrations/0008_wishlists_and_preferences.sql has been run.",
        error?.code || error?.status || "unknown"
      );
    } catch (_error) {
      // A console that will not take a warning is not worth a second failure.
    }
  }

  /**
   * Sign-in, once. Whatever this device had saved is folded into the account
   * list and the device list is cleared, so the two can never disagree
   * afterwards. The merge is a union: nothing already in the account is
   * dropped, and an item saved in both places stays one item. Nobody is asked
   * to import anything.
   */
  async function adoptAccount() {
    if (account.signedIn) return;
    const guests = readStore(STORAGE_KEY);
    account.signedIn = true;
    try {
      const data = guests.length
        ? await callWishlist({ operation: "merge", items: guests.map((item) => toServerItem(item)) })
        : await callWishlist(null);
      adoptSnapshot(data);
      // Only once the account holds them: until then the device copy is the
      // only copy, and clearing it early would lose the list outright.
      if (guests.length) writeStore(STORAGE_KEY, []);
    } catch (error) {
      reportUnavailable(error);
      dropToGuest({ unavailable: !["not_signed_in", "profile_incomplete"].includes(error?.code) });
    }
  }

  function watchAccount() {
    window.addEventListener("marvell:account-change", (event) => {
      identitySaid = Boolean(event?.detail?.signed_in);
      if (identitySaid) adoptAccount();
      else dropToGuest();
      // Redraw either way: the panel's copy depends on who is signed in,
      // which has just changed whether or not the store answers.
      scheduleRefresh();
    });
    // account.js may have settled its session before this file was reached,
    // in which case the change event has already been and gone.
    if (accountIsSignedIn()) {
      identitySaid = true;
      adoptAccount();
    }
  }

  function clearToastTimer() {
    if (toastTimer) {
      window.clearTimeout(toastTimer);
      toastTimer = 0;
    }
  }

  function handleToggleClick(event, source) {
    if (event && event.__marvellFavoritesHandled) return false;
    if (event) event.__marvellFavoritesHandled = true;
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    if (event && typeof event.stopPropagation === "function") event.stopPropagation();
    if (event && typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    const button = source instanceof HTMLElement
      ? source
      : event?.target instanceof Element
        ? event.target.closest("[data-favorite-toggle]")
        : null;
    if (!(button instanceof HTMLElement)) return false;
    const item = extractItemFromButton(button);
    if (!item) return false;
    if (account.signedIn && account.lists.length > 1) {
      pickerItem = normalizeFavoriteItem(item);
      pickerBusy = false;
      pickerNote = "";
      lastDrawerSignature = "";
      hideToast();
      setDrawerOpen(true);
      return false;
    }
    const saved = toggleFavorite(item);
    if (saved) markFavoritesUnseen();
    scheduleRefresh();
    if (saved) showToast(item, account.lists.find((list) => list.id === account.listId)?.name || "Saved");
    else hideToast();
    return false;
  }

  function injectStyles() {
    // The panel's chrome — ground, travel, close, backdrop, utility row — is
    // the shared one. Asked for here rather than assumed, so the wishlist is
    // never a panel with no walls.
    window.MarvellShop?.injectPanelStyles?.();
    if (document.getElementById("favorites-system-styles")) return;
    const style = document.createElement("style");
    style.id = "favorites-system-styles";
    style.textContent = `
      .favorite-toggle {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 12;
        width: 28px;
        height: 28px;
        border: 0;
        background: transparent;
        color: #12100e;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform .18s ease, opacity .18s ease;
        padding: 0;
        pointer-events: auto;
        touch-action: manipulation;
      }
      .product-card,
      .featured-product-card {
        isolation: isolate;
      }
      .product-detail-link,
      .featured-product-link {
        position: relative;
        z-index: 1;
      }
      .favorite-toggle:hover,
      .favorite-toggle:focus-visible {
        transform: translateY(-1px);
        opacity: 0.72;
        outline: none;
      }
      .favorite-toggle.is-saved {
        color: #12100e;
        opacity: 1;
      }
      .favorite-toggle.is-saved:hover,
      .favorite-toggle.is-saved:focus-visible {
        opacity: 1;
        transform: none;
      }
      .favorite-toggle svg {
        width: 20px;
        height: 20px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.85;
        stroke-linecap: round;
        stroke-linejoin: round;
        opacity: 0.9;
        transition: fill 0.26s ease, stroke 0.26s ease, opacity 0.26s ease;
      }
      .favorite-toggle svg,
      .favorite-toggle svg * {
        pointer-events: none;
      }
      .favorite-toggle.is-saved svg {
        fill: #12100e;
        stroke: #12100e;
        opacity: 1;
      }
      .favorite-toggle--detail {
        position: relative;
        top: auto;
        right: auto;
        width: 28px;
        height: 28px;
        padding: 0;
        align-self: flex-start;
      }
      .favorite-toggle--detail svg {
        width: 20px;
        height: 20px;
      }
      .favorite-toggle__label {
        white-space: nowrap;
      }
      .favorite-toggle--detail .favorite-toggle__label {
        display: none;
      }
      .favorites-launcher {
        position: relative;
        z-index: 6;
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
        color: rgba(42, 33, 24, 0.82);
        order: 3;
      }
      .favorites-launcher-btn {
        position: relative;
        min-height: 0;
        border-radius: 0;
        border: 0;
        background: transparent;
        color: inherit;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        cursor: pointer;
        font: inherit;
        line-height: 1;
        transition: opacity 0.2s ease, color 0.45s ease;
      }
      .favorites-launcher-btn svg {
        width: 20px;
        height: 20px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.25;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .favorites-launcher-btn.has-items {
        color: inherit !important;
        opacity: 1;
      }
      .favorites-launcher-btn.has-unseen::after {
        content: "";
        position: absolute;
        top: -1px;
        right: -2px;
        width: 5px;
        height: 5px;
        border-radius: 999px;
        background: currentColor;
      }
      body.desktop-header-hero-mode .favorites-launcher-btn {
        color: rgba(242, 236, 224, 0.96);
      }
      body.desktop-header-hero-mode .favorites-launcher-btn.has-items {
        color: rgba(242, 236, 224, 0.96) !important;
        opacity: 1;
      }
      .favorites-launcher-btn:hover,
      .favorites-launcher-btn:focus-visible {
        opacity: 0.72;
        outline: none;
      }
      .favorites-launcher-label,
      .favorites-launcher-count {
        display: none;
      }
      .favorites-launcher + .search-toggle,
      .favorites-launcher + .search-mobile-trigger {
        margin-left: 0 !important;
      }
      .favorites-launcher + .menu-toggle {
        margin-left: 0 !important;
      }
      .header-bar.has-favorites-launcher .favorites-launcher {
        margin-left: auto !important;
      }
      .header-bar.has-favorites-launcher .search-toggle,
      .header-bar.has-favorites-launcher .search-mobile-trigger,
      .header-bar.has-favorites-launcher .menu-toggle {
        margin-left: 0 !important;
      }
      .header-bar.has-favorites-launcher .menu-toggle {
        flex: 0 0 auto !important;
      }
      @media (max-width: 768px) {
        .header-bar.has-favorites-launcher .favorites-launcher {
          position: static !important;
          right: auto !important;
          top: auto !important;
          transform: none !important;
          margin-left: 0 !important;
          flex: 0 0 auto !important;
        }
        .header-bar.has-favorites-launcher .search-toggle,
        .header-bar.has-favorites-launcher .search-mobile-trigger,
        .header-bar.has-favorites-launcher .menu-toggle {
          margin-left: 0 !important;
        }
      }
      /* The wishlist quick panel.
         The chrome — ground, travel, close disc, backdrop, the utility row
         across the top — all comes from .mv-panel in assets/marvell-shop.js,
         so the wishlist, account, contact, updates and the bag are one
         surface that changes its contents rather than five drawers. Only what
         is particular to a list of saved pieces is written here.

         The list uses quiet divided rows, generous photography and direct
         remove controls. */
      /* No width of its own. --mv-panel-width belongs to .mv-panel and is the
         same for every right-hand panel, because four panels at four widths
         made the edge jump each time one cross-faded into the next. The body's
         padding is dropped only so the divided rows can run to both edges;
         --wishlist-gutter then restores it section by section, at the figure
         .mv-panel-body would have used anyway. */
      .mv-panel--wishlist { --wishlist-gutter: 46px; }
      .mv-panel--wishlist .mv-panel-body {
        padding: 0 !important;
        gap: 0 !important;
      }

      .wishlist-panel-head {
        display: grid;
        gap: 8px;
        padding: 30px var(--wishlist-gutter) 26px;
      }
      .wishlist-panel-topline {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 16px;
      }
      .wishlist-panel-title {
        margin: 0;
        font-family: "AdelioDisplayCondensed", sans-serif !important;
        font-size: 28px !important;
        font-weight: 300 !important;
        line-height: 1.08;
        letter-spacing: .04em;
        text-transform: uppercase;
        color: #1d1a18;
      }
      .wishlist-panel-note {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 13px;
        line-height: 1.55;
        color: rgba(29, 26, 24, 0.55);
      }
      .wishlist-panel-count {
        font-family: "Inter Tight", sans-serif;
        font-size: 13px;
        font-weight: 400;
        letter-spacing: 0;
        text-transform: none;
        color: rgba(29, 26, 24, 0.5);
        font-variant-numeric: tabular-nums;
      }
      /* The empty state, which is most of the wishlist's life. Centred in the
         panel with one thing to do next, as Dior has it. */
      .wishlist-panel-empty {
        display: grid;
        justify-items: center;
        align-content: center;
        gap: 18px;
        text-align: center;
        /* The head sits above this now, so the empty state no longer has to
           fill the panel by itself. It used to be given 42vh and up to 90px
           of padding with nothing over it, which put a single sentence in
           the dead middle of an otherwise blank panel. */
        min-height: 32vh;
        padding: clamp(28px, 5vw, 56px) var(--wishlist-gutter);
      }
      .wishlist-panel-empty p {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 15px;
        line-height: 1.6;
        color: #1d1a18;
      }
      .wishlist-panel-empty .wishlist-panel-hint {
        color: rgba(29, 26, 24, 0.55);
        font-size: 14px;
        max-width: 34ch;
      }
      .wishlist-panel-signin {
        border: 0;
        padding: 0;
        background: transparent;
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        color: #1d1a18;
        cursor: pointer;
      }
      .wishlist-panel-signin:focus-visible { outline: none; }

      .wishlist-picker {
        display: grid;
        gap: 0;
        animation: wishlist-picker-in 320ms cubic-bezier(.22, 1, .36, 1) both;
      }
      .wishlist-picker-head {
        display: grid;
        gap: 8px;
        padding: 30px var(--wishlist-gutter) 24px;
        border-bottom: 1px solid rgba(29, 26, 24, 0.08);
      }
      .wishlist-picker-kicker {
        margin: 0;
        color: rgba(29, 26, 24, .52);
        font: 10px/1.3 "Inter Tight", sans-serif;
        letter-spacing: .14em;
        text-transform: uppercase;
      }
      .wishlist-picker-title {
        margin: 0;
        color: #1d1a18;
        font-family: "AdelioDisplayCondensed", sans-serif !important;
        font-size: 31px !important;
        font-weight: 300 !important;
        line-height: 1.04;
        letter-spacing: .025em;
      }
      .wishlist-picker-piece {
        display: grid;
        grid-template-columns: 68px minmax(0, 1fr);
        align-items: center;
        gap: 16px;
        padding: 18px var(--wishlist-gutter);
        border-bottom: 1px solid rgba(29, 26, 24, 0.08);
      }
      .wishlist-picker-piece-media {
        display: block;
        width: 68px;
        aspect-ratio: 4 / 5;
        overflow: hidden;
        background: #f3f2f1;
      }
      .wishlist-picker-piece-media img { width: 100%; height: 100%; object-fit: contain; display: block; }
      .wishlist-picker-piece-name {
        margin: 0;
        font-family: "AdelioDisplayCondensed", sans-serif;
        font-size: 22px;
        line-height: 1.08;
        color: #1d1a18;
      }
      .wishlist-picker-lists { display: grid; padding: 8px 0; }
      .wishlist-picker-choice {
        width: 100%; min-height: 58px; padding: 0 var(--wishlist-gutter);
        border: 0; background: transparent; color: #1d1a18;
        display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px;
        align-items: center; text-align: left; cursor: pointer;
        font: 15px/1.35 "Inter Tight", sans-serif;
        transition: background-color 180ms ease, opacity 180ms ease;
      }
      .wishlist-picker-choice:hover:not(:disabled),
      .wishlist-picker-choice:focus-visible:not(:disabled) { background: rgba(29, 26, 24, .045); outline: none; }
      .wishlist-picker-choice:disabled { cursor: default; opacity: .48; }
      .wishlist-picker-choice svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.6; }
      .wishlist-picker-choice-state { color: rgba(29, 26, 24, .55); font-size: 12px; }
      .wishlist-picker-foot {
        display: grid; gap: 12px; padding: 20px var(--wishlist-gutter) 28px;
        border-top: 1px solid rgba(29, 26, 24, 0.08);
      }
      .wishlist-picker-note { margin: 0; color: #8d4638; font: 13px/1.5 "Inter Tight", sans-serif; }
      @keyframes wishlist-picker-in { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }

      .wishlist-panel-list {
        display: grid;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .wishlist-panel-item {
        display: grid;
        grid-template-columns: clamp(84px, 20%, 132px) minmax(0, 1fr);
        gap: clamp(16px, 2.4vw, 26px);
        align-items: start;
        padding: 22px var(--wishlist-gutter);
        border-top: 1px solid rgba(29, 26, 24, 0.08);
      }
      /* No rule under the last row: the foot below it carries its own, and
         the two together drew a 2px line across the panel. */
      .wishlist-panel-media {
        display: block;
        text-decoration: none;
        aspect-ratio: 4 / 5;
        overflow: hidden;
        background: rgba(29, 26, 24, 0.05);
      }
      .wishlist-panel-media img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }
      .wishlist-panel-body {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px 16px;
        align-content: start;
        padding-top: 0;
        min-width: 0;
      }
      .wishlist-panel-body .mv-item-name {
        min-width: 0; font-family: "AdelioDisplayCondensed", sans-serif !important;
        font-size: 21px; font-weight: 300 !important; line-height: 1.1;
        letter-spacing: .02em;
        color: #1d1a18; text-decoration: none;
      }
      .wishlist-panel-price {
        font-family: "Inter Tight", sans-serif;
        font-size: 15px;
        line-height: 1.5;
        color: #1d1a18;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .wishlist-panel-item-actions {
        display: flex;
        grid-column: 2; align-items: flex-end; flex-direction: column;
        gap: 12px; margin-top: 0;
      }
      .wishlist-panel-item-actions .mv-quiet-action,
      .wishlist-panel-foot .mv-quiet-action {
        font-size: 13px; font-weight: 400; letter-spacing: 0; text-transform: none;
      }
      .wishlist-panel-foot {
        display: grid;
        gap: 14px;
        padding: 22px var(--wishlist-gutter) 26px;
        border-top: 1px solid rgba(29, 26, 24, 0.08);
      }
      .wishlist-panel-foot .mv-cta {
        justify-self: start; width: auto; padding: 0; background: transparent; color: #1d1a18;
        font-size: 14px; font-weight: 500; letter-spacing: 0; text-transform: none;
      }
      .wishlist-panel-foot .mv-cta:hover:not(:disabled) { background: transparent; }
      .wishlist-panel-foot .wishlist-panel-signin { justify-self: start; text-align: left; }

      /* Saving something is worth a card, not a line of text in a corner.
         It says what was saved, offers the way to the wishlist, and waits to be
         dismissed rather than timing out while somebody is still reading it. */
      .favorites-toast {
        position: fixed;
        top: calc(env(safe-area-inset-top, 0px) + 78px);
        left: 50%;
        width: min(324px, calc(100vw - 28px));
        border: 1px solid rgba(63, 54, 45, 0.12);
        background: rgba(251, 249, 244, 0.98);
        color: #2f2923;
        box-shadow: 0 14px 34px rgba(16, 12, 10, 0.1);
        z-index: 10020;
        opacity: 0;
        transform: translate(-50%, -8px);
        pointer-events: none;
        transition: opacity .16s ease-out, transform .16s ease-out;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
      .favorites-toast-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.42);
        z-index: 10019;
        opacity: 0;
        pointer-events: none;
        transition: opacity .16s ease-out;
      }
      .favorites-toast-overlay.is-open {
        opacity: 1;
        pointer-events: auto;
      }
      .favorites-toast.is-open {
        opacity: 1;
        transform: translate(-50%, 0);
        pointer-events: auto;
      }
      .favorites-toast-shell {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 18px;
        align-items: start;
        gap: 14px;
        padding: 14px 16px;
      }
      .favorites-toast-icon {
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #2f2923;
        flex: 0 0 auto;
      }
      .favorites-toast-icon svg {
        width: 18px;
        height: 18px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .favorites-toast-title {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        font-weight: 400;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(47, 41, 35, 0.5);
      }
      .favorites-toast-copy {
        display: grid;
        gap: 4px;
        min-width: 0;
      }
      .favorites-toast-title,
      .favorites-toast-link {
        margin-left: 36px;
      }
      .favorites-toast-name-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .favorites-toast-name {
        margin: 0;
        font-family: "AdelioDisplayCondensed", sans-serif;
        font-size: 28px;
        line-height: 0.96;
        color: rgba(47, 41, 35, 0.88);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .favorites-toast-link {
        justify-self: start;
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        line-height: 1.35;
        color: #2f2923;
      }
      .favorites-toast-close {
        border: 0;
        background: transparent;
        color: rgba(47, 41, 35, 0.72);
        font-family: "Inter Tight", sans-serif;
        font-size: 16px;
        line-height: 1;
        padding: 0;
        cursor: pointer;
      }
      @media (max-width: 768px) {
        .favorite-toggle {
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
        }
        .favorite-toggle svg {
          width: 18px;
          height: 18px;
        }
        .favorite-toggle--detail {
          width: 24px;
          height: 24px;
        }
        .favorites-launcher-btn {
          width: 22px;
          height: 22px;
        }
        .favorites-launcher-btn svg {
          width: 20px;
          height: 20px;
        }
        .mv-panel--wishlist { --wishlist-gutter: 16px; }
        .wishlist-panel-title { font-size: 25px !important; }
        .wishlist-panel-item {
          grid-template-columns: 84px minmax(0, 1fr);
          gap: 16px;
        }
        .wishlist-panel-body {
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px 8px;
        }
        .wishlist-panel-body .mv-item-name { font-size: 19px; }
        .wishlist-panel-price { font-size: 12px; }
        .favorites-toast {
          top: calc(env(safe-area-inset-top, 0px) + 84px);
          width: calc(100vw - 28px);
        }
        .favorites-toast-overlay {
          background: rgba(0, 0, 0, 0.42);
        }
        .favorites-toast-name {
          font-size: 24px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .wishlist-picker { animation: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDrawerUi() {
    if (!(document.body instanceof HTMLElement)) return;
    if (!(launcher instanceof HTMLElement)) {
      launcher = document.createElement("div");
      launcher.className = "favorites-launcher";
      launcher.innerHTML = `
        <a class="favorites-launcher-btn" href="${escapeHtml(wishlistPageHref())}" aria-expanded="false" aria-controls="favorites-drawer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>
          <span class="favorites-launcher-label"></span>
          <span class="favorites-launcher-count">0</span>
        </a>
      `;
    }
    placeLauncher();
    // One backdrop for every right-hand panel, owned by the registry. Each
    // panel bringing its own is what made switching between them blink.
    window.MarvellShop?.ensureBackdrop?.();
    if (!(drawer instanceof HTMLElement)) {
      drawer = document.createElement("aside");
      drawer.className = "mv-panel mv-panel--wishlist";
      drawer.id = "favorites-drawer";
      drawer.setAttribute("aria-hidden", "true");
      drawer.setAttribute("role", "dialog");
      drawer.setAttribute("aria-modal", "true");
      drawer.setAttribute("aria-label", t("Wishlist", "Wishlist"));
      document.body.appendChild(drawer);
    }
    if (!(toast instanceof HTMLElement)) {
      toast = document.createElement("aside");
      toast.className = "favorites-toast";
      toast.hidden = true;
      toast.setAttribute("aria-hidden", "true");
      document.body.appendChild(toast);
    }
    if (!(toastOverlay instanceof HTMLElement)) {
      toastOverlay = document.createElement("div");
      toastOverlay.className = "favorites-toast-overlay";
      toastOverlay.hidden = true;
      toastOverlay.setAttribute("aria-hidden", "true");
      document.body.appendChild(toastOverlay);
    }
    bindDrawerEvents();
  }

  function placeLauncher() {
    if (!(launcher instanceof HTMLElement) || !(document.body instanceof HTMLElement)) return;
    const headerBar = document.querySelector(".header-bar");
    if (headerBar instanceof HTMLElement) {
      headerBar.classList.add("has-favorites-launcher");
      const controls = Array.from(headerBar.querySelectorAll(".search-mobile-trigger, .search-toggle, .menu-toggle"));
      const visibleControls = controls.filter((node) => {
        if (!(node instanceof HTMLElement)) return false;
        const styles = window.getComputedStyle(node);
        return styles.display !== "none" && styles.visibility !== "hidden";
      });
      const contactTrigger = headerBar.querySelector(".contact-quick-trigger, .header-contact");
      const languageSwitcher = headerBar.querySelector(".language-switcher");
      const firstVisibleControl = visibleControls[0];
      const mobileActionCluster = headerBar.querySelector(".mobile-header-actions");
      const menuControl = visibleControls.find((node) => node.classList.contains("menu-toggle"));
      if (window.matchMedia("(max-width: 768px)").matches) {
        if (mobileActionCluster instanceof HTMLElement) {
          if (launcher.parentNode !== mobileActionCluster) {
            mobileActionCluster.insertBefore(launcher, mobileActionCluster.firstChild);
          }
        } else if (firstVisibleControl instanceof HTMLElement) {
          if (firstVisibleControl.previousSibling !== launcher) {
            headerBar.insertBefore(launcher, firstVisibleControl);
          }
        } else if (languageSwitcher instanceof HTMLElement && languageSwitcher.nextSibling !== launcher) {
          headerBar.insertBefore(launcher, languageSwitcher.nextSibling);
        } else if (launcher.parentNode !== headerBar) {
          headerBar.appendChild(launcher);
        }
      } else if (contactTrigger instanceof HTMLElement) {
        if (contactTrigger.previousSibling !== launcher) {
          headerBar.insertBefore(launcher, contactTrigger);
        }
      } else if (launcher.parentNode !== headerBar) {
        if (menuControl instanceof HTMLElement && menuControl.nextSibling) {
          headerBar.insertBefore(launcher, menuControl.nextSibling);
        } else {
          headerBar.appendChild(launcher);
        }
      }
      return;
    }
    if (launcher.parentNode !== document.body) document.body.appendChild(launcher);
  }

  /**
   * Closes without touching the shared scroll lock. This is what the panel
   * registry calls when the account panel or the menu is taking the screen,
   * and whichever of them is opening owns the lock from here.
   */
  function closeDrawerQuietly() {
    if (!(drawer instanceof HTMLElement)) return;
    if (!drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    pickerItem = null;
    pickerBusy = false;
    pickerNote = "";
    drawer.setAttribute("aria-hidden", "true");
    launcher?.querySelector(".favorites-launcher-btn")?.setAttribute("aria-expanded", "false");
    document.querySelectorAll("[data-favorites-open]").forEach((trigger) => {
      if (trigger instanceof HTMLElement) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function setDrawerOpen(isOpen) {
    ensureDrawerUi();
    if (!(drawer instanceof HTMLElement) || !(launcher instanceof HTMLElement)) return;
    if (isOpen) {
      focusBeforeDrawer = document.activeElement;
      renderDrawer();
      // Closes whatever else is open — or cross-fades from it, if that was
      // another right-hand panel — takes the scroll lock and raises the
      // backdrop. It also slides the indicator to the heart.
      window.MarvellShop?.openPanel?.("wishlist");
      window.MarvellShop?.syncUtilityRows?.();
    }
    drawer.classList.toggle("is-open", isOpen);
    drawer.setAttribute("aria-hidden", isOpen ? "false" : "true");
    launcher.querySelector(".favorites-launcher-btn")?.setAttribute("aria-expanded", isOpen ? "true" : "false");
    document.querySelectorAll("[data-favorites-open]").forEach((trigger) => {
      if (trigger instanceof HTMLElement) trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    if (isOpen) {
      drawer.querySelector(".mv-panel-utility-close")?.focus?.();
    } else {
      pickerItem = null;
      pickerBusy = false;
      pickerNote = "";
      window.MarvellShop?.closePanel?.("wishlist");
      if (focusBeforeDrawer instanceof HTMLElement && document.contains(focusBeforeDrawer)) focusBeforeDrawer.focus?.();
    }
  }

  function bindDrawerEvents() {
    const launcherButton = launcher?.querySelector(".favorites-launcher-btn");
    if (launcherButton instanceof HTMLElement && launcherButton.dataset.bound !== "1") {
      launcherButton.dataset.bound = "1";
      launcherButton.addEventListener("click", (event) => {
        // A modified click keeps whatever the element does by itself, so the
        // anchor form of the heart can still be opened in a new tab.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
        event.preventDefault();
        markFavoritesSeen();
        scheduleRefresh();
        openWishlist();
      });
    }
    if (drawer instanceof HTMLElement && drawer.dataset.bound !== "1") {
      drawer.dataset.bound = "1";
      drawer.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const pick = target.closest("[data-wishlist-pick]");
        if (pick instanceof HTMLElement) {
          chooseWishlist(pick.getAttribute("data-wishlist-pick") || "");
          return;
        }
        if (target.closest("[data-favorites-close]")) {
          setDrawerOpen(false);
          return;
        }
        // Belt and braces: marvell-shop.js normally handles this one.
        if (target.closest("[data-panel-close]") && !window.MarvellShop?.closeAllPanels) {
          setDrawerOpen(false);
          return;
        }
        if (target.closest("[data-favorites-clear]")) {
          clearFavorites();
          scheduleRefresh();
          return;
        }
        const removeButton = target.closest("[data-favorite-remove]");
        if (removeButton instanceof HTMLElement) {
          removeFavorite(removeButton.getAttribute("data-favorite-remove"));
          scheduleRefresh();
        }
      });
    }
    if (toast instanceof HTMLElement && toast.dataset.bound !== "1") {
      toast.dataset.bound = "1";
      toast.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest("[data-favorites-toast-close]") || target.closest("[data-favorites-toast-dismiss]")) {
          hideToast();
        }
      });
    }
    if (toastOverlay instanceof HTMLElement && toastOverlay.dataset.bound !== "1") {
      toastOverlay.dataset.bound = "1";
      toastOverlay.addEventListener("click", () => hideToast());
    }
    if (document.body instanceof HTMLElement && document.body.dataset.favoritesToastScrollBound !== "1") {
      document.body.dataset.favoritesToastScrollBound = "1";
      window.addEventListener("scroll", () => {
        if (toast instanceof HTMLElement && toast.classList.contains("is-open")) {
          hideToast();
        }
      }, { passive: true });
    }
  }

  function hideToast() {
    clearToastTimer();
    if (toastOverlay instanceof HTMLElement) {
      toastOverlay.classList.remove("is-open");
      toastOverlay.setAttribute("aria-hidden", "true");
      window.setTimeout(() => {
        if (toastOverlay instanceof HTMLElement && !toastOverlay.classList.contains("is-open")) {
          toastOverlay.hidden = true;
          toastOverlay.setAttribute("hidden", "");
        }
      }, 180);
    }
    if (!(toast instanceof HTMLElement)) return;
    toast.classList.remove("is-open");
    toast.setAttribute("aria-hidden", "true");
    toast.style.opacity = "0";
    toast.style.transform = "translate(-50%, -8px)";
    toast.style.pointerEvents = "none";
    window.setTimeout(() => {
      if (toast instanceof HTMLElement && !toast.classList.contains("is-open")) {
        toast.hidden = true;
        toast.setAttribute("hidden", "");
      }
    }, 180);
  }

  function showToast(item, listName = "") {
    ensureDrawerUi();
    if (!(toast instanceof HTMLElement) || !item) return;
    const title = String(item.title || "").trim() || t("Saved arrangement", "Rangkaian tersimpan");
    toast.innerHTML = `
      <div class="favorites-toast-shell">
        <div class="favorites-toast-copy">
          <h2 class="favorites-toast-title">${escapeHtml(listName
            ? t(`Added to ${listName}`, `Ditambahkan ke ${listName}`)
            : t("Added to wishlist", "Ditambahkan ke wishlist"))}</h2>
          <div class="favorites-toast-name-row">
            <div class="favorites-toast-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <p class="favorites-toast-name">${escapeHtml(title)}</p>
          </div>
          <a class="favorites-toast-link mv-underline" href="${escapeHtml(wishlistPageHref())}">${escapeHtml(t("View wishlist", "Lihat wishlist"))}</a>
        </div>
        <button class="favorites-toast-close" type="button" aria-label="${escapeHtml(t("Close", "Tutup"))}" data-favorites-toast-close>&times;</button>
      </div>
    `;
    toast.setAttribute("role", "status");
    toast.hidden = false;
    toast.removeAttribute("hidden");
    toast.setAttribute("aria-hidden", "false");
    toast.classList.add("is-open");
    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, 0)";
    toast.style.pointerEvents = "auto";
    if (toastOverlay instanceof HTMLElement) {
      toastOverlay.hidden = false;
      toastOverlay.removeAttribute("hidden");
      toastOverlay.setAttribute("aria-hidden", "false");
      toastOverlay.classList.add("is-open");
    }
    // No timer: it is dismissed by its own Close, or by the overlay behind it.
    clearToastTimer();
  }

  function renderDrawer() {
    ensureDrawerUi();
    if (!(launcher instanceof HTMLElement) || !(drawer instanceof HTMLElement)) return;
    const favorites = readFavorites();
    const count = account.signedIn
      ? Object.values(account.items).reduce((total, items) => total + items.length, 0)
      : favorites.length;
    const launcherLabel = launcher.querySelector(".favorites-launcher-label");
    const launcherCount = launcher.querySelector(".favorites-launcher-count");
    const launcherButton = launcher.querySelector(".favorites-launcher-btn");
    if (launcherLabel instanceof HTMLElement && launcherLabel.textContent !== t("Wishlist", "Wishlist")) launcherLabel.textContent = t("Wishlist", "Wishlist");
    if (launcherCount instanceof HTMLElement && launcherCount.textContent !== String(count)) launcherCount.textContent = String(count);
    if (launcherButton instanceof HTMLElement) {
      // Only the launcher this module builds is an anchor. A page that ships
      // its own header markup uses a <button>, where href means nothing.
      if (launcherButton instanceof HTMLAnchorElement) launcherButton.setAttribute("href", wishlistPageHref());
      launcherButton.classList.toggle("has-items", count > 0);
      launcherButton.classList.toggle("has-unseen", count > 0 && hasUnseenFavorites());
      launcherButton.setAttribute("aria-label", count > 0
        ? t(`Open wishlist, ${count} items`, `Buka wishlist, ${count} item`)
        : t("Open wishlist", "Buka wishlist"));
    }

    const signature = JSON.stringify({
      language: getLanguage(), account: account.signedIn, identity: accountIsSignedIn(),
      picker: pickerItem && [pickerItem.id, pickerItem.title, pickerItem.image, pickerBusy, pickerNote],
      lists: account.lists.map((list) => [list.id, list.name]),
      accountItems: Object.fromEntries(Object.entries(account.items).map(([id, items]) => [id, items.map((item) => item.id)])),
      items: favorites.map((item) => [item.id, item.title, item.image, item.href, item.category, item.price, item.sku, item.purchaseMode])
    });
    if (signature === lastDrawerSignature && drawer.firstElementChild) return;
    lastDrawerSignature = signature;

    // The same utility row every quick panel carries: a panel does not take
    // the site's navigation away while it is open, it only marks where you are.
    const utility = window.MarvellShop?.utilityRowMarkup?.("wishlist") || "";

    if (pickerItem && account.signedIn && account.lists.length > 1) {
      const chosenId = String(pickerItem.id || "");
      const choices = account.lists.map((list) => {
        const alreadySaved = (account.items[list.id] || []).some((item) => String(item.id || "") === chosenId);
        return `<button class="wishlist-picker-choice" type="button" data-wishlist-pick="${escapeHtml(list.id)}"
          ${alreadySaved || pickerBusy ? "disabled" : ""}>
          <span>${escapeHtml(list.name)}</span>
          <span class="wishlist-picker-choice-state">${alreadySaved
            ? `<svg viewBox="0 0 24 24" aria-label="${escapeHtml(t("Saved", "Tersimpan"))}"><path d="M20 6 9 17l-5-5"/></svg>`
            : escapeHtml(t("Save here", "Simpan di sini"))}</span>
        </button>`;
      }).join("");
      const image = pickerItem.image
        ? `<img src="${escapeHtml(pickerItem.image)}" alt="" loading="eager" decoding="async">` : "";
      drawer.classList.remove("mv-panel--with-foot");
      drawer.innerHTML = `
        ${utility}
        <div class="mv-panel-body">
          <section class="wishlist-picker" aria-labelledby="wishlist-picker-title">
            <div class="wishlist-picker-head">
              <p class="wishlist-picker-kicker">${escapeHtml(t("Your wishlists", "Wishlist Anda"))}</p>
              <h2 class="wishlist-picker-title" id="wishlist-picker-title">${escapeHtml(t("Where would you like to save it?", "Simpan ke wishlist mana?"))}</h2>
            </div>
            <div class="wishlist-picker-piece">
              <span class="wishlist-picker-piece-media">${image}</span>
              <p class="wishlist-picker-piece-name">${escapeHtml(pickerItem.title || t("Saved arrangement", "Rangkaian tersimpan"))}</p>
            </div>
            <div class="wishlist-picker-lists">${choices}</div>
            <div class="wishlist-picker-foot">
              ${pickerNote ? `<p class="wishlist-picker-note" role="alert">${escapeHtml(pickerNote)}</p>` : ""}
              <a class="wishlist-panel-signin mv-underline" href="${escapeHtml(wishlistPageHref())}">${escapeHtml(t("Manage wishlists", "Kelola wishlist"))}</a>
            </div>
          </section>
        </div>`;
      window.MarvellShop?.syncUtilityRows?.();
      return;
    }

    // The panel always wears its title, full or empty. Without it the empty
    // state was a paragraph floating in the middle of a tall blank panel with
    // nothing above it, which read as a page that had failed to load rather
    // than as a wishlist with nothing in it yet.
    const shown = favorites.length;
    const tally = shown === 1
      ? t("1 piece", "1 rangkaian")
      : t(`${shown} pieces`, `${shown} rangkaian`);
    const headMarkup = `
      <div class="wishlist-panel-head">
        <div class="wishlist-panel-topline">
          <h2 class="wishlist-panel-title">${escapeHtml(t("Wishlist", "Wishlist"))}</h2>
          ${shown ? `<span class="wishlist-panel-count">${escapeHtml(tally)}</span>` : ""}
        </div>
        ${account.unavailable ? `<p class="wishlist-panel-note">${escapeHtml(t(
          "We could not reach your account just now. These are the pieces saved on this device.",
          "Akun Anda belum dapat dijangkau. Ini rangkaian yang tersimpan di perangkat ini."
        ))}</p>` : ""}
      </div>
    `;

    // The list itself, which this panel had stopped drawing: every render
    // fell through to the empty state, so a customer with a full wishlist was
    // told it was empty. The rows are photography, name, price and the one
    // direct control that belongs in a panel.
    const listMarkup = shown ? `
      <ul class="wishlist-panel-list">
        ${favorites.map((item) => {
          const href = localizedHref(item.href);
          const name = escapeHtml(item.title || t("Saved arrangement", "Rangkaian tersimpan"));
          const media = item.image
            ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">`
            : "";
          return `
            <li class="wishlist-panel-item">
              ${href
                ? `<a class="wishlist-panel-media" href="${escapeHtml(href)}" tabindex="-1" aria-hidden="true">${media}</a>`
                : `<span class="wishlist-panel-media">${media}</span>`}
              <div class="wishlist-panel-body">
                <p class="mv-item-name">${href ? `<a href="${escapeHtml(href)}">${name}</a>` : name}</p>
                ${item.price ? `<span class="wishlist-panel-price">${escapeHtml(item.price)}</span>` : ""}
                <div class="wishlist-panel-item-actions">
                  <button class="mv-quiet-action mv-underline" type="button" data-favorite-remove="${escapeHtml(item.id)}">${escapeHtml(
                    t("Remove", "Hapus")
                  )}</button>
                </div>
              </div>
            </li>`;
        }).join("")}
      </ul>
    ` : "";

    // Empty is a state a wishlist is often in, so it is written as a
    // destination rather than as an apology: what it is for, and the one thing
    // worth doing next. Signing in is offered because a wishlist kept in this
    // browser alone is lost with the browser.
    const emptyMarkup = shown ? "" : `
      <div class="wishlist-panel-empty">
        <p>${escapeHtml(t("Your wishlist is empty", "Wishlist Anda masih kosong"))}</p>
        <p class="wishlist-panel-hint">${escapeHtml(t(
          "Tap the heart on any arrangement to keep it here.",
          "Ketuk ikon hati pada rangkaian mana pun untuk menyimpannya di sini."
        ))}</p>
        ${accountIsSignedIn()
          ? `<a class="wishlist-panel-signin mv-underline" href="${escapeHtml(wishlistPageHref())}">${escapeHtml(
              t("Create a new wishlist", "Buat wishlist baru")
            )}</a>`
          : `<button class="wishlist-panel-signin mv-underline" type="button" data-account-open>${escapeHtml(
              t("Sign in to keep your wishlist anywhere", "Masuk untuk menyimpan wishlist Anda di mana saja")
            )}</button>`}
      </div>
    `;

    // The way through to the room, and — for a visitor whose wishlist lives
    // in this browser alone — the same offer the page makes at its own foot.
    // Somebody already signed in is never asked again. Clearing the whole
    // list is not offered here: it is irreversible, and it belongs on the
    // page where it can be done deliberately rather than in passing.
    const footMarkup = shown ? `
      <div class="wishlist-panel-foot">
        <a class="mv-cta mv-underline" href="${escapeHtml(wishlistPageHref())}">${escapeHtml(
          t("View your wishlist", "Lihat wishlist Anda")
        )}</a>
        ${accountIsSignedIn() ? "" : `<button class="wishlist-panel-signin mv-underline" type="button" data-account-open>${escapeHtml(
          t("Sign in to keep your wishlist anywhere", "Masuk untuk menyimpan wishlist Anda di mana saja")
        )}</button>`}
      </div>
    ` : "";

    drawer.classList.remove("mv-panel--with-foot");
    drawer.innerHTML = `
      ${utility}
      <div class="mv-panel-body">
        ${headMarkup}
        ${listMarkup}
        ${emptyMarkup}
        ${footMarkup}
      </div>
    `;
    window.MarvellShop?.syncUtilityRows?.();
    window.MarvellIcons?.adopt?.(drawer);
  }

  async function chooseWishlist(listId) {
    if (!pickerItem || pickerBusy || !account.signedIn) return;
    const list = account.lists.find((entry) => entry.id === listId);
    if (!list) return;
    const item = pickerItem;
    pickerBusy = true;
    pickerNote = "";
    lastDrawerSignature = "";
    renderDrawer();
    await push({ operation: "add_item", list_id: list.id, item: toServerItem(item) });
    const saved = (account.items[list.id] || []).some((entry) => String(entry.id || "") === String(item.id || ""));
    pickerBusy = false;
    if (!saved) {
      pickerNote = t(
        "We could not save this piece. Please try again.",
        "Rangkaian ini belum dapat disimpan. Silakan coba lagi."
      );
      lastDrawerSignature = "";
      renderDrawer();
      return;
    }
    markFavoritesUnseen();
    window.MarvellAnalytics?.track?.("wishlist_add", { list_id: list.id }, item.sku || "");
    setDrawerOpen(false);
    scheduleRefresh();
    showToast(item, list.name);
  }

  function syncButton(button) {
    if (!(button instanceof HTMLElement)) return;
    const item = extractItemFromButton(button);
    if (!item) return;
    if (button.dataset.favoriteBound !== "1") {
      button.dataset.favoriteBound = "1";
      button.addEventListener("click", (event) => {
        handleToggleClick(event, button);
      });
    }
    const saved = isSaved(item.id);
    button.classList.toggle("is-saved", saved);
    button.setAttribute("aria-pressed", saved ? "true" : "false");
    const label = button.querySelector(".favorite-toggle__label");
    if (label instanceof HTMLElement) {
      label.textContent = saved ? t("Wishlisted", "Tersimpan") : t("Wishlist", "Wishlist");
    }
    const aria = saved
      ? t(`Remove ${item.title || "arrangement"} from wishlist`, `Hapus ${item.title || "rangkaian"} dari wishlist`)
      : t(`Add ${item.title || "arrangement"} to wishlist`, `Tambahkan ${item.title || "rangkaian"} ke wishlist`);
    button.setAttribute("aria-label", aria);
  }

  function syncButtons(scope = document) {
    Array.from(scope.querySelectorAll("[data-favorite-toggle]")).forEach((button) => syncButton(button));
    renderDrawer();
  }

  function scheduleRefresh() {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      syncButtons(document);
    });
  }

  function bindGlobalEvents() {
    if (document instanceof Document && document.documentElement?.dataset.favoritesCaptureBound !== "1") {
      document.documentElement.dataset.favoritesCaptureBound = "1";
      document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const button = target.closest("[data-favorite-toggle]");
        if (!(button instanceof HTMLElement)) return;
        handleToggleClick(event, button);
      }, true);
    }
    if (document.body instanceof HTMLElement && document.body.dataset.favoritesBound !== "1") {
      document.body.dataset.favoritesBound = "1";
      document.body.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const button = target.closest("[data-favorite-toggle]");
        if (!(button instanceof HTMLElement)) return;
        handleToggleClick(event, button);
      });
    }
    if (document.body instanceof HTMLElement && document.body.dataset.favoritesOpenBound !== "1") {
      document.body.dataset.favoritesOpenBound = "1";
      document.body.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (!target.closest("[data-favorites-open]")) return;
        event.preventDefault();
        markFavoritesSeen();
        scheduleRefresh();
        openWishlist();
      });
    }
    window.MarvellShop?.registerPanel?.("wishlist", {
      close: closeDrawerQuietly,
      element: () => drawer
    });
    // The panel now shows the list itself, so it has to follow the list.
    // Anything that writes announces it this way — the wishlist page, the bag's
    // Saved section, a heart on the page underneath — and an open panel that
    // still showed the state before the write would simply be wrong.
    window.addEventListener("marvell:favorites-change", () => scheduleRefresh());
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY || event.key === ACCOUNT_KEY) scheduleRefresh();
    });
    // Going back should leave the page underneath, not a drawer over it.
    window.addEventListener("popstate", () => {
      if (drawer?.classList.contains("is-open")) setDrawerOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && drawer?.classList.contains("is-open")) setDrawerOpen(false);
      if (event.key !== "Tab" || !drawer?.classList.contains("is-open")) return;
      const focusables = Array.from(drawer.querySelectorAll('a[href], button:not([disabled])'));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    if (document.body instanceof HTMLElement && typeof MutationObserver === "function") {
      // Product grids add cards after this file initializes. Watch only for
      // new heart controls instead of rescanning the entire home page after
      // every carousel, review and animation mutation. The old full-page scan
      // ran continuously on the index and made header taps feel intermittent.
      const observer = new MutationObserver((mutations) => {
        const buttons = new Set();
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (!(node instanceof Element)) continue;
            if (node.matches("[data-favorite-toggle]")) buttons.add(node);
            node.querySelectorAll?.("[data-favorite-toggle]").forEach((button) => buttons.add(button));
          }
        }
        buttons.forEach((button) => syncButton(button));
        if (buttons.size) renderDrawer();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function createHeartIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>';
  }

  function createCardButtonMarkup(data = {}) {
    const id = data.id || buildItemId(data);
    return `
      <button class="favorite-toggle" type="button" data-favorite-toggle
        data-favorite-id="${escapeHtml(id)}"
        data-favorite-title="${escapeHtml(data.title || "")}"
        data-favorite-image="${escapeHtml(data.image || "")}"
        data-favorite-href="${escapeHtml(normalizeHref(data.href || ""))}"
        data-favorite-price="${escapeHtml(data.price || "")}"
        data-favorite-category="${escapeHtml(data.category || "")}"
        data-favorite-source="${escapeHtml(data.source || "")}"
        data-favorite-sku="${escapeHtml(data.sku || "")}"
        data-favorite-purchase-mode="${escapeHtml(data.purchaseMode || "")}"
        onclick="return window.MarvellFavorites && window.MarvellFavorites.handleToggleClick ? window.MarvellFavorites.handleToggleClick(event, this) : false;">
        ${createHeartIcon()}
      </button>
    `;
  }

  function initProductFavoriteButton() {
    const button = document.getElementById("product-save");
    if (!(button instanceof HTMLElement)) return;
    syncButton(button);
  }

  function initialize() {
    injectStyles();
    ensureDrawerUi();
    const currentPath = window.location.pathname.replace(/\/+$/, "");
    const wishlistPath = new URL(wishlistPageHref(), window.location.origin).pathname.replace(/\/+$/, "");
    if (currentPath === wishlistPath) {
      markFavoritesSeen();
    }
    bindGlobalEvents();
    watchAccount();
    initProductFavoriteButton();
    placeLauncher();
    syncButtons(document);
  }

  window.MarvellFavorites = {
    open: openWishlist,
    close: () => setDrawerOpen(false),
    isOpen: () => drawer instanceof HTMLElement && drawer.classList.contains("is-open"),
    buildItemId,
    createCardButtonMarkup,
    extractItemFromButton,
    getFavorites: readFavorites,
    isSaved,
    toggleFavorite,
    setFavoriteQuantity,
    handleToggleClick,
    removeFavorite,
    clearFavorites,
    wishlistPageHref,
    savedItemsHref,
    isAccountWishlist: () => account.signedIn,
    /**
     * What the interface should say, rather than what the store managed.
     * `signedIn` is the person; `synced` is whether their lists are loaded.
     */
    accountState: () => ({
      signedIn: accountIsSignedIn(),
      synced: account.signedIn,
      unavailable: account.unavailable
    }),
    accountSnapshot: () => ({
      listId: account.listId,
      lists: account.lists.map((list) => ({ ...list })),
      items: Object.fromEntries(Object.entries(account.items).map(([id, rows]) => [id, rows.slice()]))
    }),
    accountOperation: (body) => push(body),
    hasItems: hasSavedWishlistItems,
    bindBagActions,
    syncButtons,
    scheduleRefresh
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
