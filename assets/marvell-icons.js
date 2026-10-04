/**
 * The Marvell icon family.
 *
 * The header used to be drawn with stock Lucide glyphs at stroke-width 2,
 * which read as an app toolbar rather than as a florist's masthead. These are
 * drawn to one specification instead:
 *
 *   24x24 box, 1.25 stroke, round joins, no fill
 *   optical weight matched across the set, so no icon shouts
 *   geometry squared off where Lucide rounds, to sit with the wordmark
 *
 * Every icon in the header comes from here — including the heart and the bag,
 * which are injected by favorites.js and bag.js — so the set cannot drift
 * one file at a time. Add a glyph here rather than inline anywhere else.
 */
(function () {
  if (typeof window === "undefined") return;
  if (window.MarvellIcons) return;

  const wrap = (paths) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

  const ICONS = {
    // Three rules, evenly spaced. The two-rule mark read as a margin note
    // rather than a way in; three is what a menu looks like, drawn to this
    // family's weight rather than Lucide's.
    menu: () =>
      wrap('<path d="M3.5 7h17"></path><path d="M3.5 12h17"></path><path d="M3.5 17h17"></path>'),

    // A true circle with a straight tail, meeting the ring rather than
    // overlapping it.
    search: () => wrap('<circle cx="10.75" cy="10.75" r="6.25"></circle><path d="M15.4 15.4 20 20"></path>'),

    // Squarer shoulders than the stock heart, so it sits with the wordmark
    // instead of looking like a reaction button.
    heart: () =>
      wrap(
        '<path d="M12 20.25 4.9 13.2A4.6 4.6 0 0 1 4.6 6.9a4.75 4.75 0 0 1 7.09.32.4.4 0 0 0 .62 0A4.75 4.75 0 0 1 19.4 6.9a4.6 4.6 0 0 1-.3 6.3Z"></path>'
      ),

    // Head and shoulders, open at the base: an account, not an avatar.
    account: () =>
      wrap('<circle cx="12" cy="8.25" r="3.75"></circle><path d="M4.75 20.25a7.25 7.25 0 0 1 14.5 0"></path>'),

    contact: () =>
      wrap('<rect x="3.5" y="5.5" width="17" height="13" rx=".5"></rect><path d="m4 6 8 6.5L20 6"></path>'),

    newsletter: () =>
      wrap('<path d="M5 4.5h11.5a2 2 0 0 1 2 2V20l-4.5-3H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z"></path><path d="M7 9h7M7 12h5"></path>'),

    // A shopping BAG, never a trolley: flat base, straight sides, a squared
    // handle standing above the rim.
    bag: () =>
      wrap(
        '<path d="M4.75 7.75h14.5l-1 12.5H5.75Z"></path><path d="M8.75 10V6.5a3.25 3.25 0 0 1 6.5 0V10"></path>'
      )
  };

  /** Returns the SVG markup for a name, or an empty string. */
  function icon(name) {
    return typeof ICONS[name] === "function" ? ICONS[name]() : "";
  }

  /**
   * Replaces the SVG inside a host element, keeping everything else — labels,
   * counts, badges — untouched. Used to bring already-injected controls into
   * the family without rewriting the modules that build them.
   */
  function apply(host, name) {
    if (!(host instanceof Element)) return false;
    const markup = icon(name);
    if (!markup) return false;
    const existing = host.querySelector("svg");
    if (!existing) return false;
    if (existing.dataset.marvellIcon === name) return true;
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    const next = template.content.firstElementChild;
    if (!next) return false;
    next.dataset.marvellIcon = name;
    existing.replaceWith(next);
    return true;
  }

  /**
   * Every header control that should carry a family glyph.
   *
   * The heart and the bag are injected by favorites.js and bag.js, and the
   * menu and search glyphs are inline in each page's markup, so the sweep
   * lives here rather than in any one of them.
   */
  const ADOPT = [
    [".menu-toggle .menu-icon", "menu"],
    [".search-toggle", "search"],
    [".search-mobile-trigger", "search"],
    [".favorites-launcher-btn", "heart"],
    [".bag-launcher-btn", "bag"],
    [".header-account-icon", "account"],
    [".favorite-toggle--detail", "heart"]
  ];

  function adopt(scope = document) {
    if (!scope || typeof scope.querySelectorAll !== "function") return;
    ADOPT.forEach(([selector, name]) => {
      scope.querySelectorAll(selector).forEach((host) => apply(host, name));
    });
  }

  window.MarvellIcons = { icon, apply, adopt, names: Object.keys(ICONS) };

  // The launchers arrive asynchronously on most pages, so the sweep runs once
  // now and again as the header fills in.
  function start() {
    adopt();
    if (typeof MutationObserver !== "function" || !document.body) return;
    const observer = new MutationObserver(() => adopt());
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
