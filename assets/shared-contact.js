(function () {
  if (typeof document === "undefined") return;
  const triggers = Array.from(document.querySelectorAll(".header-contact"));
  const existingPanel = document.getElementById("contact-quick-panel");
  if (!triggers.length && !(existingPanel instanceof HTMLElement)) return;

  const styleId = "shared-contact-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .header-contact,
      .contact-quick-trigger {
        display: inline-flex !important;
        align-items: center !important;
        gap: 0 !important;
        padding: 0 !important;
        line-height: 1.1 !important;
        text-shadow: none !important;
        color: rgba(42, 33, 24, 0.82) !important;
        text-decoration: none !important;
        font-family: "Inter Tight", sans-serif !important;
        font-size: 12px !important;
        font-weight: 400 !important;
        letter-spacing: 0.06em !important;
        text-transform: none !important;
        background: none !important;
        border: 0 !important;
        cursor: pointer !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        transition: color 0.45s ease, opacity 0.2s ease !important;
        appearance: none;
        -webkit-appearance: none;
      }
      .header-contact::after,
      .contact-quick-trigger::after {
        content: none !important;
      }
      .header-contact::before,
      .contact-quick-trigger::before {
        content: "+" !important;
        margin-right: 8px !important;
        font-size: 14px !important;
        line-height: 1 !important;
        transform: translateY(-0.5px) !important;
      }
      .header-contact:hover,
      .header-contact:focus-visible,
      .contact-quick-trigger:hover,
      .contact-quick-trigger:focus-visible {
        color: rgba(42, 33, 24, 0.82) !important;
        opacity: 0.84 !important;
        transform: none !important;
        outline: none !important;
        text-decoration: none !important;
      }
      .contact-quick-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(12, 10, 9, 0.34);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.5s ease-in-out;
        z-index: 240;
      }
      .contact-quick-backdrop.is-open {
        opacity: 1;
        pointer-events: auto;
      }
      .contact-quick-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: min(92vw, 600px);
        height: 100vh;
        background: var(--footer-offwhite, #f8f6f1);
        color: #151210;
        transform: translateX(100%);
        transition: transform 0.5s ease-in-out;
        z-index: 241;
        box-shadow: none;
        display: grid;
        grid-template-rows: auto 1fr;
      }
      .contact-quick-panel.is-open {
        transform: translateX(0);
        box-shadow: -20px 0 36px rgba(10, 12, 18, 0.22);
      }
      #contact-quick-panel .contact-quick-head {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 24px 34px 8px;
      }
      #contact-quick-panel .contact-quick-close {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        border: 0;
        background: #111;
        color: #fff;
        font-size: 23px;
        font-weight: 300;
        line-height: 1;
        cursor: pointer;
        display: grid;
        place-items: center;
        transition: background 0.2s ease;
      }
      #contact-quick-panel .contact-quick-close:hover,
      #contact-quick-panel .contact-quick-close:focus-visible {
        background: #000;
        outline: none;
      }
      #contact-quick-panel .contact-quick-body {
        padding: 18px 40px 34px 88px;
        display: grid;
        gap: 20px;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      #contact-quick-panel .contact-quick-block {
        display: grid;
        gap: 10px;
      }
      #contact-quick-panel .contact-quick-label {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        line-height: 1.08;
        letter-spacing: 0.12em;
        font-weight: 600;
        color: rgba(21, 18, 16, 0.65);
      }
      #contact-quick-panel .contact-quick-link,
      #contact-quick-panel .contact-quick-text {
        margin: 0;
        font-family: "Inter Tight", sans-serif;
        font-size: 14px;
        line-height: 1.45;
        color: #1d1a18;
      }
      #contact-quick-panel .contact-quick-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        text-decoration: none;
        font-size: clamp(14px, 1.3vw, 18px);
        font-weight: 500;
        line-height: 1.22;
        width: fit-content;
      }
      #contact-quick-panel .contact-quick-link::after {
        content: "\\203A";
        position: static;
        width: auto;
        height: auto;
        background: none;
        opacity: 0;
        transform: translateX(-4px);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      #contact-quick-panel .contact-quick-link:hover,
      #contact-quick-panel .contact-quick-link:focus-visible {
        opacity: 0.85;
        text-decoration: underline;
        text-underline-offset: 0.08em;
        text-decoration-thickness: 1px;
      }
      #contact-quick-panel .contact-quick-link:hover::after,
      #contact-quick-panel .contact-quick-link:focus-visible::after {
        opacity: 0.65;
        transform: translateX(0);
      }
      #contact-quick-panel .contact-quick-text.is-muted {
        color: rgba(21, 18, 16, 0.62);
      }
      body.contact-quick-open {
        overflow: hidden;
      }
      @media (max-width: 768px) {
        .header-contact,
        .contact-quick-trigger {
          gap: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const panelMarkup = `
    <div class="contact-quick-head">
      <button class="contact-quick-close" id="contact-quick-close" type="button" aria-label="Close contact panel">&#10005;</button>
    </div>
    <div class="contact-quick-body">
      <div class="contact-quick-block">
        <p class="contact-quick-label">Hubungi Kami</p>
        <a class="contact-quick-link" href="https://wa.me/6281275017456" target="_blank" rel="noopener noreferrer">Rangkaian Bunga</a>
        <a class="contact-quick-link" href="https://wa.me/628116667457" target="_blank" rel="noopener noreferrer">Pesanan Kustom</a>
        <a class="contact-quick-link" href="https://wa.me/628116667920" target="_blank" rel="noopener noreferrer">Perlengkapan</a>
        <p class="contact-quick-text is-muted">Tersedia Senin – Sabtu</p>
        <p class="contact-quick-text is-muted">8:00 – 18:00 (WIB)</p>
      </div>
      <div class="contact-quick-block">
        <p class="contact-quick-label">Lokasi Kami</p>
        <a class="contact-quick-link" href="https://maps.app.goo.gl/PL8EQ7C1mVJAoa3LA?g_st=ic" target="_blank" rel="noopener noreferrer">Rangkaian</a>
        <a class="contact-quick-link" href="https://maps.app.goo.gl/uhXFdFr4SfC97ABb9?g_st=ic" target="_blank" rel="noopener noreferrer">Perlengkapan</a>
      </div>
      <div class="contact-quick-block">
        <p class="contact-quick-label">Tetap Terhubung</p>
        <a class="contact-quick-link" href="https://www.instagram.com/marvellflorist" target="_blank" rel="noopener noreferrer">Instagram</a>
        <a class="contact-quick-link" href="https://www.facebook.com/share/184hfdi9TD/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer">Facebook</a>
      </div>
      <div class="contact-quick-block">
        <p class="contact-quick-label">Belanja Online</p>
        <a class="contact-quick-link" href="https://id.shp.ee/8mCEvykG" target="_blank" rel="noopener noreferrer">Shopee</a>
        <a class="contact-quick-link" href="https://tk.tokopedia.com/ZSuyXkhHG/" target="_blank" rel="noopener noreferrer">Tokopedia</a>
      </div>
    </div>
  `;

  triggers.forEach((trigger) => {
    trigger.classList.add("contact-quick-trigger");
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", "contact-quick-panel");
    trigger.setAttribute("aria-expanded", "false");
    if (trigger instanceof HTMLAnchorElement) {
      trigger.setAttribute("role", "button");
    }
  });

  let panel = existingPanel instanceof HTMLElement ? existingPanel : null;
  let backdrop = document.getElementById("contact-quick-backdrop");
  if (!(backdrop instanceof HTMLElement)) backdrop = null;

  if (panel instanceof HTMLElement) {
    panel.className = "contact-quick-panel";
    panel.id = "contact-quick-panel";
    panel.dataset.sharedManaged = "true";
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("tabindex", "-1");
    panel.innerHTML = panelMarkup;
  } else {
    if (!triggers.length) return;
    panel = document.createElement("aside");
    panel.className = "contact-quick-panel";
    panel.id = "contact-quick-panel";
    panel.dataset.sharedManaged = "true";
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("tabindex", "-1");
    panel.innerHTML = panelMarkup;
    document.body.appendChild(panel);
  }

  if (!(backdrop instanceof HTMLElement)) {
    backdrop = document.createElement("div");
    backdrop.className = "contact-quick-backdrop";
    backdrop.id = "contact-quick-backdrop";
    document.body.appendChild(backdrop);
  }
  backdrop.className = "contact-quick-backdrop";
  backdrop.id = "contact-quick-backdrop";
  backdrop.dataset.sharedManaged = "true";
  backdrop.setAttribute("aria-hidden", "true");

  if (!(panel instanceof HTMLElement) || !(backdrop instanceof HTMLElement)) return;
  if (document.body instanceof HTMLElement) document.body.dataset.sharedContactApplied = "1";

  const closeButton = panel.querySelector("#contact-quick-close");

  const setOpen = (open) => {
    panel.classList.toggle("is-open", open);
    backdrop.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("contact-quick-open", open);
    triggers.forEach((trigger) => {
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    if (open) panel.focus();
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(true);
    });
  });

  if (closeButton instanceof HTMLButtonElement) {
    closeButton.addEventListener("click", () => setOpen(false));
  }
  backdrop.addEventListener("click", () => setOpen(false));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) setOpen(false);
  });
})();
