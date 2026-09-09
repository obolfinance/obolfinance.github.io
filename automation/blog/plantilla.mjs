/**
 * Convierte una nota (datos) en la pagina HTML del articulo.
 *
 * El diseno no se reinventa: es el mismo markup de las notas escritas a mano,
 * con los valores que cambian sacados a variables. Por eso el modelo NUNCA
 * escribe HTML — devuelve datos y esto los acomoda. Un modelo que escribe HTML
 * tarde o temprano cierra mal un div, y un div mal cerrado en una pagina con
 * cuarenta divs anidados no se nota hasta que alguien la abre.
 */

export const SITIO = 'https://obolfinance.com.ar';
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Escapa para meter texto dentro de un atributo HTML. */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Texto de cuerpo: escapa TODO y despues devuelve las tres marcas permitidas.
 *
 * Al reves (permitir tags y escapar el resto) es como se cuelan cosas: alcanza
 * con que el modelo devuelva un <img onerror=...> para que termine en la pagina.
 * Asi, lo unico que puede sobrevivir es lo que esta en esta lista.
 */
export function inline(s) {
  let t = esc(s);
  t = t.replace(/&lt;(\/?)(strong|em)&gt;/g, '<$1$2>');
  t = t.replace(/&lt;span class=&quot;obol-mark&quot;&gt;/g, '<span class="obol-mark">');
  t = t.replace(/&lt;\/span&gt;/g, '</span>');
  return t;
}

/** Saca las marcas, para contar palabras y para los textos de metadatos. */
export const plano = (s) => String(s ?? '').replace(/<[^>]+>/g, '');

export function fechaLarga(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
}

function bloque(b, mundo) {
  if (!b) return '';
  if (b.tipo === 'dato') {
    return `
        <div class="obol-reveal" style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin:36px 0;padding:30px 34px;border-radius:22px;background:linear-gradient(120deg,var(--hero),var(--accDeep));box-shadow:0 22px 44px -22px rgba(15,40,55,.55);">
          <span style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:clamp(50px,8vw,80px);line-height:.9;color:var(--acc);letter-spacing:-.03em;">${esc(b.numero)}</span>
          <span style="font-weight:700;font-size:16px;line-height:1.5;color:rgba(255,255,255,.9);max-width:340px;">${inline(b.texto)}</span>
        </div>`;
  }
  if (b.tipo === 'cita') {
    return `
        <div class="obol-reveal" style="position:relative;margin:40px 0;padding:34px 32px 30px 40px;border-radius:22px;background:var(--tint);border-left:6px solid var(--acc);box-shadow:0 16px 34px -24px rgba(15,40,55,.4);">
          <span style="position:absolute;top:-16px;left:22px;font-family:'Fredoka',sans-serif;font-weight:700;font-size:76px;line-height:1;color:var(--acc);opacity:.6;">"</span>
          <p style="margin:0;font-family:'Fredoka',sans-serif;font-weight:600;font-size:22px;line-height:1.4;color:#243244;">${inline(b.texto)}</p>
          <span style="display:inline-block;margin-top:14px;font-weight:800;font-size:14px;color:var(--accDeep);">— ${esc(mundo.autorConArticulo)}</span>
        </div>`;
  }
  if (b.tipo === 'lista') {
    const items = b.items.map((it) => `
            <div style="display:flex;gap:12px;align-items:flex-start;">
              <span style="width:8px;height:8px;border-radius:999px;background:var(--acc);margin-top:9px;flex:none;"></span>
              <span style="font-weight:700;font-size:16px;line-height:1.55;color:#33404f;">${inline(it)}</span>
            </div>`).join('');
    return `
        <div class="obol-reveal" style="margin:28px 0;padding:24px 26px;border-radius:20px;background:#f7f9fc;border:1px solid #e6ebf4;">
          <span style="display:block;font-family:'Fredoka',sans-serif;font-weight:700;font-size:15px;color:var(--accDeep);margin-bottom:12px;">${esc(b.titulo)}</span>
          <div style="display:flex;flex-direction:column;gap:12px;">${items}
          </div>
        </div>`;
  }
  throw new Error(`bloque desconocido: ${b.tipo}`);
}

function tarjetaRelacionada(post, mundos) {
  const m = mundos.find((x) => x.id === post.mundo);
  if (!m) throw new Error(`relacionada sin mundo: ${post.slug}`);
  return `
          <a href="./${esc(post.slug)}.html" style="border:none;padding:0;background:none;cursor:pointer;text-align:left;display:block;position:relative;">
            <div class="obol-card" style="position:relative;border-radius:22px;overflow:hidden;height:210px;box-shadow:0 16px 32px -18px rgba(15,40,55,.5);">
              <div style="position:absolute;inset:0;background-image:url('../assets/${m.bgTarjeta}');background-size:cover;background-position:center 45%;"></div>
              <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,40,55,.05) 0%,rgba(15,40,55,.55) 48%,rgba(9,27,37,.94) 100%);"></div>
              <div style="position:relative;height:100%;padding:22px;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;">
                <span style="display:inline-flex;align-self:flex-start;font-family:'Fredoka',sans-serif;font-weight:600;font-size:10px;letter-spacing:.1em;color:#0f2837;background:rgba(255,255,255,.92);padding:4px 10px;border-radius:999px;text-transform:uppercase;">${esc(m.categoria)}</span>
                <h3 style="margin:0;font-family:'Fredoka',sans-serif;font-weight:700;font-size:17px;line-height:1.2;color:#fff;">${esc(post.titulo)}</h3>
              </div>
            </div>
            <img src="../assets/${m.char}-card.png" alt="" style="position:absolute;right:-6px;bottom:-10px;width:${m.anchoTarjeta}px;height:auto;pointer-events:none;z-index:3;filter:drop-shadow(0 12px 14px rgba(15,40,55,.4));" loading="lazy">
          </a>`;
}

/**
 * Parte el lead en su primera letra (que va como capitular) y el resto.
 *
 * Se hace sobre el texto YA escapado para no cortar en el medio de una entidad:
 * si el lead empieza con una comilla, escapar despues de cortar dejaria "&#39"
 * partido al medio y la pagina mostraria basura.
 */
function partirLead(lead) {
  const html = inline(lead);
  const m = html.match(/^(\s*)(&[a-z#0-9]+;|.)/i);
  if (!m) return { letra: '', resto: html };
  return { letra: m[2], resto: html.slice(m[0].length) };
}

export function renderArticulo(nota, mundos, relacionadas) {
  const m = mundos.find((x) => x.id === nota.mundo);
  if (!m) throw new Error(`mundo inexistente: ${nota.mundo}`);

  const url = `${SITIO}/blog/articulos/${nota.slug}.html`;
  const og = `${SITIO}/assets/og/og-default.jpg`;
  const publicado = `${nota.fecha}T09:00:00-03:00`;
  const texto = [nota.lead, ...nota.secciones.flatMap((s) => s.parrafos), nota.cierre].map(plano).join(' ');
  const palabras = texto.split(/\s+/).filter(Boolean).length;
  const lead = partirLead(nota.lead);

  const secciones = nota.secciones.map((s, i) => {
    const num = String(i + 1).padStart(2, '0');
    const parrafos = s.parrafos.map((p) => `        <p>${inline(p)}</p>`).join('\n');
    return `
        <h2><span style="font-family:'Space Grotesk',sans-serif;color:var(--accDeep);font-size:20px;margin-right:10px;">${num}</span>${inline(s.titulo)}</h2>
${parrafos}${bloque(s.bloque, m)}`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://obolfinance.app.n8n.cloud https://fhdkferjbwecrkolluab.supabase.co https://dolarapi.com https://api.argentinadatos.com https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self';">
<script>if (top !== self) { top.location = self.location; }</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(nota.titulo)} — Obol Blog</title>
<meta name="description" content="${esc(nota.metaDescripcion)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#12212E">

<meta property="og:type" content="article">
<meta property="og:site_name" content="Obol Finance">
<meta property="og:locale" content="es_AR">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(nota.titulo)}">
<meta property="og:description" content="${esc(nota.ogDescripcion)}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="article:published_time" content="${publicado}">
<meta property="article:modified_time" content="${publicado}">
<meta property="article:section" content="${esc(m.categoria)}">
<meta property="article:author" content="${esc(m.autor)}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(nota.titulo)}">
<meta name="twitter:description" content="${esc(nota.ogDescripcion)}">
<meta name="twitter:image" content="${og}">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BlogPosting",
      "headline": ${JSON.stringify(nota.titulo)},
      "description": ${JSON.stringify(nota.ogDescripcion)},
      "url": "${url}",
      "mainEntityOfPage": "${url}",
      "image": "${og}",
      "datePublished": "${publicado}",
      "dateModified": "${publicado}",
      "articleSection": ${JSON.stringify(m.categoria)},
      "wordCount": ${palabras},
      "timeRequired": "PT${nota.minutos}M",
      "inLanguage": "es-AR",
      "author": { "@type": "Person", "name": ${JSON.stringify(m.autor)} },
      "publisher": { "@id": "${SITIO}/#organizacion" },
      "isAccessibleForFree": true
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Obol", "item": "${SITIO}/index.html" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "${SITIO}/blog/index.html" },
        { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(nota.migaTitulo)} }
      ]
    }
  ]
}
</script>
<link rel="icon" href="../assets/icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800;900&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/article.css">
</head>
<body>

<div style="font-family:'Nunito',system-ui,sans-serif;color:#1b2436;position:relative;--hero:${m.paleta.hero};--acc:${m.paleta.acc};--accDeep:${m.paleta.accDeep};--tint:${m.paleta.tint};">

  <div style="position:fixed;top:0;left:0;right:0;height:5px;z-index:60;background:rgba(15,40,55,.08);">
    <div id="progress" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accDeep),var(--acc),#ffb24a);transition:width .08s linear;"></div>
  </div>

  <div style="position:sticky;top:0;z-index:40;background:#0f1730;padding:16px 34px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 18px rgba(6,10,26,.35);">
    <a href="../index.html" style="display:flex;align-items:center;color:#fff;">
      <img src="../../assets/home/obol_wordmark_blog_small.png" alt="Obol Blog" style="height:27px;width:auto;">
    </a>
    <div style="display:flex;align-items:center;gap:28px;">
      <a href="../../index.html" class="nav-text-link" style="color:rgba(255,255,255,.85);font-weight:700;font-size:14px;">Inicio</a>
      <a href="../../aprende.html" class="nav-text-link" style="color:rgba(255,255,255,.85);font-weight:700;font-size:14px;">Qué enseña la app</a>
      <a href="../index.html" class="nav-text-link" style="color:rgba(255,255,255,.85);font-weight:700;font-size:14px;">Blog</a>
      <a href="../../index.html#anotarse" style="display:inline-flex;align-items:center;font-family:'Fredoka',sans-serif;font-weight:600;font-size:14px;color:#0d1730;background:linear-gradient(90deg,#ffe08a,#ffb24a);padding:9px 20px;border-radius:999px;"><span class="nav-cta-full">Enterate cuando salga</span><span class="nav-cta-short">Enterate</span></a>
    </div>
  </div>

  <!-- HERO -->
  <div style="position:relative;overflow:hidden;background:var(--hero);padding:54px 34px 128px;">
    <div style="position:absolute;inset:0;background-image:url('../assets/${m.bgHero}');background-size:cover;background-position:center 42%;opacity:.35;"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(100deg,var(--hero) 0%,var(--hero) 40%,rgba(0,0,0,0) 100%);"></div>
    <div style="position:absolute;right:-30px;top:-30px;width:320px;height:320px;border-radius:999px;background:radial-gradient(circle,rgba(255,255,255,.14),transparent 70%);"></div>
    <div style="position:relative;max-width:1120px;margin:0 auto;display:flex;align-items:center;gap:36px;">
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:20px;">
        <div class="obol-rise" style="display:flex;align-items:center;gap:10px;animation-delay:.05s;">
          <span style="display:inline-flex;align-items:center;font-family:'Fredoka',sans-serif;font-weight:600;font-size:12px;letter-spacing:.14em;color:var(--hero);background:var(--acc);padding:7px 15px;border-radius:999px;text-transform:uppercase;">${esc(m.categoria)}</span>
          <span style="font-weight:800;font-size:13px;color:rgba(255,255,255,.62);">${fechaLarga(nota.fecha)} · ${nota.minutos} min de lectura</span>
        </div>
        <h1 class="obol-rise" style="margin:0;font-family:'Fredoka',sans-serif;font-weight:700;font-size:clamp(32px,4.4vw,54px);line-height:1.05;color:#fff;letter-spacing:-.02em;animation-delay:.13s;">${esc(nota.titulo)}</h1>
        <p class="obol-rise" style="margin:0;max-width:560px;font-weight:600;font-size:19px;line-height:1.55;color:rgba(255,255,255,.85);animation-delay:.22s;">${esc(nota.bajada)}</p>
        <div class="obol-rise" style="display:flex;align-items:center;gap:13px;margin-top:4px;animation-delay:.3s;">
          <div style="width:52px;height:52px;border-radius:999px;background:rgba(255,255,255,.1);border:2px solid var(--acc);overflow:hidden;display:grid;place-items:center;flex:none;">
            <img src="../assets/${m.char}.png" alt="" style="width:48px;height:48px;object-fit:contain;transform:translateY(3px);">
          </div>
          <div style="display:flex;flex-direction:column;">
            <span style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:16px;color:#fff;">${esc(m.autorConArticulo)}</span>
            <span style="font-weight:700;font-size:13px;color:rgba(255,255,255,.55);">Escribe en Obol</span>
          </div>
        </div>
      </div>
      <div class="obol-hero-pig" style="position:relative;flex:none;width:360px;display:grid;place-items:center;">
        <div style="position:absolute;width:220px;height:220px;border-radius:999px;background:radial-gradient(circle,rgba(255,255,255,.16),transparent 68%);"></div>
        <img src="../assets/${m.char}-card.png" alt="${esc(m.autorConArticulo)}" style="position:relative;width:${m.anchoHero}px;height:auto;filter:drop-shadow(0 22px 30px rgba(4,14,20,.55));animation:obolRise .8s cubic-bezier(.22,.61,.36,1) .35s both;">
      </div>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:-1px;height:66px;background:#eef1f7;clip-path:polygon(0 55%,100% 0,100% 100%,0 100%);"></div>
  </div>

  <!-- BODY -->
  <div style="display:flex;justify-content:center;padding:0 24px;">
    <div style="width:100%;max-width:820px;margin-top:-60px;position:relative;z-index:5;">
      <article class="obol-art" style="background:#fff;border-radius:28px;padding:58px clamp(28px,6vw,74px) 54px;box-shadow:0 30px 70px -30px rgba(15,40,55,.4);">

        <div style="display:flex;align-items:center;gap:10px;padding-bottom:24px;margin-bottom:8px;border-bottom:2px dashed #e2e7f0;">
          <span style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:13px;color:#8a92a8;letter-spacing:.04em;">COMPARTIR</span>
          <div style="display:flex;gap:9px;">
            <a href="#" class="obol-btn" aria-label="Compartir en X" style="width:38px;height:38px;border-radius:11px;background:#f1f4fa;display:grid;place-items:center;color:#0f2837;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px;">𝕏</a>
            <a href="#" class="obol-btn" aria-label="Compartir en WhatsApp" style="width:38px;height:38px;border-radius:11px;background:#f1f4fa;display:grid;place-items:center;color:#0f2837;font-weight:800;font-size:14px;">Wa</a>
            <a href="#" class="obol-btn" aria-label="Copiar enlace" style="width:38px;height:38px;border-radius:11px;background:#f1f4fa;display:grid;place-items:center;font-size:15px;">🔗</a>
          </div>
        </div>

        <p class="lead"><span style="float:left;font-family:'Fredoka',sans-serif;font-weight:700;font-size:74px;line-height:.72;padding:8px 12px 0 0;color:var(--accDeep);">${lead.letra}</span>${lead.resto}</p>
${secciones}

        <p>${inline(nota.cierre)}</p>

        <p style="margin-top:26px;font-size:13.5px;line-height:1.6;color:#8a92a8;">Esta nota tiene fines educativos. No es asesoramiento financiero, de inversión, legal ni fiscal.</p>

        <div class="obol-reveal" style="position:relative;overflow:hidden;margin:44px 0 4px;border-radius:24px;background:linear-gradient(120deg,var(--hero),var(--accDeep));padding:36px 40px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;">
          <div style="position:absolute;right:-30px;bottom:-30px;width:190px;height:190px;border-radius:999px;background:radial-gradient(circle,rgba(255,255,255,.16),transparent 70%);"></div>
          <div style="position:relative;max-width:440px;display:flex;flex-direction:column;gap:8px;">
            <span style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:12px;letter-spacing:.12em;color:var(--acc);text-transform:uppercase;">Seguí aprendiendo</span>
            <h3 style="margin:0;font-family:'Fredoka',sans-serif;font-weight:700;font-size:24px;color:#fff;line-height:1.2;">¿Querés practicar esto paso a paso?</h3>
            <p style="margin:0;font-weight:600;font-size:15px;color:rgba(255,255,255,.85);line-height:1.5;">${esc(m.ctaTexto)}</p>
          </div>
          <a href="../../index.html" class="obol-btn" style="position:relative;display:inline-flex;align-items:center;gap:8px;font-family:'Fredoka',sans-serif;font-weight:600;font-size:16px;color:#0f2837;background:linear-gradient(90deg,#ffe08a,#ffb24a);padding:16px 30px;border-radius:999px;white-space:nowrap;box-shadow:0 14px 30px -12px rgba(255,178,74,.6);">Conocé la app 🐷</a>
        </div>
      </article>

      <div style="margin:56px 0 20px;">
        <h2 style="margin:0 0 22px;font-family:'Fredoka',sans-serif;font-weight:700;font-size:26px;color:#0f2837;text-align:center;">Seguí leyendo</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:22px;">
${relacionadas.map((r) => tarjetaRelacionada(r, mundos)).join('\n')}

        </div>
      </div>
    </div>
  </div>

  <div style="background:#0f1730;margin-top:40px;padding:34px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
    <div style="display:flex;align-items:center;gap:10px;">
      <img src="../assets/icon.png" alt="Obol" style="width:26px;height:26px;border-radius:7px;">
      <span style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:14px;color:rgba(255,255,255,.7);">Obol Blog</span>
    </div>
    <div style="display:flex;gap:24px;flex-wrap:wrap;">
      <a href="../../index.html" style="color:rgba(255,255,255,.6);font-weight:700;font-size:13px;">Inicio</a>
      <a href="../../aprende.html" style="color:rgba(255,255,255,.6);font-weight:700;font-size:13px;">Qué enseña la app</a>
      <a href="../index.html" style="color:rgba(255,255,255,.6);font-weight:700;font-size:13px;">Blog</a>
      <a href="../../privacy.html" style="color:rgba(255,255,255,.6);font-weight:700;font-size:13px;">Privacidad</a>
      <a href="../../terms.html" style="color:rgba(255,255,255,.6);font-weight:700;font-size:13px;">Términos</a>
    </div>
  </div>

</div>

<script>
(function() {
  var bar = document.getElementById('progress');
  function onScroll() {
    var h = document.documentElement;
    var max = (h.scrollHeight - h.clientHeight) || 1;
    var pct = Math.min(100, Math.max(0, (window.scrollY || h.scrollTop) / max * 100));
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
</script>

</body>
</html>
`;
}
