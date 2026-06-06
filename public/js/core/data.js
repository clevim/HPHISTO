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

  return { MATERIALS, PRINTERS, SETTINGS, CONSUMABLE_PRESETS, ACCENT_SWATCHES, uid };
})();
