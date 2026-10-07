// GET /api/complaints/meta — static category/district lists for the Report form.
// Kept in sync with server/routes/complaints.js (both consume server/demoData.js
// for the dataset; these constants are duplicate-by-design to keep this
// function free of SQLite/multer imports).
import { cors, json } from '../_lib/http.js';

const COMPLAINT_CATEGORIES = {
  road_damage: { label: 'Road damage', dept: 'Public Works Department (PWD)' },
  garbage_waste: { label: 'Garbage / waste', dept: 'Municipal Administration (MAHUD)' },
  streetlight: { label: 'Streetlight', dept: 'Electricity Department (MSPDCL)' },
  water_supply: { label: 'Water supply', dept: 'Public Health Engineering (PHED)' },
  drainage: { label: 'Drainage', dept: 'Public Health Engineering (PHED)' },
  public_infrastructure: { label: 'Public infrastructure', dept: 'Public Works Department (PWD)' },
  other: { label: 'Other', dept: 'Deputy Commissioner (DC) Office' },
};

const DISTRICTS = [
  'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam',
  'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati',
  'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul',
];

export default async function handler(req, res) {
  if (cors(req, res)) return;
  json(res, 200, {
    categories: Object.entries(COMPLAINT_CATEGORIES).map(([k, v]) => ({ key: k, label: v.label })),
    districts: DISTRICTS,
  });
}
