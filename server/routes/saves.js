import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { q } from '../db.js';

const router = Router();

router.get('/mine', requireAuth, (req, res) => {
  const services = q.all(
    `SELECT s.id, s.slug, s.name, s.category, d.name AS dept_name FROM saved_services sv
     JOIN services s ON s.id = sv.service_id LEFT JOIN departments d ON d.id = s.department_id
     WHERE sv.user_id = ? ORDER BY sv.created_at DESC`, req.user.id
  );
  const schemes = q.all(
    `SELECT s.id, s.slug, s.name, s.benefits, d.name AS dept_name FROM saved_schemes sv
     JOIN schemes s ON s.id = sv.scheme_id LEFT JOIN departments d ON d.id = s.department_id
     WHERE sv.user_id = ? ORDER BY sv.created_at DESC`, req.user.id
  );
  res.json({ services, schemes });
});

router.post('/services/:slug', requireAuth, (req, res) => {
  const s = q.get('SELECT id FROM services WHERE slug = ?', String(req.params.slug).slice(0, 80));
  if (!s) return res.status(404).json({ error: 'Service not found.' });
  q.run('INSERT OR IGNORE INTO saved_services (user_id, service_id) VALUES (?, ?)', req.user.id, s.id);
  res.json({ ok: true, saved: true });
});

router.delete('/services/:slug', requireAuth, (req, res) => {
  const s = q.get('SELECT id FROM services WHERE slug = ?', String(req.params.slug).slice(0, 80));
  if (s) q.run('DELETE FROM saved_services WHERE user_id = ? AND service_id = ?', req.user.id, s.id);
  res.json({ ok: true, saved: false });
});

router.post('/schemes/:slug', requireAuth, (req, res) => {
  const s = q.get('SELECT id FROM schemes WHERE slug = ?', String(req.params.slug).slice(0, 80));
  if (!s) return res.status(404).json({ error: 'Scheme not found.' });
  q.run('INSERT OR IGNORE INTO saved_schemes (user_id, scheme_id) VALUES (?, ?)', req.user.id, s.id);
  res.json({ ok: true, saved: true });
});

router.delete('/schemes/:slug', requireAuth, (req, res) => {
  const s = q.get('SELECT id FROM schemes WHERE slug = ?', String(req.params.slug).slice(0, 80));
  if (s) q.run('DELETE FROM saved_schemes WHERE user_id = ? AND scheme_id = ?', req.user.id, s.id);
  res.json({ ok: true, saved: false });
});

router.get('/services/status/:slug', requireAuth, (req, res) => {
  const s = q.get('SELECT id FROM services WHERE slug = ?', String(req.params.slug).slice(0, 80));
  if (!s) return res.json({ saved: false });
  res.json({ saved: !!q.get('SELECT 1 FROM saved_services WHERE user_id = ? AND service_id = ?', req.user.id, s.id) });
});

router.get('/schemes/status/:slug', requireAuth, (req, res) => {
  const s = q.get('SELECT id FROM schemes WHERE slug = ?', String(req.params.slug).slice(0, 80));
  if (!s) return res.json({ saved: false });
  res.json({ saved: !!q.get('SELECT 1 FROM saved_schemes WHERE user_id = ? AND scheme_id = ?', req.user.id, s.id) });
});

export default router;
