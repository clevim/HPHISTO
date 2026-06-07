const express = require('express');
const crypto = require('crypto');
const { readState, writeState } = require('../db');

function uid(prefix) {
  return prefix + crypto.randomBytes(4).toString('hex');
}

// Factory de CRUD genérico para qualquer coleção do estado (kv store)
function makeCRUD(collection, idPrefix) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const state = readState();
    let items = state[collection] || [];
    if (req.query.status)     items = items.filter(x => x.status     === req.query.status);
    if (req.query.printerId)  items = items.filter(x => x.printerId  === req.query.printerId);
    if (req.query.materialId) items = items.filter(x => x.materialId === req.query.materialId);
    if (req.query.clientId)   items = items.filter(x => x.clientId   === req.query.clientId);
    res.json(items);
  });

  router.get('/:id', (req, res) => {
    const item = (readState()[collection] || []).find(x => x.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  });

  router.post('/', (req, res) => {
    const state = readState();
    const item = { ...req.body, id: uid(idPrefix), createdAt: Date.now() };
    state[collection] = [...(state[collection] || []), item];
    writeState(state);
    res.status(201).json(item);
  });

  router.put('/:id', (req, res) => {
    const state = readState();
    const list = state[collection] || [];
    const idx = list.findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    list[idx] = { ...list[idx], ...req.body, id: req.params.id };
    state[collection] = list;
    writeState(state);
    res.json(list[idx]);
  });

  router.delete('/:id', (req, res) => {
    const state = readState();
    const before = (state[collection] || []).length;
    state[collection] = (state[collection] || []).filter(x => x.id !== req.params.id);
    if (state[collection].length === before) return res.status(404).json({ error: 'Not found' });
    writeState(state);
    res.json({ ok: true });
  });

  return router;
}

module.exports = { makeCRUD, uid };
