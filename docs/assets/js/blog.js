// Estaba inline en docs/blog/index.html.
// Va en un archivo para que la CSP no necesite 'unsafe-inline'.
var RESENAS_ENDPOINT = "https://obolfinance.app.n8n.cloud/webhook/obol-resenas";
var RECOMENDACIONES_ENDPOINT = "https://obolfinance.app.n8n.cloud/webhook/obol-recomendaciones";
var TURNSTILE_SITE_KEY = "0x4AAAAAAEy8j-BmRilaTf67";
var tsResenas = window.ObolTurnstile(TURNSTILE_SITE_KEY);
var tsRecomendar = window.ObolTurnstile(TURNSTILE_SITE_KEY);
var currentBookId = null;

var BOOKS = {
  padre: {
    title: 'Padre Rico, Padre Pobre',
    author: 'Robert Kiyosaki',
    meta: 'Finanzas personales · Nivel fácil · 1997',
    rating: '4.5',
    stars: '★★★★½',
    coverImg: './assets/libro_padre_rico_card.png',
    resumen: 'Kiyosaki cuenta su educación financiera a través de dos figuras: su papá biológico, empleado con estudios, y el papá de un amigo, empresario sin título. Todo el libro es esa comparación: dos formas de mirar el trabajo, el riesgo y la plata. No es un manual de inversión ni te dice qué comprar — es el libro que te cambia la pregunta de "cuánto gano" a "qué hago con lo que gano".',
    areas: ['Mentalidad financiera', 'Activos vs. pasivos', 'Salir del sueldo a sueldo', 'Primeros pasos'],
    temas: ['Qué es un activo y qué es un pasivo (y por qué la casa puede ser lo segundo)', 'Ingreso pasivo: la idea de que la plata trabaje sin vos', 'Por qué la escuela no enseña finanzas', 'El miedo al riesgo y cómo lo maneja cada perfil'],
    reviews: []
  },
  babilonia: {
    title: 'El Hombre Más Rico de Babilonia',
    author: 'George S. Clason',
    meta: 'Ahorro · Nivel fácil · 1926',
    rating: '4.7',
    stars: '★★★★½',
    coverImg: './assets/libro_babilonia_card.png',
    resumen: 'Un conjunto de parábolas ambientadas en la Babilonia antigua, donde distintos personajes aprenden a manejar su dinero de la mano de un prestamista sabio. Cada capítulo es un cuento corto con una sola lección clara. Tiene casi cien años y sigue siendo la explicación más simple que existe de "pagate a vos primero".',
    areas: ['Hábito de ahorro', 'Presupuesto personal', 'Deudas', 'Disciplina a largo plazo'],
    temas: ['Guardar una parte fija de todo lo que entra', 'Cómo salir de deudas sin dejar de vivir', 'Invertir solo en lo que entendés', 'El costo de los consejos de gente que no sabe'],
    reviews: []
  },
  pensar: {
    title: 'Pensar Rápido, Pensar Despacio',
    author: 'Daniel Kahneman',
    meta: 'Psicología · Nivel avanzado · 2011',
    rating: '4.8',
    stars: '★★★★½',
    coverImg: './assets/libro_pensar_card.png',
    resumen: 'El premio Nobel de Economía explica que tenemos dos sistemas para decidir: uno rápido, automático e intuitivo, y otro lento y analítico. La mayoría de nuestros errores con el dinero vienen de usar el primero cuando hacía falta el segundo. Es denso, pero es el libro que explica por qué sabés qué hacer y aun así hacés otra cosa.',
    areas: ['Decisiones bajo riesgo', 'Sesgos al invertir', 'Evitar estafas y promesas fáciles', 'Autoconocimiento'],
    temas: ['Sistema 1 y Sistema 2: intuición vs. análisis', 'Aversión a la pérdida: por qué perder $100 duele más que ganar $100', 'Exceso de confianza en pronósticos', 'Cómo el modo en que te presentan una opción cambia tu elección'],
    reviews: []
  },
  lynch: {
    title: 'Un Paso por Delante de Wall Street',
    author: 'Peter Lynch',
    meta: 'Inversión · Nivel medio · 1989',
    rating: '4.4',
    stars: '★★★★☆',
    coverImg: './assets/libro_lynch_card.png',
    resumen: 'Lynch manejó uno de los fondos más exitosos de la historia y acá cuenta su método con un argumento simple: el inversor común ve buenas empresas antes que Wall Street, porque las usa todos los días. Enseña a mirar un negocio de verdad — qué vende, cuánto gana, cuánto debe — antes de mirar el precio de la acción.',
    areas: ['Analizar acciones', 'Elegir en qué invertir', 'Paciencia de largo plazo', 'Leer un balance'],
    temas: ['Invertir en lo que conocés y entendés', 'Los seis tipos de empresas según su crecimiento', 'Números básicos: ganancias, deuda, valuación', 'Por qué predecir el mercado no funciona'],
    reviews: []
  },
  triunfo: {
    title: 'El Triunfo del Dinero',
    author: 'Niall Ferguson',
    meta: 'Historia · Nivel medio · 2008',
    rating: '4.3',
    stars: '★★★★☆',
    coverImg: './assets/libro_triunfo_card.png',
    resumen: 'Un recorrido por la historia de las finanzas: los primeros préstamos, el nacimiento de los bancos, las bolsas, los seguros, la deuda de los países y las burbujas que se repiten cada tanto. Ferguson muestra que casi ninguna crisis es nueva — cambian los nombres y los instrumentos, no el mecanismo.',
    areas: ['Contexto histórico', 'Entender crisis y burbujas', 'Deuda pública', 'Cultura general financiera'],
    temas: ['De dónde salieron los bancos y el crédito', 'Bonos: cómo los países se financian (y quiebran)', 'Burbujas famosas y qué tenían en común', 'Seguros, hipotecas y el riesgo repartido'],
    reviews: []
  },
  freak: {
    title: 'Freakonomics',
    author: 'Steven Levitt y Stephen Dubner',
    meta: 'Economía · Nivel fácil · 2005',
    rating: '4.6',
    stars: '★★★★½',
    coverImg: './assets/libro_freakonomics_card.png',
    resumen: 'Un economista y un periodista aplican herramientas económicas a preguntas que no parecen económicas: por qué la gente hace trampa, cómo funcionan los incentivos, qué dicen los datos cuando la intuición dice otra cosa. No enseña a manejar tu plata, enseña a pensar como economista — que a la larga sirve igual.',
    areas: ['Pensar con datos', 'Entender incentivos', 'Desarmar mitos', 'Curiosidad económica'],
    temas: ['Incentivos: por qué la gente hace lo que hace', 'Correlación vs. causalidad, con ejemplos concretos', 'Información asimétrica: cuando el otro sabe más que vos', 'Cómo leer una estadística sin que te engañen'],
    reviews: []
  },
  vendes: {
    title: 'Vendes o Vendes',
    author: 'Grant Cardone',
    meta: 'Ventas · Nivel fácil · 2011',
    rating: '4.2',
    stars: '★★★★☆',
    coverImg: './assets/libro_vendes_card.png',
    resumen: 'Cardone parte de una idea incómoda: todos vendemos algo todo el tiempo, aunque no tengamos un puesto de "ventas" — una idea a un jefe, un proyecto a un socio, vos mismo en una entrevista. El libro es directo y sin vueltas: enseña a insistir sin pedir disculpas, a manejar el "no" y a tratar el ingreso propio como algo que se construye, no que se espera.',
    areas: ['Negociación', 'Comunicación persuasiva', 'Generar ingresos propios', 'Manejar el rechazo'],
    temas: ['Por qué todos vendemos algo, tengamos o no ese título', 'Cómo sostener el precio sin bajarlo a la primera objeción', 'El miedo a insistir y por qué suele costar más caro que insistir', 'Vender como habilidad transferible a cualquier trabajo'],
    reviews: []
  }
};

function openBook(id) {
  var b = BOOKS[id];
  if (!b) return;
  document.getElementById('bmCoverImg').src = b.coverImg;
  document.getElementById('bmCoverImg').alt = b.title;
  document.getElementById('bmMeta').textContent = b.meta;
  document.getElementById('bmTitle').textContent = b.title;
  document.getElementById('bmAuthor').textContent = b.author;
  document.getElementById('bmStars').textContent = b.stars;
  document.getElementById('bmRating').textContent = b.rating;
  document.getElementById('bmResumen').textContent = b.resumen;

  var areasEl = document.getElementById('bmAreas');
  areasEl.innerHTML = '';
  b.areas.forEach(function (area) {
    var span = document.createElement('span');
    span.style.cssText = 'display:inline-flex;align-items:center;font-weight:700;font-size:12px;color:#16213e;background:linear-gradient(90deg,#ffe08a,#ffb24a);padding:8px 14px;border-radius:999px;';
    span.textContent = area;
    areasEl.appendChild(span);
  });

  var temasEl = document.getElementById('bmTemas');
  temasEl.innerHTML = '';
  b.temas.forEach(function (tema) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;align-items:flex-start;';
    row.innerHTML = '<span style="flex:0 0 auto;width:6px;height:6px;border-radius:50%;background:#ffb24a;margin-top:7px;"></span><span style="font-weight:600;font-size:13px;line-height:1.5;color:rgba(255,255,255,.7);"></span>';
    row.querySelector('span:last-child').textContent = tema;
    temasEl.appendChild(row);
  });

  var reviewsEl = document.getElementById('bmReviews');
  reviewsEl.innerHTML = '';
  b.reviews.forEach(function (r) {
    var card = document.createElement('div');
    card.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:18px;border-radius:18px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);';
    card.innerHTML =
      '<span style="font-size:13px;letter-spacing:2px;color:#ffb24a;line-height:1;"></span>' +
      '<p style="margin:0;font-weight:600;font-size:13px;line-height:1.55;color:rgba(255,255,255,.76);"></p>' +
      '<span style="font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:12px;color:rgba(255,255,255,.45);"></span>';
    card.children[0].textContent = r.stars;
    card.children[1].textContent = r.text;
    card.children[2].textContent = r.name;
    reviewsEl.appendChild(card);
  });
  document.getElementById('bmReviewsEmpty').style.display = b.reviews.length ? 'none' : 'block';

  currentBookId = id;
  resetResenaForm();

  document.getElementById('bookModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeBook() {
  document.getElementById('bookModal').style.display = 'none';
  document.body.style.overflow = '';
}

function closeBookBackdrop(e) {
  if (e.target === e.currentTarget) closeBook();
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeBook();
});

// --- Formulario de reseñas ---
var resenaStars = 0;

function renderStarPicker() {
  var el = document.getElementById('bmRStars');
  el.innerHTML = '';
  for (var i = 1; i <= 5; i++) {
    (function (n) {
      var s = document.createElement('span');
      s.textContent = n <= resenaStars ? '★' : '☆';
      s.style.color = n <= resenaStars ? '#ffb24a' : 'rgba(255,255,255,.3)';
      s.addEventListener('click', function () { resenaStars = n; renderStarPicker(); });
      el.appendChild(s);
    })(i);
  }
}

function resetResenaForm() {
  resenaStars = 0;
  renderStarPicker();
  document.getElementById('bmRName').value = '';
  document.getElementById('bmRText').value = '';
  document.getElementById('bmRMsg').textContent = '';
  document.getElementById('bmRMsg').style.color = 'rgba(255,255,255,.55)';
  document.getElementById('bmRSubmit').disabled = false;
  document.getElementById('bmRSubmit').textContent = 'Publicar reseña';
}

function enviarResena() {
  var nombre = document.getElementById('bmRName').value.trim();
  var texto = document.getElementById('bmRText').value.trim();
  var msg = document.getElementById('bmRMsg');
  var btn = document.getElementById('bmRSubmit');

  if (!nombre || !texto || !resenaStars) {
    msg.style.color = '#ff9a7f';
    msg.textContent = 'Completá tu nombre, un puntaje y la reseña.';
    return;
  }
  if (texto.length < 10) {
    msg.style.color = '#ff9a7f';
    msg.textContent = 'Contanos un poco más (mínimo 10 caracteres).';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando…';
  msg.style.color = 'rgba(255,255,255,.55)';
  msg.textContent = '';

  function mandar(turnstileToken) {
    var datos = {
      libro: currentBookId,
      nombre: nombre,
      estrellas: resenaStars,
      texto: texto,
      pagina: location.pathname,
      turnstileToken: turnstileToken
    };

    if (!RESENAS_ENDPOINT) {
      console.warn('[Obol] Falta configurar RESENAS_ENDPOINT. Reseña no enviada (modo demo):', datos);
      setTimeout(listo, 500);
      return;
    }

    fetch(RESENAS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(datos) })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(listo)
      .catch(function (e) { console.error(e); fallar(); });
  }

  function listo() {
    btn.textContent = 'Publicar reseña';
    msg.style.color = '#6ddbaa';
    msg.textContent = '¡Gracias! La vamos a revisar y publicar en breve.';
    document.getElementById('bmRName').value = '';
    document.getElementById('bmRText').value = '';
    resenaStars = 0;
    renderStarPicker();
    btn.disabled = false;
  }

  function fallar() {
    btn.disabled = false;
    btn.textContent = 'Publicar reseña';
    msg.style.color = '#ff9a7f';
    msg.textContent = 'No pudimos enviarla ahora. Probá de nuevo en un rato.';
  }

  tsResenas.getToken(function (token) {
    if (!token) { fallar(); return; }
    mandar(token);
  });
}

document.getElementById('bmRSubmit').addEventListener('click', enviarResena);

// --- Formulario de recomendar un libro ---
function enviarRecomendacion() {
  var titulo = document.getElementById('brTitulo').value.trim();
  var autor = document.getElementById('brAutor').value.trim();
  var comentario = document.getElementById('brComentario').value.trim();
  var msg = document.getElementById('brMsg');
  var btn = document.getElementById('brSubmit');

  if (!titulo) {
    msg.style.color = '#ff9a7f';
    msg.textContent = 'Escribí al menos el título.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando…';
  msg.style.color = 'rgba(255,255,255,.55)';
  msg.textContent = '';

  function mandar(turnstileToken) {
    var datos = {
      titulo: titulo,
      autor: autor,
      comentario: comentario,
      pagina: location.pathname,
      turnstileToken: turnstileToken
    };

    if (!RECOMENDACIONES_ENDPOINT) {
      console.warn('[Obol] Falta configurar RECOMENDACIONES_ENDPOINT. Recomendación no enviada (modo demo):', datos);
      setTimeout(listo, 500);
      return;
    }

    fetch(RECOMENDACIONES_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(datos) })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(listo)
      .catch(function (e) { console.error(e); fallar(); });
  }

  function listo() {
    btn.disabled = false;
    btn.textContent = 'Recomendar';
    msg.style.color = '#6ddbaa';
    msg.textContent = '¡Gracias! Lo vamos a revisar.';
    document.getElementById('brTitulo').value = '';
    document.getElementById('brAutor').value = '';
    document.getElementById('brComentario').value = '';
  }

  function fallar() {
    btn.disabled = false;
    btn.textContent = 'Recomendar';
    msg.style.color = '#ff9a7f';
    msg.textContent = 'No pudimos enviarlo ahora. Probá de nuevo en un rato.';
  }

  tsRecomendar.getToken(function (token) {
    if (!token) { fallar(); return; }
    mandar(token);
  });
}

document.getElementById('brSubmit').addEventListener('click', enviarRecomendacion);

// Biblioteca (antes onclick= en cada tarjeta y en el modal).
document.querySelectorAll('[data-libro]').forEach(function (el) {
  el.addEventListener('click', function () { openBook(el.getAttribute('data-libro')); });
});
document.getElementById('bookModal').addEventListener('click', closeBookBackdrop);
document.querySelectorAll('[data-detener-click]').forEach(function (el) {
  el.addEventListener('click', function (e) { e.stopPropagation(); });
});
document.querySelectorAll('[data-cerrar-libro]').forEach(function (el) {
  el.addEventListener('click', closeBook);
});
