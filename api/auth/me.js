// GET /api/auth/me — the static deployment has no user database, so every
// visitor is a guest. Returning 200 (instead of 404) keeps page loads quiet.
import { cors, json } from '../_lib/http.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  json(res, 200, { user: null });
}
