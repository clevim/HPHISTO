/* Utilitários — som de bigorna (Web Audio) + QR */
window.FX = (function () {
  let ctx = null;
  function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return ctx; }

  // "cling" metálico de bigorna: dois toques rápidos com decaimento
  function cling(enabled) {
    if (!enabled) return;
    const a = ac(); if (!a) return;
    if (a.state === 'suspended') a.resume();
    const now = a.currentTime;
    const hits = [
      { f: 1850, t: 0, g: 0.16, d: 0.5 },
      { f: 2600, t: 0.008, g: 0.10, d: 0.42 },
      { f: 3500, t: 0.012, g: 0.06, d: 0.3 },
    ];
    hits.forEach(h => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'triangle'; o.frequency.value = h.f;
      o.connect(g); g.connect(a.destination);
      g.gain.setValueAtTime(0, now + h.t);
      g.gain.linearRampToValueAtTime(h.g, now + h.t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + h.t + h.d);
      o.start(now + h.t); o.stop(now + h.t + h.d + 0.02);
    });
  }

  // tap leve (clique de tecla) — opcional
  function tap(enabled) {
    if (!enabled) return;
    const a = ac(); if (!a) return;
    if (a.state === 'suspended') a.resume();
    const now = a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'square'; o.frequency.value = 880;
    o.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    o.start(now); o.stop(now + 0.07);
  }

  // SVG de QR usando a lib qrcode-generator (window.qrcode)
  function qrSvg(text, color, bg) {
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(text); qr.make();
      const n = qr.getModuleCount();
      let cells = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) cells += `<rect x="${c}" y="${r}" width="1.04" height="1.04"/>`;
      }
      return `<svg viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
        <rect width="${n}" height="${n}" fill="${bg || '#fff'}"/>
        <g fill="${color || '#000'}">${cells}</g></svg>`;
    } catch (e) { return ''; }
  }

  return { cling, tap, qrSvg };
})();
