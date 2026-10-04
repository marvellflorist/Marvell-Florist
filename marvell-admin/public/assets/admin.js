(() => {
  "use strict";

  /**
   * Marvell Admin — staff workspace.
   *
   * Content-Security-Policy on this site is `style-src 'self'`, so nothing in
   * here may emit a style="" attribute. Anything that varies at runtime is a
   * class, a data-* attribute read back after render, or a custom property set
   * through CSSOM (which the policy does not police).
   */

  const app = document.getElementById("app");

  const state = {
    staff: null, auth: "loading", email: "", factors: [], enrollment: null,
    page: "home", queue: "open", orders: [], ordersTruncated: false, order: null,
    notices: [], noticeCount: 0, stock: [], sales: null,
    message: "", pendingPrint: null, salesPeriod: "today",
    loading: false, filter: ""
  };

  const labels = {
    new: "Pesanan Baru", acknowledged: "Dikonfirmasi", preparing: "Sedang Disiapkan",
    ready: "Siap Dikirim", out_for_delivery: "Dalam Pengiriman", delivered: "Selesai",
    cancelled: "Dibatalkan", unpaid: "Menunggu Pembayaran", pending: "Menunggu Pembayaran",
    capture: "Lunas", settlement: "Lunas", refund: "Dikembalikan",
    partial_refund: "Dikembalikan Sebagian", deny: "Gagal", failure: "Gagal", expire: "Kedaluwarsa"
  };
  const roleLabels = { owner: "Pemilik", store_admin: "Admin Toko", florist: "Perangkai", delivery: "Pengiriman" };
  const eventLabels = { paid: "Pembayaran Dikonfirmasi", paid_stock_exception: "Pembayaran Perlu Tindakan",
    acknowledge: "Pesanan Dikonfirmasi", start_preparing: "Mulai Disiapkan", mark_ready: "Siap Dikirim",
    start_delivery: "Mulai Pengiriman", complete: "Pesanan Selesai",
    attention_resolved: "Masalah Diselesaikan", delivery_slot_changed: "Waktu Pengiriman Diubah",
    payment_cancelled: "Pembayaran Dibatalkan", payment_expired: "Pembayaran Kedaluwarsa",
    payment_refunded: "Dana Dikembalikan" };

  /* ─── Icons ────────────────────────────────────────────────────────────── */

  /**
   * Drawn to the same specification as the storefront's icon family
   * (assets/marvell-icons.js): a 24x24 box, 1.25 stroke, round joins, no fill,
   * and geometry squared off where Lucide rounds. Optical weight is matched
   * across the set so no glyph shouts louder than its neighbours.
   */
  const svg = (paths, cls = "") =>
    `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none"` +
    ` stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

  const I = {
    home: () => svg('<path d="M4 10.2 12 4l8 6.2V19a1 1 0 0 1-1 1h-4.25v-5.5h-5.5V20H5a1 1 0 0 1-1-1Z"/>'),
    orders: () => svg('<path d="M6.5 3.75h11v16.5l-2.75-1.75L12 20.25l-2.75-1.75L6.5 20.25Z"/><path d="M9.5 8.75h5M9.5 12.25h5"/>'),
    card: () => svg('<rect x="3.5" y="5.5" width="17" height="13" rx=".5"/><path d="m4 6 8 6.5L20 6"/>'),
    delivery: () => svg('<path d="M2.75 6.75h10.5v9.5H2.75Z"/><path d="M13.25 10.25h3.5l2.5 3v3h-6Z"/><circle cx="7" cy="17.75" r="1.6"/><circle cx="17" cy="17.75" r="1.6"/>'),
    stock: () => svg('<path d="M12 3.5 20.5 8v8L12 20.5 3.5 16V8Z"/><path d="M3.5 8 12 12.5 20.5 8M12 12.5v8"/>'),
    sales: () => svg('<path d="M3.75 20.25h16.5"/><rect x="5" y="12" width="3.6" height="6.5"/><rect x="10.2" y="7.25" width="3.6" height="11.25"/><rect x="15.4" y="14.25" width="3.6" height="4.25"/>'),
    notices: () => svg('<path d="M6.25 9.75a5.75 5.75 0 0 1 11.5 0v4l1.5 2.75H4.75l1.5-2.75Z"/><path d="M10 19.5a2.1 2.1 0 0 0 4 0"/>'),
    staff: () => svg('<circle cx="9.5" cy="8.5" r="3.25"/><path d="M3.75 19.75a5.75 5.75 0 0 1 11.5 0"/><path d="M15.9 5.6a3.25 3.25 0 0 1 0 5.8"/><path d="M17.4 14.6a5.75 5.75 0 0 1 2.85 5.15"/>'),
    account: () => svg('<circle cx="12" cy="8.25" r="3.75"/><path d="M4.75 20.25a7.25 7.25 0 0 1 14.5 0"/>'),
    refresh: () => svg('<path d="M20.25 12a8.25 8.25 0 1 1-2.5-5.9"/><path d="M20.25 4.25V8H16.5"/>'),
    chevronDown: () => svg('<path d="m6.75 9.75 5.25 5.25 5.25-5.25"/>'),
    chevronRight: () => svg('<path d="m9.75 6.75 5.25 5.25-5.25 5.25"/>'),
    check: () => svg('<path d="m5.25 12.5 4.5 4.5 9-10"/>'),
    close: () => svg('<path d="M6.25 6.25 17.75 17.75M17.75 6.25 6.25 17.75"/>'),
    search: () => svg('<circle cx="10.75" cy="10.75" r="6.25"/><path d="M15.4 15.4 20 20"/>'),
    alert: () => svg('<path d="M12 4.25 21 19.75H3Z"/><path d="M12 10.25v4.25M12 17.15v.06"/>'),
    info: () => svg('<circle cx="12" cy="12" r="8.25"/><path d="M12 11.25v5.25M12 7.9v.06"/>'),
    clock: () => svg('<circle cx="12" cy="12" r="8.25"/><path d="M12 7.25v5l3.25 2"/>'),
    calendar: () => svg('<rect x="3.75" y="5.25" width="16.5" height="15" rx=".5"/><path d="M3.75 9.75h16.5M8 3.5v3.5M16 3.5v3.5"/>'),
    pin: () => svg('<path d="M12 20.5s6.25-6.1 6.25-10.25a6.25 6.25 0 1 0-12.5 0C5.75 14.4 12 20.5 12 20.5Z"/><circle cx="12" cy="10.1" r="2.35"/>'),
    printer: () => svg('<path d="M7 9.5V3.75h10V9.5"/><path d="M7 16.5H4.25a.5.5 0 0 1-.5-.5v-5.75a.5.5 0 0 1 .5-.5h15.5a.5.5 0 0 1 .5.5V16a.5.5 0 0 1-.5.5H17"/><path d="M7 13.75h10v6.5H7Z"/>'),
    eye: () => svg('<path d="M2.75 12S6.5 6.25 12 6.25 21.25 12 21.25 12 17.5 17.75 12 17.75 2.75 12 2.75 12Z"/><circle cx="12" cy="12" r="2.75"/>'),
    edit: () => svg('<path d="M4.75 19.25h3.5L19.1 8.4a1.77 1.77 0 0 0-2.5-2.5L5.75 16.75Z"/>'),
    logout: () => svg('<path d="M14.25 4.75H6.5a.75.75 0 0 0-.75.75v13a.75.75 0 0 0 .75.75h7.75"/><path d="M11 12h9.25M16.75 8.25 20.25 12l-3.5 3.75"/>'),
    shield: () => svg('<path d="M12 3.75 19.25 6.5v5.4c0 4.2-2.9 7-7.25 8.35C7.65 18.9 4.75 16.1 4.75 11.9V6.5Z"/><path d="m9 11.9 2.3 2.3 4-4.4"/>'),
    plus: () => svg('<path d="M12 5.75v12.5M5.75 12h12.5"/>'),
    minus: () => svg('<path d="M5.75 12h12.5"/>'),
    inbox: () => svg('<path d="M3.75 13.5 6.5 4.75h11l2.75 8.75v5.5a.5.5 0 0 1-.5.5h-15a.5.5 0 0 1-.5-.5Z"/><path d="M3.75 13.5h4l1.25 2.5h6l1.25-2.5h4"/>'),
    flower: () => svg('<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8a2.85 2.85 0 1 1 0-5.7 2.85 2.85 0 0 1 0 5.7ZM12 14.2a2.85 2.85 0 1 0 0 5.7 2.85 2.85 0 0 0 0-5.7ZM9.8 12a2.85 2.85 0 1 1-5.7 0 2.85 2.85 0 0 1 5.7 0ZM14.2 12a2.85 2.85 0 1 0 5.7 0 2.85 2.85 0 0 0-5.7 0Z"/>'),
    money: () => svg('<rect x="2.75" y="5.75" width="18.5" height="12.5" rx=".5"/><circle cx="12" cy="12" r="2.75"/><path d="M6.25 12h.06M17.7 12h.06"/>'),
    user: () => svg('<circle cx="12" cy="8.25" r="3.75"/><path d="M4.75 20.25a7.25 7.25 0 0 1 14.5 0"/>'),
    menu: () => svg('<path d="M3.5 7h17M3.5 12h17M3.5 17h17"/>')
  };

  /* ─── Formatting ───────────────────────────────────────────────────────── */

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (v) => `Rp ${Number(v || 0).toLocaleString("id-ID")}`;
  const date = (v) => v ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Jakarta" }).format(new Date(`${v}T12:00:00+07:00`)) : "Belum ditentukan";
  const dateShort = (v) => v ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short",
    timeZone: "Asia/Jakarta" }).format(new Date(`${v}T12:00:00+07:00`)) : "Tanpa tanggal";
  const windowLabel = (v) => v === "morning" ? "Pagi" : v === "afternoon" ? "Siang" : v || "—";
  const status = (key) => labels[key] || key || "—";

  /** Today and tomorrow in Jakarta, for the "kirim hari ini" emphasis. */
  const jakartaDay = (offset = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + offset * 86400000));
  function dueLabel(value) {
    if (!value) return { text: "Belum ditentukan", soon: false };
    if (value === jakartaDay(0)) return { text: "Hari ini", soon: true };
    if (value === jakartaDay(1)) return { text: "Besok", soon: true };
    return { text: dateShort(value), soon: value < jakartaDay(0) };
  }

  const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase()).join("") || "?";

  const imageUrl = (value) => {
    const raw = String(value || "");
    if (/^\/assets\/[a-z0-9/_().%-]+$/i.test(raw)) return `https://marvellflorist.com${raw}`;
    if (/^https:\/\/marvellflorist\.com\/assets\/[a-z0-9/_().%-]+$/i.test(raw)) return raw;
    return "";
  };
  const thumb = (value, cls = "") => imageUrl(value)
    ? `<img class="thumb ${cls}" src="${esc(imageUrl(value))}" alt="" loading="lazy" decoding="async">`
    : `<span class="thumb ${cls}" aria-hidden="true"></span>`;

  const button = (label, action, extra = "") => `<button class="primary" data-action="${action}" ${extra}>${label}</button>`;

  /* ─── API ──────────────────────────────────────────────────────────────── */

  async function api(path, { method = "GET", body } = {}) {
    const response = await fetch(path, { method, credentials: "same-origin",
      headers: body ? { "content-type": "application/json" } : {},
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      const error = new Error(data.message || "Layanan sedang terganggu.");
      error.code = data.code || "gangguan";
      error.status = response.status;
      throw error;
    }
    return data;
  }

  /* ─── Persistent chrome: toasts and the modal ──────────────────────────── */

  let toastHost = null;
  let modalHost = null;
  let modalForm = null;
  let modalResolve = null;
  let lastFocused = null;

  function buildChrome() {
    toastHost = document.createElement("div");
    toastHost.className = "toast-stack";
    toastHost.id = "mv-toasts";
    toastHost.setAttribute("role", "status");
    toastHost.setAttribute("aria-live", "polite");
    document.body.appendChild(toastHost);

    modalHost = document.createElement("div");
    modalHost.className = "modal-root";
    modalHost.id = "mv-modal";
    modalHost.hidden = true;
    modalHost.innerHTML = `<div class="modal-backdrop" data-modal-dismiss></div>
      <form class="modal" role="dialog" aria-modal="true" aria-labelledby="mv-modal-title" novalidate></form>`;
    document.body.appendChild(modalHost);
    modalForm = modalHost.querySelector("form");

    // The modal owns its own events. stopPropagation keeps the workspace's
    // delegated document listeners from also seeing them.
    modalForm.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopPropagation();
      submitModal();
    });
    modalHost.addEventListener("click", (event) => {
      event.stopPropagation();
      const target = event.target;
      if (target.closest("[data-modal-dismiss]") || target.closest("[data-modal-cancel]")) {
        closeModal(null);
        return;
      }
      const step = target.closest("[data-step]");
      if (step) {
        const input = modalForm.querySelector(`[name="${step.dataset.stepTarget}"]`);
        if (input) {
          const next = Math.max(0, (Number(input.value) || 0) + Number(step.dataset.step));
          input.value = String(next);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        return;
      }
      const seg = target.closest(".seg-option");
      if (seg) {
        seg.parentElement.querySelectorAll(".seg-option")
          .forEach((option) => option.setAttribute("aria-pressed", String(option === seg)));
        const hidden = modalForm.querySelector(`input[name="${seg.dataset.segName}"]`);
        if (hidden) hidden.value = seg.dataset.segValue;
      }
    });
    modalHost.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.stopPropagation(); closeModal(null); return; }
      if (event.key !== "Tab") return;
      const focusable = [...modalForm.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  function toast(message, kind = "info") {
    if (!message) return;
    const glyph = kind === "ok" ? "check" : kind === "error" ? "alert" : kind === "warn" ? "alert" : "info";
    const node = document.createElement("div");
    node.className = `toast is-${kind}`;
    node.innerHTML = `${I[glyph]()}<p>${esc(message)}</p>
      <button type="button" class="icon-btn toast-close" aria-label="Tutup">${I.close()}</button>`;
    toastHost.appendChild(node);
    const dismiss = () => {
      if (!node.isConnected || node.classList.contains("leaving")) return;
      node.classList.add("leaving");
      node.addEventListener("animationend", () => node.remove(), { once: true });
      window.setTimeout(() => node.remove(), 400);
    };
    node.querySelector(".toast-close").addEventListener("click", dismiss);
    window.setTimeout(dismiss, kind === "error" ? 7000 : 4200);
    while (toastHost.children.length > 4) toastHost.firstElementChild.remove();
  }

  /**
   * The replacement for window.confirm and window.prompt.
   *
   * Those dialogs could only ever ask for one line of text, which is why the
   * delivery reschedule used to be two consecutive prompts — a raw YYYY-MM-DD
   * string, then "ketik 1 untuk Pagi atau 2 untuk Siang". Here a reschedule is
   * a date field and a two-option control, and a stock edit is a stepper with
   * the reserved count in view while you type.
   *
   * Resolves with a values object, or null when dismissed.
   */
  function openModal({ title, message, tone = "brand", glyph = "info", fields = [],
    confirmLabel = "Lanjutkan", cancelLabel = "Batal", danger = false, wide = false }) {
    if (modalResolve) closeModal(null);
    lastFocused = document.activeElement;

    const body = fields.map((field) => {
      const id = `mv-f-${field.name}`;
      const label = `<span class="field-label">${esc(field.label)}</span>`;
      const hint = field.hint ? `<p class="field-hint">${esc(field.hint)}</p>` : "";
      if (field.type === "seg") {
        return `<div class="field">${label}
          <input type="hidden" name="${esc(field.name)}" value="${esc(field.value ?? field.options[0].value)}">
          <div class="seg" role="group">${field.options.map((option) => `
            <button type="button" class="seg-option" data-seg-name="${esc(field.name)}"
              data-seg-value="${esc(option.value)}"
              aria-pressed="${String((field.value ?? field.options[0].value) === option.value)}">${esc(option.label)}</button>`).join("")}
          </div>${hint}</div>`;
      }
      if (field.type === "textarea") {
        return `<label class="field" for="${id}">${label}
          <textarea id="${id}" name="${esc(field.name)}" class="textarea" rows="4"
            ${field.required ? "required" : ""} ${field.maxlength ? `maxlength="${field.maxlength}"` : ""}
            placeholder="${esc(field.placeholder || "")}">${esc(field.value || "")}</textarea>${hint}</label>`;
      }
      if (field.type === "stepper") {
        return `<div class="field">${label}
          <div class="form-foot">
            <button type="button" class="secondary" data-step="-1" data-step-target="${esc(field.name)}" aria-label="Kurangi">${I.minus()}</button>
            <label class="field" for="${id}"><span class="sr-only">${esc(field.label)}</span>
              <input id="${id}" name="${esc(field.name)}" type="number" inputmode="numeric" min="0" step="1"
                value="${esc(field.value ?? 0)}" required></label>
            <button type="button" class="secondary" data-step="1" data-step-target="${esc(field.name)}" aria-label="Tambah">${I.plus()}</button>
          </div>${hint}</div>`;
      }
      return `<label class="field" for="${id}">${label}
        <input id="${id}" name="${esc(field.name)}" type="${esc(field.type || "text")}"
          value="${esc(field.value ?? "")}" ${field.required ? "required" : ""}
          ${field.min ? `min="${esc(field.min)}"` : ""} ${field.inputmode ? `inputmode="${esc(field.inputmode)}"` : ""}
          placeholder="${esc(field.placeholder || "")}">${hint}</label>`;
    }).join("");

    modalForm.className = `modal${wide ? " modal-wide" : ""}`;
    modalForm.innerHTML = `
      <div class="modal-head">
        <span class="modal-mark${tone === "warn" ? " is-warn" : tone === "alert" ? " is-alert" : ""}">${I[glyph] ? I[glyph]() : I.info()}</span>
        <div><h2 id="mv-modal-title">${esc(title)}</h2>
        ${message ? `<p>${esc(message)}</p>` : ""}</div>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">
        <button type="button" class="secondary" data-modal-cancel>${esc(cancelLabel)}</button>
        <button type="submit" class="${danger ? "danger-btn" : "primary"}">${esc(confirmLabel)}</button>
      </div>`;

    modalHost.hidden = false;
    document.body.classList.add("modal-open");
    window.requestAnimationFrame(() => {
      const first = modalForm.querySelector("input:not([type=hidden]), textarea") || modalForm.querySelector("[type=submit]");
      first?.focus();
      if (first && first.select && first.type !== "date") first.select();
    });
    return new Promise((resolve) => { modalResolve = resolve; });
  }

  function submitModal() {
    const invalid = [...modalForm.querySelectorAll("[required]")]
      .find((el) => !String(el.value || "").trim());
    if (invalid) {
      invalid.focus();
      toast("Lengkapi isian yang wajib diisi.", "warn");
      return;
    }
    closeModal(Object.fromEntries(new FormData(modalForm)));
  }

  function closeModal(value) {
    if (!modalResolve) return;
    const resolve = modalResolve;
    modalResolve = null;
    modalHost.hidden = true;
    document.body.classList.remove("modal-open");
    modalForm.innerHTML = "";
    resolve(value);
    if (lastFocused && lastFocused.isConnected) lastFocused.focus();
    lastFocused = null;
  }

  const confirmModal = (options) => openModal(options).then((value) => value !== null);

  /* ─── Dropdown menus and custom selects ────────────────────────────────── */

  function closeMenu(menu) {
    menu.classList.remove("open");
    menu.querySelector("[data-menu]")?.setAttribute("aria-expanded", "false");
    const panel = menu.querySelector(".menu-panel");
    if (panel) panel.hidden = true;
  }
  function closeSelect(wrap) {
    wrap.classList.remove("open");
    wrap.querySelector(".select-trigger")?.setAttribute("aria-expanded", "false");
    const list = wrap.querySelector(".select-list");
    if (list) list.hidden = true;
  }
  function dismissOverlays(node) {
    document.querySelectorAll(".mv-menu.open").forEach((menu) => { if (!menu.contains(node)) closeMenu(menu); });
    document.querySelectorAll(".mv-select.open").forEach((wrap) => { if (!wrap.contains(node)) closeSelect(wrap); });
  }

  function toggleMenu(trigger) {
    const menu = trigger.closest(".mv-menu");
    const panel = menu.querySelector(".menu-panel");
    const opening = panel.hidden;
    document.querySelectorAll(".mv-menu.open").forEach(closeMenu);
    if (!opening) return;
    menu.classList.add("open");
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    panel.querySelector(".menu-item")?.focus();
  }

  /**
   * The native <select> stays in the DOM, visually hidden but still
   * form-participating: every submit path here reads values through FormData,
   * and a div cannot be read by FormData. The listbox writes back to the native
   * element and dispatches `change`, so nothing downstream knows the difference.
   */
  function enhanceSelects(root) {
    root.querySelectorAll("select[data-enhance]").forEach((select) => {
      if (select.parentElement?.classList.contains("mv-select")) return;
      const wrap = document.createElement("div");
      wrap.className = "mv-select";
      select.parentElement.insertBefore(wrap, select);
      wrap.appendChild(select);

      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "select-trigger";
      trigger.setAttribute("aria-haspopup", "listbox");
      trigger.setAttribute("aria-expanded", "false");

      const list = document.createElement("div");
      list.className = "select-list";
      list.setAttribute("role", "listbox");
      list.hidden = true;

      const paint = () => {
        const current = select.options[select.selectedIndex];
        trigger.innerHTML = `<span>${esc(current ? current.textContent : "")}</span>${I.chevronDown()}`;
        list.innerHTML = [...select.options].map((option, index) => `
          <button type="button" class="select-option" role="option" data-index="${index}"
            aria-selected="${String(index === select.selectedIndex)}">
            <span>${esc(option.textContent)}</span>${I.check()}</button>`).join("");
      };
      paint();
      wrap.append(trigger, list);

      const choose = (index) => {
        select.selectedIndex = index;
        paint();
        closeSelect(wrap);
        trigger.focus();
        select.dispatchEvent(new Event("change", { bubbles: true }));
      };

      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        const opening = list.hidden;
        dismissOverlays(null);
        if (!opening) { closeSelect(wrap); return; }
        wrap.classList.add("open");
        list.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        list.querySelector('[aria-selected="true"]')?.focus();
      });
      list.addEventListener("click", (event) => {
        event.stopPropagation();
        const option = event.target.closest(".select-option");
        if (option) choose(Number(option.dataset.index));
      });
      wrap.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !list.hidden) {
          event.stopPropagation(); closeSelect(wrap); trigger.focus(); return;
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        if (list.hidden) { trigger.click(); return; }
        const options = [...list.querySelectorAll(".select-option")];
        const at = options.indexOf(document.activeElement);
        const next = event.key === "ArrowDown"
          ? Math.min(options.length - 1, at + 1)
          : Math.max(0, at - 1);
        options[next]?.focus();
      });
    });
  }

  /* ─── Skeletons ────────────────────────────────────────────────────────── */

  const skeletonRow = () => `<div class="sk-row"><span class="sk sk-thumb"></span>
    <span class="sk-lines"><span class="sk sk-line w-40"></span>
    <span class="sk sk-line w-80"></span><span class="sk sk-line w-60"></span></span></div>`;
  const skeletonQueue = (count = 5) => `<div class="work-grid">
    <div class="queue-list">${Array.from({ length: count }, skeletonRow).join("")}</div>
    <div class="sk sk-panel"></div></div>`;
  const skeletonList = (count = 4) => `<div class="simple-list">${Array.from({ length: count }, skeletonRow).join("")}</div>`;
  const skeletonStats = () => `<div class="stat-grid">${Array.from({ length: 3 }, () =>
    `<div class="stat"><span class="sk sk-line w-60"></span><div class="sk sk-line w-80"></div></div>`).join("")}</div>`;

  const emptyState = (glyph, title, note) => `<div class="empty">${I[glyph] ? I[glyph]() : I.inbox()}
    <strong>${esc(title)}</strong><p>${esc(note)}</p></div>`;

  /* ─── Auth ─────────────────────────────────────────────────────────────── */

  function stepRail(step) {
    return `<div class="auth-steps" aria-hidden="true">
      <span class="auth-step ${step > 1 ? "done" : step === 1 ? "now" : ""}"></span>
      <span class="auth-step ${step > 2 ? "done" : step === 2 ? "now" : ""}"></span>
    </div>`;
  }

  function authView() {
    let content = "";
    if (state.auth === "email") content = `${stepRail(1)}
      <p class="auth-kicker">Akses staf</p><h1>Masuk untuk bekerja</h1>
      <p class="muted">Gunakan alamat email yang terdaftar sebagai staf Marvell.</p>
      <form id="email-form">
        <label class="field" for="email"><span>Alamat email</span>
          <input id="email" name="email" type="email" autocomplete="email" placeholder="nama@contoh.com" required></label>
        <button class="primary">Kirim Kode Masuk</button>
      </form>`;

    if (state.auth === "code") content = `${stepRail(1)}
      <p class="auth-kicker">Langkah 1 dari 2</p><h1>Masukkan kode masuk</h1>
      <p class="muted">Kami mengirim kode sekali pakai ke <strong>${esc(state.email)}</strong>.</p>
      <form id="code-form">
        <label class="field" for="code"><span>Kode dari email</span>
          <input id="code" name="code" class="input-code" inputmode="numeric" autocomplete="one-time-code" required></label>
        <button class="primary">Lanjutkan</button>
      </form>
      <button class="quiet-btn" data-action="back-email">Gunakan email lain</button>`;

    if (state.auth === "mfa") content = `${stepRail(2)}
      <p class="auth-kicker">Langkah 2 dari 2</p><h1>Verifikasi dua langkah</h1>
      <p class="muted">Masukkan kode dari aplikasi autentikator Anda.</p>
      ${state.factors.length ? `<form id="mfa-form">
        ${state.factors.length > 1 ? `<label class="field" for="factor"><span>Aplikasi autentikator</span>
          <select id="factor" name="factor_id" data-enhance>${state.factors.map((factor, index) =>
            `<option value="${esc(factor.id)}">Aplikasi autentikator ${index + 1}</option>`).join("")}</select></label>`
        : `<input type="hidden" name="factor_id" value="${esc(state.factors[0].id)}">`}
        <label class="field" for="mfa-code"><span>Kode 6 angka</span>
          <input id="mfa-code" name="code" class="input-code" inputmode="numeric" autocomplete="one-time-code"
            pattern="[0-9]{6}" maxlength="6" required></label>
        <button class="primary">Verifikasi</button>
      </form>` : `<p class="notice">${I.shield()}<span>Aktifkan verifikasi dua langkah untuk menggunakan Marvell Admin.</span></p>
      <button class="primary" data-action="enroll">Aktifkan Sekarang</button>`}`;

    if (state.auth === "enroll") content = `
      <p class="auth-kicker">Pengamanan akun</p><h1>Aktifkan verifikasi dua langkah</h1>
      <p class="muted">Hubungkan aplikasi autentikator sekali saja. Setelah itu, sesi terverifikasi yang masih berlaku akan tetap membuka Admin.</p>
      <div class="enrollment-layout">
        <div class="qr-panel">
          ${state.enrollment?.qr_code ? `<img class="qr" src="${esc(state.enrollment.qr_code)}" alt="Kode QR untuk aplikasi autentikator">` : ""}
          <span class="qr-caption">Pindai dengan aplikasi autentikator</span>
        </div>
        <div class="enrollment-steps">
          <ol>
            <li>Buka Google Authenticator, 1Password, atau aplikasi sejenis.</li>
            <li>Pindai kode QR. Jika perlu, masukkan kunci manual di bawah.</li>
            <li>Masukkan kode 6 angka yang sedang tampil.</li>
          </ol>
          <div class="manual-key"><span>Kunci manual</span><code>${esc(state.enrollment?.secret)}</code></div>
          <form id="mfa-form">
            <input type="hidden" name="factor_id" value="${esc(state.enrollment?.factor_id)}">
            <label class="field" for="mfa-code"><span>Kode 6 angka dari aplikasi</span>
              <input id="mfa-code" name="code" class="input-code" inputmode="numeric" autocomplete="one-time-code"
                pattern="[0-9]{6}" maxlength="6" required></label>
            <button class="primary">Aktifkan dan Masuk</button>
          </form>
          <button class="quiet-btn" data-action="restart-enroll">Buat kode QR baru</button>
        </div>
      </div>`;

    app.innerHTML = `<div class="auth-wrap">
      <section class="auth-shell${state.auth === "enroll" ? " auth-shell-wide" : ""}">
        <aside class="auth-identity">
          <img class="auth-photo" src="/assets/auth-hero.webp" alt="" decoding="async">
          <span class="auth-scrim" aria-hidden="true"></span>
          <p class="auth-eyebrow">Ruang kerja staf</p>
          <div class="auth-wordmark">Marvell</div>
          <p class="auth-tagline">Pesanan, rangkaian, dan pengiriman dalam satu alur kerja.</p>
          <div class="auth-security"><span aria-hidden="true"></span> Akses staf terlindungi</div>
        </aside>
        <main class="auth-card"><div class="auth-card-inner">
          ${content || `<p class="muted">Memuat…</p>`}
          <p class="status-note" role="alert">${esc(state.message)}</p>
          <p class="auth-footnote">Khusus staf Marvell Florist</p>
        </div></main>
      </section></div>`;
    afterRender();
  }

  /* ─── Shell ────────────────────────────────────────────────────────────── */

  function navItems() {
    const role = state.staff.role;
    const items = [{ key: "home", label: "Beranda", glyph: "home" },
      { key: "orders", label: "Pesanan", glyph: "orders" }];
    if (role !== "delivery") items.push({ key: "cards", label: "Kartu Ucapan", glyph: "card" });
    if (role !== "florist") items.push({ key: "delivery", label: "Pengiriman", glyph: "delivery" });
    if (["owner", "store_admin", "florist"].includes(role)) items.push({ key: "stock", label: "Produk & Stok", glyph: "stock" });
    if (["owner", "store_admin"].includes(role)) {
      items.push({ key: "sales", label: "Penjualan", glyph: "sales" },
        { key: "notices", label: "Notifikasi", glyph: "notices", count: state.noticeCount });
    }
    if (role === "owner") items.push({ key: "staff", label: "Staf", glyph: "staff" });
    items.push({ key: "account", label: "Akun", glyph: "account" });
    return items;
  }

  function navButton(item) {
    const count = item.count
      ? `<span class="nav-count is-alert">${esc(item.count > 99 ? "99+" : item.count)}</span>` : "";
    return `<button class="nav-link${state.page === item.key ? " active" : ""}" data-page="${item.key}"
      ${state.page === item.key ? 'aria-current="page"' : ""}>${I[item.glyph]()}<span>${item.label}</span>${count}</button>`;
  }

  function userMenu(id, placement) {
    return `<div class="mv-menu">
      <button class="user-chip" data-menu="${id}" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}">
        <span class="user-avatar" aria-hidden="true">${esc(initials(state.staff.display_name))}</span>
        <span class="user-chip-text"><strong>${esc(state.staff.display_name)}</strong>
        <span>${esc(roleLabels[state.staff.role] || state.staff.role)}</span></span>
        ${I.chevronDown()}
      </button>
      <div class="menu-panel ${placement}" id="${id}" role="menu" hidden>
        <div class="menu-head"><strong>${esc(state.staff.display_name)}</strong>
          <span>${esc(roleLabels[state.staff.role] || state.staff.role)}</span></div>
        <button class="menu-item" role="menuitem" data-page="account">${I.account()}<span>Akun saya</span></button>
        <button class="menu-item" role="menuitem" data-action="refresh">${I.refresh()}<span>Muat ulang data</span></button>
        <div class="menu-sep" role="separator"></div>
        <button class="menu-item is-danger" role="menuitem" data-action="sign-out">${I.logout()}<span>Keluar</span></button>
      </div></div>`;
  }

  function shell(content, title, subtitle = "", actions = "") {
    const items = navItems();
    app.innerHTML = `<div class="layout">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">Marvell</div><small>ADMIN</small></div>
        <nav class="nav" aria-label="Navigasi utama">${items.map(navButton).join("")}</nav>
        <div class="sidebar-foot">${userMenu("mv-user-menu", "from-bottom")}</div>
      </aside>
      <main class="main">
        <div class="mobile-bar">
          <div class="brand-mark">Marvell</div>
          <div class="mv-menu">
            <button class="icon-btn" data-menu="mv-user-menu-m" aria-haspopup="menu" aria-expanded="false"
              aria-controls="mv-user-menu-m" aria-label="Menu akun">${I.account()}</button>
            <div class="menu-panel from-top-right" id="mv-user-menu-m" role="menu" hidden>
              <div class="menu-head"><strong>${esc(state.staff.display_name)}</strong>
                <span>${esc(roleLabels[state.staff.role] || state.staff.role)}</span></div>
              <button class="menu-item" role="menuitem" data-page="account">${I.account()}<span>Akun saya</span></button>
              <button class="menu-item" role="menuitem" data-action="refresh">${I.refresh()}<span>Muat ulang data</span></button>
              <div class="menu-sep" role="separator"></div>
              <button class="menu-item is-danger" role="menuitem" data-action="sign-out">${I.logout()}<span>Keluar</span></button>
            </div>
          </div>
        </div>
        <header class="topbar">
          <div class="topbar-title"><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>
          <div class="topbar-actions">${actions}
            <button class="secondary" data-action="refresh">${I.refresh()}<span>Muat Ulang</span></button></div>
        </header>
        <div class="main-body view-enter">${content}</div>
      </main></div>
      <nav class="mobile-nav" aria-label="Navigasi ponsel">${items.slice(0, 4).map(navButton).join("")}</nav>`;
    afterRender();
  }

  /* ─── Queue ────────────────────────────────────────────────────────────── */

  function visibleOrders() {
    const needle = state.filter.trim().toLowerCase();
    if (!needle) return state.orders;
    return state.orders.filter((order) => {
      const haystack = [order.reference, order.recipient_name, order.customer_name,
        ...(order.items || []).map((item) => item.name)].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }

  function orderRow(order) {
    const item = order.items?.[0] || {};
    const extra = (order.items?.length || 0) - 1;
    const due = dueLabel(order.delivery_date);
    return `<button class="order-row${state.order?.id === order.id ? " selected" : ""}${order.needs_attention ? " needs-attention" : ""}"
      data-order-id="${esc(order.id)}">
      ${thumb(item.image)}
      <span class="row-body">
        <span class="row-title"><span class="row-ref">${esc(order.reference)}</span>
          <span class="tag ${order.needs_attention ? "attention" : queueTone(order.fulfillment_state)}">${order.needs_attention ? "Perlu Tindakan" : esc(status(order.fulfillment_state))}</span>
        </span>
        <span class="row-sub">${esc(item.name || "Pesanan")}${item.quantity ? ` × ${esc(item.quantity)}` : ""}${extra > 0 ? ` +${extra} lainnya` : ""}</span>
        <span class="row-sub${due.soon ? " is-soon" : ""}">${I.clock()}${esc(due.text)} · ${esc(windowLabel(order.delivery_time_window))}</span>
      </span>
      ${I.chevronRight()}</button>`;
  }

  const queueTone = (fulfillment) => fulfillment === "delivered" ? "ok"
    : fulfillment === "new" ? "brand"
    : fulfillment === "out_for_delivery" || fulfillment === "ready" ? "info" : "";

  function renderQueueList() {
    const host = app.querySelector(".queue-list");
    const count = app.querySelector(".queue-count");
    if (!host) return;
    const rows = visibleOrders();
    host.className = "queue-list stagger";
    host.innerHTML = rows.length
      ? rows.map(orderRow).join("")
      : emptyState("search", "Tidak ada yang cocok",
        state.filter ? "Ubah atau kosongkan kata kunci pencarian." : "Tidak ada pesanan di antrian ini.");
    if (count) {
      count.textContent = state.filter
        ? `${rows.length} dari ${state.orders.length} pesanan`
        : `${state.orders.length} pesanan`;
    }
  }

  function actionFor(order) {
    if (!order || order.needs_attention) return "";
    const role = state.staff.role;
    const a = order.fulfillment_state;
    if (a === "new" && ["owner", "store_admin"].includes(role)) return button("Konfirmasi Pesanan", "acknowledge");
    if (a === "acknowledged" && role !== "delivery") return button("Mulai Siapkan", "start_preparing");
    if (a === "preparing" && role !== "delivery") return button("Tandai Siap Dikirim", "mark_ready");
    if (a === "ready" && order.delivery_method === "delivery" && role !== "florist") return button("Mulai Pengiriman", "start_delivery");
    if ((a === "out_for_delivery" || (a === "ready" && order.delivery_method === "pickup")) && role !== "florist") {
      return button("Tandai Selesai", "complete");
    }
    return "";
  }

  function fact(label, value, cls = "") {
    if (value === null || value === undefined || value === "") return "";
    return `<div><dt>${esc(label)}</dt><dd${cls ? ` class="${cls}"` : ""}>${esc(value)}</dd></div>`;
  }

  function cardMarkup(order, id = "") {
    const sender = order.card_anonymous ? "" : order.card_sender;
    const emoji = /[\p{Extended_Pictographic}]/u.test(order.card_message || "");
    return `<div ${id ? `id="${id}"` : ""} class="card-preview" aria-label="Pratinjau kartu ucapan">
      <div class="card-brand">Marvell Florist</div><div class="card-message">${esc(order.card_message)}</div>
      <div class="card-from">${sender ? `Dari: ${esc(sender)}` : ""}</div><div class="card-reference">${esc(order.reference)}</div></div>
      ${emoji && !id ? `<p class="card-warning">${I.alert()}<span>Pesan berisi emoji atau simbol. Periksa pratinjau cetak sebelum mencetak.</span></p>` : ""}`;
  }

  function detailView(order) {
    if (!order) {
      return emptyState("flower", "Belum ada pesanan dipilih",
        "Pilih pesanan di daftar untuk melihat rincian dan tindakan berikutnya.");
    }
    const role = state.staff.role;
    const manager = ["owner", "store_admin"].includes(role);
    const cardAccess = role !== "delivery" && !order.needs_attention && Boolean(order.card_message);
    const nextAction = actionFor(order);

    const items = (order.items || []).map((item) => `<div class="product-line">${thumb(item.image, "thumb-sm")}
      <div class="product-line-body"><strong>${esc(item.name)} × ${esc(item.quantity)}</strong>
      <small>${esc(item.sku)}</small>
      ${item.instructions ? `<p>${esc(item.instructions)}</p>` : ""}
      ${item.options && Object.keys(item.options).length
        ? `<p>${esc(Object.entries(item.options).map(([key, value]) => `${key}: ${value}`).join(" · "))}</p>` : ""}
      </div></div>`).join("");

    return `<article class="detail" id="order-detail">
      <div class="detail-head">
        <div class="detail-head-text"><h2>${esc(order.reference)}</h2>
          <div class="tag-row">
            <span class="tag ${order.needs_attention ? "attention" : queueTone(order.fulfillment_state)}">${order.needs_attention ? "Perlu Tindakan" : esc(status(order.fulfillment_state))}</span>
            <span class="tag ${["capture", "settlement"].includes(order.payment_status) ? "paid" : "warn"}">${esc(status(order.payment_status))}</span>
            ${order.delivery_method === "pickup" ? `<span class="tag">Ambil Sendiri</span>` : ""}
          </div>
        </div>
        ${nextAction}
      </div>
      <div class="detail-scroll">
        ${order.needs_attention ? `<div class="detail-section"><div class="banner">${I.alert()}
          <div class="banner-body"><strong>Perlu Tindakan</strong>
          <p>${order.stock_exception
            ? "Pembayaran diterima setelah reservasi stok dilepas. Periksa ketersediaan dan putuskan tindak lanjut sebelum menyiapkan pesanan."
            : "Pesanan ini memerlukan pemeriksaan."}</p>
          ${manager ? `<div class="actions">${button("Periksa & Alokasikan Stok", "resolve_attention")}</div>` : ""}
          </div></div></div>` : ""}

        <section class="detail-section"><h3>Produk</h3>${items || `<p class="muted">Tidak ada baris produk.</p>`}</section>

        ${manager ? `<section class="detail-section"><h3>Pembeli</h3><dl class="facts">
          ${fact("Nama", order.customer_name)}${fact("Email", order.email)}${fact("Telepon", order.phone)}</dl></section>` : ""}

        <section class="detail-section"><h3>Penerima &amp; Pengiriman</h3><dl class="facts">
          ${fact("Penerima", order.recipient_name, "is-strong")}${fact("Telepon penerima", order.recipient_phone)}
          ${fact("Tanggal", date(order.delivery_date))}${fact("Waktu", windowLabel(order.delivery_time_window))}
          ${fact("Alamat", order.delivery_address)}${fact("Gedung/Unit", order.delivery_unit)}
          ${fact("Petunjuk", order.delivery_instructions)}
          ${manager && order.delivery_method === "delivery" ? fact("Petugas",
            order.delivery_staff?.find((s) => s.user_id === order.delivery_assignee)?.display_name || "Belum ditugaskan") : ""}</dl>
          ${manager ? `<div class="actions"><button class="secondary btn-sm" data-action="change_delivery">${I.calendar()}<span>Ubah Waktu Pengiriman</span></button></div>
            ${order.delivery_method === "delivery" ? order.delivery_staff?.length
              ? `<form id="assign-delivery-form" class="form-foot">
                  <label class="field"><span>Petugas pengiriman</span>
                  <select name="assignee_id" data-enhance required>${order.delivery_staff.map((s) =>
                    `<option value="${esc(s.user_id)}"${s.user_id === order.delivery_assignee ? " selected" : ""}>${esc(s.display_name)}</option>`).join("")}</select></label>
                  <button class="secondary">Simpan Petugas</button></form>`
              : `<p class="muted">Belum ada staf pengiriman aktif.</p>` : ""}` : ""}</section>

        ${cardAccess ? `<section class="detail-section"><h3>Kartu Ucapan</h3>
          <div class="tag-row"><span class="tag ${order.card_printed_at ? "ok" : "warn"}">${order.card_printed_at ? "Sudah Dicetak" : "Belum Dicetak"}</span>
          ${order.card_reprint_count ? `<span class="tag">Cetak ulang ${esc(order.card_reprint_count)}×</span>` : ""}</div>
          <div class="actions">
            <button class="secondary btn-sm" data-action="preview-card">${I.eye()}<span>Lihat Kartu</span></button>
            <button class="primary btn-sm" data-action="print-card">${I.printer()}<span>${order.card_printed_at ? "Cetak Ulang" : "Cetak Kartu"}</span></button>
            ${state.pendingPrint === order.id ? `<button class="secondary btn-sm" data-action="confirm-print">${I.check()}<span>Sudah Dicetak</span></button>` : ""}
          </div>
          <div id="card-preview-area" hidden>${cardMarkup(order)}</div></section>` : ""}

        ${manager ? `<section class="detail-section"><h3>Pembayaran</h3><dl class="facts">
          ${fact("Status", status(order.payment_status))}${fact("Referensi iPaymu", order.payment_reference, "is-mono")}
          ${fact("Produk", money(order.subtotal_idr))}${fact("Pengiriman", money(order.delivery_fee_idr))}</dl>
          <div class="total-line"><span>Total dibayar</span><strong>${money(order.total_idr)}</strong></div></section>` : ""}

        ${order.history?.length ? `<section class="detail-section"><h3>Riwayat</h3><div class="history">${order.history.map((entry) =>
          `<div class="history-item"><strong>${esc(eventLabels[entry.event_type] || "Perubahan Pesanan")}</strong>
          <time>${esc(new Date(entry.created_at).toLocaleString("id-ID"))}</time>
          ${entry.note ? `<p>${esc(entry.note)}</p>` : ""}</div>`).join("")}</div></section>` : ""}
      </div>
    </article>`;
  }

  function queueView() {
    const role = state.staff.role;
    const title = state.page === "home" ? "Beranda"
      : state.page === "cards" ? "Kartu Ucapan"
      : state.page === "delivery" ? "Pengiriman" : "Pesanan";
    const subtitle = state.page === "home"
      ? "Apa yang harus dikerjakan sekarang."
      : "Pilih pesanan, periksa rincian, lalu lakukan tindakan berikutnya.";

    if (state.loading) { shell(skeletonQueue(), title, subtitle); return; }

    const tabs = role === "delivery"
      ? [["ready", "Siap Dikirim"], ["delivery", "Dalam Pengiriman"], ["all", "Semua"]]
      : role === "florist"
        ? [["open", "Semua Tugas"], ["preparing", "Sedang Disiapkan"], ["ready", "Siap Dikirim"], ["all", "Semua"]]
        : [["open", "Semua Tugas"], ["attention", "Perlu Tindakan"], ["new", "Pesanan Baru"], ["today", "Hari Ini"],
          ["preparing", "Sedang Disiapkan"], ["ready", "Siap Dikirim"], ["delivery", "Dalam Pengiriman"]];
    const showTabs = ["home", "orders"].includes(state.page);
    const rows = visibleOrders();

    const content = `
      <div class="queue-bar">
        ${showTabs ? `<div class="queue-tabs" role="tablist">${tabs.map(([key, label]) =>
          `<button class="queue-tab${state.queue === key ? " active" : ""}" role="tab"
            aria-selected="${String(state.queue === key)}" data-queue="${key}">${label}${state.queue === key && state.orders.length ? `<em>${state.orders.length}</em>` : ""}</button>`).join("")}</div>` : ""}
        <div class="queue-search">${I.search()}
          <input id="queue-filter" type="search" placeholder="Cari pesanan…"
            aria-label="Saring pesanan" value="${esc(state.filter)}"></div>
      </div>
      ${state.ordersTruncated ? `<p class="notice">${I.info()}<span>Daftar menampilkan 100 pesanan pertama. Saring antrian untuk melihat lainnya.</span></p>` : ""}
      <div class="work-grid">
        <section aria-label="Daftar pesanan">
          <p class="queue-count">${state.filter ? `${rows.length} dari ${state.orders.length} pesanan` : `${state.orders.length} pesanan`}</p>
          <div class="queue-list stagger">${rows.length ? rows.map(orderRow).join("")
            : emptyState("inbox", "Antrian kosong", "Tidak ada pesanan di antrian ini.")}</div>
        </section>
        ${detailView(state.order)}
      </div>`;
    shell(content, title, subtitle);
  }

  /* ─── Other pages ──────────────────────────────────────────────────────── */

  function stockView() {
    if (state.loading) { shell(skeletonList(5), "Produk & Stok", "Memuat…"); return; }
    const manager = ["owner", "store_admin"].includes(state.staff.role);
    const editable = manager && (state.staff.role === "owner" || state.staff.can_manage_stock);
    const rows = state.stock.map((product) => {
      const available = Number(product.available_quantity || 0);
      const total = Number(product.stock_quantity || 0);
      const pct = total > 0 ? Math.round((available / total) * 100) : 0;
      const tone = available === 0 ? "is-out" : pct <= 25 ? "is-low" : "";
      return `<div class="stock-row">${thumb(product.image, "thumb-sm")}
        <div class="stock-body"><strong>${esc(product.name)}</strong><small>${esc(product.sku)}</small>
          <div class="stock-numbers"><span>Tersedia <b>${esc(available)}</b></span>
          <span>Stok fisik <b>${esc(total)}</b></span><span>Dipesan <b>${esc(product.reserved_quantity)}</b></span>
          ${product.price_idr ? `<span>${money(product.price_idr)}</span>` : ""}</div>
          <div class="meter"><span class="meter-fill ${tone}" data-pct="${pct}"></span></div>
        </div>
        ${editable ? `<button class="secondary btn-sm" data-stock-sku="${esc(product.sku)}">${I.edit()}<span>Ubah Stok</span></button>` : ""}
      </div>`;
    }).join("");

    const outOfStock = state.stock.filter((p) => Number(p.available_quantity || 0) === 0).length;
    const summary = state.stock.length ? `<div class="stat-grid">
      <div class="stat"><span class="stat-label">${I.stock()}Produk aktif</span>
        <div class="stat-value">${state.stock.filter((p) => p.active !== false).length}</div></div>
      <div class="stat${outOfStock ? " is-alert" : ""}"><span class="stat-label">${I.alert()}Stok habis</span>
        <div class="stat-value">${outOfStock}</div></div>
      <div class="stat"><span class="stat-label">${I.orders()}Unit dipesan</span>
        <div class="stat-value">${state.stock.reduce((sum, p) => sum + Number(p.reserved_quantity || 0), 0)}</div></div>
    </div>` : "";

    shell(`${summary}<div class="stock-list stagger">${rows
      || emptyState("stock", "Belum ada produk", "Katalog belum memuat produk yang dapat dikelola.")}</div>`,
      "Produk & Stok", "Jumlah tersedia sudah dikurangi reservasi pesanan.");
  }

  function rankPanel(title, rows, key) {
    if (!rows?.length) return `<section class="panel"><h2>${esc(title)}</h2><p class="muted">Belum ada data.</p></section>`;
    return `<section class="panel"><h2>${esc(title)}</h2><div class="rank-list">${rows.map((row, index) => `
      <div class="rank-row"><span class="rank-index">${index + 1}</span>
        <span class="rank-name">${esc(row[key])}
          <small>${esc(row.units ?? row.orders)} ${row.units === undefined ? "pesanan" : "unit"}</small></span>
        <span class="rank-value">${money(row.product_sales_idr ?? row.paid_order_value_idr)}</span></div>`).join("")}</div></section>`;
  }

  function salesView() {
    const owner = state.staff.role === "owner";
    const periodSelect = owner ? `<label class="field" for="sales-period">
      <span class="sr-only">Periode</span>
      <select id="sales-period" data-enhance>
        <option value="today"${state.salesPeriod === "today" ? " selected" : ""}>Hari Ini</option>
        <option value="7d"${state.salesPeriod === "7d" ? " selected" : ""}>7 Hari</option>
        <option value="30d"${state.salesPeriod === "30d" ? " selected" : ""}>30 Hari</option>
      </select></label>` : "";

    if (state.loading) {
      shell(skeletonStats(), "Penjualan", "Ringkasan pesanan online yang sudah lunas; bukan laporan akuntansi.", periodSelect);
      return;
    }
    const s = state.sales || {};
    const content = `
      <div class="stat-grid stagger">
        <div class="stat"><span class="stat-label">${I.money()}Nilai pesanan lunas</span>
          <div class="stat-value is-money">${money(s.paid_order_value_idr)}</div>
          <p class="stat-note">${esc(s.paid_orders || 0)} pesanan lunas</p></div>
        <div class="stat"><span class="stat-label">${I.check()}Selesai</span>
          <div class="stat-value">${esc(s.completed_orders || 0)}</div>
          <p class="stat-note">Sudah diterima penerima</p></div>
        <div class="stat"><span class="stat-label">${I.clock()}Diproses</span>
          <div class="stat-value">${esc(s.processing_orders || 0)}</div>
          <p class="stat-note">Masih dalam alur kerja</p></div>
        ${owner ? `<div class="stat"><span class="stat-label">${I.sales()}Rata-rata per pesanan</span>
          <div class="stat-value is-money">${money(s.average_order_value_idr)}</div>
          <p class="stat-note">${esc(s.units_per_order ?? 0)} unit per pesanan</p></div>` : ""}
      </div>
      ${s.truncated ? `<p class="notice">${I.alert()}<span>Data melebihi 5.000 pesanan. Ringkasan ini belum lengkap.</span></p>` : ""}
      ${owner ? `<section class="panel"><h2>Rincian Pesanan Online</h2>
        <dl class="facts">
          ${fact("Penjualan produk", money(s.product_sales_idr))}
          ${fact("Biaya pengiriman", money(s.delivery_income_idr))}
          ${fact("Dana dikembalikan", `${s.refunded_orders || 0} pesanan`)}
        </dl>
        <p class="stat-note">Nilai pengembalian parsial dan biaya pembayaran belum tersedia.</p></section>
        ${rankPanel("Produk", s.products, "name")}
        ${s.attribution_available
          ? `${rankPanel("Kanal", s.channels, "name")}${rankPanel("Kampanye", s.campaigns, "name")}`
          : `<section class="panel"><h2>Kanal &amp; Kampanye</h2><p class="muted">Data kanal dan kampanye belum tersedia.</p></section>`}` : ""}`;
    shell(content, "Penjualan", "Ringkasan pesanan online yang sudah lunas; bukan laporan akuntansi.", periodSelect);
  }

  function noticesView() {
    if (state.loading) { shell(skeletonList(3), "Notifikasi", "Memuat…"); return; }
    const content = state.notices.length
      ? `<div class="simple-list stagger">${state.notices.map((notice) => {
          const attention = notice.event_type === "paid_stock_exception";
          return `<div class="list-card"><div class="tag-row">
            <span class="tag ${attention ? "attention" : "brand"}">${attention ? "Perlu Tindakan" : "Pesanan Baru"}</span>
            ${notice.escalated_at ? `<span class="tag warn">Dieskalasi</span>` : ""}
            <span class="tag">${esc(new Date(notice.created_at).toLocaleString("id-ID"))}</span></div>
            <p>Pembayaran telah dikonfirmasi. Pesanan belum diakui.</p>
            <div class="actions"><button class="secondary btn-sm" data-order-id="${esc(notice.order_id)}"><span>Buka Pesanan</span>${I.chevronRight()}</button></div>
          </div>`;
        }).join("")}</div>`
      : emptyState("check", "Semua sudah ditangani", "Tidak ada notifikasi yang menunggu tindakan.");
    shell(content, "Notifikasi", "Pesanan tetap terlihat sampai dikonfirmasi.");
  }

  function accountView() {
    shell(`<section class="panel">
      <div class="staff-card-head">
        <span class="user-avatar" aria-hidden="true">${esc(initials(state.staff.display_name))}</span>
        <div><strong>${esc(state.staff.display_name)}</strong>
        <span>${esc(roleLabels[state.staff.role] || state.staff.role)}</span></div>
      </div>
      <dl class="facts">
        ${fact("Akses", roleLabels[state.staff.role] || state.staff.role)}
        ${fact("Ubah stok", state.staff.can_manage_stock ? "Diizinkan" : "Tidak diizinkan")}
      </dl>
      <div class="actions"><button class="secondary" data-action="sign-out">${I.logout()}<span>Keluar</span></button></div>
    </section>`, "Akun", "Sesi Marvell Admin Anda.");
  }

  async function loadStaffArea() {
    const host = document.getElementById("staff-area");
    if (!host) return;
    host.innerHTML = skeletonList(3);
    try {
      const rows = (await api("/api/admin/staff")).staff || [];
      host.innerHTML = `
        <section class="panel">
          <h2>Undang Staf</h2>
          <form id="staff-invite-form">
            <div class="form-grid">
              <label class="field"><span>Nama staf</span><input name="display_name" maxlength="100" required></label>
              <label class="field"><span>Email</span><input name="email" type="email" required></label>
              <label class="field"><span>Peran</span>
                <select name="role" data-enhance>${["store_admin", "florist", "delivery", "owner"].map((role) =>
                  `<option value="${role}">${roleLabels[role]}</option>`).join("")}</select></label>
              <label class="field"><span>Kode autentikator Anda</span>
                <input name="mfa_code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required></label>
            </div>
            <button class="primary">Kirim Undangan</button>
          </form>
        </section>
        <section class="panel"><h2>Anggota Tim</h2>
          <div class="simple-list stagger">${rows.map((member) => `
            <div class="list-card staff-card">
              <div class="staff-card-head">
                <span class="user-avatar" aria-hidden="true">${esc(initials(member.display_name))}</span>
                <div><strong>${esc(member.display_name)}</strong><span>${esc(member.email)}</span></div>
                <span class="tag ${member.active ? "ok" : ""}">${member.active ? "Aktif" : "Nonaktif"}</span>
              </div>
              <form class="staff-update-form" data-user-id="${esc(member.user_id)}">
                <div class="form-grid">
                  <label class="field"><span>Peran</span>
                    <select name="role" data-enhance>${["owner", "store_admin", "florist", "delivery"].map((role) =>
                      `<option value="${role}"${member.role === role ? " selected" : ""}>${roleLabels[role]}</option>`).join("")}</select></label>
                  <div class="field"><span class="field-label">Izin</span>
                    <label class="check"><input type="checkbox" name="active"${member.active ? " checked" : ""}> Akun aktif</label>
                    <label class="check"><input type="checkbox" name="notify_paid_orders"${member.notify_paid_orders ? " checked" : ""}> Email pesanan baru</label>
                    <label class="check"><input type="checkbox" name="can_manage_stock"${member.can_manage_stock ? " checked" : ""}> Boleh mengubah stok</label>
                  </div>
                </div>
                <div class="form-foot">
                  <label class="field"><span>Kode autentikator Anda</span>
                    <input name="mfa_code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required></label>
                  <button class="secondary">Simpan Akses</button>
                </div>
              </form>
            </div>`).join("")}</div>
        </section>`;
      enhanceSelects(host);
    } catch (error) {
      host.innerHTML = `<div class="empty">${I.alert()}<strong>Daftar staf belum dapat dimuat</strong>
        <p>${esc(error.message)}</p></div>`;
    }
  }

  /* ─── Render ───────────────────────────────────────────────────────────── */

  function render() {
    if (state.auth !== "ready") return authView();
    if (["home", "orders", "cards", "delivery"].includes(state.page)) return queueView();
    if (state.page === "stock") return stockView();
    if (state.page === "sales") return salesView();
    if (state.page === "notices") return noticesView();
    if (state.page === "account") return accountView();
    if (state.page === "staff") {
      shell(`<div id="staff-area"></div>`, "Staf", "Hanya pemilik dapat mengubah akses staf.");
      loadStaffArea();
      return;
    }
    return accountView();
  }

  /**
   * Everything that cannot be expressed in the markup string, because the CSP
   * forbids a style="" attribute and because a fresh innerHTML has no state.
   */
  function afterRender() {
    enhanceSelects(app);
    app.querySelectorAll("img.thumb").forEach((image) => {
      image.addEventListener("error", () => {
        const placeholder = document.createElement("span");
        placeholder.className = image.className;
        placeholder.setAttribute("aria-hidden", "true");
        image.replaceWith(placeholder);
      }, { once: true });
    });
    app.querySelectorAll(".meter-fill[data-pct]").forEach((bar) => {
      const pct = Math.max(0, Math.min(100, Number(bar.dataset.pct) || 0));
      window.requestAnimationFrame(() => bar.style.setProperty("width", `${pct}%`));
    });
  }

  /* ─── Data loading ─────────────────────────────────────────────────────── */

  async function loadQueue() {
    const q = state.page === "cards" ? "cards" : state.page === "delivery" ? "delivery" : state.queue;
    const data = await api(`/api/admin/orders?queue=${encodeURIComponent(q)}`);
    state.orders = data.orders || [];
    state.ordersTruncated = data.truncated === true;
    const requested = new URL(location.href).searchParams.get("id");
    if (requested && !state.order) await openOrder(requested, false);
    else render();
  }

  async function openOrder(id, push = true) {
    const data = await api(`/api/admin/orders/${encodeURIComponent(id)}`);
    state.order = data.order;
    if (push) history.pushState({}, "", `/pesanan?id=${encodeURIComponent(id)}`);
    render();
    if (matchMedia("(max-width:960px)").matches) {
      document.getElementById("order-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function loadNoticeCount() {
    if (!["owner", "store_admin"].includes(state.staff?.role)) return;
    try {
      const data = await api("/api/admin/notifications");
      state.noticeCount = (data.notifications || []).length;
    } catch (_error) {
      // A badge is not worth surfacing an error for.
    }
  }

  /** Writes state.noticeCount into the rendered nav without a full re-render. */
  function paintNoticeBadge() {
    app.querySelectorAll('[data-page="notices"]').forEach((link) => {
      const existing = link.querySelector(".nav-count");
      if (!state.noticeCount) { existing?.remove(); return; }
      const text = state.noticeCount > 99 ? "99+" : String(state.noticeCount);
      if (existing) { existing.textContent = text; return; }
      const badge = document.createElement("span");
      badge.className = "nav-count is-alert";
      badge.textContent = text;
      link.appendChild(badge);
    });
  }

  async function loadPage() {
    state.loading = true;
    render();
    try {
      if (["home", "orders", "cards", "delivery"].includes(state.page)) {
        state.loading = false;
        await loadQueue();
      } else {
        if (state.page === "stock") state.stock = (await api("/api/admin/stock")).products || [];
        if (state.page === "sales") state.sales = await api(`/api/admin/sales?period=${state.salesPeriod}`);
        if (state.page === "notices") {
          state.notices = (await api("/api/admin/notifications")).notifications || [];
          state.noticeCount = state.notices.length;
        }
        state.loading = false;
        render();
      }
    } catch (error) {
      state.loading = false;
      render();
      throw error;
    }
  }

  async function refreshSession() {
    const data = await api("/api/admin/session");
    if (!data.signed_in) { state.auth = "email"; state.staff = null; render(); return; }
    state.staff = data.staff;
    if (data.mfa_required) {
      state.auth = "mfa";
      state.factors = (await api("/api/admin/mfa")).factors || [];
      render(); return;
    }
    state.auth = "ready";
    state.message = "";
    if (location.pathname.startsWith("/pesanan")) state.page = "orders";
    if (state.staff.role === "delivery") state.queue = "ready";
    else state.queue = "open";
    await loadPage();
    loadNoticeCount().then(paintNoticeBadge);
  }

  async function startEnrollment(target) {
    target.disabled = true;
    target.classList.add("is-busy");
    try {
      state.enrollment = await api("/api/admin/mfa/enroll", { method: "POST", body: {} });
      state.auth = "enroll";
      render();
    } catch (error) {
      if (error.code === "mfa_sudah_aktif") await refreshSession();
      else throw error;
    }
  }

  async function changePage(page) {
    state.page = page;
    state.order = null;
    state.filter = "";
    state.message = "";
    history.pushState({}, "", "/");
    if (page === "home") state.queue = state.staff.role === "delivery" ? "ready" : "open";
    if (page === "orders") state.queue = state.staff.role === "delivery" ? "ready"
      : state.staff.role === "florist" ? "preparing" : "new";
    await loadPage();
  }

  /* ─── Order actions ────────────────────────────────────────────────────── */

  const actionPrompts = {
    acknowledge: { title: "Konfirmasi pesanan", message: "Pesanan ditandai sudah diterima dan masuk antrian kerja.", confirmLabel: "Konfirmasi", glyph: "check" },
    start_preparing: { title: "Mulai menyiapkan", message: "Pesanan ini pindah ke antrian sedang disiapkan.", confirmLabel: "Mulai Siapkan", glyph: "flower" },
    mark_ready: { title: "Tandai siap dikirim", message: "Rangkaian selesai dan siap diambil petugas pengiriman.", confirmLabel: "Tandai Siap", glyph: "check" },
    start_delivery: { title: "Mulai pengiriman", message: "Pesanan ditandai sedang dalam perjalanan ke penerima.", confirmLabel: "Mulai Kirim", glyph: "delivery" },
    complete: { title: "Tandai selesai", message: "Pesanan ditandai sudah diterima penerima. Tindakan ini menutup alur kerja.", confirmLabel: "Tandai Selesai", glyph: "check" }
  };

  async function orderAction(action) {
    const order = state.order;
    if (!order) return;
    const config = actionPrompts[action] || { title: "Lanjutkan tindakan ini?", confirmLabel: "Lanjutkan" };
    const reference = `${order.reference} · ${order.recipient_name || "Penerima"}`;
    if (!await confirmModal({ ...config, message: `${reference}. ${config.message || ""}` })) return;
    await api(`/api/admin/orders/${order.id}/action`, { method: "POST",
      body: { action, expected_state: order.fulfillment_state } });
    toast(`${config.title} — ${order.reference}.`, "ok");
    await loadQueue();
    await openOrder(order.id, false);
    loadNoticeCount().then(paintNoticeBadge);
  }

  /* ─── Printing ─────────────────────────────────────────────────────────── */

  function preparePrintCard(order) {
    document.getElementById("print-card")?.remove();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = cardMarkup(order, "print-card");
    const card = wrapper.querySelector("#print-card");
    document.body.appendChild(card);
    card.classList.add("measure-card");
    const message = card.querySelector(".card-message");
    if (message.scrollHeight > message.clientHeight) message.classList.add("compact");
    if (message.scrollHeight > message.clientHeight) message.classList.add("tiny");
    if (message.scrollHeight > message.clientHeight) {
      card.remove();
      throw new Error("Pesan tidak muat pada ukuran kartu. Periksa pengaturan kartu sebelum mencetak.");
    }
    card.classList.remove("measure-card");
  }

  async function printCard() {
    const order = state.order;
    if (!order?.card_message) return;
    preparePrintCard(order);
    await api(`/api/admin/orders/${order.id}/card`, { method: "POST",
      body: { action: "request", request_id: crypto.randomUUID() } });
    state.pendingPrint = order.id;
    render();
    window.print();
  }

  /* ─── Events ───────────────────────────────────────────────────────────── */

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.closest("#mv-modal")) return;
    event.preventDefault();
    state.message = "";
    const submitter = form.querySelector('button[type="submit"], button:not([type="button"])');
    submitter?.classList.add("is-busy");
    const values = Object.fromEntries(new FormData(form));
    try {
      if (form.id === "email-form") {
        state.email = String(values.email || "").trim();
        await api("/api/admin/sign-in", { method: "POST", body: { email: state.email } });
        state.auth = "code";
      } else if (form.id === "code-form") {
        await api("/api/admin/verify", { method: "POST", body: { email: state.email, code: values.code } });
        await refreshSession(); return;
      } else if (form.id === "mfa-form") {
        await api("/api/admin/mfa/verify", { method: "POST",
          body: { factor_id: values.factor_id, code: values.code } });
        await refreshSession(); return;
      } else if (form.id === "staff-invite-form") {
        const result = await api("/api/admin/staff", { method: "POST", body: {
          action: "invite", display_name: values.display_name, email: values.email,
          role: values.role, mfa_code: values.mfa_code
        } });
        toast(result.mail_sent ? "Undangan staf dikirim."
          : "Akun staf dibuat, tetapi email undangan belum terkirim.", result.mail_sent ? "ok" : "warn");
        loadStaffArea(); return;
      } else if (form.classList.contains("staff-update-form")) {
        await api("/api/admin/staff", { method: "POST", body: {
          action: "update", user_id: form.dataset.userId, role: values.role,
          active: values.active === "on", notify_paid_orders: values.notify_paid_orders === "on",
          can_manage_stock: values.can_manage_stock === "on", mfa_code: values.mfa_code
        } });
        toast("Akses staf diperbarui.", "ok");
        loadStaffArea(); return;
      } else if (form.id === "assign-delivery-form") {
        await api(`/api/admin/orders/${state.order.id}/action`, { method: "POST",
          body: { action: "assign_delivery", assignee_id: values.assignee_id } });
        toast("Petugas pengiriman disimpan.", "ok");
        await openOrder(state.order.id, false);
        return;
      }
      render();
    } catch (error) {
      submitter?.classList.remove("is-busy");
      if (state.auth === "ready") toast(error.message, "error");
      else { state.message = error.message; render(); }
    }
  });

  // The sales period is the one native change the workspace listens for; the
  // enhanced listbox re-dispatches it so this keeps working unchanged.
  document.addEventListener("change", async (event) => {
    if (event.target?.id !== "sales-period") return;
    state.salesPeriod = event.target.value;
    try { await loadPage(); } catch (error) { toast(error.message, "error"); }
  });

  // Filtering redraws only the list, so the search field keeps focus and the
  // caret position while you type.
  document.addEventListener("input", (event) => {
    if (event.target?.id !== "queue-filter") return;
    state.filter = event.target.value;
    renderQueueList();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") dismissOverlays(null);
  });

  document.addEventListener("click", async (event) => {
    dismissOverlays(event.target);

    const target = event.target.closest("button");
    if (!target) return;
    if (target.closest("#mv-modal") || target.closest("#mv-toasts") || target.closest(".mv-select")) return;

    if (target.dataset.menu) { toggleMenu(target); return; }
    if (target.classList.contains("menu-item")) document.querySelectorAll(".mv-menu.open").forEach(closeMenu);

    const page = target.dataset.page;
    const queue = target.dataset.queue;
    const id = target.dataset.orderId;
    const stockSku = target.dataset.stockSku;
    const action = target.dataset.action;
    state.message = "";

    try {
      if (page) await changePage(page);
      else if (queue) { state.queue = queue; state.order = null; state.filter = ""; await loadQueue(); }
      else if (id) { state.page = "orders"; await openOrder(id); }

      else if (stockSku) {
        const current = state.stock.find((product) => product.sku === stockSku);
        const values = await openModal({
          title: "Ubah stok fisik",
          message: `${current?.name || stockSku}. Jumlah tersedia dihitung ulang dari stok fisik dikurangi reservasi.`,
          glyph: "stock",
          confirmLabel: "Simpan Stok",
          fields: [{ type: "stepper", name: "quantity", label: "Jumlah stok fisik",
            value: current?.stock_quantity ?? 0,
            hint: `Saat ini dipesan ${current?.reserved_quantity ?? 0} unit. Stok fisik tidak boleh kurang dari jumlah itu.` }]
        });
        if (!values) return;
        const quantity = Number(values.quantity);
        if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("Masukkan jumlah stok yang valid.");
        await api("/api/admin/stock", { method: "POST", body: { sku: stockSku, quantity } });
        toast(`Stok ${stockSku} disimpan.`, "ok");
        await loadPage();
      }

      else if (action === "back-email") { state.auth = "email"; state.message = ""; render(); }
      else if (action === "enroll" || action === "restart-enroll") await startEnrollment(target);

      else if (action === "sign-out") {
        if (!await confirmModal({ title: "Keluar dari Marvell Admin?",
          message: "Anda perlu memasukkan kode masuk dan verifikasi dua langkah lagi.",
          glyph: "logout", tone: "alert", danger: true, confirmLabel: "Keluar" })) return;
        await api("/api/admin/sign-out", { method: "POST", body: {} });
        state.auth = "email"; state.staff = null; state.order = null; state.message = ""; render();
      }

      else if (action === "refresh") {
        target.classList.add("is-busy");
        await loadPage();
        loadNoticeCount().then(paintNoticeBadge);
      }

      else if (["acknowledge", "start_preparing", "mark_ready", "start_delivery", "complete"].includes(action)) {
        await orderAction(action);
      }

      else if (action === "resolve_attention") {
        const values = await openModal({
          title: "Periksa & alokasikan stok",
          message: "Saat disimpan, seluruh stok pesanan ini akan dialokasikan. Pastikan stok fisik benar-benar tersedia.",
          glyph: "alert", tone: "warn", confirmLabel: "Alokasikan Stok", wide: true,
          fields: [{ type: "textarea", name: "note", label: "Catatan pemeriksaan", required: true, maxlength: 500,
            placeholder: "Contoh: stok fisik dicek di gudang, 2 batang mawar merah tersedia.",
            hint: "Catatan ini tersimpan di riwayat pesanan." }]
        });
        if (!values) return;
        await api(`/api/admin/orders/${state.order.id}/action`, { method: "POST",
          body: { action, note: values.note } });
        toast("Stok dialokasikan dan pesanan dilepas dari antrian tindakan.", "ok");
        await openOrder(state.order.id, false);
        loadNoticeCount().then(paintNoticeBadge);
      }

      else if (action === "change_delivery") {
        const values = await openModal({
          title: "Ubah waktu pengiriman",
          message: `${state.order.reference} · ${state.order.recipient_name || "Penerima"}`,
          glyph: "calendar", confirmLabel: "Simpan Jadwal",
          fields: [
            { type: "date", name: "date", label: "Tanggal pengiriman", required: true,
              value: state.order.delivery_date || "", min: jakartaDay(0) },
            { type: "seg", name: "window", label: "Waktu pengiriman",
              value: state.order.delivery_time_window === "afternoon" ? "afternoon" : "morning",
              options: [{ value: "morning", label: "Pagi" }, { value: "afternoon", label: "Siang" }] }
          ]
        });
        if (!values) return;
        await api(`/api/admin/orders/${state.order.id}/action`, { method: "POST",
          body: { action, date: values.date, window: values.window } });
        toast("Jadwal pengiriman diperbarui.", "ok");
        await openOrder(state.order.id, false);
      }

      else if (action === "preview-card") {
        const area = document.getElementById("card-preview-area");
        if (area) {
          area.hidden = !area.hidden;
          target.querySelector("span").textContent = area.hidden ? "Lihat Kartu" : "Sembunyikan";
        }
      }

      else if (action === "print-card") await printCard();

      else if (action === "confirm-print") {
        if (!await confirmModal({ title: "Kartu sudah tercetak?",
          message: "Periksa hasil cetak sebelum menandai selesai. Kartu yang salah cetak harus dicetak ulang.",
          glyph: "printer", confirmLabel: "Sudah Dicetak" })) return;
        await api(`/api/admin/orders/${state.order.id}/card`, { method: "POST",
          body: { action: "confirm", request_id: crypto.randomUUID() } });
        state.pendingPrint = null;
        toast("Kartu ditandai sudah dicetak.", "ok");
        await openOrder(state.order.id, false);
      }
    } catch (error) {
      target.classList.remove("is-busy");
      const message = error.message || "Tindakan belum selesai.";
      if (state.auth === "ready") { toast(message, "error"); }
      else { state.message = message; render(); }
    }
  });

  window.addEventListener("popstate", () => {
    state.order = null;
    state.filter = "";
    if (location.pathname.startsWith("/pesanan")) state.page = "orders";
    loadPage().catch((error) => toast(error.message, "error"));
  });

  buildChrome();
  refreshSession().catch(() => {
    state.auth = "email";
    state.message = "Koneksi belum tersedia. Coba lagi.";
    render();
  });
})();
