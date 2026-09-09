/**
 * Vuelca el borrador como markdown legible.
 *
 *     node automation/blog/resumen.mjs borrador.json [--completo]
 *
 * Sin --completo imprime la ficha: titulo, mundo, cuantas secciones. Con
 * --completo imprime la nota entera.
 *
 * Existe por el modo ensayo. Un ensayo que corre, dice "sin errores" y no te
 * deja leer lo que escribio no sirve para decidir si el sistema esta listo:
 * te confirma que el pipeline anda, que es justo lo que menos dudas daba.
 */

import { readFileSync } from 'node:fs';

const ruta = process.argv[2];
const completo = process.argv.includes('--completo');
if (!ruta) { console.error('uso: node automation/blog/resumen.mjs <borrador.json> [--completo]'); process.exit(2); }

const n = JSON.parse(readFileSync(ruta, 'utf8'));
const l = (s = '') => console.log(s);

l(`### ${n.titulo}`);
l();
l(`> ${n.bajada}`);
l();
l(`\`${n.slug}\` · mundo **${n.mundo}** · ${n.tipo} · ${n.secciones.length} secciones · ${n.minutos} min`);
l();

if (!completo) process.exit(0);

l('---');
l();
l(n.lead);
l();

for (const [i, s] of n.secciones.entries()) {
  l(`#### ${String(i + 1).padStart(2, '0')} · ${s.titulo}`);
  l();
  for (const par of s.parrafos) { l(par); l(); }
  const b = s.bloque;
  if (!b) continue;
  if (b.tipo === 'dato') l(`> **${b.numero}** — ${b.texto}`);
  if (b.tipo === 'cita') l(`> *"${b.texto}"*`);
  if (b.tipo === 'lista') { l(`> **${b.titulo}**`); for (const it of b.items) l(`> - ${it}`); }
  l();
}

l(n.cierre);
l();
l('---');
l();
l('*Esta nota tiene fines educativos. No es asesoramiento financiero, de inversión, legal ni fiscal.*');
