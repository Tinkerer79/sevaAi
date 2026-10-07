// Catch-all entry for /api/schemes/<sub-path>. The bare base /api/schemes is
// handled by api/schemes.js; shared logic lives in api/_lib/dataRoutes.js
// (the sub-path is parsed from req.url there).
import { schemesHandler } from '../_lib/dataRoutes.js';

export default async function handler(req, res) {
  return schemesHandler(req, res);
}
