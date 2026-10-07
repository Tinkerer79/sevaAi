import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { q } from '../db.js';

export function signToken(user) {
  return jwt.sign({ uid: user.id, role: user.role, name: user.name }, config.jwtSecret, { expiresIn: '7d' });
}

function readToken(req) {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  return req.cookies?.sm_token || null;
}

export function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const user = q.get('SELECT id, name, email, phone, role FROM users WHERE id = ?', payload.uid);
      if (user) req.user = user;
    } catch { /* invalid/expired token → anonymous */ }
  }
  next();
}

export function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Please log in to continue.' });
    next();
  });
}

export function requireAdmin(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin')
      return res.status(403).json({ error: 'Admin access required.' });
    next();
  });
}
