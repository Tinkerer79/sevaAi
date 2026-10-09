-- Public, synthetic tracking examples used by the complaint demo on Vercel.
-- Keep this table read-only to browser roles; real complaints belong in the
-- authenticated complaints workflow, not in this demo fixture table.
create table if not exists public.demo_complaints (
  complaint_id text primary key,
  category text not null,
  description text not null,
  location text not null,
  district text not null,
  dept_name text not null,
  status text not null,
  priority text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  updates jsonb not null default '[]'::jsonb,
  constraint demo_complaints_category_check check (category in (
    'road_damage', 'garbage_waste', 'streetlight', 'water_supply',
    'drainage', 'public_infrastructure', 'other'
  )),
  constraint demo_complaints_status_check check (status in (
    'Submitted', 'Received', 'Assigned', 'Under Review', 'Resolved'
  )),
  constraint demo_complaints_priority_check check (priority in ('Low', 'Medium', 'High', 'Critical'))
);

alter table public.demo_complaints enable row level security;
drop policy if exists demo_complaints_public_read on public.demo_complaints;
create policy demo_complaints_public_read on public.demo_complaints
  for select to anon, authenticated using (true);
revoke insert, update, delete, truncate, references, trigger on public.demo_complaints from anon, authenticated;
grant select on public.demo_complaints to anon, authenticated;

insert into public.demo_complaints
  (complaint_id, category, description, location, district, dept_name, status, priority, created_at, updated_at, updates)
values
  (
    'SM-2026-10482', 'road_damage',
    'Large pothole near the market junction causing two-wheeler accidents every week. Needs urgent repair before monsoon.',
    'Thangal Bazar junction, near Ima Keithel', 'Imphal West', 'Public Works Department (PWD)',
    'Under Review', 'High', now() - interval '6 days', now() - interval '2 days',
    jsonb_build_array(
      jsonb_build_object('status','Submitted','note','Complaint received by SevaManipur AI portal.','created_by','System','created_at',now() - interval '6 days'),
      jsonb_build_object('status','Received','note','Verified location via field staff photo.','created_by','Helpdesk','created_at',now() - interval '5 days'),
      jsonb_build_object('status','Assigned','note','Assigned to PWD Road Division Imphal West.','created_by','Admin','created_at',now() - interval '4 days'),
      jsonb_build_object('status','Under Review','note','Site inspected; repair estimate being prepared.','created_by','PWD Inspector','created_at',now() - interval '2 days')
    )
  ),
  (
    'SM-2026-10893', 'streetlight',
    'Three streetlights not working on the main lane; the stretch is completely dark at night and unsafe for women and students.',
    'Ukhrul Road, Phungyoctpal', 'Ukhrul', 'Electricity Department (MSPDCL)',
    'Assigned', 'High', now() - interval '4 days', now() - interval '2 days',
    jsonb_build_array(
      jsonb_build_object('status','Submitted','note','Complaint received by SevaManipur AI portal.','created_by','System','created_at',now() - interval '4 days'),
      jsonb_build_object('status','Received','note','Fault confirmed by the line section.','created_by','Helpdesk','created_at',now() - interval '3 days'),
      jsonb_build_object('status','Assigned','note','Assigned to Ukhrul Electrical Sub-Division.','created_by','Admin','created_at',now() - interval '2 days')
    )
  ),
  (
    'SM-2026-10975', 'public_infrastructure',
    'Broken footbridge railing over the nalla near the market; school children cross here daily.',
    'Moreh Town, Ward 5', 'Tengnoupal', 'Public Works Department (PWD)',
    'Submitted', 'Critical', now() - interval '1 day', now() - interval '1 day',
    jsonb_build_array(
      jsonb_build_object('status','Submitted','note','Complaint received by SevaManipur AI portal.','created_by','System','created_at',now() - interval '1 day')
    )
  )
on conflict (complaint_id) do update set
  category = excluded.category,
  description = excluded.description,
  location = excluded.location,
  district = excluded.district,
  dept_name = excluded.dept_name,
  status = excluded.status,
  priority = excluded.priority,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  updates = excluded.updates;
