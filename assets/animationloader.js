(() => {
  const LEN = 6000;
  const state = {
    token: 0,
    timers: new Set()
  };

  function getStrokeLength(path) {
    if (!(path instanceof SVGPathElement)) return LEN;
    try {
      const measured = Math.ceil(path.getTotalLength());
      return Number.isFinite(measured) && measured > 0 ? measured : LEN;
    } catch (_error) {
      return LEN;
    }
  }

  function clearTimers() {
    state.timers.forEach((timerId) => window.clearTimeout(timerId));
    state.timers.clear();
  }

  function scheduleTimeout(callback, delay, token) {
    const timerId = window.setTimeout(() => {
      state.timers.delete(timerId);
      if (token !== state.token) return;
      callback();
    }, delay);
    state.timers.add(timerId);
  }

  function initLoaderAnimation(root = document) {
    const scope = root instanceof HTMLElement || root instanceof Document ? root : document;
    const paths = Array.from(scope.querySelectorAll(".logo-svg path")).map((path) => ({
      node: path,
      length: getStrokeLength(path)
    }));
    if (!paths.length) return false;

    state.token += 1;
    const token = state.token;
    clearTimers();

    const reduceMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DRAW_DUR = reduceMotion ? 0 : 1500;
    const HOLD = reduceMotion ? 0 : 180;
    const STAGGER = reduceMotion ? 0 : 70;

    if (reduceMotion) {
      paths.forEach(({ node, length }) => {
        node.style.strokeDasharray = `${length} ${length}`;
        node.style.strokeDashoffset = "0";
      });
      return true;
    }

    function animatePaths(reverse) {
      paths.forEach(({ node, length }, index) => {
        const delay = index * STAGGER;
        const start = performance.now() + delay;
        const fromOffset = reverse ? 0 : length;
        const toOffset = reverse ? -length : 0;

        function step(now) {
          if (token !== state.token) return;
          const elapsed = now - start;
          if (elapsed < 0) {
            window.requestAnimationFrame(step);
            return;
          }
          const t = Math.min(elapsed / DRAW_DUR, 1);
          const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          node.style.strokeDashoffset = String(fromOffset + (toOffset - fromOffset) * ease);
          if (t < 1) window.requestAnimationFrame(step);
        }

        window.requestAnimationFrame(step);
      });
    }

    function runCycle() {
      if (token !== state.token) return;
      paths.forEach(({ node, length }) => {
        node.style.strokeDasharray = `${length} ${length}`;
        node.style.strokeDashoffset = String(length);
      });

      animatePaths(false);

      const totalDraw = DRAW_DUR + (paths.length - 1) * STAGGER;
      scheduleTimeout(() => {
        animatePaths(true);
      }, totalDraw + HOLD, token);

      scheduleTimeout(runCycle, totalDraw * 2 + HOLD * 2, token);
    }

    runCycle();
    return true;
  }

  window.MarvellLoaderAnimation = {
    init: initLoaderAnimation,
    stop() {
      state.token += 1;
      clearTimers();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initLoaderAnimation(document), { once: true });
  } else {
    initLoaderAnimation(document);
  }
})();
