const express = require('express');
const crypto = require('crypto');
const { db, readState, writeState } = require('../db');
const { auth, orderLimiter } = require('../auth');

const VALID_ORDER_STATUSES = new Set(['novo', 'em_andamento', 'aguardando', 'concluido', 'cancelado']);

const router = express.Router();

// POST é público — cliente envia pedido pelo balcão sem autenticação
router.post('/', orderLimiter, (req, res) => {
  const { name, contact, deadline, focus, color, model } = req.body || {};
  if (!name || !contact) return res.status(400).json({ error: 'nome e contato são obrigatórios' });

  const id = `ord_${crypto.randomBytes(4).toString('hex')}`;
  const os = 'OS-' + (1000 + Math.floor(Math.random() * 9000));

  // tenta casar com cliente existente pelo contato
  const normContact = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, '');
  const state = readState();
  const existing = (state.clients || []).find(c => c.contact && normContact(c.contact) === normContact(contact));
  let clientId = existing ? existing.id : null;

  // se não existe, cria um novo cliente automaticamente
  if (!clientId) {
    clientId = `cli_${crypto.randomBytes(4).toString('hex')}`;
    state.clients = [{ id: clientId, name, contact: contact.trim(), notes: '', createdAt: Date.now(), fromOrder: true }, ...(state.clients || [])];
    writeState(state);
  }

  db.prepare(`INSERT INTO orders (id, os, customer_name, contact, deadline, focus, color, model, client_id, status, seen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'novo', 0)`)
    .run(id, os, name.trim(), contact.trim(), deadline || '', focus || '', color || '',
      JSON.stringify(model || {}), clientId);

  res.status(201).json({ id, os, clientId });
});

// Todas as rotas abaixo requerem autenticação
router.use(auth);

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({
    id: r.id, os: r.os, name: r.customer_name, contact: r.contact,
    deadline: r.deadline, focus: r.focus, color: r.color,
    model: JSON.parse(r.model || '{}'),
    clientId: r.client_id, quoteId: r.quote_id,
    status: r.status, seen: !!r.seen,
    createdAt: r.created_at * 1000,
  })));
});

router.patch('/:id', (req, res) => {
  const { status, seen, quoteId, clientId } = req.body || {};
  if (status !== undefined && !VALID_ORDER_STATUSES.has(status))
    return res.status(400).json({ error: `status inválido. Valores aceitos: ${[...VALID_ORDER_STATUSES].join(', ')}` });
  const sets = []; const params = [];
  if (status   !== undefined) { sets.push('status = ?');    params.push(status); }
  if (seen     !== undefined) { sets.push('seen = ?');      params.push(seen ? 1 : 0); }
  if (quoteId  !== undefined) { sets.push('quote_id = ?');  params.push(quoteId); }
  if (clientId !== undefined) { sets.push('client_id = ?'); params.push(clientId); }
  if (sets.length === 0) return res.status(400).json({ error: 'nenhum campo para atualizar' });
  params.push(req.params.id);
  const r = db.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;
