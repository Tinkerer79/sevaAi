// API Key Manager — server-side only. Never exposes raw keys.
// Tracks health per key: active/cooldown/invalid/disabled, requests, errors,
// last success/error, cooldown with exponential backoff on HTTP 429.
// Rotation strategies: failover (default) | round_robin.

const mask = (k) => (k ? '••••' + k.slice(-4) : '—');

export class KeyManager {
  constructor(keys, strategy) {
    this.keys = keys.map((k, i) => ({
      id: `key-${i + 1}`,
      label: k.label,
      secret: k.secret,
      masked: mask(k.secret),
      status: 'active', // active | cooldown | invalid | disabled
      cooldownUntil: 0,
      cooldownCount: 0,
      requests: 0,
      errors: 0,
      lastError: null,
      lastErrorAt: null,
      lastSuccessAt: null,
      lastUsedAt: null,
      lastLatencyMs: null,
    }));
    this.strategy = strategy === 'round_robin' ? 'round_robin' : 'failover';
    this.rr = 0;
    this.createdAt = Date.now();
  }

  setStrategy(s) {
    if (s === 'round_robin' || s === 'failover') this.strategy = s;
    return this.strategy;
  }

  // Keys usable right now — cooldowns that elapsed are revived automatically.
  available() {
    const now = Date.now();
    return this.keys.filter((k) => {
      if (k.status === 'cooldown' && now >= k.cooldownUntil) {
        k.status = 'active';
        k.cooldownUntil = 0;
      }
      return k.status === 'active';
    });
  }

  pick(exclude = new Set()) {
    const avail = this.available().filter((k) => !exclude.has(k.id));
    if (!avail.length) return null;
    if (this.strategy === 'round_robin') {
      const k = avail[this.rr % avail.length];
      this.rr = (this.rr + 1) % Number.MAX_SAFE_INTEGER;
      return k;
    }
    return avail[0]; // failover: first healthy key in config order
  }

  markUsed(k) {
    k.requests += 1;
    k.lastUsedAt = Date.now();
  }

  markSuccess(k, latencyMs) {
    k.lastSuccessAt = Date.now();
    k.lastLatencyMs = latencyMs;
    k.cooldownCount = 0;
    if (k.status === 'cooldown') k.status = 'active';
  }

  // HTTP 429 → put key into cooldown with exponential backoff, try next key.
  markRateLimited(k) {
    k.errors += 1;
    k.lastError = 'Rate limited (HTTP 429)';
    k.lastErrorAt = Date.now();
    k.cooldownCount += 1;
    const backoff = Math.min(
      60_000 * 2 ** (k.cooldownCount - 1),
      600_000
    );
    k.status = 'cooldown';
    k.cooldownUntil = Date.now() + backoff;
    return backoff;
  }

  // HTTP 5xx / timeout / network → brief cooldown so failover skips it for now.
  markServerError(k, message) {
    k.errors += 1;
    k.lastError = message || 'Server error / timeout';
    k.lastErrorAt = Date.now();
    k.status = 'cooldown';
    k.cooldownUntil = Date.now() + 15_000;
  }

  // Invalid key (401/403/API_KEY_INVALID) → disable until an admin re-enables it.
  markInvalid(k, message) {
    k.errors += 1;
    k.lastError = message || 'Invalid API key';
    k.lastErrorAt = Date.now();
    k.status = 'invalid';
    k.cooldownUntil = 0;
  }

  markBadResponse(k, message) {
    k.errors += 1;
    k.lastError = message || 'Unexpected API response';
    k.lastErrorAt = Date.now();
  }

  adminEnable(id) {
    const k = this.keys.find((x) => x.id === id);
    if (!k) return null;
    k.status = 'active';
    k.cooldownUntil = 0;
    k.cooldownCount = 0;
    return k;
  }

  adminDisable(id) {
    const k = this.keys.find((x) => x.id === id);
    if (!k) return null;
    k.status = 'disabled';
    k.cooldownUntil = 0;
    return k;
  }

  adminReset(id) {
    const k = this.keys.find((x) => x.id === id);
    if (!k) return null;
    k.status = 'active';
    k.cooldownUntil = 0;
    k.cooldownCount = 0;
    return k;
  }

  adminResetStats(id) {
    const k = this.keys.find((x) => x.id === id);
    if (!k) return null;
    Object.assign(k, {
      requests: 0, errors: 0, lastError: null, lastErrorAt: null,
      lastSuccessAt: null, lastUsedAt: null, lastLatencyMs: null,
    });
    return k;
  }

  // Admin view — secrets never leave this module.
  snapshot() {
    const now = Date.now();
    return this.keys.map(({ secret, ...k }) => ({
      ...k,
      cooldownRemainingMs: k.status === 'cooldown' ? Math.max(0, k.cooldownUntil - now) : 0,
    }));
  }

  summary() {
    const s = this.snapshot();
    return {
      total: s.length,
      active: s.filter((k) => k.status === 'active').length,
      cooldown: s.filter((k) => k.status === 'cooldown').length,
      invalid: s.filter((k) => k.status === 'invalid').length,
      disabled: s.filter((k) => k.status === 'disabled').length,
      strategy: this.strategy,
      model: null, // filled by caller
    };
  }
}
