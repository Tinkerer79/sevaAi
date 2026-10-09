// Consolidated auth endpoints keep the Hobby deployment below Vercel's
// serverless-function limit while preserving /api/auth/* URLs.
import { cors, json } from '../_lib/http.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const pathname = String(req.url || '').split('?')[0];
  const endpoint = decodeURIComponent(pathname.replace(/^\/api\/auth\/?/, '').replace(/\/$/, ''));

  if (endpoint === 'config') {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });

    const url = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
    res.setHeader('Cache-Control', 'no-store');
    return json(res, 200, { enabled: Boolean(url && publishableKey), url, publishableKey });
  }

  if (endpoint === 'login' || endpoint === 'register') {
    return json(res, 501, {
      error: 'Login and registration are not available through the legacy backend on this deployment. Use Supabase Auth or deploy the full backend.',
      code: 'BACKEND_REQUIRED',
    });
  }

  if (endpoint === 'logout') return json(res, 200, { ok: true });
  if (endpoint === 'me') return json(res, 200, { user: null });
  return json(res, 404, { error: 'Not found.' });
}
