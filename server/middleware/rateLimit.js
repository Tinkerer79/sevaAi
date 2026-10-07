// Application-level rate limiting (in-memory, per process).
const buckets = new Map();

// Periodically drop expired buckets so the map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) if (now > b.resetAt) buckets.delete(key);
}, 60_000).unref();

export function rateLimit({ windowMs, max, keyFn, message }) {
  return (req, res, next) => {
    const key = `${keyFn(req)}`;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || now > b.resetAt) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(key, b);
    }
    b.count += 1;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - b.count));
    if (b.count > max) {
      const retryAfter = Math.ceil((b.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ error: message || 'Too many requests. Please try again shortly.' });
    }
    next();
  };
}

export const apiLimiter = (config) =>
  rateLimit({
    windowMs: config.limits.apiWindowMs,
    max: config.limits.apiPerWindow,
    keyFn: (req) => `api:${req.ip}`,
    message: 'Too many requests from this network. Please try again in a few minutes.',
  });

export const aiLimiter = (config) =>
  rateLimit({
    windowMs: 60_000,
    max: config.limits.aiPerMinute,
    keyFn: (req) => `ai:${req.user ? 'u' + req.user.id : 'ip' + req.ip}`,
    message: 'You are sending messages too quickly. Please wait a few seconds and try again.',
  });
