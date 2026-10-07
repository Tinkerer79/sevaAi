// RAG-lite: ground Seva AI answers in the platform's own services/schemes database.
import { q } from '../db.js';

const STOP = new Set(
  ('a an the and or of for to in on at is are am i me my we you your how what which when where who whom can could should would will do does did with about from as by it its this that these those need needs needed get got getting apply application applying want wanted tell please help me sir madam any some there here also into more most very much many such own same so than then them they he she his her him us our ours out up down over under again once').split(' ')
);

const tokens = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

function parseJson(text, fallback) {
  try { return JSON.parse(text); } catch { return fallback; }
}

function scoreRow(row, qt) {
  let s = 0;
  const hay = `${row.name} ${row.category || ''} ${row.description || ''}`.toLowerCase();
  const kws = parseJson(row.keywords, []);
  for (const t of qt) {
    if ((row.name || '').toLowerCase().includes(t)) s += 6;
    if (kws.includes(t)) s += 4;
    if ((row.category || '').toLowerCase().includes(t)) s += 3;
    if (hay.includes(t)) s += 1;
  }
  return s;
}

function fmtService(s) {
  const docs = parseJson(s.documents, []).map((d) => (typeof d === 'string' ? d : d.item));
  const steps = parseJson(s.steps, []);
  const dept = s.dept_name || '';
  return [
    `SERVICE: ${s.name} [${s.category}] — Department: ${dept}`,
    `Description: ${s.description}`,
    `Eligibility: ${s.eligibility}`,
    `Documents: ${docs.join('; ') || '—'}`,
    `Steps: ${steps.map((x, i) => `${i + 1}) ${x}`).join(' ') || '—'}`,
    `Link: ${s.official_link || 'not available — apply at the department office'}`,
    s.is_demo ? '(demo data)' : '',
  ].filter(Boolean).join('\n');
}

function fmtScheme(s) {
  const docs = parseJson(s.documents, []);
  const occ = parseJson(s.occupations, []);
  return [
    `SCHEME: ${s.name} — Department: ${s.dept_name || ''}`,
    `Benefits: ${s.benefits}`,
    `Eligibility: ${s.eligibility} (age ${s.min_age ?? 'any'}–${s.max_age ?? 'any'}, occupation: ${occ.join('/')}, area: ${s.area}${s.max_income ? `, income up to ₹${s.max_income}` : ''})`,
    `Documents: ${docs.join('; ') || '—'}`,
    `How to apply: ${s.process}`,
    `Link: ${s.official_link || 'not available — apply at the department office'}`,
    s.is_demo ? '(demo data)' : '',
  ].filter(Boolean).join('\n');
}

export function buildContext(question, language) {
  const services = q.all(
    `SELECT s.*, d.name AS dept_name FROM services s LEFT JOIN departments d ON d.id = s.department_id`
  );
  const schemes = q.all(
    `SELECT s.*, d.name AS dept_name FROM schemes s LEFT JOIN departments d ON d.id = s.department_id`
  );

  const qt = tokens(question);
  const topServices = services
    .map((s) => ({ s, score: scoreRow(s, qt) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => fmtService(x.s));
  const topSchemes = schemes
    .map((sc) => ({ sc, score: scoreRow(sc, qt) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => fmtScheme(x.sc));

  const catalog =
    `All services on the platform: ${services.map((s) => s.name).join(', ')}.\n` +
    `All schemes on the platform: ${schemes.map((s) => s.name).join(', ')}.`;

  const matched = [...topServices, ...topSchemes].join('\n\n');
  return [
    `--- CONTEXT (SevaManipur AI platform database; some rows are demo data) ---`,
    catalog,
    matched ? `\nMost relevant entries for this question:\n${matched}` : '\n(No specific entry matched — rely on general procedural guidance and recommend the concerned department.)',
    `--- END CONTEXT ---`,
    `Respond in: ${language}.`,
  ].join('\n');
}

export const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi (हिन्दी, Devanagari script)',
  mni: 'Meiteilon (Manipuri), written in Bengali script',
};
