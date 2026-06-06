/**
 * HΦSTO — Express + SQLite backend
 *
 * Auth (quando API_TOKEN está definido):
 *   - Browser (same-origin): recebe cookie de sessão automático ao carregar a página
 *   - Clientes externos:     Authorization: Bearer <API_TOKEN>
 *
 * Se API_TOKEN não estiver definido, a API fica aberta (desenvolvimento).
 */

const express      = require('express');
const Database     = require('better-sqlite3');
const cookieParser = require('cookie-parser');
const path         = require('path');
const crypto       = require('crypto');

const PORT      = Number(process.env.PORT) || 8080;
const DB_PATH   = process.env.DB_PATH || path.join(__dirname, 'data', 'hphisto.db');
const API_TOKEN = (process.env.API_TOKEN || '').trim();

// ── Banco de dados ─────────────────────────────────────────────────────────────

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT    NOT NULL DEFAULT '',
    password_hash TEXT    NOT NULL,
    created_at    INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
`);

const _get = db.prepare('SELECT value FROM kv WHERE key = ?');
const _set = db.prepare(
  'INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?, ?, unixepoch())'
);

const EMPTY_STATE = {
  printers: [], materials: [], history: [],
  schedule: [], catalog: [],  clients: [], settings: {},
};

function readState() {
  const row = _get.get('state');
  if (!row) return { ...EMPTY_STATE };
  try { return JSON.parse(row.value); } catch { return { ...EMPTY_STATE }; }
}
function writeState(state) { _set.run('state', JSON.stringify(state)); }

// ── Auth — user accounts ───────────────────────────────────────────────────────

const SESSION_TTL = 30 * 24 * 3600; // 30 dias em segundos

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
}

function createSession(userId) {
  const id      = crypto.randomBytes(32).toString('hex');
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL;
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(id, userId, expires);
  return id;
}

function getUserFromSession(sessionId) {
  if (!sessionId) return null;
  const row = db.prepare('SELECT user_id FROM sessions WHERE id = ? AND expires_at > unixepoch()').get(sessionId);
  return row ? row.user_id : null;
}

function userCount() {
  return db.prepare('SELECT COUNT(*) as c FROM users').get().c;
}

// ── Auth — API_TOKEN (retrocompatibilidade) ────────────────────────────────────

function sessionCookie() {
  if (!API_TOKEN) return '';
  return crypto.createHmac('sha256', API_TOKEN).update('hfsto-browser').digest('hex');
}

function auth(req, res, next) {
  // 1. Sessão de usuário (contas cadastradas)
  const sessId = req.cookies?.hfsto_sess;
  if (sessId && getUserFromSession(sessId)) return next();

  // 2. API_TOKEN
  if (API_TOKEN) {
    // Cookie legado só vale quando não há usuários cadastrados (setup antigo sem contas)
    if (userCount() === 0) {
      const sid = req.cookies?.hfsto_sid;
      if (sid && sid === sessionCookie()) return next();
    }
    // Bearer token: sempre aceito para clientes externos via API
    const header = req.headers['authorization'] || '';
    if (header === `Bearer ${API_TOKEN}`) return next();
  }

  // 3. Modo aberto: sem API_TOKEN e sem usuários cadastrados
  if (!API_TOKEN && userCount() === 0) return next();

  res.status(401).json({ error: 'Unauthorized' });
}

// ── App ────────────────────────────────────────────────────────────────────────

const app = express();

app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));

// Cookie legado de sessão — só usado quando não há usuários cadastrados (setup antigo)
app.use((req, res, next) => {
  if (API_TOKEN && req.method === 'GET' && !req.cookies?.hfsto_sid && userCount() === 0) {
    res.cookie('hfsto_sid', sessionCookie(), {
      httpOnly: true, sameSite: 'strict', path: '/',
    });
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// CORS — permite clientes externos usarem a API com o token
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Health check (sem auth — usado pelo Docker)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// ── Rotas de autenticação (sem proteção) ──────────────────────────────────────

app.get('/api/auth/me', (req, res) => {
  const sessId = req.cookies?.hfsto_sess;
  const userId = getUserFromSession(sessId);
  if (userId) {
    const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(userId);
    if (user) return res.json({ ...user, mode: 'session' });
  }
  if (API_TOKEN) {
    const header = req.headers['authorization'] || '';
    if (header === `Bearer ${API_TOKEN}`) {
      return res.json({ id: 0, email: 'operator@hosto.local', name: 'Operador', mode: 'token' });
    }
    // Cookie legado só válido sem usuários cadastrados
    if (userCount() === 0) {
      const sid = req.cookies?.hfsto_sid;
      if (sid && sid === sessionCookie()) {
        return res.json({ id: 0, email: 'operator@hosto.local', name: 'Operador', mode: 'token' });
      }
    }
  }
  res.status(401).json({ error: 'not authenticated', hasUsers: userCount() > 0 });
});

app.post('/api/auth/signup', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'e-mail e senha são obrigatórios' });
  if (password.length < 6)  return res.status(400).json({ error: 'senha muito curta (mín. 6)' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim());
  if (existing) return res.status(409).json({ error: 'e-mail já cadastrado' });

  const result = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(
    email.trim().toLowerCase(), (name || '').trim(), hashPassword(password)
  );
  const sessId = createSession(result.lastInsertRowid);
  res.cookie('hfsto_sess', sessId, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: SESSION_TTL * 1000 });
  res.status(201).json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'e-mail e senha são obrigatórios' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'e-mail ou senha inválidos' });
  }
  const sessId = createSession(user.id);
  res.cookie('hfsto_sess', sessId, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: SESSION_TTL * 1000 });
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  const sessId = req.cookies?.hfsto_sess;
  if (sessId) db.prepare('DELETE FROM sessions WHERE id = ?').run(sessId);
  res.clearCookie('hfsto_sess', { path: '/' });
  res.json({ ok: true });
});

// Autenticação em todas as rotas /api (exceto as de auth já respondidas)
app.use('/api', auth);

// ── Helpers ───────────────────────────────────────────────────────────────────

const uid = (prefix) => prefix + crypto.randomBytes(4).toString('hex');

// Factory de CRUD genérico para qualquer coleção do estado
function makeCRUD(collection, idPrefix) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const state = readState();
    let items = state[collection] || [];
    // filtros opcionais por query string
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

// ── Estado completo ────────────────────────────────────────────────────────────

app.get('/api/state', (_req, res) => res.json(readState()));

app.put('/api/state', (req, res) => {
  writeState(req.body);
  res.json({ ok: true });
});

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

app.use('/api/printers', printers);

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

// POST /api/materials/:id/refill  — adiciona um rolo
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

app.use('/api/materials', materials);

// ── Orçamentos (Histórico) ────────────────────────────────────────────────────

app.use('/api/quotes', makeCRUD('history', 'q_'));

// ── Agenda (Jobs) ─────────────────────────────────────────────────────────────

const jobs = makeCRUD('schedule', 'job_');

// POST /api/jobs/:id/complete — conclui e dá baixa no filamento
jobs.post('/:id/complete', (req, res) => {
  const state = readState();
  const job = (state.schedule || []).find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  job.status    = 'done';
  job.doneAt    = Date.now();
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

app.use('/api/jobs', jobs);

// ── Catálogo de produtos ──────────────────────────────────────────────────────

app.use('/api/catalog', makeCRUD('catalog', 'prod_'));

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

app.use('/api/clients', clients);

// ── Configurações ─────────────────────────────────────────────────────────────

app.get('/api/settings', (_req, res) => res.json(readState().settings || {}));

app.patch('/api/settings', (req, res) => {
  const state = readState();
  state.settings = { ...(state.settings || {}), ...req.body };
  writeState(state);
  res.json(state.settings);
});

app.put('/api/settings', (req, res) => {
  const state = readState();
  state.settings = req.body;
  writeState(state);
  res.json(state.settings);
});

// ── Cálculo (sem salvar) ──────────────────────────────────────────────────────

app.post('/api/calc', (req, res) => {
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

  const mat_cost    = (material.pricePerKg || 0) / 1000 * weight;
  const energy      = (printer.power || 0) / 1000 * hours * (settings.energyTariff || 0);
  const maintenance = mat_cost * (printer.maintenancePct || 0) / 100;
  const failure     = mat_cost * (printer.failurePct    || 0) / 100;
  const finishing   = mat_cost * (settings.finishingPct  || 0) / 100;
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

app.get('/api/export', (_req, res) => {
  const state   = readState();
  const payload = JSON.stringify({ __app: 'HFSTO', __v: 1, exportedAt: Date.now(), data: state }, null, 2);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition',
    `attachment; filename="hfsto-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(payload);
});

app.post('/api/import', (req, res) => {
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

// ── Start ──────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  const auth = API_TOKEN ? '🔒 token ativo' : '⚠️  sem token (aberta)';
  console.log(`HΦSTO  →  http://localhost:${PORT}  |  db: ${DB_PATH}  |  auth: ${auth}`);
});
