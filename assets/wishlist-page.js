/**
 * The wishlist page — the room, where the quick panel is the doorway.
 *
 * The panel exists to save a piece in one tap and get out of the way. This
 * page is the other half: everything saved, large enough to look at, and the
 * only place lists are made, named, shared or taken apart.
 *
 * It is deliberately not the bag. A bag is decisions already made, so it is a
 * column of rows with quantities and a total. A wishlist is things still being
 * considered, so it is photography on a grid and nothing is counted up.
 *
 * Two audiences, one page:
 *
 *   signed out   one list, kept in this browser. No index, because there is
 *                nothing to choose between, and no sharing, because there is
 *                no account to share from.
 *   signed in    every list, starting at the index. The default list is the
 *                one the heart writes to and is never deletable.
 *
 * All account writes go through MarvellFavorites.accountOperation, which is
 * the same serialized queue the heart uses. That is what keeps this page and
 * the panel from ever holding different ideas of the same list.
 */
(function () {
  if (typeof window === "undefined") return;

  const main = document.getElementById("wishlist-main");
  if (!main) return;

  const state = { busy: false, renaming: false, renamingCard: "" };

  const Favorites = () => window.MarvellFavorites;

  /**
   * Three states, not two.
   *
   *   guest        nobody is signed in. One list, kept in this browser, and
   *                the offer to sign in at the foot.
   *   customer     signed in and their lists are loaded. The index, sharing,
   *                renaming — everything Dior's account wishlist has.
   *   unreachable  signed in, but the wishlist store would not answer. The
   *                pieces on this device are shown so nothing looks lost,
   *                and the reason is said plainly.
   *
   * `signedIn()` used to mean the middle one and was used for all three,
   * which meant an unreachable store presented a signed-in customer with a
   * guest's page — no lists, and an invitation to sign in that they could
   * not act on because they already had.
   */
  const accountState = () => Favorites()?.accountState?.()
    || { signedIn: false, synced: Boolean(Favorites()?.isAccountWishlist?.()), unavailable: false };
  /** The person. Decides what the page says. */
  const signedIn = () => Boolean(accountState().signedIn);
  /** The store. Decides what the page can show. */
  const listsLoaded = () => Boolean(accountState().synced);
  const snapshot = () => Favorites()?.accountSnapshot?.() || { listId: "", lists: [], items: {} };

  function getLanguage() {
    return window.MarvellLanguage?.getLanguage?.() === "id" ? "id" : "en";
  }
  function t(en, id) {
    return getLanguage() === "id" ? id : en;
  }
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  const el = (selector) => main.querySelector(selector);
  const els = (selector) => Array.from(main.querySelectorAll(selector));
  const editIcon = () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>';
  const optionsIcon = () => '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>';

  /** Only ever a path on this site, never a URL somebody else supplied. */
  function safeHref(value) {
    const raw = String(value || "").trim();
    if (!raw || raw.startsWith("//")) return "";
    if (/^https?:/i.test(raw)) {
      try {
        const url = new URL(raw);
        return url.origin === window.location.origin ? url.pathname + url.search : "";
      } catch (_error) {
        return "";
      }
    }
    return raw.startsWith("/") ? raw : "";
  }

  // -- which view, and which list ------------------------------------------

  /**
   * The list in the address bar. A signed-out visitor has exactly one list
   * and never carries an id, so the parameter is ignored for them entirely.
   */
  function readListFromUrl() {
    try {
      return String(new URL(window.location.href).searchParams.get("list") || "").trim();
    } catch (_error) {
      return "";
    }
  }

  /**
   * The open list is read from the address, never held beside it.
   *
   * Holding it in state meant reading the sign-in flag at the moment the
   * account-change event fired, which is a race: this page and favorites.js
   * both listen for that event, and whichever runs first decides what the
   * other sees. The address is already the truth, survives a reload and a
   * shared link, and cannot disagree with itself.
   */
  function activeListId() {
    return listsLoaded() ? readListFromUrl() : "";
  }

  function setListInUrl(listId, { replace = false } = {}) {
    try {
      const url = new URL(window.location.href);
      if (listId) url.searchParams.set("list", listId);
      else url.searchParams.delete("list");
      window.history[replace ? "replaceState" : "pushState"]({ list: listId }, "", url);
    } catch (_error) {
      // A browser without history is still shown the right view.
    }
  }

  function currentList() {
    const { lists, listId } = snapshot();
    const wanted = activeListId();
    return lists.find((list) => list.id === wanted)
      || lists.find((list) => list.id === listId)
      || null;
  }

  /** The pieces on screen: the account's list, or the device's one list. */
  function currentItems() {
    if (!listsLoaded()) return Favorites()?.getFavorites?.() || [];
    const list = currentList();
    return list ? (snapshot().items[list.id] || []) : [];
  }

  // -- drawing --------------------------------------------------------------

  function note(target, message, tone = "") {
    const node = el(target);
    if (!node) return;
    node.textContent = message || "";
    node.hidden = !message;
    if (tone) node.dataset.tone = tone;
    else delete node.dataset.tone;
  }

  function itemMarkup(item) {
    const href = safeHref(item.href);
    const media = `<span class="shop-card-media">${item.image
      ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">` : ""}</span>`;
    const name = escapeHtml(item.title || t("Saved arrangement", "Rangkaian tersimpan"));
    return `
      <li class="shop-card" data-wl-item="${escapeHtml(item.id)}">
        ${href
          ? `<a class="wl-media-link" href="${escapeHtml(href)}">${media}</a>` : media}
        <div class="wl-product-copy">
          <div class="wl-card-foot">
            ${href ? `<a class="wl-product-title" href="${escapeHtml(href)}">${name}</a>` : `<span class="wl-product-title">${name}</span>`}
            ${item.price ? `<span class="wl-product-price">${escapeHtml(item.price)}</span>` : ""}
          </div>
          <div class="wl-item-actions">
            <button class="wl-text-action" type="button" data-wishlist-bag="${escapeHtml(item.id)}" hidden>${escapeHtml(t("Add to bag", "Tambah ke tas"))}</button>
            ${signedIn() && listsLoaded() ? "" : `<button class="wl-text-action" type="button" data-wl-remove="${escapeHtml(item.id)}">${escapeHtml(t("Remove", "Hapus"))}</button>`}
          </div>
        </div>
        ${signedIn() && listsLoaded() ? `<div class="wl-item-menu" data-open="false">
          <button class="wl-item-menu-trigger" type="button" data-wl-item-menu-trigger aria-expanded="false">
            ${editIcon()}<span>${escapeHtml(t("Edit", "Ubah"))}</span>
          </button>
          <div class="wl-item-menu-list">
            <div class="wl-item-menu-head"><span>${escapeHtml(t("Organise piece", "Atur rangkaian"))}</span><button type="button" data-wl-item-menu-close aria-label="${escapeHtml(t("Close", "Tutup"))}">×</button></div>
            <button class="wl-item-menu-choice" type="button" data-wl-create-for-item="${escapeHtml(item.id)}">${escapeHtml(t("Create a new wishlist", "Buat wishlist baru"))}</button>
            ${snapshot().lists.length > 1 ? ["move", "copy"].map((action) => `
              <p class="wl-item-menu-label">${escapeHtml(action === "move" ? t("Move to", "Pindahkan ke") : t("Copy to", "Salin ke"))}</p>
              ${snapshot().lists.filter((list) => list.id !== currentList()?.id).map((list) => `
                <button class="wl-item-menu-choice" type="button" data-wl-transfer="${action}" data-wl-to="${escapeHtml(list.id)}" data-wl-item="${escapeHtml(item.id)}">${escapeHtml(list.name)}</button>
              `).join("")}
            `).join("") : ""}
            <button class="wl-item-menu-remove" type="button" data-wl-remove="${escapeHtml(item.id)}">${escapeHtml(t("Remove", "Hapus"))}</button>
          </div>
        </div>` : ""}
      </li>
    `;
  }

  /**
   * The name a new list is born with.
   *
   * Naming a list before it exists is a form to fill in before anything has
   * been saved to it, which is the wrong order: the list is the point, the
   * name is an afterthought. So it arrives as "Wishlist 2" and is renamed
   * later, from its own Options menu, if it is ever worth naming.
   *
   * The first free number is used rather than the count, so deleting
   * "Wishlist 2" and making another does not produce two of them.
   */
  function nextListName() {
    const taken = new Set(
      snapshot().lists.map((list) => String(list.name || "").trim().toLowerCase())
    );
    const base = t("Wishlist", "Wishlist");
    let index = 1;
    while (taken.has(`${base} ${index}`.toLowerCase())) index += 1;
    return `${base} ${index}`;
  }

  function renderIndex() {
    const { lists, items, listId: defaultId } = snapshot();
    el("[data-wl-tally]").textContent = ` (${lists.length})`;
    const create = el("[data-wl-create]");
    create.textContent = t("Create a new wishlist", "Buat wishlist baru");
    create.disabled = state.busy;

    el("[data-wl-lists]").innerHTML = lists.map((list) => {
      const allRows = items[list.id] || [];
      const rows = allRows.slice(0, 4);
      const cells = (rows.length ? rows : [null]).map((item, index) => {
        return `<span class="wl-collage-cell">${item?.image
          ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">` : ""}${index === 3 && allRows.length > 4
          ? `<span class="wl-collage-more">+${allRows.length - 4}</span>` : ""}</span>`;
      }).join("");
      const collage = `<span class="wl-collage" data-count="${rows.length}">${cells}</span>`;
      // Renaming happens where the name is, rather than by opening the list
      // to find the control. The card turns into its own field.
      if (state.renamingCard === list.id) {
        return `
          <li class="wl-list-card">
            ${collage}
            <form class="wl-card-rename" data-wl-card-rename-form="${escapeHtml(list.id)}">
              <input type="text" maxlength="80" value="${escapeHtml(list.name)}"
                data-wl-card-rename-input aria-label="${escapeHtml(t("List name", "Nama daftar"))}">
              <div class="wl-card-rename-actions">
                <button type="submit">${escapeHtml(t("Save", "Simpan"))}</button>
                <button type="button" data-wl-card-rename-cancel>${escapeHtml(t("Cancel", "Batal"))}</button>
              </div>
            </form>
          </li>
        `;
      }
      return `
        <li class="wl-list-card">
          <a class="wl-collage" data-count="${rows.length}" href="/wishlist?list=${encodeURIComponent(list.id)}"
            data-wl-open="${escapeHtml(list.id)}" aria-label="${escapeHtml(list.name)}">${cells}</a>
          <div class="wl-list-foot">
            <a class="wl-list-name" href="/wishlist?list=${encodeURIComponent(list.id)}"
              data-wl-open="${escapeHtml(list.id)}">${escapeHtml(list.name)}</a>
            <div class="wl-menu" data-open="false">
              <button class="wl-card-menu-trigger" type="button" aria-haspopup="true" aria-expanded="false"
                data-wl-card-menu-trigger
                aria-label="${escapeHtml(t(`Options for ${list.name}`, `Opsi untuk ${list.name}`))}">${optionsIcon()}</button>
              <ul class="wl-menu-list" data-align="end">
                <li><button type="button" data-wl-card-share="${escapeHtml(list.id)}">${escapeHtml(
                  list.shared_with_marvell ? t("Stop sharing with Marvell", "Berhenti berbagi dengan Marvell") : t("Share with Marvell", "Bagikan dengan Marvell")
                )}</button></li>
                <li><button type="button" data-wl-card-rename="${escapeHtml(list.id)}">${escapeHtml(
                  t("Rename list", "Ganti nama daftar")
                )}</button></li>
                ${list.id === defaultId ? "" : `<li><button type="button" data-destructive data-wl-card-delete="${escapeHtml(list.id)}">${escapeHtml(
                  t("Delete list", "Hapus daftar")
                )}</button></li>`}
              </ul>
            </div>
          </div>
        </li>
      `;
    }).join("");
  }

  function renderDetail() {
    const account = listsLoaded();
    const person = signedIn();
    const list = account ? currentList() : null;
    const items = currentItems();
    const isDefault = Boolean(list?.is_default);

    el("[data-wl-detail-top]").hidden = !account;
    el("[data-wl-back-label]").textContent = t("Back to all wishlists", "Kembali ke semua wishlist");
    const tally = items.length === 1
      ? escapeHtml(t("1 item", "1 item"))
      : escapeHtml(t(`${items.length} items`, `${items.length} item`));
    const detailName = el("[data-wl-detail-name]");
    detailName.innerHTML = `${escapeHtml(
      account ? (list?.name || t("Saved", "Tersimpan")) : t("Saved", "Tersimpan")
    )}<span class="wl-tally">${tally}</span>`;
    // Renaming replaces the title itself. Keeping the heading in the layout
    // while placing a second form farther down the sidebar made the control
    // feel detached from the name it was changing.
    detailName.hidden = state.renaming;

    // No caption. A wishlist that has pieces in it does not need a line
    // explaining where they are kept — the account already says that, and
    // repeating it on every visit turns the room into a status readout.
    // The only thing worth saying is said at the bottom, once, and only to
    // somebody who is not signed in.
    const sub = el("[data-wl-detail-sub]");
    sub.textContent = "";
    sub.hidden = true;

    // Somebody already signed in is never invited to sign in. If their lists
    // could not be reached, that is what the foot says instead — the pieces
    // above it are this device's, and saying so is the honest version of
    // what used to be a sign-in prompt they could do nothing with.
    const foot = el("[data-wl-foot]");
    if (foot) {
      if (person && !account) {
        foot.hidden = false;
        foot.textContent = t(
          "We could not reach your saved lists just now. These are the pieces saved on this device.",
          "Kami belum bisa menjangkau daftar tersimpan Anda. Ini adalah rangkaian yang tersimpan di perangkat ini."
        );
      } else if (!person && items.length) {
        foot.hidden = false;
        foot.innerHTML = `<button class="wl-linkish" type="button" data-account-open>${escapeHtml(
          t("Sign in to keep your wishlist anywhere.", "Masuk untuk menyimpan wishlist Anda di mana saja.")
        )}</button>`;
      } else {
        foot.hidden = true;
        foot.innerHTML = "";
      }
    }

    // Sharing is an account's to give, so a signed-out visitor is not offered
    // it. Off unless the customer turned it on, and separate from any
    // personalisation preference on their profile.
    const share = el("[data-wl-share]");
    share.hidden = !account;
    if (account) {
      el("[data-wl-share-input]").checked = Boolean(list?.shared_with_marvell);
      el("[data-wl-share-input]").disabled = state.busy;
      el("[data-wl-share-label]").textContent = t("Share this wishlist with Marvell", "Bagikan wishlist ini dengan Marvell");
      el("[data-wl-share-note]").textContent = t(
        "Share this list with Marvell if you would like our team to use it when assisting you. It is not public.",
        "Bagikan daftar ini dengan Marvell jika Anda ingin tim kami menggunakannya saat membantu Anda. Daftar ini tidak terbuka untuk umum."
      );
    }

    const menu = el("[data-wl-detail-menu]");
    menu.hidden = !account;
    el("[data-wl-detail-create]").hidden = !account;
    el("[data-wl-detail-create]").textContent = t("Create a new wishlist", "Buat wishlist baru");
    const detailMenuTrigger = el("[data-wl-detail-menu-trigger]");
    detailMenuTrigger.innerHTML = optionsIcon();
    detailMenuTrigger.setAttribute("aria-label", t("List options", "Opsi wishlist"));
    el("[data-wl-detail-menu-list]").innerHTML = account ? `
      <li><button type="button" data-wl-rename>${escapeHtml(t("Rename list", "Ganti nama daftar"))}</button></li>
      ${isDefault ? "" : `<li><button type="button" data-destructive data-wl-delete>${escapeHtml(t("Delete list", "Hapus daftar"))}</button></li>`}
    ` : "";

    el("[data-wl-rename-form]").hidden = !state.renaming;
    el("[data-wl-rename-save]").textContent = t("Save", "Simpan");
    el("[data-wl-rename-cancel]").textContent = t("Cancel", "Batal");

    el("[data-wl-items]").innerHTML = items.map((item) => itemMarkup(item)).join("");
    Favorites()?.bindBagActions?.(el("[data-wl-items]"), items);
    const empty = el("[data-wl-empty]");
    empty.hidden = Boolean(items.length);
    // Emptied as well as hidden. It used to keep whatever the last empty
    // render left in it, so a sign-in offer written while signed out stayed
    // in the page — invisible, but still there to be found.
    if (items.length) empty.innerHTML = "";
    // An empty list is the one place a sentence earns its keep: there is
    // nothing else on screen to explain what this room is for.
    if (!items.length) {
      empty.innerHTML = `
        <p class="wl-empty-lead">${escapeHtml(t("Nothing saved here yet", "Belum ada yang tersimpan di sini"))}</p>
        <p>${escapeHtml(t(
          "Tap the heart on any arrangement to keep it here.",
          "Ketuk ikon hati pada rangkaian mana pun untuk menyimpannya di sini."
        ))}</p>
        ${person ? "" : `<p><button class="wl-linkish" type="button" data-account-open>${escapeHtml(
          t("Sign in to keep your wishlist anywhere.", "Masuk untuk menyimpan wishlist Anda di mana saja.")
        )}</button></p>`}
      `;
    }
  }

  function render() {
    // A signed-out visitor has one list, so the index would be a page with a
    // single card on it. They go straight to the pieces — and so does a
    // customer whose lists could not be loaded, because an index of nothing
    // is worse than their pieces with an explanation under them.
    const showIndex = listsLoaded() && !activeListId();
    const accountNav = document.querySelector("[data-wl-account-nav]");
    if (accountNav) accountNav.hidden = !signedIn();
    el('[data-wl-view="index"]').hidden = !showIndex;
    el('[data-wl-view="detail"]').hidden = showIndex;
    if (showIndex) renderIndex();
    else renderDetail();
    window.MarvellIcons?.adopt?.(main);
  }

  // -- account writes -------------------------------------------------------

  /**
   * Every list change goes through the heart's queue, so this page and the
   * quick panel can never hold different ideas of the same list. The page is
   * redrawn from the snapshot the server returned, never from a guess.
   */
  async function operate(body, { noteTarget = "[data-wl-detail-note]" } = {}) {
    if (state.busy) return false;
    state.busy = true;
    note(noteTarget, "");
    try {
      await Favorites()?.accountOperation?.(body);
      return true;
    } catch (_error) {
      note(noteTarget, t("Please try again shortly.", "Silakan coba lagi sebentar."), "error");
      return false;
    } finally {
      state.busy = false;
      render();
    }
  }

  async function createList({ moveItemId = "" } = {}) {
    const before = new Set(snapshot().lists.map((list) => list.id));
    const sourceId = currentList()?.id;
    if (!await operate({ operation: "create_list", name: nextListName() }, { noteTarget: "[data-wl-note]" })) return;
    const made = snapshot().lists.find((list) => !before.has(list.id));
    if (!made) return;
    if (moveItemId && sourceId) {
      await operate({ operation: "move_item", from_list_id: sourceId,
        to_list_id: made.id, item_key: moveItemId });
    }
    // Made, then named. The list opens with its number already in the field,
    // so naming it is one gesture away and skipping it costs nothing — which
    // is the whole point of not asking for a name up front.
    state.renaming = true;
    setListInUrl(made.id);
    render();
    const input = el("[data-wl-rename-input]");
    if (input) {
      input.value = made.name || "";
      input.focus();
    }
  }

  function closeMenus() {
    els("[data-open]").forEach((menu) => {
      menu.dataset.open = "false";
      menu.querySelector("[aria-expanded]")?.setAttribute("aria-expanded", "false");
    });
  }

  // -- events ---------------------------------------------------------------

  main.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const open = target.closest("[data-wl-open]");
    if (open) {
      event.preventDefault();
      state.renamingCard = "";
      setListInUrl(open.getAttribute("data-wl-open") || "");
      render();
      return;
    }

    const itemTrigger = target.closest("[data-wl-item-menu-trigger]");
    if (itemTrigger) {
      const menu = itemTrigger.closest("[data-open]");
      const next = menu.dataset.open !== "true";
      closeMenus();
      menu.dataset.open = next ? "true" : "false";
      itemTrigger.setAttribute("aria-expanded", next ? "true" : "false");
      return;
    }
    if (target.closest("[data-wl-item-menu-close]")) {
      closeMenus();
      return;
    }

    if (target.closest("[data-wl-back]")) {
      event.preventDefault();
      state.renaming = false;
      setListInUrl("");
      render();
      return;
    }

    const cardTrigger = target.closest("[data-wl-card-menu-trigger]");
    if (cardTrigger) {
      const menu = cardTrigger.closest("[data-open]");
      const next = menu.dataset.open !== "true";
      closeMenus();
      menu.dataset.open = next ? "true" : "false";
      cardTrigger.setAttribute("aria-expanded", next ? "true" : "false");
      return;
    }

    const cardRename = target.closest("[data-wl-card-rename]");
    if (cardRename) {
      closeMenus();
      state.renamingCard = cardRename.getAttribute("data-wl-card-rename") || "";
      render();
      el("[data-wl-card-rename-input]")?.focus();
      return;
    }
    const cardShare = target.closest("[data-wl-card-share]");
    if (cardShare) {
      closeMenus();
      const list = snapshot().lists.find((entry) => entry.id === cardShare.getAttribute("data-wl-card-share"));
      if (!list) return;
      await operate({ operation: "set_share", list_id: list.id, shared: !list.shared_with_marvell },
        { noteTarget: "[data-wl-note]" });
      return;
    }
    if (target.closest("[data-wl-card-rename-cancel]")) {
      state.renamingCard = "";
      render();
      return;
    }

    const cardDelete = target.closest("[data-wl-card-delete]");
    if (cardDelete) {
      closeMenus();
      const id = cardDelete.getAttribute("data-wl-card-delete") || "";
      const list = snapshot().lists.find((entry) => entry.id === id);
      if (!list || list.is_default) return;
      const confirmed = window.confirm(t(
        `Delete "${list.name}"? The pieces in it are not deleted from anywhere else.`,
        `Hapus "${list.name}"? Rangkaian di dalamnya tidak dihapus dari tempat lain.`
      ));
      if (!confirmed) return;
      await operate({ operation: "delete_list", list_id: id }, { noteTarget: "[data-wl-note]" });
      return;
    }

    const trigger = target.closest("[data-wl-detail-menu-trigger]");
    if (trigger) {
      const menu = trigger.closest("[data-open]");
      const next = menu.dataset.open !== "true";
      closeMenus();
      menu.dataset.open = next ? "true" : "false";
      trigger.setAttribute("aria-expanded", next ? "true" : "false");
      return;
    }

    if (target.closest("[data-wl-create]")) {
      await createList();
      return;
    }

    if (target.closest("[data-wl-create-from-detail]")) {
      closeMenus();
      await createList();
      return;
    }

    const createForItem = target.closest("[data-wl-create-for-item]");
    if (createForItem) {
      closeMenus();
      await createList({ moveItemId: createForItem.getAttribute("data-wl-create-for-item") || "" });
      return;
    }

    if (target.closest("[data-wl-rename]")) {
      closeMenus();
      state.renaming = true;
      render();
      const input = el("[data-wl-rename-input]");
      input.value = currentList()?.name || "";
      input.focus();
      return;
    }
    if (target.closest("[data-wl-rename-cancel]")) {
      state.renaming = false;
      render();
      return;
    }

    const remove = target.closest("[data-wl-remove]");
    if (remove) {
      const id = remove.getAttribute("data-wl-remove") || "";
      if (!signedIn()) {
        // The device list is the heart's own store; removing goes through it
        // so the panel and the page stay one list.
        Favorites()?.removeFavorite?.(id);
        render();
        return;
      }
      await operate({ operation: "remove_item", list_id: currentList()?.id, item_key: id });
      return;
    }

    const transfer = target.closest("[data-wl-transfer]");
    if (transfer) {
      const from = currentList();
      const action = transfer.getAttribute("data-wl-transfer");
      const toId = transfer.getAttribute("data-wl-to");
      if (!from || !["move", "copy"].includes(action)) return;
      closeMenus();
      await operate({ operation: action === "move" ? "move_item" : "copy_item",
        from_list_id: from.id, to_list_id: toId, item_key: transfer.getAttribute("data-wl-item") });
      return;
    }

    if (target.closest("[data-wl-delete]")) {
      closeMenus();
      const list = currentList();
      if (!list || list.is_default) return;
      const confirmed = window.confirm(t(
        `Delete "${list.name}"? The pieces in it are not deleted from anywhere else.`,
        `Hapus "${list.name}"? Rangkaian di dalamnya tidak dihapus dari tempat lain.`
      ));
      if (!confirmed) return;
      if (await operate({ operation: "delete_list", list_id: list.id })) {
        setListInUrl("");
        render();
      }
      return;
    }

    if (!target.closest("[data-open]")) closeMenus();
  });

  document.querySelector("[data-wl-signout]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const response = await fetch("/api/account/session", { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error("sign out failed");
      window.location.assign("/wishlist");
    } catch (_error) {
      button.disabled = false;
      button.textContent = t("Please try again", "Coba lagi");
    }
  });

  main.addEventListener("change", async (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (!event.target.matches("[data-wl-share-input]")) return;
    const list = currentList();
    if (!list) return;
    const shared = event.target.checked;
    // Sharing is stored server-side and enforced there. Nothing about this
    // checkbox makes the list public or reachable by a guessable address.
    await operate({ operation: "set_share", list_id: list.id, shared });
  });

  main.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();

    const cardForm = form.closest("[data-wl-card-rename-form]");
    if (cardForm) {
      const id = cardForm.getAttribute("data-wl-card-rename-form") || "";
      const input = cardForm.querySelector("[data-wl-card-rename-input]");
      const name = String(input?.value || "").trim();
      if (!name || !id) return void input?.focus();
      if (await operate({ operation: "rename_list", list_id: id, name }, { noteTarget: "[data-wl-note]" })) {
        state.renamingCard = "";
        render();
      }
      return;
    }

    if (form.matches("[data-wl-rename-form]")) {
      const input = el("[data-wl-rename-input]");
      const name = String(input.value || "").trim();
      const list = currentList();
      if (!name || !list) return void input.focus();
      if (await operate({ operation: "rename_list", list_id: list.id, name })) {
        state.renaming = false;
        render();
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenus();
  });
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest("[data-open]")) closeMenus();
  });

  window.addEventListener("popstate", () => render());

  // The list can change under this page from three directions: the heart on
  // another tab, the quick panel on this one, and signing in or out.
  window.addEventListener("marvell:favorites-change", () => render());
  // Signing in or out changes which view is right, and the address already
  // says which list. Both orderings of this event render the same thing.
  window.addEventListener("marvell:account-change", () => render());

  /**
   * The account page keeps this room in a tab, and a tab is display:none
   * until it is chosen. An auto-fill grid measured inside a hidden panel has
   * no width to divide, so it comes back one column wide; the tab asks for a
   * redraw on the way in rather than this file watching for one.
   */
  window.MarvellWishlistPage = { render };

  function boot() {
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
