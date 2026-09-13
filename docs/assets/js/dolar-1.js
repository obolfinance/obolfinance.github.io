// Estaba inline en docs/dolar.html (bloque 1 de 2, en el mismo orden).
// Va en un archivo para que la CSP no necesite 'unsafe-inline'.
(function () {
  "use strict";
  var WEBHOOK = "https://obolfinance.app.n8n.cloud/webhook/obol-waitlist";
  var TURNSTILE_SITE_KEY = "0x4AAAAAAEHbemQBbrf5Cw39";
  var host = document.getElementById('curvedWl');
  var trampa = document.getElementById('wl-trampa');
  var msg = document.getElementById('wl-msg');
  if (!host || !msg || !window.ObolCurvedInput) return;

  var ts = window.ObolTurnstile ? window.ObolTurnstile(TURNSTILE_SITE_KEY) : null;

  function valido(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  var ci = window.ObolCurvedInput(host, {
    placeholder: 'tu@mail.com',
    buttonText: 'Avisame',
    bg: '#fffaf0',
    text: '#0d1730',
    placeholderColor: 'rgba(13,23,48,.45)',
    border: 'rgba(13,23,48,.25)',
    accentFrom: '#16213e',
    accentTo: '#0d1730',
    accentText: '#ffffff',
    height: 54,
    bend: 15,
    fontSize: 14.5,
    onSubmit: enviar
  });

  function enviar() {
    var v = ci.getValue().trim().toLowerCase();
    if (!valido(v)) {
      msg.style.color = '#b4503c';
      msg.textContent = 'Ese mail no parece válido. Revisalo y probá de nuevo.';
      return;
    }
    if (trampa && trampa.value !== '') return; // bot
    ci.setBusy(true, 'Anotándote…');
    msg.style.color = 'rgba(13,23,48,.7)';
    msg.textContent = '';

    function listo() {
      ci.hide();
      msg.style.color = '#1e7a54';
      msg.textContent = 'Listo, quedaste anotado. Te escribimos cuando abra la beta.';
    }

    function fallar() {
      ci.setBusy(false, 'Avisame');
      msg.style.color = '#b4503c';
      msg.textContent = 'No pudimos guardarte ahora. Probá de nuevo en un minuto.';
    }

    function mandar(turnstileToken) {
      var datos = { email: v, origen: 'cta-dolar', pagina: location.pathname, referrer: document.referrer || 'directo', fecha: new Date().toISOString(), turnstileToken: turnstileToken };

      if (!WEBHOOK) {
        console.warn('[Obol] Falta configurar WEBHOOK. Se enviaría:', datos);
        listo();
        return;
      }

      fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(datos) })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(listo)
        .catch(function (e) { console.error(e); fallar(); });
    }

    function conToken(token) {
      if (!token) { fallar(); return; }
      mandar(token);
    }
    if (ts) { ts.getToken(conToken); } else { conToken(null); }
  }
})();
