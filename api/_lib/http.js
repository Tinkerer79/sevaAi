// Small helpers shared by the Vercel serverless handlers.
export function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export function json(res, status, obj) {
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(obj));
}

export function clientIp(req) {
  const fwd = req.headers?.['x-forwarded-for'];
  return (typeof fwd === 'string' ? fwd.split(',')[0].trim() : '') || req.socket?.remoteAddress || 'anon';
}

// In-memory per-window rate limiter (per lambda instance — fine for demo scale).
const buckets = new Map();
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
  return b.count > max;
}
