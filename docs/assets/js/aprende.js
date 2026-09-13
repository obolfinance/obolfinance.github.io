// Estaba inline en docs/aprende.html.
// Va en un archivo para que la CSP no necesite 'unsafe-inline'.
function showTab(tab) {
  var secciones = document.getElementById('tab-secciones');
  var juegos = document.getElementById('tab-juegos');
  var segS = document.getElementById('seg-secciones');
  var segJ = document.getElementById('seg-juegos');
  var active = tab === 'secciones';
  secciones.style.display = active ? 'block' : 'none';
  juegos.style.display = active ? 'none' : 'block';
  segS.classList.toggle('obol-seg-on', active);
  segJ.classList.toggle('obol-seg-on', !active);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Pestañas (antes onclick="showTab(...)" en cada boton).
document.querySelectorAll('[data-tab]').forEach(function (b) {
  b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
});
