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
    // zMap: z.toFixed(2) → { z, paths: [[[x,y],...], ...] }
    // Cada sub-path é uma sequência contínua de extrusão; travels resetam curPath.
    const zMap = new Map();
    let curPath = null, curPathZ = -1;
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, minz = 1e9, maxz = -1e9;
    let stored = 0;
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
        // Mudança de camada — encerra sub-path atual
        if (zm && nz !== z && nz > z) { curPath = null; }
        if (extr && (xm || ym) && stored < CAP) {
          const k = nz.toFixed(2);
          if (!zMap.has(k)) zMap.set(k, { z: nz, paths: [] });
          const layer = zMap.get(k);
          // Travel anterior ou nova camada → inicia novo sub-path a partir da posição atual
          if (!curPath || curPathZ !== nz) {
            curPath = [[x, y]];
            layer.paths.push(curPath);
            curPathZ = nz;
          }
          curPath.push([nx, ny]);
          stored++;
          if (nx < minx) minx = nx; if (nx > maxx) maxx = nx;
          if (ny < miny) miny = ny; if (ny > maxy) maxy = ny;
          if (nz < minz) minz = nz; if (nz > maxz) maxz = nz;
        } else if (!extr && (xm || ym)) {
          curPath = null; // travel — encerra sub-path
        }
        x = nx; y = ny; z = nz;
      }
    }
    // Coleta camadas com pelo menos um sub-path com ≥2 pontos, ordena por Z
    const allLayers = [...zMap.values()]
      .map(l => ({ z: l.z, paths: l.paths.filter(p => p.length > 1) }))
      .filter(l => l.paths.length > 0)
      .sort((a, b) => a.z - b.z);
    const nLayers = Math.max(allLayers.length, 1);
    if (allLayers.length === 0) return { nLayers, layers: [], bounds: { minx, maxx, miny, maxy, minz, maxz } };
    // Distribui até 22 alturas distintas do fundo ao topo
    const want = Math.min(22, allLayers.length);
    const chosen = [];
    for (let i = 0; i < want; i++)
      chosen.push(allLayers[Math.round(i * (allLayers.length - 1) / (want - 1 || 1))]);
    // Simplifica: limita total de pontos por camada a MAXP (subamostra cada sub-path)
    const MAXP = 200;
    const simp = chosen.map(l => {
      const totalPts = l.paths.reduce((s, p) => s + p.length, 0);
      if (totalPts <= MAXP) return { z: l.z, paths: l.paths };
      const ratio = MAXP / totalPts;
      const paths = l.paths.map(p => {
        if (p.length <= 2) return p;
        const step = Math.max(1, Math.round(1 / ratio));
        const out = [p[0]];
        for (let j = step; j < p.length - 1; j += step) out.push(p[j]);
        out.push(p[p.length - 1]);
        return out;
      }).filter(p => p.length > 1);
      return { z: l.z, paths };
    });
    return { nLayers, layers: simp, bounds: { minx, maxx, miny, maxy, minz, maxz } };
  }

  return { parseGcode, parseGcodeGeo };
})();
