// In-memory row views of the demo dataset, shaped like the SQLite rows the
// Express routes return, so the Vercel serverless endpoints stay
// response-compatible with the full backend.
// (documents/steps/keywords are JSON strings here, exactly like the DB rows;
// handlers parse them the same way server/routes/*.js do.)
import { DEPARTMENTS, SERVICES, SCHEMES, CONTACTS } from '../../server/demoData.js';

export { DEPARTMENTS, SERVICES, SCHEMES, CONTACTS };

// Same is_demo computation the seeder applies on INSERT.
const serviceIsDemo = (s) => ((s.link || s.name.includes('Parivahan')) ? 0 : 1);
const schemeIsDemo = (s) => (s.link ? 0 : 1);

export const serviceRows = SERVICES.map((s, i) => ({
  id: i + 1,
  slug: s.slug,
  name: s.name,
  category: s.category,
  department_id: DEPARTMENTS.findIndex(([name]) => name === s.dept) + 1,
  description: s.description,
  eligibility: s.eligibility,
  documents: JSON.stringify(s.documents),
  steps: JSON.stringify(s.steps),
  official_link: s.link || null,
  keywords: JSON.stringify(s.keywords),
  is_demo: serviceIsDemo(s),
  dept_name: s.dept,
}));

export const schemeRows = SCHEMES.map((s, i) => ({
  id: i + 1,
  slug: s.slug,
  name: s.name,
  department_id: DEPARTMENTS.findIndex(([name]) => name === s.dept) + 1,
  benefits: s.benefits,
  eligibility: s.eligibility,
  documents: JSON.stringify(s.documents),
  process: s.process,
  official_link: s.link || null,
  min_age: s.min_age ?? null,
  max_age: s.max_age ?? null,
  occupations: JSON.stringify(s.occupations),
  area: s.area,
  max_income: s.max_income ?? null,
  keywords: JSON.stringify(s.keywords),
  is_demo: schemeIsDemo(s),
  dept_name: s.dept,
}));

export const contactRows = CONTACTS.map((c, i) => ({
  id: i + 1,
  department: c.department,
  service: c.service,
  phone: c.phone,
  email: c.email || null,
  website: c.website || null,
  office: c.office,
  district: c.district,
  is_demo: c.is_demo,
}));

export const parseService = (row) => ({
  ...row,
  documents: JSON.parse(row.documents || '[]'),
  steps: JSON.parse(row.steps || '[]'),
  keywords: JSON.parse(row.keywords || '[]'),
});

export const parseScheme = (row) => ({
  ...row,
  documents: JSON.parse(row.documents || '[]'),
  occupations: JSON.parse(row.occupations || '[]'),
  keywords: JSON.parse(row.keywords || '[]'),
});
