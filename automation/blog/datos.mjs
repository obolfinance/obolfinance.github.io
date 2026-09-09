/**
 * Datos reales para anclar la nota.
 *
 * Un modelo sin datos no dice "no sé cuánto está el dólar": dice un número.
 * Y un número inventado en una nota de finanzas es exactamente el error que
 * no se puede cometer, porque el lector no tiene forma de distinguirlo de uno
 * correcto. Asi que se le pasan las cifras de verdad y se le prohibe usar
 * otras — y despues verificar.mjs revisa que haya obedecido.
 *
 * Las tres fuentes son las mismas que ya consume el sitio (dolar.html), asi
 * que no se agrega ninguna dependencia externa nueva.
 */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

async function traer(url, queEs) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${queEs}: HTTP ${r.status}`);
  return r.json();
}

const nombreMes = (iso) => {
  const [a, m] = iso.split('-').map(Number);
  return `${MESES[m - 1]} ${a}`;
};

export async function datosReales() {
  const [dolares, inflacion, interanual, plazos] = await Promise.all([
    traer('https://dolarapi.com/v1/dolares', 'dolares'),
    traer('https://api.argentinadatos.com/v1/finanzas/indices/inflacion', 'inflacion'),
    traer('https://api.argentinadatos.com/v1/finanzas/indices/inflacionInteranual', 'interanual'),
    traer('https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo', 'plazo fijo')
      .catch(() => []),
  ]);

  const ultimos = inflacion.slice(-6).map((x) => ({ mes: nombreMes(x.fecha), pct: x.valor }));
  const ia = interanual.at(-1);

  // Solo las tasas de los bancos mas grandes: doce filas de bancos que nadie
  // nombra no le agregan nada a una nota y le dan al modelo mas numeros para
  // confundir entre si.
  const tasas = plazos
    .filter((t) => t.tnaClientes != null)
    .sort((a, b) => b.tnaClientes - a.tnaClientes)
    .slice(0, 5)
    .map((t) => ({ banco: t.entidad, tna: +(t.tnaClientes * 100).toFixed(2) }));

  return {
    generadoEl: new Date().toISOString(),
    dolar: dolares.map((d) => ({ tipo: d.nombre, compra: d.compra, venta: d.venta })),
    inflacionMensual: ultimos,
    inflacionInteranual: ia ? { mes: nombreMes(ia.fecha), pct: ia.valor } : null,
    plazoFijoTNA: tasas,
  };
}

/**
 * Todos los numeros que el modelo tiene permitido citar como dato actual,
 * como strings sueltos. verificar.mjs los usa para decidir si una cifra que
 * aparece en la nota salio de aca o se la invento.
 */
export function numerosPermitidos(d) {
  const n = new Set();
  const meter = (v) => {
    if (v == null) return;
    n.add(String(v));
    n.add(String(v).replace('.', ','));
    // El separador de miles solo aplica a valores grandes (precios del dolar).
    //
    // Antes se agregaba el redondeo de CUALQUIER valor, y eso metia "3" en la
    // lista de permitidos —porque la inflacion de febrero fue 2,9%—. Con "3"
    // adentro, una nota que dijera "la inflacion de agosto fue del 7,3%" pasaba
    // el control: el verificador encontraba el "3" y lo daba por bueno. El
    // chequeo existia y no servia para nada.
    if (Number.isFinite(v) && Math.abs(v) >= 1000) n.add(Math.round(v).toLocaleString('es-AR'));
  };
  for (const x of d.dolar) { meter(x.compra); meter(x.venta); }
  for (const x of d.inflacionMensual) meter(x.pct);
  if (d.inflacionInteranual) meter(d.inflacionInteranual.pct);
  for (const x of d.plazoFijoTNA) meter(x.tna);
  return n;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('datos.mjs')) {
  datosReales().then((d) => console.log(JSON.stringify(d, null, 2)));
}
