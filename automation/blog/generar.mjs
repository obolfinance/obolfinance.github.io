/**
 * Le pide a Claude la nota de la semana y la deja en un JSON.
 *
 *     ANTHROPIC_API_KEY=... node automation/blog/generar.mjs borrador.json
 *
 * Dos decisiones que hacen la diferencia entre esto y "pedile un blog a la IA":
 *
 *   1. El modelo devuelve DATOS, no HTML. La estructura la impone un esquema
 *      de herramienta, asi que no puede entregar una nota sin bajada, con tres
 *      secciones vacias o con un div sin cerrar.
 *
 *   2. Las cifras actuales vienen de las APIs (datos.mjs), no de su memoria.
 *      Un modelo al que le preguntas cuanto esta el dolar te contesta un
 *      numero con total seguridad, y ese numero no tiene por que ser cierto.
 *
 * No usa el SDK a proposito: con fetch alcanza y asi el repo del sitio no
 * necesita un package.json ni un npm install en CI.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { datosReales } from './datos.mjs';

const RAIZ = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MODELO = process.env.OBOL_MODELO || 'claude-opus-5';

const leer = (rel) => JSON.parse(readFileSync(RAIZ + rel, 'utf8'));

/**
 * Que tipo de nota toca.
 *
 * La seccion de noticias ya cubre la actualidad todos los dias, asi que el
 * blog no compite con eso: dos de cada tres semanas explica un concepto, y la
 * tercera mira la actualidad pero para explicar el mecanismo detras, no para
 * contar la novedad.
 */
function tipoDeSemana(fecha) {
  const inicio = Date.UTC(2026, 0, 1);
  const semana = Math.floor((Date.parse(fecha + 'T00:00:00Z') - inicio) / (7 * 86400000));
  return semana % 3 === 2 ? 'actualidad' : 'concepto';
}

/** Mundos disponibles: los tres ultimos usados quedan afuera, para que rote. */
function mundosCandidatos(mundos, posts) {
  const recientes = new Set(posts.slice(0, 3).map((p) => p.mundo));
  const libres = mundos.filter((m) => !recientes.has(m.id));
  return libres.length >= 3 ? libres : mundos;
}

const ESQUEMA = {
  type: 'object',
  required: ['slug', 'mundo', 'titulo', 'bajada', 'metaDescripcion', 'ogDescripcion',
    'migaTitulo', 'minutos', 'lead', 'secciones', 'cierre'],
  properties: {
    slug: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$',
      description: 'URL de la nota. Minusculas, sin acentos ni enies, palabras separadas por guion. 3 a 6 palabras.' },
    mundo: { type: 'string', description: 'El id del mundo elegido, tal cual figura en la lista.' },
    titulo: { type: 'string', description: 'Titulo de la nota. Entre 40 y 80 caracteres. Concreto, sin signos de exclamacion.' },
    bajada: { type: 'string', description: 'Una linea que va debajo del titulo en el hero. Entre 60 y 130 caracteres.' },
    metaDescripcion: { type: 'string', description: 'Para el <meta description>. Entre 80 y 155 caracteres.' },
    ogDescripcion: { type: 'string', description: 'Para redes y RSS. Entre 80 y 200 caracteres.' },
    migaTitulo: { type: 'string', description: 'Version corta del titulo para la miga de pan. Maximo 40 caracteres.' },
    minutos: { type: 'integer', minimum: 4, maximum: 9, description: 'Minutos de lectura estimados.' },
    lead: { type: 'string', description: 'Primer parrafo. Entra directo al tema, sin presentarse ni anunciar de que va a hablar. Entre 200 y 400 caracteres.' },
    secciones: {
      type: 'array', minItems: 4, maxItems: 6,
      items: {
        type: 'object',
        required: ['titulo', 'parrafos'],
        properties: {
          titulo: { type: 'string', description: 'Titulo de la seccion. Maximo 60 caracteres.' },
          parrafos: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } },
          bloque: {
            type: 'object',
            description: 'Elemento visual opcional. Como maximo tres en toda la nota, y nunca dos seguidos.',
            required: ['tipo'],
            properties: {
              tipo: { type: 'string', enum: ['dato', 'cita', 'lista'] },
              numero: { type: 'string', description: 'Solo para tipo dato: la cifra grande, corta. Ej "3 a 6", "70%".' },
              texto: { type: 'string', description: 'Para dato: que significa la cifra. Para cita: la frase, que se atribuye al personaje.' },
              titulo: { type: 'string', description: 'Solo para tipo lista: el encabezado. Ej "Errores comunes".' },
              items: { type: 'array', items: { type: 'string' }, description: 'Solo para tipo lista: 2 a 4 puntos.' },
            },
          },
        },
      },
    },
    cierre: { type: 'string', description: 'Parrafo final. Cierra la idea, no resume lo dicho. Entre 150 y 350 caracteres.' },
  },
};

function prompt({ tipo, fecha, mundos, posts, datos }) {
  const catalogo = mundos.map((m) =>
    `  - ${m.id}: firma "${m.autorConArticulo}", categoria ${m.categoria}. Temas: ${m.temas}`).join('\n');
  const publicadas = posts.map((p) => `  - [${p.mundo}] ${p.titulo}`).join('\n');

  const instruccionTipo = tipo === 'concepto'
    ? `Esta semana toca una nota DE CONCEPTO: explicar una idea de economia o finanzas que
le sirva a cualquiera, sin depender de lo que pase esta semana. Tiene que seguir
siendo util dentro de dos anios.`
    : `Esta semana toca una nota DE ACTUALIDAD, con una vuelta: el sitio ya tiene una
seccion de noticias que cuenta lo que pasa. Esta nota NO cuenta la novedad — toma
algo del contexto actual y explica el MECANISMO que hay detras, para que el lector
entienda por que pasa y no solo que paso.`;

  return `Escribis para el blog de Obol Finance, una app argentina de educacion economica
y financiera. Tu lector tipico tiene entre 18 y 35 anios, vive en Argentina, no
estudio economia, y quiere entender de verdad en vez de que le vendan algo.

${instruccionTipo}

COMO SE ESCRIBE ACA

- Voseo argentino ("vos tenes", "fijate", "pensalo"). Nunca "tu" ni "usted".
- Frases cortas. Si una oracion necesita dos comas para respirar, son dos oraciones.
- Concreto siempre. En vez de "es importante diversificar", explica que pasa
  cuando no lo haces, con un ejemplo que se pueda imaginar.
- Nada de entusiasmo vacio: sin signos de exclamacion, sin "increible", sin
  "la clave del exito". El tono es de alguien que te lo explica en un cafe.
- Se puede ser gracioso, pero por lo que se dice, no por como se dice.
- Nunca recomiendes comprar, vender ni invertir en nada concreto. Explicas como
  funciona algo; la decision es del lector.
- Marcas permitidas dentro del texto, con moderacion: <strong>, <em> y
  <span class="obol-mark">frase resaltada</span>. Nada mas: ninguna otra
  etiqueta HTML va a llegar a la pagina.

CIFRAS — LA REGLA QUE NO SE NEGOCIA

Podes citar como dato actual UNICAMENTE los numeros de este bloque. Cualquier
otra cifra presentada como el valor de hoy va a hacer fallar la publicacion.

${JSON.stringify(datos, null, 2)}

Si necesitas un ejemplo numerico que no este aca, planteralo como hipotetico y
que se note: "supongamos que gastas 500.000 por mes", "si un plazo fijo rinde
30% anual". Eso esta permitido y es lo que se espera.

Datos historicos y conceptuales de conocimiento general (que fue la crisis del
30, cuando se creo el euro, como funciona el interes compuesto) los podes usar
normalmente. La regla es sobre valores ACTUALES: precios, cotizaciones, tasas e
indices de hoy.

MUNDOS DISPONIBLES

Elegi uno. La nota la firma su personaje, asi que el tema tiene que ser de ese
mundo y el texto tiene que sonar a esa voz.

${catalogo}

YA PUBLICADAS — NO REPITAS NINGUNO DE ESTOS TEMAS

${publicadas}

La nota se publica el ${fecha}. Devolvela con la herramienta.`;
}

async function pedir(cuerpo) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(300000),
  });
  if (!r.ok) throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 500)}`);
  return r.json();
}

async function main() {
  const salida = process.argv[2];
  if (!salida) { console.error('uso: node automation/blog/generar.mjs <salida.json>'); process.exit(2); }
  if (!process.env.ANTHROPIC_API_KEY) { console.error('falta ANTHROPIC_API_KEY'); process.exit(2); }

  const fecha = process.env.OBOL_FECHA || new Date().toISOString().slice(0, 10);
  const tipo = process.env.OBOL_TIPO || tipoDeSemana(fecha);
  const { mundos } = leer('automation/blog/mundos.json');
  const { posts } = leer('automation/blog/publicados.json');
  const datos = await datosReales();
  const candidatos = mundosCandidatos(mundos, posts);

  console.log(`fecha ${fecha} · tipo ${tipo} · modelo ${MODELO}`);
  console.log(`mundos candidatos: ${candidatos.map((m) => m.id).join(', ')}`);

  const res = await pedir({
    model: MODELO,
    max_tokens: 8000,
    temperature: 1,
    tools: [{ name: 'nota', description: 'Entrega la nota del blog.', input_schema: ESQUEMA }],
    tool_choice: { type: 'tool', name: 'nota' },
    messages: [{ role: 'user', content: prompt({ tipo, fecha, mundos: candidatos, posts, datos }) }],
  });

  const uso = res.usage || {};
  console.log(`tokens: ${uso.input_tokens} entrada / ${uso.output_tokens} salida`);

  const bloque = res.content.find((c) => c.type === 'tool_use');
  if (!bloque) throw new Error('el modelo no devolvio la herramienta');

  const nota = { ...bloque.input, fecha, tipo };
  writeFileSync(salida, JSON.stringify(nota, null, 2) + '\n');

  console.log(`\n  ${nota.titulo}`);
  console.log(`  ${nota.slug}  ·  mundo ${nota.mundo}  ·  ${nota.secciones.length} secciones`);
  console.log(`\nborrador en ${salida}`);
}

main().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
