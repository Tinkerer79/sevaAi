// Serverless Gemini client for Vercel — port of server/ai/keyManager.js +
// server/ai/gemini.js, minus the Express bindings. API keys live only in
// Vercel environment variables and never reach the browser.
// Rotation: round_robin (default) | failover, with per-key cooldowns.
const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const STRATEGY = process.env.AI_ROTATION_STRATEGY === 'failover' ? 'failover' : 'round_robin';
const TIMEOUT_MS = 12_000;          // per key attempt (serverless-safe)
const DEADLINE_MS = 25_000;         // total budget per request
const MAX_OUTPUT_TOKENS = 2048;

function collectKeys() {
  const keys = [];
  for (let i = 1; i <= 50; i++) {
    const secret = process.env[`GEMINI_API_KEY_${i}`];
    if (secret && secret.trim()) {
      keys.push({
        id: `key-${i}`,
        label: (process.env[`GEMINI_KEY_${i}_LABEL`] || `Key ${i}`).trim(),
        secret: secret.trim(),
        status: 'active',
        cooldownUntil: 0,
        cooldownCount: 0,
      });
    }
  }
  if (!keys.length && process.env.GEMINI_API_KEY?.trim()) {
    keys.push({ id: 'key-1', label: 'Key 1', secret: process.env.GEMINI_API_KEY.trim(), status: 'active', cooldownUntil: 0, cooldownCount: 0 });
  }
  return keys;
}

// Module scope: warm lambda instances keep cooldown state across invocations.
const keys = collectKeys();
let rr = 0;

function pick(exclude = new Set()) {
  const now = Date.now();
  for (const k of keys) if (k.status === 'cooldown' && now >= k.cooldownUntil) k.status = 'active';
  const avail = keys.filter((k) => k.status === 'active' && !exclude.has(k.id));
  if (!avail.length) return null;
  if (STRATEGY === 'round_robin') {
    const k = avail[rr % avail.length];
    rr = (rr + 1) % Number.MAX_SAFE_INTEGER;
    return k;
  }
  return avail[0];
}

const markRateLimited = (k) => {
  k.cooldownCount += 1;
  k.status = 'cooldown';
  k.cooldownUntil = Date.now() + Math.min(60_000 * 2 ** (k.cooldownCount - 1), 600_000);
};
const markServerError = (k) => { k.status = 'cooldown'; k.cooldownUntil = Date.now() + 15_000; };
const markInvalid = (k) => { k.status = 'invalid'; };

export class AiBusyError extends Error {
  constructor() { super('All AI keys are unavailable'); this.code = 'AI_BUSY'; }
}
export class AiRequestError extends Error {
  constructor(message, status) { super(message); this.code = 'AI_REQUEST_ERROR'; this.status = status; }
}

async function callGemini(secret, { systemInstruction, contents }) {
  const body = { contents, generationConfig: { temperature: 0.4, maxOutputTokens: MAX_OUTPUT_TOKENS } };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
  // 2.5+/3.x "lite"/"flash" models think by default — disable for snappy chat replies.
  if (/2\.5|3\.\d/.test(MODEL)) body.generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_ROOT}/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': secret },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON body */ }

    if (res.ok) {
      const parts = json?.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p) => p.text || '').join('').trim();
      if (!text) {
        const block = json?.promptFeedback?.blockReason;
        return { ok: false, kind: 'bad_response', message: block ? `Blocked: ${block}` : 'Empty AI response' };
      }
      return { ok: true, text };
    }
    const msg = json?.error?.message || `HTTP ${res.status}`;
    if (res.status === 429) return { ok: false, kind: 'rate_limited', message: msg };
    if (res.status === 401 || res.status === 403 || (res.status === 400 && /API[_ ]?KEY/i.test(msg)))
      return { ok: false, kind: 'invalid_key', message: msg };
    if (res.status >= 500) return { ok: false, kind: 'server_error', message: msg };
    return { ok: false, kind: 'request_error', message: msg };
  } catch (err) {
    return { ok: false, kind: err.name === 'AbortError' ? 'timeout' : 'network', message: 'Request timed out or network error' };
  } finally {
    clearTimeout(timer);
  }
}

// Rotate across keys until one succeeds, within the serverless time budget.
export async function generate({ systemInstruction, contents } = {}) {
  const deadline = Date.now() + DEADLINE_MS;
  const tried = new Set();
  const attemptErrors = [];

  for (let i = 0; i < Math.max(1, Math.min(keys.length, 8)); i++) {
    if (Date.now() >= deadline) break;
    const key = pick(tried);
    if (!key) break;
    tried.add(key.id);
    const result = await callGemini(key.secret, { systemInstruction, contents });
    if (result.ok) return { text: result.text.slice(0, 8000), keyLabel: key.label };
    if (result.kind === 'rate_limited') markRateLimited(key);
    else if (result.kind === 'invalid_key') markInvalid(key);
    else markServerError(key);
    attemptErrors.push(`${key.label}: ${result.message.slice(0, 120)}`);
    if (result.kind === 'request_error') throw new AiRequestError(result.message);
  }
  console.error('[AI] All keys exhausted:\n  ' + attemptErrors.join('\n  '));
  throw new AiBusyError();
}

export const health = () => ({
  model: MODEL,
  strategy: STRATEGY,
  keysConfigured: keys.length,
  keysActive: keys.filter((k) => k.status === 'active').length,
});
