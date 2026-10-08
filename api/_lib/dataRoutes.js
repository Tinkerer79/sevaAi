// Shared services/schemes handler logic. Both the base-path entry
// (api/services.js, api/schemes.js) and the catch-all entry
// (api/services/[[...path]].js, api/schemes/[[...path]].js) delegate here,
// because Vercel's optional catch-all matches sub-paths but NOT the bare
// directory base (/api/services).
// The sub-path is parsed from req.url — the current Vercel Node runtime does
// not inject catch-all route params into req.query.
import { serviceRows, schemeRows, parseService, parseScheme } from './store.js';
import { cors, json } from './http.js';
import { fetchSchemesFromSupabase } from './supabase.js';

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
  let rows;
  try {
    rows = await getSchemeCatalog();
  } catch (error) {
    console.error('Supabase scheme catalog request failed:', error.message);
    return json(res, 503, { error: 'Scheme catalog is temporarily unavailable.' });
  }
  if (search) {
    rows = rows.filter((s) =>
      s.name.toLowerCase().includes(search) ||
      s.benefits.toLowerCase().includes(search) ||
      s.keywords.join(' ').toLowerCase().includes(search) ||
      s.dept_name.toLowerCase().includes(search));
  }

  if (!route) {
    return json(res, 200, { schemes: rows.sort((a, b) => a.name.localeCompare(b.name)) });
  }

  const s = rows.find((x) => x.slug === route.slice(0, 80));
  if (!s) return json(res, 404, { error: 'Scheme not found.' });
  return json(res, 200, { scheme: s });
}

const CENTRAL_SCHEMES = new Set([
  'post-matric-st-scholarship', 'pre-matric-scholarship-minorities', 'pm-kisan-scheme',
  'pm-awas-gramin', 'pm-awas-urban', 'old-age-pension-scheme', 'widow-pension-scheme',
  'pm-ujjwala', 'kcc-farmers', 'mgnrega-employment', 'pm-svanidhi', 'pmegp-business', 'phd-scholarship',
]);

function legacyRows(includeReplacedPensions = true) {
  return schemeRows
    .filter((s) => includeReplacedPensions || !['old-age-pension-scheme', 'widow-pension-scheme'].includes(s.slug))
    .map((raw) => {
      const s = parseScheme(raw);
      return {
        ...s,
        scope: CENTRAL_SCHEMES.has(s.slug) ? 'central_in_manipur' : 'manipur_state',
        department: s.dept_name || 'Government department',
        summary: s.eligibility,
        source_url: s.official_link,
        source_note: 'Existing prototype sample. Recheck details against current official guidance.',
        last_verified_at: null,
        application_status: 'unknown',
        data_status: 'legacy_demo',
      };
    });
}

function databaseRow(row) {
  const rules = row.eligibility_rules || {};
  const minAge = rules.min_age ?? (rules.min_age_exclusive != null ? rules.min_age_exclusive + 1 : null);
  return {
    id: row.slug,
    slug: row.slug,
    name: row.name,
    dept_name: row.department,
    department: row.department,
    scope: row.scope,
    summary: row.summary,
    benefits: row.benefits,
    eligibility: row.eligibility_text,
    eligibility_rules: rules,
    documents: Array.isArray(row.documents) ? row.documents : [],
    process: Array.isArray(row.application_process) ? row.application_process.join(' ') : '',
    application_process: Array.isArray(row.application_process) ? row.application_process : [],
    official_link: row.official_link,
    source_url: row.source_url,
    source_note: row.source_note,
    last_verified_at: row.last_verified_at,
    application_status: row.application_status,
    data_status: row.data_status,
    is_demo: row.data_status === 'legacy_demo' ? 1 : 0,
    min_age: minAge,
    max_age: rules.max_age ?? null,
    occupations: ['any'],
    area: 'any',
    max_income: rules.income_max_inr_year ?? null,
    keywords: `${row.name} ${row.summary || ''} ${row.department}`.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
  };
}

export async function getSchemeCatalog() {
  const rows = await fetchSchemesFromSupabase();
  if (rows === null) return legacyRows(true);
  return [...rows.map(databaseRow), ...legacyRows(false)];
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
