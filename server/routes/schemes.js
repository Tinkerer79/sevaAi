import { Router } from 'express';
import { q } from '../db.js';

const router = Router();

const OCCUPATIONS = ['student', 'farmer', 'business', 'salaried', 'unemployed', 'homemaker', 'daily_wage', 'street_vendor', 'senior_citizen'];

function parse(row) {
  if (!row) return row;
  return { ...row, documents: JSON.parse(row.documents || '[]'), occupations: JSON.parse(row.occupations || '[]'), keywords: JSON.parse(row.keywords || '[]') };
}

// Structured scheme finder — filters on the DB's eligibility rules, no AI invention.
router.post('/match', (req, res) => {
  const age = Math.min(120, Math.max(0, Number(req.body?.age) || 0));
  const occupation = OCCUPATIONS.includes(req.body?.occupation) ? req.body.occupation : null;
  const area = ['rural', 'urban'].includes(req.body?.area) ? req.body.area : 'any';
  const income = req.body?.income === '' || req.body?.income == null ? null : Math.max(0, Number(req.body.income) || 0);

  const rows = q.all(
    `SELECT s.*, d.name AS dept_name FROM schemes s LEFT JOIN departments d ON d.id = s.department_id`
  );

  const matches = rows.map((raw) => {
    const s = parse(raw);
    const reasons = [];
    let score = 0;

    const ageOk = (s.min_age == null || age >= s.min_age) && (s.max_age == null || age <= s.max_age);
    const occOk = !occupation || s.occupations.includes(occupation) || s.occupations.includes('any');
    const areaOk = s.area === 'any' || s.area === area;
    const incomeOk = s.max_income == null || income == null || income <= s.max_income;

    if (ageOk) score += 2;
    if (occOk) score += 3;
    if (areaOk) score += 1;
    if (incomeOk) score += 2;

    if (ageOk && req.body?.age != null && req.body?.age !== '') reasons.push(`age ${age} fits the ${s.min_age ?? 'any'}–${s.max_age ?? 'any'} range`);
    if (occOk && occupation) reasons.push(s.occupations.includes('any') ? `no occupation restriction` : `open to ${occupation}s`);
    if (incomeOk && s.max_income && income != null) reasons.push(`income ₹${income} is within the ₹${s.max_income} cap`);
    if (areaOk && s.area !== 'any') reasons.push(`designed for ${s.area} residents`);
    if (s.keywords.includes(occupation)) score += 1;

    return { ...s, _score: score, _reasons: reasons, _eligible: ageOk && occOk && areaOk && incomeOk };
  });

  matches.sort((a, b) => b._score - a._score || a.name.localeCompare(b.name));
  const eligible = matches.filter((m) => m._eligible && m._score >= 4);
  const near = matches.filter((m) => !eligible.includes(m) && m._score >= 3).slice(0, 3);

  res.json({
    results: eligible.map(({ _score, ...r }) => ({ ...r, matchReasons: r._reasons })),
    related: near.map(({ _score, _reasons, ...r }) => r),
  });
});

router.get('/', (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase().slice(0, 80);
  let sql = `SELECT s.id, s.slug, s.name, s.benefits, s.eligibility, s.area, s.is_demo, d.name AS dept_name
             FROM schemes s LEFT JOIN departments d ON d.id = s.department_id`;
  const params = [];
  if (search) {
    sql += ` WHERE LOWER(s.name) LIKE ? OR LOWER(s.benefits) LIKE ? OR LOWER(s.keywords) LIKE ?`;
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY s.name';
  res.json({ schemes: q.all(sql, ...params).map(parse) });
});

router.get('/:slug', (req, res) => {
  const s = q.get(`SELECT s.*, d.name AS dept_name FROM schemes s LEFT JOIN departments d ON d.id = s.department_id WHERE s.slug = ?`, String(req.params.slug).slice(0, 80));
  if (!s) return res.status(404).json({ error: 'Scheme not found.' });
  res.json({ scheme: parse(s) });
});

export default router;
