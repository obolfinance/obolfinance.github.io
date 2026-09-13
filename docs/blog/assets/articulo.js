// Barra de progreso de lectura de las notas del blog. Estaba inline en
// cada nota; va en un archivo para que la CSP no necesite 'unsafe-inline'.
// La plantilla (automation/blog/plantilla.mjs) apunta aca.
(function() {
  var bar = document.getElementById('progress');
  function onScroll() {
    var h = document.documentElement;
    var max = (h.scrollHeight - h.clientHeight) || 1;
    var pct = Math.min(100, Math.max(0, (window.scrollY || h.scrollTop) / max * 100));
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
