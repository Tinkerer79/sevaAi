// Shared services/schemes handler logic. Both the base-path entry
// (api/services.js, api/schemes.js) and the catch-all entry
// (api/services/[[...path]].js, api/schemes/[[...path]].js) delegate here,
// because Vercel's optional catch-all matches sub-paths but NOT the bare
// directory base (/api/services).
// The sub-path is parsed from req.url — the current Vercel Node runtime does
// not inject catch-all route params into req.query.
import { serviceRows, schemeRows, parseService, parseScheme } from './store.js';
import { cors, json } from './http.js';

const OCCUPATIONS = ['student', 'farmer', 'business', 'salaried', 'unemployed', 'homemaker', 'daily_wage', 'street_vendor', 'senior_citizen'];
const slice80 = (s) => String(s || '').trim().toLowerCase().slice(0, 80);

function subPath(req, prefix) {
  const u = new URL(req.url, 'http://local');
  return decodeURIComponent(u.pathname)
    .replace(new RegExp(`^/api/${prefix}/?`), '')
    .replace(/\/+$/, '');
}

export async function servicesHandler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });

  const u = new URL(req.url, 'http://local');
  const route = subPath(req, 'services');
  const search = slice80(u.searchParams.get('search'));
  const category = String(u.searchParams.get('category') || '').trim().slice(0, 40);

  if (route === 'categories') return json(res, 200, { categories: CATEGORIES });

  let rows = serviceRows;
  if (category && category !== 'All') rows = rows.filter((s) => s.category === category);
  if (search) {
    rows = rows.filter((s) =>
      s.name.toLowerCase().includes(search) ||
      s.description.toLowerCase().includes(search) ||
      s.keywords.toLowerCase().includes(search) ||
      s.category.toLowerCase().includes(search));
  }

  if (!route) {
    const services = rows
      .map(({ documents, steps, keywords, ...list }) => list) // same columns as the SQL SELECT
      .sort((a, b) => a.name.localeCompare(b.name));
    return json(res, 200, { services });
  }

  const s = serviceRows.find((x) => x.slug === route.slice(0, 80));
  if (!s) return json(res, 404, { error: 'Service not found.' });
  return json(res, 200, { service: parseService(s) });
}

const CATEGORIES = [
  'Certificates', 'Education', 'Health', 'Agriculture', 'Transport',
  'Employment', 'Business', 'Social Welfare', 'Land & Revenue', 'Civic Services',
];

export async function schemesHandler(req, res) {
  if (cors(req, res)) return;

  const u = new URL(req.url, 'http://local');
  const route = subPath(req, 'schemes');

  if (req.method === 'POST' && route === 'match') return match(req, res);
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });

  const search = slice80(u.searchParams.get('search'));
  let rows = schemeRows;
  if (search) {
    rows = rows.filter((s) =>
      s.name.toLowerCase().includes(search) ||
      s.benefits.toLowerCase().includes(search) ||
      s.keywords.toLowerCase().includes(search));
  }

  if (!route) {
    return json(res, 200, { schemes: rows.map(listRow).sort((a, b) => a.name.localeCompare(b.name)) });
  }

  const s = schemeRows.find((x) => x.slug === route.slice(0, 80));
  if (!s) return json(res, 404, { error: 'Scheme not found.' });
  return json(res, 200, { scheme: parseScheme(s) });
}

// The SQL SELECT for the list returns only these columns; parse() then fills
// documents/occupations/keywords with empty arrays — replicated exactly.
function listRow({ documents, occupations, keywords, process, official_link, max_income, min_age, max_age, department_id, ...list }) {
  return { ...list, documents: [], occupations: [], keywords: [] };
}

function match(req, res) {
  const age = Math.min(120, Math.max(0, Number(req.body?.age) || 0));
  const occupation = OCCUPATIONS.includes(req.body?.occupation) ? req.body.occupation : null;
  const area = ['rural', 'urban'].includes(req.body?.area) ? req.body.area : 'any';
  const income = req.body?.income === '' || req.body?.income == null ? null : Math.max(0, Number(req.body.income) || 0);

  const matches = schemeRows.map((raw) => {
    const s = parseScheme(raw);
    const reasons = [];
    let score = 0;

    const ageOk = (s.min_age == null || age >= s.min_age) && (s.max_age == null || age <= s.max_age);
    const occOk = !occupation || s.occupations.includes(occupation) || s.occupations.includes('any');
    const areaOk = s.area === 'any' || s.area === area;
    const incomeOk = s.max_income == null || income == null || income <= s.max_income;

    if (ageOk) score += 2;
    if (occOk) score += 3;
    if (areaOk) score += 1;
    if (incomeOk) score += 2;

    if (ageOk && req.body?.age != null && req.body?.age !== '') reasons.push(`age ${age} fits the ${s.min_age ?? 'any'}–${s.max_age ?? 'any'} range`);
    if (occOk && occupation) reasons.push(s.occupations.includes('any') ? `no occupation restriction` : `open to ${occupation}s`);
    if (incomeOk && s.max_income && income != null) reasons.push(`income ₹${income} is within the ₹${s.max_income} cap`);
    if (areaOk && s.area !== 'any') reasons.push(`designed for ${s.area} residents`);
    if (s.keywords.includes(occupation)) score += 1;

    return { ...s, _score: score, _reasons: reasons, _eligible: ageOk && occOk && areaOk && incomeOk };
  });

  matches.sort((a, b) => b._score - a._score || a.name.localeCompare(b.name));
  const eligible = matches.filter((m) => m._eligible && m._score >= 4);
  const near = matches.filter((m) => !eligible.includes(m) && m._score >= 3).slice(0, 3);

  json(res, 200, {
    results: eligible.map(({ _score, ...r }) => ({ ...r, matchReasons: r._reasons })),
    related: near.map(({ _score, _reasons, ...r }) => r),
  });
}
