(function () {
  const STORAGE_KEY = "marvell-favorites-v1";
  const UNSEEN_KEY = "marvell-favorites-unseen-v1";
  const MAX_ITEMS = 48;
  let frame = 0;
  let launcher = null;
  let backdrop = null;
  let drawer = null;
  let toast = null;
  let toastOverlay = null;
  let toastTimer = 0;

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

  function readFavorites() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
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

  function writeFavorites(items) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
    } catch (_error) {
      // Ignore storage failures.
    }
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

  function wishlistPageHref() {
    return localizedHref("wishlist.html");
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
      quantity: normalizeQuantity(button.dataset.favoriteQuantity || 1),
      savedAt: Date.now()
    };
    item.id = canonicalItemId(item) || String(button.dataset.favoriteId || "").trim();
    if (!item.title && !item.image && !item.href) return null;
    return item;
  }

  function isSaved(id) {
    if (!id) return false;
    return readFavorites().some((item) => String(item.id || "") === String(id));
  }

  function toggleFavorite(item) {
    if (!item) return false;
    const favorites = readFavorites();
    const existingIndex = favorites.findIndex((entry) => String(entry.id || "") === String(item.id || ""));
    if (existingIndex >= 0) {
      favorites.splice(existingIndex, 1);
      writeFavorites(favorites);
      return false;
    }
    favorites.unshift({
      ...normalizeFavoriteItem(item),
      quantity: normalizeQuantity(item.quantity),
      savedAt: Date.now()
    });
    writeFavorites(favorites);
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
  }

  function removeFavorite(id) {
    const favorites = readFavorites().filter((item) => String(item.id || "") !== String(id || ""));
    writeFavorites(favorites);
  }

  function clearFavorites() {
    writeFavorites([]);
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
    const saved = toggleFavorite(item);
    if (saved) markFavoritesUnseen();
    scheduleRefresh();
    if (saved) showToast(item);
    else hideToast();
    return false;
  }

  function injectStyles() {
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
        stroke-width: 2;
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
      @media (max-width: 899px) {
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
      .favorites-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(16, 12, 10, 0.28);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 128;
        opacity: 0;
        pointer-events: none;
        transition: opacity .22s ease;
      }
      .favorites-backdrop.is-open {
        opacity: 1;
        pointer-events: auto;
      }
      .favorites-drawer {
        position: fixed;
        top: auto;
        bottom: 0;
        right: 0;
        width: min(420px, 100vw);
        height: 100vh;
        height: 100dvh;
        background: #fff;
        color: #2f2923;
        z-index: 129;
        transform: translateY(100%);
        transition: transform .28s cubic-bezier(0.22, 1, 0.36, 1);
        box-shadow: 0 -24px 48px rgba(16, 12, 10, 0.12);
        display: grid;
        grid-template-rows: auto 1fr;
      }
      .favorites-drawer.is-open {
        transform: translateY(0);
      }
      .favorites-drawer-head {
        padding: calc(env(safe-area-inset-top, 0px) + 20px) 22px 18px;
        border-bottom: 1px solid rgba(47, 41, 35, 0.12);
        display: grid;
        gap: 14px;
      }
      .favorites-drawer-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .favorites-drawer-title {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .favorites-drawer-actions {
        display: inline-flex;
        align-items: center;
        gap: 12px;
      }
      .favorites-drawer-action,
      .favorites-drawer-close {
        border: 0;
        background: transparent;
        color: rgba(47, 41, 35, 0.72);
        font-family: "Inter Tight", sans-serif;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        padding: 0;
      }
      .favorites-drawer-close {
        font-size: 16px;
        line-height: 1;
      }
      .favorites-drawer-note {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 15px;
        line-height: 1.55;
        color: rgba(47, 41, 35, 0.78);
      }
      .favorites-drawer-body {
        overflow-y: auto;
        padding: 18px 22px calc(env(safe-area-inset-bottom, 0px) + 22px);
      }
      .favorites-empty {
        padding: 28px 0;
        color: rgba(47, 41, 35, 0.68);
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        line-height: 1.7;
      }
      .favorites-list {
        display: grid;
        gap: 18px;
      }
      .favorite-drawer-card {
        display: grid;
        grid-template-columns: 104px minmax(0, 1fr);
        gap: 14px;
        align-items: start;
      }
      .favorite-drawer-card-media {
        aspect-ratio: 4 / 5;
        overflow: hidden;
        background: #e8e2d8;
      }
      .favorite-drawer-card-media img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }
      .favorite-drawer-card-body {
        display: grid;
        gap: 8px;
        min-width: 0;
      }
      .favorite-drawer-card-category {
        font-family: "Inter Tight", sans-serif;
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(47, 41, 35, 0.48);
      }
      .favorite-drawer-card-title {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        line-height: 1.45;
        color: #2f2923;
      }
      .favorite-drawer-card-price {
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        color: rgba(47, 41, 35, 0.7);
      }
      .favorite-drawer-card-links {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
      }
      .favorite-drawer-link,
      .favorite-drawer-remove {
        font-family: "Inter Tight", sans-serif;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #2f2923;
        background: transparent;
        border: 0;
        padding: 0;
        text-decoration: none;
        cursor: pointer;
      }
      .favorite-drawer-link {
        text-decoration: underline;
        text-underline-offset: 0.2em;
      }
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
        font-family: "Relationship of Melodrame", "RelationshipDisplay", serif;
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
        text-decoration: underline;
        text-underline-offset: 0.18em;
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
        .favorites-drawer-head {
          padding-left: 18px;
          padding-right: 18px;
        }
        .favorites-drawer-body {
          padding-left: 18px;
          padding-right: 18px;
        }
        .favorite-drawer-card {
          grid-template-columns: 88px minmax(0, 1fr);
        }
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
    `;
    document.head.appendChild(style);
  }

  function ensureDrawerUi() {
    if (!(document.body instanceof HTMLElement)) return;
    if (!(launcher instanceof HTMLElement)) {
      launcher = document.createElement("div");
      launcher.className = "favorites-launcher";
      launcher.innerHTML = `
        <button class="favorites-launcher-btn" type="button" aria-expanded="false" aria-controls="favorites-drawer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>
          <span class="favorites-launcher-label"></span>
          <span class="favorites-launcher-count">0</span>
        </button>
      `;
    }
    placeLauncher();
    if (!(backdrop instanceof HTMLElement)) {
      backdrop = document.createElement("div");
      backdrop.className = "favorites-backdrop";
      backdrop.hidden = true;
      document.body.appendChild(backdrop);
    }
    if (!(drawer instanceof HTMLElement)) {
      drawer = document.createElement("aside");
      drawer.className = "favorites-drawer";
      drawer.id = "favorites-drawer";
      drawer.setAttribute("aria-hidden", "true");
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
      if (window.matchMedia("(max-width: 899px)").matches) {
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

  function setDrawerOpen(isOpen) {
    ensureDrawerUi();
    if (!(drawer instanceof HTMLElement) || !(backdrop instanceof HTMLElement) || !(launcher instanceof HTMLElement)) return;
    drawer.classList.toggle("is-open", isOpen);
    drawer.setAttribute("aria-hidden", isOpen ? "false" : "true");
    backdrop.hidden = !isOpen;
    backdrop.classList.toggle("is-open", isOpen);
    launcher.querySelector(".favorites-launcher-btn")?.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function bindDrawerEvents() {
    const launcherButton = launcher?.querySelector(".favorites-launcher-btn");
    if (launcherButton instanceof HTMLButtonElement && launcherButton.dataset.bound !== "1") {
      launcherButton.dataset.bound = "1";
      launcherButton.addEventListener("click", () => {
        markFavoritesSeen();
        scheduleRefresh();
        const targetHref = wishlistPageHref();
        const currentPath = window.location.pathname.replace(/\/+$/, "");
        const targetPath = new URL(targetHref, window.location.origin).pathname.replace(/\/+$/, "");
        if (currentPath === targetPath) {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        window.location.href = targetHref;
      });
    }
    if (backdrop instanceof HTMLElement && backdrop.dataset.bound !== "1") {
      backdrop.dataset.bound = "1";
      backdrop.addEventListener("click", () => setDrawerOpen(false));
    }
    if (drawer instanceof HTMLElement && drawer.dataset.bound !== "1") {
      drawer.dataset.bound = "1";
      drawer.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest("[data-favorites-close]")) {
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
        if (!(target instanceof HTMLElement)) return;
        if (target.closest("[data-favorites-toast-close]")) {
          hideToast();
          return;
        }
        if (target.closest("[data-favorites-toast-dismiss]")) {
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

  function showToast(item) {
    ensureDrawerUi();
    if (!(toast instanceof HTMLElement) || !item) return;
    const title = String(item.title || "").trim() || t("Saved arrangement", "Rangkaian tersimpan");
    toast.innerHTML = `
      <div class="favorites-toast-shell">
        <div class="favorites-toast-copy">
          <h2 class="favorites-toast-title">${escapeHtml(t("Added to wishlist", "Ditambahkan ke wishlist"))}</h2>
          <div class="favorites-toast-name-row">
            <div class="favorites-toast-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <p class="favorites-toast-name">${escapeHtml(title)}</p>
          </div>
          <a class="favorites-toast-link" href="${escapeHtml(wishlistPageHref())}">${escapeHtml(t("View wishlist", "Lihat wishlist"))}</a>
        </div>
        <button class="favorites-toast-close" type="button" aria-label="${escapeHtml(t("Close", "Tutup"))}" data-favorites-toast-close>&times;</button>
      </div>
    `;
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
    clearToastTimer();
  }

  function renderDrawer() {
    ensureDrawerUi();
    if (!(launcher instanceof HTMLElement) || !(drawer instanceof HTMLElement)) return;
    const favorites = readFavorites();
    const launcherLabel = launcher.querySelector(".favorites-launcher-label");
    const launcherCount = launcher.querySelector(".favorites-launcher-count");
    const launcherButton = launcher.querySelector(".favorites-launcher-btn");
    if (launcherLabel instanceof HTMLElement) launcherLabel.textContent = t("Wishlist", "Wishlist");
    if (launcherCount instanceof HTMLElement) launcherCount.textContent = String(favorites.length);
    if (launcherButton instanceof HTMLButtonElement) {
      launcherButton.classList.toggle("has-items", favorites.length > 0);
      launcherButton.classList.toggle("has-unseen", favorites.length > 0 && hasUnseenFavorites());
      launcherButton.setAttribute("aria-label", favorites.length > 0
        ? t(`Open wishlist, ${favorites.length} items`, `Buka wishlist, ${favorites.length} item`)
        : t("Open wishlist", "Buka wishlist"));
    }

    const cardsMarkup = favorites.map((item) => `
      <article class="favorite-drawer-card">
        <a class="favorite-drawer-card-media" href="${escapeHtml(localizedHref(item.href))}">
          ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || "Saved arrangement")}" loading="lazy" decoding="async">` : ""}
        </a>
        <div class="favorite-drawer-card-body">
          ${item.category ? `<div class="favorite-drawer-card-category">${escapeHtml(item.category)}</div>` : ""}
          <p class="favorite-drawer-card-title">${escapeHtml(item.title || t("Saved arrangement", "Rangkaian tersimpan"))}</p>
          ${item.price ? `<div class="favorite-drawer-card-price">${escapeHtml(item.price)}</div>` : ""}
          <div class="favorite-drawer-card-links">
            <a class="favorite-drawer-link" href="${escapeHtml(localizedHref(item.href))}">${escapeHtml(t("View Product", "Lihat Produk"))}</a>
            <button class="favorite-drawer-remove" type="button" data-favorite-remove="${escapeHtml(item.id)}">${escapeHtml(t("Remove", "Hapus"))}</button>
          </div>
        </div>
      </article>
    `).join("");

    drawer.innerHTML = `
      <div class="favorites-drawer-head">
        <div class="favorites-drawer-topline">
          <h2 class="favorites-drawer-title">${escapeHtml(t("Wishlist", "Wishlist"))}</h2>
          <div class="favorites-drawer-actions">
            ${favorites.length ? `<button class="favorites-drawer-action" type="button" data-favorites-clear>${escapeHtml(t("Clear All", "Hapus Semua"))}</button>` : ""}
            <button class="favorites-drawer-close" type="button" aria-label="${escapeHtml(t("Close wishlist", "Tutup wishlist"))}" data-favorites-close>&times;</button>
          </div>
        </div>
        <p class="favorites-drawer-note">${escapeHtml(t("Keep arrangements you love here, then come back and compare them anytime on this device.", "Simpan rangkaian yang Anda sukai di sini, lalu kembali dan bandingkan kapan saja di perangkat ini."))}</p>
      </div>
      <div class="favorites-drawer-body">
        ${favorites.length
          ? `<div class="favorites-list">${cardsMarkup}</div>`
          : `<div class="favorites-empty">${escapeHtml(t("No arrangements in your wishlist yet. Tap the heart on any arrangement to keep it here.", "Belum ada rangkaian di wishlist Anda. Ketuk ikon hati pada rangkaian mana pun untuk menyimpannya di sini."))}</div>`}
      </div>
    `;
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
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) scheduleRefresh();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setDrawerOpen(false);
    });
    if (document.body instanceof HTMLElement && typeof MutationObserver === "function") {
      const observer = new MutationObserver(() => scheduleRefresh());
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
    initProductFavoriteButton();
    placeLauncher();
    syncButtons(document);
  }

  window.MarvellFavorites = {
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
    syncButtons,
    scheduleRefresh
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
