// Gemini client — all calls go server-side: Browser → SevaManipur Backend → Key Manager → Gemini.
// Handles: 429 (cooldown + next key), 5xx/timeout (next key), invalid key (disable),
// never retries a key it already failed within the same request.
import { config } from '../config.js';
import { KeyManager } from './keyManager.js';

export const keyManager = new KeyManager(config.keys, config.rotationStrategy);

export class AiBusyError extends Error {
  constructor() {
    super('All AI keys are unavailable');
    this.code = 'AI_BUSY';
  }
}
export class AiRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.code = 'AI_REQUEST_ERROR';
    this.status = status;
  }
}

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

async function callGemini(secret, { systemInstruction, contents, maxOutputTokens, timeoutMs }) {
  const model = config.geminiModel;
  const body = {
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens },
  };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
  // 2.5+ "lite"/"flash" models think by default — disable for snappy chat replies.
  if (/2\.5|3\.\d/.test(model)) body.generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(`${API_ROOT}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': secret },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    const latency = Date.now() - started;
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON body */ }

    if (res.ok) {
      const parts = json?.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p) => p.text || '').join('').trim();
      if (!text) {
        const block = json?.promptFeedback?.blockReason;
        return { ok: false, status: 502, kind: 'bad_response', message: block ? `Blocked: ${block}` : 'Empty AI response' };
      }
      return { ok: true, text, latency };
    }

    const code = json?.error?.status || '';
    const msg = json?.error?.message || `HTTP ${res.status}`;
    if (res.status === 429) return { ok: false, status: 429, kind: 'rate_limited', message: msg };
    if (res.status === 401 || res.status === 403 || (res.status === 400 && /API[_ ]?KEY/i.test(msg)))
      return { ok: false, status: res.status, kind: 'invalid_key', message: msg };
    if (res.status >= 500) return { ok: false, status: res.status, kind: 'server_error', message: msg };
    if (res.status === 400 && thinkingCfgUnsupported(msg)) {
      delete body.generationConfig.thinkingConfig;
      return retryWithoutThinking(secret, body, timeoutMs);
    }
    return { ok: false, status: res.status, kind: 'request_error', message: msg };
  } catch (err) {
    if (err.name === 'AbortError') return { ok: false, status: 0, kind: 'timeout', message: 'Request timed out' };
    return { ok: false, status: 0, kind: 'network', message: err.message || 'Network error' };
  } finally {
    clearTimeout(timer);
  }
}

function thinkingCfgUnsupported(msg) {
  return /thinking|thinkingConfig|thinking_budget|unknown name/i.test(msg || '');
}

async function retryWithoutThinking(secret, body, timeoutMs) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_ROOT}/${encodeURIComponent(config.geminiModel)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': secret },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    const json = await res.json().catch(() => null);
    if (res.ok) {
      const text = (json?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
      if (text) return { ok: true, text, latency: 0 };
      return { ok: false, status: 502, kind: 'bad_response', message: 'Empty AI response' };
    }
    const msg = json?.error?.message || `HTTP ${res.status}`;
    if (res.status === 429) return { ok: false, status: 429, kind: 'rate_limited', message: msg };
    if (res.status === 401 || res.status === 403) return { ok: false, status: res.status, kind: 'invalid_key', message: msg };
    if (res.status >= 500) return { ok: false, status: res.status, kind: 'server_error', message: msg };
    return { ok: false, status: res.status, kind: 'request_error', message: msg };
  } catch {
    return { ok: false, status: 0, kind: 'network', message: 'Network error' };
  } finally {
    clearTimeout(timer);
  }
}

export function applyResult(key, result) {
  if (result.kind === 'rate_limited') keyManager.markRateLimited(key);
  else if (result.kind === 'invalid_key') keyManager.markInvalid(key, result.message);
  else if (result.kind === 'server_error' || result.kind === 'timeout' || result.kind === 'network')
    keyManager.markServerError(key, result.message);
  else keyManager.markBadResponse(key, result.message);
}

// Main entry: rotate across keys until one succeeds.
export async function generate({ systemInstruction, contents, maxOutputTokens, timeoutMs } = {}) {
  maxOutputTokens = maxOutputTokens || config.ai.maxOutputTokens;
  timeoutMs = timeoutMs || config.ai.timeoutMs;
  const tried = new Set();
  const attemptErrors = [];
  const maxAttempts = Math.max(1, Math.min(keyManager.keys.length, 8));

  for (let i = 0; i < maxAttempts; i++) {
    const key = keyManager.pick(tried);
    if (!key) break;
    tried.add(key.id);
    keyManager.markUsed(key);
    const result = await callGemini(key.secret, { systemInstruction, contents, maxOutputTokens, timeoutMs });
    if (result.ok) {
      keyManager.markSuccess(key, result.latency);
      return { text: result.text.slice(0, 8000), keyId: key.id, keyLabel: key.label };
    }
    applyResult(key, result);
    attemptErrors.push(`${key.label}: ${result.message.slice(0, 120)}`);
    // Non-key problems (bad request) won't be fixed by another key — fail fast.
    if (result.kind === 'request_error') throw new AiRequestError(result.message, result.status);
  }
  console.error('[AI] All keys exhausted:\n  ' + attemptErrors.join('\n  '));
  throw new AiBusyError();
}

// Single-key ping for the admin "Test key" action.
export async function testKey(id) {
  const key = keyManager.keys.find((k) => k.id === id);
  if (!key) return null;
  keyManager.markUsed(key);
  const result = await callGemini(key.secret, {
    contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
    maxOutputTokens: 200,
    timeoutMs: 20_000,
  });
  if (result.ok) {
    keyManager.markSuccess(key, result.latency);
    return { ok: true, latencyMs: result.latency, sample: result.text };
  }
  applyResult(key, result);
  return { ok: false, kind: result.kind, message: result.message };
}
