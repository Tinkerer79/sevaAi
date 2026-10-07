import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { q } from '../db.js';

const router = Router();

export const COMPLAINT_CATEGORIES = {
  road_damage: { label: 'Road damage', dept: 'Public Works Department (PWD)' },
  garbage_waste: { label: 'Garbage / waste', dept: 'Municipal Administration (MAHUD)' },
  streetlight: { label: 'Streetlight', dept: 'Electricity Department (MSPDCL)' },
  water_supply: { label: 'Water supply', dept: 'Public Health Engineering (PHED)' },
  drainage: { label: 'Drainage', dept: 'Public Health Engineering (PHED)' },
  public_infrastructure: { label: 'Public infrastructure', dept: 'Public Works Department (PWD)' },
  other: { label: 'Other', dept: 'Deputy Commissioner (DC) Office' },
};

export const DISTRICTS = [
  'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam',
  'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati',
  'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul',
];

export const STATUSES = ['Submitted', 'Received', 'Assigned', 'Under Review', 'Resolved'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

// Secure uploads: images only, random names, size-capped.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.dirs.uploads),
  filename: (_req, file, cb) => {
    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype] || '.jpg';
    cb(null, `c-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: config.limits.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
      return cb(null, true);
    cb(new Error('Only JPG, PNG or WebP images are allowed.'));
  },
});

function genComplaintId() {
  for (let i = 0; i < 50; i++) {
    const id = `SM-2026-${String(Math.floor(10000 + Math.random() * 90000))}`;
    if (!q.get('SELECT id FROM complaints WHERE complaint_id = ?', id)) return id;
  }
  return `SM-2026-${Date.now().toString().slice(-5)}`;
}

const clean = (s) => String(s || '').replace(/[<>]/g, '').trim();

router.post('/', optionalAuth, upload.single('photo'), (req, res) => {
  const category = String(req.body?.category || '');
  const description = clean(req.body?.description);
  const location = clean(req.body?.location);
  const district = String(req.body?.district || '');
  const name = clean(req.body?.name);
  const phone = String(req.body?.phone || '').replace(/\D/g, '').slice(-10);

  if (!COMPLAINT_CATEGORIES[category]) return res.status(400).json({ error: 'Please choose a valid category.' });
  if (description.length < 10 || description.length > 2000) return res.status(400).json({ error: 'Please describe the problem in 10–2000 characters.' });
  if (location.length < 3 || location.length > 200) return res.status(400).json({ error: 'Please enter the location (3–200 characters).' });
  if (!DISTRICTS.includes(district)) return res.status(400).json({ error: 'Please choose a district.' });
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Please enter your name.' });
  if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });

  const deptName = COMPLAINT_CATEGORIES[category].dept;
  const dept = q.get('SELECT id FROM departments WHERE name = ?', deptName);
  const complaintId = genComplaintId();
  const priority = category === 'water_supply' ? 'High' : 'Medium';

  const r = q.run(
    `INSERT INTO complaints (complaint_id, user_id, category, description, location, district, photo, name, phone, status, priority, department_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', ?, ?)`,
    complaintId, req.user?.id || null, category, description, location, district,
    req.file ? req.file.filename : null, name, phone, priority, dept?.id || null
  );
  q.run('INSERT INTO complaint_updates (complaint_id, status, note, created_by) VALUES (?, ?, ?, ?)',
    Number(r.lastInsertRowid), 'Submitted', 'Complaint received by SevaManipur AI portal.', 'System');

  res.status(201).json({ complaintId, category: COMPLAINT_CATEGORIES[category].label, department: deptName });
}, (err, _req, res, _next) => {
  res.status(400).json({ error: err.message || 'Upload failed.' });
});

router.get('/meta', (_req, res) => {
  res.json({ categories: Object.entries(COMPLAINT_CATEGORIES).map(([k, v]) => ({ key: k, label: v.label })), districts: DISTRICTS });
});

// Public tracking by complaint ID
router.get('/track/:id', (req, res) => {
  const c = q.get(
    `SELECT c.complaint_id, c.category, c.description, c.location, c.district, c.name, c.status, c.priority,
            c.created_at, c.updated_at, d.name AS dept_name
     FROM complaints c LEFT JOIN departments d ON d.id = c.department_id
     WHERE c.complaint_id = ?`, String(req.params.id).trim().toUpperCase().slice(0, 20)
  );
  if (!c) return res.status(404).json({ error: 'No complaint found with that ID. Please check and try again.' });
  const updates = q.all(
    'SELECT status, note, created_by, created_at FROM complaint_updates WHERE complaint_id = (SELECT id FROM complaints WHERE complaint_id = ?) ORDER BY id ASC',
    c.complaint_id
  );
  res.json({ complaint: c, updates });
});

// Citizen's own complaints
router.get('/mine', requireAuth, (req, res) => {
  const rows = q.all(
    `SELECT c.complaint_id, c.category, c.location, c.district, c.status, c.priority, c.created_at, c.updated_at, d.name AS dept_name
     FROM complaints c LEFT JOIN departments d ON d.id = c.department_id
     WHERE c.user_id = ? ORDER BY c.created_at DESC`, req.user.id
  );
  res.json({ complaints: rows });
});

export default router;
