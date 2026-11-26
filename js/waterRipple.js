(function () {
  'use strict';
  var canvas = document.getElementById('waterRipple');
  if (!canvas) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ctx = canvas.getContext('2d');
  var textureCanvas = document.createElement('canvas');
  var textureCtx = textureCanvas.getContext('2d');
  var motionToggle = document.getElementById('motionToggle');
  var width = 0;
  var height = 0;
  var texture = null;
  var current = null;
  var previous = null;
  var next = null;
  var output = null;
  var frame = 0;
  var running = false;
  var lastFrame = 0;
  var lastInput = 0;
  var prevClientX = null;
  var prevClientY = null;
  var damping = 0.965;

  function accentRgb() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
    var match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
    if (!match) return { r: 10, g: 125, b: 114 };
    var hex = match[1];
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }

  function proceduralTexture() {
    var image = ctx.createImageData(width, height);
    var accent = accentRgb();
    for (var y = 0; y < height; y++) {
      var band = y % 10 < 5 ? 14 : 0;
      for (var x = 0; x < width; x++) {
        var i = (y * width + x) * 4;
        var glint = (x + y) % 24 === 0 ? 8 : 0;
        image.data[i] = Math.min(255, accent.r - 46 + band + glint);
        image.data[i + 1] = Math.min(255, accent.g - 28 + band + glint);
        image.data[i + 2] = Math.min(255, accent.b - 20 + band + glint);
        image.data[i + 3] = 255;
      }
    }
    return image;
  }

  function loadTexture() {
    var cw = width;
    var ch = height;
    texture = proceduralTexture();
    var img = new Image();
    img.onload = function () {
      if (cw !== width || ch !== height) return;
      var ratio = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      var sw = cw / ratio;
      var sh = ch / ratio;
      textureCtx.clearRect(0, 0, cw, ch);
      textureCtx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, cw, ch);
      try {
        texture = textureCtx.getImageData(0, 0, cw, ch);
      } catch (error) {
        texture = proceduralTexture();
      }
    };
    img.src = 'images/papierkanten-2020-9535-1920.jpg';
  }

  function resize() {
    var vw = Math.max(1, window.innerWidth);
    var vh = Math.max(1, window.innerHeight);
    var scale = Math.min(1 / 3, 460 / vw, 320 / vh);
    width = Math.max(96, Math.round(vw * scale));
    height = Math.max(96, Math.round(vh * scale));
    canvas.width = width;
    canvas.height = height;
    textureCanvas.width = width;
    textureCanvas.height = height;
    current = new Float32Array(width * height);
    previous = new Float32Array(width * height);
    next = new Float32Array(width * height);
    output = ctx.createImageData(width, height);
    loadTexture();
  }

  function disturb(x, y, strength, radius) {
    x = Math.max(radius, Math.min(width - radius - 1, Math.round(x)));
    y = Math.max(radius, Math.min(height - radius - 1, Math.round(y)));
    for (var dy = -radius; dy <= radius; dy++) {
      for (var dx = -radius; dx <= radius; dx++) {
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > radius) continue;
        var index = (y + dy) * width + x + dx;
        current[index] += strength * (1 - distance / radius);
      }
    }
  }

  function disturbClient(clientX, clientY, strength, radius) {
    disturb(clientX * width / window.innerWidth, clientY * height / window.innerHeight, strength, radius);
  }

  function step() {
    var i = 0;
    var x = 0;
    var y = 0;
    for (y = 1; y < height - 1; y++) {
      for (x = 1; x < width - 1; x++) {
        i = y * width + x;
        next[i] = ((current[i - 1] + current[i + 1] + current[i - width] + current[i + width]) * 0.5 - previous[i]) * damping;
      }
    }
    var swap = previous;
    previous = current;
    current = next;
    next = swap;
    var source = texture.data;
    var target = output.data;
    for (y = 1; y < height - 1; y++) {
      for (x = 1; x < width - 1; x++) {
        i = y * width + x;
        var dx = (current[i - 1] - current[i + 1]) >> 2;
        var dy = (current[i - width] - current[i + width]) >> 2;
        var sx = Math.max(0, Math.min(width - 1, x + dx));
        var sy = Math.max(0, Math.min(height - 1, y + dy));
        var from = (sy * width + sx) * 4;
        var to = i * 4;
        target[to] = source[from];
        target[to + 1] = source[from + 1];
        target[to + 2] = source[from + 2];
        target[to + 3] = 255;
      }
    }
    ctx.putImageData(output, 0, 0);
  }

  function loop(now) {
    if (!running) return;
    frame = window.requestAnimationFrame(loop);
    if (now - lastFrame < 32) return;
    lastFrame = now;
    step();
  }

  function setRunning(value) {
    if (value === running) return;
    running = value;
    if (running) {
      lastFrame = 0;
      frame = window.requestAnimationFrame(loop);
    } else if (frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  function syncRunning() {
    setRunning(!motionToggle.checked && !document.hidden);
  }

  document.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'touch') return;
    var now = performance.now();
    if (now - lastInput < 28) return;
    if (prevClientX !== null && Math.abs(event.clientX - prevClientX) + Math.abs(event.clientY - prevClientY) < 5) return;
    lastInput = now;
    prevClientX = event.clientX;
    prevClientY = event.clientY;
    disturbClient(event.clientX, event.clientY, 96, 5);
  }, { passive: true });

  document.addEventListener('pointerdown', function (event) {
    disturbClient(event.clientX, event.clientY, event.pointerType === 'touch' ? 260 : 220, 8);
  }, { passive: true });

  motionToggle.addEventListener('change', syncRunning);
  document.addEventListener('visibilitychange', syncRunning);
  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 180);
  });

  resize();
  syncRunning();
  window.JMWater = {
    disturb: function (x, y) {
      disturbClient(x, y, 220, 8);
    }
  };
})();
