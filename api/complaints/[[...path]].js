// Public read-only complaint tracking for the three seeded demo examples.
// SQLite is not persistent in Vercel serverless functions, so Vercel reads the
// demo rows from Supabase and keeps local fixtures as a development fallback.
import { fetchDemoComplaintFromSupabase } from '../_lib/supabase.js';
import { fetchComplaintTrackingFromSupabase, submitComplaintToSupabase } from '../_lib/supabase.js';
import { getDemoComplaint } from '../_lib/demoComplaints.js';
import { cors, json, clientIp, rateLimit } from '../_lib/http.js';
import { encryptPrivate } from '../_lib/pii.js';
import multer from 'multer';

const sqlDate = (value) => value ? String(value).replace('T', ' ').slice(0, 19) : null;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    ? callback(null, true) : callback(new Error('Only JPG, PNG or WebP images are allowed.')),
});
const CATEGORIES = [
  { key: 'road_damage', label: 'Road damage' }, { key: 'garbage_waste', label: 'Garbage / waste' },
  { key: 'streetlight', label: 'Streetlight' }, { key: 'water_supply', label: 'Water supply' },
  { key: 'drainage', label: 'Drainage' }, { key: 'public_infrastructure', label: 'Public infrastructure' },
  { key: 'other', label: 'Other' },
];
const DISTRICTS = [
  'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam',
  'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati',
  'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul',
];

function parseForm(req, res) {
  return new Promise((resolve, reject) => upload.single('photo')(req, res, (error) => error ? reject(error) : resolve()));
}

function publicComplaint(row) {
  return {
    complaint_id: row.complaint_id,
    category: row.category,
    description: row.description,
    location: row.location,
    district: row.district,
    dept_name: row.dept_name,
    status: row.status,
    priority: row.priority,
    created_at: sqlDate(row.created_at),
    updated_at: sqlDate(row.updated_at),
  };
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const pathname = new URL(req.url, 'http://local').pathname;
  const query = new URL(req.url, 'http://local').searchParams;
  if (req.method === 'GET' && pathname.replace(/\/$/, '') === '/api/complaints' && query.get('path') === 'meta') {
    return json(res, 200, { categories: CATEGORIES, districts: DISTRICTS });
  }
  if (req.method === 'POST' && pathname.replace(/\/$/, '') === '/api/complaints') {
    if (rateLimit(`complaint-submit:${clientIp(req)}`, 5, 60_000)) {
      return json(res, 429, { error: 'Too many complaints were submitted. Please wait a minute.' });
    }
    try {
      if (String(req.headers['content-type'] || '').includes('multipart/form-data')) await parseForm(req, res);
      if (req.file) {
        return json(res, 400, { error: 'Photo uploads are not available on this deployment yet. Remove the photo and submit the complaint again.' });
      }
      const name = String(req.body?.name || '').replace(/[<>]/g, '').trim();
      const phone = String(req.body?.phone || '').replace(/\D/g, '').slice(-10);
      if (name.length < 2 || name.length > 80) return json(res, 400, { error: 'Please enter your name.' });
      if (!/^[6-9]\d{9}$/.test(phone)) return json(res, 400, { error: 'Please enter a valid 10-digit mobile number.' });
      const result = await submitComplaintToSupabase({
        p_category: String(req.body?.category || ''),
        p_description: String(req.body?.description || '').replace(/[<>]/g, '').trim(),
        p_location: String(req.body?.location || '').replace(/[<>]/g, '').trim(),
        p_district: String(req.body?.district || ''),
        p_name_encrypted: encryptPrivate(name, 'complaint:name'),
        p_phone_encrypted: encryptPrivate(phone, 'complaint:phone'),
      });
      return json(res, 201, result);
    } catch (error) {
      const badRequest = error?.status === 400 || error?.code === 'LIMIT_FILE_SIZE'
        || error?.code === 'LIMIT_UNEXPECTED_FILE' || error?.message?.startsWith('Only JPG');
      if (badRequest) return json(res, 400, { error: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5 MB.' : error.message });
      if (error?.code === 'PII_KEY_MISSING' || error?.code === 'PII_KEY_INVALID') {
        return json(res, 503, { error: 'Secure complaint storage is not configured. Please contact the site administrator.' });
      }
      console.error('[complaints/create]', error.message);
      return json(res, 503, { error: 'Complaint submission is temporarily unavailable. Please try again.' });
    }
  }

  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });
  const match = pathname.match(/^\/api\/complaints\/track\/([^/]+)\/?$/);
  if (!match) return json(res, 404, { error: 'Complaint endpoint not found.' });
  let id;
  try { id = decodeURIComponent(match[1]).trim().toUpperCase().slice(0, 20); }
  catch { return json(res, 400, { error: 'Invalid complaint ID.' }); }

  let row = null;
  try { row = await fetchDemoComplaintFromSupabase(id); }
  catch (error) { console.error('[complaints/track] Supabase lookup failed:', error.message); }
  if (row) {
    return json(res, 200, {
      complaint: publicComplaint(row),
      updates: (Array.isArray(row.updates) ? row.updates : []).map((item) => ({ ...item, created_at: sqlDate(item.created_at) })),
    });
  }
  try {
    const tracking = await fetchComplaintTrackingFromSupabase(id);
    if (tracking) return json(res, 200, tracking);
  } catch (error) { console.error('[complaints/track] Supabase complaint lookup failed:', error.message); }
  row = getDemoComplaint(id);
  if (!row) return json(res, 404, { error: 'No complaint found with that ID. Please check and try again.' });

  const complaint = publicComplaint(row);
  const updates = (Array.isArray(row.updates) ? row.updates : []).map((item) => ({
    status: item.status,
    note: item.note || '',
    created_by: item.created_by || 'System',
    created_at: sqlDate(item.created_at),
  }));
  return json(res, 200, { complaint, updates });
}
