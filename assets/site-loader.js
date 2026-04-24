(() => {
  const LOADER_ID = "site-loader";
  const BODY_CLASS = "loading";
  const FADE_OUT_CLASS = "fade-out";
  const HIDE_CLASS = "hidden";
  const EXPECTED_PATH_COUNT = 10;
  const LOADER_TEMPLATE_URL = "animationloader.html";
  const FAILSAFE_MS = 6000;
  const POST_LOAD_HIDE_MS = 180;
  const STROKE_LEN = 6000;
  const CRITICAL_SELECTORS = [
    "img[loading='eager']",
    ".custom-hero-media img",
    "#hero-image",
    ".featured-campaign-hero img",
    ".portfolio-campaign-hero img",
    ".about-hero-media img",
    ".about-hero-media video",
    ".services-hero-media img"
  ];

  let didHide = false;
  let failSafeTimer = 0;
  let fallbackAnimationToken = 0;
  const fallbackAnimationTimers = new Set();

  function clearFallbackAnimationTimers() {
    fallbackAnimationToken += 1;
    fallbackAnimationTimers.forEach((timerId) => window.clearTimeout(timerId));
    fallbackAnimationTimers.clear();
  }

  function scheduleFallbackAnimationTimeout(callback, delay, token) {
    const timerId = window.setTimeout(() => {
      fallbackAnimationTimers.delete(timerId);
      if (token !== fallbackAnimationToken) return;
      callback();
    }, delay);
    fallbackAnimationTimers.add(timerId);
  }

  function ensureStyles() {
    if (document.getElementById("site-loader-styles")) return;
    const styles = document.createElement("style");
    styles.id = "site-loader-styles";
    styles.textContent = `
      #site-loader {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.42);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 1;
        transition: opacity 0.36s ease;
        padding: 32px 0;
      }
      #site-loader.fade-out {
        opacity: 0;
        pointer-events: none;
      }
      #site-loader.hidden {
        display: none;
      }
      body.loading {
        overflow: hidden;
      }
      body:not(.loading) {
        overflow-y: auto;
      }
      .logo-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
      }
      .logo-svg {
        width: clamp(104px, 18vw, 180px);
        height: auto;
      }
      .logo-svg path {
        fill: none;
        stroke: #fff;
        stroke-width: 4.5;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-dasharray: 6000;
        stroke-dashoffset: 6000;
      }
      @media (prefers-reduced-motion: reduce) {
        #site-loader {
          transition: opacity 0.2s ease;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  function ensureAnimationScript() {
    const existingScript = document.querySelector("script[data-loader-animation='true']");
    if (existingScript instanceof HTMLScriptElement) {
      if (window.MarvellLoaderAnimation && typeof window.MarvellLoaderAnimation.init === "function") {
        return Promise.resolve(window.MarvellLoaderAnimation);
      }
      return new Promise((resolve) => {
        existingScript.addEventListener("load", () => resolve(window.MarvellLoaderAnimation || null), { once: true });
        existingScript.addEventListener("error", () => resolve(null), { once: true });
      });
    }

    return new Promise((resolve) => {
      const animScript = document.createElement("script");
      animScript.src = "assets/animationloader.js";
      animScript.async = true;
      animScript.dataset.loaderAnimation = "true";
      animScript.addEventListener("load", () => resolve(window.MarvellLoaderAnimation || null), { once: true });
      animScript.addEventListener("error", () => resolve(null), { once: true });
      document.head.appendChild(animScript);
    });
  }

  function getLoader() {
    return document.getElementById(LOADER_ID);
  }

  function createLoader() {
    const loader = document.createElement("div");
    loader.id = LOADER_ID;
    loader.hidden = true;
    loader.setAttribute("aria-hidden", "true");
    loader.innerHTML = `
      <div class="logo-wrap">
        <svg class="logo-svg" viewBox="0 0 1240.368164 1647.422485" xmlns="http://www.w3.org/2000/svg" width="130" height="172">
          <path d="M776.704925 669.156824 C683.785769 673.285550 589.746185 645.817447 513.658152 592.323266 C484.942923 572.134842 457.974474 547.316589 444.114130 515.067129 C430.253786 482.817669 432.217259 441.917436 456.255945 416.338569 C497.870831 466.557127 553.778981 503.973873 614.375326 528.094089 C674.971672 552.214305 740.197225 563.411883 805.363290 566.073820 C816.397868 566.524567 827.637071 566.768563 838.101977 570.297138 C844.876587 572.581415 851.119853 576.178178 857.312098 579.751602 C875.060624 589.993934 892.809151 600.236266 910.557678 610.478597 C912.048828 611.339110 913.585612 612.239984 914.594072 613.635341 C918.177901 618.594109 913.045586 625.130246 908.143646 628.791419 C870.864215 656.634779 823.188715 667.091385 776.704926 669.156824 z"></path>
          <path d="M312.631915 628.439277 C365.099800 608.168366 422.362090 600.431266 478.328227 606.050912 C482.602507 606.480099 487.590640 607.479282 489.399834 611.375497 C491.570390 616.049920 487.602647 621.161227 483.801247 624.641300 C445.619678 659.595435 394.390134 676.514170 343.787150 687.421121 C259.430734 705.603277 170.230250 709.447411 87.759202 684.048161 C89.633787 677.568182 95.061879 672.834982 100.303795 668.589218 C163.807744 617.153377 238.871746 580.073118 318.311574 560.897327 C341.120453 555.391545 364.489449 551.325877 387.937519 552.189965 C411.385588 553.054052 435.054631 559.102801 454.380672 572.409294 C453.192451 576.840760 447.363111 577.650443 442.775530 577.712582 C402.363418 578.259954 362.149905 589.690144 327.491636 610.480592 C320.544924 614.647714 313.105772 620.352425 312.631914 628.439276 z"></path>
        </svg>
      </div>
    `;
    document.body.insertAdjacentElement("afterbegin", loader);
    return loader;
  }

  async function ensureLoaderMarkup(loader) {
    if (!(loader instanceof HTMLElement)) return;
    if (loader.querySelectorAll(".logo-svg path").length >= EXPECTED_PATH_COUNT) return;

    try {
      const response = await fetch(`${LOADER_TEMPLATE_URL}?v=20260422a`, { cache: "no-store" });
      if (!response.ok) return;
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const nextWrap = doc.querySelector(".logo-wrap");
      const currentWrap = loader.querySelector(".logo-wrap");
      if (!(nextWrap instanceof HTMLElement)) return;
      if (currentWrap instanceof HTMLElement) currentWrap.replaceWith(nextWrap);
      else loader.appendChild(nextWrap);
    } catch (_error) {
      // Keep existing loader markup if the template cannot be loaded.
    }
  }

  function showLoader() {
    const loader = getLoader() || createLoader();
    if (!loader) return null;
    ensureStyles();
    loader.hidden = false;
    loader.classList.remove(HIDE_CLASS, FADE_OUT_CLASS);
    document.body.classList.add(BODY_CLASS);
    return loader;
  }

  function hideLoader() {
    if (didHide) return;
    const loader = getLoader();
    if (!loader) return;
    didHide = true;
    window.clearTimeout(failSafeTimer);
    clearFallbackAnimationTimers();
    if (window.MarvellLoaderAnimation && typeof window.MarvellLoaderAnimation.stop === "function") {
      window.MarvellLoaderAnimation.stop();
    }
    loader.classList.add(FADE_OUT_CLASS);
    document.body.classList.remove(BODY_CLASS);
    window.setTimeout(() => {
      loader.classList.add(HIDE_CLASS);
      loader.classList.remove(FADE_OUT_CLASS);
      loader.hidden = true;
    }, 360);
  }

  function isCriticalMediaReady(node) {
    if (node instanceof HTMLImageElement) {
      return node.complete && node.naturalWidth > 0;
    }
    if (node instanceof HTMLVideoElement) {
      return node.readyState >= 2 || node.ended;
    }
    return true;
  }

  function collectCriticalMedia() {
    const media = [];
    const seen = new Set();
    CRITICAL_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (!(node instanceof HTMLImageElement) && !(node instanceof HTMLVideoElement)) return;
        if (seen.has(node)) return;
        seen.add(node);
        media.push(node);
      });
    });
    return media;
  }

  function waitForCriticalContent() {
    const media = collectCriticalMedia();
    const pending = media.filter((node) => !isCriticalMediaReady(node));

    if (!pending.length) {
      window.requestAnimationFrame(hideLoader);
      return;
    }

    let remaining = pending.length;
    const onSettled = () => {
      remaining -= 1;
      if (remaining <= 0) hideLoader();
    };

    pending.forEach((node) => {
      const eventName = node instanceof HTMLVideoElement ? "loadeddata" : "load";
      const handleEvent = () => {
        node.removeEventListener(eventName, handleEvent);
        node.removeEventListener("error", handleEvent);
        onSettled();
      };
      node.addEventListener(eventName, handleEvent, { once: true });
      node.addEventListener("error", handleEvent, { once: true });
    });

    window.addEventListener("load", () => {
      window.setTimeout(hideLoader, POST_LOAD_HIDE_MS);
    }, { once: true });

    failSafeTimer = window.setTimeout(() => {
      if (document.readyState === "complete") hideLoader();
    }, FAILSAFE_MS);
  }

  function startFallbackAnimation(loader) {
    if (!(loader instanceof HTMLElement)) return false;
    const paths = Array.from(loader.querySelectorAll(".logo-svg path"));
    if (!paths.length) return false;

    clearFallbackAnimationTimers();
    const token = fallbackAnimationToken;
    const reduceMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DRAW_DUR = reduceMotion ? 0 : 1500;
    const HOLD = reduceMotion ? 0 : 180;
    const STAGGER = reduceMotion ? 0 : 70;

    paths.forEach((path) => {
      path.style.strokeDasharray = String(STROKE_LEN);
      path.style.strokeDashoffset = String(STROKE_LEN);
    });

    if (reduceMotion) {
      paths.forEach((path) => {
        path.style.strokeDashoffset = "0";
      });
      return true;
    }

    function animatePaths(reverse) {
      paths.forEach((path, index) => {
        const delay = index * STAGGER;
        const start = performance.now() + delay;
        const fromOffset = reverse ? 0 : STROKE_LEN;
        const toOffset = reverse ? -STROKE_LEN : 0;

        function step(now) {
          if (token !== fallbackAnimationToken) return;
          const elapsed = now - start;
          if (elapsed < 0) {
            window.requestAnimationFrame(step);
            return;
          }
          const t = Math.min(elapsed / DRAW_DUR, 1);
          const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          path.style.strokeDashoffset = String(fromOffset + (toOffset - fromOffset) * ease);
          if (t < 1) window.requestAnimationFrame(step);
        }

        window.requestAnimationFrame(step);
      });
    }

    function runCycle() {
      if (token !== fallbackAnimationToken) return;
      paths.forEach((path) => {
        path.style.strokeDashoffset = String(STROKE_LEN);
      });

      animatePaths(false);
      const totalDraw = DRAW_DUR + ((paths.length - 1) * STAGGER);
      scheduleFallbackAnimationTimeout(() => {
        animatePaths(true);
      }, totalDraw + HOLD, token);
      scheduleFallbackAnimationTimeout(runCycle, (totalDraw * 2) + (HOLD * 2), token);
    }

    runCycle();
    return true;
  }

  function startLoaderAnimation(loader, retries = 6) {
    if (!(loader instanceof HTMLElement)) return;
    const initExternal = () => (
      window.MarvellLoaderAnimation
      && typeof window.MarvellLoaderAnimation.init === "function"
      && window.MarvellLoaderAnimation.init(loader)
    );

    if (initExternal()) return;
    if (startFallbackAnimation(loader)) return;
    if (retries <= 0) return;
    window.requestAnimationFrame(() => {
      startLoaderAnimation(loader, retries - 1);
    });
  }

  function initialize() {
    const loader = showLoader();
    if (!loader) return;
    Promise.allSettled([ensureLoaderMarkup(loader), ensureAnimationScript()]).finally(() => {
      startLoaderAnimation(loader);
      waitForCriticalContent();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  window.MarvellSiteLoader = {
    init: initialize,
    hide: hideLoader,
    isActive: () => document.body.classList.contains(BODY_CLASS)
  };
})();
