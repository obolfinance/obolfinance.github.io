// Estaba inline en docs/noticias.html.
// Va en un archivo para que la CSP no necesite 'unsafe-inline'.
(function () {
  "use strict";

  var TIPOS = {
    mercado:  { label: 'Mercados',  emoji: '📈', color: '#1f7a5a', suave: '#e6f5ef' },
    reunion:  { label: 'Reuniones', emoji: '🗓️', color: '#2a5fb3', suave: '#e8effb' },
    discurso: { label: 'Discursos', emoji: '🎙️', color: '#7a4bbd', suave: '#f0ebfb' },
    empresa:  { label: 'Empresas',  emoji: '🏢', color: '#b3651f', suave: '#fbf0e4' },
    economia: { label: 'Economía',  emoji: '📊', color: '#16213e', suave: '#e9ecf5' }
  };
  var GUARDADAS_KEY = 'obolNoticiasGuardadas';

  var $ = function (id) { return document.getElementById(id); };
  var state = {
    items: [], filtro: '', soloGuardadas: false, guardadas: {}, abiertas: {},
    loading: true, error: false, generatedAt: null
  };

  try {
    var raw = localStorage.getItem(GUARDADAS_KEY);
    if (raw) state.guardadas = JSON.parse(raw) || {};
  } catch (e) { /* localStorage no disponible, seguimos sin guardadas */ }

  function escXml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function tiempoRelativo(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var diffMin = Math.round((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'recién';
    if (diffMin < 60) return 'hace ' + diffMin + ' min';
    var diffH = Math.round(diffMin / 60);
    if (diffH < 24) return 'hace ' + diffH + 'h';
    var diffD = Math.round(diffH / 24);
    if (diffD === 1) return 'ayer';
    if (diffD < 7) return 'hace ' + diffD + ' días';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  }

  function guardarGuardadas() {
    try { localStorage.setItem(GUARDADAS_KEY, JSON.stringify(state.guardadas)); } catch (e) { /* ignorar */ }
  }

  var toastTimer = null;
  function toast(txt) {
    clearTimeout(toastTimer);
    var el = $('toast');
    $('toastTxt').textContent = txt;
    el.style.display = 'flex';
    toastTimer = setTimeout(function () { el.style.display = 'none'; }, 2600);
  }

  function toggleGuardar(id) {
    var estaba = !!state.guardadas[id];
    if (estaba) delete state.guardadas[id]; else state.guardadas[id] = true;
    guardarGuardadas();
    toast(estaba ? 'Sacada de guardadas' : 'Guardada para después');
    renderChips();
    renderCards();
  }

  function cardHtml(item, i) {
    // Un tipo desconocido se muestra como "Noticia" y nunca con el texto que
    // vino: noticias.json lo escribe un modelo a partir de articulos de
    // terceros, y ese valor iba a innerHTML sin escapar.
    var tipo = Object.prototype.hasOwnProperty.call(TIPOS, item.type)
      ? TIPOS[item.type]
      : { label: 'Noticia', emoji: '📰', color: '#5d6880', suave: '#f1f4fa' };
    // Solo links https: escXml escapa las comillas pero deja pasar javascript:.
    var fuente = String(item.source_url || '').indexOf('https://') === 0 ? item.source_url : '';
    var guardada = !!state.guardadas[item.id];
    var tieneDetalle = !!item.detail;
    var abierta = tieneDetalle && !!state.abiertas[item.id];

    var panel = '';
    if (abierta) {
      var tags = Array.isArray(item.tags) && item.tags.length
        ? '<div style="display:flex;flex-wrap:wrap;gap:8px;">' + item.tags.map(function (t) {
            return '<span style="font-weight:800;font-size:11.5px;color:#5f6880;background:#eef2fa;border-radius:999px;padding:5px 11px;">' + escXml(t) + '</span>';
          }).join('') + '</div>'
        : '';
      var link = fuente
        ? '<a href="' + escXml(fuente) + '" target="_blank" rel="noopener noreferrer" class="news-link" style="display:inline-flex;align-items:center;gap:6px;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:12.5px;color:' + tipo.color + ';">Ver fuente ↗</a>'
        : '';
      panel = '<div style="display:flex;flex-direction:column;gap:12px;padding:15px 16px;background:#f7f9fd;border:1px solid #e6ebf5;border-radius:14px;animation:obolRise .32s ease both;">'
        + '<span style="font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a92a8;">Por qué importa</span>'
        + '<p style="margin:0;font-weight:600;font-size:14px;line-height:1.6;color:#4b5468;">' + escXml(item.detail) + '</p>'
        + tags
        + link
        + '</div>';
    }

    var accionHtml;
    if (tieneDetalle) {
      accionHtml = '<span style="display:inline-flex;align-items:center;gap:6px;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:12.5px;color:' + tipo.color + ';">' + (abierta ? 'Cerrar ↑' : 'Por qué importa ↓') + '</span>';
    } else if (fuente) {
      accionHtml = '<a href="' + escXml(fuente) + '" target="_blank" rel="noopener noreferrer" class="news-link" style="display:inline-flex;align-items:center;gap:6px;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:12.5px;color:' + tipo.color + ';">Ver fuente ↗</a>';
    } else {
      accionHtml = '';
    }

    return '<article class="obol-card news-card" data-id="' + escXml(item.id) + '" style="position:relative;overflow:hidden;background:#fff;border:1px solid #e3e8f2;border-radius:20px;padding:22px 22px 18px;display:flex;flex-direction:column;gap:13px;cursor:' + (tieneDetalle ? 'pointer' : 'default') + ';box-shadow:0 1px 2px rgba(20,30,60,.04);animation:obolRise .5s cubic-bezier(.22,1,.36,1) both;animation-delay:' + (i * 60) + 'ms;">'
      + '<div style="position:absolute;top:0;left:0;right:0;height:4px;background:' + tipo.color + ';"></div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:2px;">'
      + '<span style="display:inline-flex;align-items:center;gap:7px;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:' + tipo.color + ';background:' + tipo.suave + ';padding:6px 12px;border-radius:999px;"><span style="font-size:12px;">' + tipo.emoji + '</span>' + tipo.label + '</span>'
      + '<button type="button" class="news-star" data-id="' + escXml(item.id) + '" style="border:none;background:transparent;cursor:pointer;font-size:17px;line-height:1;padding:4px;color:' + (guardada ? '#ffb24a' : '#c6cddd') + ';">' + (guardada ? '★' : '☆') + '</button>'
      + '</div>'
      + '<h3 style="margin:0;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:19px;line-height:1.24;color:#16213e;text-wrap:pretty;">' + escXml(item.title) + '</h3>'
      + '<p style="margin:0;font-weight:600;font-size:14.5px;line-height:1.55;color:#5f6880;text-wrap:pretty;flex:1;">' + escXml(item.summary) + '</p>'
      + panel
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:12px;border-top:1px solid #eef1f8;">'
      + '<div style="display:flex;align-items:center;gap:10px;">'
      + '<span style="font-weight:800;font-size:12px;color:#8a92a8;">' + escXml(tiempoRelativo(item.published_at)) + '</span>'
      + '<span style="width:3px;height:3px;border-radius:50%;background:#c6cddd;"></span>'
      + '<span style="font-weight:700;font-size:12px;color:#8a92a8;">' + escXml(item.source_name || 'Fuente') + '</span>'
      + '</div>'
      + accionHtml
      + '</div>'
      + '</article>';
  }

  function listaVisible() {
    return state.items.filter(function (it) {
      return (!state.filtro || it.type === state.filtro) && (!state.soloGuardadas || state.guardadas[it.id]);
    });
  }

  function renderChips() {
    var host = $('filterChips');
    var defs = [{ key: '', label: 'Todas', emoji: '✦' }].concat(
      Object.keys(TIPOS).map(function (k) { return { key: k, label: TIPOS[k].label, emoji: TIPOS[k].emoji }; })
    );
    host.innerHTML = defs.map(function (f) {
      var activo = state.filtro === f.key;
      var conteo = f.key === '' ? state.items.length : state.items.filter(function (it) { return it.type === f.key; }).length;
      return '<button type="button" class="filtro" data-tipo="' + escXml(f.key) + '" style="display:inline-flex;align-items:center;gap:7px;font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:13.5px;padding:9px 16px;border-radius:999px;cursor:pointer;transition:transform .18s ease;border:1.5px solid ' + (activo ? '#16213e' : '#dbe1ee') + ';background:' + (activo ? '#16213e' : '#fff') + ';color:' + (activo ? '#fff' : '#5f6880') + ';"><span style="font-size:14px;">' + f.emoji + '</span>' + f.label + '<span style="font-weight:800;font-size:11px;opacity:.65;">' + conteo + '</span></button>';
    }).join('');

    document.querySelectorAll('.filtro').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.filtro = btn.getAttribute('data-tipo');
        state.soloGuardadas = false;
        renderChips();
        renderCards();
      });
    });

    var nGuardadas = Object.keys(state.guardadas).filter(function (k) { return state.guardadas[k]; }).length;
    $('conteoGuardadas').textContent = nGuardadas ? '(' + nGuardadas + ')' : '';
    var btnG = $('btnGuardadas');
    btnG.style.background = state.soloGuardadas ? '#ffb24a' : '#fff';
    btnG.style.color = state.soloGuardadas ? '#16213e' : '#7b849c';
    btnG.style.borderColor = state.soloGuardadas ? '#ffb24a' : '#dbe1ee';
  }

  function renderCards() {
    var items = listaVisible();
    var host = $('newsCards');
    $('resumenConteo').textContent = items.length + (items.length === 1 ? ' noticia' : ' noticias');

    if (!items.length) {
      host.style.display = 'none';
      $('newsEmpty').style.display = 'flex';
      if (!state.items.length) {
        $('emptyTitle').textContent = 'Estamos preparando las primeras noticias';
        $('emptyText').textContent = 'Esta sección se actualiza sola un par de veces por día. Volvé en un rato.';
      } else {
        $('emptyTitle').textContent = 'Nada por acá todavía';
        $('emptyText').textContent = 'Probá con otro filtro o volvé en un rato: esta sección se actualiza sola un par de veces por día.';
      }
      return;
    }
    $('newsEmpty').style.display = 'none';
    host.style.display = 'grid';
    host.innerHTML = items.map(cardHtml).join('');

    document.querySelectorAll('.news-star').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleGuardar(btn.getAttribute('data-id'));
      });
    });
    document.querySelectorAll('.news-link').forEach(function (a) {
      a.addEventListener('click', function (e) { e.stopPropagation(); });
    });
    document.querySelectorAll('.news-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-id');
        var item = state.items.find(function (it) { return it.id === id; });
        if (!item || !item.detail) return;
        state.abiertas[id] = !state.abiertas[id];
        renderCards();
      });
    });
  }

  $('btnGuardadas').addEventListener('click', function () {
    state.soloGuardadas = !state.soloGuardadas;
    renderChips();
    renderCards();
  });

  function actualizarHaceCuanto() {
    $('updatedTxt').textContent = state.generatedAt ? tiempoRelativo(state.generatedAt) : 'todavía no';
  }
  setInterval(actualizarHaceCuanto, 60000);

  function renderTicker(ticker) {
    if (!Array.isArray(ticker) || !ticker.length) return;
    var doble = ticker.concat(ticker);
    $('tickerTrack').innerHTML = doble.map(function (t) {
      var tieneDelta = typeof t.delta_pct === 'number';
      var subio = tieneDelta && t.delta_pct >= 0;
      var deltaColor = !tieneDelta ? 'rgba(255,255,255,.4)' : (subio ? '#4ade80' : '#f87171');
      var deltaTxt = tieneDelta ? (subio ? '+' : '') + t.delta_pct.toFixed(2).replace('.', ',') + '%' : '—';
      return '<div style="display:flex;align-items:center;gap:9px;padding:13px 22px;border-right:1px solid rgba(255,255,255,.07);white-space:nowrap;">'
        + '<span style="font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:13px;color:rgba(255,255,255,.78);letter-spacing:.04em;">' + escXml(t.label) + '</span>'
        + '<span style="font-family:\'Fredoka\',sans-serif;font-weight:600;font-size:13px;color:#fff;">' + escXml(t.valor) + '</span>'
        + '<span style="font-weight:800;font-size:12px;color:' + deltaColor + ';">' + deltaTxt + '</span>'
        + '</div>';
    }).join('');
  }

  function load() {
    state.loading = true; state.error = false;
    $('newsSkeleton').style.display = 'grid';
    $('newsError').style.display = 'none';
    $('newsEmpty').style.display = 'none';
    $('newsCards').style.display = 'none';

    fetch('./noticias.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        state.items = Array.isArray(data.items) ? data.items : [];
        state.generatedAt = data.generated_at || null;
        state.loading = false;
        $('newsSkeleton').style.display = 'none';
        actualizarHaceCuanto();
        renderChips();
        renderCards();
        renderTicker(data.ticker);
      })
      .catch(function () {
        state.loading = false; state.error = true;
        $('newsSkeleton').style.display = 'none';
        $('newsError').style.display = 'block';
        $('updatedTxt').textContent = '—';
      });
  }

  $('btnRetryError').addEventListener('click', load);
  load();
})();
