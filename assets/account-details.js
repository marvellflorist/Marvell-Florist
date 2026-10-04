/** The full account page shown after the server confirms an account. */
(function () {
  const root = document.querySelector('[data-join-step="done"]');
  if (!(root instanceof HTMLElement)) return;

  const Shop = window.MarvellShop;
  const t = Shop ? Shop.t : (en, id) => (document.documentElement.lang === "id" ? id : en);
  const requestedTab = new URL(window.location.href).searchParams.get("tab");
  /** The wishlist is one of these now, not a link off the page. */
  const TABS = ["profile", "orders", "wishlist", "preferences"];
  const state = { user: null, orders: null, ordersLoaded: false,
    tab: TABS.includes(requestedTab) ? requestedTab : "profile", busy: false };
  const find = (selector) => root.querySelector(selector);

  async function api(path, options = {}) {
    const response = await fetch(path, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        ...(options.body ? { "content-type": "application/json" } : {})
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
    const data = await response.json().catch(() => null);
    return { response, data };
  }

  function note(selector, message, error = false) {
    const node = find(selector);
    if (!node) return;
    node.textContent = message;
    node.hidden = !message;
    if (error) node.dataset.tone = "error";
    else delete node.dataset.tone;
  }

  function setText(selector, en, id) {
    const node = find(selector);
    if (node) node.textContent = t(en, id);
  }

  function translate() {
    setText('[data-details-tab="profile"]', "Personal details", "Detail pribadi");
    setText('[data-details-tab="orders"]', "My orders", "Pesanan saya");
    setText('[data-details-tab="wishlist"]', "My wishlist", "Wishlist saya");
    setText('[data-details-tab="preferences"]', "Preferences", "Preferensi");
    setText('[data-details-signout]', "Sign out", "Keluar");
    setText('#details-profile-heading', "Your information", "Informasi Anda");
    setText('[data-details-panel="profile"] .details-panel-head p',
      "Keep your contact information up to date for a smoother checkout.",
      "Perbarui informasi kontak Anda agar proses pemesanan lebih mudah.");
    setText('label[for="details-title"]', "Title", "Sapaan");
    setText('label[for="details-first-name"]', "First name", "Nama depan");
    setText('label[for="details-last-name"]', "Last name", "Nama belakang");
    setText('label[for="details-email"]', "Email address", "Alamat email");
    setText('label[for="details-phone"]', "Phone number", "Nomor telepon");
    const labels = {
      "": ["Select", "Pilih"], mr: ["Mr", "Bapak"], mrs: ["Mrs", "Ibu"],
      ms: ["Ms", "Ibu"], miss: ["Miss", "Nona"], mx: ["Mx", "Mx"]
    };
    find('#details-title')?.querySelectorAll('option').forEach((option) => {
      const pair = labels[option.value];
      if (pair) option.textContent = t(...pair);
    });
    setText('.details-hint', "Your sign-in email cannot be changed here.", "Email untuk masuk tidak dapat diubah di sini.");
    setText('[data-details-profile] .join-submit', "Save changes", "Simpan perubahan");
    setText('#details-orders-heading', "My orders", "Pesanan saya");
    setText('[data-details-panel="orders"] .details-panel-head p',
      "View your recent orders and their status.", "Lihat pesanan terbaru dan statusnya.");
    setText('#details-preferences-heading', "Preferences", "Preferensi");
    setText('[data-details-panel="preferences"] .details-panel-head p',
      "Choose the updates you would like to receive.", "Pilih kabar yang ingin Anda terima.");
    setText('[data-details-preferences] .join-check span',
      "News and collections", "Kabar dan koleksi");
    setText('[data-details-preferences] .join-submit', "Save preferences", "Simpan preferensi");
    setText('[data-join-open-panel]', "Open quick panel", "Buka panel cepat");
    setText('[data-join-continue]', "Continue browsing", "Lanjut menjelajah");
    if (state.ordersLoaded) showOrders();
  }

  function showTab(tab) {
    if (!TABS.includes(tab)) return;
    state.tab = tab;
    root.querySelectorAll('[data-details-tab]').forEach((button) => {
      if (button.getAttribute('data-details-tab') === tab) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    root.querySelectorAll('[data-details-panel]').forEach((panel) => {
      panel.hidden = panel.getAttribute('data-details-panel') !== tab;
    });
    if (tab === "orders" && !state.ordersLoaded) loadOrders();
    // The wishlist draws itself from the heart's snapshot, which may have
    // arrived while this panel was hidden — and a grid measured while its
    // panel is display:none comes out one column wide. Redrawn on the way in.
    if (tab === "wishlist") window.MarvellWishlistPage?.render?.();
    // Panels are written while hidden, and nothing hidden can be measured.
    // The retracing rules under this panel's links are found now it is up.
    window.MarvellShop?.adoptUnderlines?.(root);
  }

  function formatDate(value) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(t("en-GB", "id-ID"), {
      day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"
    }).format(date);
  }

  function formatMoney(value) {
    return Shop?.formatIdr?.(value) || new Intl.NumberFormat("id-ID", {
      style: "currency", currency: "IDR", maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function orderStatus(order) {
    if (["settlement", "capture"].includes(order.payment_status) || order.status === "paid") return t("Paid", "Lunas");
    if (order.status === "cancelled") return t("Cancelled", "Dibatalkan");
    if (order.status === "expired") return t("Expired", "Kedaluwarsa");
    if (order.status === "refunded") return t("Refunded", "Dikembalikan");
    return t("Awaiting payment", "Menunggu pembayaran");
  }

  function showOrders() {
    const container = find('[data-details-orders]');
    if (!container) return;
    container.replaceChildren();
    if (state.orders === null) {
      const message = document.createElement('p');
      message.className = 'details-empty';
      message.textContent = t("Loading your orders…", "Memuat pesanan Anda…");
      container.append(message);
      return;
    }
    if (!state.orders.length) {
      const message = document.createElement('p');
      message.className = 'details-empty';
      message.textContent = t("No orders yet.", "Belum ada pesanan.");
      container.append(message);
      return;
    }
    for (const order of state.orders) {
      const article = document.createElement('article');
      article.className = 'details-order';
      const top = document.createElement('div');
      top.className = 'details-order-top';
      const number = document.createElement('span');
      number.textContent = order.order_number || '';
      const total = document.createElement('span');
      total.textContent = formatMoney(order.total_idr);
      top.append(number, total);
      const meta = document.createElement('p');
      meta.className = 'details-order-meta';
      meta.textContent = [formatDate(order.created_at), orderStatus(order),
        order.delivery_method === 'delivery' ? t('Delivery', 'Pengantaran') : t('Collection', 'Ambil sendiri')
      ].filter(Boolean).join(' · ');
      article.append(top, meta);
      if (Array.isArray(order.items) && order.items.length) {
        const items = document.createElement('div');
        items.className = 'details-order-items';
        items.textContent = order.items.map((item) => `${item.name || ''} ×${item.quantity || 1}`).join(' · ');
        article.append(items);
      }
      container.append(article);
    }
  }

  async function loadOrders() {
    state.orders = null;
    showOrders();
    try {
      const { response, data } = await api('/api/account/orders');
      if (!response.ok || !data?.ok) throw new Error('orders unavailable');
      state.orders = Array.isArray(data.orders) ? data.orders : [];
      state.ordersLoaded = true;
      showOrders();
    } catch (_error) {
      const container = find('[data-details-orders]');
      if (!container) return;
      container.replaceChildren();
      const message = document.createElement('p');
      message.className = 'details-empty';
      message.textContent = t("We couldn't load your orders. Please try again.", "Kami tidak dapat memuat pesanan Anda. Silakan coba lagi.");
      container.append(message);
    }
  }

  function render(user) {
    if (!user?.profile_complete) return;
    if (state.user?.id !== user.id) {
      state.orders = null;
      state.ordersLoaded = false;
    }
    state.user = user;
    const fields = find('[data-details-profile]');
    fields.elements.title.value = user.title || '';
    fields.elements.first_name.value = user.first_name || '';
    fields.elements.last_name.value = user.last_name || '';
    fields.elements.email.value = user.email || '';
    fields.elements.phone.value = user.phone || '';
    for (const field of ["marketing_email_opt_in", "personal_recommendations_opt_in",
      "occasion_reminders_opt_in", "personal_service_opt_in"]) {
      find('[data-details-preferences]').elements[field].checked = Boolean(user[field]);
    }
    translate();
    showTab(state.tab);
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-details-tab]');
    if (!button) return;
    const tab = button.getAttribute('data-details-tab');
    if (!TABS.includes(tab)) return;
    showTab(tab);
    // ?tab= is already how this page is linked into; keeping it current
    // means a reload, a back button and a copied address all agree.
    try {
      const url = new URL(window.location.href);
      if (tab === "profile") url.searchParams.delete("tab");
      else url.searchParams.set("tab", tab);
      window.history.replaceState(window.history.state, "", url);
    } catch (_error) {
      // A browser without history still gets the right panel.
    }
  });

  find('[data-details-profile]').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.busy) return;
    const form = event.currentTarget;
    state.busy = true;
    note('[data-details-profile-note]', t('Saving…', 'Menyimpan…'));
    try {
      const { response, data } = await api('/api/account/session', {
        method: 'PATCH',
        body: {
          title: form.elements.title.value,
          first_name: form.elements.first_name.value.trim(),
          last_name: form.elements.last_name.value.trim(),
          phone: form.elements.phone.value.trim()
        }
      });
      if (!response.ok || !data?.ok || !data.user) throw new Error(data?.message || 'save failed');
      render(data.user);
      note('[data-details-profile-note]', t('Your details have been saved.', 'Detail Anda telah disimpan.'));
    } catch (_error) {
      note('[data-details-profile-note]',
        t("We couldn't save your details. Please try again.", "Kami tidak dapat menyimpan detail Anda. Silakan coba lagi."), true);
    } finally {
      state.busy = false;
    }
  });

  find('[data-details-preferences]').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.busy) return;
    state.busy = true;
    note('[data-details-preferences-note]', t('Saving…', 'Menyimpan…'));
    try {
      const form = event.currentTarget;
      const wanted = Object.fromEntries(["marketing_email_opt_in", "personal_recommendations_opt_in",
        "occasion_reminders_opt_in", "personal_service_opt_in"]
        .map((field) => [field, Boolean(form.elements[field].checked)]));
      const { response, data } = await api('/api/account/session', {
        method: 'PATCH', body: wanted
      });
      if (!response.ok || !data?.ok || !data.user) throw new Error(data?.message || 'save failed');
      render(data.user);
      note('[data-details-preferences-note]', t('Your preferences have been saved.', 'Preferensi Anda telah disimpan.'));
    } catch (_error) {
      note('[data-details-preferences-note]',
        t("We couldn't save your preferences. Please try again.", "Kami tidak dapat menyimpan preferensi Anda. Silakan coba lagi."), true);
    } finally {
      state.busy = false;
    }
  });

  find('[data-details-signout]').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (state.busy) return;
    state.busy = true;
    button.disabled = true;
    try {
      const { response } = await api('/api/account/session', { method: 'DELETE' });
      if (!response.ok) throw new Error('sign out failed');
      window.location.reload();
    } catch (_error) {
      button.disabled = false;
      button.textContent = t('Please try signing out again', 'Coba keluar lagi');
      state.busy = false;
    }
  });

  new MutationObserver(() => { if (state.user) translate(); }).observe(document.documentElement, {
    attributes: true, attributeFilter: ['lang']
  });

  window.MarvellDetails = { render };
})();
