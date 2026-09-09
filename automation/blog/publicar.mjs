/**
 * Publica una nota: escribe el articulo y lo enchufa en los otros tres lugares
 * donde el sitio lo tiene que mencionar.
 *
 *     node automation/blog/publicar.mjs borrador.json
 *
 * Los cuatro archivos que toca:
 *
 *   docs/blog/articulos/<slug>.html   la nota
 *   docs/blog/index.html              la tarjeta en la grilla
 *   docs/feed.xml                     el item del RSS
 *   docs/sitemap.xml                  la URL para Google
 *
 * Publicar a mano significaba acordarse de los cuatro. El feed era el que
 * siempre se olvidaba, y un feed desactualizado no rompe nada visible: la
 * pagina se ve perfecta y los lectores por RSS simplemente no se enteran.
 *
 * Es idempotente: si el slug ya existe, no hace nada y sale con codigo 0. Eso
 * permite que el workflow reintente sin duplicar tarjetas.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { renderArticulo, esc, plano, fechaLarga, SITIO } from './plantilla.mjs';

const RAIZ = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const p = (rel) => RAIZ + rel;

const ART = 'docs/blog/articulos';
const INDICE = 'docs/blog/index.html';
const FEED = 'docs/feed.xml';
const SITEMAP = 'docs/sitemap.xml';
const PUBLICADOS = 'automation/blog/publicados.json';
const MUNDOS = 'automation/blog/mundos.json';

const leerJSON = (rel) => JSON.parse(readFileSync(p(rel), 'utf8'));

/** #1e3b2c -> "30,59,44", para las rgba() de los degrades de la tarjeta. */
function aRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/**
 * Todo el sitio esta guardado en CRLF y no hay .gitattributes que lo imponga.
 * El runner de Actions es Linux, donde node escribe LF: sin esto, cada nota
 * publicada desde CI dejaria el archivo mezclado y git marcaria como cambiadas
 * lineas que nadie toco. Se detecta en vez de asumir, para que siga andando si
 * algun dia el repo se normaliza a LF.
 */
const eolDe = (texto) => (texto.includes('\r\n') ? '\r\n' : '\n');
const aEOL = (texto, eol) => texto.replace(/\r?\n/g, eol);

/**
 * Tres notas para "Segui leyendo".
 *
 * Prioriza mundos distintos al de la nota: tres notas de cripto abajo de una
 * nota de cripto no le da al lector ningun lado nuevo adonde ir.
 */
function relacionadas(nota, posts) {
  const otras = posts.filter((x) => x.slug !== nota.slug);
  const distintas = otras.filter((x) => x.mundo !== nota.mundo);
  const elegidas = distintas.slice(0, 3);
  for (const o of otras) {
    if (elegidas.length >= 3) break;
    if (!elegidas.includes(o)) elegidas.push(o);
  }
  return elegidas;
}

function tarjetaIndice(nota, m) {
  const rgb = aRGB(m.paleta.hero);
  return `
        <a href="./articulos/${esc(nota.slug)}.html" style="display:block;position:relative;">
          <div class="obol-card" style="position:relative;border-radius:24px;overflow:hidden;height:250px;background:${m.paleta.hero};box-shadow:0 18px 36px -16px rgba(${rgb},.5);">
            <div style="position:absolute;inset:0;background-image:url('./assets/${m.bgTarjeta}');background-size:cover;background-position:center 42%;"></div>
            <div style="position:absolute;inset:0;background:linear-gradient(100deg,rgba(${rgb},.88) 0%,rgba(${rgb},.6) 48%,rgba(${rgb},.18) 72%,rgba(${rgb},0) 100%);"></div>
            <div style="position:relative;padding:28px 30px;max-width:66%;height:100%;display:flex;flex-direction:column;justify-content:center;gap:10px;">
              <span style="display:inline-flex;align-self:flex-start;font-family:'Fredoka',sans-serif;font-weight:600;font-size:11px;letter-spacing:.1em;color:#fff;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.26);padding:5px 12px;border-radius:999px;text-transform:uppercase;">${esc(m.categoria)}</span>
              <h3 style="margin:0;font-family:'Fredoka',sans-serif;font-weight:700;font-size:19px;line-height:1.22;color:#fff;">${esc(nota.titulo)}</h3>
              <span style="font-weight:700;font-size:12px;color:rgba(255,255,255,.68);">Por ${esc(m.autorConArticulo.replace(/^(El|La) /, (s) => s.toLowerCase()))} · ${fechaLarga(nota.fecha)}</span>
            </div>
          </div>
          <img src="./assets/${m.char}-card.png" alt="${esc(m.autorConArticulo)}" style="position:absolute;right:-10px;bottom:-14px;width:${m.anchoGrilla}px;height:auto;pointer-events:none;filter:drop-shadow(0 14px 16px rgba(4,10,14,.4));z-index:3;" loading="lazy">
        </a>
`;
}

/** Viernes 9 AM en formato RFC 822, que es lo que pide RSS. */
function fechaRSS(iso) {
  const dias = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const meses = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(`${iso}T09:00:00-03:00`);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${dias[d.getUTCDay()]}, ${dd} ${meses[d.getUTCMonth()]} ${d.getUTCFullYear()} 09:00:00 -0300`;
}

function itemFeed(nota, m) {
  const url = `${SITIO}/blog/articulos/${nota.slug}.html`;
  return `
  <item>
    <title>${esc(nota.titulo)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <description>${esc(plano(nota.ogDescripcion))}</description>
    <category>${esc(m.categoria)}</category>
    <author>obol.finance2026@gmail.com (${esc(m.autor)})</author>
    <pubDate>${fechaRSS(nota.fecha)}</pubDate>
  </item>
`;
}

function insertarDespues(texto, ancla, agregado, queArchivo) {
  const n = texto.split(ancla).length - 1;
  if (n !== 1) throw new Error(`${queArchivo}: el ancla aparece ${n} veces, esperaba 1`);
  return texto.replace(ancla, ancla + aEOL(agregado, eolDe(texto)));
}

function main() {
  const ruta = process.argv[2];
  if (!ruta) { console.error('uso: node automation/blog/publicar.mjs <borrador.json>'); process.exit(2); }

  const nota = JSON.parse(readFileSync(ruta, 'utf8'));
  const { mundos } = leerJSON(MUNDOS);
  const idx = leerJSON(PUBLICADOS);
  const m = mundos.find((x) => x.id === nota.mundo);
  if (!m) throw new Error(`mundo inexistente: ${nota.mundo}`);

  if (existsSync(p(`${ART}/${nota.slug}.html`))) {
    console.log(`ya publicada: ${nota.slug} — no se toca nada`);
    return;
  }

  // Se calcula TODO antes de escribir NADA.
  //
  // La version anterior escribia archivo por archivo, y cuando el cuarto fallo
  // por una tonteria (el ancla del sitemap no matcheaba) el sitio ya tenia el
  // articulo publicado, la tarjeta en el indice y el item en el RSS, pero sin
  // entrada en el sitemap. Un fallo a mitad de camino es peor que un fallo
  // limpio: deja el sitio en un estado que nadie eligio y que hay que
  // desarmar a mano.
  const rel = relacionadas(nota, idx.posts);
  const articulo = renderArticulo(nota, mundos, rel);

  const indice = insertarDespues(
    readFileSync(p(INDICE), 'utf8'),
    '<!-- NOTAS:INICIO — las notas nuevas se insertan aca (automation/blog/publicar.mjs) -->',
    tarjetaIndice(nota, m), INDICE);

  const feed = insertarDespues(
    readFileSync(p(FEED), 'utf8'),
    '<atom:link href="https://obolfinance.com.ar/feed.xml" rel="self" type="application/rss+xml"/>',
    itemFeed(nota, m), FEED);

  const sitemap = insertarDespues(
    readFileSync(p(SITEMAP), 'utf8'),
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `\n  <url>\n    <loc>${SITIO}/blog/articulos/${nota.slug}.html</loc>\n` +
    `    <lastmod>${nota.fecha}</lastmod>\n    <changefreq>yearly</changefreq>\n` +
    `    <priority>0.6</priority>\n  </url>`, SITEMAP);

  idx.posts.unshift({
    slug: nota.slug, titulo: nota.titulo, bajada: nota.ogDescripcion,
    categoria: m.categoria, mundo: nota.mundo, fecha: nota.fecha,
  });

  // El articulo copia el fin de linea de las notas que ya estan, no el del
  // sistema donde corre el script.
  const eolArticulos = eolDe(readFileSync(p(`${ART}/${idx.posts[1].slug}.html`), 'utf8'));

  writeFileSync(p(`${ART}/${nota.slug}.html`), aEOL(articulo, eolArticulos));
  writeFileSync(p(INDICE), indice);
  writeFileSync(p(FEED), feed);
  writeFileSync(p(SITEMAP), sitemap);
  writeFileSync(p(PUBLICADOS), JSON.stringify(idx, null, 2) + '\n');

  console.log(`publicada: ${nota.slug}`);
  console.log(`  mundo:        ${m.id} (${m.autorConArticulo})`);
  console.log(`  relacionadas: ${rel.map((r) => r.slug).join(', ')}`);
  console.log(`  archivos:     articulo + indice + feed + sitemap + publicados.json`);
}

main();
