// GET /api/contacts — government contact directory (search + district filter).
import { contactRows } from './_lib/store.js';
import { cors, json } from './_lib/http.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });

  const search = String(req.query.search || '').trim().toLowerCase().slice(0, 80);
  const district = String(req.query.district || '').trim().slice(0, 40);
  let rows = contactRows;
  if (district && district !== 'All') rows = rows.filter((c) => c.district === district);
  if (search) {
    rows = rows.filter((c) =>
      c.department.toLowerCase().includes(search) ||
      c.service.toLowerCase().includes(search) ||
      c.office.toLowerCase().includes(search) ||
      c.district.toLowerCase().includes(search));
  }
  rows = [...rows].sort((a, b) => a.department.localeCompare(b.department));
  json(res, 200, { contacts: rows });
}
