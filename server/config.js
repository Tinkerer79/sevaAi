import 'dotenv/config';

const env = process.env;

// Collect GEMINI_API_KEY_1..N + optional GEMINI_KEY_<n>_LABEL — supports any number of keys.
function collectKeys() {
  const keys = [];
  for (let i = 1; i <= 50; i++) {
    const secret = env[`GEMINI_API_KEY_${i}`];
    if (secret && secret.trim()) {
      keys.push({ secret: secret.trim(), label: (env[`GEMINI_KEY_${i}_LABEL`] || `Key ${i}`).trim() });
    }
  }
  // Fallback: single GEMINI_API_KEY
  if (!keys.length && env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim()) {
    keys.push({ secret: env.GEMINI_API_KEY.trim(), label: 'Key 1' });
  }
  return keys;
}

export const config = {
  port: Number(env.PORT || 8787),
  jwtSecret: env.JWT_SECRET || 'sevamanipur-dev-secret-change-me',
  geminiModel: (env.GEMINI_MODEL || 'gemini-2.5-flash').trim(),
  rotationStrategy: (env.AI_ROTATION_STRATEGY || 'failover').trim().toLowerCase(),
  keys: collectKeys(),
  ai: {
    timeoutMs: 30_000,
    maxPromptChars: 2000,
    maxOutputTokens: 2048,
    cooldownBaseMs: 60_000,
    cooldownMaxMs: 600_000,
    serverErrorCooldownMs: 15_000,
  },
  limits: {
    // AI chat: per user/IP
    aiPerMinute: 10,
    // All API routes: per IP
    apiPerWindow: 400,
    apiWindowMs: 15 * 60_000,
    maxUploadBytes: 5 * 1024 * 1024,
  },
  dirs: {
    data: new URL('../data/', import.meta.url).pathname,
    uploads: new URL('../uploads/', import.meta.url).pathname,
    dist: new URL('../dist/', import.meta.url).pathname,
  },
};
