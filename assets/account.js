/**
 * The account quick panel.
 *
 * A drawer, not a page, opened from the person glyph in the header. It offers
 * the three things someone arriving at an account control has come for:
 *
 *   SIGN IN            reach an account that already exists
 *   CREATE MY MARVELL  make one — which, without passwords, is the same act
 *   TRACK YOUR ORDER   follow a purchase, with no account at all
 *
 * All three start closed. A panel that opens with a form already expanded has
 * decided for the person which of the three they wanted, and it is wrong two
 * times in three.
 *
 * PASSWORDLESS
 * There is no password field here and there never will be. Signing in means
 * receiving a code by email and typing it back, or following the link in the
 * same email, or continuing with Google.
 *
 * SIGNING IN IS NOT SIGNING UP
 * They were treated as one act, on the reasoning that with no password to set
 * there is nothing to sign up for. That was wrong: an address that had never
 * registered could ask for a code, get one, and be signed in, and Create My
 * Marvell then refused it as a duplicate. Sign in now only opens an account
 * that exists. An address with none is told so and sent to the form.
 *
 * WHERE THE SESSION IS
 * Not here. The session lives in httpOnly cookies set by /api/account/*, which
 * this file cannot read — that is the point. Nothing in this file decides who
 * anybody is; it asks /api/account/session and draws what it is told. A
 * tampered-with browser can change what this panel looks like and nothing else.
 *
 * GUESTS
 * Checkout never requires any of this. The bag, the checkout and the order
 * lookup all work signed out, and they are not quietly degraded when somebody
 * is not signed in.
 */
(function () {
  if (typeof window === "undefined") return;
  if (window.MarvellAccount) return;

  const Shop = window.MarvellShop;
  const t = Shop
    ? Shop.t
    : (en, id) => (window.MarvellLanguage?.getLanguage?.() === "id" ? id : en);
  const escapeHtml = Shop
    ? Shop.escapeHtml
    : (value) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

  /**
   * Whether the account system is reachable at all.
   *
   * Not a hardcoded switch any more: the server answers it. /api/account/session
   * reports `available: false` when Supabase or email delivery is not
   * configured for this deployment, and the panel then offers the guest routes
   * instead of a form that cannot succeed. A form that looks real and silently
   * does nothing is worse than no form.
   */
  // Creating an account is a page, not a row in a drawer: it is deliberate, it
  // asks two questions, and it deserves more than a panel over whatever
  // somebody happened to be reading. The panel signs people in and shows them
  // what they have; this is where one is made.
  const JOIN_PAGE = "/account";

  const API = {
    session: "/api/account/session",
    requestCode: "/api/account/request-code",
    verify: "/api/account/verify",
    orders: "/api/account/orders",
    google: "/api/account/google"
  };

  /**
   * Everything the panel draws from. `signed_in` is only ever set from a
   * server reply — never from localStorage, never from a query string, never
   * from optimism.
   */
  const state = {
    loaded: false,
    available: true,
    signedIn: false,
    user: null,
    providers: { google: false },
    orders: null,
    ordersError: "",
    stage: "email",
    pendingEmail: "",
    // Set when the last sign-in attempt found no account for that address.
    // Cleared on the next attempt, so the way out is offered while it is
    // relevant and not a moment longer.
    notFound: false,
    attemptedEmail: "",
    // How many digits the code has. Supabase's OTP length is a project
    // setting, so this is never assumed: /api/account/request-code measures a
    // real generated code and reports its length, and that is what the field
    // and the wording use. OTP_MAX until then, so a longer code is never
    // truncated on the way in.
    codeLength: 0,
    busy: false
  };

  // The range of sign-in code lengths Supabase can issue, mirroring
  // OTP_MIN_LENGTH / OTP_MAX_LENGTH in netlify/functions/_lib/accounts.mjs.
  // The field accepts the widest of these until the server says which it is;
  // a field capped at one guessed length is what made an 8-digit code
  // impossible to enter.
  const OTP_MIN = 6;
  const OTP_MAX = 10;
  const codeDigits = () => (state.codeLength >= OTP_MIN && state.codeLength <= OTP_MAX ? state.codeLength : 0);
  // "a 6-digit code", but "an 8-digit code".
  const digitPhrase = (n) => `${n === 8 ? "an" : "a"} ${n}-digit`;

  // The order-number shape order.html accepts. Checked here so a typo is
  // caught in the panel rather than becoming a "not found" page.
  const ORDER_PATTERN = /^(?:MF-\d{6}-[A-Z0-9]{5}|MV-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4})$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;

  // The receipt page sends a fresh access link to the address on the order.

  let drawer = null;
  let lastFocused = null;
  let openSection = "";
  // Boot and an immediately opened account panel can ask for the session in
  // the same tick. Share that request: a refresh token is rotated when it is
  // used, so racing two refreshes can make the later response look signed out
  // even though the first one successfully renewed the session.
  let sessionRefresh = null;

  /**
   * The single place the rest of the panel asks. It reports what the last
   * server answer said and nothing else.
   */
  function isSignedIn() {
    return Boolean(state.signedIn && state.user);
  }

  /** Opens or closes a title list. Both halves of the state move together. */
  function setSelectOpen(select, open) {
    if (!select) return;
    select.dataset.open = open ? "true" : "false";
    select.querySelector("[data-account-select-trigger]")?.setAttribute("aria-expanded", open ? "true" : "false");
  }

  /**
   * The entry invites new visitors, and becomes the account after sign-in.
   */
  function label() {
    return isSignedIn() ? t("Account", "Akun") : t("Join Marvell", "Gabung Marvell");
  }

  // -- styles --------------------------------------------------------------

  function injectStyles() {
    Shop?.injectPanelStyles?.();
    if (document.getElementById("marvell-account-styles")) return;

    const style = document.createElement("style");
    style.id = "marvell-account-styles";
    style.textContent = `

      /* The utility row is the panel's head, so the body starts flush under
         it and the usual panel padding is taken over by the sections. */
      .mv-panel--account .mv-panel-body {
        align-content: start;
        gap: 0 !important;
        padding: 0 !important;
      }

      .account-head {
        padding: clamp(40px, 7vw, 76px) clamp(26px, 5vw, 56px) clamp(30px, 5vw, 52px);
      }
      .account-head h2 {
        margin: 0;
        font-family: "AdelioDisplayCondensed", "Inter Tight", sans-serif;
        font-size: clamp(25px, 2.5vw, 33px);
        font-weight: 300;
        line-height: 1.12;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #1d1a18;
      }
      .account-head p {
        margin: 14px 0 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        line-height: 1.62;
        color: rgba(29, 26, 24, 0.58);
      }

      /* No card, no box. One hairline between rows and nothing else, so the
         panel reads as a continuation of the page rather than a form on top
         of it. */
      .account-sections {
        border-top: 1px solid rgba(29, 26, 24, 0.1);
      }
      .account-section {
        border-bottom: 1px solid rgba(29, 26, 24, 0.1);
      }
      .account-section-head {
        width: 100%;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 18px;
        padding: clamp(24px, 3.4vw, 32px) clamp(26px, 5vw, 56px);
        border: 0;
        background: transparent;
        text-align: left;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        font-family: "Inter Tight", sans-serif;
        color: inherit;
      }
      .account-section-head:focus-visible {
        outline: 1px solid rgba(29, 26, 24, 0.35);
        outline-offset: -3px;
      }
      /* A plus, turning into a cross. This was a fine ring that filled with a
         dot, which is a radio control's language — one of several, pick one —
         and these sections are not that: each one opens and shuts on its own.
         Every other accordion here already says it with a plus (the footer
         columns in assets/shared-footer.js, the services list, the gallery's
         filter groups), so this one does too, in the same place, at the right
         hand end of the row. */
      .account-section-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 0;
        font-size: 15px;
        line-height: 1;
        color: rgba(29, 26, 24, 0.62);
        transition: transform 0.24s ease, color 0.24s ease;
      }
      .account-section-mark::after {
        content: "+";
      }
      .account-section.is-open .account-section-mark {
        transform: rotate(45deg);
        color: #1d1a18;
      }

      .account-section-title {
        display: block;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        line-height: 1.4;
        color: #1d1a18;
      }
      .account-section-note {
        display: block;
        margin-top: 7px;
        font-size: 13px;
        line-height: 1.55;
        color: rgba(29, 26, 24, 0.55);
      }

      /* Height animation rather than display:none, so opening and closing are
         the same gesture in both directions. */
      .account-section-panel {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows 0.42s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .account-section.is-open .account-section-panel { grid-template-rows: 1fr; }
      .account-section-panel-inner {
        overflow: hidden;
        min-height: 0;
      }
      .account-section-panel-body {
        padding: 0 clamp(26px, 5vw, 56px) clamp(28px, 4vw, 38px) calc(clamp(26px, 5vw, 56px) + 33px);
      }

      .account-section-panel p {
        margin: 0 0 16px;
        font-family: "Inter Tight", sans-serif;
        font-size: 13px;
        line-height: 1.68;
        color: rgba(29, 26, 24, 0.62);
      }
      .account-section-panel p:last-child { margin-bottom: 0; }

      /* A note, not an alert: a rule and quiet text, no tinted box. */
      .account-pending {
        margin: 0;
        padding-left: 15px;
        border-left: 1px solid rgba(29, 26, 24, 0.18);
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        line-height: 1.65;
        color: rgba(29, 26, 24, 0.5);
      }

      .account-list {
        margin: 0 0 16px;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 9px;
      }
      .account-list li {
        position: relative;
        padding-left: 16px;
        font-family: "Inter Tight", sans-serif;
        font-size: 13px;
        line-height: 1.55;
        color: rgba(29, 26, 24, 0.62);
      }
      .account-list li::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0.72em;
        width: 7px;
        height: 1px;
        background: rgba(29, 26, 24, 0.3);
      }

      /* Underlined fields, no boxes. */
      .account-field { display: grid; gap: 7px; margin-bottom: 20px; }
      .account-field label {
        font-family: "Inter Tight", sans-serif;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: rgba(29, 26, 24, 0.52);
      }
      .account-field input {
        width: 100%;
        height: 38px;
        padding: 0 0 2px;
        border: 0;
        border-bottom: 1px solid rgba(29, 26, 24, 0.24);
        border-radius: 0;
        background: transparent;
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        color: #1d1a18;
        appearance: none;
        -webkit-appearance: none;
        transition: border-color 0.24s ease;
      }
      .account-field input::placeholder { color: rgba(29, 26, 24, 0.28); }
      .account-field input:focus { outline: none; border-bottom-color: #151210; }
      .account-field input[aria-invalid="true"] { border-bottom-color: #9a4a35; }
      .account-field-order input { text-transform: uppercase; letter-spacing: 0.06em; }
      .account-field-order input::placeholder { text-transform: none; letter-spacing: 0.01em; }

      .account-submit {
        min-height: 42px;
        padding: 0 26px;
        border: 1px solid #151210;
        border-radius: 0;
        background: #151210;
        color: #f8f4ec;
        font-family: "Inter Tight", sans-serif;
        font-size: 11px;
        letter-spacing: 0.11em;
        text-transform: uppercase;
        cursor: pointer;
        transition: background-color 0.24s ease, color 0.24s ease;
      }
      .account-submit:hover,
      .account-submit:focus-visible {
        background: transparent;
        color: #151210;
        outline: none;
      }

      .account-note {
        margin: 16px 0 0 !important;
        font-size: 12px !important;
      }
      .account-note[data-tone="error"] { color: #9a4a35 !important; }
      .account-not-found {
        margin: 18px 0 0 !important;
        color: #9a4a35 !important;
        font-size: 13px !important;
        line-height: 1.6;
      }
      .account-not-found a {
        display: inline-block;
        margin-top: 9px;
        color: #1d1a18;
        text-decoration: underline;
        text-underline-offset: 0.24em;
      }
      .account-details-link {
        display: inline-block;
        margin-top: 16px;
        color: #1d1a18;
        font-size: 13px;
        text-decoration: underline;
        text-underline-offset: 0.24em;
      }

      .account-foot {
        padding: clamp(30px, 5vw, 46px) clamp(26px, 5vw, 56px) clamp(34px, 5vw, 52px);
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        line-height: 1.65;
        color: rgba(29, 26, 24, 0.48);
      }
      .account-foot a { color: inherit; }

      /* Continue with Google. A bordered button, never Google's blue: it is
         one of two ways in, not the recommended one. */
      .account-alt {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 42px;
        width: 100%;
        margin-top: 18px;
        padding: 0 20px;
        border: 1px solid rgba(29, 26, 24, 0.24);
        background: transparent;
        color: #1d1a18;
        font-family: "Inter Tight", sans-serif;
        font-size: 11px;
        letter-spacing: 0.11em;
        text-transform: uppercase;
        text-decoration: none;
        cursor: pointer;
        transition: border-color 0.24s ease, background-color 0.24s ease;
      }
      .account-alt:hover:not([aria-disabled="true"]),
      .account-alt:focus-visible:not([aria-disabled="true"]) {
        border-color: #151210;
        background: rgba(29, 26, 24, 0.04);
        outline: none;
      }
      /* Shown either way, so the way in is visible, and plainly switched off
         until Supabase actually has the provider. An enabled button that
         cannot work is worse than a disabled one that says why. */
      .account-alt[aria-disabled="true"] { opacity: 0.45; cursor: default; }
      .account-alt svg { width: 16px; height: 16px; display: block; }
      .account-or {
        display: block;
        margin: 18px 0 0;
        font-size: 11px !important;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: rgba(29, 26, 24, 0.4) !important;
      }

      .account-code-input input {
        font-size: 22px !important;
        letter-spacing: 0.34em;
        height: 46px !important;
      }
      /* The field is set large because the code is the thing being read back.
         The prompt is not: it inherited that size and tracking and arrived
         looking like a heading in the blank field. It is a hint, so it is
         written as one and gets out of the way the moment anything is typed. */
      .account-code-input input::placeholder {
        font-size: 12px;
        font-weight: 300;
        letter-spacing: 0.06em;
        color: rgba(29, 26, 24, 0.32);
        opacity: 1;
      }
      .account-code-input input::-webkit-input-placeholder {
        font-size: 12px;
        font-weight: 300;
        letter-spacing: 0.06em;
        color: rgba(29, 26, 24, 0.32);
      }
      .account-quiet {
        margin-top: 14px;
        border: 0;
        padding: 0;
        background: transparent;
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        color: rgba(29, 26, 24, 0.62);
        text-decoration: underline;
        text-underline-offset: 0.26em;
        cursor: pointer;
      }
      .account-quiet:hover, .account-quiet:focus-visible { color: #1d1a18; outline: none; }

      /* --- signed in ---------------------------------------------------- */
      .account-identity {
        display: grid;
        gap: 6px;
        padding: 0 clamp(26px, 5vw, 56px) clamp(26px, 4vw, 40px);
      }
      .account-identity-email {
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        color: rgba(29, 26, 24, 0.6);
      }
      .account-orders { display: grid; }
      .account-order {
        border-top: 1px solid rgba(29, 26, 24, 0.1);
        padding: clamp(20px, 3vw, 28px) clamp(26px, 5vw, 56px);
        display: grid;
        gap: 10px;
      }
      .account-order-top {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 16px;
      }
      .account-order-number {
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #1d1a18;
      }
      .account-order-total {
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        color: #1d1a18;
        font-variant-numeric: tabular-nums;
      }
      .account-order-meta {
        font-family: "Inter Tight", sans-serif;
        font-size: 13px;
        line-height: 1.6;
        color: rgba(29, 26, 24, 0.55);
      }
      .account-order-state {
        font-family: "Inter Tight", sans-serif;
        font-size: 11px;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: rgba(29, 26, 24, 0.55);
      }
      .account-order-state[data-paid="true"] { color: #4a6a4e; }
      .account-order-items {
        margin: 4px 0 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 6px;
      }
      .account-order-items li {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        font-family: "Inter Tight", sans-serif;
        font-size: 13px;
        line-height: 1.5;
        color: rgba(29, 26, 24, 0.7);
      }
      .account-order-items span:last-child { font-variant-numeric: tabular-nums; white-space: nowrap; }

      /* A row that leaves rather than opens: an arrow, not a plus, because
         nothing here expands. */
      .account-section--link .account-section-mark::after { content: none; }
      .account-section--link .account-section-mark {
        border-style: solid;
        border-color: rgba(29, 26, 24, 0.32);
        border-width: 0 1px 1px 0;
        border-radius: 0;
        width: 7px;
        height: 7px;
        margin-right: 3px;
        transform: rotate(-45deg);
        transition: transform 0.3s ease;
      }
      .account-section--link .account-section-head:hover .account-section-mark {
        transform: rotate(-45deg) translate(2px, 2px);
      }

      /* The title, as a line that opens: the same control the newsletter form
         uses for the same question, sized to the fields around it. */
      .account-label {
        font-family: "Inter Tight", sans-serif;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: rgba(29, 26, 24, 0.52);
      }
      .account-select { position: relative; }
      .account-select-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        height: 38px;
        padding: 0 0 2px;
        border: 0;
        border-bottom: 1px solid rgba(29, 26, 24, 0.24);
        border-radius: 0;
        background: transparent;
        color: #1d1a18;
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        text-align: left;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        transition: border-color 0.24s ease;
      }
      .account-select-trigger:focus-visible,
      .account-select-trigger[aria-expanded="true"] { outline: none; border-bottom-color: #151210; }
      .account-select-value {
        min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .account-select-value[data-placeholder="true"] { color: rgba(29, 26, 24, 0.42); }
      .account-select-caret {
        flex: 0 0 auto;
        width: 8px; height: 8px; margin-bottom: 4px;
        border-right: 1px solid currentColor;
        border-bottom: 1px solid currentColor;
        transform: rotate(45deg);
        transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .account-select-trigger[aria-expanded="true"] .account-select-caret {
        transform: rotate(225deg); margin-bottom: -2px;
      }
      .account-select-list {
        position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 5;
        display: grid; margin: 0; padding: 4px 0; list-style: none;
        max-height: min(44vh, 300px); overflow-y: auto; overscroll-behavior: contain;
        background: #fff; border: 1px solid #e4e6e8;
        box-shadow: 0 16px 44px rgba(0, 0, 0, 0.12);
        opacity: 0; visibility: hidden; transform: translateY(-8px); pointer-events: none;
        transition: opacity 0.34s ease, transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 0.34s;
      }
      .account-select[data-open="true"] .account-select-list {
        opacity: 1; visibility: visible; transform: translateY(0); pointer-events: auto;
        transition: opacity 0.34s ease, transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s;
      }
      .account-select-option {
        width: 100%; min-height: 40px; padding: 0 16px;
        border: 0; background: transparent; color: rgba(29, 26, 24, 0.72);
        font-family: "Inter Tight", sans-serif; font-size: 14px; text-align: left; cursor: pointer;
        transition: color 0.2s ease, background-color 0.2s ease;
      }
      .account-select-option:hover,
      .account-select-option:focus-visible { color: #12100e; background: rgba(29, 26, 24, 0.04); outline: none; }
      .account-select-option[aria-selected="true"] { color: #12100e; font-weight: 500; }

      .account-field input[readonly] { color: rgba(29, 26, 24, 0.45); cursor: default; }

      .account-check {
        display: grid;
        grid-template-columns: 16px minmax(0, 1fr);
        align-items: start;
        gap: 12px;
        margin: 0 0 22px;
        font-family: "Inter Tight", sans-serif;
        font-size: 13px;
        line-height: 1.6;
        color: rgba(29, 26, 24, 0.66);
        cursor: pointer;
      }
      .account-check input {
        width: 16px; height: 16px; margin-top: 2px;
        accent-color: #12100e; cursor: pointer;
      }

      @media (max-width: 768px) {
        .account-section-panel-body { padding-left: calc(16px + 33px); }
        .account-identity, .account-order { padding-left: 16px; padding-right: 16px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .account-section-panel,
        .account-section-mark,
        .account-section-mark::after { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }

  // -- markup --------------------------------------------------------------

  function sectionMarkup({ id, title, note, body }) {
    return `
      <div class="account-section" data-account-section="${escapeHtml(id)}">
        <button class="account-section-head" type="button" data-account-toggle="${escapeHtml(id)}"
          aria-expanded="false" aria-controls="account-section-${escapeHtml(id)}">
          <span>
            <span class="account-section-title">${escapeHtml(title)}</span>
            <span class="account-section-note">${escapeHtml(note)}</span>
          </span>
          <span class="account-section-mark" aria-hidden="true"></span>
        </button>
        <div class="account-section-panel" id="account-section-${escapeHtml(id)}" role="region">
          <div class="account-section-panel-inner">
            <div class="account-section-panel-body">${body}</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * A row that goes somewhere instead of opening.
   *
   * A filled wishlist is a page; the empty one uses the shared panel.
   * This row hands off to the same entry point as the heart in the header.
   */
  function linkSectionMarkup({ id, title, note }) {
    return `
      <div class="account-section account-section--link" data-account-section="${escapeHtml(id)}">
        <button class="account-section-head" type="button" data-account-goto="${escapeHtml(id)}">
          <span>
            <span class="account-section-title">${escapeHtml(title)}</span>
            <span class="account-section-note">${escapeHtml(note)}</span>
          </span>
          <span class="account-section-mark" aria-hidden="true"></span>
        </button>
      </div>
    `;
  }

  /**
   * Shown in place of a form when this deployment has no account system
   * configured. It says so plainly and points at what does work.
   */
  function unavailableNotice() {
    return `
      <p class="account-pending">${escapeHtml(
        t(
          "Accounts are not available yet. You can still track an order below.",
          "Akun belum tersedia. Anda tetap bisa melacak pesanan di bawah."
        )
      )}</p>
    `;
  }

  function googleMark() {
    // Google's four-colour G, which is the one mark they allow to be redrawn.
    return `<svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/>
    </svg>`;
  }

  /**
   * The sign-in form, in its two stages.
   *
   * Stage one asks for an address. Stage two asks for the code that was sent
   * to it. Both stages are the same form in the same place, so the panel never
   * jumps to somewhere new mid-thought.
   */
  function signInForm() {
    if (!state.available) return unavailableNotice();

    if (state.stage === "code") {
      const digits = codeDigits();
      return `
        <form class="account-lookup" data-account-code novalidate>
          <p>${escapeHtml(
            digits
              ? t(
                  `We sent ${digitPhrase(digits)} code to ${state.pendingEmail}.`,
                  `Kami mengirim kode ${digits} digit ke ${state.pendingEmail}.`
                )
              : t(
                  `We sent a code to ${state.pendingEmail}.`,
                  `Kami mengirim kode ke ${state.pendingEmail}.`
                )
          )}</p>
          <div class="account-field account-code-input">
            <label for="account-code">${escapeHtml(t("Your code", "Kode Anda"))}</label>
            <input id="account-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code"
              pattern="[0-9]*" maxlength="${digits || OTP_MAX}" minlength="${digits || OTP_MIN}"
              spellcheck="false" required data-account-code-input
              placeholder="${escapeHtml(t("Enter your code", "Masukkan kode Anda"))}">
          </div>
          <button class="account-submit" type="submit">${escapeHtml(t("Sign in", "Masuk"))}</button>
          <p class="account-note" data-account-note></p>
          <button class="account-quiet" type="button" data-account-restart>${escapeHtml(
            t("Use another email", "Gunakan email lain")
          )}</button>
        </form>
      `;
    }

    // Somebody whose address has no account. Rather than an error to read and
    // then work out what to do about, the way out is the next thing on screen.
    const notFound = state.notFound
      ? `<p class="account-not-found" role="alert" data-account-not-found>${escapeHtml(
           t(
             "No account exists for this email address.",
             "Belum ada akun untuk alamat email ini."
           )
         )}<br><a href="${escapeHtml(JOIN_PAGE)}">${escapeHtml(
           t("Create your account", "Buat akun")
         )}</a></p>`
      : "";

    return `
      <form class="account-lookup" data-account-signin novalidate>
        <div class="account-field">
          <label for="account-signin-email">${escapeHtml(t("Email address", "Alamat email"))}</label>
          <input id="account-signin-email" name="email" type="email" inputmode="email"
            autocomplete="email" spellcheck="false" maxlength="254" required
            value="${escapeHtml(state.attemptedEmail)}"
            placeholder="${escapeHtml(t("you@example.com", "anda@contoh.com"))}">
        </div>
        <button class="account-submit" type="submit">${escapeHtml(t("Continue with email", "Lanjutkan dengan email"))}</button>
        ${notFound}
        <p class="account-note" data-account-note></p>
        <p class="account-note account-or">${escapeHtml(t("or", "atau"))}</p>
        ${state.providers.google
          ? `<a class="account-alt" href="${escapeHtml(API.google)}" data-account-google>
               ${googleMark()}<span>${escapeHtml(t("Continue with Google", "Lanjutkan dengan Google"))}</span>
             </a>`
          : `<span class="account-alt" aria-disabled="true" title="${escapeHtml(
               t("Not available yet", "Belum tersedia")
             )}">${googleMark()}<span>${escapeHtml(
               t("Continue with Google (coming soon)", "Lanjutkan dengan Google (segera hadir)")
             )}</span></span>`}
      </form>
    `;
  }

  function signInBody() {
    return signInForm();
  }

  /**
   * Creating an account and signing in are the same act here. With no password
   * to set, an address Supabase has not seen before simply becomes an account.
   * The row says what an account is for and then offers that same form, rather
   * than sending somebody to the row above and hoping they notice.
   */
  function createBody() {
    return `
      <p>${escapeHtml(
        t(
          "Keep your orders and details in one place.",
          "Simpan pesanan dan detail Anda di satu tempat."
        )
      )}</p>
      ${state.available
        ? `<a class="mv-cta mv-cta--apply" href="${escapeHtml(JOIN_PAGE)}">${escapeHtml(
            t("Create your account", "Buat akun")
          )}</a>`
        : unavailableNotice()}
    `;
  }

  /**
   * Both fields are required. An order number on its own is a short string in
   * a browser history or a forwarded message, and it should not be enough to
   * open somebody's order — the email on the order has to match it.
   *
   * This stays exactly as it is for somebody signed in, because it is the
   * thing that needs no account at all.
   */
  function trackBody() {
    return `
      <form class="account-lookup" data-account-lookup novalidate>
        <div class="account-field">
          <label for="account-lookup-email">${escapeHtml(t("Email address", "Alamat email"))}</label>
          <input id="account-lookup-email" name="email" type="email" inputmode="email"
            autocomplete="email" spellcheck="false" maxlength="254"
            placeholder="${escapeHtml(t("The email on the order", "Email yang dipakai memesan"))}" required>
        </div>
        <div class="account-field account-field-order">
          <label for="account-lookup-order">${escapeHtml(t("Order number", "Nomor pesanan"))}</label>
          <input id="account-lookup-order" name="order" type="text" inputmode="text"
            autocomplete="off" spellcheck="false" maxlength="16"
            placeholder="MF-000000-XXXXX" required>
        </div>
        <button class="account-submit" type="submit">${escapeHtml(t("Find order", "Cari pesanan"))}</button>
        <p class="account-note" data-account-note>${escapeHtml(
          t(
            "The order number is on your confirmation, like MF-260920-A1B2C.",
            "Nomor pesanan ada pada konfirmasi Anda, seperti MF-260920-A1B2C."
          )
        )}</p>
      </form>
    `;
  }

  // -- the signed-in panel ---------------------------------------------------

  function formatMoney(value) {
    return Shop?.formatIdr?.(value) || "";
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(t("en-GB", "id-ID"), {
      day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"
    }).format(date);
  }

  /** Plain words for a payment state, never the database's own. */
  function orderState(order) {
    const paid = order.payment_status === "settlement" || order.payment_status === "capture" || order.status === "paid";
    if (paid) return { label: t("Paid", "Lunas"), paid: true };
    if (order.status === "cancelled") return { label: t("Cancelled", "Dibatalkan"), paid: false };
    if (order.status === "expired") return { label: t("Expired", "Kedaluwarsa"), paid: false };
    if (order.status === "refunded") return { label: t("Refunded", "Dikembalikan"), paid: false };
    return { label: t("Awaiting payment", "Menunggu pembayaran"), paid: false };
  }

  function orderMarkup(order) {
    const state_ = orderState(order);
    const items = (order.items || []).map((item) => `
      <li>
        <span>${escapeHtml(item.name)}${item.quantity > 1 ? ` &times;${escapeHtml(String(item.quantity))}` : ""}</span>
        <span>${escapeHtml(formatMoney(item.line_total_idr))}</span>
      </li>
    `).join("");

    return `
      <article class="account-order">
        <div class="account-order-top">
          <span class="account-order-number">${escapeHtml(order.order_number)}</span>
          <span class="account-order-total">${escapeHtml(formatMoney(order.total_idr))}</span>
        </div>
        <span class="account-order-state" data-paid="${state_.paid ? "true" : "false"}">${escapeHtml(state_.label)}</span>
        <ul class="account-order-items">${items}</ul>
        <p class="account-order-meta">${escapeHtml(
          [
            formatDate(order.created_at),
            order.delivery_method === "delivery"
              ? t("Delivery", "Pengantaran")
              : t("Collection", "Ambil sendiri"),
            order.delivery_date ? formatDate(order.delivery_date) : ""
          ].filter(Boolean).join(" · ")
        )}</p>
      </article>
    `;
  }

  function ordersBody() {
    if (state.ordersError) {
      return `<p class="account-pending">${escapeHtml(state.ordersError)}</p>`;
    }
    if (state.orders === null) {
      return `<p>${escapeHtml(t("Looking for your orders…", "Mencari pesanan Anda…"))}</p>`;
    }
    if (!state.orders.length) {
      return `
        <p>${escapeHtml(
          t("No orders yet.", "Belum ada pesanan.")
        )}</p>
      `;
    }
    return `<div class="account-orders">${state.orders.map(orderMarkup).join("")}</div>`;
  }

  // The five the registration form offers, and the five the newsletter form
  // has offered for a while. One person, addressed the same way by both.
  const TITLES = ["mr", "mrs", "ms", "miss", "mx"];
  const titleLabel = (key) =>
    ({ mr: t("Mr", "Bapak"), mrs: t("Mrs", "Ibu"), ms: t("Ms", "Ibu"), miss: t("Miss", "Nona"), mx: t("Mx", "Mx") })[key] || "";

  /**
   * My Profile. The canonical place for who somebody is.
   *
   * The email is shown and not editable: it is what Supabase has proved and
   * what guest orders are matched on, so a field that changed it would change
   * who somebody is. Phone is here because checkout asks for one; nothing else
   * is, because nothing else is used yet.
   */
  function profileBody() {
    const user = state.user || {};
    return `
      <form class="account-lookup" data-account-profile novalidate>
        <div class="account-field">
          <span class="account-label" id="account-title-label">${escapeHtml(t("Title", "Sapaan"))}</span>
          <div class="account-select" data-account-select data-open="false">
            <button class="account-select-trigger" type="button" data-account-select-trigger
              aria-expanded="false" aria-controls="account-title-list"
              aria-labelledby="account-title-label account-title-value">
              <span class="account-select-value" id="account-title-value" data-account-select-value
                ${user.title ? "" : 'data-placeholder="true"'}>${escapeHtml(
                  titleLabel(user.title) || t("Select", "Pilih")
                )}</span>
              <span class="account-select-caret" aria-hidden="true"></span>
            </button>
            <ul class="account-select-list" id="account-title-list" role="listbox"
              aria-labelledby="account-title-label">
              ${TITLES.map((key) => `
                <li role="none">
                  <button class="account-select-option" type="button" role="option"
                    data-account-title="${key}"
                    aria-selected="${user.title === key ? "true" : "false"}">${escapeHtml(titleLabel(key))}</button>
                </li>
              `).join("")}
            </ul>
          </div>
        </div>
        <div class="account-field">
          <label for="account-first-name">${escapeHtml(t("First name", "Nama depan"))}</label>
          <input id="account-first-name" name="first_name" type="text" autocomplete="given-name" maxlength="80"
            value="${escapeHtml(user.first_name || "")}">
        </div>
        <div class="account-field">
          <label for="account-last-name">${escapeHtml(t("Last name", "Nama belakang"))}</label>
          <input id="account-last-name" name="last_name" type="text" autocomplete="family-name" maxlength="80"
            value="${escapeHtml(user.last_name || "")}">
        </div>
        <div class="account-field">
          <label for="account-email">${escapeHtml(t("Email address", "Alamat email"))}</label>
          <input id="account-email" name="email" type="email" value="${escapeHtml(user.email || "")}" readonly>
        </div>
        <div class="account-field">
          <label for="account-phone">${escapeHtml(t("Phone", "Telepon"))}</label>
          <input id="account-phone" name="phone" type="tel" autocomplete="tel" maxlength="24"
            value="${escapeHtml(user.phone || "")}" placeholder="08xx xxxx xxxx">
        </div>
        <button class="account-submit" type="submit">${escapeHtml(t("Save", "Simpan"))}</button>
        <p class="account-note" data-account-note></p>
      </form>
    `;
  }

  /**
   * Preferences. Newsletter membership and account membership are separate
   * things, and this is where the first one is changed by the person it
   * belongs to. The box reflects the server's answer, never an assumption.
   */
  function preferencesBody() {
    const user = state.user || {};
    return `
      <form class="account-lookup" data-account-preferences novalidate>
        <label class="account-check">
          <input type="checkbox" name="marketing_email_opt_in" ${user.marketing_email_opt_in ? "checked" : ""}>
          <span>${escapeHtml(
            t(
              "I would like to receive news, collections and updates from Marvell Florist.",
              "Saya ingin menerima kabar, koleksi, dan pembaruan dari Marvell Florist."
            )
          )}</span>
        </label>
        <button class="account-submit" type="submit">${escapeHtml(t("Save", "Simpan"))}</button>
        <p class="account-note" data-account-note></p>
      </form>
    `;
  }

  /**
   * The greeting: title and last name, as given on the registration form.
   *
   * An older or unfinished account may have neither. It gets the plain
   * greeting rather than "Welcome, undefined" or a name invented from an
   * email address — a fallback, not a guess.
   */
  function greeting(user) {
    const name = [titleLabel(user.title), String(user.last_name || "").trim()].filter(Boolean).join(" ");
    return name ? t(`Welcome, ${name}`, `Selamat datang, ${name}`) : t("Welcome", "Selamat datang");
  }

  function signedInMarkup(utility) {
    const user = state.user || {};

    return `
      ${utility}
      <div class="mv-panel-body">
        <div class="account-head">
          <h2 id="account-panel-title">${escapeHtml(greeting(user))}</h2>
        </div>
        <div class="account-identity">
          <span class="account-identity-email">${escapeHtml(user.email || "")}</span>
          <a class="account-details-link" href="${escapeHtml(JOIN_PAGE)}">${escapeHtml(t("View account details", "Lihat detail akun"))}</a>
        </div>

        <div class="account-sections">
          ${sectionMarkup({
            id: "profile",
            title: t("My profile", "Profil saya"),
            note: t("Personal information and saved details", "Informasi pribadi dan detail tersimpan"),
            body: profileBody()
          })}
          ${sectionMarkup({
            id: "orders",
            title: t("My orders", "Pesanan saya"),
            note: t("Orders, receipts and status", "Pesanan, tanda terima, dan status"),
            body: ordersBody()
          })}
          ${linkSectionMarkup({
            id: "wishlist",
            title: t("My wishlist", "Wishlist saya"),
            note: t("Your saved arrangements", "Rangkaian tersimpan Anda")
          })}
          ${sectionMarkup({
            id: "preferences",
            title: t("Preferences", "Preferensi"),
            note: t("Newsletter and communication preferences", "Preferensi buletin dan komunikasi"),
            body: preferencesBody()
          })}
        </div>

        <p class="account-foot">
          <button class="account-quiet" type="button" data-account-signout>${escapeHtml(
            t("Sign out", "Keluar")
          )}</button>
        </p>
      </div>
    `;
  }

  function signedOutMarkup(utility) {
    return `
      ${utility}
      <div class="mv-panel-body">
        <div class="account-head">
          <h2 id="account-panel-title">${escapeHtml(t("Welcome to Marvell", "Selamat datang di Marvell"))}</h2>
          <p>${escapeHtml(
            t(
              "Sign in or create your account.",
              "Masuk atau buat akun."
            )
          )}</p>
        </div>

        <div class="account-sections">
          ${sectionMarkup({
            id: "signin",
            title: t("Sign in", "Masuk"),
            note: t("Access your account with a code sent by email.", "Akses akun dengan kode yang dikirim lewat email."),
            body: signInBody()
          })}
          ${sectionMarkup({
            id: "create",
            title: t("Create your account", "Buat akun"),
            note: t("Enjoy a more convenient experience with a personal account.", "Nikmati pengalaman yang lebih praktis dengan akun pribadi."),
            body: createBody()
          })}
          ${sectionMarkup({
            id: "track",
            title: t("Track your order", "Lacak pesanan Anda"),
            note: t("Check the status of an order.", "Periksa status pesanan."),
            body: trackBody()
          })}
        </div>

        <p class="account-foot">${escapeHtml(
          t("Questions? We answer fastest on WhatsApp.", "Ada pertanyaan? Kami paling cepat menjawab di WhatsApp.")
        )} <a href="https://wa.me/6281275017456" target="_blank" rel="noopener noreferrer">${escapeHtml(
          t("Message us", "Kirim pesan")
        )}</a></p>
      </div>
    `;
  }

  function bodyMarkup() {
    const utility = Shop?.utilityRowMarkup?.("account") || "";
    return isSignedIn() ? signedInMarkup(utility) : signedOutMarkup(utility);
  }

  /**
   * Redraws the panel in place, keeping whichever section was open. Called
   * whenever the server has told us something new.
   */
  function render() {
    if (!(drawer instanceof HTMLElement)) return;
    const keep = openSection;
    drawer.innerHTML = bodyMarkup();
    Shop?.syncUtilityRows?.();
    window.MarvellIcons?.adopt?.(drawer);
    if (keep) {
      setSection(keep, true);
      openSection = keep;
    }
  }

  // -- scaffolding ---------------------------------------------------------

  function ensureUi() {
    injectStyles();
    if (!(document.body instanceof HTMLElement)) return;

    // The backdrop belongs to the panel registry, not to this panel: every
    // right-hand panel stands on the same one, which is what lets one fade
    // into the next without the ground blinking between them.
    Shop?.ensureBackdrop?.();

    if (!(drawer instanceof HTMLElement)) {
      drawer = document.getElementById("marvell-account-drawer");
    }
    if (!(drawer instanceof HTMLElement)) {
      drawer = document.createElement("aside");
      drawer.className = "mv-panel mv-panel--account";
      drawer.id = "marvell-account-drawer";
      drawer.setAttribute("role", "dialog");
      drawer.setAttribute("aria-modal", "true");
      drawer.setAttribute("aria-hidden", "true");
      drawer.setAttribute("aria-labelledby", "account-panel-title");
      drawer.innerHTML = bodyMarkup();
      document.body.appendChild(drawer);
      Shop?.syncUtilityRows?.();
      window.MarvellIcons?.adopt?.(drawer);
    }

    bindEvents();
  }

  /**
   * Closes without touching the shared lock — this is what the panel registry
   * calls when something else is taking the screen, and it owns the lock.
   */
  function closeQuietly() {
    if (!(drawer instanceof HTMLElement)) return;
    if (!drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    collapseAll();
    document.querySelectorAll("[data-account-open]").forEach((trigger) => {
      if (trigger instanceof HTMLElement) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function setOpen(isOpen) {
    ensureUi();
    if (!(drawer instanceof HTMLElement)) return;

    if (isOpen) {
      lastFocused = document.activeElement;
      // Every panel starts from nothing open. Reopening the account panel
      // should not resume the section the last visit happened to leave behind.
      collapseAll();
      state.stage = "email";
      state.notFound = false;
      state.attemptedEmail = "";
      Shop?.openPanel?.("account");
      Shop?.syncUtilityRows?.();
      // Asked every time it opens. A session can end in another tab, expire,
      // or begin by following the link in an email on this very device, and
      // the panel should never be the last to know.
      refreshSession();
    }

    drawer.classList.toggle("is-open", isOpen);
    drawer.setAttribute("aria-hidden", isOpen ? "false" : "true");

    document.querySelectorAll("[data-account-open]").forEach((trigger) => {
      if (trigger instanceof HTMLElement) trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    if (isOpen) {
      drawer.querySelector(".mv-panel-utility-close")?.focus?.();
    } else {
      Shop?.closePanel?.("account");
      if (lastFocused instanceof HTMLElement && document.contains(lastFocused)) lastFocused.focus?.();
    }
  }

  function isOpen() {
    return drawer instanceof HTMLElement && drawer.classList.contains("is-open");
  }

  let bound = false;

  function bindEvents() {
    if (bound) return;
    bound = true;

    Shop?.registerPanel?.("account", { close: closeQuietly, element: () => drawer });

    // Delegated, because the header launcher and the menu entry are both
    // injected after this script runs.
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest("[data-account-open]")) {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (target.closest("[data-account-close]")) {
        event.preventDefault();
        setOpen(false);
        return;
      }

      const toggle = target.closest("[data-account-toggle]");
      if (toggle instanceof HTMLElement) {
        event.preventDefault();
        toggleSection(toggle.dataset.accountToggle);
        return;
      }

      if (target.closest("[data-account-restart]")) {
        event.preventDefault();
        state.stage = "email";
        state.pendingEmail = "";
        render();
        drawer?.querySelector('[name="email"]')?.focus?.();
        return;
      }

      if (target.closest("[data-account-signout]")) {
        event.preventDefault();
        handleSignOut();
        return;
      }

      // The wishlist entry point chooses the page or the empty panel.
      const goto = target.closest("[data-account-goto]");
      if (goto instanceof HTMLElement) {
        event.preventDefault();
        const destination = goto.getAttribute("data-account-goto");
        if (destination === "wishlist") {
          window.MarvellFavorites?.open?.();
        }
        return;
      }

      // The title is the same control the newsletter form uses for the same
      // question: a line that opens, matching the fields around it.
      const titleTrigger = target.closest("[data-account-select-trigger]");
      if (titleTrigger instanceof HTMLElement) {
        event.preventDefault();
        setSelectOpen(
          titleTrigger.closest("[data-account-select]"),
          titleTrigger.getAttribute("aria-expanded") !== "true"
        );
        return;
      }

      const titleOption = target.closest("[data-account-title]");
      if (titleOption instanceof HTMLElement) {
        event.preventDefault();
        const select = titleOption.closest("[data-account-select]");
        select?.querySelectorAll("[data-account-title]").forEach((button) => {
          button.setAttribute("aria-selected", button === titleOption ? "true" : "false");
        });
        const value = select?.querySelector("[data-account-select-value]");
        if (value) {
          value.textContent = titleOption.textContent;
          delete value.dataset.placeholder;
        }
        setSelectOpen(select, false);
        select?.querySelector("[data-account-select-trigger]")?.focus?.();
        return;
      }

      // Anywhere else in the panel closes it.
      if (!target.closest("[data-account-select]")) {
        drawer?.querySelectorAll("[data-account-select]").forEach((select) => setSelectOpen(select, false));
      }

      // Google is a real navigation, not a fetch: the browser has to follow
      // the redirect for the provider to see it. The current page is carried
      // along so the panel can reopen where it was left.
      const google = target.closest("[data-account-google]");
      if (google instanceof HTMLElement) {
        event.preventDefault();
        const next = window.location.pathname + window.location.search;
        window.location.href = `${API.google}?next=${encodeURIComponent(next)}`;
      }
    });


    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !isOpen()) return;
      // A list open over the panel is what Escape should close first.
      const open = drawer?.querySelector('[data-account-select][data-open="true"]');
      if (open) {
        setSelectOpen(open, false);
        open.querySelector("[data-account-select-trigger]")?.focus?.();
        return;
      }
      setOpen(false);
    });

    /**
     * Digits only, however they arrive.
     *
     * Delegated on `input` rather than filtered on `keydown`, because keydown
     * cannot see a paste, a drag, an autocorrect or an Android soft keyboard's
     * composition — and blocking keys there is what breaks paste. This lets
     * anything land and then removes what is not a digit, so pasting "177 806"
     * or "code: 17780655" from the email both work.
     *
     * The caret is only moved when the value actually changed, so typing in
     * the middle of a code does not jump to the end.
     */
    document.addEventListener("input", (event) => {
      const field = event.target;
      if (field instanceof HTMLInputElement && field.matches("[data-account-signin] [name=email]")) {
        state.attemptedEmail = field.value;
        if (state.notFound) {
          state.notFound = false;
          drawer?.querySelector("[data-account-not-found]")?.remove();
        }
      }
      if (!(field instanceof HTMLInputElement) || !field.matches("[data-account-code-input]")) return;
      const before = field.value;
      const cleaned = before.replace(/\D/g, "").slice(0, Number(field.getAttribute("maxlength")) || OTP_MAX);
      if (cleaned === before) return;
      const caret = field.selectionStart ?? cleaned.length;
      const removedBefore = before.slice(0, caret).replace(/\d/g, "").length;
      field.value = cleaned;
      const next = Math.max(0, caret - removedBefore);
      try { field.setSelectionRange(next, next); } catch (_error) { /* not all types allow it */ }
    });

    document.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      if (form.matches("[data-account-lookup]")) {
        event.preventDefault();
        handleLookup(form);
        return;
      }
      if (form.matches("[data-account-signin]")) {
        event.preventDefault();
        handleSignIn(form);
        return;
      }
      if (form.matches("[data-account-code]")) {
        event.preventDefault();
        handleCode(form);
        return;
      }
      if (form.matches("[data-account-profile]")) {
        event.preventDefault();
        handleProfile(form);
        return;
      }
      if (form.matches("[data-account-preferences]")) {
        event.preventDefault();
        handlePreferences(form);
      }
    });

    // Going back should leave the page underneath, not a panel over it.
    window.addEventListener("popstate", () => {
      if (isOpen()) setOpen(false);
    });
    window.addEventListener("pagehide", () => closeQuietly());
  }

  // -- the accordion -------------------------------------------------------

  function setSection(id, open) {
    if (!(drawer instanceof HTMLElement)) return;
    const row = drawer.querySelector(`[data-account-section="${id}"]`);
    if (!(row instanceof HTMLElement)) return;
    row.classList.toggle("is-open", open);
    const head = row.querySelector("[data-account-toggle]");
    if (head instanceof HTMLElement) head.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function collapseAll() {
    if (!(drawer instanceof HTMLElement)) return;
    drawer.querySelectorAll("[data-account-section]").forEach((row) => {
      if (!(row instanceof HTMLElement)) return;
      row.classList.remove("is-open");
      const head = row.querySelector("[data-account-toggle]");
      if (head instanceof HTMLElement) head.setAttribute("aria-expanded", "false");
    });
    openSection = "";
  }

  /** One section open at a time, and the open one may be closed again. */
  function toggleSection(id) {
    if (!id) return;
    const wasOpen = openSection === id;
    collapseAll();
    if (wasOpen) return;

    setSection(id, true);
    openSection = id;

    // Focus the first field, but only where there is one — moving focus into
    // a section of prose would scroll it under the reader for no reason.
    const field = drawer?.querySelector(`#account-section-${id} input`);
    if (field instanceof HTMLInputElement) {
      window.setTimeout(() => field.focus({ preventScroll: true }), 220);
    }
  }

  // -- order lookup --------------------------------------------------------

  function setNote(message, tone) {
    // The note belongs to the section being used, so a message about the code
    // never appears under the order lookup.
    const note = drawer?.querySelector(".account-section.is-open [data-account-note]")
      || drawer?.querySelector("[data-account-note]");
    if (!(note instanceof HTMLElement)) return;
    if (tone) note.dataset.tone = tone;
    else delete note.dataset.tone;
    note.textContent = message;
  }

  function handleLookup(form) {
    const emailField = form.querySelector('[name="email"]');
    const orderField = form.querySelector('[name="order"]');
    const email = String(emailField?.value || "").trim().toLowerCase();
    const order = String(orderField?.value || "").trim().toUpperCase();

    if (!EMAIL_PATTERN.test(email)) {
      emailField?.setAttribute("aria-invalid", "true");
      orderField?.setAttribute("aria-invalid", "false");
      emailField?.focus();
      setNote(
        t(
          "Please enter the email address used for the order.",
          "Masukkan alamat email yang dipakai saat memesan."
        ),
        "error"
      );
      return;
    }
    emailField?.setAttribute("aria-invalid", "false");

    if (!ORDER_PATTERN.test(order)) {
      orderField?.setAttribute("aria-invalid", "true");
      orderField?.focus();
      setNote(
        t(
          "That does not look like an order number. It looks like MF-260920-A1B2C.",
          "Itu sepertinya bukan nomor pesanan. Formatnya seperti MF-260920-A1B2C."
        ),
        "error"
      );
      return;
    }
    orderField?.setAttribute("aria-invalid", "false");

    window.location.href = `/order/${encodeURIComponent(order)}`;
  }

  // -- talking to the server -------------------------------------------------

  /**
   * One place that calls the account API.
   *
   * `credentials: "same-origin"` is what carries the session cookie. Nothing
   * here reads it, sets it or could: it is httpOnly, and the browser attaches
   * it without this code ever seeing its value.
   */
  async function api(path, { method = "GET", body } = {}) {
    const response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        ...(body ? { "content-type": "application/json" } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => null);
    return { response, data };
  }

  function applySession(data) {
    const wasSignedIn = state.signedIn;
    state.loaded = true;
    state.available = data?.available !== false;
    state.signedIn = Boolean(data?.signed_in && data?.user);
    state.user = state.signedIn ? data.user : null;
    state.providers = { google: Boolean(data?.providers?.google) };
    if (!state.signedIn) {
      state.orders = null;
      state.ordersError = "";
    }
    if (wasSignedIn !== state.signedIn) {
      // The header entry reads "Join Marvell" or "Account" from this.
      window.dispatchEvent(new CustomEvent("marvell:account-change", {
        detail: { signed_in: state.signedIn }
      }));
    }
  }

  function refreshSession() {
    if (sessionRefresh) return sessionRefresh;

    sessionRefresh = (async () => {
      try {
        const { data } = await api(API.session);
        applySession(data);
        render();
        if (state.signedIn) loadOrders();
      } catch (_error) {
        // Offline, or the API is not deployed. The panel keeps what it has and
        // the guest routes below it still work.
        state.loaded = true;
        render();
      }
    })().finally(() => {
      sessionRefresh = null;
    });

    return sessionRefresh;
  }

  async function loadOrders() {
    state.orders = null;
    state.ordersError = "";
    try {
      const { response, data } = await api(API.orders);
      if (!response.ok || !data?.ok) throw new Error(data?.message || "orders");
      state.orders = Array.isArray(data.orders) ? data.orders : [];
    } catch (_error) {
      state.orders = [];
      state.ordersError = t(
        "We couldn't load your orders. Please try again.",
        "Kami tidak dapat memuat pesanan Anda. Silakan coba lagi."
      );
    }
    render();
  }

  /** Step one: ask for a code. */
  async function handleSignIn(form) {
    if (state.busy) return;
    const field = form.querySelector('[name="email"]');
    const email = String(field?.value || "").trim().toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
      field?.setAttribute("aria-invalid", "true");
      field?.focus();
      setNote(t("Please enter a valid email address.", "Masukkan alamat email yang valid."), "error");
      return;
    }
    field?.setAttribute("aria-invalid", "false");

    state.notFound = false;
    state.attemptedEmail = email;
    state.busy = true;
    setNote(t("Sending…", "Mengirim…"));
    try {
      const { response, data } = await api(API.requestCode, {
        method: "POST",
        body: { email, next: window.location.pathname + window.location.search }
      });
      if (!response.ok || !data?.ok) {
        // No account for this address. Not an error to argue with: the panel
        // says so and puts Create your account directly underneath.
        if (data?.code === "account_not_found") {
          state.notFound = true;
          render();
          return;
        }
        setNote(data?.message || t("Please try again shortly.", "Silakan coba lagi sebentar."), "error");
        return;
      }
      state.pendingEmail = email;
      // Reported by the server from a real generated code. Absent when the
      // request was throttled and no code was made, in which case whatever we
      // already knew stands.
      if (Number.isInteger(data.code_length)) state.codeLength = data.code_length;
      state.stage = "code";
      render();
      drawer?.querySelector('[name="code"]')?.focus?.();
    } catch (_error) {
      setNote(t("Please try again shortly.", "Silakan coba lagi sebentar."), "error");
    } finally {
      state.busy = false;
    }
  }

  /** Step two: the code is exchanged for a session by the server. */
  async function handleCode(form) {
    if (state.busy) return;
    const field = form.querySelector('[name="code"]');
    const code = String(field?.value || "").replace(/\D/g, "");

    const digits = codeDigits();
    const wrongLength = digits ? code.length !== digits : code.length < OTP_MIN || code.length > OTP_MAX;
    if (wrongLength) {
      field?.setAttribute("aria-invalid", "true");
      field?.focus();
      setNote(
        digits
          ? t(`Please enter the ${digits} digits from the email.`, `Masukkan ${digits} digit dari email.`)
          : t("Please enter the code from the email.", "Masukkan kode dari email."),
        "error"
      );
      return;
    }
    field?.setAttribute("aria-invalid", "false");

    state.busy = true;
    setNote(t("Checking…", "Memeriksa…"));
    try {
      const { response, data } = await api(API.verify, {
        method: "POST",
        body: { email: state.pendingEmail, code }
      });
      if (!response.ok || !data?.ok || !data?.user) {
        setNote(
          data?.message || t("We couldn't sign you in. Please try again.", "Kami tidak dapat memasukkan Anda. Silakan coba lagi."),
          "error"
        );
        return;
      }
      applySession({ signed_in: true, available: true, user: data.user, providers: state.providers });
      openSection = "orders";
      render();
      loadOrders();
    } catch (_error) {
      setNote(t("Please try again shortly.", "Silakan coba lagi sebentar."), "error");
    } finally {
      state.busy = false;
    }
  }

  /** My Profile. The email is not sent: it is not editable here. */
  async function handleProfile(form) {
    if (state.busy) return;
    const chosen = form.querySelector('[data-account-title][aria-selected="true"]');
    const value = (name) => String(form.querySelector(`[name="${name}"]`)?.value || "").trim();

    state.busy = true;
    setNote(t("Saving…", "Menyimpan…"));
    try {
      const { response, data } = await api(API.session, {
        method: "PATCH",
        body: {
          title: chosen?.getAttribute("data-account-title") || "",
          first_name: value("first_name"),
          last_name: value("last_name"),
          phone: value("phone")
        }
      });
      if (!response.ok || !data?.ok) {
        setNote(data?.message || t("We couldn't save your details. Please try again.", "Kami tidak dapat menyimpan detail Anda. Silakan coba lagi."), "error");
        return;
      }
      state.user = data.user;
      setNote(t("Saved.", "Tersimpan."));
      // The greeting at the top is drawn from these, so it is redrawn with
      // the section left where it was.
      render();
    } catch (_error) {
      setNote(t("We couldn't save your details. Please try again.", "Kami tidak dapat menyimpan detail Anda. Silakan coba lagi."), "error");
    } finally {
      state.busy = false;
    }
  }

  /**
   * Preferences. The one thing here is the newsletter, and it is the person
   * themselves changing their own subscription, so it goes straight through.
   */
  async function handlePreferences(form) {
    if (state.busy) return;
    const wanted = Boolean(form.querySelector('[name="marketing_email_opt_in"]')?.checked);

    state.busy = true;
    setNote(t("Saving…", "Menyimpan…"));
    try {
      const { response, data } = await api(API.session, {
        method: "PATCH",
        body: { marketing_email_opt_in: wanted }
      });
      if (!response.ok || !data?.ok) {
        setNote(
          data?.message || t("We couldn't update your preferences. Please try again.", "Kami tidak dapat memperbarui preferensi Anda. Silakan coba lagi."),
          "error"
        );
        return;
      }
      state.user = data.user;
      setNote(t("Saved.", "Tersimpan."));
    } catch (_error) {
      setNote(
        t("We couldn't update your preferences. Please try again.", "Kami tidak dapat memperbarui preferensi Anda. Silakan coba lagi."),
        "error"
      );
    } finally {
      state.busy = false;
    }
  }

  async function handleSignOut() {
    try {
      await api(API.session, { method: "DELETE" });
    } catch (_error) {
      // The server may be unreachable; the panel still returns to its
      // signed-out state, and the cookie expires on its own.
    }
    applySession({ signed_in: false, available: state.available, providers: state.providers });
    state.stage = "email";
    state.pendingEmail = "";
    openSection = "";
    render();
  }

  /**
   * The panel reopens itself after a sign-in link is followed, so the first
   * thing somebody sees on returning is the account they just reached.
   */
  function handleReturnFromEmail() {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("account");
    if (!flag) return false;

    // Taken out of the URL immediately: it is a one-off message, not state.
    params.delete("account");
    const query = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : "") + window.location.hash);

    if (flag === "signed-in") {
      setOpen(true);
      openSection = "orders";
      return true;
    }
    if (flag === "expired" || flag === "google-failed") {
      setOpen(true);
      window.setTimeout(() => {
        setNote(
          flag === "expired"
            ? t("That link has expired. Please request a new code.", "Tautan sudah kedaluwarsa. Silakan minta kode baru.")
            : t("We couldn't sign you in with Google. Please continue with email.", "Kami tidak dapat memasukkan Anda dengan Google. Silakan lanjutkan dengan email."),
          "error"
        );
      }, 60);
      return true;
    }
    return false;
  }

  window.MarvellAccount = {
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen,
    isSignedIn,
    label,
    refresh: refreshSession,
  };

  function boot() {
    ensureUi();
    const panelRestoredSession = handleReturnFromEmail();
    // Restore an existing HttpOnly-cookie session on every page load. Waiting
    // until the account panel was opened made the rest of the site behave as
    // though the customer had signed out, including saving hearts to the
    // temporary guest wishlist.
    if (!panelRestoredSession) refreshSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
