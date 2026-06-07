/**
 * HΦSTO — Express + SQLite backend
 *
 * Auth (quando API_TOKEN está definido):
 *   - Browser (same-origin): recebe cookie de sessão automático ao carregar a página
 *   - Clientes externos:     Authorization: Bearer <API_TOKEN>
 *
 * Se API_TOKEN não estiver definido, a API fica aberta (desenvolvimento).
 *
 * Módulos:
 *   server/db.js              — banco de dados e estado (kv store)
 *   server/auth.js            — senha, sessões, rate limiting, middleware de auth
 *   server/routes/auth.js     — /api/auth/*
 *   server/routes/orders.js   — /api/orders
 *   server/routes/state.js    — /api/state, /api/calc, /api/export, /api/import
 *   server/routes/resources.js — /api/printers, /api/materials, /api/jobs, etc.
 */

const express      = require('express');
const cookieParser = require('cookie-parser');
const path         = require('path');

const { DB_PATH }                                          = require('./server/db');
const { auth, API_TOKEN, COOKIE_SECURE, sessionCookie,
        getUserFromSession, userCount }                    = require('./server/auth');
const authRoutes      = require('./server/routes/auth');
const orderRoutes     = require('./server/routes/orders');
const stateRoutes     = require('./server/routes/state');
const resourceRoutes  = require('./server/routes/resources');

const PORT        = Number(process.env.PORT) || 8080;
const CORS_ORIGIN = (process.env.CORS_ORIGIN || '*').trim();

const app = express();

app.set('trust proxy', 1); // Cloudflare / reverse proxy → req.ip correto

// ── Segurança HTTP ─────────────────────────────────────────────────────────────

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: '8mb' }));

// Cookie legado de sessão — só usado quando não há usuários cadastrados (setup antigo)
app.use((req, res, next) => {
  if (API_TOKEN && req.method === 'GET' && !req.cookies?.hfsto_sid && userCount() === 0) {
    res.cookie('hfsto_sid', sessionCookie(), {
      httpOnly: true, sameSite: 'strict', secure: COOKIE_SECURE, path: '/',
    });
  }
  next();
});

// ── Rotas HTML ─────────────────────────────────────────────────────────────────

// Guard: protege index.html — redireciona para Login/Cadastro se não autenticado
app.get(['/', '/index.html'], (req, res, next) => {
  if (req.query.demo === '1') return next(); // modo demo é público
  const sessId = req.cookies?.hfsto_sess;
  if (sessId && getUserFromSession(sessId)) return next();
  if (API_TOKEN) {
    if (userCount() === 0) {
      const sid = req.cookies?.hfsto_sid;
      if (sid && sid === sessionCookie()) return next();
    }
    const header = req.headers['authorization'] || '';
    if (header === `Bearer ${API_TOKEN}`) return next();
  }
  return res.redirect(302, '/login');
});

// Subdomínio pedidos.* — serve o formulário público sem precisar de path na URL
app.get('/', (req, res, next) => {
  const host = (req.headers.host || '').split(':')[0];
  if (host.startsWith('pedidos.')) return res.sendFile('Pedido.html', { root: path.join(__dirname, 'public') });
  next();
});

// Rotas limpas — sem .html
app.get('/login',    (_req, res) => res.sendFile('Login.html',    { root: path.join(__dirname, 'public') }));
app.get('/cadastro', (_req, res) => res.sendFile('Cadastro.html', { root: path.join(__dirname, 'public') }));
app.get('/pedidos',  (_req, res) => res.sendFile('Pedido.html',   { root: path.join(__dirname, 'public') }));

app.use(express.static(path.join(__dirname, 'public')));

// ── CORS ───────────────────────────────────────────────────────────────────────

app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (CORS_ORIGIN === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && origin === CORS_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Rotas públicas da API (sem auth) ──────────────────────────────────────────

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api/auth',   authRoutes);
app.use('/api/orders', orderRoutes); // POST público, GET/PATCH/DELETE protegidos internamente

// ── Auth global para tudo abaixo ──────────────────────────────────────────────

app.use('/api', auth);

// ── Rotas protegidas da API ────────────────────────────────────────────────────

app.use('/api', stateRoutes);    // /api/state, /api/calc, /api/export, /api/import
app.use('/api', resourceRoutes); // /api/printers, /api/materials, /api/jobs, etc.

// ── Start ──────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  const authMode = API_TOKEN ? 'token ativo' : 'sem token (aberta)';
  console.log(`HΦSTO  →  http://localhost:${PORT}  |  db: ${DB_PATH}  |  auth: ${authMode}`);
});
