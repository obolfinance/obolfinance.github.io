/**
 * Revisa el blog ya escrito en disco, no el borrador.
 *
 *     node automation/blog/revisar.mjs
 *
 * verificar.mjs mira el texto antes de renderizar; esto mira el resultado. Son
 * fallas distintas: una nota con el texto impecable igual queda rota si apunta
 * a un personaje que no existe, si el feed quedo mal formado o si el HTML tiene
 * un div sin cerrar.
 *
 * En el workflow corre DESPUES de publicar y ANTES de commitear. Si falla, no
 * hay commit, y como el sitio se publica commiteando, un fallo aca no llega a
 * verse en internet: el runner se tira y el repo queda como estaba.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';

const RAIZ = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ART = 'docs/blog/articulos';

const problemas = [];
const mal = (m) => problemas.push(m);

const VACIOS = new Set(['meta', 'link', 'img', 'br', 'hr', 'input', 'source', 'area',
  'base', 'col', 'embed', 'param', 'track', 'wbr']);

/** Etiquetas abiertas que nunca se cerraron, o cerradas fuera de orden. */
function balance(html) {
  const cuerpo = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!DOCTYPE[^>]*>/i, '');
  const pila = [], errs = [], re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  let m;
  while ((m = re.exec(cuerpo)) !== null) {
    const [, cierre, crudo, auto] = m;
    const tag = crudo.toLowerCase();
    if (VACIOS.has(tag) || auto) continue;
    if (cierre) {
      const t = pila.pop();
      if (t !== tag) errs.push(`cierra </${tag}> con <${t}> abierto`);
    } else pila.push(tag);
  }
  if (pila.length) errs.push(`sin cerrar: ${pila.join(', ')}`);
  return errs;
}

/** Todo lo local a lo que apunta la pagina tiene que existir en el disco. */
function referencias(archivo, html) {
  const base = dirname(archivo);
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href)="((?!https?:|#|mailto:|data:)[^"]+)"/g)) refs.add(m[1]);
  for (const m of html.matchAll(/url\('([^']+)'\)/g)) refs.add(m[1]);
  for (const r of refs) {
    // El ancla no es parte del archivo: index.html#anotarse apunta a index.html.
    const ruta = r.split('#')[0];
    if (!ruta) continue;
    if (!existsSync(normalize(join(RAIZ, base, ruta)))) mal(`${archivo}: referencia rota -> ${r}`);
  }
}

function xmlPlausible(archivo) {
  const x = readFileSync(RAIZ + archivo, 'utf8');
  const abre = (x.match(/<(?!\/|\?|!)([a-zA-Z:]+)[^>]*?(?<!\/)>/g) || []).length;
  const cierra = (x.match(/<\/[a-zA-Z:]+>/g) || []).length;
  if (abre !== cierra) mal(`${archivo}: ${abre} etiquetas abiertas contra ${cierra} cerradas`);
  for (const amp of x.match(/&(?![a-z]+;|#\d+;)/gi) || []) {
    mal(`${archivo}: ampersand sin escapar cerca de "${x.slice(x.indexOf(amp) - 30, x.indexOf(amp) + 20)}"`);
    break;
  }
  return x;
}

function main() {
  const { posts } = JSON.parse(readFileSync(RAIZ + 'automation/blog/publicados.json', 'utf8'));
  const archivos = readdirSync(RAIZ + ART).filter((f) => f.endsWith('.html'));

  // 1. Cada nota: HTML balanceado y referencias que existen.
  for (const f of archivos) {
    const rel = `${ART}/${f}`;
    const html = readFileSync(RAIZ + rel, 'utf8');
    for (const e of balance(html)) mal(`${rel}: ${e}`);
    referencias(rel, html);
  }

  // 2. El indice interno y el disco tienen que decir lo mismo. Si se desfasan,
  //    la proxima nota puede elegir un slug que ya existe o repetir un tema.
  const enDisco = new Set(archivos.map((f) => f.replace(/\.html$/, '')));
  const enIndice = new Set(posts.map((p) => p.slug));
  for (const s of enDisco) if (!enIndice.has(s)) mal(`${s}.html existe pero no esta en publicados.json`);
  for (const s of enIndice) if (!enDisco.has(s)) mal(`publicados.json lista ${s} pero no existe el archivo`);

  // 3. Feed y sitemap: XML sano y una entrada por nota.
  const feed = xmlPlausible('docs/feed.xml');
  const sitemap = xmlPlausible('docs/sitemap.xml');
  const indice = readFileSync(RAIZ + 'docs/blog/index.html', 'utf8');
  for (const s of enDisco) {
    if (!feed.includes(`/blog/articulos/${s}.html`)) mal(`${s} no esta en feed.xml`);
    if (!sitemap.includes(`/blog/articulos/${s}.html`)) mal(`${s} no esta en sitemap.xml`);
    if (!indice.includes(`./articulos/${s}.html`)) mal(`${s} no tiene tarjeta en el indice del blog`);
  }

  // 4. El marcador de insercion tiene que seguir ahi o la proxima nota falla.
  if (!indice.includes('NOTAS:INICIO')) mal('el indice perdio el marcador NOTAS:INICIO');

  console.log(`${archivos.length} notas revisadas`);
  for (const p of problemas) console.log(`  MAL  ${p}`);
  console.log(problemas.length ? `\n${problemas.length} problema(s).` : '\nTodo OK.');
  process.exit(problemas.length ? 1 : 0);
}

main();
