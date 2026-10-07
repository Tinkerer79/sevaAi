// POST /api/auth/logout — no-op on the static deployment (no sessions to clear).
import { cors, json } from '../_lib/http.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  json(res, 200, { ok: true });
}
