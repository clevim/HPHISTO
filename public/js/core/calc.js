/* Motor de cálculo de custos — fórmulas da planilha "Custos 3D 4.0":
     peso       = área_secção(mm²) × comprimento(m) × densidade
     material   = (preço_kg / 1000) × peso_g
     energia    = (potência_W / 1000) × horas × tarifa_kWh
     manutenção = material × manut%
     falhas     = material × falha%
     acabamento = material × acab%
     depreciação= (valor_máquina / vida_anos / 365 / 24) × horas
     retorno    = (valor_máquina / (payback_meses × dias_mês × horas_dia)) × horas
   Parser de G-code: veja core/gcode.js
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

  return { compute, weightFromLength, lengthFromWeight };
})();
