const express = require('express');
const { readState, writeState } = require('../db');
const { makeCRUD, uid } = require('./crud');

const router = express.Router();

// ── Impressoras ───────────────────────────────────────────────────────────────

const printers = makeCRUD('printers', 'prn_');

printers.post('/:id/duplicate', (req, res) => {
  const state = readState();
  const orig = (state.printers || []).find(p => p.id === req.params.id);
  if (!orig) return res.status(404).json({ error: 'Not found' });
  const copy = { ...orig, id: uid('prn_'), name: orig.name + ' (cópia)' };
  state.printers.push(copy);
  writeState(state);
  res.status(201).json(copy);
});

router.use('/printers', printers);

// ── Materiais ─────────────────────────────────────────────────────────────────

const materials = makeCRUD('materials', 'mat_');

materials.post('/:id/duplicate', (req, res) => {
  const state = readState();
  const orig = (state.materials || []).find(m => m.id === req.params.id);
  if (!orig) return res.status(404).json({ error: 'Not found' });
  const copy = { ...orig, id: uid('mat_'), name: orig.name + ' (cópia)' };
  state.materials.push(copy);
  writeState(state);
  res.status(201).json(copy);
});

// POST /api/materials/:id/consume  { grams: number }
materials.post('/:id/consume', (req, res) => {
  const grams = Number(req.body?.grams);
  if (!grams || isNaN(grams) || grams <= 0)
    return res.status(400).json({ error: '"grams" deve ser um número positivo' });
  const state = readState();
  const mat = (state.materials || []).find(m => m.id === req.params.id);
  if (!mat) return res.status(404).json({ error: 'Not found' });
  const total   = (mat.spoolWeight || 1000) * (mat.spools || 1);
  const current = mat.remainingG != null ? mat.remainingG : total;
  mat.remainingG = Math.max(0, current - grams);
  writeState(state);
  res.json(mat);
});

// POST /api/materials/:id/refill — adiciona um rolo
materials.post('/:id/refill', (req, res) => {
  const state = readState();
  const mat = (state.materials || []).find(m => m.id === req.params.id);
  if (!mat) return res.status(404).json({ error: 'Not found' });
  const spoolWeight = mat.spoolWeight || 1000;
  mat.spools     = (mat.spools || 1) + 1;
  mat.remainingG = (mat.remainingG != null ? mat.remainingG : spoolWeight) + spoolWeight;
  writeState(state);
  res.json(mat);
});

router.use('/materials', materials);

// ── Orçamentos (Histórico) ────────────────────────────────────────────────────

router.use('/quotes', makeCRUD('history', 'q_'));

// ── Agenda (Jobs) ─────────────────────────────────────────────────────────────

const jobs = makeCRUD('schedule', 'job_');

// POST /api/jobs/:id/complete — conclui e dá baixa no filamento
jobs.post('/:id/complete', (req, res) => {
  const state = readState();
  const job = (state.schedule || []).find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  job.status = 'done';
  job.doneAt = Date.now();
  if (job.deductStock && job.weightG && job.materialId) {
    const mat = (state.materials || []).find(m => m.id === job.materialId);
    if (mat) {
      const total   = (mat.spoolWeight || 1000) * (mat.spools || 1);
      const current = mat.remainingG != null ? mat.remainingG : total;
      mat.remainingG = Math.max(0, current - Number(job.weightG) * (job.qty || 1));
    }
  }
  writeState(state);
  res.json(job);
});

// POST /api/jobs/:id/status — muda status livremente
jobs.post('/:id/status', (req, res) => {
  const { status } = req.body;
  const valid = ['queued', 'printing', 'done', 'failed'];
  if (!valid.includes(status))
    return res.status(400).json({ error: `status deve ser: ${valid.join(', ')}` });
  const state = readState();
  const job = (state.schedule || []).find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  job.status = status;
  writeState(state);
  res.json(job);
});

router.use('/jobs', jobs);

// ── Catálogo de produtos ──────────────────────────────────────────────────────

router.use('/catalog', makeCRUD('catalog', 'prod_'));

// ── Clientes ──────────────────────────────────────────────────────────────────

const clients = makeCRUD('clients', 'cli_');

// DELETE cliente também limpa clientId nos orçamentos
clients.delete('/:id', (req, res) => {
  const state = readState();
  const before = (state.clients || []).length;
  state.clients = (state.clients || []).filter(c => c.id !== req.params.id);
  if (state.clients.length === before) return res.status(404).json({ error: 'Not found' });
  state.history = (state.history || []).map(q =>
    q.clientId === req.params.id ? { ...q, clientId: null } : q
  );
  writeState(state);
  res.json({ ok: true });
});

// GET /api/clients/:id/quotes — orçamentos do cliente
clients.get('/:id/quotes', (req, res) => {
  const state = readState();
  if (!(state.clients || []).find(c => c.id === req.params.id))
    return res.status(404).json({ error: 'Not found' });
  res.json((state.history || []).filter(q => q.clientId === req.params.id));
});

router.use('/clients', clients);

// ── Configurações ─────────────────────────────────────────────────────────────

router.get('/settings', (_req, res) => res.json(readState().settings || {}));

router.patch('/settings', (req, res) => {
  const state = readState();
  state.settings = { ...(state.settings || {}), ...req.body };
  writeState(state);
  res.json(state.settings);
});

router.put('/settings', (req, res) => {
  const state = readState();
  state.settings = req.body;
  writeState(state);
  res.json(state.settings);
});

module.exports = router;
