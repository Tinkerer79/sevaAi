import { Router } from 'express';
import { q } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase().slice(0, 80);
  const district = String(req.query.district || '').trim().slice(0, 40);
  let sql = 'SELECT * FROM contacts WHERE 1=1';
  const params = [];
  if (district && district !== 'All') { sql += ' AND district = ?'; params.push(district); }
  if (search) {
    sql += ' AND (LOWER(department) LIKE ? OR LOWER(service) LIKE ? OR LOWER(office) LIKE ? OR LOWER(district) LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  sql += ' ORDER BY department';
  res.json({ contacts: q.all(sql, ...params) });
});

export default router;
