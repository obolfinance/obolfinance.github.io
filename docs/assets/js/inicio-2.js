// Estaba inline en docs/index.html (bloque 2 de 6, en el mismo orden).
// Va en un archivo para que la CSP no necesite 'unsafe-inline'.
(function () {
  "use strict";

  var SUPABASE_URL = "https://fhdkferjbwecrkolluab.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZGtmZXJqYndlY3Jrb2xsdWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3ODk3NDAsImV4cCI6MjEwMTM2NTc0MH0.Np2o-MMBmeDe75cJiq5-MFxmRMRX9HYaVKcCN1C-P_Y";
  var sb = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
  var pbSession = null;

  var QUESTIONS = [
    { area: 'Economía', color: '#7fa8f5',
      q: 'Los precios subieron 5% este mes y tu sueldo 3%. ¿Qué pasó con tu poder de compra?',
      opts: ['Subió un 2%', 'Bajó un 2%', 'Quedó igual', 'Depende del banco'],
      correct: 1,
      why: 'Los precios corrieron más rápido que tu sueldo: con la misma plata comprás menos cosas.' },
    { area: 'Finanzas', color: '#6ddbaa',
      q: '¿Qué es el interés compuesto?',
      opts: ['Un interés que te cobran dos veces', 'Interés que se calcula sobre el capital más los intereses ya ganados', 'Un impuesto sobre el plazo fijo', 'La tasa que fija el banco central'],
      correct: 1,
      why: 'Es interés sobre interés. $100.000 al 5% mensual son $179.500 al año, no $160.000.' },
    { area: 'Desmitificando', color: '#c39bf0',
      q: '¿Cuál de estas frases es un mito?',
      opts: ['Alquilar es tirar la plata', 'Diversificar reduce el riesgo', 'La inflación erosiona el ahorro en pesos', 'Ahorrar de a poco también sirve'],
      correct: 0,
      why: 'Alquilar es pagar por usar algo hoy. Puede convenir o no, pero no es plata tirada.' },
    { area: 'Historia', color: '#f0c07a',
      q: '¿De dónde viene la palabra "salario"?',
      opts: ['Del latín "salire", salir a trabajar', 'De la sal con la que se pagaba a los soldados romanos', 'Del griego "salarion", contrato', 'Del nombre de un banquero florentino'],
      correct: 1,
      why: 'La sal era escasa y valiosa: funcionaba como dinero mucho antes que el papel.' },
    { area: 'Finanzas', color: '#6ddbaa',
      q: 'Tenés una tarjeta con 15% mensual de interés y $100.000 ahorrados. ¿Qué conviene?',
      opts: ['Pagar el mínimo e invertir el resto', 'Cancelar la deuda de la tarjeta', 'Sacar un préstamo para pagarla', 'Esperar a que baje la tasa'],
      correct: 1,
      why: 'Ninguna inversión común te paga 15% mensual seguro. Cancelar deuda cara es la mejor "inversión".' }
  ];

  var CHAT_QA = [
    { chip: '¿Por qué sube el dólar?',
      a: 'Cuando hay más pesos dando vueltas que ganas de tenerlos, la gente se pasa al dólar y su precio sube. Sumale las expectativas: si creés que mañana va a estar más caro, comprás hoy — y eso mismo lo empuja.' },
    { chip: '¿Qué es el interés compuesto?',
      a: 'Es interés sobre interés. Ponés $100.000 al 5% mensual: el primer mes ganás $5.000, el segundo el 5% se calcula sobre $105.000. A 12 meses son $79.500 en vez de $60.000.' },
    { chip: '¿Conviene el plazo fijo?',
      a: 'Depende de una sola cuenta: tasa contra inflación. Si la tasa mensual le gana a la inflación del mes, ganás poder de compra. Si no, estás perdiendo más despacio.' },
    { chip: '¿Qué es un CEDEAR?',
      a: 'Un certificado que cotiza en pesos acá y representa una acción del exterior. Comprás Apple sin sacar la plata del país y, de paso, seguís al dólar CCL.' },
    { chip: '¿Qué es la inflación?',
      a: 'Es la suba general y sostenida de los precios. No es que una cosa esté cara: es que tu plata vale menos todos los meses.' },
    { chip: '¿Qué es la brecha cambiaria?',
      a: 'Es la diferencia entre el dólar oficial y los demás (blue, MEP, CCL). Si el oficial vale $1000 y el blue $1500, la brecha es 50%. Cuanto más grande, más señal de que el oficial está "pisado" artificialmente.' },
    { chip: '¿Conviene ahorrar en dólares?',
      a: 'Como reserva de valor a largo plazo funciona bien, porque el peso históricamente se devalúa más rápido de lo que compensan las tasas en pesos. Pero un dólar guardado no rinde nada — para plata que vas a usar pronto, un instrumento en pesos que le gane a la inflación conviene más.' },
    { chip: '¿Qué es el riesgo país?',
      a: 'Es cuánto más caro le sale a Argentina pedir plata prestada comparado con Estados Unidos. Si está en 1500 puntos, pagaríamos 15% más de interés que EEUU. Sube cuando los inversores desconfían de que el país pueda pagar sus deudas.' },
    { chip: '¿Cómo armo un presupuesto?',
      a: 'Anotá todo lo que entra y todo lo que sale un mes entero, sin juzgarte. Después separá en necesidades, gustos y ahorro — una regla simple es 50/30/20. Lo importante no es la planilla perfecta, es saber a dónde va la plata antes de que se termine.' },
    { chip: '¿Qué es un fondo de emergencia?',
      a: 'Es plata guardada aparte para imprevistos (te quedás sin laburo, se rompe algo caro), no para gastos normales. La idea es que cubra entre 3 y 6 meses de gastos básicos, en un instrumento del que puedas sacarla rápido sin perder valor.' },
    { chip: '¿Qué es un bono?',
      a: 'Es un préstamo que le hacés a alguien (un gobierno o una empresa): ponés la plata hoy y te devuelven capital más interés en fechas fijas. El riesgo depende de quién lo emite — uno de un país complicado paga más interés porque es más riesgoso.' },
    { chip: '¿Conviene invertir en cripto?',
      a: 'Depende de cuánta volatilidad aguantes: pueden subir o bajar 20% en un día. Como parte chica de una cartera diversificada, para quien entiende el riesgo, puede tener sentido. Como todos los ahorros, no — ahí el riesgo de perder plata real es alto.' },
    { chip: '¿Cuándo conviene la tarjeta de crédito?',
      a: 'Conviene cuando pagás el resumen completo todos los meses — ahí es solo comodidad y a veces beneficios. El problema es financiar el saldo: los intereses de tarjeta están entre los más altos del mercado, mucho más de lo que te puede hacer ganar un plazo fijo.' }
  ];

  var pb = {
    mode: 'quiz', qi: 0, picked: null, score: 0, done: false,
    typing: false,
    messages: [{ who: 'pig', text: 'Hola, soy el Chancho. Elegí una de las preguntas de abajo y te la respondo al toque.' }]
  };
  var pbTimers = [];
  var $ = function (id) { return document.getElementById(id); };

  // Baja #pb-body lo justo y necesario para que "el" quede visible dentro
  // del panel, sin pasarse de largo ni afectar el scroll de la página.
  function pbRevealInBody(el) {
    var body = $('pb-body');
    if (!body || !el) return;
    var bodyRect = body.getBoundingClientRect();
    var elRect = el.getBoundingClientRect();
    var delta = elRect.bottom - bodyRect.bottom + 20;
    if (delta > 0) body.scrollTop += delta;
  }

  function pbEsc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  function pbSetMode(m) {
    pb.mode = m;
    pbRenderTabs();
    pbRenderRail();
    pbRenderBody();
  }

  function pbRenderTabs() {
    var quizOn = pb.mode === 'quiz';
    var tq = $('pb-tab-quiz'), tc = $('pb-tab-chat');
    tq.style.background = quizOn ? '#16213e' : 'transparent';
    tq.style.color = quizOn ? '#ffffff' : '#6b738a';
    tc.style.background = quizOn ? 'transparent' : '#16213e';
    tc.style.color = quizOn ? '#6b738a' : '#ffffff';
  }

  function pbRenderRail() {
    var quizOn = pb.mode === 'quiz';
    $('pb-rail-title').textContent = quizOn ? 'Cinco preguntas' : 'Preguntale al Chancho';
    $('pb-rail-text').textContent = quizOn ? 'Una de cada área temática. Sin registro y sin descargar nada.' : 'Economía, finanzas personales, mitos e historia del dinero. En criollo.';
    $('pb-rail-stat').textContent = quizOn ? '804 preguntas en la app' : '17 secciones · 10 juegos';
  }

  function pbPick(i) {
    if (pb.picked !== null) return;
    if (i === QUESTIONS[pb.qi].correct) pb.score++;
    pb.picked = i;
    pbRenderBody();
    pbSaveProgress();
  }
  function pbNext() {
    if (pb.qi + 1 >= QUESTIONS.length) { pb.done = true; }
    else { pb.qi++; pb.picked = null; }
    pbRenderBody();
    pbSaveProgress();
  }
  function pbRestart() {
    pb.qi = 0; pb.picked = null; pb.score = 0; pb.done = false;
    pbRenderBody();
    pbSaveProgress();
  }

  // ---------- Guardar progreso (opcional, requiere sesión de Supabase) ----------

  function pbRenderAuth() {
    var el = $('pb-auth');
    if (!el || !sb) return;
    if (pbSession) {
      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;">'
        + '<span style="font-family:\'Nunito\',sans-serif;font-weight:700;font-size:12px;color:#6ddbaa;">✓ Progreso guardado</span>'
        + '<button type="button" id="pb-auth-logout" style="border:none;background:none;cursor:pointer;font-family:\'Nunito\',sans-serif;font-weight:700;font-size:12px;color:rgba(255,255,255,.5);text-decoration:underline;padding:0;">Cerrar sesión</button>'
        + '</div>';
      var out = $('pb-auth-logout');
      if (out) out.addEventListener('click', function () { sb.auth.signOut(); });
    } else {
      el.innerHTML = '<div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">'
        + '<div style="display:flex;gap:6px;">'
        + '<input id="pb-auth-email" type="email" placeholder="tu@mail.com" style="flex:1;min-width:0;font:inherit;font-weight:600;font-size:12.5px;color:#fff;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:8px 12px;outline:none;">'
        + '<button type="button" id="pb-auth-btn" style="flex:none;border:none;cursor:pointer;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:12px;color:#16213e;background:linear-gradient(90deg,#ffe08a,#ffb24a);padding:8px 14px;border-radius:999px;white-space:nowrap;">Guardar progreso</button>'
        + '</div>'
        + '<p id="pb-auth-msg" style="margin:0;font-size:11.5px;font-weight:600;color:rgba(255,255,255,.5);min-height:1em;"></p>'
        + '</div>';
      var email = $('pb-auth-email'), btn = $('pb-auth-btn'), msg = $('pb-auth-msg');
      function enviar() {
        var v = (email.value || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
          msg.style.color = '#ff9a7f';
          msg.textContent = 'Ese mail no parece válido.';
          return;
        }
        btn.disabled = true; btn.textContent = 'Enviando…';
        sb.auth.signInWithOtp({ email: v, options: { emailRedirectTo: window.location.href.split('#')[0] } })
          .then(function (res) {
            btn.disabled = false; btn.textContent = 'Guardar progreso';
            if (res.error) { console.error('[Obol] signInWithOtp:', res.error); msg.style.color = '#ff9a7f'; msg.textContent = 'No se pudo enviar. Probá de nuevo en un rato.'; return; }
            msg.style.color = '#6ddbaa';
            msg.textContent = 'Listo, revisá tu mail (y la carpeta de spam) y tocá el link.';
          });
      }
      if (btn) btn.addEventListener('click', enviar);
      if (email) email.addEventListener('keydown', function (e) { if (e.key === 'Enter') enviar(); });
    }
  }

  function pbLoadProgress() {
    if (!sb || !pbSession) return;
    sb.from('quiz_progress').select('estado').eq('user_id', pbSession.user.id).maybeSingle()
      .then(function (res) {
        if (res.error) { console.error('[Obol] pbLoadProgress:', res.error); return; }
        var estado = res.data && res.data.estado;
        if (estado && typeof estado.qi === 'number') {
          pb.qi = estado.qi; pb.picked = estado.picked; pb.score = estado.score; pb.done = !!estado.done;
          pbRenderBody();
        }
      });
  }

  function pbSaveProgress() {
    if (!sb || !pbSession) return;
    sb.from('quiz_progress').upsert({
      user_id: pbSession.user.id,
      estado: { qi: pb.qi, picked: pb.picked, score: pb.score, done: pb.done },
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' }).then(function (res) {
      if (res.error) console.error('[Obol] pbSaveProgress:', res.error);
    });
  }

  function pbInitAuth() {
    if (!sb) return;
    sb.auth.getSession().then(function (res) {
      pbSession = res.data.session;
      pbRenderAuth();
      if (pbSession) pbLoadProgress();
    });
    sb.auth.onAuthStateChange(function (event, session) {
      pbSession = session;
      pbRenderAuth();
      if (event === 'SIGNED_IN') pbLoadProgress();
    });
  }

  // El chat responde solo con preguntas predeterminadas (CHAT_QA), sin
  // llamar a ninguna IA — así no se gastan tokens cada vez que alguien
  // lo usa. Si en algún momento se quiere volver a respuestas libres,
  // hay que reconstruir el llamado a ENDPOINT que estaba acá antes.
  function pbAskFixed(i) {
    if (pb.typing) return;
    var c = CHAT_QA[i];
    if (!c) return;

    pb.messages.push({ who: 'me', text: c.chip });
    pb.typing = true;
    pbRenderBody();

    pbTimers.push(setTimeout(function () {
      pb.messages.push({ who: 'pig', text: c.a });
      pb.typing = false;
      pbRenderBody();
    }, 550));
  }

  function pbRenderBody() {
    var body = $('pb-body');
    if (pb.mode === 'quiz' && !pb.done) {
      body.innerHTML = pbQuizPlayingHtml();
      pbWireQuizPlaying();
    } else if (pb.mode === 'quiz' && pb.done) {
      body.innerHTML = pbQuizDoneHtml();
      pbWireQuizDone();
    } else {
      body.innerHTML = pbChatHtml();
      pbWireChat();
    }
  }

  function pbQuizPlayingHtml() {
    var q = QUESTIONS[pb.qi];
    var answered = pb.picked !== null;
    var progress = Math.round(((pb.qi + (answered ? 1 : 0)) / QUESTIONS.length) * 100);
    var optsHtml = q.opts.map(function (label, i) {
      var bg = 'rgba(255,255,255,.06)', bd = 'rgba(255,255,255,.15)', fg = '#ffffff', mark = '';
      if (answered) {
        if (i === q.correct) { bg = 'rgba(46,168,120,.18)'; bd = '#2ea878'; fg = '#b9f0d7'; mark = '✓'; }
        else if (i === pb.picked) { bg = 'rgba(224,84,84,.16)'; bd = '#e05454'; fg = '#ffc7c7'; mark = '✕'; }
        else { bg = 'rgba(255,255,255,.02)'; bd = 'rgba(255,255,255,.07)'; fg = 'rgba(255,255,255,.4)'; }
      }
      return '<button type="button" data-i="' + i + '" ' + (answered ? 'disabled' : '') + ' class="pb-opt" style="display:flex;align-items:center;gap:13px;text-align:left;cursor:pointer;font-family:\'Nunito\',sans-serif;font-weight:700;font-size:14.5px;line-height:1.4;padding:14px 16px;border-radius:14px;transition:background .18s ease,border-color .18s ease,transform .18s ease;background:' + bg + ';border:1.5px solid ' + bd + ';color:' + fg + ';">'
        + '<span style="flex:none;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:8px;background:rgba(255,255,255,.1);font-family:\'Fredoka\',sans-serif;font-weight:700;font-size:12px;">' + 'ABCD'[i] + '</span>'
        + '<span style="flex:1;">' + pbEsc(label) + '</span>'
        + '<span style="flex:none;font-size:14px;font-weight:700;">' + mark + '</span>'
        + '</button>';
    }).join('');

    var feedbackHtml = '';
    if (answered) {
      var right = pb.picked === q.correct;
      var feedColor = right ? '#6ddbaa' : '#ffb24a';
      var nextLabel = pb.qi + 1 >= QUESTIONS.length ? 'Ver resultado' : 'Siguiente pregunta';
      feedbackHtml = '<div style="margin-top:auto;display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding-top:6px;">'
        + '<div style="flex:1;min-width:240px;display:flex;flex-direction:column;gap:4px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.05);border-left:3px solid ' + feedColor + ';">'
        + '<span style="font-family:\'Fredoka\',sans-serif;font-weight:700;font-size:13px;color:' + feedColor + ';">' + (right ? 'Correcto' : 'No exactamente') + '</span>'
        + '<span style="font-weight:600;font-size:13.5px;line-height:1.5;color:rgba(255,255,255,.72);">' + pbEsc(q.why) + '</span>'
        + '</div>'
        + '<button type="button" id="pb-next" class="obol-btn" style="flex:none;border:none;cursor:pointer;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:14.5px;color:#16213e;background:linear-gradient(90deg,#ffe08a,#ffb24a);padding:14px 24px;border-radius:999px;">' + nextLabel + '</button>'
        + '</div>';
    }

    return '<div style="display:flex;flex-direction:column;height:100%;gap:20px;">'
      + '<div style="display:flex;flex-direction:column;gap:12px;">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">'
      + '<span style="font-family:\'Fredoka\',sans-serif;font-weight:700;font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:' + q.color + ';">' + pbEsc(q.area) + '</span>'
      + '<span style="font-weight:700;font-size:12.5px;color:rgba(255,255,255,.45);">Pregunta ' + (pb.qi + 1) + ' de ' + QUESTIONS.length + '</span>'
      + '</div>'
      + '<div style="height:4px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden;">'
      + '<div style="height:100%;border-radius:999px;background:linear-gradient(90deg,#ffe08a,#ffb24a);transition:width .4s cubic-bezier(.22,.61,.36,1);width:' + progress + '%;"></div>'
      + '</div></div>'
      + '<h4 style="margin:0;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:21px;line-height:1.35;color:#fff;">' + pbEsc(q.q) + '</h4>'
      + '<div style="display:grid;gap:9px;">' + optsHtml + '</div>'
      + feedbackHtml
      + '</div>';
  }

  function pbWireQuizPlaying() {
    var body = $('pb-body');
    Array.prototype.forEach.call(body.querySelectorAll('.pb-opt'), function (b) {
      b.addEventListener('click', function () { pbPick(parseInt(b.getAttribute('data-i'), 10)); });
    });
    var next = $('pb-next');
    if (next) next.addEventListener('click', pbNext);
    // En pantallas chicas el panel scrollea entero: al revelar la
    // respuesta, bajamos lo justo para que el botón quede a la vista.
    if (next) pbRevealInBody(next);
  }

  function pbQuizDoneHtml() {
    var scoreMsg = pb.score >= 4 ? 'Muy bien. Ya arrancás con ventaja.'
      : pb.score >= 2 ? 'Nada mal. Hay margen para afilar.'
      : 'Para eso está la app. Se aprende rápido.';
    return '<div style="display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:16px;height:100%;">'
      + '<span style="font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.45);">Resultado</span>'
      + '<div style="display:flex;align-items:baseline;gap:8px;">'
      + '<span style="font-family:\'Fredoka\',sans-serif;font-weight:700;font-size:72px;line-height:.9;color:#ffb24a;">' + (Number(pb.score) || 0) + '</span>'
      + '<span style="font-family:\'Fredoka\',sans-serif;font-weight:700;font-size:30px;color:rgba(255,255,255,.4);">/ ' + QUESTIONS.length + '</span>'
      + '</div>'
      + '<p style="margin:0;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:22px;color:#fff;">' + scoreMsg + '</p>'
      + '<p style="margin:0;max-width:440px;font-weight:600;font-size:14.5px;line-height:1.6;color:rgba(255,255,255,.62);">Esto fueron 5 de las 804 preguntas. La app tiene 17 secciones, 10 juegos y una racha diaria para que no se te haga cuesta arriba.</p>'
      + '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;">'
      + '<a href="#anotarse" class="obol-btn" style="display:inline-flex;align-items:center;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:14.5px;color:#16213e;background:linear-gradient(90deg,#ffe08a,#ffb24a);padding:14px 24px;border-radius:999px;">Anotarme en la lista</a>'
      + '<button type="button" id="pb-restart" class="obol-btn" style="border:1px solid rgba(255,255,255,.2);cursor:pointer;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:14.5px;color:#fff;background:rgba(255,255,255,.07);padding:14px 24px;border-radius:999px;">Volver a probar</button>'
      + '</div></div>';
  }
  function pbWireQuizDone() {
    var r = $('pb-restart');
    if (r) r.addEventListener('click', pbRestart);
  }

  function pbChatHtml() {
    var msgsHtml = pb.messages.map(function (m) {
      var isPig = m.who === 'pig';
      var justify = isPig ? 'flex-start' : 'flex-end';
      var bg = isPig ? 'rgba(255,255,255,.08)' : 'linear-gradient(90deg,#ffe08a,#ffb24a)';
      var fg = isPig ? 'rgba(255,255,255,.92)' : '#16213e';
      var radius = isPig ? '4px 16px 16px 16px' : '16px 16px 4px 16px';
      var avatar = isPig ? '<div style="flex:none;width:34px;height:34px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.1);"><img src="./assets/icon.png" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"></div>' : '';
      return '<div style="display:flex;align-items:flex-end;gap:9px;justify-content:' + justify + ';">' + avatar
        + '<div style="max-width:80%;padding:12px 15px;font-weight:600;font-size:14.5px;line-height:1.55;border-radius:' + radius + ';background:' + bg + ';color:' + fg + ';">' + pbEsc(m.text) + '</div></div>';
    }).join('');

    var typingHtml = pb.typing
      ? '<div style="display:flex;align-items:center;gap:9px;">'
        + '<div style="flex:none;width:34px;height:34px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.1);"><img src="./assets/icon.png" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"></div>'
        + '<div style="display:flex;gap:5px;padding:14px 16px;border-radius:4px 16px 16px 16px;background:rgba(255,255,255,.08);">'
        + '<span style="width:6px;height:6px;border-radius:999px;background:rgba(255,255,255,.6);animation:obolDot 1.1s ease-in-out infinite;"></span>'
        + '<span style="width:6px;height:6px;border-radius:999px;background:rgba(255,255,255,.6);animation:obolDot 1.1s ease-in-out .18s infinite;"></span>'
        + '<span style="width:6px;height:6px;border-radius:999px;background:rgba(255,255,255,.6);animation:obolDot 1.1s ease-in-out .36s infinite;"></span>'
        + '</div></div>'
      : '';

    var chipsHtml = CHAT_QA.map(function (c, i) {
      return '<button type="button" data-chip="' + i + '" class="pb-chip" style="cursor:pointer;font-family:\'Nunito\',sans-serif;font-weight:700;font-size:13px;color:rgba(255,255,255,.8);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);padding:9px 15px;border-radius:999px;transition:background .18s ease,color .18s ease;">' + pbEsc(c.chip) + '</button>';
    }).join('');

    return '<div style="display:flex;flex-direction:column;height:100%;gap:14px;">'
      + '<div id="pb-thread" style="flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding-right:6px;">' + msgsHtml + typingHtml + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:8px;">'
      + '<span style="font-weight:700;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:rgba(255,255,255,.4);">Elegí una pregunta</span>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + chipsHtml + '</div>'
      + '</div>'
      + '<span style="font-weight:600;font-size:12px;color:rgba(255,255,255,.38);line-height:1.5;">Contenido educativo, no asesoramiento financiero.</span>'
      + '</div>';
  }

  function pbWireChat() {
    var body = $('pb-body');
    var thread = $('pb-thread');
    if (thread) thread.scrollTop = thread.scrollHeight;
    // En mobile el que scrollea es el panel entero (ver #pb-thread en el
    // media query), así que también hay que bajar el panel lo justo para
    // que la respuesta nueva no quede arriba, fuera de la vista.
    if (thread) pbRevealInBody(thread);

    Array.prototype.forEach.call(body.querySelectorAll('.pb-chip'), function (b) {
      b.addEventListener('click', function () {
        pbAskFixed(parseInt(b.getAttribute('data-chip'), 10));
      });
    });
  }

  $('pb-tab-quiz').addEventListener('click', function () { pbSetMode('quiz'); });
  $('pb-tab-chat').addEventListener('click', function () { pbSetMode('chat'); });

  pbSetMode('quiz');
  pbRenderAuth();
  pbInitAuth();
})();
