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
  const MOBILE = window.matchMedia("(max-width: 640px)").matches;
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

  /* ---------- Typebot ---------- */
  // Extrai o id público do funil a partir da URL configurada
  const typebotId = (typeof TYPEBOT_URL !== "undefined" ? TYPEBOT_URL : "")
    .split("/").filter(Boolean).pop().split("?")[0];
  let typebotLib = null;
  let dedupeOpened = false;

  const prefilled = {};
  Object.keys(utms).forEach((k) => (prefilled[k] = utms[k]));

  // O elemento do embed precisa do id ANTES do init
  const standard = document.querySelector("typebot-standard");
  if (standard) standard.id = "typebot-embed";

  import("https://cdn.jsdelivr.net/npm/@typebot.io/js@0.3/dist/web.js")
    .then((module) => {
      typebotLib = module.default;
      // Seção dedicada: Typebot incorporado na página
      typebotLib.initStandard({
        id: "typebot-embed",
        typebot: typebotId,
        prefilledVariables: prefilled,
      });
      // Popup para os CTAs (tela cheia no mobile)
      typebotLib.initPopup({
        typebot: typebotId,
        prefilledVariables: prefilled,
        theme: { width: MOBILE ? "100%" : "512px" },
        onOpen: () => {
          if (!dedupeOpened) { dedupeOpened = true; track("IniciarQualificacao", true); }
        },
      });
    })
    .catch(() => { /* sem rede: CTAs caem no link direto */ });

  function openTypebot(origin) {
    if (!dedupeOpened) { dedupeOpened = true; track("IniciarQualificacao", true); }
    if (typebotLib && typebotLib.open) {
      typebotLib.open();
    } else {
      // Fallback: abre o funil em nova aba com UTMs preservadas
      const url = new URL(typeof TYPEBOT_URL !== "undefined" ? TYPEBOT_URL : "https://typebot.co/" + typebotId);
      Object.entries(utms).forEach(([k, v]) => url.searchParams.set(k, v));
      window.open(url.toString(), "_blank", "noopener");
    }
  }

  // Todos os CTAs abrem o mesmo funil
  document.querySelectorAll("[data-cta]").forEach((btn) => {
    btn.addEventListener("click", () => openTypebot(btn.dataset.cta));
  });

  /* ---------- Miscelânea ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
