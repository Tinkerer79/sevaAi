// Fetch wrapper — same-origin cookies (httpOnly JWT) authenticate every call.
// API_BASE lets the static frontend (e.g. on Vercel) point at a separately
// hosted backend via VITE_API_BASE. Empty by default: same origin as always.
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

export async function api(path, { method = 'GET', body, formData, headers = {} } = {}) {
  // Include the httpOnly session cookie when the frontend and API are hosted
  // on different origins. Same-origin requests work with either setting.
  const opts = { method, headers: { ...headers }, credentials: 'include' };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  if (formData) opts.body = formData; // browser sets multipart boundary

  let res;
  try {
    res = await fetch(API_BASE + path, opts);
  } catch {
    throw new ApiError('Network error — please check your connection.', 0);
  }

  let data = null;
  try { data = await res.json(); } catch { /* empty or non-JSON body */ }

  // Vercel can serve the SPA index.html with a 200 when an API function is
  // missing or a rewrite catches /api/*. Treat that as an API failure instead
  // of returning null and letting a page crash while reading response fields.
  if (data === null) {
    throw new ApiError('The server returned an unexpected response. Please try again or refresh the page.', res.status, 'INVALID_RESPONSE');
  }

  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data?.code);
  }
  return data;
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
