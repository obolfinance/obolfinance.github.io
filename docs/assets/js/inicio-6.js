// Estaba inline en docs/index.html (bloque 6 de 6, en el mismo orden).
// Va en un archivo para que la CSP no necesite 'unsafe-inline'.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var el = document.getElementById('obolMark');
  if (!el) return;
  el.addEventListener('animationend', function () {
    el.classList.remove('obol-mark-play');
  });
  var lastY = window.scrollY;
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      if (y > lastY + 4) {
        el.classList.remove('obol-mark-play');
        void el.offsetWidth;
        el.classList.add('obol-mark-play');
      }
      lastY = y;
      ticking = false;
    });
  }, { passive: true });
})();
