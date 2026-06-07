/* Motor de cálculo de custos + leitor de G-code
   Porta as fórmulas da planilha "Custos 3D 4.0":
     peso       = área_secção(mm²) × comprimento(m) × densidade
     material   = (preço_kg / 1000) × peso_g
     energia    = (potência_W / 1000) × horas × tarifa_kWh
     manutenção = material × manut%
     falhas     = material × falha%
     acabamento = material × acab%
     depreciação= (valor_máquina / vida_anos / 365 / 24) × horas
     retorno    = (valor_máquina / (payback_meses × dias_mês × horas_dia)) × horas
*/
window.CALC = (function () {

  // peso (g) a partir do comprimento (m)
  function weightFromLength(lengthM, material) {
    const r = (material.diameter || 1.75) / 2;           // mm
    const areaMm2 = Math.PI * r * r;                     // mm²
    // área(mm²) × comp(m) → cm³ ; depois × densidade(g/cm³)
    const volumeCm3 = areaMm2 * (lengthM || 0);
    return volumeCm3 * (material.density || 1.24);
  }
  // comprimento (m) a partir do peso (g)
  function lengthFromWeight(weightG, material) {
    const r = (material.diameter || 1.75) / 2;
    const areaMm2 = Math.PI * r * r;
    const volumeCm3 = (weightG || 0) / (material.density || 1.24);
    return volumeCm3 / areaMm2;
  }

  function compute(input, printer, material, settings) {
    const p = printer || {};
    const m = material || {};
    const s = settings || {};
    const qty = Math.max(1, input.quantity || 1);

    const hours = (input.timeHours || 0) + (input.timeMinutes || 0) / 60;

    // peso por peça
    let weight = 0;
    if (input.inputMode === 'length') weight = weightFromLength(input.lengthM, m);
    else weight = input.weightG || 0; // 'weight' ou 'gcode'

    // ---- custos por peça ----
    const material_cost = (m.pricePerKg || 0) / 1000 * weight;
    const energy = (p.power || 0) / 1000 * hours * (s.energyTariff || 0);
    const maintenance = material_cost * (p.maintenancePct || 0) / 100;
    const failure = material_cost * (p.failurePct || 0) / 100;
    const finishing = material_cost * (s.finishingPct || 0) / 100;

    const depreciation = (p.value && p.lifespanYears)
      ? (p.value / p.lifespanYears / 365 / 24) * hours : 0;

    const investment = (p.value && p.paybackMonths && p.daysPerMonth && p.hoursPerDay)
      ? (p.value / (p.paybackMonths * p.daysPerMonth * p.hoursPerDay)) * hours : 0;

    // mão de obra + modelagem (extras)
    const labor = (input.laborHours || 0) * (s.laborRate || 0);
    const modeling = input.modelingFee || 0;

    // overhead rateado por hora de produção
    const overhead = (s.monthlyOverhead && s.overheadHoursMonth)
      ? (s.monthlyOverhead / s.overheadHoursMonth) * hours : 0;

    // consumíveis (por peça)
    const consumables = (input.consumables || []).reduce((a, c) => a + (Number(c.cost) || 0), 0);

    const packaging = input.packaging || 0;

    const lines = [
      { key: 'material_cost', value: material_cost, color: '#E8743B' },
      { key: 'energy', value: energy, color: '#3B82C4' },
      { key: 'depreciation', value: depreciation, color: '#8B5CC4' },
      { key: 'investment', value: investment, color: '#C4523B' },
      { key: 'maintenance', value: maintenance, color: '#4CAF7D' },
      { key: 'failure', value: failure, color: '#C4A23B' },
      { key: 'finishing', value: finishing, color: '#3BA9C4' },
      { key: 'labor', value: labor, color: '#C43B7D' },
      { key: 'modeling', value: modeling, color: '#6B5BC4' },
      { key: 'overhead', value: overhead, color: '#5B8B6B' },
      { key: 'consumables', value: consumables, color: '#9B6B3B' },
      { key: 'packaging', value: packaging, color: '#6B8BC4' },
    ].filter(l => l.value > 0.0000001);

    const unitCost = lines.reduce((a, l) => a + l.value, 0);
    const totalCost = unitCost * qty;

    // preço de venda
    const margin = input.margin != null ? input.margin : (s.defaultMargin || 0);
    let unitPrice = unitCost * (1 + margin / 100);

    // taxa de cartão/marketplace: embute para receber líquido
    const fee = input.cardFeePct != null ? input.cardFeePct : (s.cardFeePct || 0);
    if (fee > 0 && fee < 100) unitPrice = unitPrice / (1 - fee / 100);

    const shippingTotal = input.shipping || 0;
    const totalPrice = unitPrice * qty + shippingTotal;
    const unitProfit = unitPrice - unitCost - (unitPrice * fee / 100);
    const totalProfit = unitProfit * qty;

    return {
      weight, hours, qty, lines,
      unitCost, totalCost, unitPrice, totalPrice,
      unitProfit, totalProfit, margin, fee, shippingTotal,
      length: input.inputMode === 'length' ? input.lengthM : lengthFromWeight(weight, m),
    };
  }

  // ---- Leitor de G-code (Cura, Prusa/Super/Orca, Bambu) ----
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
      m = head.match(/;\s*Filament used:\s*([\d.]+)\s*m\b/i); // Cura: "Filament used: 1.23m"
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

  // ---- Geometria real: caminhos de extrusão por camada ----
  function parseGcodeGeo(text) {
    const lines = text.split('\n');
    const N = lines.length;
    let x = 0, y = 0, z = 0, lastE = 0, absXY = true, absE = true;
    const layers = []; let cur = null;
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, minz = 1e9, maxz = -1e9;
    let stored = 0; const CAP = 320000;
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
        if (zm && nz !== z && nz > z) { cur = null; } // nova camada na próxima extrusão
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
    // conta camadas distintas (mesmo que esparsas) — usado pela forma generativa
    const zset = {};
    layers.forEach(l => { zset[l.z.toFixed(2)] = 1; });
    const nLayers = Math.max(Object.keys(zset).length, full.length, 1);
    if (full.length === 0) return { nLayers, layers: [], bounds: { minx, maxx, miny, maxy, minz, maxz } };
    // Agrupa por nível Z (toFixed(2)) e escolhe o caminho mais longo por nível.
    // Garante até 22 alturas distintas distribuídas do fundo ao topo — evita
    // que muitos segmentos no mesmo Z (perímetros + recheio) monopolizem os slots.
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
    // simplifica cada camada (<=200 pts)
    const MAXP = 200;
    const simp = chosen.map(l => {
      if (l.pts.length <= MAXP) return { z: l.z, pts: l.pts };
      const st = Math.ceil(l.pts.length / MAXP), out = [];
      for (let i = 0; i < l.pts.length; i += st) out.push(l.pts[i]);
      return { z: l.z, pts: out };
    });
    return { nLayers, layers: simp, bounds: { minx, maxx, miny, maxy, minz, maxz } };
  }

  return { compute, weightFromLength, lengthFromWeight, parseGcode, parseGcodeGeo };
})();
