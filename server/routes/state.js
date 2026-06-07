const express = require('express');
const { readState, writeState } = require('../db');

const router = express.Router();

// ── Estado completo ────────────────────────────────────────────────────────────

router.get('/state', (_req, res) => res.json(readState()));

router.put('/state', (req, res) => {
  writeState(req.body);
  res.json({ ok: true });
});

// ── Cálculo (sem salvar) ──────────────────────────────────────────────────────

router.post('/calc', (req, res) => {
  const { input, printerId, materialId } = req.body || {};
  if (!input) return res.status(400).json({ error: '"input" é obrigatório' });

  const state    = readState();
  const printer  = (state.printers  || []).find(p => p.id === (printerId  || input.printerId));
  const material = (state.materials || []).find(m => m.id === (materialId || input.materialId));
  const settings = state.settings || {};

  if (!printer)  return res.status(400).json({ error: 'Impressora não encontrada' });
  if (!material) return res.status(400).json({ error: 'Material não encontrado' });

  const qty   = Math.max(1, Number(input.quantity) || 1);
  const hours = (Number(input.timeHours) || 0) + (Number(input.timeMinutes) || 0) / 60;
  const r     = (material.diameter || 1.75) / 2;
  const area  = Math.PI * r * r;

  let weight = 0;
  if (input.inputMode === 'length') {
    weight = area * (Number(input.lengthM) || 0) * (material.density || 1.24);
  } else {
    weight = Number(input.weightG) || 0;
  }

  const mat_cost     = (material.pricePerKg || 0) / 1000 * weight;
  const energy       = (printer.power || 0) / 1000 * hours * (settings.energyTariff || 0);
  const maintenance  = mat_cost * (printer.maintenancePct || 0) / 100;
  const failure      = mat_cost * (printer.failurePct    || 0) / 100;
  const finishing    = mat_cost * (settings.finishingPct  || 0) / 100;
  const depreciation = (printer.value && printer.lifespanYears)
    ? (printer.value / printer.lifespanYears / 365 / 24) * hours : 0;
  const investment   = (printer.value && printer.paybackMonths && printer.daysPerMonth && printer.hoursPerDay)
    ? (printer.value / (printer.paybackMonths * printer.daysPerMonth * printer.hoursPerDay)) * hours : 0;
  const labor     = (Number(input.laborHours) || 0) * (settings.laborRate || 0);
  const modeling  = Number(input.modelingFee) || 0;
  const overhead  = (settings.monthlyOverhead && settings.overheadHoursMonth)
    ? (settings.monthlyOverhead / settings.overheadHoursMonth) * hours : 0;
  const packaging = Number(input.packaging) || 0;
  const shipping  = Number(input.shipping) || 0;

  const unitCost   = mat_cost + energy + maintenance + failure + finishing
                   + depreciation + investment + labor + modeling + overhead + packaging;
  const totalCost  = unitCost * qty;
  const margin     = input.margin != null ? Number(input.margin) : (settings.defaultMargin || 0);
  const fee        = input.cardFeePct != null ? Number(input.cardFeePct) : (settings.cardFeePct || 0);
  let unitPrice    = unitCost * (1 + margin / 100);
  if (fee > 0 && fee < 100) unitPrice = unitPrice / (1 - fee / 100);
  const totalPrice  = unitPrice * qty + shipping;
  const unitProfit  = unitPrice - unitCost - (unitPrice * fee / 100);
  const totalProfit = unitProfit * qty;

  res.json({
    weight, hours, qty,
    unitCost, totalCost,
    unitPrice, totalPrice,
    unitProfit, totalProfit,
    margin, fee, shipping,
    breakdown: {
      material: mat_cost, energy, maintenance, failure, finishing,
      depreciation, investment, labor, modeling, overhead, packaging,
    },
  });
});

// ── Export / Import ───────────────────────────────────────────────────────────

router.get('/export', (_req, res) => {
  const state   = readState();
  const payload = JSON.stringify({ __app: 'HFSTO', __v: 1, exportedAt: Date.now(), data: state }, null, 2);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition',
    `attachment; filename="hfsto-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(payload);
});

router.post('/import', (req, res) => {
  const body = req.body;
  const d    = body?.data ?? body;
  if (!d || (!d.materials && !d.printers && !d.history))
    return res.status(400).json({ error: 'Formato de backup inválido' });

  const mode = req.query.mode; // ?mode=merge
  if (mode === 'merge') {
    const state = readState();
    const byId  = (existing, incoming) => {
      const seen = new Set((existing || []).map(x => x.id));
      return [...(existing || []), ...(incoming || []).filter(x => !seen.has(x.id))];
    };
    writeState({
      ...state,
      printers:  byId(state.printers,  d.printers),
      materials: byId(state.materials, d.materials),
      history:   byId(state.history,   d.history),
      schedule:  byId(state.schedule,  d.schedule),
      catalog:   byId(state.catalog,   d.catalog),
      clients:   byId(state.clients,   d.clients),
      settings:  { ...(state.settings || {}), ...(d.settings || {}) },
    });
    return res.json({ ok: true, mode: 'merge' });
  }

  writeState({
    printers:  d.printers  || [],
    materials: d.materials || [],
    history:   d.history   || [],
    schedule:  d.schedule  || [],
    catalog:   d.catalog   || [],
    clients:   d.clients   || [],
    settings:  d.settings  || {},
  });
  res.json({ ok: true, mode: 'replace' });
});

module.exports = router;
