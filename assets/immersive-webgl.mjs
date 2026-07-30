import * as THREE from "../node_modules/three/build/three.module.js";

export function createBotanicalField(canvas, options = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "high-performance"
  });
  const quality = options.quality || "medium";
  const reduced = !!options.reducedMotion;
  const count = reduced ? 260 : quality === "high" ? 1450 : 760;
  const palette = options.palette || ["#f0e7d4", "#9fac90", "#8a623c", "#4c171f"];
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 80);
  camera.position.z = 18;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 28;
    positions[i3 + 1] = (Math.random() - 0.5) * 18;
    positions[i3 + 2] = (Math.random() - 0.5) * 22;
    color.set(palette[i % palette.length]);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
    seeds[i] = Math.random() * 10;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: quality === "high" ? 0.038 : 0.052,
    transparent: true,
    opacity: 0.74,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const pointer = { x: 0, y: 0 };
  let width = 1;
  let height = 1;
  let frame = 0;
  let running = true;
  let visible = true;

  function resize() {
    width = Math.max(1, canvas.clientWidth || window.innerWidth);
    height = Math.max(1, canvas.clientHeight || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, quality === "high" ? 1.6 : 1.15);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function onPointerMove(event) {
    pointer.x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
    pointer.y = -(event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
  }

  function onVisibility() {
    visible = document.visibilityState !== "hidden";
    if (visible && running) render();
  }

  function render(time = 0) {
    if (!running) return;
    if (visible && !reduced) {
      const pos = geometry.attributes.position.array;
      const t = time * 0.00018;
      for (let i = 0; i < count; i += 1) {
        const i3 = i * 3;
        const s = seeds[i];
        pos[i3] += Math.sin(t + s + pos[i3 + 1] * 0.08) * 0.0022 + pointer.x * 0.0018;
        pos[i3 + 1] += Math.cos(t * 1.2 + s + pos[i3] * 0.06) * 0.0019 + pointer.y * 0.0012;
        if (pos[i3] > 15) pos[i3] = -15;
        if (pos[i3] < -15) pos[i3] = 15;
        if (pos[i3 + 1] > 10) pos[i3 + 1] = -10;
        if (pos[i3 + 1] < -10) pos[i3 + 1] = 10;
      }
      geometry.attributes.position.needsUpdate = true;
      points.rotation.y = pointer.x * 0.065 + Math.sin(t) * 0.04;
      points.rotation.x = pointer.y * 0.04;
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  render();

  return {
    dispose() {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      scene.remove(points);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
    }
  };
}
