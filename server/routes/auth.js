const express = require('express');
const { db } = require('../db');
const {
  hashPassword, verifyPassword,
  createSession, getUserFromSession, userCount,
  sessionCookie, loginLimiter, signupLimiter,
  API_TOKEN, COOKIE_SECURE, SESSION_TTL,
} = require('../auth');

const router = express.Router();

router.get('/me', (req, res) => {
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

router.post('/signup', signupLimiter, (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'e-mail e senha são obrigatórios' });
  if (password.length < 6)  return res.status(400).json({ error: 'senha muito curta (mín. 6)' });

  // Após o primeiro cadastro, somente o Bearer token pode criar mais usuários
  if (userCount() > 0) {
    const header = req.headers['authorization'] || '';
    if (!API_TOKEN || header !== `Bearer ${API_TOKEN}`) {
      return res.status(403).json({ error: 'Cadastro desativado — sistema já configurado. Use o token de API para criar usuários adicionais.' });
    }
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim());
  if (existing) return res.status(409).json({ error: 'e-mail já cadastrado' });

  const result = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(
    email.trim().toLowerCase(), (name || '').trim(), hashPassword(password)
  );
  const sessId = createSession(result.lastInsertRowid);
  res.cookie('hfsto_sess', sessId, { httpOnly: true, sameSite: 'strict', secure: COOKIE_SECURE, path: '/', maxAge: SESSION_TTL * 1000 });
  res.status(201).json({ ok: true });
});

router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'e-mail e senha são obrigatórios' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'e-mail ou senha inválidos' });
  }
  const sessId = createSession(user.id);
  res.cookie('hfsto_sess', sessId, { httpOnly: true, sameSite: 'strict', secure: COOKIE_SECURE, path: '/', maxAge: SESSION_TTL * 1000 });
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  const sessId = req.cookies?.hfsto_sess;
  if (sessId) db.prepare('DELETE FROM sessions WHERE id = ?').run(sessId);
  res.clearCookie('hfsto_sess', { path: '/' });
  res.json({ ok: true });
});

module.exports = router;
