// Estaba inline en docs/index.html (bloque 3 de 6, en el mismo orden).
// Va en un archivo para que la CSP no necesite 'unsafe-inline'.
(function () {
  "use strict";
  var wrap = document.getElementById('chanchoTilt');
  if (!wrap) return;
  var shell = wrap.querySelector('.pc-card-shell');
  var card = wrap.querySelector('.pc-card');
  if (!shell || !card) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function clamp(v, min, max) { return Math.min(Math.max(v, min === undefined ? 0 : min), max === undefined ? 100 : max); }
  function round(v, p) { p = p === undefined ? 3 : p; return parseFloat(v.toFixed(p)); }
  function adjust(v, fMin, fMax, tMin, tMax) { return round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin)); }

  var raf = null, running = false, lastTs = 0;
  var currentX = 0, currentY = 0, targetX = 0, targetY = 0;
  var DEFAULT_TAU = 0.14, INITIAL_TAU = 0.6, initialUntil = 0;

  function setVarsFromXY(x, y) {
    var width = shell.clientWidth || 1, height = shell.clientHeight || 1;
    var percentX = clamp((100 / width) * x);
    var percentY = clamp((100 / height) * y);
    var centerX = percentX - 50, centerY = percentY - 50;

    var cx = width / 2, cy = height / 2, dx = x - cx, dy = y - cy;
    var kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
    var ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
    var edgeProximity = clamp(1 / Math.min(kx, ky), 0, 1);
    var cursorAngle = 0;
    if (dx !== 0 || dy !== 0) {
      cursorAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (cursorAngle < 0) cursorAngle += 360;
    }

    var props = {
      '--pointer-x': percentX + '%',
      '--pointer-y': percentY + '%',
      '--background-x': adjust(percentX, 0, 100, 35, 65) + '%',
      '--background-y': adjust(percentY, 0, 100, 35, 65) + '%',
      '--pointer-from-center': clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1),
      '--pointer-from-top': percentY / 100,
      '--pointer-from-left': percentX / 100,
      '--rotate-x': round(-(centerX / 5)) + 'deg',
      '--rotate-y': round(centerY / 4) + 'deg',
      '--edge-proximity': round(edgeProximity * 100),
      '--cursor-angle': round(cursorAngle) + 'deg'
    };
    for (var k in props) wrap.style.setProperty(k, props[k]);
  }

  function step(ts) {
    if (!running) return;
    if (lastTs === 0) lastTs = ts;
    var dt = (ts - lastTs) / 1000;
    lastTs = ts;
    var tau = ts < initialUntil ? INITIAL_TAU : DEFAULT_TAU;
    var k = 1 - Math.exp(-dt / tau);
    currentX += (targetX - currentX) * k;
    currentY += (targetY - currentY) * k;
    setVarsFromXY(currentX, currentY);
    var stillFar = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;
    if (stillFar || document.hasFocus()) {
      raf = requestAnimationFrame(step);
    } else {
      running = false; lastTs = 0; raf = null;
    }
  }
  function start() { if (running) return; running = true; lastTs = 0; raf = requestAnimationFrame(step); }
  function setTarget(x, y) { targetX = x; targetY = y; start(); }
  function toCenter() { setTarget(shell.clientWidth / 2, shell.clientHeight / 2); }
  function setImmediate(x, y) { currentX = x; currentY = y; setVarsFromXY(currentX, currentY); }

  function offsets(evt) {
    var rect = shell.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }

  var enterTimer = null;
  shell.addEventListener('pointerenter', function (e) {
    shell.classList.add('active', 'entering');
    if (enterTimer) window.clearTimeout(enterTimer);
    enterTimer = window.setTimeout(function () { shell.classList.remove('entering'); }, 180);
    var o = offsets(e);
    setTarget(o.x, o.y);
  });
  shell.addEventListener('pointermove', function (e) {
    var o = offsets(e);
    setTarget(o.x, o.y);
  });
  var leaveRaf = null;
  shell.addEventListener('pointerleave', function () {
    toCenter();
    (function checkSettle() {
      var settled = Math.hypot(targetX - currentX, targetY - currentY) < 0.6;
      if (settled) { shell.classList.remove('active'); leaveRaf = null; }
      else { leaveRaf = requestAnimationFrame(checkSettle); }
    })();
  });

  setImmediate(shell.clientWidth - 70, 60);
  toCenter();
  initialUntil = performance.now() + 1200;
  start();
})();
