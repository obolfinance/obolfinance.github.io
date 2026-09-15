// Chequeo diario del sitio publicado (obolfinance.com.ar).
//
// Lo corre .github/workflows/monitoreo-sitio.yml todos los dias. Busca lo que
// se rompe sin que nadie se entere: una pagina que da error de JS o de CSP, las
// noticias que dejan de actualizarse (Modal caido o token de GitHub vencido),
// las cotizaciones que no cargan, un header de seguridad que desaparece de
// Cloudflare, el certificado por vencer o un webhook de n8n que no responde.
//
//     cd automation/monitoreo && npm ci && npx playwright install chromium
//     node revisar-sitio.mjs    # escribe resultado.md y sale con 1 si algo falla
//
// No manda nada a los formularios ni gasta ejecuciones de n8n: a los webhooks
// solo les pregunta por CORS (OPTIONS), que n8n contesta sin correr el workflow.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import tls from 'node:tls';

const SITIO = 'https://obolfinance.com.ar';
const HOST = 'obolfinance.com.ar';
const SALIDA = new URL('./resultado.md', import.meta.url);
const TIPOS_NOTICIA = ['mercado', 'reunion', 'discurso', 'empresa', 'economia'];
const N8N = 'https://obolfinance.app.n8n.cloud/webhook/';
const WEBHOOKS = ['obol-waitlist', 'obol-resenas', 'obol-recomendaciones'];
const HEADERS_SEGURIDAD = [
  'strict-transport-security', 'x-content-type-options', 'x-frame-options',
  'referrer-policy', 'permissions-policy', 'content-security-policy',
];
// Paginas que no estan en el sitemap pero tienen que existir (las legales las
// enlaza la ficha de Google Play).
const PAGINAS_EXTRA = ['/noticias.html', '/privacy.html', '/privacy-app.html', '/terms.html', '/terms-app.html', '/eliminar-cuenta.html'];

const resultados = []; // { grupo, nombre, ok, detalle }
const anotar = (grupo, nombre, ok, detalle = '') => resultados.push({ grupo, nombre, ok, detalle });
const sinCache = (u) => u + (u.includes('?') ? '&' : '?') + 'monitoreo=' + Date.now();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Un corte de red de un segundo no tiene que despertar a nadie: cada pedido
// se reintenta antes de darlo por fallado.
async function conReintento(fn, intentos = 3) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    try { return await fn(); } catch (e) { ultimo = e; await dormir(4000 * (i + 1)); }
  }
  throw ultimo;
}

// ── Paginas: todas responden 200 ────────────────────────────────────────
async function paginas() {
  let urls = [];
  try {
    const xml = await conReintento(async () => {
      const r = await fetch(sinCache(SITIO + '/sitemap.xml'));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    anotar('Paginas', 'sitemap.xml', urls.length > 0, urls.length + ' paginas');
  } catch (e) {
    anotar('Paginas', 'sitemap.xml', false, e.message);
  }
  const todas = [...new Set([...urls, ...PAGINAS_EXTRA.map((p) => SITIO + p)])];
  for (const u of todas) {
    const ruta = u.replace(SITIO, '') || '/';
    try {
      const r = await conReintento(async () => {
        const r = await fetch(sinCache(u));
        if (r.status >= 500) throw new Error('HTTP ' + r.status);
        return r;
      });
      anotar('Paginas', ruta, r.status === 200, 'HTTP ' + r.status);
    } catch (e) {
      anotar('Paginas', ruta, false, e.message);
    }
  }
  return urls;
}

// ── Seguridad: headers de Cloudflare y CSP ──────────────────────────────
async function headers() {
  try {
    const r = await conReintento(() => fetch(sinCache(SITIO + '/')));
    for (const h of HEADERS_SEGURIDAD) {
      anotar('Seguridad', 'header ' + h, r.headers.has(h), r.headers.has(h) ? '' : 'falta: revisar las Transform Rules de Cloudflare');
    }
    const cookies = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
    anotar('Seguridad', 'la home no pone cookies', cookies.length === 0, cookies.join(' | ').slice(0, 100));

    const csp = r.headers.get('content-security-policy') || '';
    const scriptSrc = (csp.match(/script-src[^;]*/) || [''])[0];
    anotar('Seguridad', "CSP de Cloudflare sin 'unsafe-inline' en scripts", scriptSrc !== '' && !scriptSrc.includes("'unsafe-inline'"), scriptSrc || 'no hay script-src');

    const html = await r.text();
    const meta = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
    const metaScript = (meta.match(/script-src[^;]*/) || [''])[0];
    anotar('Seguridad', "CSP de la pagina sin 'unsafe-inline' en scripts", metaScript !== '' && !metaScript.includes("'unsafe-inline'"), metaScript || 'no hay CSP en el meta');
  } catch (e) {
    anotar('Seguridad', 'headers de la home', false, e.message);
  }
}

function diasDeCertificado() {
  return new Promise((resolve, reject) => {
    const s = tls.connect({ host: HOST, port: 443, servername: HOST, timeout: 15000 }, () => {
      const c = s.getPeerCertificate();
      s.end();
      if (!c || !c.valid_to) return reject(new Error('no se pudo leer el certificado'));
      resolve(Math.floor((new Date(c.valid_to).getTime() - Date.now()) / 86400000));
    });
    s.on('error', reject);
    s.on('timeout', () => { s.destroy(); reject(new Error('timeout')); });
  });
}

async function certificado() {
  try {
    const dias = await conReintento(diasDeCertificado);
    anotar('Seguridad', 'certificado HTTPS', dias > 14, 'vence en ' + dias + ' dias');
  } catch (e) {
    anotar('Seguridad', 'certificado HTTPS', false, e.message);
  }
}

// ── Noticias: el job de Modal sigue publicando ──────────────────────────
async function noticias() {
  try {
    const j = await conReintento(async () => {
      const r = await fetch(sinCache(SITIO + '/noticias.json'));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
    // Corre dos veces por dia; 26 horas deja margen para que falle una corrida
    // suelta sin avisar, pero no dos seguidas.
    const horas = (Date.now() - new Date(j.generated_at).getTime()) / 3600000;
    anotar('Noticias', 'actualizadas en las ultimas 26 horas', horas <= 26,
      'ultima hace ' + horas.toFixed(1) + ' h' + (horas <= 26 ? '' : ': revisar el job obol-noticias en Modal y si vencio el token de GitHub'));
    const items = Array.isArray(j.items) ? j.items : [];
    const raros = items.filter((it) => !TIPOS_NOTICIA.includes(it.type) || (it.source_url && !String(it.source_url).startsWith('https://')));
    anotar('Noticias', 'noticias con forma valida', items.length > 0 && raros.length === 0, items.length + ' noticias, ' + raros.length + ' con tipo o link invalido');
  } catch (e) {
    anotar('Noticias', 'noticias.json', false, e.message);
  }
}

// ── Formularios: los webhooks de n8n estan publicados ───────────────────
async function webhooks() {
  for (const w of WEBHOOKS) {
    try {
      const r = await conReintento(() => fetch(N8N + w, {
        method: 'OPTIONS',
        headers: { Origin: SITIO, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
      }));
      const acao = r.headers.get('access-control-allow-origin');
      anotar('Formularios (n8n)', w, r.status < 300 && acao === SITIO,
        'HTTP ' + r.status + ', CORS: ' + (acao || 'sin header') + (r.status === 404 ? ': el workflow no esta publicado' : ''));
    } catch (e) {
      anotar('Formularios (n8n)', w, false, e.message);
    }
  }
}

// ── Navegador: las paginas cargan y funcionan ───────────────────────────
async function navegador(urlsSitemap) {
  const nota = (urlsSitemap.find((u) => u.includes('/blog/articulos/')) || SITIO + '/blog/articulos/fondo-de-emergencia.html').replace(SITIO, '');
  const CASOS = [
    ['/', async (p) => {
      const tipo = await p.evaluate(() => typeof window.supabase);
      return [tipo === 'object', 'supabase-js: ' + tipo];
    }],
    ['/aprende.html', async (p) => {
      await p.locator('#seg-juegos').click();
      const d = await p.evaluate(() => getComputedStyle(document.getElementById('tab-juegos')).display);
      return [d === 'block', 'pestaña juegos: ' + d];
    }],
    ['/blog/index.html', async (p) => {
      await p.locator('[data-libro]').first().click();
      const abierto = await p.evaluate(() => document.getElementById('bookModal').style.display);
      await p.locator('#bookModal [data-cerrar-libro]').first().click();
      const cerrado = await p.evaluate(() => document.getElementById('bookModal').style.display);
      return [abierto === 'flex' && cerrado === 'none', 'modal de libros: ' + abierto + ' -> ' + cerrado];
    }],
    [nota, async (p) => {
      const largo = await p.evaluate(() => document.body.innerText.length);
      return [largo > 1500, largo + ' caracteres de texto'];
    }],
    ['/noticias.html', async (p) => {
      await p.waitForSelector('.news-card', { timeout: 15000 }).catch(() => {});
      const n = await p.locator('.news-card').count();
      return [n > 0, n + ' noticias en pantalla'];
    }],
    ['/dolar.html', async (p) => {
      await p.waitForFunction(() => {
        const c = document.getElementById('cotizCards');
        return c && c.children.length > 0;
      }, null, { timeout: 30000 }).catch(() => {});
      const n = await p.evaluate(() => document.getElementById('cotizCards').children.length);
      return [n > 0, n + ' cotizaciones'];
    }],
  ];

  const nav = await chromium.launch();
  try {
    for (const [ruta, prueba] of CASOS) {
      const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
      await ctx.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) => {
          console.error('CSPV ' + e.violatedDirective + ' | ' + (e.blockedURI || 'inline'));
        });
      });
      const page = await ctx.newPage();
      const csp = [];
      const errores = [];
      page.on('console', (m) => {
        const t = m.text();
        if (t.startsWith('CSPV') || t.includes('Content Security Policy')) csp.push(t.slice(0, 150));
        // Turnstile en un navegador automatizado siempre protesta: no es un error del sitio.
        else if (m.type() === 'error' && !/Failed to load resource|turnstile|challenges\.cloudflare/i.test(t)) errores.push(t.slice(0, 150));
      });
      page.on('pageerror', (e) => errores.push(String(e.message).slice(0, 150)));
      try {
        await conReintento(() => page.goto(sinCache(SITIO + ruta), { waitUntil: 'load', timeout: 45000 }), 2);
        await page.waitForTimeout(2500);
        const [ok, detalle] = await prueba(page);
        anotar('Navegador', ruta + ' funciona', ok, detalle);
      } catch (e) {
        anotar('Navegador', ruta + ' funciona', false, String(e.message).split('\n')[0].slice(0, 150));
      }
      anotar('Navegador', ruta + ' sin errores de JavaScript', errores.length === 0, errores.slice(0, 3).join(' | '));
      anotar('Navegador', ruta + ' sin bloqueos de CSP', csp.length === 0, csp.slice(0, 3).join(' | '));
      await ctx.close();
    }
  } finally {
    await nav.close();
  }
}

// ── Informe ─────────────────────────────────────────────────────────────
const urls = await paginas();
await headers();
await certificado();
await noticias();
await webhooks();
await navegador(urls);

const fallas = resultados.filter((r) => !r.ok);
const fecha = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
let md = `## Monitoreo del sitio — ${fecha}\n\n`;
md += fallas.length
  ? `**Fallaron ${fallas.length} de ${resultados.length} chequeos.**\n\n### Lo que fallo\n\n` + fallas.map((f) => `- **${f.grupo} · ${f.nombre}**${f.detalle ? ': ' + f.detalle : ''}`).join('\n') + '\n\n'
  : `Todo OK: pasaron los ${resultados.length} chequeos.\n\n`;
md += '<details><summary>Todos los chequeos</summary>\n\n';
md += resultados.map((r) => `- ${r.ok ? '✅' : '❌'} ${r.grupo} · ${r.nombre}${r.detalle ? ' — ' + r.detalle : ''}`).join('\n');
md += '\n\n</details>\n';

writeFileSync(SALIDA, md);
console.log(md);
process.exit(fallas.length ? 1 : 0);
