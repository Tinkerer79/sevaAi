// GET/POST /api/schemes — base path entry (Vercel's optional catch-all does not
// match the bare directory base). Logic lives in api/_lib/dataRoutes.js.
import { schemesHandler } from './_lib/dataRoutes.js';

export default async function handler(req, res) {
  return schemesHandler(req, res);
}
