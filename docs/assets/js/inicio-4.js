// Estaba inline en docs/index.html (bloque 4 de 6, en el mismo orden).
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
    buttonText: 'Anotarme',
    bg: '#101a34',
    text: '#ffffff',
    placeholderColor: 'rgba(255,255,255,.45)',
    border: 'rgba(255,255,255,.22)',
    accentFrom: '#ffe08a',
    accentTo: '#ffb24a',
    accentText: '#16213e',
    height: 54,
    bend: 15,
    fontSize: 14.5,
    onSubmit: enviar
  });

  function enviar() {
    var v = ci.getValue().trim().toLowerCase();
    if (!valido(v)) {
      msg.style.color = '#ff9a7f';
      msg.textContent = 'Ese mail no parece válido. Revisalo y probá de nuevo.';
      return;
    }
    if (trampa && trampa.value !== '') return; // bot
    ci.setBusy(true, 'Anotándote…');
    msg.style.color = 'rgba(255,255,255,.7)';
    msg.textContent = '';

    function listo() {
      ci.hide();
      msg.style.color = '#6ddbaa';
      msg.textContent = 'Listo, quedaste anotado. Te escribimos cuando abra la beta.';
    }

    function fallar() {
      ci.setBusy(false, 'Anotarme');
      msg.style.color = '#ff9a7f';
      msg.textContent = 'No pudimos guardarte ahora. Probá de nuevo en un minuto.';
    }

    function mandar(turnstileToken) {
      var datos = { email: v, origen: 'cta-home', pagina: location.pathname, referrer: document.referrer || 'directo', fecha: new Date().toISOString(), turnstileToken: turnstileToken };

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
