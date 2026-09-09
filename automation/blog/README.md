# La nota de los viernes

Todos los viernes a las 9 de la mañana (hora argentina) se publica una nota
nueva en el blog, sin que nadie la toque.

```
generar  ->  verificar  ->  publicar  ->  revisar  ->  commit
```

El commit va último a propósito. El sitio se publica commiteando, así que
mientras no haya commit no hay nada en internet: si falla cualquier eslabón, el
runner se descarta y el repo queda como estaba. Una nota a medio publicar no
puede llegar a verse.

## Por qué existe

Publicar a mano significaba editar cuatro archivos: el artículo, la tarjeta en
`docs/blog/index.html`, el `<item>` de `docs/feed.xml` y la `<url>` de
`docs/sitemap.xml`. El feed era el que siempre se olvidaba, y un feed
desactualizado no rompe nada visible — la página se ve perfecta y los lectores
por RSS simplemente no se enteran.

Ocho notas del 22 de julio y una del 21 de agosto: no fue falta de ganas.

## Los archivos

| Archivo | Qué hace |
|---|---|
| `mundos.json` | Los 9 mundos: categoría, personaje, fondo, paleta, anchos. El catálogo cerrado del que el generador elige. |
| `publicados.json` | Índice de lo ya publicado. Alimenta las notas relacionadas y evita que se repitan temas. |
| `datos.mjs` | Trae dólar, inflación y plazos fijos de las APIs que ya usa el sitio. |
| `generar.mjs` | Le pide la nota a Claude y la deja en un JSON. |
| `verificar.mjs` | Revisa el borrador. Si hay un error, no se publica. |
| `plantilla.mjs` | Convierte la nota en el HTML del artículo. |
| `publicar.mjs` | Escribe el artículo y lo enchufa en índice, feed y sitemap. |
| `revisar.mjs` | Revisa el sitio ya escrito: HTML balanceado, imágenes que existen, feed completo. |

## Las tres decisiones que sostienen esto

**El modelo devuelve datos, nunca HTML.** La estructura la impone un esquema de
herramienta, así que no puede entregar una nota sin bajada ni un `<div>` sin
cerrar. `plantilla.mjs` arma el markup, que es el mismo de las notas escritas a
mano.

**Las cifras actuales salen de las APIs, no de su memoria.** A un modelo al que
le preguntás cuánto está el dólar te contesta un número con total seguridad, y
ese número no tiene por qué ser cierto. Se le pasan los valores reales, se le
prohíbe usar otros, y después `verificar.mjs` chequea que haya obedecido.

**El catálogo de mundos es cerrado.** Cada mundo tiene un personaje y un fondo
ya dibujados. Si el generador pudiera inventar un mundo, la nota saldría sin
imágenes y con el personaje roto — y eso no lo detecta ningún chequeo de HTML.

## Qué frena una publicación y qué no

`verificar.mjs` distingue dos cosas:

**ERROR — no se publica.** Una cifra presentada como dato de hoy que no salió de
las APIs. Algo que suene a recomendación de inversión. HTML que no sea
`<strong>`, `<em>` o `<span class="obol-mark">`. Un slug repetido. Un título
demasiado parecido a uno existente. Texto de relleno. Menos de 450 palabras.

**AVISO — se imprime y sigue.** Longitudes fuera de rango, párrafos cortos, dos
bloques visuales seguidos. Una meta description de 160 caracteres en vez de 155
no justifica que el blog se quede sin nota esa semana.

El chequeo de cifras es una heurística, no una demostración: busca oraciones que
hablen del presente ("hoy", "actualmente", "cotiza") y exige que los números que
contengan estén en los datos traídos de las APIs. Los ejemplos hipotéticos
("supongamos que gastás $500.000") quedan exentos, porque son legítimos y
frecuentes. Puede tener falsos positivos; el mensaje dice qué oración lo
disparó.

## Rotación de temas

Dos de cada tres semanas la nota explica un concepto; la tercera mira la
actualidad, pero para explicar el mecanismo detrás y no para contar la novedad
— de eso ya se encarga la sección de noticias.

Los tres mundos usados más recientemente quedan fuera de la elección, así que no
salen tres notas seguidas del mismo personaje.

## Correrlo a mano

```bash
# El borrador, sin tocar el sitio
ANTHROPIC_API_KEY=... node automation/blog/generar.mjs borrador.json
node automation/blog/verificar.mjs borrador.json

# Publicarlo
node automation/blog/publicar.mjs borrador.json
node automation/blog/revisar.mjs
```

Variables: `OBOL_TIPO` (`concepto` o `actualidad`), `OBOL_FECHA` (`AAAA-MM-DD`),
`OBOL_MODELO` (por defecto `claude-opus-5`).

Desde GitHub: **Actions → blog semanal → Run workflow**. Tiene una opción
**ensayo** que genera y verifica pero no publica ni commitea — es la forma de
ver qué escribiría sin que salga.

## Requisito

El repo necesita el secret **`ANTHROPIC_API_KEY`** en *Settings → Secrets and
variables → Actions*.

## Qué está probado y qué no

Probado ejecutándolo: el renderizado (incluido el escapado de un intento de
inyección), el parcheo de los cuatro archivos, la preservación de CRLF, la
atomicidad, y los dos verificadores contra defectos plantados a propósito.

Sin probar: la llamada al modelo, porque hacerla necesita la API key. La primera
corrida en modo **ensayo** es la que la ejercita.

## Si algo sale mal

Una nota publicada es un commit. Revertirla es `git revert` de ese commit, y
borrar su entrada de `publicados.json` si querés que el tema vuelva a estar
disponible.
