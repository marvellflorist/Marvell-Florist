(function () {
  if (typeof document === "undefined") return;
  const WISHLIST_NOTE_STORAGE_KEY = "marvell-wishlist-note-v1";
  const WISHLIST_NOTE_ENABLED_STORAGE_KEY = "marvell-wishlist-note-enabled-v1";

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

  function readWishlistNote() {
    try {
      return String(window.localStorage.getItem(WISHLIST_NOTE_STORAGE_KEY) || "");
    } catch (_error) {
      return "";
    }
  }

  function writeWishlistNote(value) {
    try {
      window.localStorage.setItem(WISHLIST_NOTE_STORAGE_KEY, String(value ?? ""));
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  function readWishlistNoteEnabled() {
    try {
      return window.localStorage.getItem(WISHLIST_NOTE_ENABLED_STORAGE_KEY) === "true";
    } catch (_error) {
      return false;
    }
  }

  function writeWishlistNoteEnabled(value) {
    try {
      window.localStorage.setItem(WISHLIST_NOTE_ENABLED_STORAGE_KEY, value ? "true" : "false");
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
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

  function getFloralBoardCount(item) {
    const source = [
      String(item?.title || ""),
      String(item?.image || ""),
      String(item?.href || ""),
      String(item?.category || "")
    ].join(" ").toLowerCase();

    if (
      source.includes("3papan")
      || source.includes("3 papan")
      || source.includes("papan3")
      || source.includes("triple")
    ) {
      return 3;
    }

    if (
      source.includes("2papan")
      || source.includes("2 papan")
      || source.includes("papan2")
      || source.includes("double")
    ) {
      return 2;
    }

    if (
      source.includes("1papan")
      || source.includes("1 papan")
      || source.includes("papan1")
      || source.includes("single")
    ) {
      return 1;
    }

    return 1;
  }

  function buildConsultationHref(favorites, personalMessage = "") {
    const items = Array.isArray(favorites) ? favorites : [];
    const listedTitles = items
      .map((item) => {
        const title = String(item?.title || "").trim();
        if (!title) return "";
        const quantity = Math.max(1, Number.parseInt(String(item?.quantity ?? 1), 10) || 1);
        return quantity > 1 ? `${title} (Qty: ${quantity})` : title;
      })
      .filter(Boolean)
      .slice(0, 8);

    const lines = [
      getLanguage() === "id"
        ? "Halo Marvell Florist, saya ingin berkonsultasi mengenai wishlist saya."
        : "Hello Marvell Florist, I would like to consult about my wishlist selections."
    ];
    if (listedTitles.length) {
      lines.push("");
      listedTitles.forEach((title) => lines.push(`- ${title}`));
    }
    const note = String(personalMessage || "").trim();
    if (note) {
      lines.push("");
      lines.push(
        getLanguage() === "id"
          ? "Pesan pribadi:"
          : "Personal message:"
      );
      lines.push(note);
    }
    const message = lines.join("\n");

    return `https://wa.me/6281275017456?text=${encodeURIComponent(message.trim())}`;
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

  function renderWishlist() {
    const favorites = getFavorites();
    const hasItems = favorites.length > 0;
    document.title = t("Wishlist | Marvell Florist", "Wishlist | Marvell Florist");

    const emptyStage = document.getElementById("wishlist-empty-stage");
    const filledStage = document.getElementById("wishlist-filled-stage");
    const list = document.getElementById("wishlist-list");
    const clearButton = document.getElementById("wishlist-clear");
    const page = document.getElementById("wishlist-page");
    const personalMessageField = document.getElementById("wishlist-personal-message");
    const personalMessageToggle = document.getElementById("wishlist-message-toggle");
    const personalMessageSection = document.getElementById("wishlist-message-box");
    const personalMessage = readWishlistNote();
    const personalMessageEnabled = readWishlistNoteEnabled();

    if (page instanceof HTMLElement) {
      page.dataset.mode = hasItems ? "filled" : "empty";
    }
    if (emptyStage) {
      emptyStage.hidden = hasItems;
      emptyStage.setAttribute("aria-hidden", hasItems ? "true" : "false");
    }
    if (filledStage) {
      filledStage.hidden = !hasItems;
      filledStage.setAttribute("aria-hidden", hasItems ? "false" : "true");
    }
    if (clearButton) clearButton.hidden = !hasItems;

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
    setText(
      "wishlist-selections-kicker",
      favorites.length === 1
        ? t("Your Selection", "Pilihan Anda")
        : t("Your Selections", "Pilihan Anda")
    );
    setText(
      "wishlist-selections-count",
      favorites.length === 1
        ? t("1 saved arrangement", "1 rangkaian tersimpan")
        : t(`${favorites.length} saved arrangements`, `${favorites.length} rangkaian tersimpan`)
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
    setText(
      "wishlist-service-hours-days",
      t("Monday to Saturday 8am-6pm WIB", "Senin sampai Sabtu 08.00-18.00 WIB")
    );
    setText("wishlist-service-hours-time", "");
    const serviceHoursTime = document.getElementById("wishlist-service-hours-time");
    if (serviceHoursTime instanceof HTMLElement) serviceHoursTime.hidden = true;
    setText(
      "wishlist-service-copy",
      t(
        "Send your wishlist on WhatsApp and we will review each arrangement with you before anything is finalized.",
        "Kirim wishlist Anda lewat WhatsApp dan kami akan meninjau setiap rangkaian bersama Anda sebelum semuanya dipastikan."
      )
    );
    setText(
      "wishlist-service-step-1",
      t(
        "Share your saved wishlist and any notes you want us to consider.",
        "Bagikan wishlist yang sudah disimpan beserta catatan yang ingin Anda sampaikan."
      )
    );
    setText(
      "wishlist-service-step-2",
      t(
        "We confirm design direction, availability, delivery timing, and final pricing with you.",
        "Kami mengonfirmasi arah desain, ketersediaan, waktu pengiriman, dan harga akhir bersama Anda."
      )
    );
    setText(
      "wishlist-service-step-3",
      t(
        "After confirmation, payment and preparation continue according to the agreed arrangement.",
        "Setelah dikonfirmasi, pembayaran dan persiapan akan dilanjutkan sesuai rangkaian yang sudah disepakati."
      )
    );
    setText(
      "wishlist-service-note",
      t(
        "Fixed-price items stay visible in your wishlist, while custom details are confirmed during consultation.",
        "Item dengan harga tetap tetap terlihat di wishlist Anda, sementara detail kustom dikonfirmasi saat konsultasi."
      )
    );
    setText("wishlist-service-link-primary", t("Consult on WhatsApp", "Konsultasi via WhatsApp"));
    setText("wishlist-assurance-custom-title", t("Customizable", "Dapat disesuaikan"));
    setText("wishlist-assurance-availability-title", t("Availability Discussed", "Ketersediaan Dibahas"));
    setText("wishlist-assurance-delivery-title", t("Delivery Coordinated", "Pengiriman Dikoordinasikan"));
    setText("wishlist-message-title", t("Add a Message", "Tambahkan Pesan"));
    setText(
      "wishlist-message-copy",
      t(
        "Add a note for the card or share anything we should know.",
        "Tambahkan catatan untuk kartu atau hal lain yang perlu kami ketahui."
      )
    );
    if (personalMessageSection instanceof HTMLElement) {
      personalMessageSection.classList.toggle("is-open", personalMessageEnabled);
    }
    if (personalMessageToggle instanceof HTMLButtonElement) {
      personalMessageToggle.setAttribute("aria-pressed", personalMessageEnabled ? "true" : "false");
      personalMessageToggle.setAttribute("aria-expanded", personalMessageEnabled ? "true" : "false");
    }
    if (personalMessageField instanceof HTMLTextAreaElement) {
      personalMessageField.placeholder = t(
        "A message for the card or any details to guide the arrangement.",
        "Pesan untuk kartu atau detail apa pun yang dapat membantu kami menyiapkan rangkaiannya."
      );
      if (personalMessageField.value !== personalMessage) {
        personalMessageField.value = personalMessage;
      }
      personalMessageField.disabled = !personalMessageEnabled;
    }

    const consultationHref = buildConsultationHref(favorites, personalMessageEnabled ? personalMessage : "");
    const serviceButton = document.getElementById("wishlist-service-link-primary");
    if (serviceButton instanceof HTMLAnchorElement) {
      serviceButton.href = consultationHref;
    }
    const consultButton = document.getElementById("wishlist-consult-button");
    if (consultButton instanceof HTMLAnchorElement) {
      consultButton.textContent = t("Consult on WhatsApp", "Konsultasi via WhatsApp");
      consultButton.href = consultationHref;
    }
    const emptyPrimary = document.getElementById("wishlist-empty-primary");
    if (emptyPrimary instanceof HTMLAnchorElement) {
      emptyPrimary.href = localizedHref("gallery.html?entry=home-cta");
    }
    const emptySecondary = document.getElementById("wishlist-empty-secondary");
    if (emptySecondary instanceof HTMLAnchorElement) {
      emptySecondary.href = localizedHref("featured.html");
    }

    if (!(list instanceof HTMLElement)) return;
    if (!hasItems) {
      list.innerHTML = "";
      syncFooterPlacement();
      return;
    }

    list.innerHTML = favorites.map((item) => {
      const href = localizedHref(item.href || "");
      const quantity = Math.max(1, Number.parseInt(String(item.quantity ?? 1), 10) || 1);
      const usesBoardAmount = isFloralBoardCategory(item.category);
      const boardCount = getFloralBoardCount(item);
      const boardAmountLabel = boardCount === 1
        ? t("1 Board", "1 Papan")
        : t(`${boardCount} Boards`, `${boardCount} Papan`);
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
                <div class="wishlist-card-qty${quantity > 0 ? "" : ""}">
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
      if (!(parent instanceof HTMLElement)) return;
      parent.classList.toggle("is-open");
    });
  }

  function bindWishlistPage() {
    const clearButton = document.getElementById("wishlist-clear");
    const list = document.getElementById("wishlist-list");
    const page = document.getElementById("wishlist-page");
    const personalMessageField = document.getElementById("wishlist-personal-message");
    const personalMessageToggle = document.getElementById("wishlist-message-toggle");

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
        if (!(remove instanceof HTMLElement)) return;
        event.preventDefault();
        const itemId = remove.getAttribute("data-wishlist-remove");
        if (!itemId) return;
        window.MarvellFavorites?.removeFavorite?.(itemId);
        renderWishlist();
      });
    }

    if (personalMessageField instanceof HTMLTextAreaElement && personalMessageField.dataset.bound !== "1") {
      personalMessageField.dataset.bound = "1";
      const persistNote = () => {
        writeWishlistNote(personalMessageField.value);
        renderWishlist();
      };
      personalMessageField.addEventListener("input", persistNote);
      personalMessageField.addEventListener("change", persistNote);
    }

    if (personalMessageToggle instanceof HTMLButtonElement && personalMessageToggle.dataset.bound !== "1") {
      personalMessageToggle.dataset.bound = "1";
      personalMessageToggle.addEventListener("click", () => {
        const nextValue = !readWishlistNoteEnabled();
        writeWishlistNoteEnabled(nextValue);
        renderWishlist();
        if (nextValue) {
          window.requestAnimationFrame(() => {
            const field = document.getElementById("wishlist-personal-message");
            if (field instanceof HTMLTextAreaElement) field.focus();
          });
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

    bindAccordionScope(page);
    window.addEventListener("storage", renderWishlist);
    window.addEventListener("pageshow", renderWishlist);
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
