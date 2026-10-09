// Fallback demo fixtures for local development and before Supabase is configured.
// These are synthetic examples, contain no citizen contact information, and
// mirror the three IDs shown on the public Track Complaint page.
const age = (days) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 19).replace('T', ' ');
const update = (status, note, createdBy, daysAgo) => ({
  status, note, created_by: createdBy, created_at: age(daysAgo),
});

const rows = [
  {
    complaint_id: 'SM-2026-10482', category: 'road_damage',
    description: 'Large pothole near the market junction causing two-wheeler accidents every week. Needs urgent repair before monsoon.',
    location: 'Thangal Bazar junction, near Ima Keithel', district: 'Imphal West',
    dept_name: 'Public Works Department (PWD)', status: 'Under Review', priority: 'High',
    created_at: age(6), updated_at: age(2),
    updates: [
      update('Submitted', 'Complaint received by SevaManipur AI portal.', 'System', 6),
      update('Received', 'Verified location via field staff photo.', 'Helpdesk', 5),
      update('Assigned', 'Assigned to PWD Road Division Imphal West.', 'Admin', 4),
      update('Under Review', 'Site inspected; repair estimate being prepared.', 'PWD Inspector', 2),
    ],
  },
  {
    complaint_id: 'SM-2026-10893', category: 'streetlight',
    description: 'Three streetlights not working on the main lane; the stretch is completely dark at night and unsafe for women and students.',
    location: 'Ukhrul Road, Phungyoctpal', district: 'Ukhrul',
    dept_name: 'Electricity Department (MSPDCL)', status: 'Assigned', priority: 'High',
    created_at: age(4), updated_at: age(2),
    updates: [
      update('Submitted', 'Complaint received by SevaManipur AI portal.', 'System', 4),
      update('Received', 'Fault confirmed by the line section.', 'Helpdesk', 3),
      update('Assigned', 'Assigned to Ukhrul Electrical Sub-Division.', 'Admin', 2),
    ],
  },
  {
    complaint_id: 'SM-2026-10975', category: 'public_infrastructure',
    description: 'Broken footbridge railing over the nalla near the market; school children cross here daily.',
    location: 'Moreh Town, Ward 5', district: 'Tengnoupal',
    dept_name: 'Public Works Department (PWD)', status: 'Submitted', priority: 'Critical',
    created_at: age(1), updated_at: age(1),
    updates: [update('Submitted', 'Complaint received by SevaManipur AI portal.', 'System', 1)],
  },
];

export function getDemoComplaint(id) {
  return rows.find((row) => row.complaint_id === String(id || '').trim().toUpperCase()) || null;
}
