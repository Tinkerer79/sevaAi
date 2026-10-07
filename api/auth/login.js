// POST /api/auth/login — auth requires the SQLite user database, which a
// serverless/static deployment cannot carry. The full backend (npm start) is
// the supported path for accounts, complaints and saves — see README "Deployment".
import { cors, json } from '../_lib/http.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  json(res, 501, {
    error: 'Login is not available on this deployment: it needs the full backend with a database. Browsing services, schemes, contacts and Seva AI work without an account.',
    code: 'BACKEND_REQUIRED',
  });
}
