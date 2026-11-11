/* ============================================================
   PAIOL MÓVEIS — motor de scroll cinematográfico
   Canvas frame-sequence scrub + Lenis + reveals + contadores
   Com: fallback estático, prefers-reduced-motion, modo mobile
   ============================================================ */
(function () {
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MOBILE = window.matchMedia("(max-width: 640px)").matches;

  function initScrub(cfg) {
    const section = document.querySelector(cfg.section);
    const canvas = section.querySelector("canvas");
    const ctx = canvas.getContext("2d", { alpha: false });
    const scenes = [...section.querySelectorAll(".scene")];
    const fill = document.getElementById("progress-fill");
    const bgFill = cfg.bg || "#171715";

    // Poster para fallback
    const poster = section.querySelector(".hero-poster");
    if (poster && cfg.poster) {
      const test = new Image();
      test.onload = () => { poster.style.backgroundImage = `url(${cfg.poster})`; };
      test.src = cfg.poster;
    }

    // Modo mobile: sequência reduzida dedicada (menos frames, menor resolução)
    const useMobile = MOBILE && cfg.mobileFramePath;
    const count = useMobile ? cfg.mobileFrameCount : cfg.frameCount;
    const pathFn = useMobile ? cfg.mobileFramePath : cfg.framePath;

    const images = [];
    let loadedAny = false;
    let failed = 0;
    let firstDrawn = false;

    function activateFallback() {
      section.classList.add("no-frames");
      document.documentElement.classList.add("reduced-motion");
      scenes.forEach((s, i) => { if (i === 0) s.classList.add("static-show"); });
    }

    for (let k = 0; k < count; k++) {
      const img = new Image();
      img.src = pathFn(k + 1);
      img.onload = () => {
        loadedAny = true;
        if (!firstDrawn) { firstDrawn = true; draw(0); }
      };
      img.onerror = () => {
        failed++;
        if (failed >= count && !loadedAny) activateFallback();
      };
      images[k] = img;
    }
    // Se nada carregou em 4s, assume fallback
    setTimeout(() => { if (!loadedAny) activateFallback(); }, 4000);

    let current = -1;
    function draw(index) {
      const img = images[index];
      if (!img || !img.complete || !img.naturalWidth) return;
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
      let dw, dh, dx, dy;
      if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
      else { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
      ctx.fillStyle = bgFill; ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);
    }
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(current < 0 ? 0 : current);
    }
    function update() {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < -window.innerHeight || rect.top > window.innerHeight) return;
      const scrollable = rect.height - window.innerHeight;
      const p = Math.min(Math.max(-rect.top / scrollable, 0), 1);
      const idx = Math.min(count - 1, Math.floor(p * (count - 1)));
      if (idx !== current) { current = idx; draw(idx); }
      if (fill) fill.style.width = (p * 100).toFixed(2) + "%";
      for (const el of scenes) {
        const a = parseFloat(el.dataset.in), b = parseFloat(el.dataset.out);
        const mid = (a + b) / 2, half = (b - a) / 2;
        let o = 1 - Math.abs(p - mid) / half;
        o = Math.max(0, Math.min(1, o));
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translateY(${(1 - o) * 26}px)`;
        el.style.pointerEvents = o > 0.5 ? "auto" : "none";
      }
    }
    window.addEventListener("resize", resize);
    resize();
    return { update, resize };
  }

  function animateCount(el) {
    const target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || "";
    const dur = 1400, t0 = performance.now();
    function stepFn(t) {
      const k = Math.min((t - t0) / dur, 1), eased = 1 - Math.pow(1 - k, 3);
      el.textContent = (target % 1 === 0 ? Math.round(target * eased) : (target * eased).toFixed(1)) + suffix;
      if (k < 1) requestAnimationFrame(stepFn);
    }
    requestAnimationFrame(stepFn);
  }

  document.addEventListener("DOMContentLoaded", () => {
    let scrubs = [];

    if (REDUCED) {
      // Respeita preferência por movimento reduzido: hero estático
      document.documentElement.classList.add("reduced-motion");
      document.querySelectorAll(".cinematic .scene").forEach((s, i) => {
        if (i === 0) s.classList.add("static-show");
      });
      const poster = document.querySelector(".hero-poster");
      const cfg = (window.SCRUB_SECTIONS || [])[0];
      if (poster && cfg && cfg.poster) {
        const test = new Image();
        test.onload = () => { poster.style.backgroundImage = `url(${cfg.poster})`; };
        test.src = cfg.poster;
      }
    } else {
      scrubs = (window.SCRUB_SECTIONS || [])
        .filter((c) => document.querySelector(c.section))
        .map(initScrub);
    }

    // Lenis apenas sem reduced-motion
    if (!REDUCED && window.Lenis) {
      const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
      window.__lenis = lenis;
      function raf(t) { lenis.raf(t); scrubs.forEach((s) => s.update()); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      lenis.on("scroll", ({ scroll }) => {
        document.querySelectorAll(".scroll-hint").forEach((h) => (h.style.opacity = scroll > 60 ? "0" : "1"));
        document.getElementById("siteHeader").classList.toggle("scrolled", scroll > 40);
      });
    } else {
      window.addEventListener("scroll", () => {
        document.getElementById("siteHeader").classList.toggle("scrolled", window.scrollY > 40);
      }, { passive: true });
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        if (e.target.classList.contains("stat-num")) animateCount(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.2 });
    document.querySelectorAll(".reveal, .stat-num").forEach((el) => io.observe(el));
  });
})();
