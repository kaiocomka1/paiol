# Paiol Móveis — Landing Page Cinematográfica

Landing page premium para campanhas Meta Ads, com hero cinematográfico controlado por scroll (canvas frame-sequence + Lenis), Typebot integrado e Meta Pixel.

## Como rodar localmente

```bash
cd paiol-moveis
python3 -m http.server 8787
# abra http://localhost:8787
```

Ou dê dois cliques em `Launch Demo.command` (macOS/Linux).

## Configuração

Tudo fica no bloco `<script>` no final do `index.html`:

| Variável | Valor atual |
|---|---|
| `TYPEBOT_URL` | `https://typebot.co/paiol-m-veis-qualifica-o-meta-ads-tm4h5zs` |
| `META_PIXEL_ID` | `388121400576769` |
| `SCRUB_SECTIONS` | config da sequência de frames do hero |

## Mensuração (Meta Pixel)

- **PageView** — no carregamento, após consentimento LGPD (banner próprio).
- **IniciarQualificacao** (evento custom) — quando o visitante **abre** o Typebot (com deduplicação: dispara 1x por visita).
- **Lead** — **não é disparado pela landing page.** Deve ser disparado dentro do Typebot, no bloco final do fluxo (após a qualificação concluída), usando o bloco nativo de Meta Pixel do Typebot com o mesmo ID. Isso garante que só contem leads realmente qualificados.
- UTMs (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`) são capturadas, persistidas na sessão, enviadas como parâmetros dos eventos e repassadas ao Typebot como variáveis pré-preenchidas.
- Preparado para Conversions API: os mesmos nomes de evento podem ser espelhados server-side.

## Typebot

- Embed padrão na Seção 8 (`<typebot-standard>`) + popup acionado por todos os CTAs (`[data-cta]`).
- No mobile o popup ocupa a largura total.
- Fallback: se o script do Typebot não carregar, os CTAs abrem o funil em nova aba com as UTMs preservadas.
- As perguntas do funil **não** são recriadas na página — o fluxo aprovado roda inteiro no Typebot.

## Hero cinematográfico

- Motor em `scroll-cinematic.js`: pré-carrega os frames de `frames/cozinha/` e desenha no canvas conforme o progresso do scroll (seção sticky de 560vh), com 5 janelas de texto (cenas 1–5 do brief).
- **Mobile**: carrega 1 a cada 2 frames (`mobileStep: 2`).
- **`prefers-reduced-motion`**: sequência desativada, hero vira seção estática com poster.
- **Fallback**: se os frames não carregarem em 4s, mostra `assets/poster.jpg` e a cena 1 fixa. A página permanece 100% funcional.
- Após gerar os clipes (Higgsfield → ffmpeg), ajuste `frameCount` no `index.html` para o total real de frames.

## Sequência cinematográfica (pronta)

Gerada via Higgsfield com continuidade encadeada (último frame de cada clipe = frame inicial do seguinte; o clipe final usa `end_image` ancorado no keyframe original, fechando o ciclo na mesma vista da cena 1):

- Clipe 1 — dolly-in da entrada até a ilha (cenas 1–2)
- Clipe 2 — travelling lateral pela marcenaria + gaveta abrindo (cenas 3–4)
- Clipe 3 — recuo revelando o ambiente completo (cena 5)

Frames: `frames/cozinha/` (desktop, 540 × 1600px) e `frames/cozinha-m/` (mobile, 270 × 900px).

## Pendências para produção

1. **Imagens**: seção 2 usa imagem gerada de oficina (`assets/oficina.*`); seção 6 usa a foto da fábrica enviada (`assets/fabrica-propria.*`); galeria em `assets/ambientes/`.
2. **Typebot**: seção 8 é um link direto; todos os 11 botões `[data-cta]` abrem o mesmo funil (popup, com fallback em nova aba).
3. **Lead no Typebot** — confirmar que o bloco de Pixel no final do fluxo dispara `Lead` com o ID `388121400576769`.
4. **Flyer institucional** — conferir a identidade visual (logo/cores) contra o flyer oficial quando disponível.
