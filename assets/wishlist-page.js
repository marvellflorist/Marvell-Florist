(function () {
  if (typeof document === "undefined") return;

  const WISHLIST_CONSULTATION_CONFIG_STORAGE_KEY = "marvell-wishlist-consultation-config-v1";
  const AVAILABLE_DATE_OPTIONS = window.MarvellConsultation?.getAvailableDateOptions?.(7) || [];

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

  function getFavorites() {
    return window.MarvellFavorites?.getFavorites?.() || [];
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function sanitizeConsultationConfig(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      giftingEnabled: source.giftingEnabled === true,
      cardChoice: source.cardChoice === "add-message" ? "add-message" : "blank-card",
      message: String(source.message || ""),
      preferredDate: window.MarvellConsultation?.toIsoDate?.(source.preferredDate) || "",
      preferredDateUnsure: source.preferredDateUnsure === true,
      deliveryMode: source.deliveryMode === "pickup" ? "pickup" : source.deliveryMode === "delivery" ? "delivery" : "",
      timeWindow: source.timeWindow === "afternoon" ? "afternoon" : source.timeWindow === "morning" ? "morning" : "",
      notes: String(source.notes || "")
    };
  }

  function readConsultationConfig() {
    try {
      const raw = window.localStorage.getItem(WISHLIST_CONSULTATION_CONFIG_STORAGE_KEY);
      if (!raw) return sanitizeConsultationConfig();
      return sanitizeConsultationConfig(JSON.parse(raw));
    } catch (_error) {
      return sanitizeConsultationConfig();
    }
  }

  function writeConsultationConfig(config) {
    try {
      window.localStorage.setItem(
        WISHLIST_CONSULTATION_CONFIG_STORAGE_KEY,
        JSON.stringify(sanitizeConsultationConfig(config))
      );
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  let consultationConfig = readConsultationConfig();
  let wishlistDateCustomPickerOpen = false;
  let hasReviewedOrderDetails = false;
  let wishlistOrderPanelOpenFrame = 0;
  let wishlistOrderPopupView = "main";
  let wishlistScrollLockY = 0;
  let wishlistPageScrollLocked = false;

  function markOrderDetailsDirty() {
    hasReviewedOrderDetails = false;
  }

  function normalizeCategory(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function isFloralBoardCategory(category) {
    const normalized = normalizeCategory(category);
    return normalized === "papan bunga"
      || normalized === "flower boards"
      || normalized === "flower board"
      || normalized === "papan";
  }

  function favoritesAreFlowerBoards(favorites = getFavorites()) {
    const items = Array.isArray(favorites) ? favorites : [];
    return items.some((item) => isFloralBoardCategory(item?.category));
  }

  function getFloralBoardCount(item) {
    const source = [
      String(item?.title || ""),
      String(item?.image || ""),
      String(item?.href || ""),
      String(item?.category || "")
    ].join(" ").toLowerCase();

    if (source.includes("3papan") || source.includes("3 papan") || source.includes("papan3") || source.includes("triple")) return 3;
    if (source.includes("2papan") || source.includes("2 papan") || source.includes("papan2") || source.includes("double")) return 2;
    if (source.includes("1papan") || source.includes("1 papan") || source.includes("papan1") || source.includes("single")) return 1;
    return 1;
  }

  function getEffectiveConsultationConfig(_favorites = getFavorites(), config = consultationConfig) {
    return sanitizeConsultationConfig(config);
  }

  function hasEffectiveOrderDetails(favorites = getFavorites(), config = consultationConfig) {
    const effectiveConfig = getEffectiveConsultationConfig(favorites, config);
    return Boolean(effectiveConfig.giftingEnabled)
      || Boolean(effectiveConfig.preferredDate)
      || Boolean(effectiveConfig.preferredDateUnsure)
      || Boolean(effectiveConfig.deliveryMode)
      || Boolean(effectiveConfig.timeWindow)
      || Boolean(String(effectiveConfig.notes || "").trim());
  }

  function getEffectiveOrderDetailCount(favorites = getFavorites(), config = consultationConfig) {
    const effectiveConfig = getEffectiveConsultationConfig(favorites, config);
    return [
      Boolean(effectiveConfig.giftingEnabled),
      Boolean(effectiveConfig.preferredDate),
      Boolean(effectiveConfig.preferredDateUnsure),
      Boolean(effectiveConfig.deliveryMode),
      Boolean(effectiveConfig.timeWindow),
      Boolean(String(effectiveConfig.notes || "").trim())
    ].filter(Boolean).length;
  }

  function buildConsultationHref(favorites, config) {
    const effectiveConfig = getEffectiveConsultationConfig(favorites, config);
    const items = Array.isArray(favorites) ? favorites : [];
    const listedTitles = items
      .map((item) => {
        const title = String(item?.title || "").trim();
        if (!title) return "";
        const quantity = Math.max(1, Number.parseInt(String(item?.quantity ?? 1), 10) || 1);
        return quantity > 1 ? `- ${title} (${t("Qty", "Jml")}: ${quantity})` : `- ${title}`;
      })
      .filter(Boolean)
      .slice(0, 12);

    const lines = [
      getLanguage() === "id"
        ? "Halo Marvell Florist, saya ingin berkonsultasi mengenai wishlist saya."
        : "Hello Marvell Florist, I would like to consult about my wishlist selections."
    ];

    if (listedTitles.length) {
      lines.push("");
      listedTitles.forEach((line) => lines.push(line));
    }

    if (effectiveConfig.giftingEnabled) {
      lines.push(`${t("Card", "Kartu")}: ${effectiveConfig.cardChoice === "add-message" ? t("Add a message", "Tambah pesan") : t("Blank card", "Kartu kosong")}`);
    }
    if (effectiveConfig.giftingEnabled && effectiveConfig.cardChoice === "add-message") {
      const message = window.MarvellConsultation?.normalizeSingleLine?.(effectiveConfig.message) || String(effectiveConfig.message || "").trim();
      if (message) lines.push(`${t("Message", "Pesan")}: ${message}`);
    }
    if (effectiveConfig.preferredDateUnsure) {
      lines.push(`${t("Date", "Tanggal")}: ${t("Not sure yet", "Belum yakin")}`);
    } else if (effectiveConfig.preferredDate) {
      lines.push(`${t("Date", "Tanggal")}: ${window.MarvellConsultation?.formatPreferredDate?.(effectiveConfig.preferredDate) || effectiveConfig.preferredDate}`);
    }
    if (effectiveConfig.deliveryMode) {
      const deliveryLabel = effectiveConfig.deliveryMode === "pickup" ? t("Pickup", "Ambil sendiri") : t("Delivery", "Pengantaran");
      lines.push(`${t("Delivery or pickup", "Pengantaran atau ambil sendiri")}: ${deliveryLabel}`);
      if (effectiveConfig.deliveryMode === "pickup") {
        lines.push(`${t("Pickup point", "Titik pengambilan")}: Ruko Kintamani, Jl. Raja H. Fisabilillah Blok C11.`);
      }
    }
    if (effectiveConfig.timeWindow) {
      const timeLabel = effectiveConfig.timeWindow === "afternoon"
        ? `${t("Afternoon", "Siang")} (13:00-18:00)`
        : `${t("Morning", "Pagi")} (08:00-13:00)`;
      lines.push(`${t("Time", "Waktu")}: ${timeLabel}`);
    }
    const notes = window.MarvellConsultation?.normalizeSingleLine?.(effectiveConfig.notes) || String(effectiveConfig.notes || "").trim();
    if (notes) {
      lines.push(`${t("Notes", "Catatan")}: ${notes}`);
    }

    return `https://wa.me/6281275017456?text=${encodeURIComponent(lines.join("\n").trim())}`;
  }

  function syncFooterPlacement() {
    const footer = document.getElementById("site-footer");
    const page = document.getElementById("wishlist-page");
    if (!(footer instanceof HTMLElement) || !(page instanceof HTMLElement)) return;

    const mode = page.dataset.mode === "filled" ? "filled" : "empty";
    const target = document.querySelector(mode === "filled" ? ".wishlist-filled-content" : ".wishlist-empty-content");
    if (!(target instanceof HTMLElement)) return;
    if (footer.parentElement === target) return;
    target.appendChild(footer);
  }

  function isPresetDate(value) {
    return AVAILABLE_DATE_OPTIONS.some((option) => option.value === value);
  }

  function setOrderPopupView(view = "main") {
    wishlistOrderPopupView = view === "dates" ? "dates" : "main";
    const popup = document.getElementById("wishlist-order-popup");
    const trigger = document.getElementById("wishlist-date-trigger");
    const group = document.getElementById("wishlist-date-group");
    if (popup instanceof HTMLElement) {
      popup.classList.toggle("is-date-view", wishlistOrderPopupView === "dates");
    }
    if (group instanceof HTMLElement) {
      group.classList.toggle("is-open", wishlistOrderPopupView === "dates");
    }
    if (trigger instanceof HTMLButtonElement) {
      trigger.setAttribute("aria-expanded", wishlistOrderPopupView === "dates" ? "true" : "false");
    }
  }

  function setScrollLock(isLocked) {
    const root = document.documentElement;
    if (!(document.body instanceof HTMLElement) || !(root instanceof HTMLElement) || isLocked === wishlistPageScrollLocked) return;
    if (isLocked) {
      wishlistScrollLockY = window.scrollY || window.pageYOffset || 0;
      wishlistPageScrollLocked = true;
      root.classList.add("wishlist-order-popup-open");
      document.body.style.position = "fixed";
      document.body.style.top = `-${wishlistScrollLockY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      return;
    }
    wishlistPageScrollLocked = false;
    root.classList.remove("wishlist-order-popup-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, wishlistScrollLockY);
  }

  function closeDatePanel() {
    wishlistDateCustomPickerOpen = false;
    setOrderPopupView("main");
  }

  function setOrderPanelOpen(isOpen) {
    const panel = document.getElementById("wishlist-order-popup");
    const backdrop = document.getElementById("wishlist-order-backdrop");
    const toggle = document.getElementById("wishlist-order-toggle");
    if (wishlistOrderPanelOpenFrame) {
      window.cancelAnimationFrame(wishlistOrderPanelOpenFrame);
      wishlistOrderPanelOpenFrame = 0;
    }
    if (panel instanceof HTMLElement) {
      panel.hidden = false;
      panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }
    if (backdrop instanceof HTMLElement) backdrop.setAttribute("aria-hidden", isOpen ? "false" : "true");
    if (toggle instanceof HTMLButtonElement) toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (isOpen) {
      document.body.classList.remove("wishlist-order-popup-open");
      wishlistOrderPanelOpenFrame = window.requestAnimationFrame(() => {
        wishlistOrderPanelOpenFrame = 0;
        document.body.classList.add("wishlist-order-popup-open");
      });
      setScrollLock(true);
      setOrderPopupView("main");
      return;
    }
    document.body.classList.remove("wishlist-order-popup-open");
    setScrollLock(false);
    setOrderPopupView("main");
  }

  function renderDateOptions() {
    const optionsWrap = document.getElementById("wishlist-date-options");
    const customWrap = document.getElementById("wishlist-date-custom-wrap");
    const customInput = document.getElementById("wishlist-date-custom-input");
    if (!(optionsWrap instanceof HTMLElement)) return;

    optionsWrap.innerHTML = AVAILABLE_DATE_OPTIONS.map((option) => `
      <button class="wishlist-date-option${consultationConfig.preferredDate === option.value ? " is-active" : ""}${option.isUnavailable ? " is-unavailable" : ""}" type="button" data-wishlist-date-option="${escapeHtml(option.value)}"${option.isUnavailable ? " aria-disabled=\"true\"" : ""}>
        <span class="wishlist-date-option-meta">
          <span class="wishlist-date-option-copy">
            <span class="wishlist-date-option-label">${escapeHtml(option.longLabel)}</span>
          </span>
          ${option.availabilityNote ? `<span class="wishlist-date-option-state">${escapeHtml(option.availabilityNote)}</span>` : ""}
        </span>
      </button>
    `).join("") + `
      <button class="wishlist-date-option${consultationConfig.preferredDateUnsure ? " is-active" : ""}" type="button" data-wishlist-date-option="unsure">
        <span class="wishlist-date-option-meta">
          <span class="wishlist-date-option-copy">
            <span class="wishlist-date-option-label">${escapeHtml(t("Not sure yet", "Belum yakin"))}</span>
          </span>
        </span>
      </button>
    ` + `
      <button class="wishlist-date-option wishlist-date-option--other${wishlistDateCustomPickerOpen ? " is-active" : ""}" type="button" data-wishlist-date-option="other" aria-expanded="${wishlistDateCustomPickerOpen ? "true" : "false"}" aria-controls="wishlist-date-custom-wrap">
        <span class="wishlist-date-option-meta">
          <span class="wishlist-date-option-copy">
            <span class="wishlist-date-option-label">${escapeHtml(t("Others", "Lainnya"))}</span>
            <span class="wishlist-date-option-short">${escapeHtml(t("Use calendar", "Pilih dari kalender"))}</span>
          </span>
          <span class="wishlist-date-option-accordion-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </span>
        </span>
      </button>
    `;

    if (customWrap instanceof HTMLElement) {
      customWrap.hidden = false;
      customWrap.classList.toggle("is-open", wishlistDateCustomPickerOpen);
    }
    if (customInput instanceof HTMLInputElement) {
      const firstAvailable = AVAILABLE_DATE_OPTIONS.find((option) => !option.isUnavailable)?.value || AVAILABLE_DATE_OPTIONS[0]?.value || "";
      if (firstAvailable) customInput.min = firstAvailable;
      customInput.value = consultationConfig.preferredDate && !consultationConfig.preferredDateUnsure && !isPresetDate(consultationConfig.preferredDate)
        ? consultationConfig.preferredDate
        : "";
    }
  }

  function syncConsultationUI(favorites = getFavorites()) {
    const effectiveConfig = getEffectiveConsultationConfig(favorites, consultationConfig);
    const giftingToggle = document.getElementById("wishlist-gifting-toggle");
    const giftingGroup = document.getElementById("wishlist-gifting-group");
    const giftingPanel = document.getElementById("wishlist-gifting-panel");
    const cardChoiceButtons = Array.from(document.querySelectorAll("[data-wishlist-card-choice]"));
    const messageFieldWrap = document.getElementById("wishlist-message-field-wrap");
    const messageField = document.getElementById("wishlist-message-field");
    const notesField = document.getElementById("wishlist-notes-field");
    const consultButton = document.getElementById("wishlist-consult-button");
    const dateTriggerValue = document.getElementById("wishlist-date-value");
    const timeTriggerValue = document.getElementById("wishlist-time-value");
    const timeGroup = document.getElementById("wishlist-time-group");
    const timePanel = document.getElementById("wishlist-time-panel");
    const timeIcon = document.getElementById("wishlist-time-icon");
    const timeChoiceButtons = Array.from(document.querySelectorAll("[data-wishlist-time-window]"));
    const shippingChoiceButtons = Array.from(document.querySelectorAll("[data-wishlist-shipping-choice]"));
    const orderToggleValue = document.getElementById("wishlist-order-toggle-value");
    const orderPopupTitleDates = document.getElementById("wishlist-order-popup-title-dates");
    const orderApply = document.getElementById("wishlist-order-apply");
    const hasAnyOrderDetails = hasEffectiveOrderDetails(favorites, consultationConfig);

    setText("wishlist-message-title", t("Order details", "Detail pesanan"));
    setText("wishlist-order-toggle-label", t("Review details", "Tinjau detail"));
    setText("wishlist-order-popup-title", t("Order details", "Detail pesanan"));
    setText("wishlist-order-popup-title-dates", t("Dates", "Tanggal"));
    setText("wishlist-gifting-label", t("Message card", "Kartu pesan"));
    setText("wishlist-message-label", t("Message", "Pesan"));
    setText("wishlist-date-label", t("Preferred date", "Tanggal pilihan"));
    setText("wishlist-time-label", t("Choose time", "Pilih waktu"));
    setText("wishlist-time-morning-label", t("Morning", "Pagi"));
    setText("wishlist-time-afternoon-label", t("Afternoon", "Siang"));
    setText("wishlist-shipping-label", t("Delivery or pickup", "Pengantaran atau ambil sendiri"));
    setText("wishlist-shipping-delivery-label", t("Delivery", "Pengantaran"));
    setText("wishlist-shipping-delivery-note", t("Batam only. Any fee is discussed separately.", "Khusus area Batam. Biaya dibicarakan terpisah."));
    setText("wishlist-shipping-pickup-label", t("Pickup", "Ambil sendiri"));
    setText("wishlist-shipping-pickup-note", t("Ruko Kintamani, Jl. Raja H. Fisabilillah Blok C11.", "Ruko Kintamani, Jl. Raja H. Fisabilillah Blok C11."));
    setText("wishlist-order-date-kicker", t("Dates", "Tanggal"));
    setText("wishlist-date-other-label", t("Others", "Lainnya"));
    setText("wishlist-notes-label", t("Notes", "Catatan"));
    const blankButton = document.getElementById("wishlist-card-blank");
    const messageButton = document.getElementById("wishlist-card-message");
    const blankButtonLabel = blankButton?.querySelector?.(".wishlist-config-choice-label");
    const messageButtonLabel = messageButton?.querySelector?.(".wishlist-config-choice-label");
    if (blankButtonLabel instanceof HTMLElement) blankButtonLabel.textContent = t("Blank card", "Kartu kosong");
    if (messageButtonLabel instanceof HTMLElement) messageButtonLabel.textContent = t("Personal message", "Pesan pribadi");

    if (messageField instanceof HTMLTextAreaElement) {
      if (messageField.value !== consultationConfig.message) messageField.value = consultationConfig.message;
      messageField.placeholder = t("Write your message...", "Tulis pesan Anda...");
    }
    if (notesField instanceof HTMLTextAreaElement) {
      if (notesField.value !== consultationConfig.notes) notesField.value = consultationConfig.notes;
      notesField.placeholder = t("Additional notes (optional)", "Catatan tambahan (opsional)");
    }

    if (giftingGroup instanceof HTMLElement) giftingGroup.classList.toggle("is-open", consultationConfig.giftingEnabled);
    if (giftingToggle instanceof HTMLButtonElement) {
      giftingToggle.setAttribute("aria-pressed", consultationConfig.giftingEnabled ? "true" : "false");
      giftingToggle.setAttribute("aria-expanded", consultationConfig.giftingEnabled ? "true" : "false");
    }
    if (giftingPanel instanceof HTMLElement) giftingPanel.hidden = false;
    cardChoiceButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const isActive = button.dataset.wishlistCardChoice === consultationConfig.cardChoice;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    if (messageFieldWrap instanceof HTMLElement) {
      messageFieldWrap.hidden = false;
      messageFieldWrap.classList.toggle("is-visible", consultationConfig.giftingEnabled && consultationConfig.cardChoice === "add-message");
    }

    if (dateTriggerValue instanceof HTMLElement) {
      const displayLabel = consultationConfig.preferredDateUnsure
        ? t("Not sure yet", "Belum yakin")
        : (window.MarvellConsultation?.formatPreferredDate?.(consultationConfig.preferredDate) || "");
      dateTriggerValue.textContent = displayLabel;
      dateTriggerValue.classList.toggle("is-selected", Boolean(displayLabel));
    }
    if (consultationConfig.timeWindow === "morning" && window.MarvellConsultation?.isMorningTimeUnavailable?.(consultationConfig.preferredDate)) {
      consultationConfig.timeWindow = "";
      writeConsultationConfig(consultationConfig);
      markOrderDetailsDirty();
    }
    if (timeTriggerValue instanceof HTMLElement) {
      const displayLabel = consultationConfig.timeWindow === "afternoon"
        ? t("Afternoon", "Siang")
        : consultationConfig.timeWindow === "morning"
          ? t("Morning", "Pagi")
          : "";
      timeTriggerValue.textContent = displayLabel;
      timeTriggerValue.classList.toggle("is-selected", Boolean(displayLabel));
    }
    const timeIsOpen = timeGroup instanceof HTMLElement && timeGroup.classList.contains("is-open");
    if (timePanel instanceof HTMLElement) timePanel.hidden = false;
    if (timeIcon instanceof HTMLElement) timeIcon.classList.toggle("is-open", timeIsOpen);
    timeChoiceButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const isUnavailable = button.dataset.wishlistTimeWindow === "morning" && window.MarvellConsultation?.isMorningTimeUnavailable?.(consultationConfig.preferredDate);
      const isActive = button.dataset.wishlistTimeWindow === consultationConfig.timeWindow;
      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-unavailable", Boolean(isUnavailable));
      button.disabled = Boolean(isUnavailable);
      button.setAttribute("aria-disabled", isUnavailable ? "true" : "false");
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    shippingChoiceButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const isActive = button.dataset.wishlistShippingChoice === consultationConfig.deliveryMode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    if (orderToggleValue instanceof HTMLElement) {
      orderToggleValue.textContent = "";
    }
    if (orderApply instanceof HTMLButtonElement) {
      orderApply.textContent = t("Apply", "Terapkan");
      orderApply.disabled = !hasAnyOrderDetails;
      orderApply.classList.toggle("is-disabled", !hasAnyOrderDetails);
    }
    renderDateOptions();
    setOrderPopupView(wishlistOrderPopupView);

    if (consultButton instanceof HTMLAnchorElement) {
      consultButton.textContent = t("Consult on WhatsApp", "Konsultasi via WhatsApp");
      consultButton.href = hasAnyOrderDetails && hasReviewedOrderDetails
        ? buildConsultationHref(favorites, effectiveConfig)
        : "#";
      consultButton.classList.remove("is-disabled");
      consultButton.setAttribute("aria-disabled", "false");
    }
  }

  function renderWishlist() {
    const favorites = getFavorites();
    const hasItems = favorites.length > 0;
    document.title = t("Wishlist | Marvell Florist", "Wishlist | Marvell Florist");

    const emptyStage = document.getElementById("wishlist-empty-stage");
    const filledStage = document.getElementById("wishlist-filled-stage");
    const list = document.getElementById("wishlist-list");
    const clearButton = document.getElementById("wishlist-clear");
    const page = document.getElementById("wishlist-page");

    if (page instanceof HTMLElement) page.dataset.mode = hasItems ? "filled" : "empty";
    if (emptyStage instanceof HTMLElement) {
      emptyStage.hidden = hasItems;
      emptyStage.setAttribute("aria-hidden", hasItems ? "true" : "false");
    }
    if (filledStage instanceof HTMLElement) {
      filledStage.hidden = !hasItems;
      filledStage.setAttribute("aria-hidden", hasItems ? "false" : "true");
    }
    if (clearButton instanceof HTMLButtonElement) clearButton.hidden = !hasItems;

    setText("wishlist-empty-kicker", t("Your selections", "Pilihan Anda"));
    setText("wishlist-empty-title", t("Wishlist is empty.", "Wishlist masih kosong."));
    setText(
      "wishlist-empty-text",
      t(
        "Tap the heart on any arrangement to save it here, then return to compare them quietly in one place.",
        "Ketuk ikon hati pada rangkaian mana pun untuk menyimpannya di sini, lalu kembali untuk membandingkannya dengan tenang di satu tempat."
      )
    );
    setText("wishlist-empty-primary", t("Continue Exploring", "Lanjut Menjelajah"));
    setText("wishlist-empty-secondary", t("Explore Collections", "Jelajahi Koleksi"));
    setText("wishlist-side-help-title", t("May we help?", "Bisa kami bantu?"));
    setText(
      "wishlist-side-help-copy",
      t(
        "Saved arrangements stay only on this device, so you can revisit them and compare details quietly later.",
        "Rangkaian yang disimpan hanya tersimpan di perangkat ini, jadi Anda bisa membukanya kembali dan membandingkan detailnya nanti dengan tenang."
      )
    );
    setText("wishlist-side-compare-title", t("How comparison works", "Cara membandingkan"));
    setText(
      "wishlist-side-compare-copy",
      t(
        "Use the hearts across portfolio, collections, and product pages. Each saved arrangement appears here with its image, category, and price when available.",
        "Gunakan ikon hati di portfolio, koleksi, dan halaman produk. Setiap rangkaian yang disimpan akan muncul di sini dengan gambar, kategori, dan harga bila tersedia."
      )
    );
    setText("wishlist-side-device-title", t("Device only", "Hanya di perangkat ini"));
    setText(
      "wishlist-side-device-copy",
      t(
        "Your wishlist is stored locally in this browser, so it will not automatically appear on another phone or laptop.",
        "Wishlist Anda disimpan secara lokal di browser ini, jadi tidak akan otomatis muncul di ponsel atau laptop lain."
      )
    );
    setText("wishlist-filled-title", t("Wishlist", "Wishlist"));
    setText("wishlist-flow-step-wishlist", t("Wishlist", "Wishlist"));
    setText("wishlist-flow-step-consultation", t("Consultation", "Konsultasi"));
    setText("wishlist-flow-step-confirmation", t("Confirmation", "Konfirmasi"));
    setText("wishlist-selections-kicker", favorites.length === 1 ? t("Your Selection", "Pilihan Anda") : t("Your Selections", "Pilihan Anda"));
    setText(
      "wishlist-selections-count",
      favorites.length === 1 ? t("1 saved arrangement", "1 rangkaian tersimpan") : t(`${favorites.length} saved arrangements`, `${favorites.length} rangkaian tersimpan`)
    );
    setText("wishlist-clear", t("Clear Wishlist", "Hapus Wishlist"));
    setText("wishlist-details-title", t("View details", "Lihat detail"));
    setText(
      "wishlist-details-copy",
      t(
        "Open any saved arrangement to review the original product page, reference images, and pricing before consultation.",
        "Buka rangkaian yang disimpan untuk melihat halaman produk asli, gambar referensi, dan harga sebelum berkonsultasi."
      )
    );
    setText("wishlist-service-title", t("Customer service", "Layanan pelanggan"));
    setText("wishlist-service-hours-label", t("Consultation hours", "Jam konsultasi"));
    setText("wishlist-service-hours-days", t("Monday to Saturday 8am-6pm WIB", "Senin sampai Sabtu 08.00-18.00 WIB"));
    setText("wishlist-service-copy", t(
      "Send your wishlist on WhatsApp and we will review each arrangement with you before anything is finalized.",
      "Kirim wishlist Anda lewat WhatsApp dan kami akan meninjau setiap rangkaian bersama Anda sebelum semuanya dipastikan."
    ));
    setText("wishlist-service-step-1", t(
      "Share your saved wishlist and any notes you want us to consider.",
      "Bagikan wishlist yang sudah disimpan beserta catatan yang ingin Anda sampaikan."
    ));
    setText("wishlist-service-step-2", t(
      "We confirm design direction, availability, delivery timing, and final pricing with you.",
      "Kami mengonfirmasi arah desain, ketersediaan, waktu pengiriman, dan harga akhir bersama Anda."
    ));
    setText("wishlist-service-step-3", t(
      "After confirmation, payment and preparation continue according to the agreed arrangement.",
      "Setelah dikonfirmasi, pembayaran dan persiapan akan dilanjutkan sesuai rangkaian yang sudah disepakati."
    ));
    setText("wishlist-service-note", t(
      "Orders confirmed after 6pm WIB are scheduled from the next available day.",
      "Pesanan yang dikonfirmasi setelah pukul 18.00 WIB akan dijadwalkan mulai hari tersedia berikutnya."
    ));
    setText("wishlist-assurance-custom-title", t("Customizable", "Dapat disesuaikan"));
    setText("wishlist-assurance-availability-title", t("Availability Discussed", "Ketersediaan Dibahas"));
    setText("wishlist-assurance-delivery-title", t("Delivery Coordinated", "Pengiriman Dikoordinasikan"));

    const emptyPrimary = document.getElementById("wishlist-empty-primary");
    if (emptyPrimary instanceof HTMLAnchorElement) emptyPrimary.href = localizedHref("gallery.html?entry=home-cta");
    const emptySecondary = document.getElementById("wishlist-empty-secondary");
    if (emptySecondary instanceof HTMLAnchorElement) emptySecondary.href = localizedHref("featured.html");

    if (!(list instanceof HTMLElement)) return;
    if (!hasItems) {
      list.innerHTML = "";
      syncConsultationUI(favorites);
      syncFooterPlacement();
      return;
    }

    list.innerHTML = favorites.map((item) => {
      const href = localizedHref(item.href || "");
      const quantity = Math.max(1, Number.parseInt(String(item.quantity ?? 1), 10) || 1);
      const usesBoardAmount = isFloralBoardCategory(item.category);
      const boardCount = getFloralBoardCount(item);
      const boardAmountLabel = boardCount === 1 ? t("1 Board", "1 Papan") : t(`${boardCount} Boards`, `${boardCount} Papan`);
      const quantityOptions = Array.from({ length: 9 }, (_, index) => {
        const value = index + 1;
        return `
          <button
            class="wishlist-card-qty-option${value === quantity ? " is-active" : ""}"
            type="button"
            data-wishlist-quantity-option="${escapeHtml(item.id)}"
            data-quantity-value="${value}"
            role="option"
            aria-selected="${value === quantity ? "true" : "false"}"
          >${value}</button>
        `;
      }).join("");
      return `
        <article class="wishlist-card">
          <a class="wishlist-card-media" href="${escapeHtml(href)}">
            ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || t("Saved arrangement", "Rangkaian tersimpan"))}" loading="lazy" decoding="async">` : `<div class="wishlist-card-placeholder" aria-hidden="true"></div>`}
          </a>
          <div class="wishlist-card-body">
            <div class="wishlist-card-topline">
              <div class="wishlist-card-copy">
                ${item.category ? `<p class="wishlist-card-category">${escapeHtml(item.category)}</p>` : ""}
                <h2 class="wishlist-card-title">${escapeHtml(item.title || t("Saved arrangement", "Rangkaian tersimpan"))}</h2>
                ${item.price ? `<p class="wishlist-card-price">${escapeHtml(item.price)}</p>` : ""}
                ${usesBoardAmount ? `<p class="wishlist-card-amount">${escapeHtml(boardAmountLabel)}</p>` : ""}
              </div>
              ${usesBoardAmount ? "" : `
                <div class="wishlist-card-qty">
                  <span class="wishlist-card-qty-label">${escapeHtml(t("Qty:", "Jumlah:"))}</span>
                  <button
                    class="wishlist-card-qty-trigger"
                    type="button"
                    data-wishlist-quantity-trigger="${escapeHtml(item.id)}"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-label="${escapeHtml(t("Quantity", "Jumlah"))}"
                  >
                    <span class="wishlist-card-qty-trigger-label">${escapeHtml(t("Qty:", "Jml:"))}</span>
                    <span class="wishlist-card-qty-trigger-value">${quantity}</span>
                  </button>
                  <div class="wishlist-card-qty-menu" role="listbox" aria-label="${escapeHtml(t("Quantity", "Jumlah"))}">
                    ${quantityOptions}
                  </div>
                </div>
              `}
            </div>
            <div class="wishlist-card-actions">
              <a class="wishlist-card-link" href="${escapeHtml(href)}">${escapeHtml(t("View Product", "Lihat Produk"))}</a>
              <button class="wishlist-card-remove" type="button" data-wishlist-remove="${escapeHtml(item.id)}">${escapeHtml(t("Remove", "Hapus"))}</button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    syncConsultationUI(favorites);
    syncFooterPlacement();
  }

  function bindAccordionScope(scope) {
    if (!(scope instanceof HTMLElement)) return;
    scope.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest(".wishlist-side-trigger");
      if (!(trigger instanceof HTMLElement)) return;
      const parent = trigger.parentElement;
      if (parent instanceof HTMLElement) parent.classList.toggle("is-open");
    });
  }

  function bindWishlistPage() {
    const clearButton = document.getElementById("wishlist-clear");
    const list = document.getElementById("wishlist-list");
    const page = document.getElementById("wishlist-page");
    const orderToggle = document.getElementById("wishlist-order-toggle");
    const orderPopupClose = document.getElementById("wishlist-order-popup-close");
    const orderBackdrop = document.getElementById("wishlist-order-backdrop");
    const orderApply = document.getElementById("wishlist-order-apply");
    const giftingToggle = document.getElementById("wishlist-gifting-toggle");
    const cardChoiceButtons = Array.from(document.querySelectorAll("[data-wishlist-card-choice]"));
    const messageField = document.getElementById("wishlist-message-field");
    const notesField = document.getElementById("wishlist-notes-field");
    const dateTrigger = document.getElementById("wishlist-date-trigger");
    const timeTrigger = document.getElementById("wishlist-time-trigger");
    const timeGroup = document.getElementById("wishlist-time-group");
    const timePanel = document.getElementById("wishlist-time-panel");
    const timeChoiceButtons = Array.from(document.querySelectorAll("[data-wishlist-time-window]"));
    const shippingChoiceButtons = Array.from(document.querySelectorAll("[data-wishlist-shipping-choice]"));
    const consultButton = document.getElementById("wishlist-consult-button");
    const dateOptions = document.getElementById("wishlist-date-options");
    const dateCustomInput = document.getElementById("wishlist-date-custom-input");
    const dateCustomWrap = document.getElementById("wishlist-date-custom-wrap");

    if (orderToggle instanceof HTMLButtonElement && orderToggle.dataset.bound !== "1") {
      orderToggle.dataset.bound = "1";
      orderToggle.addEventListener("click", () => {
        const isOpen = document.body.classList.contains("wishlist-order-popup-open");
        setOrderPanelOpen(!isOpen);
      });
    }

    if (orderPopupClose instanceof HTMLButtonElement && orderPopupClose.dataset.bound !== "1") {
      orderPopupClose.dataset.bound = "1";
      orderPopupClose.addEventListener("click", () => {
        setOrderPanelOpen(false);
        if (orderToggle instanceof HTMLButtonElement) orderToggle.focus();
      });
    }

    if (orderBackdrop instanceof HTMLElement && orderBackdrop.dataset.bound !== "1") {
      orderBackdrop.dataset.bound = "1";
      orderBackdrop.addEventListener("click", () => {
        setOrderPanelOpen(false);
      });
    }

    if (clearButton instanceof HTMLButtonElement && clearButton.dataset.bound !== "1") {
      clearButton.dataset.bound = "1";
      clearButton.addEventListener("click", () => {
        window.MarvellFavorites?.clearFavorites?.();
        renderWishlist();
      });
    }

    if (list instanceof HTMLElement && list.dataset.bound !== "1") {
      list.dataset.bound = "1";
      list.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const qtyOption = target.closest("[data-wishlist-quantity-option]");
        if (qtyOption instanceof HTMLElement) {
          event.preventDefault();
          const itemId = qtyOption.getAttribute("data-wishlist-quantity-option");
          const value = qtyOption.getAttribute("data-quantity-value");
          if (!itemId || !value) return;
          window.MarvellFavorites?.setFavoriteQuantity?.(itemId, value);
          renderWishlist();
          return;
        }
        const qtyTrigger = target.closest("[data-wishlist-quantity-trigger]");
        if (qtyTrigger instanceof HTMLElement) {
          event.preventDefault();
          const container = qtyTrigger.closest(".wishlist-card-qty");
          if (!(container instanceof HTMLElement)) return;
          const shouldOpen = !container.classList.contains("is-open");
          list.querySelectorAll(".wishlist-card-qty.is-open").forEach((node) => {
            if (node instanceof HTMLElement) {
              node.classList.remove("is-open");
              node.querySelector(".wishlist-card-qty-trigger")?.setAttribute("aria-expanded", "false");
            }
          });
          if (shouldOpen) {
            container.classList.add("is-open");
            qtyTrigger.setAttribute("aria-expanded", "true");
          }
          return;
        }
        const remove = target.closest("[data-wishlist-remove]");
        if (remove instanceof HTMLElement) {
          event.preventDefault();
          const itemId = remove.getAttribute("data-wishlist-remove");
          if (!itemId) return;
          window.MarvellFavorites?.removeFavorite?.(itemId);
          renderWishlist();
        }
      });
    }

    if (giftingToggle instanceof HTMLButtonElement && giftingToggle.dataset.bound !== "1") {
      giftingToggle.dataset.bound = "1";
      giftingToggle.addEventListener("click", () => {
        consultationConfig.giftingEnabled = !consultationConfig.giftingEnabled;
        if (!consultationConfig.giftingEnabled) {
          consultationConfig.cardChoice = "blank-card";
          consultationConfig.message = "";
          if (messageField instanceof HTMLTextAreaElement) messageField.value = "";
        }
        markOrderDetailsDirty();
        writeConsultationConfig(consultationConfig);
        syncConsultationUI();
      });
    }

    cardChoiceButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.bound === "1") return;
      button.dataset.bound = "1";
      button.addEventListener("click", () => {
        consultationConfig.cardChoice = button.dataset.wishlistCardChoice === "add-message" ? "add-message" : "blank-card";
        if (consultationConfig.cardChoice !== "add-message") {
          consultationConfig.message = "";
          if (messageField instanceof HTMLTextAreaElement) messageField.value = "";
        } else if (messageField instanceof HTMLTextAreaElement) {
          window.requestAnimationFrame(() => messageField.focus());
        }
        markOrderDetailsDirty();
        writeConsultationConfig(consultationConfig);
        syncConsultationUI();
      });
    });

    if (messageField instanceof HTMLTextAreaElement && messageField.dataset.bound !== "1") {
      messageField.dataset.bound = "1";
      messageField.addEventListener("input", () => {
        consultationConfig.message = messageField.value;
        markOrderDetailsDirty();
        writeConsultationConfig(consultationConfig);
        syncConsultationUI();
      });
    }

    if (notesField instanceof HTMLTextAreaElement && notesField.dataset.bound !== "1") {
      notesField.dataset.bound = "1";
      notesField.addEventListener("input", () => {
        consultationConfig.notes = notesField.value;
        markOrderDetailsDirty();
        writeConsultationConfig(consultationConfig);
        syncConsultationUI();
      });
    }

    if (timeTrigger instanceof HTMLButtonElement && timeTrigger.dataset.bound !== "1") {
      timeTrigger.dataset.bound = "1";
      timeTrigger.addEventListener("click", () => {
        if (!(timeGroup instanceof HTMLElement)) return;
        const isOpen = timeGroup.classList.contains("is-open");
        timeGroup.classList.toggle("is-open", !isOpen);
        timeTrigger.setAttribute("aria-expanded", !isOpen ? "true" : "false");
        syncConsultationUI();
      });
    }

    timeChoiceButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.bound === "1") return;
      button.dataset.bound = "1";
      button.addEventListener("click", () => {
        if (button.disabled || button.classList.contains("is-unavailable")) return;
        const value = button.dataset.wishlistTimeWindow === "afternoon" ? "afternoon" : "morning";
        consultationConfig.timeWindow = consultationConfig.timeWindow === value ? "" : value;
        if (timeGroup instanceof HTMLElement && consultationConfig.timeWindow) {
          timeGroup.classList.remove("is-open");
        }
        if (timeTrigger instanceof HTMLButtonElement) {
          timeTrigger.setAttribute("aria-expanded", "false");
        }
        markOrderDetailsDirty();
        writeConsultationConfig(consultationConfig);
        syncConsultationUI();
      });
    });

    shippingChoiceButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.bound === "1") return;
      button.dataset.bound = "1";
      button.addEventListener("click", () => {
        const value = button.dataset.wishlistShippingChoice === "pickup" ? "pickup" : "delivery";
        consultationConfig.deliveryMode = consultationConfig.deliveryMode === value ? "" : value;
        markOrderDetailsDirty();
        writeConsultationConfig(consultationConfig);
        syncConsultationUI();
      });
    });

    if (dateTrigger instanceof HTMLButtonElement && dateTrigger.dataset.bound !== "1") {
      dateTrigger.dataset.bound = "1";
      dateTrigger.addEventListener("click", () => {
        wishlistDateCustomPickerOpen = false;
        setOrderPopupView("dates");
        renderDateOptions();
      });
    }

    if (dateOptions instanceof HTMLElement && dateOptions.dataset.bound !== "1") {
      dateOptions.dataset.bound = "1";
      dateOptions.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const option = target.closest("[data-wishlist-date-option]");
        if (!(option instanceof HTMLElement)) return;
        const value = option.getAttribute("data-wishlist-date-option");
        if (!value) return;
        if (option.classList.contains("is-unavailable")) return;
        if (value === "other") {
          wishlistDateCustomPickerOpen = !wishlistDateCustomPickerOpen;
          if (dateCustomInput instanceof HTMLInputElement) {
            window.requestAnimationFrame(() => dateCustomInput.focus());
          }
          consultationConfig.preferredDateUnsure = false;
          consultationConfig.preferredDate = consultationConfig.preferredDate && !isPresetDate(consultationConfig.preferredDate)
            ? consultationConfig.preferredDate
            : "";
        } else if (value === "unsure") {
          wishlistDateCustomPickerOpen = false;
          consultationConfig.preferredDate = "";
          consultationConfig.preferredDateUnsure = true;
          closeDatePanel();
        } else {
          wishlistDateCustomPickerOpen = false;
          consultationConfig.preferredDate = value;
          consultationConfig.preferredDateUnsure = false;
          closeDatePanel();
        }
        markOrderDetailsDirty();
        writeConsultationConfig(consultationConfig);
        syncConsultationUI();
      });
    }

    if (dateCustomInput instanceof HTMLInputElement && dateCustomInput.dataset.bound !== "1") {
      dateCustomInput.dataset.bound = "1";
      const syncCustomDate = () => {
        wishlistDateCustomPickerOpen = true;
        consultationConfig.preferredDate = window.MarvellConsultation?.toIsoDate?.(dateCustomInput.value) || "";
        consultationConfig.preferredDateUnsure = false;
        markOrderDetailsDirty();
        writeConsultationConfig(consultationConfig);
        syncConsultationUI();
      };
      dateCustomInput.addEventListener("input", syncCustomDate);
      dateCustomInput.addEventListener("change", () => {
        syncCustomDate();
        if (consultationConfig.preferredDate) closeDatePanel();
      });
    }

    if (orderApply instanceof HTMLButtonElement && orderApply.dataset.bound !== "1") {
      orderApply.dataset.bound = "1";
      orderApply.addEventListener("click", () => {
        if (orderApply.disabled || !hasEffectiveOrderDetails(getFavorites(), consultationConfig)) return;
        hasReviewedOrderDetails = true;
        setOrderPanelOpen(false);
        syncConsultationUI();
        if (consultButton instanceof HTMLAnchorElement) {
          window.requestAnimationFrame(() => consultButton.focus());
        }
      });
    }

    if (consultButton instanceof HTMLAnchorElement && consultButton.dataset.bound !== "1") {
      consultButton.dataset.bound = "1";
      consultButton.addEventListener("click", (event) => {
        if (!hasEffectiveOrderDetails(getFavorites(), consultationConfig) || !hasReviewedOrderDetails) {
          event.preventDefault();
          setOrderPanelOpen(true);
        }
      });
    }

    if (page instanceof HTMLElement && page.dataset.wishlistOutsideBound !== "1") {
      page.dataset.wishlistOutsideBound = "1";
      page.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest(".wishlist-card-qty")) return;
        page.querySelectorAll(".wishlist-card-qty.is-open").forEach((node) => {
          if (node instanceof HTMLElement) {
            node.classList.remove("is-open");
            node.querySelector(".wishlist-card-qty-trigger")?.setAttribute("aria-expanded", "false");
          }
        });
      });
    }

    if (document.body instanceof HTMLElement && document.body.dataset.wishlistDateEscapeBound !== "1") {
      document.body.dataset.wishlistDateEscapeBound = "1";
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (document.body.classList.contains("wishlist-order-popup-open") && wishlistOrderPopupView === "dates") {
          closeDatePanel();
          if (dateTrigger instanceof HTMLButtonElement) dateTrigger.focus();
          return;
        }
        if (document.body.classList.contains("wishlist-order-popup-open")) {
          setOrderPanelOpen(false);
          if (orderToggle instanceof HTMLButtonElement) orderToggle.focus();
          return;
        }
      });
    }

    bindAccordionScope(page);
    window.addEventListener("storage", () => {
      consultationConfig = readConsultationConfig();
      hasReviewedOrderDetails = false;
      renderWishlist();
    });
    window.addEventListener("pageshow", () => {
      consultationConfig = readConsultationConfig();
      hasReviewedOrderDetails = false;
      renderWishlist();
    });
  }

  function initialize() {
    bindWishlistPage();
    renderWishlist();
    syncFooterPlacement();
    if (document.body instanceof HTMLElement && typeof MutationObserver === "function") {
      const observer = new MutationObserver(() => syncFooterPlacement());
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
