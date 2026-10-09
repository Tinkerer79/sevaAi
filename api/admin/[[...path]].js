// Admin read and AI-summary routes for the Vercel deployment.
// Every endpoint verifies the signed-in Supabase user's server-managed admin role.
import { generate, AiBusyError, AiRequestError, health } from '../_lib/ai.js';
import { fetchAdminComplaintsFromSupabase, rpcAdminComplaintDetail, rpcAdminUpdateComplaint, verifySupabaseAdmin } from '../_lib/supabase.js';
import { cors, json, clientIp, rateLimit } from '../_lib/http.js';
import { decryptPrivate } from '../_lib/pii.js';

const STATUSES = ['Submitted', 'Received', 'Assigned', 'Under Review', 'Resolved'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const LANGUAGE_NAMES = { en: 'English', hi: 'Hindi', mni: 'Meiteilon (Manipuri), written in Bengali script' };

function summarizeStats(rows) {
  const by = (field) => rows.reduce((out, row) => {
    const key = row[field] || 'Unknown';
    out[key] = (out[key] || 0) + 1;
    return out;
  }, {});
  const counts = (field) => Object.entries(by(field)).map(([key, n]) => ({ key, n }));
  const byStatus = by('status');
  const byPriority = by('priority');
  const days = {};
  for (const row of rows) {
    const day = String(row.created_at || '').slice(0, 10);
    if (day) days[day] = (days[day] || 0) + 1;
  }
  const ai = health();
  return {
    total: rows.length,
    pending: (byStatus.Submitted || 0) + (byStatus.Received || 0),
    assigned: byStatus.Assigned || 0,
    underReview: byStatus['Under Review'] || 0,
    resolved: byStatus.Resolved || 0,
    highPriority: (byPriority.High || 0) + (byPriority.Critical || 0),
    byStatus, byPriority, byCategory: counts('category'), byDistrict: counts('district'),
    overTime: Object.entries(days).sort(([a], [b]) => a.localeCompare(b)).map(([day, n]) => ({ day, n })),
    users: 0,
    aiHealth: {
      active: ai.keysActive, total: ai.keysConfigured,
      strategy: process.env.AI_ROTATION_STRATEGY || 'round_robin', model: ai.model,
    },
  };
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || !(await verifySupabaseAdmin(token).catch(() => false))) {
    return json(res, 403, { error: 'Administrator access required.' });
  }

  const url = new URL(req.url, 'http://local');
  const path = decodeURIComponent(url.pathname.replace(/^\/api\/admin\/?/, '').replace(/\/$/, ''));
  try {
    const rows = await fetchAdminComplaintsFromSupabase(token);
    if (!Array.isArray(rows)) return json(res, 503, { error: 'Complaint data is temporarily unavailable.' });

    if (req.method === 'GET' && path === 'stats') return json(res, 200, summarizeStats(rows));

    if (req.method === 'GET' && path === 'complaints') {
      const status = url.searchParams.get('status') || '';
      const search = (url.searchParams.get('search') || '').trim().toLowerCase();
      const complaints = rows.filter((row) => (!STATUSES.includes(status) || row.status === status)
        && (!search || `${row.complaint_id} ${row.category} ${row.location}`.toLowerCase().includes(search)));
      return json(res, 200, { complaints, statuses: STATUSES, priorities: PRIORITIES });
    }

    if (req.method === 'GET' && path === 'departments') {
      const departments = [...new Set(rows.map((row) => row.dept_name).filter(Boolean))].sort().map((name, id) => ({ id: id + 1, name }));
      return json(res, 200, { departments });
    }

    const detailMatch = path.match(/^complaints\/([^/]+)$/);
    if (req.method === 'PATCH' && detailMatch) {
      const result = await rpcAdminUpdateComplaint(token, detailMatch[1], req.body || {});
      return json(res, 200, { complaint: result?.complaint || result });
    }

    if (req.method === 'GET' && detailMatch) {
      const result = await rpcAdminComplaintDetail(token, detailMatch[1]);
      if (!result) return json(res, 404, { error: 'Complaint not found.' });
      const complaint = result.complaint || {};
      if (complaint.name_encrypted) {
        complaint.name = decryptPrivate(complaint.name_encrypted, 'complaint:name');
        complaint.phone = decryptPrivate(complaint.phone_encrypted, 'complaint:phone');
        delete complaint.name_encrypted;
        delete complaint.phone_encrypted;
      }
      return json(res, 200, { ...result, statuses: STATUSES, priorities: PRIORITIES });
    }

    if (req.method === 'POST' && path === 'complaints/summary') {
      if (rateLimit(`admin-summary:${clientIp(req)}`, 6, 60_000)) {
        return json(res, 429, { error: 'Please wait before requesting another summary.' });
      }
      if (!health().keysConfigured) return json(res, 503, { error: 'Seva AI is not configured.', code: 'AI_NOT_CONFIGURED' });
      const language = LANGUAGE_NAMES[req.body?.language] ? req.body.language : 'en';
      if (rows.length === 0) return json(res, 200, { summary: 'No complaints have been submitted yet.', count: 0 });
      const systemInstruction = `You summarize civic complaint records for an administrator of the SevaManipur prototype. Write in ${LANGUAGE_NAMES[language]}. Summarize only patterns supported by the supplied records: total complaints, common issues and districts, current status and urgent priorities. Give practical triage suggestions without claiming a department has acted unless the status says so. Do not include personal names, phone numbers, or invent causes or facts. Keep the summary under 220 words and use concise headings and bullets.`;
      const safeRows = rows.map(({ complaint_id, category, description, location, district, dept_name, status, priority, created_at, is_demo }) => ({
        complaint_id, category, description, location, district, department: dept_name, status, priority, created_at, demo_record: Boolean(is_demo),
      }));
      const result = await generate({ systemInstruction, contents: [{ role: 'user', parts: [{ text: `Summarize every complaint in this data set (${safeRows.length} records):\n${JSON.stringify(safeRows)}` }] }] });
      return json(res, 200, { summary: result.text, count: rows.length });
    }

    return json(res, 404, { error: 'Admin endpoint not found.' });
  } catch (error) {
    if (error instanceof AiBusyError) return json(res, 503, { error: 'Seva AI is temporarily busy. Please try again shortly.', code: 'AI_BUSY' });
    if (error instanceof AiRequestError) return json(res, 400, { error: 'Seva AI could not summarize the complaint data.' });
    console.error('[admin]', error.message);
    return json(res, 500, { error: 'Could not load the admin data.' });
  }
}
