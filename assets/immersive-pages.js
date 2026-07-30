(function () {
  const root = document.documentElement;
  const body = document.body;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches || false;
  const memory = navigator.deviceMemory || 4;
  const quality = reducedMotion || memory <= 2 ? "fallback" : (!coarse && window.innerWidth >= 1024 ? "high" : "medium");
  let webglHandle = null;
  let fallbackFrame = 0;

  body.classList.toggle("reduced-motion", reducedMotion);
  body.dataset.quality = quality;

  function canUseWebGL() {
    if (quality === "fallback") return false;
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  }

  function startFallbackCanvas(canvas, palette) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return null;
    const count = quality === "fallback" ? 90 : 190;
    const particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.8 + 0.4,
      s: Math.random() * 0.001 + 0.0002,
      c: palette[index % palette.length]
    }));
    let width = 1;
    let height = 1;
    let running = true;
    const pointer = { x: 0.5, y: 0.5 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(time) {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      particles.forEach((p, index) => {
        const drift = Math.sin(time * p.s + index) * 0.012;
        p.x += drift * 0.004 + (pointer.x - 0.5) * 0.0005;
        p.y += Math.cos(time * p.s + index) * 0.0008 + (pointer.y - 0.5) * 0.0003;
        if (p.x > 1.05) p.x = -0.05;
        if (p.x < -0.05) p.x = 1.05;
        if (p.y > 1.05) p.y = -0.05;
        if (p.y < -0.05) p.y = 1.05;
        ctx.globalAlpha = reducedMotion ? 0.22 : 0.18 + (index % 5) * 0.035;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      fallbackFrame = requestAnimationFrame(draw);
    }

    function onPointer(event) {
      pointer.x = event.clientX / Math.max(window.innerWidth, 1);
      pointer.y = event.clientY / Math.max(window.innerHeight, 1);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    draw(0);
    return {
      dispose() {
        running = false;
        cancelAnimationFrame(fallbackFrame);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onPointer);
      }
    };
  }

  function initAtmosphere() {
    const canvas = document.querySelector("[data-immersive-canvas]");
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const palette = (canvas.dataset.palette || "#f0e7d4,#9fac90,#8a623c,#4c171f").split(",");
    if (canUseWebGL()) {
      import("./immersive-webgl.mjs")
        .then((module) => {
          webglHandle = module.createBotanicalField(canvas, { quality, reducedMotion, palette });
        })
        .catch(() => {
          webglHandle = startFallbackCanvas(canvas, palette);
        });
    } else {
      webglHandle = startFallbackCanvas(canvas, palette);
    }
  }

  function initReveals() {
    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
    if (reducedMotion || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    nodes.forEach((node) => observer.observe(node));
  }

  function initCommonControls() {
    document.querySelectorAll("[data-skip-immersive]").forEach((control) => {
      control.addEventListener("click", () => {
        document.querySelector(".im-canvas-wrap")?.remove();
        webglHandle?.dispose?.();
        body.classList.add("reduced-motion");
      });
    });
    document.querySelectorAll("[data-sound-toggle]").forEach((control) => {
      control.addEventListener("click", () => {
        const active = control.getAttribute("aria-pressed") === "true";
        control.setAttribute("aria-pressed", String(!active));
        control.textContent = active ? "Sound off" : "Sound on";
      });
    });
  }

  function initMenu() {
    const toggle = document.getElementById("menu-toggle");
    const panel = document.getElementById("menu-panel");
    const close = document.getElementById("menu-close");
    if (!(toggle instanceof HTMLElement) || !(panel instanceof HTMLElement)) return;
    const setOpen = (open) => {
      panel.hidden = !open;
      panel.classList.toggle("is-open", open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      body.classList.toggle("menu-open", open);
    };
    toggle.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
    close?.addEventListener("click", () => setOpen(false));
    panel.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
  }

  function initAtelier() {
    const form = document.querySelector("[data-atelier-form]");
    const confirmation = document.querySelector("[data-atelier-confirmation]");
    const conditionalFields = document.querySelectorAll("[data-conditional-for]");
    const requestType = document.getElementById("atelier-request-type");
    const summary = document.querySelector("[data-atelier-summary]");
    const whatsapp = document.querySelector("[data-atelier-whatsapp]");

    function syncConditional() {
      const active = requestType?.value || "";
      conditionalFields.forEach((field) => {
        field.classList.toggle("is-hidden", field.getAttribute("data-conditional-for") !== active);
      });
    }

    function setError(name, message) {
      const field = form?.querySelector(`[name="${CSS.escape(name)}"]`);
      const error = field?.closest(".im-field")?.querySelector(".im-field-error");
      if (error) error.textContent = message || "";
    }

    requestType?.addEventListener("change", syncConditional);
    syncConditional();

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const required = ["name", "phone", "requestType", "projectDate", "budget", "details", "consent"];
      let valid = true;
      required.forEach((name) => {
        const value = data.get(name);
        const missing = value === null || String(value).trim() === "";
        setError(name, missing ? "Required." : "");
        if (missing) valid = false;
      });
      if (!valid) return;
      const reference = `AT-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const record = {
        reference,
        requestType: data.get("requestType"),
        projectDate: data.get("projectDate"),
        budget: data.get("budget"),
        contactMethod: data.get("contactMethod") || "WhatsApp",
        references: data.get("references") instanceof File && data.get("references").name ? 1 : 0,
        status: "Pending review"
      };
      try {
        sessionStorage.setItem("marvell_atelier_last_reference", JSON.stringify(record));
      } catch (_error) {}
      if (summary) {
        summary.innerHTML = Object.entries(record).map(([key, value]) => `
          <div><dt>${key.replace(/([A-Z])/g, " $1")}</dt><dd>${String(value || "-")}</dd></div>
        `).join("");
      }
      if (whatsapp instanceof HTMLAnchorElement) {
        whatsapp.href = `https://wa.me/628116667457?text=${encodeURIComponent(`Hello Marvell Florist. I submitted Atelier request ${reference} and would like to continue the discussion here.`)}`;
      }
      confirmation?.classList.add("is-visible");
      confirmation?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      form.reset();
      syncConditional();
    });
  }

  const flowerRecords = [
    {
      id: "rose",
      name: "Rose",
      botanical: "Rosa",
      image: "assets/uploads/bou-pinkwithredroses.webp",
      glow: "rgba(145, 48, 48, 0.36)",
      meanings: ["Love", "Gratitude", "Celebration"],
      copy: "Often chosen for affection, admiration and ceremonial beauty. Meanings shift strongly by colour and context.",
      origin: "A widely cultivated genus with long histories across Europe, Asia and the Middle East.",
      marvell: "Ask Marvell about including roses in bouquets, table arrangements or ceremony work, subject to availability."
    },
    {
      id: "orchid",
      name: "Orchid",
      botanical: "Orchidaceae",
      image: "assets/uploads/art-whitebox.webp",
      glow: "rgba(151, 123, 178, 0.32)",
      meanings: ["Honour", "Celebration", "Elegance"],
      copy: "Associated with refinement, endurance and formal beauty in many contemporary arrangements.",
      origin: "A large botanical family with highly varied forms and cultural associations.",
      marvell: "Orchids may be discussed for premium arrangements and formal gifts when suitable stems are available."
    },
    {
      id: "lily",
      name: "Lily",
      botanical: "Lilium",
      image: "assets/uploads/art-whitelily,redrose,yellow.webp",
      glow: "rgba(218, 191, 148, 0.28)",
      meanings: ["Sympathy", "Remembrance", "Hope"],
      copy: "Lilies can feel dignified, fragrant and calm; their use depends heavily on occasion and colour.",
      origin: "Cultivated in many regions, with symbolism that varies by culture and period.",
      marvell: "Ask Marvell whether lilies suit the intended recipient, venue and delivery timing."
    },
    {
      id: "sunflower",
      name: "Sunflower",
      botanical: "Helianthus annuus",
      image: "assets/uploads/art-sunflower,red,yellow,green.webp",
      glow: "rgba(204, 145, 47, 0.32)",
      meanings: ["Congratulations", "Friendship", "New beginnings"],
      copy: "Often read as open, warm and optimistic, especially in celebratory gifts.",
      origin: "Native to North America and now cultivated widely.",
      marvell: "Sunflowers may be requested for brighter arrangements where scale and freshness allow."
    },
    {
      id: "chrysanthemum",
      name: "Chrysanthemum",
      botanical: "Chrysanthemum",
      image: "assets/uploads/dukastandingpurewhite.webp",
      glow: "rgba(159, 172, 144, 0.28)",
      meanings: ["Honour", "Remembrance", "Sympathy"],
      copy: "A flower with very different associations across cultures, colours and ceremonial contexts.",
      origin: "Documented in East Asian cultivation histories and widely used in modern floristry.",
      marvell: "Marvell can advise whether chrysanthemum is appropriate for the moment and recipient."
    }
  ];

  function initFlowers() {
    const page = document.querySelector("[data-flower-page]");
    if (!page) return;
    const selector = document.querySelector("[data-flower-selector]");
    const images = Array.from(document.querySelectorAll("[data-flower-image]"));
    const name = document.querySelector("[data-flower-name]");
    const botanical = document.querySelector("[data-flower-botanical]");
    const panel = document.querySelector("[data-flower-panel]");
    const meaningButtons = document.querySelectorAll("[data-meaning]");
    const tabs = document.querySelectorAll("[data-flower-tab]");
    let active = flowerRecords[0];
    let tab = "meaning";

    function renderSelector(records = flowerRecords) {
      if (!selector) return;
      selector.innerHTML = records.map((flower) => `
        <button class="im-btn" type="button" data-flower-id="${flower.id}" aria-current="${flower.id === active.id ? "true" : "false"}">${flower.name}</button>
      `).join("");
    }

    function renderFlower() {
      document.documentElement.style.setProperty("--flower-glow", active.glow);
      images.forEach((image) => {
        if (!(image instanceof HTMLImageElement)) return;
        image.src = active.image;
        image.alt = `${active.name} reference arrangement`;
      });
      if (name) name.textContent = active.name;
      if (botanical) botanical.textContent = active.botanical;
      tabs.forEach((button) => button.setAttribute("aria-selected", String(button.dataset.flowerTab === tab)));
      if (panel) {
        const content = tab === "origin" ? active.origin : tab === "marvell" ? active.marvell : active.copy;
        panel.innerHTML = `<p>${content}</p><p class="im-disclaimer">Flower meanings vary across culture, period, colour and context. Availability is never guaranteed.</p>`;
      }
      renderSelector();
    }

    selector?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-flower-id]");
      if (!(button instanceof HTMLElement)) return;
      active = flowerRecords.find((flower) => flower.id === button.dataset.flowerId) || active;
      renderFlower();
    });

    tabs.forEach((button) => {
      button.addEventListener("click", () => {
        tab = button.dataset.flowerTab || "meaning";
        renderFlower();
      });
    });

    meaningButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const meaning = button.dataset.meaning || "";
        meaningButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        const matches = flowerRecords.filter((flower) => flower.meanings.includes(meaning));
        active = matches[0] || active;
        renderSelector(matches.length ? matches : flowerRecords);
        renderFlower();
      });
    });

    document.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const index = flowerRecords.findIndex((flower) => flower.id === active.id);
      active = flowerRecords[(index + (event.key === "ArrowRight" ? 1 : -1) + flowerRecords.length) % flowerRecords.length];
      renderFlower();
    });

    document.querySelectorAll(".flower-stage").forEach((stage) => {
      stage.addEventListener("pointermove", (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        root.style.setProperty("--flower-x", `${((event.clientX - rect.left) / rect.width - 0.5) * 18}px`);
        root.style.setProperty("--flower-y", `${((event.clientY - rect.top) / rect.height - 0.5) * 14}px`);
      });
    });

    renderFlower();
  }

  window.addEventListener("pagehide", () => webglHandle?.dispose?.());
  initAtmosphere();
  initReveals();
  initCommonControls();
  initMenu();
  initAtelier();
  initFlowers();
})();
