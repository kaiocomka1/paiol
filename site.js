/* ============================================================
   PAIOL MÓVEIS — Typebot + Meta Pixel + consentimento + UTMs
   ============================================================
   Regras de mensuração (Meta Ads):
   - PageView: no carregamento (após consentimento).
   - "IniciarQualificacao" (custom): quando o visitante ABRE o Typebot.
   - Lead: NUNCA disparado aqui no clique. O evento Lead deve ser
     disparado pelo próprio Typebot ao concluir a qualificação
     (bloco de Pixel/Script no final do fluxo), garantindo que só
     conte quem realmente terminou. Preparado p/ Conversions API.
   ============================================================ */
(function () {
  const CONSENT_KEY = "paiol_consent_v1";

  /* ---------- UTMs ---------- */
  const params = new URLSearchParams(location.search);
  const utms = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"].forEach((k) => {
    const v = params.get(k) || sessionStorage.getItem("paiol_" + k);
    if (v) { utms[k] = v; sessionStorage.setItem("paiol_" + k, v); }
  });

  /* ---------- Meta Pixel (carrega só com consentimento) ---------- */
  let pixelLoaded = false;
  function loadPixel() {
    if (pixelLoaded) return;
    const id = typeof META_PIXEL_ID !== "undefined" ? META_PIXEL_ID : window.META_PIXEL_ID;
    if (!id) return;
    pixelLoaded = true;
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", id);
    fbq("track", "PageView");
  }
  function track(event, custom) {
    if (!pixelLoaded || typeof fbq === "undefined") return;
    if (custom) fbq("trackCustom", event, utms);
    else fbq("track", event, utms);
  }

  /* ---------- Consentimento LGPD ---------- */
  const bar = document.getElementById("consentBar");
  const saved = localStorage.getItem(CONSENT_KEY);
  if (saved === "accepted") loadPixel();
  else if (saved !== "declined" && bar) bar.classList.add("show");

  document.getElementById("consentAccept")?.addEventListener("click", () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    bar.classList.remove("show");
    loadPixel();
  });
  document.getElementById("consentDecline")?.addEventListener("click", () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    bar.classList.remove("show");
  });

  /* ---------- Typebot (incorporado na seção final) ---------- */
  // Sem botões de atalho: o visitante rola a página inteira e encontra o
  // funil no final. O script só carrega quando a seção se aproxima da tela.
  const typebotId = (typeof TYPEBOT_URL !== "undefined" ? TYPEBOT_URL : "")
    .split("/").filter(Boolean).pop().split("?")[0];
  const prefilled = {};
  Object.keys(utms).forEach((k) => (prefilled[k] = utms[k]));
  let startedTracked = false;
  let typebotLoaded = false;

  function loadTypebot() {
    if (typebotLoaded) return;
    typebotLoaded = true;
    import("https://cdn.jsdelivr.net/npm/@typebot.io/js@0.3/dist/web.js")
      .then((module) => {
        module.default.initStandard({
          id: "typebot-embed",
          typebot: typebotId,
          prefilledVariables: prefilled,
          // Início de qualificação = primeira resposta do visitante (1x por visita).
          // O evento Lead continua sendo disparado pelo próprio Typebot no fim do fluxo.
          onAnswer: () => {
            if (!startedTracked) { startedTracked = true; track("IniciarQualificacao", true); }
          },
        });
      })
      .catch(() => {
        // Sem rede/CDN: mostra link direto para o funil, com UTMs
        const slot = document.querySelector(".typebot-slot");
        if (!slot) return;
        const url = new URL(TYPEBOT_URL);
        Object.entries(utms).forEach(([k, v]) => url.searchParams.set(k, v));
        slot.innerHTML = '<p style="padding:40px;text-align:center"><a class="btn btn-bronze" target="_blank" rel="noopener" href="' + url + '">Abrir o formulário</a></p>';
      });
  }

  const slot = document.querySelector(".typebot-slot");
  if (slot && "IntersectionObserver" in window) {
    const tbObs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { loadTypebot(); tbObs.disconnect(); }
    }, { rootMargin: "800px 0px" });
    tbObs.observe(slot);
  } else {
    loadTypebot();
  }

  /* ---------- Miscelânea ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
