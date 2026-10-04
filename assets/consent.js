(() => {
  "use strict";
  if (window.MarvellConsent) return;
  const KEY = "marvell-browser-consent-v1";
  const LANGUAGE_KEY = "marvell-language";
  const LANGUAGE_PROMPT_KEY = "marvell-language-prompt-v1";
  const SESSION_KEY = "marvell-analytics-session-v1";
  const VERSION = "2026-09-01";
  let current = null;
  let sessionId = "";
  let previousFocus = null;
  const t = (en, id) => window.MarvellLanguage?.getLanguage?.() === "id" ? id : en;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
  const uuid = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    // A consent visitor ID is an opaque correlation value, not a credential.
    // This fallback keeps the choice persistent on local HTTP servers where
    // randomUUID is unavailable because the context is not secure.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const value = Math.floor(Math.random() * 16);
      return (character === "x" ? value : (value & 0x3) | 0x8).toString(16);
    });
  };
  current = read();
  if (current?.version !== VERSION) current = null;

  const style = document.createElement("style");
  /* Sized against the newsletter dialog and the site's control scale: 46px
     controls, 11px/.1em uppercase labels, Adelio Light titles near 30px.
     The panel is a quiet notice, so it stays narrower than a form dialog. */
  style.textContent = `.mv-consent{position:fixed;inset:0;z-index:30000;display:grid;place-items:center;padding:20px 16px;background:rgba(18,16,14,.42);backdrop-filter:blur(8px) saturate(1.03);-webkit-backdrop-filter:blur(8px) saturate(1.03);opacity:0;pointer-events:none;transition:opacity .32s ease}
    .mv-consent.is-visible{opacity:1;pointer-events:auto}
    .mv-consent-panel{position:relative;box-sizing:border-box;width:min(100%,560px);max-height:calc(100dvh - 40px);overflow-y:auto;background:#fff;color:#1d1a18;padding:clamp(34px,4.4vw,52px) clamp(24px,5vw,56px) clamp(28px,3.4vw,40px);border:0;box-shadow:0 24px 70px rgba(18,16,14,.18);font:14px/1.7 "Inter Tight",Arial,sans-serif;opacity:0;transform:translateY(14px);transition:opacity .35s ease,transform .35s cubic-bezier(.22,1,.36,1)}
    .mv-consent.is-visible .mv-consent-panel{opacity:1;transform:translateY(0)}
    .mv-consent-panel--language{text-align:center;width:min(100%,470px)}
    .mv-consent-panel h2{margin:0 0 14px;font:300 clamp(23px,2.5vw,31px)/1.24 "AdelioDisplayCondensed","Inter Tight",Arial,sans-serif;letter-spacing:.03em}
    .mv-consent-panel p{max-width:46ch;margin:0 0 14px;color:rgba(29,26,24,.58);font-size:13.5px;line-height:1.7}
    .mv-consent-panel p:last-child{margin-bottom:0}
    .mv-consent-panel p a{color:#1d1a18;text-underline-offset:3px}
    .mv-consent-note{margin:16px 0 0!important;font-size:12px!important;color:rgba(29,26,24,.45)!important}
    .mv-consent-panel--language p{margin-left:auto;margin-right:auto}
    .mv-consent-close{position:absolute;top:clamp(16px,2vw,24px);right:clamp(16px,2vw,26px);width:34px;height:34px;border:0;background:none;color:#1d1a18;padding:0;cursor:pointer;font:22px/1 Arial,sans-serif;transition:opacity .2s ease}
    .mv-consent-close:hover,.mv-consent-close:focus-visible{opacity:.55;outline:none}
    .mv-consent-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px 22px;width:100%;margin-top:26px}
    .mv-consent-actions button{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 28px;border:1px solid #12100e;border-radius:0;background:#12100e;color:#f8f4ec;cursor:pointer;font:500 11px/1.2 "Inter Tight",Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;transition:background-color .22s ease,border-color .22s ease,color .22s ease}
    .mv-consent-actions button:hover,.mv-consent-actions button:focus-visible{background:#2b2723;border-color:#2b2723;outline:none}
    .mv-consent-actions button:focus-visible{outline:1px solid #12100e;outline-offset:3px}
    .mv-consent-actions .mv-consent-secondary{background:transparent;color:#12100e}
    .mv-consent-actions .mv-consent-secondary:hover,.mv-consent-actions .mv-consent-secondary:focus-visible{background:#12100e;color:#f8f4ec}
    .mv-consent-actions .mv-consent-text-action{min-height:0;padding:2px 0;border:0;border-bottom:1px solid rgba(29,26,24,.32);background:none;color:rgba(29,26,24,.62);font-size:10.5px;letter-spacing:.09em}
    .mv-consent-actions .mv-consent-text-action:hover,.mv-consent-actions .mv-consent-text-action:focus-visible{background:none;border-color:#12100e;color:#12100e;outline:none}
    .mv-consent-settings{width:100%;margin:22px 0 0;text-align:left;border-top:1px solid rgba(29,26,24,.12)}
    .mv-consent-essential{display:flex;align-items:center;max-width:none!important;margin:0!important;padding:13px 0;border-bottom:1px solid rgba(29,26,24,.12);color:rgba(29,26,24,.45)!important;font-size:11px!important;font-weight:500;letter-spacing:.09em;text-transform:uppercase;line-height:1.4!important}
    .mv-consent-choice{display:flex;flex-direction:row-reverse;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid rgba(29,26,24,.12);font-size:13.5px;cursor:pointer}
    .mv-consent-choice:last-child{border-bottom:0}
    .mv-consent-choice input{flex:none;width:17px;height:17px;margin:0;accent-color:#12100e;cursor:pointer}
    .mv-consent-panel--language .mv-consent-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:24px}
    .mv-consent-panel--language .mv-consent-primary{width:100%;padding:0 12px;background:transparent;color:#12100e}
    .mv-consent-panel--language .mv-consent-primary:hover,.mv-consent-panel--language .mv-consent-primary:focus-visible{background:#12100e;color:#f8f4ec}
    @media(max-width:600px){.mv-consent{padding:14px}.mv-consent-panel{max-height:calc(100dvh - 28px);padding:44px 22px 26px}.mv-consent-actions{gap:10px 16px}.mv-consent-panel--language .mv-consent-actions{grid-template-columns:minmax(0,1fr)}}
    @media(prefers-reduced-motion:reduce){.mv-consent,.mv-consent-panel,.mv-consent-actions button{transition:none}}`;
  document.head.appendChild(style);

  function close(restoreFocus = true, afterClose) {
    const layer = document.querySelector(".mv-consent");
    const finish = () => {
      layer?.remove();
      if (restoreFocus) {
        if (previousFocus?.isConnected) previousFocus.focus();
        previousFocus = null;
      }
      afterClose?.();
    };
    if (!layer) { finish(); return; }
    layer.classList.remove("is-visible");
    layer.classList.add("is-leaving");
    let completed = false;
    const completeOnce = () => {
      if (completed) return;
      completed = true;
      finish();
    };
    layer.addEventListener("transitionend", (event) => {
      if (event.target === layer) completeOnce();
    }, { once: true });
    setTimeout(completeOnce, 360);
  }
  function reveal(layer) {
    const show = () => layer.classList.add("is-visible");
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(show);
    else setTimeout(show, 0);
  }
  function addDialogKeyHandling(layer, panel, dismiss) {
    layer.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && dismiss) { event.preventDefault(); dismiss.click(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...panel.querySelectorAll("button, input")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  function showLanguage() {
    if (!document.querySelector(".mv-consent")) previousFocus = document.activeElement;
    else { close(false, showLanguage); return; }
    const layer = document.createElement("div");
    layer.className = "mv-consent";
    const panel = document.createElement("div");
    panel.className = "mv-consent-panel mv-consent-panel--language";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "mv-language-title");
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "mv-consent-close";
    dismiss.textContent = "×";
    dismiss.setAttribute("aria-label", t("Continue with the current language", "Lanjutkan dengan bahasa saat ini"));
    dismiss.addEventListener("click", () => chooseLanguage(window.MarvellLanguage?.getLanguage?.() || "en"));
    const title = document.createElement("h2");
    title.id = "mv-language-title";
    title.textContent = t("Welcome to Marvell Florist", "Selamat datang di Marvell Florist");
    const intro = document.createElement("p");
    intro.textContent = t(
      "You are visiting us from Indonesia. Which language would you like to use?",
      "Anda mengunjungi kami dari Indonesia. Bahasa mana yang ingin Anda gunakan?"
    );
    const actions = document.createElement("div");
    actions.className = "mv-consent-actions";
    for (const [language, label] of [["en", "English"], ["id", "Bahasa Indonesia"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mv-consent-primary";
      button.textContent = label;
      button.addEventListener("click", () => chooseLanguage(language));
      actions.appendChild(button);
    }
    panel.append(dismiss, title, intro, actions);
    layer.appendChild(panel); document.body.appendChild(layer);
    addDialogKeyHandling(layer, panel, dismiss);
    reveal(layer);
    actions.querySelector("button")?.focus();
  }

  function chooseLanguage(language) {
    const selected = language === "id" ? "id" : "en";
    window.MarvellLanguage?.setLanguage?.(selected);
    try {
      localStorage.setItem(LANGUAGE_KEY, selected);
      localStorage.setItem(LANGUAGE_PROMPT_KEY, selected);
    } catch {}
    close(false, () => show(false));
  }

  function show(manage = false) {
    if (!document.querySelector(".mv-consent")) previousFocus = document.activeElement;
    else { close(false, () => show(manage)); return; }
    const layer = document.createElement("div");
    layer.className = "mv-consent";
    const panel = document.createElement("div");
    panel.className = "mv-consent-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "mv-consent-title");
    let dismiss = null;
    if (manage) {
      dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className = "mv-consent-close";
      dismiss.textContent = "×";
      dismiss.setAttribute("aria-label", t("Close cookie settings", "Tutup pengaturan cookie"));
      dismiss.addEventListener("click", () => current ? close() : show(false));
    }
    const title = document.createElement("h2");
    title.id = "mv-consent-title";
    title.textContent = manage ? t("Cookie settings", "Pengaturan cookie") : t("We Use Cookies", "Kami Menggunakan Cookie");
    const copy = document.createElement("div");
    const addCopy = (text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      copy.appendChild(paragraph);
    };
    if (manage) {
      addCopy(t(
        "Choose the optional storage you allow. Essential storage always keeps the site, bag and sign-in working.",
        "Pilih penyimpanan opsional yang Anda izinkan. Penyimpanan penting selalu menjaga situs, tas belanja, dan akun tetap berfungsi."
      ));
    } else {
      addCopy(t(
        "In addition to essential storage that keeps this website working, Marvell Florist uses cookies to remember your preferences and understand website performance.",
        "Selain penyimpanan penting yang menjaga situs ini tetap berfungsi, Marvell Florist menggunakan cookie untuk mengingat preferensi Anda dan memahami kinerja situs."
      ));
      addCopy(t(
        "You can accept all cookies or open Cookie settings to choose which optional cookies you allow. You may change your preference at any time.",
        "Anda dapat menerima semua cookie atau membuka Pengaturan cookie untuk memilih cookie opsional yang Anda izinkan. Anda dapat mengubah pilihan kapan saja."
      ));
      const policy = document.createElement("p");
      policy.className = "mv-consent-note";
      policy.append(document.createTextNode(t(
        "For more information, please consult our ",
        "Untuk informasi lebih lanjut, silakan lihat "
      )));
      const link = document.createElement("a");
      link.href = "/privacy-policy.html";
      link.textContent = t("Privacy Policy", "Kebijakan Privasi");
      policy.append(link, document.createTextNode("."));
      copy.appendChild(policy);
    }
    if (dismiss) panel.appendChild(dismiss);
    panel.append(title, copy);
    if (manage) {
      const settings = document.createElement("div");
      settings.className = "mv-consent-settings";
      const essential = document.createElement("p");
      essential.className = "mv-consent-essential";
      essential.textContent = t("Essential: always on", "Penting: selalu aktif");
      settings.appendChild(essential);
      for (const [key, en, id] of [["analytics", "Allow analytics", "Izinkan analitik"],
        ["marketing", "Allow marketing", "Izinkan pemasaran"]]) {
        const label = document.createElement("label");
        label.className = "mv-consent-choice";
        const input = document.createElement("input");
        input.type = "checkbox"; input.name = key; input.checked = current?.[key] === true;
        label.append(input, document.createTextNode(t(en, id)));
        settings.appendChild(label);
      }
      panel.appendChild(settings);
    }
    const actions = document.createElement("div");
    actions.className = "mv-consent-actions";
    function add(label, handler, variant = "primary") {
      const button = document.createElement("button");
      button.type = "button"; button.textContent = label;
      button.className = variant === "text" ? "mv-consent-text-action" : `mv-consent-${variant}`;
      button.addEventListener("click", handler); actions.appendChild(button);
    }
    if (manage) add(t("Save preferences", "Simpan Pilihan"), () => save({
      analytics: panel.querySelector('[name="analytics"]').checked,
      marketing: panel.querySelector('[name="marketing"]').checked
    }));
    else {
      add(t("Accept all cookies", "Terima semua cookie"), () => save({ analytics: true, marketing: true }));
      add(t("Cookie settings", "Pengaturan cookie"), () => show(true), "text");
    }
    if (manage) add(t("Back", "Kembali"), () => show(false), "text");
    panel.appendChild(actions); layer.appendChild(panel); document.body.appendChild(layer);
    addDialogKeyHandling(layer, panel, dismiss);
    reveal(layer);
    actions.querySelector("button")?.focus();
  }

  function stopAnalytics() {
    sessionId = "";
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    window.MarvellAnalytics?.disable?.();
    // Remove first-party GA identifiers when a previous choice is withdrawn.
    try {
      for (const part of document.cookie.split(";")) {
        const name = part.split("=")[0].trim();
        if (!/^_ga(?:_|$)/.test(name)) continue;
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
        document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.marvellflorist.com; SameSite=Lax`;
      }
    } catch {}
  }

  async function save(choice) {
    const visitor = current?.visitor_id || uuid();
    if (!visitor) { close(); return; }
    current = { version: VERSION, visitor_id: visitor,
      analytics: choice.analytics === true, marketing: choice.marketing === true,
      saved_at: new Date().toISOString(), receipt_id: "" };
    try { localStorage.setItem(KEY, JSON.stringify(current)); }
    catch { current = null; close(); stopAnalytics(); return; }
    close();
    if (!current.analytics) stopAnalytics();
    else window.MarvellAnalytics?.enable?.();
    try {
      const response = await fetch("/api/privacy/consent", { method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visitor_id: visitor, consent_version: VERSION,
          analytics: current.analytics, marketing: current.marketing }) });
      const result = await response.json();
      if (response.ok && result.receipt_id) {
        current.receipt_id = result.receipt_id;
        localStorage.setItem(KEY, JSON.stringify(current));
        if (current.analytics) startAnalytics();
      }
    } catch { /* preference stays local; measurement fails closed */ }
  }

  function referrerCategory() {
    if (!document.referrer) return "direct";
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (host === location.hostname) return "direct";
      if (/(google|bing|duckduckgo)\./.test(host)) return "search";
      if (/(instagram|tiktok|facebook)\./.test(host)) return "social";
    } catch {}
    return "other";
  }

  async function startAnalytics() {
    if (!current?.analytics || !current.receipt_id) return;
    const query = new URLSearchParams(location.search);
    let prior = "";
    try { prior = sessionStorage.getItem(SESSION_KEY) || ""; } catch {}
    try {
      const response = await fetch("/api/analytics/session", { method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visitor_id: current.visitor_id, consent_receipt_id: current.receipt_id,
          session_id: prior, landing_path: location.pathname, referrer_category: referrerCategory(),
          touch: { utm_source: query.get("utm_source"), utm_medium: query.get("utm_medium"),
            utm_campaign: query.get("utm_campaign"), utm_content: query.get("utm_content") } }) });
      const data = await response.json();
      if (!response.ok || !data.session_id) return;
      sessionId = data.session_id;
      try { sessionStorage.setItem(SESSION_KEY, sessionId); } catch {}
      track("page_view", { path: location.pathname });
    } catch { /* optional measurement never changes the page */ }
  }

  function track(eventName, properties = {}, productSku = "") {
    if (!current?.analytics || !sessionId) return;
    fetch("/api/analytics/event", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, event_name: eventName,
        properties, product_sku: productSku }) }).catch(() => {});
  }

  window.MarvellConsent = { open: () => show(true), track,
    sessionId: () => current?.analytics ? sessionId : "",
    choices: () => current ? { analytics: current.analytics, marketing: current.marketing } : null };
  const hasLanguagePromptChoice = () => {
    try { return ["en", "id"].includes(String(localStorage.getItem(LANGUAGE_PROMPT_KEY) || "").toLowerCase()); }
    catch { return false; }
  };
  if (!hasLanguagePromptChoice()) showLanguage();
  else if (!current) show(false);
  else if (current.analytics) { window.MarvellAnalytics?.enable?.(); startAnalytics(); }
  else stopAnalytics();
})();
