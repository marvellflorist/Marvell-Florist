import { getTopPrioritySeasonalEvent } from "./seasonal-data.js";

const SESSION_KEY = "seasonalPopupClosedV2";
const LOCAL_KEY = "seasonalPopupClosedPersistentV2";
const POPUP_DELAY_MS = 1500;
const SEASONAL_POSTER_POPUP_ENABLED = false;

function shouldSkipPopupForDeepLink() {
  const rawHash = String(window.pendingPostIntroHash || window.location.hash || "").trim().toLowerCase();
  if (!rawHash) return false;
  const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
  return hash.startsWith("product-") || hash.startsWith("featured-product-");
}

function injectPopupStyles() {
  if (document.getElementById("seasonal-popup-style")) return;
  const style = document.createElement("style");
  style.id = "seasonal-popup-style";
  style.textContent = `
    .seasonal-popup {
      position: fixed;
      inset: 0;
      z-index: 260;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(6, 9, 15, 0.62);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 320ms ease, visibility 320ms ease;
      --popup-button-bg: rgba(255, 255, 255, 0.92);
      --popup-button-color: #1b1b1b;
      --petal-1: rgba(255, 231, 212, 0.85);
      --petal-2: rgba(245, 209, 195, 0.85);
      --petal-3: rgba(255, 245, 232, 0.85);
    }
    .seasonal-popup.is-open {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }
    .seasonal-popup[data-button="dark"] {
      --popup-button-bg: rgba(20, 20, 24, 0.9);
      --popup-button-color: #f6f2e8;
    }
    .seasonal-popup[data-theme="cny"] {
      --petal-1: rgba(176, 18, 37, 0.9);
      --petal-2: rgba(217, 162, 43, 0.9);
      --petal-3: rgba(244, 166, 184, 0.85);
    }
    .seasonal-popup[data-theme="eid"] {
      --petal-1: rgba(217, 188, 120, 0.9);
      --petal-2: rgba(255, 248, 236, 0.9);
      --petal-3: rgba(252, 244, 232, 0.85);
    }
    .seasonal-popup[data-theme="graduation"] {
      --petal-1: rgba(104, 58, 168, 0.9);
      --petal-2: rgba(200, 167, 74, 0.9);
      --petal-3: rgba(154, 126, 217, 0.85);
    }
    .seasonal-popup-card {
      position: relative;
      display: inline-block;
      width: min(86vw, 520px);
      aspect-ratio: 520 / 720;
      height: auto;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid rgba(236, 205, 136, 0.64);
      background: linear-gradient(150deg, rgba(43, 31, 21, 0.98), rgba(20, 26, 36, 0.98));
      box-shadow: 0 28px 50px rgba(7, 10, 16, 0.5), 0 0 0 1px rgba(250, 220, 150, 0.26), 0 0 30px rgba(244, 198, 88, 0.36);
      transform: translateY(14px) scale(0.98);
      opacity: 0;
      transition: transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 380ms ease;
    }
    .seasonal-popup.is-open .seasonal-popup-card {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    .seasonal-popup-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      background: #1a2029;
    }
    .seasonal-petals {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 1;
    }
    .seasonal-petal {
      position: absolute;
      top: -12%;
      left: var(--x, 50%);
      width: var(--size, 18px);
      height: calc(var(--size, 18px) * 0.62);
      background: var(--petal-color, var(--petal-1));
      border-radius: 60% 40% 60% 30%;
      opacity: 0.85;
      filter: blur(0.2px);
      transform: translateX(-50%) rotate(var(--rot, 0deg));
      animation: fallSmooth var(--dur, 14s) linear infinite;
      animation-delay: var(--delay, 0s);
    }
    .seasonal-popup-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      background: rgba(12, 12, 16, 0.42);
      color: #fffaf2;
      font-size: 15px;
      line-height: 1;
      cursor: pointer;
      z-index: 3;
      display: grid;
      place-items: center;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      box-shadow: 0 8px 18px rgba(6, 8, 12, 0.35);
    }
    .seasonal-popup-action {
      position: absolute;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      border: 0;
      background: var(--popup-button-bg);
      color: var(--popup-button-color);
      text-decoration: none;
      font-family: "Inter Tight", sans-serif;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: none;
      padding: 0.9rem 2.2rem;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: 0 12px 24px rgba(6, 8, 12, 0.28), 0 0 20px rgba(244, 198, 88, 0.26);
      transition: transform 200ms ease, box-shadow 200ms ease;
      z-index: 2;
    }
    .seasonal-popup-action:hover,
    .seasonal-popup-action:focus-visible {
      transform: translateX(-50%) translateY(-2px);
      box-shadow: 0 16px 30px rgba(6, 8, 12, 0.36), 0 0 26px rgba(248, 205, 94, 0.34);
    }
    body.seasonal-popup-open {
      overflow: hidden;
    }
    @keyframes fallSmooth {
      0% {
        transform: translateX(-50%) translateY(-20%) rotate(var(--rot, 0deg));
        opacity: 0;
      }
      8% {
        opacity: 0.9;
      }
      100% {
        transform: translateX(calc(-50% + var(--drift, 18px))) translateY(120%) rotate(calc(var(--rot, 0deg) + 90deg));
        opacity: 0.08;
      }
    }
    @media (max-width: 768px) {
      .seasonal-popup-close {
        top: 10px;
        right: 10px;
      }
      .seasonal-popup-action {
        bottom: 14px;
        font-size: 0.6rem;
        padding: 0.7rem 1.6rem;
        transform: translateX(-50%) scale(0.75);
        transform-origin: center;
      }
    }
  `;
  document.head.appendChild(style);
}

function resolvePopupTheme(eventData) {
  const id = String(eventData?.id || "").toLowerCase();
  if (id === "cny" || id.startsWith("cny_")) return "cny";
  if (id === "eid") return "eid";
  if (id === "graduation" || id.startsWith("graduation_")) return "graduation";
  return "default";
}

function createPetalMarkup() {
  const petals = [];
  const count = 14;
  for (let index = 0; index < count; index += 1) {
    const size = 10 + (index % 5) * 3;
    const x = 6 + (index * 7.2);
    const duration = 12 + (index % 5) * 1.2;
    const delay = -(index % 6) * 1.6;
    const drift = (index % 2 === 0 ? 1 : -1) * (10 + (index % 4) * 6);
    const rotation = -35 + (index * 12);
    const colorVar = `var(--petal-${(index % 3) + 1})`;
    petals.push(
      `<span class="seasonal-petal" style="--x:${x}%;--size:${size}px;--dur:${duration}s;--delay:${delay}s;--drift:${drift}px;--rot:${rotation}deg;--petal-color:${colorVar};"></span>`
    );
  }
  return petals.join("");
}

function createPopupElement(eventData) {
  const imageSrc = eventData.popupImage || `/assets/seasonal/${eventData.id || "seasonal"}/popup.jpg`;
  const theme = resolvePopupTheme(eventData);
  const buttonTheme = eventData.buttonTheme === "dark" ? "dark" : "light";
  const collectionHref = "#featured";
  const popup = document.createElement("div");
  popup.className = "seasonal-popup";
  popup.dataset.theme = theme;
  popup.dataset.button = buttonTheme;
  popup.setAttribute("aria-hidden", "true");
  popup.innerHTML = `
    <article class="seasonal-popup-card" role="dialog" aria-modal="true" aria-label="${eventData.title}">
      <img class="seasonal-popup-image" src="${imageSrc}" alt="${eventData.title} poster" loading="lazy" decoding="async">
      <div class="seasonal-petals" aria-hidden="true">${createPetalMarkup()}</div>
      <button class="seasonal-popup-close" type="button" aria-label="Close seasonal popup">&#10005;</button>
      <a class="seasonal-popup-action" href="${collectionHref}">View Collection</a>
    </article>
  `;
  return popup;
}

function closePopup(popup) {
  popup.classList.remove("is-open");
  popup.setAttribute("aria-hidden", "true");
  document.body.classList.remove("seasonal-popup-open");
  try {
    sessionStorage.setItem(SESSION_KEY, "true");
  } catch (_error) {
    // Ignore storage write errors.
  }
  try {
    localStorage.setItem(LOCAL_KEY, "true");
  } catch (_error) {
    // Ignore storage write errors.
  }
}

function openPopup(popup) {
  popup.classList.add("is-open");
  popup.setAttribute("aria-hidden", "false");
  document.body.classList.add("seasonal-popup-open");
}

function waitForIntroEnd() {
  return new Promise((resolve) => {
    const intro = document.getElementById("intro");
    const isLocked = () => document.body.classList.contains("intro-scroll-lock");
    if (!intro && !isLocked()) {
      resolve();
      return;
    }

    const observer = new MutationObserver(() => {
      const introGone = !document.getElementById("intro");
      if (!isLocked() && introGone) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["class"]
    });

    window.setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 8000);
  });
}

async function initializeSeasonalPopup() {
  if (!SEASONAL_POSTER_POPUP_ENABLED) return;
  if (shouldSkipPopupForDeepLink()) return;
  const eventData = getTopPrioritySeasonalEvent(new Date());
  if (!eventData) return;

  injectPopupStyles();
  const popup = createPopupElement(eventData);
  document.body.appendChild(popup);

  const closeButton = popup.querySelector(".seasonal-popup-close");
  const action = popup.querySelector(".seasonal-popup-action");

  const closeHandler = () => closePopup(popup);
  if (closeButton instanceof HTMLButtonElement) {
    closeButton.addEventListener("click", closeHandler);
  }
  if (action instanceof HTMLAnchorElement) {
    action.addEventListener("click", () => {
      closePopup(popup);
      try {
        sessionStorage.setItem(SESSION_KEY, "true");
      } catch (_error) {
        // Ignore storage write errors.
      }
      try {
        localStorage.setItem(LOCAL_KEY, "true");
      } catch (_error) {
        // Ignore storage write errors.
      }
    });
  }
  popup.addEventListener("click", (event) => {
    if (event.target === popup) closeHandler();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeHandler();
  });

  await waitForIntroEnd();
  window.setTimeout(() => openPopup(popup), POPUP_DELAY_MS);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSeasonalPopup, { once: true });
} else {
  initializeSeasonalPopup();
}
