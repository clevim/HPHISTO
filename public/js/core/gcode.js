/* Parser de G-code (Cura, Prusa/Super/Orca, Bambu) */
window.GCODE = (function () {

  function parseGcode(text) {
    const out = { weightG: null, lengthM: null, timeHours: null, timeMinutes: null, raw: {} };
    const head = text.slice(0, 60000) + '\n' + text.slice(-60000);

    // filamento em gramas
    let m = head.match(/filament[ _]used\s*\[g\]\s*[=:]\s*([\d.]+)/i)
      || head.match(/;\s*filament[ _]weight\s*[=:]\s*([\d.]+)/i)
      || head.match(/total filament weight\s*\(g\)\s*[=:]\s*([\d.]+)/i);
    if (m) out.weightG = parseFloat(m[1]);

    // filamento em mm / m
    m = head.match(/filament[ _]used\s*\[mm\]\s*[=:]\s*([\d.]+)/i);
    if (m) out.lengthM = parseFloat(m[1]) / 1000;
    if (out.lengthM == null) {
      m = head.match(/;\s*Filament used:\s*([\d.]+)\s*m\b/i);
      if (m) out.lengthM = parseFloat(m[1]);
    }
    if (out.lengthM == null) {
      m = head.match(/filament[ _]used\s*\[m\]\s*[=:]\s*([\d.]+)/i);
      if (m) out.lengthM = parseFloat(m[1]);
    }

    // tempo — Cura ";TIME:3600" (segundos)
    m = head.match(/;\s*TIME\s*[:=]\s*(\d+)/i);
    if (m) { const s = parseInt(m[1], 10); out.timeHours = Math.floor(s / 3600); out.timeMinutes = Math.round((s % 3600) / 60); }
    // Prusa/Orca/Bambu — "estimated printing time ... = 1h 2m 3s" / "model printing time: 1h 2m"
    if (out.timeHours == null) {
      m = head.match(/(?:estimated printing time[^=:]*|total estimated time|model printing time)\s*[=:]\s*([^\n;]+)/i);
      if (m) {
        const str = m[1];
        const h = (str.match(/(\d+)\s*h/i) || [])[1];
        const mi = (str.match(/(\d+)\s*m(?!s)/i) || [])[1];
        const d = (str.match(/(\d+)\s*d/i) || [])[1];
        if (h || mi || d) { out.timeHours = (parseInt(d || 0) * 24) + parseInt(h || 0); out.timeMinutes = parseInt(mi || 0); }
      }
    }
    out.raw = { ...out };
    return out;
  }

  function parseGcodeGeo(text) {
    const lines = text.split('\n');
    const N = lines.length;
    let x = 0, y = 0, z = 0, lastE = 0, absXY = true, absE = true;
    const layers = []; let cur = null;
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, minz = 1e9, maxz = -1e9;
    let stored = 0;
    // limite de pontos armazenados para não travar em arquivos grandes
    const CAP = 320000;
    for (let i = 0; i < N; i++) {
      const ln = lines[i];
      if (!ln) continue;
      const c0 = ln[0];
      if (c0 !== 'G' && c0 !== 'M' && c0 !== 'g' && c0 !== 'm') continue;
      if (ln.startsWith('G90')) { absXY = true; continue; }
      if (ln.startsWith('G91')) { absXY = false; continue; }
      if (ln.startsWith('M82')) { absE = true; continue; }
      if (ln.startsWith('M83')) { absE = false; continue; }
      if (ln.startsWith('G92')) { const em = ln.match(/E(-?[\d.]+)/); if (em) lastE = parseFloat(em[1]); continue; }
      if (c0 === 'G' && (ln[1] === '0' || ln[1] === '1') && (ln[2] === ' ' || ln[2] === '\t' || ln[2] === undefined)) {
        const xm = ln.match(/X(-?[\d.]+)/), ym = ln.match(/Y(-?[\d.]+)/), zm = ln.match(/Z(-?[\d.]+)/), em = ln.match(/E(-?[\d.]+)/);
        const nx = xm ? (absXY ? parseFloat(xm[1]) : x + parseFloat(xm[1])) : x;
        const ny = ym ? (absXY ? parseFloat(ym[1]) : y + parseFloat(ym[1])) : y;
        const nz = zm ? (absXY ? parseFloat(zm[1]) : z + parseFloat(zm[1])) : z;
        let extr = false;
        if (em) { const ev = parseFloat(em[1]); const ed = absE ? ev - lastE : ev; if (ed > 0.0001) extr = true; if (absE) lastE = ev; }
        if (zm && nz !== z && nz > z) { cur = null; }
        if (extr && (xm || ym) && stored < CAP) {
          if (!cur || cur.z !== nz) { cur = { z: nz, pts: [] }; layers.push(cur); }
          cur.pts.push([nx, ny]);
          stored++;
          if (nx < minx) minx = nx; if (nx > maxx) maxx = nx;
          if (ny < miny) miny = ny; if (ny > maxy) maxy = ny;
          if (nz < minz) minz = nz; if (nz > maxz) maxz = nz;
        }
        x = nx; y = ny; z = nz;
      }
    }
    const full = layers.filter(l => l.pts.length > 1);
    const zset = {};
    layers.forEach(l => { zset[l.z.toFixed(2)] = 1; });
    const nLayers = Math.max(Object.keys(zset).length, full.length, 1);
    if (full.length === 0) return { nLayers, layers: [], bounds: { minx, maxx, miny, maxy, minz, maxz } };
    // Agrupa por nível Z e escolhe o caminho mais longo por nível.
    // Distribui até 22 alturas distintas do fundo ao topo para evitar que perímetros
    // do mesmo Z monopolizem os slots.
    const zMap = new Map();
    full.forEach(l => {
      const k = l.z.toFixed(2);
      if (!zMap.has(k) || l.pts.length > zMap.get(k).pts.length) zMap.set(k, l);
    });
    const zLevels = [...zMap.keys()].sort((a, b) => parseFloat(a) - parseFloat(b));
    const want = Math.min(22, zLevels.length);
    const chosen = [];
    for (let i = 0; i < want; i++)
      chosen.push(zMap.get(zLevels[Math.round(i * (zLevels.length - 1) / (want - 1 || 1))]));
    const MAXP = 200;
    const simp = chosen.map(l => {
      if (l.pts.length <= MAXP) return { z: l.z, pts: l.pts };
      const st = Math.ceil(l.pts.length / MAXP), out = [];
      for (let i = 0; i < l.pts.length; i += st) out.push(l.pts[i]);
      return { z: l.z, pts: out };
    });
    return { nLayers, layers: simp, bounds: { minx, maxx, miny, maxy, minz, maxz } };
  }

  return { parseGcode, parseGcodeGeo };
})();
