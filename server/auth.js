const crypto = require('crypto');
const { db } = require('./db');

const API_TOKEN     = (process.env.API_TOKEN || '').trim();
// COOKIE_SECURE=false sempre desativa, COOKIE_SECURE=true sempre ativa,
// sem a var usa NODE_ENV=production como padrão
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true'
  || (process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production');
const SESSION_TTL   = 30 * 24 * 3600; // 30 dias em segundos

// ── Senha ─────────────────────────────────────────────────────────────────────

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

// ── Sessões ───────────────────────────────────────────────────────────────────

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

// ── Rate limiting (in-process, fixed window por IP) ───────────────────────────

function makeRateLimiter(max, windowMs) {
  const store = new Map();
  return (req, res, next) => {
    const ip = (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-forwarded-for']  ||
      req.socket.remoteAddress || ''
    ).split(',')[0].trim();
    const now = Date.now();
    let e = store.get(ip);
    if (!e || now > e.reset) {
      e = { count: 0, reset: now + windowMs };
      store.set(ip, e);
      if (store.size > 5000) for (const [k, v] of store) if (now > v.reset) store.delete(k);
    }
    e.count++;
    if (e.count > max) {
      const retry = Math.ceil((e.reset - now) / 1000);
      return res.status(429).set('Retry-After', String(retry))
                .json({ error: 'Muitas tentativas — aguarde antes de tentar novamente.' });
    }
    next();
  };
}

const loginLimiter  = makeRateLimiter(10, 15 * 60 * 1000); // 10 tentativas / 15 min
const signupLimiter = makeRateLimiter(3,  60 * 60 * 1000); // 3 cadastros   /  1 h
const orderLimiter  = makeRateLimiter(30, 60 * 60 * 1000); // 30 pedidos    /  1 h

// ── Cookie legado (retrocompatibilidade com API_TOKEN sem contas) ─────────────

function sessionCookie() {
  if (!API_TOKEN) return '';
  return crypto.createHmac('sha256', API_TOKEN).update('hfsto-browser').digest('hex');
}

// ── Middleware de autenticação ────────────────────────────────────────────────

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

module.exports = {
  API_TOKEN, COOKIE_SECURE, SESSION_TTL,
  hashPassword, verifyPassword,
  createSession, getUserFromSession, userCount,
  sessionCookie, auth,
  makeRateLimiter, loginLimiter, signupLimiter, orderLimiter,
};
