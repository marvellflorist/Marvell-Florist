/**
 * Marvell updates — the footer signup and the occasional invitation card.
 *
 * Not a quick panel. Signing up for a mailing list is one field and one
 * button; it does not need a drawer, and it was the only thing in the panel
 * family that was not a place you could be. The form is wherever it is asked
 * for, it submits in place, and the page never reloads.
 *
 * TWO STEPS
 * The form in the page asks for one thing: an email address. Entering it opens
 * a dialog that shows the address back, offers a name to be addressed by, and
 * states plainly what is being agreed to before anything is sent. Nothing is
 * posted until Submit in that dialog.
 *
 * Only the address is required. Title, first name and last name are offered
 * because being written to by name is better than not, and they are optional
 * because a mailing list that will not take an address without a full name is
 * asking for something it does not need. No phone and no WhatsApp: those are
 * asked for at checkout where they are used, and WhatsApp consent is a
 * separate decision made somewhere else.
 *
 * WHERE IT GOES
 *   this form  ->  POST /api/newsletter  ->  Brevo /v3/contacts (updateEnabled)
 *
 * The Brevo key lives in the Netlify function and never reaches this file.
 * Brevo's own error text never reaches it either: the endpoint replaces it
 * with something a customer can read.
 *
 * Submitting is the consent. The sentence under the field says so in the words
 * the consent is being given for, which is why there is no separate tickbox to
 * leave unticked — and why this form must never quietly do anything else with
 * the address.
 */
(function () {
  if (typeof window === "undefined") return;
  if (window.MarvellNewsletter) return;

  const IMPRESSIONS_KEY = "marvell-note-impressions";
  const DONE_KEY = "marvell-note-subscribed";
  const START = Date.now();
  const FIRST_INVITE_MS = 2 * 60 * 1000;
  const REPEAT_INVITE_MS = 5 * 60 * 1000;
  const INVITE_VISIBLE_MS = 18 * 1000;

  const isId = () => document.documentElement.lang === "id";
  const t = (en, id) => (isId() ? id : en);
  const TITLE = () => t("Sign up for Marvell updates", "Daftar kabar Marvell");
  const SUCCESS = () => t("Thank you for subscribing.", "Terima kasih telah berlangganan.");
  const isLiveServer =
    location.protocol === "http:" &&
    ["localhost", "127.0.0.1", "0.0.0.0"].includes(location.hostname) &&
    /^55\d\d$/.test(location.port);
  const newsletterEndpoint = isLiveServer
    ? "http://127.0.0.1:8787/api/newsletter"
    : "/api/newsletter";

  const get = (key) => {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (_error) { return null; }
  };
  const put = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_error) { /* private browsing */ }
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const css = [
    '.nl-block{min-height:0!important;border:0;padding:0 0 4px;font-family:"Inter Tight",sans-serif}',
    '.nl-block .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}',
    '.nl-block h2{font:300 clamp(27px,3vw,38px)/1.22 "AdelioDisplayCondensed",sans-serif;color:#35383a;margin:0 0 20px}',
    '.nl-form{display:flex;gap:10px;max-width:550px;flex-wrap:wrap}',
    '.nl-form input[type=email]{min-width:0;flex:1 1 240px;height:48px;border:1px solid #cbd0d3;border-radius:4px;padding:0 15px;background:#fff;font:15px "Inter Tight",sans-serif;color:#16191b}',
    '.nl-form input[type=email]:focus{outline:none;border-color:#353b3e}',
    '.nl-form input[aria-invalid=true]{border-color:#9a4a35}',
    '.nl-form button{height:48px;padding:0 24px;background:#171513;color:#fff;border:1px solid #171513;border-radius:0;font:500 11px "Inter Tight",sans-serif;letter-spacing:.13em;text-transform:uppercase;cursor:pointer;transition:transform .2s ease,background-color .2s ease,border-color .2s ease,color .2s ease,opacity .2s ease}',
    '.nl-form button:hover:not(:disabled),.nl-form button:focus-visible:not(:disabled){background:#fff!important;color:#171513!important;border-color:#171513!important;transform:translateY(-1px);outline:none}',
    '.nl-form button:active:not(:disabled){transform:translateY(0)}',
    '.nl-form button:disabled{opacity:.5;cursor:default}',
    '.nl-terms{margin:14px 0 0;max-width:550px;font:12px/1.6 "Inter Tight",sans-serif;color:#858b91}',
    '.nl-terms a{color:inherit;text-decoration:underline;text-underline-offset:3px}',
    '.nl-status{margin:12px 0 0;font:14px/1.5 "Inter Tight",sans-serif;color:#35383a}',
    '.nl-status[data-tone=error]{color:#9a4a35}',
    '.nl-status[hidden]{display:none}',
    /* The invitation sits above the floating WhatsApp button, not beside it.
       --nl-card-lift is the whole clearance: the button's own offset from the
       bottom, its height, and a gap wide enough that the two read as separate
       pieces of chrome rather than one stack sliding off the corner. The
       button moves up on narrow screens, so the lift moves with it. */
    ':root{--nl-card-lift:150px}',
    '.nl-card{position:fixed;right:24px;bottom:var(--nl-card-lift);z-index:11020;width:min(460px,calc(100vw - 32px));max-height:calc(100dvh - var(--nl-card-lift) - 24px);overflow-y:auto;overscroll-behavior:contain;padding:54px 32px 48px;background:#fff;box-shadow:0 10px 42px #0003;font-family:"Inter Tight",sans-serif;opacity:0;transform:translateY(14px);pointer-events:none;transition:opacity .4s ease,transform .4s ease}',
    '.nl-card.is-visible{opacity:1;transform:translateY(0);pointer-events:auto}',
    '.nl-card h2{font-size:30px;margin-bottom:20px}',
    '.nl-card[hidden]{display:none!important}',
    /* Never over the top of something the visitor opened themselves. invite()
       refuses to show the card while a panel is open, but a panel can also be
       opened while the card is already up, and the card outranks every panel
       on z-index. The floating WhatsApp button is demoted the same way in
       assets/marvell-shop.js. */
    'body:has(.mv-panel.is-open) .nl-card,body:has(.menu-panel.is-open) .nl-card{opacity:0!important;pointer-events:none!important}',
    '.nl-card-close{position:absolute;right:15px;top:14px;border:0;background:none;font:26px Arial;cursor:pointer;color:#35383a}',
    /* The dialog. A centred sheet rather than a side panel: it is a step in
       something already begun, not a place to go, and the quick panels on the
       right are places to go. */
    '.nl-backdrop{position:fixed;inset:0;z-index:30000;background:rgba(12,10,9,.42);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .35s ease}',
    '.nl-backdrop.is-open{opacity:1;pointer-events:auto}',
    /* The dialog scrolls the whole overlay, not the sheet inside it.
       It used to be a fixed box centred with translate(-50%,-50%) and capped
       at 88vh. Once the form grew past that the sheet was taller than the
       window, and because the centring pulls it up by half its own height the
       overflow went off the TOP of the screen — the heading and the close
       button were unreachable, and scrolling inside the box could not bring
       them back. The overlay is the scroller now, and `margin:auto` on the
       sheet centres it only while it fits. 100dvh keeps the mobile browser's
       collapsing address bar out of the sum. */
    /* The homepage gives every section a 160vh minimum. This dialog is a
       section too, so reset that rule or its card is pushed below the screen. */
    '.nl-modal{position:fixed;inset:0;z-index:30001;box-sizing:border-box;min-height:0;height:100dvh;display:flex;align-items:flex-start;justify-content:center;padding:20px 16px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;opacity:0;pointer-events:none;transition:opacity .35s ease}',
    '.nl-modal.is-open{opacity:1;pointer-events:auto}',
    '.nl-modal[hidden],.nl-backdrop[hidden]{display:none!important}',
    '.nl-modal-card{position:relative;box-sizing:border-box;width:min(100%,620px);margin:auto;padding:clamp(34px,4.4vw,52px) clamp(24px,5vw,64px) clamp(28px,3.4vw,40px);background:#fff;color:#1d1a18;font-family:"Inter Tight",sans-serif;transform:translateY(14px);transition:transform .35s cubic-bezier(.22,1,.36,1)}',
    '.nl-modal.is-open .nl-modal-card{transform:translateY(0)}',
    '.nl-modal-close{position:absolute;right:clamp(16px,2vw,26px);top:clamp(16px,2vw,24px);width:34px;height:34px;border:0;background:none;color:#1d1a18;font:22px Arial;line-height:1;cursor:pointer;transition:opacity .2s ease}',
    '.nl-modal-close:hover,.nl-modal-close:focus-visible{opacity:.6;outline:none}',
    '.nl-modal h2{font:300 clamp(24px,2.6vw,33px)/1.24 "AdelioDisplayCondensed","Inter Tight",sans-serif;letter-spacing:.03em;text-align:center;margin:0 0 22px}',
    '.nl-required{margin:0 0 22px;font-size:12px;line-height:1.5;color:rgba(29,26,24,.5)}',
    '.nl-row{display:grid;gap:20px;margin-bottom:22px}',
    '@media(min-width:620px){.nl-row.is-split{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}',
    '.nl-label{display:block;margin-bottom:8px;font-size:11px;font-weight:500;letter-spacing:.09em;text-transform:uppercase;color:rgba(29,26,24,.52)}',
    '.nl-modal input[type=email],.nl-modal input[type=text]{width:100%;height:44px;padding:0 0 2px;border:0;border-bottom:1px solid rgba(29,26,24,.24);border-radius:0;background:transparent;font:16px "Inter Tight",sans-serif;color:#1d1a18;appearance:none;transition:border-color .24s ease}',
    '.nl-modal input:focus{outline:none;border-bottom-color:#151210}',
    '.nl-modal input[aria-invalid=true]{border-bottom-color:#9a4a35}',
    /* Title is a disclosure, not a row of chips. Six civilities will not sit
       side by side on a phone, and "I\'d rather not say" is a sentence rather
       than a chip — so the field shows the chosen one and opens the rest. */
    '.nl-select{position:relative}',
    '.nl-select-trigger{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;height:44px;padding:0 0 2px;border:0;border-bottom:1px solid rgba(29,26,24,.24);background:transparent;color:#1d1a18;font:16px "Inter Tight",sans-serif;text-align:left;cursor:pointer;appearance:none;transition:border-color .24s ease}',
    '.nl-select-trigger:focus-visible{outline:none;border-bottom-color:#151210}',
    '.nl-select-trigger[aria-expanded=true]{border-bottom-color:#151210}',
    '.nl-select-trigger[aria-invalid=true]{border-bottom-color:#9a4a35}',
    '.nl-select-value{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.nl-select-value[data-placeholder=true]{color:rgba(29,26,24,.42)}',
    '.nl-select-caret{flex:0 0 auto;width:9px;height:9px;margin-bottom:4px;border-right:1px solid currentColor;border-bottom:1px solid currentColor;transform:rotate(45deg);transition:transform .28s cubic-bezier(.22,1,.36,1)}',
    '.nl-select-trigger[aria-expanded=true] .nl-select-caret{transform:rotate(225deg);margin-bottom:-2px}',
    /* The list floats over the form rather than growing inside it. As an
       accordion it added up to 340px to the sheet the moment it opened, which
       pushed the name fields, the consent and the Submit button down the page
       and re-laid out the whole dialog around one small choice. It fades in
       above the field, like the footer's language switcher, and nothing under
       it moves at all. */
    '.nl-select-list{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:5;display:grid;margin:0;padding:4px 0;list-style:none;max-height:min(46vh,320px);overflow-y:auto;overscroll-behavior:contain;background:#fff;border:1px solid #e4e6e8;box-shadow:0 16px 44px rgba(0,0,0,.12);opacity:0;visibility:hidden;transform:translateY(-8px);pointer-events:none;transition:opacity .34s ease,transform .34s cubic-bezier(.22,1,.36,1),visibility 0s linear .34s}',
    '.nl-select[data-open=true] .nl-select-list{opacity:1;visibility:visible;transform:translateY(0);pointer-events:auto;transition:opacity .34s ease,transform .34s cubic-bezier(.22,1,.36,1),visibility 0s}',
    '.nl-select-option{width:100%;min-height:42px;padding:0 16px;border:0;background:transparent;color:rgba(29,26,24,.72);font:15px "Inter Tight",sans-serif;text-align:left;cursor:pointer;transition:color .2s ease,background-color .2s ease}',
    '.nl-select-option:hover,.nl-select-option:focus-visible{color:#12100e;background:rgba(29,26,24,.04);outline:none}',
    '.nl-select-option[aria-selected=true]{color:#12100e;font-weight:500}',
    '.nl-consent{margin:24px 0 22px;font-size:13px;line-height:1.7;color:rgba(29,26,24,.68);text-align:center}',
    '.nl-submit{width:100%;min-height:46px;padding:0 24px;border:1px solid #12100e;background:#12100e;color:#f8f4ec;font:11px "Inter Tight",sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:background-color 220ms ease,border-color 220ms ease,color 220ms ease}',
    '.nl-submit:hover:not(:disabled),.nl-submit:focus-visible:not(:disabled){background:transparent;color:#151210;outline:none}',
    '.nl-submit:disabled{opacity:.4;cursor:default}',
    '.nl-privacy{margin:20px 0 0;padding-top:18px;border-top:1px solid rgba(29,26,24,.1);font-size:12px;line-height:1.65;color:rgba(29,26,24,.48)}',
    '.nl-privacy a{color:inherit;text-underline-offset:.22em}',
    /* The confirmation. It is addressed to somebody — the dialog has just been
       given a title and a name, so using them is the difference between a
       receipt and a welcome. The close button is explicit rather than leaving
       only the corner cross: this is the end of something, and the way out
       should be the most obvious thing in the panel. */
    '.nl-done{text-align:center;display:grid;gap:14px;padding:clamp(20px,4vw,40px) 0}',
    '.nl-done p{margin:0;font-size:16px;line-height:1.6}',
    '.nl-done-name{font-size:17px;font-weight:500;letter-spacing:.01em}',
    '.nl-done-body{color:rgba(29,26,24,.7);max-width:44ch;margin:0 auto!important}',
    '.nl-done-thanks{margin-top:6px!important;font-size:15px;letter-spacing:.02em}',
    '.nl-done-close{justify-self:center;min-height:46px;margin-top:14px;padding:0 46px;border:1px solid #12100e;background:transparent;color:#151210;font:11px \"Inter Tight\",sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:background-color 220ms ease,color 220ms ease}',
    '.nl-done-close:hover,.nl-done-close:focus-visible{background:#12100e;color:#f8f4ec;outline:none}',
    /* 768px, not 600px. The button crosses to its own narrow-screen offset at
       768, and between the two breakpoints the card was landing on top of it. */
    '@media(max-width:768px){.nl-form input[type=email]{flex-basis:100%}.nl-form button{width:100%}.nl-card{left:0;right:0;bottom:0;width:100%;max-height:min(82dvh,100dvh);padding:46px 24px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -8px 34px #0002}}',
    '@media(prefers-reduced-motion:reduce){.nl-card,.nl-modal,.nl-backdrop{transition:none}}'
  ].join("");

  /**
   * One field, one button, and the sentence that makes submitting it consent.
   * `where` only ever travels to our own endpoint as an attribution string.
   */
  function formMarkup(where) {
    const id = `nl-${where}-email`;
    return `
      <form class="nl-form" data-nl-form="${escapeHtml(where)}" novalidate>
        <label class="sr-only" for="${id}">${escapeHtml(t("Email address", "Alamat email"))}</label>
        <input id="${id}" name="email" type="email" autocomplete="email" required
          placeholder="${escapeHtml(t("Email address", "Alamat email"))}">
        <input name="company" type="text" tabindex="-1" autocomplete="off" aria-hidden="true"
          style="position:absolute;left:-9999px">
        <button type="submit">${escapeHtml(t("Confirm", "Konfirmasi"))}</button>
      </form>
      <p class="nl-terms">${escapeHtml(
        t(
          "By confirming, you agree to receive email from Marvell Florist. You can unsubscribe at any time. This is a mailing list, not an account. Read our ",
          "Dengan mengonfirmasi, Anda setuju menerima email dari Marvell Florist. Anda dapat berhenti kapan saja. Ini adalah milis, bukan akun. Baca "
        )
      )}<a href="privacy-policy.html">${escapeHtml(t("Privacy Policy", "Kebijakan Privasi"))}</a>.</p>
      <p class="nl-status" role="status" data-nl-status hidden></p>
    `;
  }

  function setStatus(form, message, tone) {
    const status = form.parentElement?.querySelector("[data-nl-status]");
    if (!(status instanceof HTMLElement)) return;
    status.hidden = !message;
    status.textContent = message || "";
    if (tone) status.dataset.tone = tone;
    else delete status.dataset.tone;
  }

  /**
   * Step one. The address is checked here and nothing is sent: the dialog is
   * where somebody sees what they are agreeing to, and agreeing is what posts.
   */
  function handleInline(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const field = form.querySelector('input[name="email"]');
    const email = String(field?.value || "").trim();

    if (!field?.checkValidity() || !email) {
      field?.setAttribute("aria-invalid", "true");
      field?.focus();
      setStatus(form, t("Please enter a valid email address.", "Masukkan alamat email yang valid."), "error");
      return;
    }
    field.setAttribute("aria-invalid", "false");
    setStatus(form, "");
    openModal(email, form.dataset.nlForm || "footer", form.querySelector('input[name="company"]')?.value || "");
  }

  // -- the dialog --------------------------------------------------------------

  let lastFocused = null;
  let priorOverflow = "";
  const modalState = { source: "footer", company: "", title: "" };

  const modalNode = () => document.querySelector(".nl-modal");
  const backdropNode = () => document.querySelector(".nl-backdrop");

  /**
   * The civilities offered.
   *
   * Five of them, and no option that declines the question: the title is
   * required now, so an answer that means "no answer" would make the asterisk
   * beside the label a lie. Mx is kept precisely so that being required costs
   * nobody an accurate answer.
   *
   * The value is what travels to Brevo; the label is what is read. Every value
   * is non-empty, which is what lets an empty `modalState.title` mean "not
   * chosen yet" and nothing else.
   */
  const TITLES = () => [
    { value: "mr", label: t("Mr", "Bapak") },
    { value: "mrs", label: t("Mrs", "Ibu") },
    { value: "miss", label: t("Miss", "Nona") },
    { value: "ms", label: t("Ms", "Ms") },
    { value: "mx", label: t("Mx", "Mx") }
  ];

  function titleSelectMarkup() {
    const options = TITLES()
      .map(
        (option) => `
          <li role="none">
            <button class="nl-select-option" type="button" role="option" aria-selected="false"
              data-nl-title="${escapeHtml(option.value)}"
              data-nl-title-label="${escapeHtml(option.label)}">${escapeHtml(option.label)}</button>
          </li>`
      )
      .join("");

    return `
      <span class="nl-label" id="nl-title-label">${escapeHtml(t("Title", "Sapaan"))} *</span>
      <div class="nl-select" data-nl-select data-open="false">
        <button class="nl-select-trigger" type="button" data-nl-select-trigger
          aria-expanded="false" aria-controls="nl-title-list"
          aria-labelledby="nl-title-label nl-title-value">
          <span class="nl-select-value" id="nl-title-value" data-placeholder="true">${escapeHtml(
            t("Select", "Pilih")
          )}</span>
          <span class="nl-select-caret" aria-hidden="true"></span>
        </button>
        <ul class="nl-select-list" id="nl-title-list" role="listbox"
          aria-labelledby="nl-title-label" data-nl-select-list>${options}</ul>
      </div>
    `;
  }

  function modalMarkup(email) {
    return `
      <div class="nl-modal-card">
      <button class="nl-modal-close" type="button" aria-label="${escapeHtml(
        t("Close", "Tutup")
      )}" data-nl-modal-close>&times;</button>
      <h2 id="nl-modal-title">${escapeHtml(
        t("Sign up for Marvell updates", "Daftar kabar Marvell")
      )}</h2>
      <form data-nl-modal-form novalidate>
        <p class="nl-required">${escapeHtml(
          t(
            "Fields marked * are required.",
            "Kolom bertanda * wajib diisi."
          )
        )}</p>

        <div class="nl-row">
          <div>
            <label class="nl-label" for="nl-modal-email">${escapeHtml(
              t("Email address", "Alamat email")
            )} *</label>
            <input id="nl-modal-email" name="email" type="email" autocomplete="email" required
              value="${escapeHtml(email)}">
          </div>
        </div>

        <div class="nl-row is-split">
          <div>${titleSelectMarkup()}</div>
          <div>
            <label class="nl-label" for="nl-modal-first">${escapeHtml(
              t("First name", "Nama depan")
            )} *</label>
            <input id="nl-modal-first" name="firstName" type="text" autocomplete="given-name" maxlength="60" required>
          </div>
        </div>

        <div class="nl-row">
          <div>
            <label class="nl-label" for="nl-modal-last">${escapeHtml(
              t("Last name", "Nama belakang")
            )} *</label>
            <input id="nl-modal-last" name="lastName" type="text" autocomplete="family-name" maxlength="60" required>
          </div>
        </div>

        <input name="company" type="text" tabindex="-1" autocomplete="off" aria-hidden="true"
          style="position:absolute;left:-9999px">

        <p class="nl-consent">${escapeHtml(
          t(
            "By submitting, you agree to receive seasonal flowers, new collections and stories from Marvell Florist by email. You can unsubscribe at any time. This is a mailing list, not an account.",
            "Dengan mengirim, Anda setuju menerima kabar bunga musiman, koleksi baru, dan cerita dari Marvell Florist melalui email. Anda dapat berhenti kapan saja. Ini adalah milis, bukan akun."
          )
        )}</p>

        <button class="nl-submit" type="submit">${escapeHtml(t("Submit", "Kirim"))}</button>
        <p class="nl-status" role="status" data-nl-modal-status hidden></p>
      </form>
      <p class="nl-privacy">${escapeHtml(
        t(
          "Personal data collected through this page is used by Marvell Florist to send you communications about offers, news and events, and for the management of its customer and commercial relationship. For further information, please consult our ",
          "Data pribadi yang dikumpulkan melalui halaman ini digunakan oleh Marvell Florist untuk mengirimkan komunikasi mengenai penawaran, kabar, dan acara, serta untuk pengelolaan hubungan pelanggan dan komersialnya. Untuk keterangan lebih lanjut, silakan baca "
        )
      )}<a href="privacy-policy.html">${escapeHtml(
        t("Privacy Statement", "Pernyataan Privasi")
      )}</a>. ${escapeHtml(
        t(
          "You may ask us not to send you personalised communications on our products and services. You can exercise this right at any time, and every email we send carries a link to unsubscribe.",
          "Anda dapat meminta kami untuk tidak mengirimkan komunikasi yang dipersonalisasi mengenai produk dan layanan kami. Anda dapat menggunakan hak ini kapan saja, dan setiap email yang kami kirim memuat tautan untuk berhenti berlangganan."
        )
      )}</p>
      </div>
    `;
  }

  /** Opens or closes the civility accordion. */
  function setTitleOpen(select, open) {
    if (!(select instanceof Element)) return;
    select.setAttribute("data-open", open ? "true" : "false");
    select.querySelector("[data-nl-select-trigger]")?.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function setModalStatus(message, tone) {
    const status = modalNode()?.querySelector("[data-nl-modal-status]");
    if (!(status instanceof HTMLElement)) return;
    status.hidden = !message;
    status.textContent = message || "";
    if (tone) status.dataset.tone = tone;
    else delete status.dataset.tone;
  }

  function openModal(email, source, company) {
    const modal = modalNode();
    const backdrop = backdropNode();
    if (!modal || !backdrop) return;

    modalState.source = source || "footer";
    modalState.company = company || "";
    modalState.title = "";
    lastFocused = document.activeElement;

    modal.innerHTML = modalMarkup(email);
    modal.hidden = false;
    backdrop.hidden = false;
    // A frame, so the transition has two states to travel between.
    requestAnimationFrame(() => {
      modal.classList.add("is-open");
      backdrop.classList.add("is-open");
    });

    priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    hideCard();

    // The overlay is the scroller, so it is put back to the top on every open:
    // a previous visit may have left it scrolled down the form.
    modal.scrollTop = 0;

    const first = modal.querySelector('input[name="firstName"]');
    window.setTimeout(() => first?.focus({ preventScroll: true }), 60);
  }

  function closeModal() {
    const modal = modalNode();
    const backdrop = backdropNode();
    if (!modal || modal.hidden) return;

    modal.classList.remove("is-open");
    backdrop?.classList.remove("is-open");
    document.body.style.overflow = priorOverflow;
    window.setTimeout(() => {
      if (!modal.classList.contains("is-open")) {
        modal.hidden = true;
        if (backdrop) backdrop.hidden = true;
      }
    }, 360);

    if (lastFocused instanceof HTMLElement && document.contains(lastFocused)) lastFocused.focus();
  }

  /**
   * Step two: this is the one that sends anything.
   *
   * `form` is passed in rather than read off the event. The listener is
   * delegated on `document`, so `event.currentTarget` is the document — and
   * every `form.querySelector` below was therefore searching the whole page
   * and finding the FIRST input of that name in it, which is the footer's.
   * Anyone who opened this dialog from the invitation card was told their
   * address was invalid, because the field being checked was the empty one
   * in the footer rather than the one they had just filled in.
   */
  async function submitModal(event, form) {
    event.preventDefault();
    if (!(form instanceof HTMLFormElement)) return;
    const field = form.querySelector('input[name="email"]');
    const button = form.querySelector(".nl-submit");
    const email = String(field?.value || "").trim();

    if (!field?.checkValidity() || !email) {
      field?.setAttribute("aria-invalid", "true");
      field?.focus();
      setModalStatus(t("Please enter a valid email address.", "Masukkan alamat email yang valid."), "error");
      return;
    }
    field.setAttribute("aria-invalid", "false");

    // The title and the name are both required now, so both are checked here
    // rather than being posted blank. The title carries no empty-valued
    // option, so an empty `modalState.title` can only mean nothing was picked.
    const titleTrigger = form.querySelector("[data-nl-select-trigger]");
    const firstField = form.querySelector('input[name="firstName"]');
    const lastField = form.querySelector('input[name="lastName"]');
    const title = String(modalState.title || "").trim();
    const firstName = String(firstField?.value || "").trim();
    const lastName = String(lastField?.value || "").trim();
    const missing = [];
    if (!title) missing.push(titleTrigger);
    if (!firstName) missing.push(firstField);
    if (!lastName) missing.push(lastField);
    [titleTrigger, firstField, lastField].forEach((node) => {
      if (node instanceof HTMLElement) node.setAttribute("aria-invalid", missing.includes(node) ? "true" : "false");
    });
    if (missing.length) {
      // The title is a disclosure rather than a field, so a visitor who missed
      // it is shown the list rather than just a red rule under a closed one.
      if (missing[0] === titleTrigger) setTitleOpen(titleTrigger?.closest("[data-nl-select]"), true);
      missing[0]?.focus?.();
      setModalStatus(
        !title
          ? t("Please choose a title.", "Silakan pilih sapaan.")
          : t("Please enter your first and last name.", "Masukkan nama depan dan nama belakang Anda."),
        "error"
      );
      return;
    }

    button.disabled = true;
    setModalStatus(t("One moment…", "Sebentar…"));

    try {
      const response = await fetch(newsletterEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          email,
          // Submitting this dialog is the opt-in, and it is the only one made
          // here. WhatsApp consent is a different decision, asked elsewhere.
          emailOptIn: true,
          whatsappOptIn: false,
          whatsapp: "",
          firstName,
          lastName,
          title,
          company: modalState.company || form.querySelector('input[name="company"]')?.value || "",
          source: modalState.source,
          elapsed_ms: Date.now() - START
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || t("Please try again shortly.", "Silakan coba lagi sebentar."));
      }

      put(DONE_KEY, true);
      // Built from the fields this submit validated, not from storage, so the
      // confirmation can only ever name the person who just filled it in.
      // Escaped at the point of use below: it is somebody's own typing going
      // back into innerHTML.
      const subscriberName = [firstName, lastName].filter(Boolean).join(" ").trim();
      const modal = modalNode();
      if (modal) {
        modal.innerHTML = `
          <div class="nl-modal-card">
          <button class="nl-modal-close" type="button" aria-label="${escapeHtml(
            t("Close", "Tutup")
          )}" data-nl-modal-close>&times;</button>
          <div class="nl-done">
            <h2 id="nl-modal-title">${escapeHtml(
              t("Join the world of Marvell", "Selamat datang di dunia Marvell")
            )}</h2>
            ${subscriberName ? `<p class="nl-done-name">${escapeHtml(subscriberName)}</p>` : ""}
            <p class="nl-done-body">${escapeHtml(
              t(
                "We are pleased to confirm that you have successfully subscribed to Marvell Florist's digital communications.",
                "Dengan senang hati kami konfirmasi bahwa Anda telah berhasil berlangganan komunikasi digital Marvell Florist."
              )
            )}</p>
            <p class="nl-done-thanks">${escapeHtml(t("Thank you", "Terima kasih"))}</p>
            <button class="nl-done-close" type="button" data-nl-modal-close>${escapeHtml(
              t("Close", "Tutup")
            )}</button>
          </div>
          </div>
        `;
      }
      // The submit button has just been removed from the document, so focus
      // would fall back to <body> and leave a keyboard visitor outside the
      // dialog they are still inside. The way out takes it instead.
      modal?.querySelector(".nl-done-close")?.focus?.();

      // The form in the page has nothing left to do either.
      document.querySelectorAll("[data-nl-form]").forEach((inline) => {
        inline.hidden = true;
        setStatus(inline, SUCCESS());
      });
    } catch (error) {
      const message = error instanceof TypeError
        ? isLiveServer
          ? t(
              "The local newsletter service is offline. Start it with npm run newsletter:live-server.",
              "Layanan newsletter lokal belum berjalan. Jalankan npm run newsletter:live-server."
            )
          : t("Could not connect right now. Please try again shortly.", "Belum dapat terhubung. Silakan coba lagi sebentar.")
        : error.message;
      setModalStatus(message, "error");
      button.disabled = false;
    }
  }

  // -- the occasional invitation ---------------------------------------------

  let inviteTimer = 0;
  let hideTimer = 0;
  let autoHideTimer = 0;

  function scheduleInvite(delay) {
    clearTimeout(inviteTimer);
    inviteTimer = setTimeout(invite, Math.max(0, delay));
  }

  function hideCard() {
    const card = document.querySelector(".nl-card");
    if (!card || card.hidden) return;
    card.classList.remove("is-visible");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!card.classList.contains("is-visible")) card.hidden = true;
    }, 420);
  }

  function dismiss() {
    put(IMPRESSIONS_KEY, { nextAt: Date.now() + REPEAT_INVITE_MS });
    clearTimeout(autoHideTimer);
    scheduleInvite(REPEAT_INVITE_MS);
    hideCard();
  }

  function invite() {
    if (get(DONE_KEY) || /\/(checkout|cart|bag|order)(\.html)?$/i.test(location.pathname)) return;
    const state = get(IMPRESSIONS_KEY) || {};
    if (state.nextAt > Date.now()) {
      scheduleInvite(state.nextAt - Date.now());
      return;
    }
    // Never over the top of something the visitor opened themselves.
    if (
      document.visibilityState === "hidden" ||
      document.querySelector(".menu-panel.is-open, .mv-panel.is-open, .search-dropdown.is-open, .footer-language-popover.is-open")
    ) {
      scheduleInvite(30000);
      return;
    }
    const card = document.querySelector(".nl-card");
    if (!card) return;
    card.hidden = false;
    requestAnimationFrame(() => card.classList.add("is-visible"));
    put(IMPRESSIONS_KEY, { nextAt: Date.now() + REPEAT_INVITE_MS });
    clearTimeout(autoHideTimer);
    autoHideTimer = setTimeout(hideCard, INVITE_VISIBLE_MS);
    scheduleInvite(REPEAT_INVITE_MS);
  }

  // -- mounting ---------------------------------------------------------------

  function bindForms(scope) {
    scope.querySelectorAll("[data-nl-form]").forEach((form) => {
      if (form.dataset.bound === "1") return;
      form.dataset.bound = "1";
      form.addEventListener("submit", handleInline);
    });
  }

  /**
   * Puts the signup in the footer, whenever the footer turns up.
   *
   * assets/shared-footer.js builds `.footer-inner`, and the two scripts are
   * not loaded in the same order on every page: the home page has them both
   * deferred with this one first, which means the footer does not exist yet
   * when this runs and the mailing list simply was not on the home page. So
   * the block is placed if the footer is there, and watched for if it is not.
   */
  function mountFooterBlock() {
    const footer = document.querySelector("#site-footer .footer-inner");
    if (!footer) return false;
    if (footer.querySelector(".nl-block")) return true;
    const block = document.createElement("div");
    block.id = "newsletter";
    block.className = "nl-block nl-footer";
    block.innerHTML = `<h2>${escapeHtml(TITLE())}</h2>${formMarkup("footer")}`;
    const grid = footer.querySelector(".footer-grid");
    if (grid) grid.before(block);
    else footer.prepend(block);
    bindForms(block);
    return true;
  }

  /** Waits for a footer that is built after this script has already run. */
  function watchForFooter() {
    if (mountFooterBlock()) return;
    if (typeof MutationObserver !== "function" || !document.body) return;
    const observer = new MutationObserver(() => {
      if (mountFooterBlock()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Nothing built one. Stop watching rather than holding the observer open.
    window.addEventListener("load", () => {
      mountFooterBlock();
      observer.disconnect();
    }, { once: true });
  }

  function mount() {
    const style = document.createElement("style");
    style.id = "marvell-newsletter-styles";
    style.textContent = css;
    document.head.appendChild(style);

    mountFooterBlock();

    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="nl-backdrop" hidden></div>
       <section class="nl-modal" role="dialog" aria-modal="true" aria-labelledby="nl-modal-title" hidden></section>`
    );

    document.body.insertAdjacentHTML(
      "beforeend",
      `<aside class="nl-card nl-block" aria-label="${escapeHtml(
        t("Newsletter invitation", "Undangan newsletter")
      )}" hidden>
        <button class="nl-card-close" type="button" aria-label="${escapeHtml(
          t("Dismiss newsletter invitation", "Tutup undangan newsletter")
        )}">&times;</button>
        <h2>${escapeHtml(TITLE())}</h2>
        ${formMarkup("card")}
      </aside>`
    );

    bindForms(document);
    document.querySelector(".nl-card-close")?.addEventListener("click", dismiss);

    // Delegated: the dialog's contents are rebuilt every time it opens.
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest("[data-nl-modal-close]")) {
        event.preventDefault();
        closeModal();
        return;
      }

      const trigger = target.closest("[data-nl-select-trigger]");
      if (trigger instanceof HTMLElement) {
        event.preventDefault();
        setTitleOpen(trigger.closest("[data-nl-select]"), trigger.getAttribute("aria-expanded") !== "true");
        return;
      }

      const title = target.closest("[data-nl-title]");
      if (title instanceof HTMLElement) {
        event.preventDefault();
        modalState.title = title.dataset.nlTitle || "";
        const select = title.closest("[data-nl-select]");
        select?.querySelectorAll("[data-nl-title]").forEach((option) => {
          option.setAttribute("aria-selected", option === title ? "true" : "false");
        });
        const value = select?.querySelector(".nl-select-value");
        if (value instanceof HTMLElement) {
          value.textContent = title.dataset.nlTitleLabel || title.textContent || "";
          value.dataset.placeholder = "false";
        }
        // Answering clears the red rule a failed submit may have left behind,
        // so the field stops accusing the moment it is satisfied.
        select?.querySelector("[data-nl-select-trigger]")?.setAttribute("aria-invalid", "false");
        setTitleOpen(select, false);
        select?.querySelector("[data-nl-select-trigger]")?.focus?.();
        return;
      }

      // Anywhere else inside the dialog closes the accordion again.
      if (!target.closest("[data-nl-select]")) {
        modalNode()?.querySelectorAll("[data-nl-select]").forEach((select) => setTitleOpen(select, false));
      }

      // Clicking off the sheet closes the dialog. The overlay is the scroller
      // now, so it covers the whole window and sits over the backdrop — the
      // backdrop's own click listener can no longer be reached, and without
      // this there would be nothing to dismiss it but the cross and Escape.
      const modal = modalNode();
      if (modal && !modal.hidden && target === modal) {
        closeModal();
      }
    });

    document.addEventListener("submit", (event) => {
      const form = event.target;
      if (form instanceof HTMLFormElement && form.matches("[data-nl-modal-form]")) submitModal(event, form);
    });

    backdropNode()?.addEventListener("click", closeModal);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });

    // Anything that used to open the panel now goes to the footer form, which
    // is the only place this lives.
    document.querySelectorAll("[data-newsletter-open]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        focusSignup();
      });
    });

    watchForFooter();

    if (new URL(location.href).searchParams.get("newsletter") === "1") focusSignup();

    const state = get(IMPRESSIONS_KEY) || {};
    const nextAt = state.nextAt || Date.now() + FIRST_INVITE_MS;
    if (!state.nextAt) put(IMPRESSIONS_KEY, { nextAt });
    scheduleInvite(nextAt - Date.now());
  }

  /** Takes somebody to the signup rather than opening anything over the page. */
  function focusSignup() {
    const field = document.querySelector('.nl-footer input[name="email"]');
    if (!(field instanceof HTMLElement)) return;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => field.focus({ preventScroll: true }), 320);
  }

  window.MarvellNewsletter = {
    /** Kept for existing callers: there is no panel to open any more. */
    open: focusSignup,
    focus: focusSignup,
    openDialog: (email, source) => openModal(email || "", source || "link", ""),
    closeDialog: closeModal,
    bindForms
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
