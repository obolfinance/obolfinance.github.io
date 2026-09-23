// Estaba inline en docs/dolar.html (bloque 2 de 2, en el mismo orden).
// Va en un archivo para que la CSP no necesite 'unsafe-inline'.
(function(){
"use strict";

var CASAS = [
  { casa:'blue', label:'Blue', sub:'Informal', accent:'#2f9e5f', tint:'#e4f4ea' },
  { casa:'oficial', label:'Oficial', sub:'Banco Nación', accent:'#4a7ce0', tint:'#e5ecfb' },
  { casa:'bolsa', label:'MEP', sub:'Dólar bolsa', accent:'#6b3fa0', tint:'#efe6f7' },
  { casa:'contadoconliqui', label:'CCL', sub:'Contado con liqui', accent:'#b8791f', tint:'#f6ecda' },
  { casa:'tarjeta', label:'Tarjeta', sub:'Oficial + impuestos', accent:'#e0674a', tint:'#fbe4dd' },
  { casa:'cripto', label:'Cripto', sub:'Stablecoins', accent:'#1f8f8f', tint:'#ddf1f1' }
];
var MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
var $ = function(id){ return document.getElementById(id); };

var state = {
  rates: null, infl: null, anual: null, pf: null,
  loading: true, error: false, mode: 'venta',
  amount: 100000, monthIdx: null, grow: 0, updated: ''
};
var barEls = []; // {fill, tip, tipLabel, m}

function num(n, dec){
  // Number() y no el valor tal cual: si la API devolviera un texto,
  // toLocaleString lo pasaria sin cambios y terminaria en innerHTML.
  var x = Number(n);
  if (!isFinite(x)) x = 0;
  var d = dec === undefined ? 2 : dec;
  return x.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function monthLabel(fecha){
  var p = String(fecha).split('-');
  return MES[parseInt(p[1], 10) - 1] + ' ' + p[0];
}
function cap(s){
  return String(s || '').toLowerCase().replace(/(^|\s)\S/g, function(m){ return m.toUpperCase(); });
}

function load(){
  state.loading = true; state.error = false; state.grow = 0;
  $('cotizSkeleton').style.display = 'grid';
  $('cotizError').style.display = 'none';
  $('cotizCards').style.display = 'none';
  $('updatedTxt').textContent = 'buscando…';
  $('refreshSpinner').style.display = 'inline-block';
  $('chartHint').textContent = 'cargando serie del INDEC…';
  $('verdictBadge').textContent = 'Comparando tasas…';
  $('verdictBadge').style.color = 'rgba(255,255,255,.7)';
  $('verdictBadge').style.background = 'rgba(255,255,255,.08)';
  $('verdictBadge').style.border = '1px solid rgba(255,255,255,.16)';

  var get = function(u){ return fetch(u).then(function(r){ if (!r.ok) throw new Error(u); return r.json(); }); };
  // Las APIs son gratuitas y a veces fallan un instante solo (rate limit, hipo de red).
  // Reintenta antes de rendirse en vez de mostrar error a la primera.
  var getWithRetry = function(u, intentos, esperaMs){
    intentos = intentos === undefined ? 3 : intentos;
    esperaMs = esperaMs === undefined ? 1200 : esperaMs;
    return get(u).catch(function(err){
      if (intentos <= 1) throw err;
      return new Promise(function(resolve){ setTimeout(resolve, esperaMs); })
        .then(function(){ return getWithRetry(u, intentos - 1, esperaMs + 800); });
    });
  };

  Promise.all([
    getWithRetry('https://dolarapi.com/v1/dolares'),
    getWithRetry('https://api.argentinadatos.com/v1/finanzas/indices/inflacion'),
    getWithRetry('https://api.argentinadatos.com/v1/finanzas/indices/inflacionInteranual').catch(function(){ return null; }),
    getWithRetry('https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo').catch(function(){ return null; })
  ]).then(function(res){
    var rates = res[0], infl = res[1], anual = res[2], pf = res[3];
    var serie = (infl || []).filter(function(d){ return d && d.fecha && typeof d.valor === 'number'; });
    var last = serie.length - 1;
    var back = Math.max(0, last - 60);
    var stamp = (rates && rates[0] && rates[0].fechaActualizacion) ? new Date(rates[0].fechaActualizacion) : new Date();

    state.rates = rates; state.infl = serie; state.anual = anual; state.pf = pf; state.loading = false;
    if (state.monthIdx === null) state.monthIdx = back;
    state.updated = stamp.toLocaleString('es-AR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });

    $('cotizSkeleton').style.display = 'none';
    $('refreshSpinner').style.display = 'none';
    $('updatedTxt').textContent = state.updated;

    buildCards();
    buildBars();
    buildChipsAndSelect();
    renderStats();
    renderPlazoFijo();
    renderCalc();

    setTimeout(function(){
      state.grow = 1;
      growIn();
    }, 90);
  }).catch(function(){
    state.loading = false; state.error = true;
    $('cotizSkeleton').style.display = 'none';
    $('refreshSpinner').style.display = 'none';
    $('cotizError').style.display = 'block';
    $('updatedTxt').textContent = '—';
  });
}

function setMode(m){
  state.mode = m;
  $('btnVenta').style.background = m === 'venta' ? '#fff' : 'transparent';
  $('btnVenta').style.color = m === 'venta' ? '#16213e' : 'rgba(255,255,255,.7)';
  $('btnCompra').style.background = m === 'compra' ? '#fff' : 'transparent';
  $('btnCompra').style.color = m === 'compra' ? '#16213e' : 'rgba(255,255,255,.7)';
  if (!state.loading && !state.error) buildCards();
}

function buildCards(){
  var byCasa = {};
  (state.rates || []).forEach(function(r){ byCasa[r.casa] = r; });
  var oficial = byCasa.oficial ? byCasa.oficial.venta : 0;
  var g = state.grow;

  var html = '';
  CASAS.forEach(function(c){
    var r = byCasa[c.casa];
    if (!r) return;
    // El tarjeta no es un mercado: es el oficial con los impuestos de los
    // consumos en moneda extranjera. No se compra ni se vende, asi que el
    // valor de compra que manda la API —el oficial comprador con el mismo
    // recargo— no corresponde a ninguna operacion real. La tarjeta muestra
    // siempre lo que se paga, con el boton donde este.
    var esTarjeta = c.casa === 'tarjeta';
    var big = esTarjeta || state.mode === 'venta' ? r.venta : (r.compra || r.venta);
    var other = state.mode === 'venta' ? (r.compra || r.venta) : r.venta;
    var otherLabel = state.mode === 'venta' ? 'compra' : 'venta';
    var brecha = (oficial && c.casa !== 'oficial') ? ((r.venta / oficial - 1) * 100) : 0;
    var brechaTxt = c.casa === 'oficial' ? 'referencia' : ('+' + num(brecha, 1) + '%');
    var gapW = c.casa === 'oficial' ? (100 * g) : (Math.min(100, Math.max(4, brecha * 1.1)) * g);
    var gapNote = c.casa === 'oficial' ? 'base de la brecha' : 'brecha vs oficial';

    html += '<div class="obol-card" style="background:#fff;border:1px solid #e6ebf4;border-top:4px solid ' + c.accent + ';border-radius:18px;padding:20px 22px 18px;box-shadow:0 14px 34px -24px rgba(15,20,45,.5);">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;">'
      + '<div style="display:flex;flex-direction:column;">'
      + '<span style="font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:19px;color:#16213e;">' + c.label + '</span>'
      + '<span style="font-weight:700;font-size:12px;color:#8892a6;">' + c.sub + '</span>'
      + '</div>'
      + '<span style="font-weight:800;font-size:11px;letter-spacing:.04em;color:' + c.accent + ';background:' + c.tint + ';padding:5px 10px;border-radius:999px;white-space:nowrap;">' + brechaTxt + '</span>'
      + '</div>'
      + '<div style="display:flex;align-items:baseline;gap:7px;">'
      + '<span style="font-family:\'Fredoka\',sans-serif;font-weight:500;font-size:20px;color:#9aa4b8;">$</span>'
      + '<span style="font-family:\'Fredoka\',sans-serif;font-weight:700;font-size:38px;line-height:1;color:#16213e;letter-spacing:-.02em;">' + num(big, 2) + '</span>'
      + '</div>'
      + '<div style="margin-top:14px;height:6px;border-radius:999px;background:#eef1f7;overflow:hidden;">'
      + '<div style="height:100%;border-radius:999px;width:' + gapW + '%;background:' + c.accent + ';transition:width .9s cubic-bezier(.22,.61,.36,1);"></div>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;margin-top:9px;font-weight:700;font-size:12px;color:#8892a6;">'
      + (esTarjeta ? '<span>no se compra ni se vende</span>' : '<span>' + otherLabel + ' $' + num(other, 2) + '</span>') + '<span>' + gapNote + '</span>'
      + '</div></div>';
  });

  $('cotizCards').innerHTML = html;
  $('cotizCards').style.display = 'grid';
}

function buildBars(){
  var serie = state.infl || [];
  var slice = serie.slice(Math.max(0, serie.length - 12));
  var max = slice.reduce(function(m, d){ return Math.max(m, d.valor); }, 1);
  var container = $('chartBars');
  container.innerHTML = '';
  barEls = [];

  slice.forEach(function(d, i){
    var col = document.createElement('div');
    col.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:9px;height:100%;position:relative;';

    var tip = document.createElement('span');
    tip.textContent = num(d.valor, 1) + '%';
    tip.style.cssText = 'position:absolute;bottom:0;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:13px;color:#fff;background:#16213e;padding:4px 9px;border-radius:8px;white-space:nowrap;opacity:0;transform:translateY(6px);transition:opacity .18s ease,transform .22s cubic-bezier(.22,.61,.36,1);pointer-events:none;';

    var fill = document.createElement('div');
    fill.style.cssText = 'width:100%;max-width:40px;height:0px;border-radius:9px 9px 4px 4px;background:#a8c6fb;box-shadow:0 0 0 rgba(0,0,0,0);transform:scale(1,1);transform-origin:bottom center;transition:height .55s cubic-bezier(.22,.61,.36,1),transform .22s cubic-bezier(.22,.61,.36,1),background .2s ease,box-shadow .22s ease;';

    var lbl = document.createElement('span');
    lbl.textContent = MES[parseInt(String(d.fecha).split('-')[1], 10) - 1];
    lbl.style.cssText = 'font-weight:700;font-size:11px;color:#8892a6;transition:color .18s ease;';

    var realH = Math.max(6, Math.round((d.valor / max) * 168));
    col.appendChild(tip); col.appendChild(fill); col.appendChild(lbl);

    col.addEventListener('mouseenter', function(){
      tip.style.bottom = (realH + 36) + 'px';
      tip.style.opacity = '1'; tip.style.transform = 'translateY(0)';
      fill.style.transform = 'scale(1.22,1.1)';
      fill.style.boxShadow = '0 18px 30px -12px rgba(47,95,208,.7)';
      fill.style.background = '#2f5fd0';
      lbl.style.color = '#2f5fd0';
    });
    col.addEventListener('mouseleave', function(){
      tip.style.opacity = '0'; tip.style.transform = 'translateY(6px)';
      fill.style.transform = 'scale(1,1)';
      fill.style.boxShadow = '0 0 0 rgba(0,0,0,0)';
      fill.style.background = '#a8c6fb';
      lbl.style.color = '#8892a6';
    });

    container.appendChild(col);
    barEls.push({ fill: fill, realH: realH });
  });

  $('chartHint').textContent = 'pasá el mouse por cada mes';
}

function buildChipsAndSelect(){
  var serie = state.infl || [];
  var last = serie.length - 1;

  var sel = $('monthSelect');
  sel.innerHTML = '';
  for (var i = last - 1; i >= 0; i--) {
    var o = document.createElement('option');
    o.value = String(i);
    o.textContent = monthLabel(serie[i].fecha);
    sel.appendChild(o);
  }
  sel.value = String(state.monthIdx);
  sel.onchange = function(){ state.monthIdx = parseInt(sel.value, 10); renderCalc(); };

  var chipVals = [50000, 100000, 500000, 1000000];
  var chipLabel = function(v){ return v >= 1000000 ? '$1M' : ('$' + (v / 1000) + 'k'); };
  var chipsBox = $('amountChips');
  chipsBox.innerHTML = '';
  chipVals.forEach(function(v){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'obol-chip'; b.textContent = chipLabel(v);
    b.style.cssText = 'cursor:pointer;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:13px;padding:7px 15px;border-radius:999px;border:1.5px solid #e2e8f2;background:#fff;color:#5d6880;';
    b.addEventListener('click', function(){ state.amount = v; $('amountInput').value = v.toLocaleString('es-AR'); renderCalc(); });
    chipsBox.appendChild(b);
  });

  var jumpDefs = [{ y:1, l:'1 año' }, { y:3, l:'3 años' }, { y:5, l:'5 años' }, { y:10, l:'10 años' }];
  var jumpsBox = $('jumpChips');
  jumpsBox.innerHTML = '';
  jumpDefs.forEach(function(j){
    var target = last - j.y * 12;
    if (target < 0) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'obol-chip'; b.textContent = j.l;
    b.style.cssText = 'cursor:pointer;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:13px;padding:7px 15px;border-radius:999px;border:1.5px solid #e2e8f2;background:#fff;color:#5d6880;';
    b.addEventListener('click', function(t){ return function(){ state.monthIdx = t; sel.value = String(t); renderCalc(); }; }(target));
    jumpsBox.appendChild(b);
  });

  $('amountInput').value = state.amount.toLocaleString('es-AR');
  $('amountInput').addEventListener('input', function(e){
    var v = parseInt(String(e.target.value).replace(/\D/g, ''), 10);
    state.amount = isNaN(v) ? 0 : Math.min(v, 999999999);
    e.target.value = state.amount ? state.amount.toLocaleString('es-AR') : '';
    renderCalc();
  });
}

function renderStats(){
  var serie = state.infl || [];
  var last = serie.length - 1;
  var lastRow = last >= 0 ? serie[last] : null;
  var year = lastRow ? String(lastRow.fecha).slice(0, 4) : '';
  var acum = 1;
  serie.filter(function(d){ return String(d.fecha).slice(0, 4) === year; }).forEach(function(d){ acum *= 1 + d.valor / 100; });
  var anualRow = (state.anual && state.anual.length) ? state.anual[state.anual.length - 1] : null;

  $('statMensualVal').textContent = lastRow ? num(lastRow.valor, 1) : '—';
  $('statMensualLabel').textContent = lastRow ? monthLabel(lastRow.fecha) : '—';
  $('statInteranualVal').textContent = anualRow ? num(anualRow.valor, 1) : '—';
  $('statAcumuladaVal').textContent = num((acum - 1) * 100, 1);
  $('statAcumuladaLabel').textContent = 'Acumulada ' + year;
}

function renderPlazoFijo(){
  var serie = state.infl || [];
  var last = serie.length - 1;
  var lastRow = last >= 0 ? serie[last] : null;
  var inflMesV = lastRow ? lastRow.valor : 0;
  var g = state.grow;

  var pfTna = 0, pfEntidad = '—';
  (state.pf || []).forEach(function(p){
    var t = p.tnaClientes;
    if (typeof t !== 'number') return;
    if (t > 3) t = t / 100;
    if (t > pfTna) { pfTna = t; pfEntidad = cap(p.entidad || ''); }
  });
  var pfMensual = pfTna * 100 / 12;
  var wins = pfMensual >= inflMesV;
  var scale = Math.max(pfMensual, inflMesV, 0.1);

  var badge = $('verdictBadge');
  badge.textContent = wins ? 'Le gana a la inflación' : 'Pierde contra la inflación';
  badge.style.color = wins ? '#5ec4a0' : '#ff9a7f';
  badge.style.background = wins ? 'rgba(94,196,160,.12)' : 'rgba(224,103,74,.14)';
  badge.style.border = '1px solid ' + (wins ? 'rgba(94,196,160,.35)' : 'rgba(255,154,127,.35)');

  $('pfEntidadLabel').textContent = 'Plazo fijo · ' + pfEntidad;
  $('pfMensualVal').textContent = num(pfMensual, 2) + '% mensual';
  $('inflMesLabel2').textContent = 'Inflación · ' + (lastRow ? monthLabel(lastRow.fecha) : '—');
  $('inflMesVal2').textContent = num(inflMesV, 1) + '% mensual';

  $('pfBarFill').style.width = ((pfMensual / scale) * 100 * g) + '%';
  $('inflBarFill').style.width = ((inflMesV / scale) * 100 * g) + '%';
}

function renderCalc(){
  var serie = state.infl || [];
  var last = serie.length - 1;
  var g = state.grow;
  var idx = state.monthIdx === null ? 0 : state.monthIdx;

  var factor = 1;
  for (var i = idx + 1; i <= last; i++) factor *= 1 + serie[i].valor / 100;
  var need = state.amount * factor;
  var keep = Math.max(0, Math.min(100, 100 / factor));
  var monthTxt = (idx <= last && serie[idx]) ? monthLabel(serie[idx].fecha) : '';
  var nowTxt = (last >= 0) ? monthLabel(serie[last].fecha) : 'hoy';

  $('calcResult').textContent = num(need, 0);
  $('calcNote').textContent = serie.length
    ? ('Lo que comprabas con $' + num(state.amount, 0) + ' en ' + monthTxt + ' cuesta eso hoy. Es la misma plata, medida contra los precios de ' + nowTxt + '.')
    : 'Elegí un monto y un mes para ver el cálculo.';
  $('calcKeepFill').style.width = (keep * g) + '%';
  $('calcLostFill').style.width = ((100 - keep) * g) + '%';
  $('calcKeepTxt').textContent = num(keep, 1);
  $('calcLostTxt').textContent = num(100 - keep, 1);
}

function growIn(){
  buildCards();
  barEls.forEach(function(b){ b.fill.style.height = b.realH + 'px'; });
  renderPlazoFijo();
  renderCalc();
}

$('btnVenta').addEventListener('click', function(){ setMode('venta'); });
$('btnCompra').addEventListener('click', function(){ setMode('compra'); });
$('btnRefresh').addEventListener('click', load);
$('btnRetryError').addEventListener('click', load);
setMode('venta');
load();
})();
