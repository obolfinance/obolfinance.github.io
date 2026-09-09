/**
 * Reviso la nota antes de que se publique. Si algo esta mal, no sale.
 *
 *     node automation/blog/verificar.mjs borrador.json
 *
 * Distingue dos cosas:
 *
 *   ERROR   frena la publicacion. Es para lo que no se puede arreglar despues
 *           sin que alguien lo haya visto en la pagina: una cifra inventada,
 *           una recomendacion de inversion, un slug repetido, HTML colado.
 *
 *   AVISO   se imprime y sigue. Es para lo cosmetico: una meta description de
 *           160 caracteres en vez de 155 no justifica que el blog se quede sin
 *           nota esa semana.
 *
 * Sobre el chequeo de cifras: es una heuristica, no una demostracion. Detecta
 * el caso peligroso —una cifra presentada como el valor de HOY que no salio de
 * las APIs— y deja pasar los ejemplos hipoteticos, que son legitimos y
 * frecuentes. Puede tener falsos positivos; para eso esta el mensaje, que dice
 * exactamente que oracion lo disparo.
 */

import { readFileSync, existsSync } from 'node:fs';
import { datosReales, numerosPermitidos } from './datos.mjs';

const RAIZ = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const leer = (rel) => JSON.parse(readFileSync(RAIZ + rel, 'utf8'));

const errores = [];
const avisos = [];
const error = (m) => errores.push(m);
const aviso = (m) => avisos.push(m);

const largo = (campo, txt, min, max) => {
  const n = [...String(txt ?? '')].length;
  if (n < min || n > max) aviso(`${campo}: ${n} caracteres (esperado ${min}-${max})`);
};

/** Marcas de que la frase habla del presente y no de un ejemplo inventado. */
const PRESENTE = /\b(hoy|actualmente|hoy en d[ií]a|en este momento|esta semana|este mes|ahora mismo|al d[ií]a de hoy|est[aá] en|cotiza|cerr[oó] en)\b/i;
/** Marcas de que el numero es un supuesto y no una afirmacion. */
const SUPUESTO = /\b(supongamos|supon[eé]|imagin[aeá]|digamos|si gast|si ten[eé]s|si un|por ejemplo|pongamos|hipot[eé]tic|redondeando|a modo de)\b/i;

/**
 * Cifras que un lector leeria como "un dato": plata o porcentajes.
 *
 * La coma va incluida en el tramo del porcentaje. Sin ella, "7,3%" no matcheaba
 * entero: el motor arrancaba de nuevo en el "3" y capturaba "3%", un numero
 * distinto del que decia la nota.
 */
const CIFRA = /(\$\s?[\d][\d.,]*|\b\d[\d.,]*\s?%|\b\d{1,3}(?:\.\d{3})+\b)/g;

const CONSEJO = [
  /\bte convien[ea]\s+(comprar|vender|invertir|meter)/i,
  /\b(te )?recomend(amos|a?mos|ás|as)\b[^.]{0,40}\b(comprar|vender|invertir)/i,
  /\bcompr[aá](te)?\s+(bitcoin|d[oó]lares|acciones|cedears)/i,
  /\bten[eé]s que (comprar|vender|invertir)\b/i,
  /\bla mejor inversi[oó]n es\b/i,
  /\bva a subir\b/i, /\bva a bajar\b/i,
  /\bgarantiz(a|ado|amos)\b/i,
];

/**
 * Marcadores de borrador sin terminar.
 *
 * Van en dos regex y no en una por una razon concreta: con el flag /i, "TODO"
 * matchea la palabra castellana "todo". El lead de una nota que empieza con
 * "Todos los meses sale un numero" quedaba marcado como relleno, y el chequeo
 * bloqueaba practicamente cualquier texto en espaniol.
 */
const RELLENO_MAYUS = /\b(TODO|TK|XXX|FIXME|PENDIENTE)\b/;
const RELLENO = /(lorem ipsum|placeholder|\[insertar|\[completar|\[dato\]|\[texto\])/i;

/** Solo estas tres marcas sobreviven al renderizado; el resto se escapa. */
const TAG_OK = /^(?:<\/?(?:strong|em)>|<span class="obol-mark">|<\/span>)$/;

function revisarTexto(donde, txt, permitidos) {
  const s = String(txt ?? '');

  for (const tag of s.match(/<[^>]*>/g) || []) {
    if (!TAG_OK.test(tag)) error(`${donde}: etiqueta no permitida ${tag} (se va a mostrar como texto)`);
  }
  if (RELLENO.test(s) || RELLENO_MAYUS.test(s)) error(`${donde}: quedo texto de relleno`);
  for (const re of CONSEJO) {
    if (re.test(s)) error(`${donde}: suena a recomendacion de inversion — "${(s.match(re) || [''])[0]}"`);
  }
  if (/!/.test(s)) aviso(`${donde}: tiene signo de exclamacion (el tono del blog no los usa)`);

  // Cifras: se mira oracion por oracion, porque el contexto de "hoy" o de
  // "supongamos" vive en la oracion, no en el parrafo.
  for (const frase of s.split(/(?<=[.:;])\s+/)) {
    if (!PRESENTE.test(frase) || SUPUESTO.test(frase)) continue;
    for (const bruto of frase.match(CIFRA) || []) {
      const n = bruto.replace(/[$%\s]/g, '');
      const variantes = [n, n.replace(/\./g, ''), n.replace(',', '.'), n.replace(/\./g, '').replace(',', '.')];
      if (!variantes.some((v) => permitidos.has(v) || permitidos.has(String(Number(v))))) {
        error(`${donde}: la cifra ${bruto} se presenta como dato actual y no salio de las APIs — "${frase.trim().slice(0, 110)}"`);
      }
    }
  }
}

async function main() {
  const ruta = process.argv[2];
  if (!ruta) { console.error('uso: node automation/blog/verificar.mjs <borrador.json>'); process.exit(2); }

  const nota = JSON.parse(readFileSync(ruta, 'utf8'));
  const { mundos } = leer('automation/blog/mundos.json');
  const { posts } = leer('automation/blog/publicados.json');
  const permitidos = numerosPermitidos(await datosReales());

  // — Identidad —
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nota.slug || '')) error(`slug invalido: ${nota.slug}`);
  if (posts.some((p) => p.slug === nota.slug)) error(`el slug ${nota.slug} ya existe en publicados.json`);
  if (existsSync(`${RAIZ}docs/blog/articulos/${nota.slug}.html`)) error(`ya existe el archivo ${nota.slug}.html`);
  if (!mundos.some((m) => m.id === nota.mundo)) error(`mundo inexistente: ${nota.mundo}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nota.fecha || '')) error(`fecha invalida: ${nota.fecha}`);

  // Un titulo casi igual a uno ya publicado significa tema repetido, aunque el
  // slug sea distinto. Se compara por palabras con contenido.
  const clave = (t) => new Set(String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/\W+/).filter((w) => w.length > 4));
  const nuevas = clave(nota.titulo);
  for (const p of posts) {
    const viejas = clave(p.titulo);
    const comunes = [...nuevas].filter((w) => viejas.has(w));
    if (comunes.length >= 3) error(`el titulo se parece demasiado a "${p.titulo}" (comparten: ${comunes.join(', ')})`);
  }

  // — Forma —
  largo('titulo', nota.titulo, 40, 80);
  largo('bajada', nota.bajada, 60, 130);
  largo('metaDescripcion', nota.metaDescripcion, 80, 155);
  largo('ogDescripcion', nota.ogDescripcion, 80, 200);
  largo('migaTitulo', nota.migaTitulo, 8, 40);
  largo('lead', nota.lead, 200, 400);
  largo('cierre', nota.cierre, 150, 350);
  if (!(nota.minutos >= 4 && nota.minutos <= 9)) error(`minutos fuera de rango: ${nota.minutos}`);

  const secs = nota.secciones || [];
  if (secs.length < 4 || secs.length > 6) error(`${secs.length} secciones (esperado 4 a 6)`);

  let bloques = 0, previaTuvoBloque = false;
  secs.forEach((s, i) => {
    const d = `seccion ${i + 1}`;
    if (!s.titulo) error(`${d}: sin titulo`);
    if (!Array.isArray(s.parrafos) || s.parrafos.length === 0) error(`${d}: sin parrafos`);
    for (const par of s.parrafos || []) {
      if (String(par).length < 80) aviso(`${d}: parrafo de ${String(par).length} caracteres, muy corto`);
    }
    if (s.bloque) {
      bloques++;
      const b = s.bloque;
      if (previaTuvoBloque) aviso(`${d}: dos bloques visuales seguidos`);
      if (b.tipo === 'dato' && (!b.numero || !b.texto)) error(`${d}: bloque dato incompleto`);
      if (b.tipo === 'dato' && [...String(b.numero)].length > 10) aviso(`${d}: la cifra grande "${b.numero}" no entra bien`);
      if (b.tipo === 'cita' && !b.texto) error(`${d}: bloque cita sin texto`);
      if (b.tipo === 'lista' && (!b.titulo || !(b.items || []).length)) error(`${d}: bloque lista incompleto`);
      if (b.tipo === 'lista' && (b.items || []).length > 4) aviso(`${d}: lista de ${b.items.length} puntos, se recomienda hasta 4`);
      previaTuvoBloque = true;
    } else previaTuvoBloque = false;
  });
  if (bloques === 0) aviso('la nota no tiene ningun bloque visual: va a ser una pared de texto');
  if (bloques > 3) aviso(`${bloques} bloques visuales (se recomienda hasta 3)`);

  // — Contenido —
  revisarTexto('lead', nota.lead, permitidos);
  revisarTexto('cierre', nota.cierre, permitidos);
  secs.forEach((s, i) => {
    revisarTexto(`seccion ${i + 1} titulo`, s.titulo, permitidos);
    (s.parrafos || []).forEach((par, j) => revisarTexto(`seccion ${i + 1} parrafo ${j + 1}`, par, permitidos));
    if (s.bloque) {
      revisarTexto(`seccion ${i + 1} bloque`, s.bloque.texto, permitidos);
      (s.bloque.items || []).forEach((it, j) => revisarTexto(`seccion ${i + 1} bloque item ${j + 1}`, it, permitidos));
    }
  });

  const palabras = [nota.lead, ...secs.flatMap((s) => s.parrafos || []), nota.cierre]
    .join(' ').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  if (palabras < 450) error(`la nota tiene ${palabras} palabras, es demasiado corta`);
  if (palabras > 1200) aviso(`la nota tiene ${palabras} palabras, es larga para el formato`);

  // — Informe —
  console.log(`${nota.slug} — ${palabras} palabras, ${secs.length} secciones, ${bloques} bloques`);
  for (const a of avisos) console.log(`  aviso  ${a}`);
  for (const e of errores) console.log(`  ERROR  ${e}`);
  console.log(errores.length ? `\n${errores.length} error(es): no se publica.` : `\nSin errores${avisos.length ? ` (${avisos.length} aviso/s)` : ''}.`);
  process.exit(errores.length ? 1 : 0);
}

main().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
