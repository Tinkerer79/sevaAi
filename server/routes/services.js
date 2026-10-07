import { Router } from 'express';
import { q } from '../db.js';

const router = Router();

export const CATEGORIES = [
  'Certificates', 'Education', 'Health', 'Agriculture', 'Transport',
  'Employment', 'Business', 'Social Welfare', 'Land & Revenue', 'Civic Services',
];

router.get('/', (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase().slice(0, 80);
  const category = String(req.query.category || '').trim().slice(0, 40);
  let sql = `SELECT s.id, s.slug, s.name, s.category, s.description, s.eligibility, s.official_link, s.is_demo, d.name AS dept_name
             FROM services s LEFT JOIN departments d ON d.id = s.department_id WHERE 1=1`;
  const params = [];
  if (category && category !== 'All') { sql += ' AND s.category = ?'; params.push(category); }
  if (search) {
    sql += ` AND (LOWER(s.name) LIKE ? OR LOWER(s.description) LIKE ? OR LOWER(s.keywords) LIKE ? OR LOWER(s.category) LIKE ?)`;
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  sql += ' ORDER BY s.name';
  res.json({ services: q.all(sql, ...params) });
});

router.get('/categories', (_req, res) => {
  res.json({ categories: CATEGORIES });
});

router.get('/:slug', (req, res) => {
  const s = q.get(
    `SELECT s.*, d.name AS dept_name FROM services s LEFT JOIN departments d ON d.id = s.department_id WHERE s.slug = ?`,
    String(req.params.slug).slice(0, 80)
  );
  if (!s) return res.status(404).json({ error: 'Service not found.' });
  res.json({
    service: {
      ...s,
      documents: JSON.parse(s.documents || '[]'),
      steps: JSON.parse(s.steps || '[]'),
      keywords: JSON.parse(s.keywords || '[]'),
    },
  });
});

export default router;
