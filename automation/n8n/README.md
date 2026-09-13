# Workflows de n8n

## 1. Lista de espera (`obol-waitlist-n8n.json`)

Recibe los envíos de los formularios "Enterate cuando salga" / "Avisame cuando salga" (sección `#anotarse` en `docs/index.html` y `docs/dolar.html`), valida el mail, guarda el lead en Google Sheets y manda un mail de bienvenida.

### Pasos para activarlo

1. **Google Sheet**: crear una planilla nueva con estas columnas en la primera fila:
   `email · nombre · puntaje · segmento · origen · pagina · referrer · fecha`
2. **Importar**: en n8n, `Import from File` → `obol-waitlist-n8n.json`.
3. **Google Sheets**: abrir el nodo "Guarda en la planilla", conectar tu credencial de Google y reemplazar `PEGAR_ID_DEL_GOOGLE_SHEET` por el ID real de la planilla (está en la URL, entre `/d/` y `/edit`).
4. **Gmail**: abrir el nodo "Manda la bienvenida" y conectar tu credencial de Gmail.
5. **Turnstile**: abrir el nodo "Verifica Turnstile" y reemplazar `PEGAR_TURNSTILE_SECRET_KEY` por la Secret Key de tu widget de [Cloudflare Turnstile](https://dash.cloudflare.com) (la Site Key, que es pública, ya está pegada en `docs/index.html` y `docs/dolar.html`).
6. **Activar** el workflow (toggle arriba a la derecha).
7. **Copiar la URL de producción** del nodo "Recibe el formulario" (pestaña "Production URL", no la de test).
8. Pegar esa URL en `docs/index.html` y `docs/dolar.html`, dentro de cada `<script>`, en la línea:
   ```js
   var WEBHOOK = ""; // pegar acá la URL de producción
   ```

Sin el paso 8 los formularios quedan en "modo demo": funcionan en la página pero no mandan nada a n8n (solo lo loguean en la consola del navegador).

### Notas

- El nodo "Verifica Turnstile" confirma contra Cloudflare que quien mandó el formulario es humano (widget invisible, sin checkbox). Si no viene un token válido, "Valida y segmenta" rechaza con `motivo: 'bot'` — a propósito no sigue de largo si Cloudflare no contesta, para que esto sea una barrera real y no una sugerencia.
- El nodo "Valida y segmenta" hace también de portero: filtra por origen (lista `ORIGENES` dentro del código — acepta `https://obolfinance.com.ar` y, mientras exista, `https://obolfinance.github.io`), descarta dominios de mail descartables comunes, y frena todo alta después de `TOPE_DIARIO` (arranca en 500 por día) usando un contador persistente vía `$getWorkflowStaticData`. Igual que en el chat, el filtro de origen no es seguridad real (se falsifica fácil) pero corta ruido barato — la barrera real contra bots ahora es Turnstile.
- Endurecido en septiembre de 2026: el webhook y las dos respuestas solo habilitan CORS para `https://obolfinance.com.ar`; Turnstile además exige que el token se haya emitido en ese dominio (`hostname`); la planilla se escribe en formato RAW (`cellFormat`) y los textos que empiezan con `=`, `+`, `-` o `@` llevan un apóstrofo adelante para que Sheets no los evalúe como fórmula. La lista de espera ya no usa el campo `nombre` en el mail y agrega filas en vez de actualizar por email.
- El límite diario es compartido entre `docs/index.html` y `docs/dolar.html`, ya que ambos apuntan al mismo webhook.

---

## 2. Newsletter semanal (`obol-newsletter-n8n.json`)

Todos los viernes a las 8am: junta cotizaciones (DolarAPI) e inflación/riesgo país (ArgentinaDatos), arma un briefing con esos datos, hace que Claude escriba una nota de 350-450 palabras con la voz de uno de los 5 personajes del blog (rota semana a semana), y deja el resultado como **borrador** en Gmail — no se envía solo.

### Pasos para activarlo

1. **Credencial de Anthropic**: en n8n, `Credentials → New → Anthropic account`, pegar tu API key de `console.anthropic.com`. El nodo "Claude escribe la nota" usa esta credencial vía `Predefined Credential Type` (la key nunca queda escrita en el JSON del workflow).
2. **Importar**: `Import from File` → `obol-newsletter-n8n.json`.
3. **Gmail**: abrir el nodo "Borrador en Gmail" y conectar tu credencial de Gmail (la misma que uses en el workflow de lista de espera sirve).
4. Si querés que el borrador llegue a otra casilla, cambiá el mail en el campo "To" (dentro de "Options") del nodo "Borrador en Gmail" — hoy apunta a `obol.finance2026@gmail.com`.
5. **Probar antes de activar**: click derecho → `Execute Workflow`, y revisá el borrador que aparece en Gmail antes de dejarlo corriendo solo.
6. **Activar** el workflow.

### Notas

- El modelo usado es `claude-sonnet-5`. Para bajar costo, `claude-haiku-4-5-20251001` alcanza de sobra para una nota de 400 palabras — se cambia en el campo `jsonBody` del nodo "Claude escribe la nota".
- El prompt está armado para que Claude use únicamente los números del briefing (nunca inventa cifras, noticias ni recomienda comprar/vender). Los datos exactos que recibió quedan pegados en un comentario HTML al final del borrador, así podés auditar cada cifra antes de mandar el mail.
- Si el endpoint del blue de hace 7 días falla, el nodo sigue de largo (`continueRegularOutput`) y la nota simplemente omite la variación semanal en vez de cortar todo el flujo.
- Si Claude devuelve algo que no es JSON válido, el workflow no se rompe: arma un borrador con asunto "revisar borrador" y el texto crudo, para que lo corrijas a mano.

---

## 3. Chat del Chancho (`obol-chat-n8n.json`)

Recibe las preguntas del widget de chat en `docs/index.html` (sección `#obol-chat`), las filtra con un "portero" antes de gastar un solo token, le pasa la pregunta a Claude (Haiku) con un system prompt que fija el personaje y sus límites, y registra cada intercambio en Google Sheets — clasificado por área — para saber qué le interesa de verdad a la gente que visita el sitio.

### Por qué hace falta el proxy

El widget nunca habla directo con la API de Anthropic: si la key estuviera en el JavaScript del navegador, cualquiera que abra "ver código fuente" te la roba. El widget habla con este webhook de n8n, y n8n —con la key guardada del lado del servidor vía credencial— habla con Claude.

### El nodo "Portero"

Antes de tocar un token, valida: origen del pedido (filtra ruido, no es seguridad real — está anotado en el código), largo máximo de 300 caracteres, tope diario global de 300 preguntas (contador persistente vía `$getWorkflowStaticData`), e historial acotado a los últimos 3 intercambios con roles saneados.

### Pasos para activarlo

1. **Credencial de Anthropic**: la misma credencial `Anthropic account` que uses en el workflow de la newsletter sirve acá también (mismo mecanismo: `Predefined Credential Type`, la key nunca queda en el JSON).
2. **Importar**: `Import from File` → `obol-chat-n8n.json`.
3. **Google Sheet**: crear una planilla con la hoja "Preguntas" y estos headers en la primera fila:
   `fecha · pregunta · area · respuesta · pagina · tokens_entrada · tokens_salida · consumo_hoy`
4. Abrir el nodo "Registra la pregunta" y pegar el ID real de la planilla en lugar de `PEGAR_ID_DEL_GOOGLE_SHEET`.
5. **Copiar la URL de producción** del nodo "Recibe la pregunta" y pegarla en `docs/index.html`, dentro del `<script>` del chat, en la línea:
   ```js
   var ENDPOINT = ""; // pegar acá la URL de producción
   ```
6. **Activar** el workflow.

### Notas

- `TOPE_DIARIO` (dentro del código del nodo "Portero") arranca en 300. Empezá más bajo — tipo 100 — y subilo cuando veas el consumo real en la planilla.
- El system prompt tiene tres reglas no negociables: nunca recomienda comprar/vender nada, dice explícitamente que no tiene datos del día (y manda a `dolar.html` si le preguntan una cotización), e ignora instrucciones que vengan metidas en el mensaje del usuario.
- Cada pregunta se clasifica por área (economía, finanzas, mitos, historia, fuera de tema) automáticamente — con eso podés armar una tabla dinámica y ver qué le interesa a la audiencia y qué no cubre la app todavía.
- El widget responde primero y registra en la planilla después (la respuesta no espera a que termine de guardarse la fila), así que el Chancho contesta rápido aunque Sheets tarde.

---

## 4. Avisos de error (`obol-alertas-error-n8n.json`)

Manda un mail cuando un nodo de cualquiera de los otros 3 workflows tira un error real (credencial vencida, un cambio inesperado en una API, etc.). No avisa por los fallos que el código ya maneja solo (API externa caída con `continueRegularOutput`, mail inválido, tope diario alcanzado) — esos son comportamiento esperado, no roturas.

### Pasos para activarlo

1. **Importar**: `Import from File` → `obol-alertas-error-n8n.json`.
2. Abrir el nodo "Manda el aviso", conectar tu credencial de Gmail (la misma de siempre sirve) y reemplazar `PEGAR_TU_MAIL_ACA` por el mail donde querés recibir los avisos.
3. **Activar** este workflow.
4. Ir a cada uno de los otros 3 workflows (lista de espera, newsletter, chat) → menú `⋯` → **Settings** → **Error Workflow** → elegir "Obol · Avisos de error".

Sin el paso 4, este workflow queda activo pero no lo va a llamar nadie — el link se hace desde cada workflow individual, no al revés.

---

## 5. Reseñas de libros (`obol-resenas-n8n.json`)

Recibe las reseñas que la gente deja en el modal de cada libro, en "La biblioteca de Obol" (`docs/blog/index.html`). **No publica nada solo**: cada reseña queda en una planilla como pendiente, para que la revises antes de copiarla a mano al array `reviews` del libro correspondiente en el código.

### Por qué no se publican solas

Publicar automáticamente lo que cualquiera escribe en un formulario público es una puerta abierta a insultos, spam y contenido falso. El flujo acá es: alguien manda una reseña → queda en la planilla con `publicada: NO` → la leés, y si te parece genuina y de buena fe, la agregás vos mismo al `reviews: []` del libro en `docs/blog/index.html` y hacés `git push`.

### Pasos para activarlo

1. **Google Sheet**: crear una planilla nueva con la hoja "Reseñas pendientes" y estas columnas en la primera fila:
   `fecha · libro · nombre · estrellas · texto · pagina · publicada`
2. **Importar**: en n8n, `Import from File` → `obol-resenas-n8n.json`.
3. **Google Sheets**: abrir el nodo "Guarda en la planilla", conectar tu credencial de Google y reemplazar `PEGAR_ID_DEL_GOOGLE_SHEET` por el ID real de la planilla.
4. **Turnstile**: abrir el nodo "Verifica Turnstile" y reemplazar `PEGAR_TURNSTILE_SECRET_KEY` por la misma Secret Key que ya usás en el workflow de lista de espera (es la misma cuenta de Cloudflare).
5. **Activar** el workflow.
6. **Copiar la URL de producción** del nodo "Recibe la reseña" y pegarla en `docs/blog/index.html`, en la línea:
   ```js
   var RESENAS_ENDPOINT = ""; // pegar acá la URL de producción del webhook de reseñas
   ```

Sin el paso 6 el formulario queda en "modo demo": funciona en la página pero no manda nada a n8n (solo lo loguea en la consola del navegador).

### Notas

- El campo `libro` solo acepta los 7 IDs de libros que ya existen en el código (`padre`, `babilonia`, `pensar`, `lynch`, `triunfo`, `freak`, `vendes`) — si agregás un libro nuevo, sumá su ID a la lista `LIBROS_VALIDOS` dentro del nodo "Valida la reseña".
- El tope diario arranca en 50 reseñas — de sobra para el volumen esperado, ajustable en `TOPE_DIARIO` si hace falta.
- No se pide mail, solo un nombre a elección de quien escribe — mucho menos dato personal que en la lista de espera.

---

## 6. Recomendar un libro (`obol-recomendaciones-n8n.json`)

Reemplaza el viejo botón `mailto:` de "¿Tenés uno para sumar?" (que no hacía nada si el visitante no tenía un cliente de mail configurado en el navegador). Mismo patrón que las reseñas: **no se agrega nada solo** a la biblioteca, todo queda en una planilla para revisar a mano.

### Pasos para activarlo

1. **Google Sheet**: crear una planilla nueva con la hoja "Libros recomendados" y estas columnas en la primera fila:
   `fecha · titulo · autor · comentario · pagina · agregado`
2. **Importar**: en n8n, `Import from File` → `obol-recomendaciones-n8n.json`.
3. **Google Sheets**: abrir el nodo "Guarda en la planilla", conectar tu credencial de Google y reemplazar `PEGAR_ID_DEL_GOOGLE_SHEET` por el ID real de esta planilla.
4. **Turnstile**: abrir el nodo "Verifica Turnstile" y pegar la misma Secret Key que ya usás en los otros workflows.
5. **Activar** el workflow.
6. **Copiar la URL de producción** del nodo "Recibe la recomendación" y pegarla en `docs/blog/index.html`, en la línea:
   ```js
   var RECOMENDACIONES_ENDPOINT = ""; // pegar acá la URL de producción del webhook de recomendaciones
   ```

Sin el paso 6 el formulario queda en "modo demo" (funciona en la página pero solo loguea en consola).

### Notas

- Solo el título es obligatorio; autor y comentario son opcionales.
- El tope diario arranca en 30 — este formulario se usa mucho menos que el de reseñas.
