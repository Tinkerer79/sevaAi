// GET /api/health — deployment status (mirrors the Express route).
import { health as aiHealth } from './_lib/ai.js';
import { cors, json } from './_lib/http.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const ai = aiHealth();
  json(res, 200, {
    ok: true,
    app: 'SevaManipur AI',
    prototype: 'AI4SEVA Hackathon 2026',
    model: ai.model,
    strategy: ai.strategy,
    keysConfigured: ai.keysConfigured,
    runtime: 'vercel-serverless',
  });
}
