/** Smooth, interruptible motion for native <details> accordions. */
(function () {
  if (typeof document === "undefined") return;
  const running = new WeakMap();

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const summary = event.target.closest("summary");
    const details = summary?.parentElement;
    if (!(details instanceof HTMLDetailsElement) || !details.matches(".bag-help, .product-detail")) return;

    event.preventDefault();
    const previous = running.get(details);
    const wantedOpen = previous ? !previous.wantedOpen : !details.open;
    const startHeight = details.getBoundingClientRect().height;
    previous?.animation.cancel();
    running.delete(details);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !details.animate) {
      details.open = wantedOpen;
      details.style.height = "";
      details.style.overflow = "";
      return;
    }

    // Keep content in the layout until a closing animation has finished.
    details.open = true;
    const endHeight = wantedOpen ? details.scrollHeight : summary.getBoundingClientRect().height;
    details.style.height = `${startHeight}px`;
    details.style.overflow = "hidden";
    const animation = details.animate(
      [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
      { duration: 280, easing: "cubic-bezier(.22, 1, .36, 1)" }
    );
    running.set(details, { animation, wantedOpen });
    animation.onfinish = () => {
      if (running.get(details)?.animation !== animation) return;
      details.open = wantedOpen;
      details.style.height = "";
      details.style.overflow = "";
      running.delete(details);
    };
  }, true);
})();
