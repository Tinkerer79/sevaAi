// Local test harness for the Vercel serverless functions in api/.
// Usage: node --env-file=.env scripts/test-serverless.mjs
// Mimics the Vercel Node runtime: req { method, url, query (incl. catch-all
// path segments), body, headers }, res { status().setHeader().end() }.
import * as servicesHandler from '../api/services/[[...path]].js';
import * as servicesBase from '../api/services.js';
import * as schemesHandler from '../api/schemes/[[...path]].js';
import * as schemesBase from '../api/schemes.js';
import * as contactsHandler from '../api/contacts.js';
import * as metaHandler from '../api/complaints/meta.js';
import * as healthHandler from '../api/health.js';
import * as meHandler from '../api/auth/me.js';
import * as loginHandler from '../api/auth/login.js';
import * as chatHandler from '../api/ai/chat.js';

const get = (mod) => mod.default;
let pass = 0, fail = 0;

function mockReq(method, url, body, { pathParam } = {}) {
  const u = new URL('http://local' + url);
  const query = Object.fromEntries(u.searchParams.entries());
  if (pathParam !== undefined) query.path = pathParam; // mimic Vercel catch-all param
  return { method, url, query, body, headers: { 'x-forwarded-for': '127.0.0.1' }, socket: { remoteAddress: '127.0.0.1' } };
}

function mockRes() {
  const res = {
    statusCode: 0, headers: {}, raw: null,
    status(c) { this.statusCode = c; return this; },
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; },
    end(b) { this.raw = b ?? ''; return this; },
    json(value) { this.statusCode = this.statusCode || 200; this.raw = JSON.stringify(value); return this; },
  };
  return res;
}

async function call(mod, method, url, body, opts) {
  const res = mockRes();
  await get(mod)(mockReq(method, url, body, opts), res);
  let json = null;
  try { json = JSON.parse(res.raw); } catch { /* non-JSON */ }
  return { status: res.statusCode, json };
}

function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

console.log('— static data endpoints —');
{
  const r = await call(healthHandler, 'GET', '/api/health');
  check('health 200 + keys', r.status === 200 && r.json.ok === true && r.json.keysConfigured >= 1, JSON.stringify(r.json));
}
{
  const r = await call(servicesHandler, 'GET', '/api/services');
  check('services list 200, 22 rows', r.status === 200 && r.json.services?.length === 22, `got ${r.json.services?.length}`);
  check('services list shape (no documents leak, dept_name present)', r.json.services[0].dept_name && r.json.services[0].documents === undefined);
  check('services sorted by name', r.json.services[0].name <= r.json.services[1].name, r.json.services[0].name);
}
{
  const r = await call(servicesHandler, 'GET', '/api/services?search=income');
  check('services search=income', r.status === 200 && r.json.services.some((s) => s.slug === 'income-certificate') && r.json.services.length < 22, `got ${r.json.services?.length}`);
}
{
  const r = await call(servicesHandler, 'GET', '/api/services?category=Health');
  check('services category=Health → 2', r.json.services?.length === 2, `got ${r.json.services?.length}`);
}
{
  const r = await call(servicesHandler, 'GET', '/api/services/categories', null, { pathParam: ['categories'] });
  check('services categories → 10', r.status === 200 && r.json.categories?.length === 10, JSON.stringify(r.json));
}
{
  const r = await call(servicesHandler, 'GET', '/api/services/income-certificate', null, { pathParam: 'income-certificate' });
  check('service detail parses documents/steps', r.status === 200 && r.json.service?.documents?.length === 4 && r.json.service?.steps?.length === 4, JSON.stringify(r.json).slice(0, 120));
  const r404 = await call(servicesHandler, 'GET', '/api/services/nope', null, { pathParam: 'nope' });
  check('service 404', r404.status === 404);
}
{
  const r = await call(schemesHandler, 'GET', '/api/schemes');
  check('schemes list 200, 14 rows, list shape', r.status === 200 && r.json.schemes?.length === 14 && r.json.schemes[0].documents?.length === 0 && r.json.schemes[0].benefits, `got ${r.json.schemes?.length}`);
}
{
  const r = await call(schemesHandler, 'GET', '/api/schemes/cmht-health', null, { pathParam: 'cmht-health' });
  check('scheme detail parsed', r.status === 200 && r.json.scheme?.documents?.length === 3 && r.json.scheme?.occupations?.[0] === 'any', JSON.stringify(r.json).slice(0, 120));
}
{
  const r = await call(schemesHandler, 'POST', '/api/schemes/match', { age: 42, occupation: 'farmer', area: 'rural', income: 180000 }, { pathParam: 'match' });
  const first = r.json.results?.[0];
  check('scheme match: farmer 42 rural ₹1.8L → farmer scheme first', r.status === 200 && first && /KISAN|Kisan|KCC/i.test(first.name), JSON.stringify(r.json.results?.slice(0, 2).map((s) => s.name)));
  check('scheme match: matchReasons present', Array.isArray(first?.matchReasons) && first.matchReasons.length > 0);
}
{
  const r = await call(servicesBase, 'GET', '/api/services');
  check('BASE api/services.js → 22 rows', r.status === 200 && r.json.services?.length === 22, `got ${r.json.services?.length}`);
  const r2 = await call(schemesBase, 'GET', '/api/schemes');
  check('BASE api/schemes.js → 14 rows', r2.status === 200 && r2.json.schemes?.length === 14, `got ${r2.json.schemes?.length}`);
  const r3 = await call(schemesBase, 'POST', '/api/schemes/match', { age: 20, occupation: 'student', area: 'urban' });
  check('BASE api/schemes.js POST match works (URL parsing)', r3.status === 200 && r3.json.results?.length > 0, JSON.stringify(r3.json).slice(0, 100));
}
{
  const r = await call(contactsHandler, 'GET', '/api/contacts');
  check('contacts 200, 14 rows, sorted', r.status === 200 && r.json.contacts?.length === 14 && r.json.contacts[0].department <= r.json.contacts[1].department);
  const r2 = await call(contactsHandler, 'GET', '/api/contacts?district=Imphal%20East');
  check('contacts district filter', r2.json.contacts.every((c) => c.district === 'Imphal East') && r2.json.contacts.length > 0);
}
{
  const r = await call(metaHandler, 'GET', '/api/complaints/meta');
  check('complaints meta: 7 categories + 16 districts', r.status === 200 && r.json.categories?.length === 7 && r.json.districts?.length === 16);
}
{
  const r = await call(meHandler, 'GET', '/api/auth/me');
  check('auth/me → { user: null }', r.status === 200 && r.json.user === null);
  const r2 = await call(loginHandler, 'POST', '/api/auth/login', { email: 'x', password: 'y' });
  check('auth/login → 501 with clear message', r2.status === 501 && /backend/i.test(r2.json.error));
}

console.log('— AI chat (real Gemini call via local keys) —');
{
  const r = await call(chatHandler, 'POST', '/api/ai/chat', { message: 'What is PM-KISAN and who can apply for it?', language: 'en' });
  check('chat 200 with reply', r.status === 200 && (r.json.reply || '').length > 50, `status=${r.status} ${JSON.stringify(r.json).slice(0, 160)}`);
  check('chat reply mentions PM-KISAN (context grounded)', /kisan/i.test(r.json.reply || ''));
  check('chat response shape (servedBy + model, conversationId null)', typeof r.json.servedBy === 'string' && r.json.model && r.json.conversationId === null, JSON.stringify({ servedBy: r.json.servedBy, model: r.json.model }));
}
{
  const r = await call(chatHandler, 'POST', '/api/ai/chat', { message: '   ' });
  check('chat empty message → 400', r.status === 400);
}
{
  const r = await call(chatHandler, 'GET', '/api/ai/chat');
  check('chat GET → 405', r.status === 405);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
