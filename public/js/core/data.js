/* Dados padrão — materiais extraídos do Excel "Custos 3D 4.0 (2020)" + presets */
window.APP_DATA = (function () {
  const uid = (p) => p + Math.random().toString(36).slice(2, 9);

  const MATERIALS = [];

  const PRINTERS = [];

  const SETTINGS = {
    lang: 'pt', currency: 'BRL',
    energyTariff: 0.92,        // R$/kWh (média BR 2025; Excel usava 1.12)
    laborRate: 35,             // R$/h opcional
    monthlyOverhead: 0,        // custos fixos mensais (aluguel, internet…)
    overheadHoursMonth: 160,   // horas/mês p/ ratear overhead
    defaultMargin: 80,         // %
    cardFeePct: 0,             // taxa cartão/marketplace %
    finishingPct: 10,          // acabamento % s/ material
    theme: 'console',
    accent: '#E8A33B',         // cor principal do app (editável em Ajustes)
    soundOn: true,             // feedback sonoro (cling de bigorna)
    forgeBar: true,            // termômetro de forja no preço
    tierRetail: 80,            // % margem varejo
    tierWholesale: 45,         // % margem atacado
    tierReseller: 20,          // % margem revenda
    contactName: '',           // nome/estúdio p/ orçamento e QR
    contactWhats: '',          // whatsapp (só dígitos) p/ QR
    nfcFormat: 'ace',          // formato de NFC padrão
    nfcEnabled: true,          // habilita o módulo NFC
    nfcFormats: [],            // formatos custom criados pelo usuário
  };

  // paletas sugeridas de cor principal
  const ACCENT_SWATCHES = [
    { name: 'Âmbar', hex: '#E8A33B' },
    { name: 'Laranja', hex: '#E8743B' },
    { name: 'Verde', hex: '#5BD16B' },
    { name: 'Ciano', hex: '#3BC4C4' },
    { name: 'Azul', hex: '#5B9BE8' },
    { name: 'Violeta', hex: '#9B6BE8' },
    { name: 'Rosa', hex: '#E85B9B' },
    { name: 'Vermelho', hex: '#E5533B' },
  ];

  // aplica a cor principal + tema globalmente (fonte única de verdade)
  function applyAppTheme(s) {
    const root = document.documentElement;
    const accent = (s && s.accent) || '#E8A33B';
    const theme = (s && s.theme) || 'console';
    root.setAttribute('data-theme', theme);
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-press', `oklch(from ${accent} calc(l - 0.07) c h)`);
    root.style.setProperty('--accent-wash', theme === 'paper'
      ? `oklch(from ${accent} calc(l + 0.32) calc(c * 0.3) h)`
      : `oklch(from ${accent} 0.30 calc(c * 0.5) h)`);
    root.style.setProperty('--accent-ink', theme === 'paper' ? '#fff' : `oklch(from ${accent} 0.16 0.02 h)`);
    root.style.setProperty('--readout-accent', `oklch(from ${accent} calc(l + 0.04) c h)`);
  }
  window.applyAppTheme = applyAppTheme;

  // Consumíveis de acabamento/fixação (do Excel) — modelo de custo por uso
  const CONSUMABLE_PRESETS = [
    { label: 'Cola / fixação', cost: 0.50 },
    { label: 'Spray fixador', cost: 0.80 },
    { label: 'Lixa', cost: 0.30 },
    { label: 'Primer (spray)', cost: 1.20 },
    { label: 'Tinta spray', cost: 1.50 },
    { label: 'Verniz', cost: 1.00 },
  ];

  // ── Dados de demonstração ────────────────────────────────────────────────────
  const now = Date.now();
  const daysAgo = (d) => now - d * 86400000;

  const DEMO_DATA = {
    settings: {
      ...SETTINGS,
      contactName: 'Studio Forja 3D',
      contactWhats: '11987654321',
      defaultMargin: 80,
      soundOn: false,
    },
    printers: [
      { id: 'prn_d1', name: 'Creality Ender 3 Pro', power: 270, value: 1200, lifespanYears: 3,
        paybackMonths: 18, hoursPerDay: 8, daysPerMonth: 22, maintenancePct: 10, failurePct: 12 },
      { id: 'prn_d2', name: 'Bambu Lab X1C', power: 380, value: 7500, lifespanYears: 4,
        paybackMonths: 24, hoursPerDay: 10, daysPerMonth: 25, maintenancePct: 8, failurePct: 5 },
    ],
    materials: [
      { id: 'mat_d1', name: 'PLA Branco Básico', type: 'PLA', brand: 'Polymaker', colorName: 'Branco',
        colorHex: '#f5f5f0', pricePerKg: 89, density: 1.24, diameter: 1.75,
        spoolWeight: 1000, spools: 2, remainingG: 1650, lowStockG: 200,
        extMin: 190, extMax: 220, bedMin: 50, bedMax: 60 },
      { id: 'mat_d2', name: 'PETG Transparente', type: 'PETG', brand: 'Esun', colorName: 'Natural',
        colorHex: '#e8f4e8', pricePerKg: 119, density: 1.27, diameter: 1.75,
        spoolWeight: 1000, spools: 1, remainingG: 430, lowStockG: 300,
        extMin: 230, extMax: 250, bedMin: 70, bedMax: 90 },
      { id: 'mat_d3', name: 'TPU 95A Preto', type: 'TPU', brand: 'Polymaker', colorName: 'Preto',
        colorHex: '#1a1a1a', pricePerKg: 179, density: 1.22, diameter: 1.75,
        spoolWeight: 500, spools: 1, remainingG: 380, lowStockG: 100,
        extMin: 220, extMax: 240, bedMin: 40, bedMax: 60 },
      { id: 'mat_d4', name: 'PLA+ Cinza Âmbar', type: 'PLA+', brand: 'Bambu Lab', colorName: 'Cinza',
        colorHex: '#8a8a8a', pricePerKg: 149, density: 1.24, diameter: 1.75,
        spoolWeight: 1000, spools: 3, remainingG: 2800, lowStockG: 200,
        extMin: 210, extMax: 230, bedMin: 55, bedMax: 65 },
      { id: 'mat_d5', name: 'ABS Preto', type: 'ABS', brand: 'Esun', colorName: 'Preto',
        colorHex: '#111111', pricePerKg: 79, density: 1.04, diameter: 1.75,
        spoolWeight: 1000, spools: 1, remainingG: 820, lowStockG: 200,
        extMin: 230, extMax: 250, bedMin: 90, bedMax: 110 },
    ],
    clients: [
      { id: 'cli_d1', name: 'João Makerlabs', contact: '11 98888-1234', notes: 'Prefere PLA. Paga no Pix.', createdAt: daysAgo(90) },
      { id: 'cli_d2', name: 'Loja Geek Imports', contact: 'geek@imports.com.br', notes: 'Pedidos em atacado, prazo 5 dias.', createdAt: daysAgo(60) },
      { id: 'cli_d3', name: 'Studio Prop Art', contact: '@propstudio', notes: 'Cosplay e props. Aceita PETG e TPU.', createdAt: daysAgo(45) },
      { id: 'cli_d4', name: 'Rodrigo Gomes', contact: '47 99999-5678', notes: '', createdAt: daysAgo(15) },
    ],
    history: [
      { id: 'q_d1', name: 'Suporte de Fone', savedAt: daysAgo(2), currency: 'BRL',
        materialName: 'PLA Branco Básico', printerName: 'Creality Ender 3 Pro',
        clientId: 'cli_d1',
        result: { weight: 38, hours: 2.1, qty: 2, unitCost: 6.42, unitPrice: 11.56, totalPrice: 23.12, unitProfit: 5.14, totalProfit: 10.28, margin: 80, fee: 0, shipping: 0,
          breakdown: { material: 3.38, energy: 0.52, maintenance: 0.34, failure: 0.41, finishing: 0.34, depreciation: 0.68, investment: 0.75, labor: 0, modeling: 0, overhead: 0, packaging: 0 } } },
      { id: 'q_d2', name: 'Case Raspberry Pi 4', savedAt: daysAgo(5), currency: 'BRL',
        materialName: 'PETG Transparente', printerName: 'Bambu Lab X1C',
        clientId: 'cli_d2',
        result: { weight: 62, hours: 3.4, qty: 10, unitCost: 14.18, unitPrice: 25.52, totalPrice: 255.20, unitProfit: 11.34, totalProfit: 113.40, margin: 80, fee: 0, shipping: 0,
          breakdown: { material: 7.38, energy: 1.19, maintenance: 0.59, failure: 0.37, finishing: 0.74, depreciation: 1.28, investment: 2.63, labor: 0, modeling: 0, overhead: 0, packaging: 0 } } },
      { id: 'q_d3', name: 'Máscara Cosplay V2', savedAt: daysAgo(8), currency: 'BRL',
        materialName: 'PLA+ Cinza Âmbar', printerName: 'Bambu Lab X1C',
        clientId: 'cli_d3',
        result: { weight: 148, hours: 9.2, qty: 1, unitCost: 52.34, unitPrice: 94.21, totalPrice: 94.21, unitProfit: 41.87, totalProfit: 41.87, margin: 80, fee: 0, shipping: 18,
          breakdown: { material: 21.95, energy: 3.22, maintenance: 2.20, failure: 1.10, finishing: 2.20, depreciation: 3.45, investment: 7.11, labor: 11.11, modeling: 0, overhead: 0, packaging: 0 } } },
      { id: 'q_d4', name: 'Sola de Sandália TPU', savedAt: daysAgo(12), currency: 'BRL',
        materialName: 'TPU 95A Preto', printerName: 'Bambu Lab X1C',
        clientId: 'cli_d2',
        result: { weight: 220, hours: 7.5, qty: 6, unitCost: 72.10, unitPrice: 129.78, totalPrice: 778.68, unitProfit: 57.68, totalProfit: 346.08, margin: 80, fee: 5, shipping: 0,
          breakdown: { material: 39.38, energy: 2.63, maintenance: 3.15, failure: 1.97, finishing: 3.94, depreciation: 2.81, investment: 5.47, labor: 12.75, modeling: 0, overhead: 0, packaging: 0 } } },
      { id: 'q_d5', name: 'Miniatura DnD — Guerreiro', savedAt: daysAgo(18), currency: 'BRL',
        materialName: 'PLA Branco Básico', printerName: 'Creality Ender 3 Pro',
        clientId: 'cli_d4',
        result: { weight: 12, hours: 3.8, qty: 1, unitCost: 7.22, unitPrice: 12.99, totalPrice: 12.99, unitProfit: 5.77, totalProfit: 5.77, margin: 80, fee: 0, shipping: 0,
          breakdown: { material: 1.07, energy: 0.94, maintenance: 0.11, failure: 0.13, finishing: 0.11, depreciation: 1.23, investment: 1.36, labor: 2.27, modeling: 0, overhead: 0, packaging: 0 } } },
      { id: 'q_d6', name: 'Clip Organizador de Fios (×20)', savedAt: daysAgo(25), currency: 'BRL',
        materialName: 'PLA Branco Básico', printerName: 'Creality Ender 3 Pro',
        clientId: 'cli_d1',
        result: { weight: 4, hours: 0.4, qty: 20, unitCost: 0.82, unitPrice: 1.48, totalPrice: 29.60, unitProfit: 0.66, totalProfit: 13.20, margin: 80, fee: 0, shipping: 8,
          breakdown: { material: 0.36, energy: 0.10, maintenance: 0.04, failure: 0.04, finishing: 0.04, depreciation: 0.13, investment: 0.11, labor: 0, modeling: 0.10, overhead: 0, packaging: 0 } } },
    ],
    schedule: [
      { id: 'job_d1', name: 'Case RPi (lote)', quoteId: 'q_d2', printerId: 'prn_d2', materialId: 'mat_d2',
        status: 'printing', date: new Date().toISOString().slice(0, 10), qty: 5, weightG: 62, deductStock: false },
      { id: 'job_d2', name: 'Solados TPU', quoteId: 'q_d4', printerId: 'prn_d2', materialId: 'mat_d3',
        status: 'queued', date: new Date(now + 86400000).toISOString().slice(0, 10), qty: 6, weightG: 220, deductStock: false },
    ],
    catalog: [
      { id: 'prod_d1', name: 'Suporte de Fone Universal', createdAt: daysAgo(60),
        input: { printerId: 'prn_d1', materialId: 'mat_d1', weightG: 38, timeHours: 2, timeMinutes: 6, quantity: 1, margin: 80, inputMode: 'weight', laborHours: 0, packaging: 0, shipping: 0, modelingFee: 0 } },
      { id: 'prod_d2', name: 'Miniatura RPG 32mm', createdAt: daysAgo(45),
        input: { printerId: 'prn_d2', materialId: 'mat_d4', weightG: 12, timeHours: 3, timeMinutes: 50, quantity: 1, margin: 80, inputMode: 'weight', laborHours: 0.6, packaging: 0, shipping: 0, modelingFee: 5 } },
    ],
  };

  return { MATERIALS, PRINTERS, SETTINGS, CONSUMABLE_PRESETS, ACCENT_SWATCHES, uid, DEMO_DATA };
})();
