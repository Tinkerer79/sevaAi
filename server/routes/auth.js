import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { signToken, optionalAuth } from '../middleware/auth.js';
import { q } from '../db.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const clean = (s) => String(s || '').replace(/[<>]/g, '').trim();

// Cross-site deployments (frontend on Vercel, backend elsewhere, both https)
// need SameSite=None; Secure cookies. Opt in with COOKIE_SAMESITE=none.
const crossSite = (process.env.COOKIE_SAMESITE || '').toLowerCase() === 'none';
const cookieOpts = {
  httpOnly: true,
  sameSite: crossSite ? 'none' : 'lax',
  secure: crossSite,
  maxAge: 7 * 24 * 3600 * 1000,
  path: '/',
};

router.post('/register', (req, res) => {
  const name = clean(req.body.name).slice(0, 80);
  const email = clean(req.body.email).toLowerCase().slice(0, 120);
  const phone = String(req.body.phone || '').replace(/\D/g, '').slice(-10);
  const password = String(req.body.password || '');

  if (name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (phone && !PHONE_RE.test(phone)) return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  if (q.get('SELECT id FROM users WHERE email = ?', email))
    return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });

  const hash = bcrypt.hashSync(password, 10);
  const r = q.run('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)', name, email, phone || null, hash, 'citizen');
  const user = q.get('SELECT id, name, email, phone, role FROM users WHERE id = ?', Number(r.lastInsertRowid));
  res.cookie('sm_token', signToken(user), cookieOpts);
  res.status(201).json({ user });
});

router.post('/login', (req, res) => {
  const email = clean(req.body.email).toLowerCase().slice(0, 120);
  const password = String(req.body.password || '');
  const user = q.get('SELECT * FROM users WHERE email = ?', email);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid email or password.' });
  const safe = { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
  res.cookie('sm_token', signToken(safe), cookieOpts);
  res.json({ user: safe });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('sm_token');
  res.json({ ok: true });
});

router.get('/me', optionalAuth, (req, res) => {
  res.json({ user: req.user || null });
});

export default router;
