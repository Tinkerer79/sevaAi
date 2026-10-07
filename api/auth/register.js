// POST /api/auth/register — requires the SQLite user database (see api/auth/login.js).
import { cors, json } from '../_lib/http.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  json(res, 501, {
    error: 'Registration is not available on this deployment: it needs the full backend with a database. Browsing services, schemes, contacts and Seva AI work without an account.',
    code: 'BACKEND_REQUIRED',
  });
}
