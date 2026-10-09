// This endpoint exposes only the Supabase project URL and publishable key,
// which are intended for browser use. Never include a secret/service-role key.
import { cors, json } from '../_lib/http.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });

  const url = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  res.setHeader('Cache-Control', 'no-store');
  json(res, 200, { enabled: Boolean(url && publishableKey), url, publishableKey });
}
