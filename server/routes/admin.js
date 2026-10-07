import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { keyManager, testKey } from '../ai/gemini.js';
import { config } from '../config.js';
import { STATUSES, PRIORITIES } from './complaints.js';
import { q } from '../db.js';

const router = Router();
router.use(requireAdmin);

// ── Dashboard statistics ────────────────────────────────────────────────────
router.get('/stats', (_req, res) => {
  const total = q.get('SELECT COUNT(*) AS n FROM complaints').n;
  const by = (col) => q.all(`SELECT ${col} AS k, COUNT(*) AS n FROM complaints GROUP BY ${col} ORDER BY n DESC`);
  const byStatus = Object.fromEntries(by('status').map((r) => [r.k, r.n]));
  const byPriority = Object.fromEntries(by('priority').map((r) => [r.k, r.n]));
  const byCategory = by('category').map((r) => ({ key: r.k, n: r.n }));
  const byDistrict = by('district').map((r) => ({ key: r.k, n: r.n }));
  const overTime = q.all(
    `SELECT date(created_at) AS day, COUNT(*) AS n FROM complaints
     WHERE created_at >= datetime('now', '-13 days') GROUP BY day ORDER BY day`
  ).map((r) => r);
  const highPriority = (byPriority['High'] || 0) + (byPriority['Critical'] || 0);
  res.json({
    total,
    pending: (byStatus['Submitted'] || 0) + (byStatus['Received'] || 0),
    assigned: byStatus['Assigned'] || 0,
    underReview: byStatus['Under Review'] || 0,
    resolved: byStatus['Resolved'] || 0,
    highPriority,
    byStatus, byCategory, byDistrict, byPriority,
    overTime,
    users: q.get('SELECT COUNT(*) AS n FROM users WHERE role = ?', 'citizen').n,
    aiHealth: { ...keyManager.summary(), model: config.geminiModel },
  });
});

// ── Complaint management ────────────────────────────────────────────────────
router.get('/complaints', (req, res) => {
  const status = String(req.query.status || '').trim();
  const search = String(req.query.search || '').trim().toLowerCase().slice(0, 60);
  let sql = `SELECT c.*, d.name AS dept_name FROM complaints c LEFT JOIN departments d ON d.id = c.department_id WHERE 1=1`;
  const params = [];
  if (STATUSES.includes(status)) { sql += ' AND c.status = ?'; params.push(status); }
  if (search) { sql += ' AND (LOWER(c.complaint_id) LIKE ? OR LOWER(c.location) LIKE ? OR LOWER(c.category) LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY c.created_at DESC LIMIT 200';
  const rows = q.all(sql, ...params).map(({ description, ...r }) => ({ ...r, description: description.slice(0, 120) }));
  res.json({ complaints: rows, statuses: STATUSES, priorities: PRIORITIES });
});

router.get('/complaints/:id', (req, res) => {
  const c = q.get(
    `SELECT c.*, d.name AS dept_name FROM complaints c LEFT JOIN departments d ON d.id = c.department_id WHERE c.complaint_id = ?`,
    String(req.params.id).trim().toUpperCase()
  );
  if (!c) return res.status(404).json({ error: 'Complaint not found.' });
  const updates = q.all('SELECT status, note, created_by, created_at FROM complaint_updates WHERE complaint_id = ? ORDER BY id ASC', c.id);
  res.json({ complaint: c, updates, statuses: STATUSES, priorities: PRIORITIES });
});

router.patch('/complaints/:id', (req, res) => {
  const c = q.get('SELECT * FROM complaints WHERE complaint_id = ?', String(req.params.id).trim().toUpperCase());
  if (!c) return res.status(404).json({ error: 'Complaint not found.' });

  const { status, priority, dept_name, note } = req.body || {};
  const fields = [];
  const params = [];

  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    fields.push('status = ?'); params.push(status);
  }
  if (priority !== undefined) {
    if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority.' });
    fields.push('priority = ?'); params.push(priority);
  }
  if (dept_name !== undefined) {
    const d = q.get('SELECT id FROM departments WHERE name = ?', String(dept_name).slice(0, 80));
    if (!d) return res.status(400).json({ error: 'Unknown department.' });
    fields.push('department_id = ?'); params.push(d.id);
  }
  fields.push("updated_at = datetime('now')");
  q.run(`UPDATE complaints SET ${fields.join(', ')} WHERE id = ?`, ...params, c.id);

  if (status && status !== c.status) {
    q.run('INSERT INTO complaint_updates (complaint_id, status, note, created_by) VALUES (?, ?, ?, ?)',
      c.id, status, note ? String(note).slice(0, 500) : `Status changed to ${status}.`, req.user.name);
  } else if (note && String(note).trim()) {
    q.run('INSERT INTO complaint_updates (complaint_id, status, note, created_by) VALUES (?, ?, ?, ?)',
      c.id, c.status, String(note).slice(0, 500), req.user.name);
  }

  const updated = q.get(`SELECT c.*, d.name AS dept_name FROM complaints c LEFT JOIN departments d ON d.id = c.department_id WHERE c.id = ?`, c.id);
  res.json({ complaint: updated });
});

router.get('/complaints/:id/photo', (req, res) => {
  const c = q.get('SELECT photo FROM complaints WHERE complaint_id = ?', String(req.params.id).trim().toUpperCase());
  if (!c || !c.photo) return res.status(404).json({ error: 'No photo attached.' });
  res.sendFile(c.photo, { root: config.dirs.uploads });
});

router.get('/departments', (_req, res) => {
  res.json({ departments: q.all('SELECT name FROM departments ORDER BY name') });
});

// ── AI API key health (never returns raw keys) ──────────────────────────────
router.get('/ai/keys', (_req, res) => {
  res.json({ keys: keyManager.snapshot(), strategy: keyManager.strategy, model: config.geminiModel });
});

router.post('/ai/keys/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  if (action === 'enable') return res.json({ key: keyManager.adminEnable(id), keys: keyManager.snapshot() });
  if (action === 'disable') return res.json({ key: keyManager.adminDisable(id), keys: keyManager.snapshot() });
  if (action === 'reset') return res.json({ key: keyManager.adminReset(id), keys: keyManager.snapshot() });
  if (action === 'reset_stats') return res.json({ key: keyManager.adminResetStats(id), keys: keyManager.snapshot() });
  if (action === 'test') {
    const result = await testKey(id);
    if (result === null) return res.status(404).json({ error: 'Key not found.' });
    return res.json({ test: result, keys: keyManager.snapshot() });
  }
  res.status(400).json({ error: 'Unknown action.' });
});

router.post('/ai/strategy', (req, res) => {
  const strategy = keyManager.setStrategy(String(req.body?.strategy || ''));
  if (strategy !== String(req.body?.strategy)) return res.status(400).json({ error: 'Strategy must be failover or round_robin.' });
  res.json({ strategy, keys: keyManager.snapshot() });
});

// Live end-to-end test through the full rotation pipeline
router.post('/ai/live-test', async (_req, res) => {
  try {
    const { generate } = await import('../ai/gemini.js');
    const r = await generate({
      systemInstruction: 'You are a ping endpoint. Reply with exactly: PONG',
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
      maxOutputTokens: 50,
      timeoutMs: 20_000,
    });
    res.json({ ok: true, servedBy: r.keyLabel, sample: r.text });
  } catch (err) {
    res.json({ ok: false, message: err.code === 'AI_BUSY' ? 'All keys unavailable.' : err.message });
  }
});

export default router;
