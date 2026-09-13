// Estaba inline en docs/index.html (bloque 1 de 6, en el mismo orden).
// Va en un archivo para que la CSP no necesite 'unsafe-inline'.
(function () {
  "use strict";
  var container = document.getElementById('cursorGrid');
  var canvas = document.getElementById('cursorGridCanvas');
  if (!container || !canvas) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var opts = {
    cellSize: 64,
    color: '#ffb24a',
    radius: 170,
    falloff: 'smooth',
    holdTime: 350,
    fadeDuration: 900,
    lineWidth: 1.2,
    maxOpacity: 0.85,
    fillOpacity: 0,
    gridOpacity: 0.05,
    cellRadius: 6,
    clickPulse: true,
    pulseSpeed: 650
  };

  var FALLOFF_CURVES = {
    linear: function (t) { return t; },
    smooth: function (t) { return t * t * (3 - 2 * t); },
    sharp: function (t) { return t * t * t; }
  };

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    var num = parseInt(h.slice(0, 6), 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var cols = 0, rows = 0, offX = 0, offY = 0;
  var alphas = new Float32Array(0), touched = new Float64Array(0);
  var w = 0, h = 0, pulses = [], raf = 0, running = false, lastFrame = 0;

  function rebuild() {
    w = container.offsetWidth;
    h = container.offsetHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / opts.cellSize) + 1;
    rows = Math.ceil(h / opts.cellSize) + 1;
    offX = (w - cols * opts.cellSize) / 2;
    offY = (h - rows * opts.cellSize) / 2;
    alphas = new Float32Array(cols * rows);
    touched = new Float64Array(cols * rows);
  }

  function cellCenter(i) {
    var cx = offX + (i % cols) * opts.cellSize + opts.cellSize / 2;
    var cy = offY + Math.floor(i / cols) * opts.cellSize + opts.cellSize / 2;
    return [cx, cy];
  }

  function energize(x, y, boost) {
    var r = Math.max(opts.radius, 1);
    var ease = FALLOFF_CURVES[opts.falloff] || FALLOFF_CURVES.linear;
    var now = performance.now();
    var minCol = Math.max(0, Math.floor((x - r - offX) / opts.cellSize));
    var maxCol = Math.min(cols - 1, Math.floor((x + r - offX) / opts.cellSize));
    var minRow = Math.max(0, Math.floor((y - r - offY) / opts.cellSize));
    var maxRow = Math.min(rows - 1, Math.floor((y + r - offY) / opts.cellSize));
    for (var cRow = minRow; cRow <= maxRow; cRow++) {
      for (var cCol = minCol; cCol <= maxCol; cCol++) {
        var i = cRow * cols + cCol;
        var c = cellCenter(i);
        var dist = Math.hypot(c[0] - x, c[1] - y);
        if (dist > r) continue;
        var level = ease(1 - dist / r) * opts.maxOpacity * (boost || 1);
        if (level > alphas[i]) { alphas[i] = level; touched[i] = now; }
        else if (level > 0) { touched[i] = now; }
      }
    }
  }

  function draw(now) {
    var dt = Math.min(now - lastFrame, 50);
    lastFrame = now;
    ctx.clearRect(0, 0, w, h);
    var rgb = hexToRgb(opts.color), cr = rgb[0], cg = rgb[1], cb = rgb[2];

    if (opts.gridOpacity > 0) {
      ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + opts.gridOpacity + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var cCol0 = 0; cCol0 <= cols; cCol0++) {
        var gx = Math.round(offX + cCol0 * opts.cellSize) + 0.5;
        ctx.moveTo(gx, 0); ctx.lineTo(gx, h);
      }
      for (var cRow0 = 0; cRow0 <= rows; cRow0++) {
        var gy = Math.round(offY + cRow0 * opts.cellSize) + 0.5;
        ctx.moveTo(0, gy); ctx.lineTo(w, gy);
      }
      ctx.stroke();
    }

    for (var pi = pulses.length - 1; pi >= 0; pi--) {
      var pulse = pulses[pi];
      var age = (now - pulse.t0) / 1000;
      var ringR = age * opts.pulseSpeed;
      if (ringR > Math.hypot(w, h)) { pulses.splice(pi, 1); continue; }
      var band = opts.cellSize;
      var minCol2 = Math.max(0, Math.floor((pulse.x - ringR - band - offX) / opts.cellSize));
      var maxCol2 = Math.min(cols - 1, Math.floor((pulse.x + ringR + band - offX) / opts.cellSize));
      var minRow2 = Math.max(0, Math.floor((pulse.y - ringR - band - offY) / opts.cellSize));
      var maxRow2 = Math.min(rows - 1, Math.floor((pulse.y + ringR + band - offY) / opts.cellSize));
      for (var cRow2 = minRow2; cRow2 <= maxRow2; cRow2++) {
        for (var cCol2 = minCol2; cCol2 <= maxCol2; cCol2++) {
          var i2 = cRow2 * cols + cCol2;
          var c2 = cellCenter(i2);
          var dist2 = Math.hypot(c2[0] - pulse.x, c2[1] - pulse.y);
          if (Math.abs(dist2 - ringR) < band / 2 && opts.maxOpacity > alphas[i2]) {
            alphas[i2] = opts.maxOpacity; touched[i2] = now;
          }
        }
      }
    }

    var anyVisible = pulses.length > 0;
    var fadeStep = dt / Math.max(opts.fadeDuration, 16);
    var half = opts.cellSize / 2;

    for (var i = 0; i < alphas.length; i++) {
      var a = alphas[i];
      if (a <= 0) continue;
      if (now - touched[i] > opts.holdTime) {
        a = Math.max(0, a - fadeStep);
        alphas[i] = a;
        if (a <= 0) continue;
      }
      anyVisible = true;
      var c3 = cellCenter(i), cx = c3[0], cy = c3[1];
      var gradient = ctx.createRadialGradient(cx, cy, half * 0.1, cx, cy, opts.cellSize);
      gradient.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + a + ')');
      gradient.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',0)');
      var x2 = cx - half + 0.5, y2 = cy - half + 0.5, s = opts.cellSize - 1;
      ctx.beginPath();
      if (opts.cellRadius > 0 && ctx.roundRect) { ctx.roundRect(x2, y2, s, s, opts.cellRadius); }
      else { ctx.rect(x2, y2, s, s); }
      if (opts.fillOpacity > 0) {
        ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (a * opts.fillOpacity) + ')';
        ctx.fill();
      }
      ctx.strokeStyle = gradient;
      ctx.lineWidth = opts.lineWidth;
      ctx.stroke();
    }

    if (anyVisible) { raf = requestAnimationFrame(draw); }
    else { running = false; if (opts.gridOpacity <= 0) ctx.clearRect(0, 0, w, h); }
  }

  function wake() {
    if (running) return;
    running = true;
    lastFrame = performance.now();
    raf = requestAnimationFrame(draw);
  }

  function toLocal(e) {
    var rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  container.addEventListener('pointermove', function (e) {
    var p = toLocal(e);
    energize(p[0], p[1]);
    wake();
  });
  container.addEventListener('pointerdown', function (e) {
    if (!opts.clickPulse) return;
    var p = toLocal(e);
    pulses.push({ x: p[0], y: p[1], t0: performance.now() });
    wake();
  });

  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () { rebuild(); wake(); });
    ro.observe(container);
  } else {
    window.addEventListener('resize', function () { rebuild(); wake(); });
  }
  rebuild();
  wake();
})();
