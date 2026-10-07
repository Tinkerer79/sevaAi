// Catch-all entry for /api/services/<sub-path>. The bare base /api/services is
// handled by api/services.js; shared logic lives in api/_lib/dataRoutes.js
// (the sub-path is parsed from req.url there).
import { servicesHandler } from '../_lib/dataRoutes.js';

export default async function handler(req, res) {
  return servicesHandler(req, res);
}
