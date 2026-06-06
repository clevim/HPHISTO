/* Gerador de NFC/RFID para filamentos — formato Anycubic ACE v2.
   Portado da spec de engenharia reversa (DnG-Crafts/ACE-RFID). */
window.NFC = (function () {

  const MAT_SKU = { PLA: 'PL', PETG: 'PT', ABS: 'AB', TPU: 'TP', ASA: 'AS', PA: 'PA', PC: 'PC', 'PLA+': 'PP', FLEX: 'TP', HIPS: 'AB', TRITAN: 'PT' };
  const COLOR_SKU = [
    { code: 'RD', rgb: [220, 50, 50] }, { code: 'GR', rgb: [70, 170, 80] },
    { code: 'BL', rgb: [60, 110, 200] }, { code: 'WH', rgb: [240, 240, 240] },
    { code: 'BK', rgb: [30, 30, 30] }, { code: 'YL', rgb: [230, 200, 50] },
    { code: 'OR', rgb: [230, 130, 50] }, { code: 'PK', rgb: [225, 100, 160] },
    { code: 'PU', rgb: [150, 100, 210] }, { code: 'LB', rgb: [120, 190, 220] },
  ];

  // defaults de temperatura por material (°C)
  const TEMP_DEFAULTS = {
    PLA: { ext: [190, 220], bed: [50, 60] }, 'PLA+': { ext: [205, 230], bed: [55, 65] },
    PETG: { ext: [230, 250], bed: [70, 85] }, ABS: { ext: [230, 260], bed: [90, 110] },
    ASA: { ext: [240, 260], bed: [90, 110] }, TPU: { ext: [210, 235], bed: [40, 60] },
    FLEX: { ext: [210, 235], bed: [40, 60] }, TRITAN: { ext: [240, 260], bed: [70, 85] },
    HIPS: { ext: [230, 245], bed: [90, 110] }, PC: { ext: [260, 290], bed: [100, 120] },
    PA: { ext: [250, 280], bed: [80, 100] },
  };

  function hexToRgb(hex) {
    if (!hex) return [240, 240, 240];
    let h = String(hex).replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length < 6) return [240, 240, 240];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function nearestColorCode(rgb) {
    let best = COLOR_SKU[0], bd = Infinity;
    for (const c of COLOR_SKU) {
      const d = (c.rgb[0] - rgb[0]) ** 2 + (c.rgb[1] - rgb[1]) ** 2 + (c.rgb[2] - rgb[2]) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    return best.code;
  }
  function toLE16(v) { v = Math.max(0, Math.min(65535, Math.round(v))); return [v & 0xFF, (v >> 8) & 0xFF]; }
  function padASCII(str, len) {
    const out = [];
    for (let i = 0; i < len; i++) out.push(i < str.length ? str.charCodeAt(i) & 0xFF : 0x00);
    return out;
  }
  function normMat(type) {
    const t = String(type || 'PLA').toUpperCase();
    if (MAT_SKU[t]) return t;
    // mapeia variantes
    if (t.includes('PETG')) return 'PETG';
    if (t.includes('PLA')) return 'PLA';
    if (t.includes('ABS')) return 'ABS';
    if (t.includes('TPU') || t.includes('FLEX')) return 'TPU';
    if (t.includes('ASA')) return 'ASA';
    return 'PLA';
  }

  function generateSKU(type, colorCode, seq) {
    const matCode = MAT_SKU[normMat(type)] || 'PL';
    const num = seq != null ? String(seq).padStart(3, '0').slice(-3) : String(Math.floor(100 + Math.random() * 900));
    return `AH${matCode}${colorCode}-${num}`;
  }

  // material do app → dados do filamento ACE
  function fromMaterial(m, settings) {
    const matKey = normMat(m.type);
    const rgb = hexToRgb(m.color);
    const colorCode = nearestColorCode(rgb);
    const td = TEMP_DEFAULTS[matKey] || TEMP_DEFAULTS.PLA;
    const total = (m.spoolWeight || 1000) * (m.spools || 1);
    const weight = m.remainingG != null ? m.remainingG : total;
    // comprimento (m) ≈ peso / densidade / área
    const r = (m.diameter || 1.75) / 2;
    const area = Math.PI * r * r; // mm²
    const lenTotal = Math.round(((m.spoolWeight || 1000) / (m.density || 1.24)) / area);
    const lenRem = Math.round((weight / (m.density || 1.24)) / area);
    return {
      brand: (m.brand && m.brand.trim()) ? m.brand.trim().slice(0, 4).toUpperCase() : 'AC',
      material: matKey,
      color: { r: rgb[0], g: rgb[1], b: rgb[2] },
      colorCode,
      extruder: { min: m.extMin || td.ext[0], max: m.extMax || td.ext[1] },
      bed: { min: m.bedMin || td.bed[0], max: m.bedMax || td.bed[1] },
      diameter: Math.round((m.diameter || 1.75) * 100),
      totalLength: lenTotal,
      remainingLength: lenRem,
      weight: Math.round(m.spoolWeight || 1000),
      sku: m.sku || generateSKU(m.type, colorCode),
    };
  }

  function buildACETag(data) {
    const pages = {};
    pages[4] = [0x7B, 0x00, 0x65, 0x00];
    const skuBytes = padASCII(data.sku, 12);
    pages[5] = skuBytes.slice(0, 4);
    pages[6] = skuBytes.slice(4, 8);
    pages[7] = skuBytes.slice(8, 12);
    pages[8] = [0, 0, 0, 0];
    pages[10] = padASCII(data.brand.substring(0, 4), 4);
    pages[15] = padASCII(data.material.substring(0, 4), 4);
    pages[20] = [0xFF, data.color.r, data.color.g, data.color.b];
    pages[24] = [...toLE16(data.extruder.min), ...toLE16(data.extruder.max)];
    pages[29] = [...toLE16(data.bed.min), ...toLE16(data.bed.max)];
    pages[30] = [...toLE16(data.diameter), ...toLE16(data.totalLength)];
    pages[31] = [...toLE16(data.weight), ...toLE16(data.remainingLength)];
    return pages;
  }

  function serializeBytes(pages) {
    const buf = new Uint8Array(28 * 4);
    Object.keys(pages).forEach(k => {
      const page = +k, off = (page - 4) * 4;
      if (off >= 0 && off < buf.length) pages[k].forEach((b, i) => { buf[off + i] = b; });
    });
    return buf;
  }

  const hx = (b) => b.toString(16).toUpperCase().padStart(2, '0');

  function pageRows(pages) {
    return Object.keys(pages).map(Number).sort((a, b) => a - b).map(p => ({
      page: p, bytes: pages[p], hex: pages[p].map(hx).join(' '),
      ascii: pages[p].map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '·').join(''),
    }));
  }

  // dump completo (páginas 4-31, incluindo as ignoradas como zeros) p/ .bin / leitores
  function fullHexDump(pages) {
    const buf = serializeBytes(pages);
    const lines = [];
    for (let p = 4; p <= 31; p++) {
      const off = (p - 4) * 4;
      const row = [buf[off], buf[off + 1], buf[off + 2], buf[off + 3]];
      lines.push(`Page ${String(p).padStart(2, '0')}: ${row.map(hx).join(' ')}`);
    }
    return lines.join('\n');
  }

  function nfcSupported() {
    return typeof window !== 'undefined' && 'NDEFReader' in window;
  }

  // ---- camada de FORMATOS ----
  function colorHex(data) {
    return [data.color.r, data.color.g, data.color.b].map(x => x.toString(16).padStart(2, '0').toUpperCase()).join('');
  }
  // contexto de placeholders p/ templates custom
  function ctx(data, name) {
    return {
      name: name || data.material, sku: data.sku, brand: data.brand, material: data.material,
      colorHex: colorHex(data), colorR: data.color.r, colorG: data.color.g, colorB: data.color.b,
      extMin: data.extruder.min, extMax: data.extruder.max, bedMin: data.bed.min, bedMax: data.bed.max,
      diameter: (data.diameter / 100).toFixed(2), weightG: data.weight, lengthM: data.totalLength,
    };
  }
  function renderTpl(tpl, c) {
    return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in c ? c[k] : m));
  }

  const PLACEHOLDERS = ['name', 'sku', 'brand', 'material', 'colorHex', 'colorR', 'colorG', 'colorB', 'extMin', 'extMax', 'bedMin', 'bedMax', 'diameter', 'weightG', 'lengthM'];

  // formatos embutidos
  const BUILTINS = [
    { id: 'ace', name: 'Anycubic ACE (v2)', kind: 'binary', builtin: true },
    { id: 'openspool', name: 'OpenSpool (NDEF)', kind: 'json', builtin: true },
    { id: 'generic', name: 'JSON genérico (NDEF)', kind: 'json', builtin: true },
  ];

  function allFormats(custom) {
    return [...BUILTINS, ...((custom || []).map(c => ({ ...c, kind: 'json', builtin: false })))];
  }
  function findFormat(id, custom) {
    return allFormats(custom).find(f => f.id === id) || BUILTINS[0];
  }

  // gera a saída conforme o formato escolhido
  function buildOutput(fmt, data, name) {
    if (!fmt || fmt.kind === 'binary' || fmt.id === 'ace') {
      const pages = buildACETag(data);
      return { kind: 'binary', pages, rows: pageRows(pages), dump: fullHexDump(pages), bytes: serializeBytes(pages) };
    }
    const c = ctx(data, name);
    let obj;
    if (fmt.id === 'openspool') {
      obj = { version: '1.0', protocol: 'openspool', type: data.material, color_hex: colorHex(data),
        brand: data.brand === 'AC' ? 'Generic' : data.brand, min_temp: data.extruder.min, max_temp: data.extruder.max };
    } else if (fmt.template) {
      // custom: template é JSON com placeholders
      try { obj = JSON.parse(renderTpl(fmt.template, c)); }
      catch (e) { return { kind: 'json', error: 'JSON inválido no template', text: renderTpl(fmt.template, c) }; }
    } else {
      // generic
      obj = { name: c.name, sku: data.sku, brand: data.brand, material: data.material, color: '#' + colorHex(data),
        extruder: [data.extruder.min, data.extruder.max], bed: [data.bed.min, data.bed.max],
        diameter_mm: +(data.diameter / 100).toFixed(2), weight_g: data.weight, length_m: data.totalLength };
    }
    const text = JSON.stringify(obj, null, 2);
    return { kind: 'json', obj, text };
  }

  return { fromMaterial, buildACETag, serializeBytes, pageRows, fullHexDump, generateSKU, normMat, hexToRgb, nearestColorCode, nfcSupported, TEMP_DEFAULTS, MAT_SKU,
    allFormats, findFormat, buildOutput, colorHex, PLACEHOLDERS, BUILTINS };
})();
