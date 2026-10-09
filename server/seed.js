// Demo data seeding — every row is clearly labelled demo data (is_demo = 1) and
// rendered with a "Demo Data" badge in the UI. No fictional row pretends to be
// official government information.
import bcrypt from 'bcryptjs';
import { db, q } from './db.js';
import { DEPARTMENTS, SERVICES, SCHEMES, CONTACTS } from './demoData.js';

// ── Complaints with full update trails ──────────────────────────────────────
function seedComplaints(deptMap) {
  const rows = [
    { id: 'SM-2026-10482', category: 'road_damage', description: 'Large pothole near the market junction causing two-wheeler accidents every week. Needs urgent repair before monsoon.', location: 'Thangal Bazar junction, near Ima Keithel', district: 'Imphal West', name: 'Laishram Devi', phone: '9856123456', status: 'Under Review', priority: 'High', dept: 'Public Works Department (PWD)', days: 6,
      updates: [
        ['Submitted', 'Complaint received by SevaManipur AI portal.', 'System', 6],
        ['Received', 'Verified location via field staff photo.', 'Helpdesk', 5],
        ['Assigned', 'Assigned to PWD Road Division Imphal West.', 'Admin', 4],
        ['Under Review', 'Site inspected; repair estimate being prepared.', 'PWD Inspector', 2],
      ] },
    { id: 'SM-2026-10117', category: 'garbage_waste', description: 'Garbage not collected for two weeks near the housing complex; strong smell and stray animal menace.', location: 'Sekmai Awang Leikai', district: 'Imphal West', name: 'Kshetrimayum Rakesh', phone: '9862345671', status: 'Resolved', priority: 'Medium', dept: 'Municipal Administration, Housing & Urban Development (MAHUD)', days: 21,
      updates: [
        ['Submitted', 'Complaint received by SevaManipur AI portal.', 'System', 21],
        ['Received', 'Complaint verified and logged.', 'Helpdesk', 20],
        ['Assigned', 'Sanitation team notified.', 'Admin', 19],
        ['Under Review', 'Collection schedule revised for the ward.', 'Sanitation Officer', 17],
        ['Resolved', 'Special collection drive completed; regular pickup restored.', 'Sanitation Officer', 14],
      ] },
    { id: 'SM-2026-10893', category: 'streetlight', description: 'Three streetlights not working on the main lane; the stretch is completely dark at night and unsafe for women and students.', location: 'Ukhrul Road, Phungyoctpal', district: 'Ukhrul', name: 'Chamringlung Ningshen', phone: '9876123098', status: 'Assigned', priority: 'High', dept: 'Electricity Department (MSPDCL)', days: 4,
      updates: [
        ['Submitted', 'Complaint received by SevaManipur AI portal.', 'System', 4],
        ['Received', 'Fault confirmed by the line section.', 'Helpdesk', 3],
        ['Assigned', 'Assigned to Ukhrul Electrical Sub-Division.', 'Admin', 2],
      ] },
    { id: 'SM-2026-10566', category: 'water_supply', description: 'No piped water for 5 days in the lane; the public tap is also damaged. Families are buying water.', location: 'Wabagai Lamkhai', district: 'Thoubal', name: 'Moirangthem Sana', phone: '9612345678', status: 'Received', priority: 'High', dept: 'Public Health Engineering Department (PHED)', days: 2,
      updates: [
        ['Submitted', 'Complaint received by SevaManipur AI portal.', 'System', 2],
        ['Received', 'Complaint forwarded to the Junior Engineer concerned.', 'Helpdesk', 1],
      ] },
    { id: 'SM-2026-10231', category: 'drainage', description: 'Drain overflow near the school gate during rain; dirty water enters the school compound.', location: 'Kakching Khunou', district: 'Kakching', name: 'Sorojini Devi', phone: '9774561230', status: 'Resolved', priority: 'Medium', dept: 'Public Health Engineering Department (PHED)', days: 30,
      updates: [
        ['Submitted', 'Complaint received by SevaManipur AI portal.', 'System', 30],
        ['Received', 'Verified with photos.', 'Helpdesk', 29],
        ['Assigned', 'Drainage cleaning scheduled.', 'Admin', 27],
        ['Under Review', 'Desilting in progress.', 'PHED Staff', 25],
        ['Resolved', 'Drain cleaned and re-graded.', 'PHED Staff', 22],
      ] },
    { id: 'SM-2026-10975', category: 'public_infrastructure', description: 'Broken footbridge railing over the nalla near the market; school children cross here daily.', location: 'Moreh Town, Ward 5', district: 'Tengnoupal', name: 'Tongkhojang Lhouvum', phone: '9874512365', status: 'Submitted', priority: 'Critical', dept: 'Public Works Department (PWD)', days: 1,
      updates: [['Submitted', 'Complaint received by SevaManipur AI portal.', 'System', 1]] },
    { id: 'SM-2026-10308', category: 'road_damage', description: 'Road caved in after pipeline work; two-wheelers fall at night. Barricade required immediately.', location: 'Singjamei Oinam Thingel', district: 'Imphal West', name: 'Wahengbam Somorjit', phone: '9856098761', status: 'Assigned', priority: 'High', dept: 'Public Works Department (PWD)', days: 3,
      updates: [
        ['Submitted', 'Complaint received by SevaManipur AI portal.', 'System', 3],
        ['Received', 'Marked urgent due to safety risk.', 'Helpdesk', 2],
        ['Assigned', 'Assigned to PWD Singjamei sub-division.', 'Admin', 2],
      ] },
    { id: 'SM-2026-10754', category: 'other', description: 'Stray dog pack near the school route has become aggressive in the evenings.', location: 'Saiton Khullen', district: 'Bishnupur', name: 'Laishram Meena', phone: '9612987456', status: 'Received', priority: 'Medium', dept: 'Deputy Commissioner (DC) Office', days: 7,
      updates: [
        ['Submitted', 'Complaint received by SevaManipur AI portal.', 'System', 7],
        ['Received', 'Forwarded to the veterinary cell.', 'Helpdesk', 6],
      ] },
    { id: 'SM-2026-10042', category: 'garbage_waste', description: 'Waste from the fish market dumped into the nalla blocking water flow.', location: 'Thoubal Bazar', district: 'Thoubal', name: 'Ningthoujam Bijoy', phone: '9862987612', status: 'Under Review', priority: 'Medium', dept: 'Municipal Administration, Housing & Urban Development (MAHUD)', days: 12,
      updates: [
        ['Submitted', 'Complaint received by SevaManipur AI portal.', 'System', 12],
        ['Received', 'Complaint verified.', 'Helpdesk', 11],
        ['Assigned', 'Municipal council notified.', 'Admin', 10],
        ['Under Review', 'Vendor meeting scheduled for waste rules.', 'Sanitation Officer', 8],
      ] },
    { id: 'SM-2026-10901', category: 'streetlight', description: 'New LED poles installed but never switched on since installation two months ago.', location: 'Sangakpham Bazar', district: 'Imphal East', name: 'Heikrujam Dinesh', phone: '9774123654', status: 'Received', priority: 'Low', dept: 'Electricity Department (MSPDCL)', days: 5,
      updates: [
        ['Submitted', 'Complaint received by SevaManipur AI portal.', 'System', 5],
        ['Received', 'Query sent to the contractor.', 'Helpdesk', 4],
      ] },
  ];

  for (const row of rows) {
    const deptId = deptMap[row.dept] || null;
    const created = `datetime('now', '-${row.days} days')`;
    const r = q.run(
      `INSERT INTO complaints (complaint_id, category, description, location, district, name, phone, status, priority, department_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${created}, ${created})`,
      row.id, row.category, row.description, row.location, row.district, row.name, row.phone, row.status, row.priority, deptId
    );
    for (const [status, note, by, daysAgo] of row.updates) {
      q.run(
        `INSERT INTO complaint_updates (complaint_id, status, note, created_by, created_at) VALUES (?, ?, ?, ?, datetime('now', '-${daysAgo} days'))`,
        Number(r.lastInsertRowid), status, note, by
      );
    }
  }
}

export function seedIfEmpty() {
  const hasData = q.get('SELECT COUNT(*) AS n FROM services').n > 0;
  if (hasData) return false;

  console.log('[seed] Empty database — seeding demo data…');
  const tx = db;

  const deptMap = {};
  for (const [name, short] of DEPARTMENTS) {
    const r = tx.prepare('INSERT OR IGNORE INTO departments (name, short_name) VALUES (?, ?)').run(name, short);
    const row = tx.prepare('SELECT id FROM departments WHERE name = ?').get(name);
    deptMap[name] = row.id;
  }

  for (const s of SERVICES) {
    tx.prepare(
      `INSERT INTO services (slug, name, category, department_id, description, eligibility, documents, steps, official_link, keywords, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      s.slug, s.name, s.category, deptMap[s.dept] || null, s.description, s.eligibility,
      JSON.stringify(s.documents), JSON.stringify(s.steps), s.link || null,
      JSON.stringify(s.keywords), s.link || s.name.includes('Parivahan') ? 0 : 1
    );
  }

  for (const s of SCHEMES) {
    tx.prepare(
      `INSERT INTO schemes (slug, name, department_id, benefits, eligibility, documents, process, official_link, min_age, max_age, occupations, area, max_income, keywords, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      s.slug, s.name, deptMap[s.dept] || null, s.benefits, s.eligibility,
      JSON.stringify(s.documents), s.process, s.link || null,
      s.min_age ?? null, s.max_age ?? null, JSON.stringify(s.occupations), s.area, s.max_income ?? null,
      JSON.stringify(s.keywords), 1
    );
  }

  for (const c of CONTACTS) {
    tx.prepare('INSERT INTO contacts (department, service, phone, email, website, office, district, is_demo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(c.department, c.service, c.phone, c.email || null, c.website || null, c.office, c.district, c.is_demo);
  }

  seedComplaints(deptMap);

  // Demo users (documented in README + login page)
  tx.prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run('Demo Citizen', 'demo@citizen.in', '9856000001', bcrypt.hashSync('Demo@2026', 10), 'citizen');
  tx.prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run('Admin', 'admin@sevamanipur.in', '9856000000', bcrypt.hashSync('Admin@2026', 10), 'admin');
  // Link demo citizen to one complaint for the citizen-dashboard demo
  tx.prepare(`UPDATE complaints SET user_id = (SELECT id FROM users WHERE email = 'demo@citizen.in') WHERE complaint_id IN ('SM-2026-10482','SM-2026-10117')`).run();

  console.log('[seed] Done: 22 services, 14 schemes, 12 departments, 14 contacts, 10 complaints, 2 demo users.');
  return true;
}

// CLI: `npm run seed` re-seeds from scratch
if (process.argv.includes('--force')) {
  db.exec('DELETE FROM saved_services; DELETE FROM saved_schemes; DELETE FROM messages; DELETE FROM conversations; DELETE FROM complaint_updates; DELETE FROM complaints; DELETE FROM contacts; DELETE FROM schemes; DELETE FROM services; DELETE FROM departments; DELETE FROM users;');
  seedIfEmpty();
  console.log('[seed] Database re-seeded from scratch.');
}
