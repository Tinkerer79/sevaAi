-- Complaint submissions are stored in Supabase for the Vercel deployment.
-- Browser roles cannot read the table directly; narrowly-scoped RPCs expose
-- tracking fields and require an admin JWT for the complete admin list.
create table if not exists public.complaints (
  complaint_id text primary key,
  category text not null check (category in (
    'road_damage', 'garbage_waste', 'streetlight', 'water_supply',
    'drainage', 'public_infrastructure', 'other'
  )),
  description text not null check (char_length(description) between 10 and 2000),
  location text not null check (char_length(location) between 3 and 200),
  district text not null check (district in (
    'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam',
    'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati',
    'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'
  )),
  name text not null check (char_length(name) between 2 and 80),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  dept_name text not null,
  status text not null default 'Submitted' check (status in ('Submitted','Received','Assigned','Under Review','Resolved')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Critical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updates jsonb not null default '[]'::jsonb
);

create index if not exists complaints_created_at_idx on public.complaints (created_at desc);
create index if not exists complaints_status_idx on public.complaints (status);
alter table public.complaints enable row level security;
revoke all on public.complaints from anon, authenticated;

create or replace function public.submit_complaint(
  p_category text, p_description text, p_location text, p_district text, p_name text, p_phone text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_dept text;
  v_id text;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_description text := btrim(coalesce(p_description, ''));
  v_location text := btrim(coalesce(p_location, ''));
  v_name text := btrim(coalesce(p_name, ''));
begin
  if coalesce(p_category, '') not in ('road_damage','garbage_waste','streetlight','water_supply','drainage','public_infrastructure','other') then
    raise exception 'Please choose a valid category.' using errcode = '22023';
  end if;
  if char_length(v_description) not between 10 and 2000 then
    raise exception 'Please describe the problem in 10–2000 characters.' using errcode = '22023';
  end if;
  if char_length(v_location) not between 3 and 200 then
    raise exception 'Please enter the location (3–200 characters).' using errcode = '22023';
  end if;
  if coalesce(p_district, '') not in ('Bishnupur','Chandel','Churachandpur','Imphal East','Imphal West','Jiribam','Kakching','Kamjong','Kangpokpi','Noney','Pherzawl','Senapati','Tamenglong','Tengnoupal','Thoubal','Ukhrul') then
    raise exception 'Please choose a valid district.' using errcode = '22023';
  end if;
  if char_length(v_name) not between 2 and 80 then
    raise exception 'Please enter your name.' using errcode = '22023';
  end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'Please enter a valid 10-digit mobile number.' using errcode = '22023';
  end if;

  v_dept := case p_category
    when 'road_damage' then 'Public Works Department (PWD)'
    when 'garbage_waste' then 'Municipal Administration, Housing & Urban Development (MAHUD)'
    when 'streetlight' then 'Electricity Department (MSPDCL)'
    when 'water_supply' then 'Public Health Engineering Department (PHED)'
    when 'drainage' then 'Public Health Engineering Department (PHED)'
    when 'public_infrastructure' then 'Public Works Department (PWD)'
    else 'Deputy Commissioner (DC) Office'
  end;
  v_id := 'SM-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.complaints
    (complaint_id, category, description, location, district, name, phone, dept_name, priority, updates)
  values
    (v_id, p_category, v_description, v_location, p_district, v_name, v_phone, v_dept,
     case when p_category = 'water_supply' then 'High' else 'Medium' end,
     jsonb_build_array(jsonb_build_object(
       'status','Submitted', 'note','Complaint received by SevaManipur AI portal.',
       'created_by','System', 'created_at',to_char(now() at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')
     )));

  return jsonb_build_object('complaintId', v_id, 'category', p_category, 'department', v_dept);
end;
$$;

create or replace function public.get_complaint_tracking(p_complaint_id text) returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'complaint', jsonb_build_object(
      'complaint_id', c.complaint_id, 'category', c.category, 'description', c.description,
      'location', c.location, 'district', c.district, 'dept_name', c.dept_name,
      'status', c.status, 'priority', c.priority,
      'created_at', to_char(c.created_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS'),
      'updated_at', to_char(c.updated_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')
    ),
    'updates', c.updates
  )
  from public.complaints c
  where c.complaint_id = upper(btrim(p_complaint_id));
$$;

create or replace function public.admin_list_complaints() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_rows jsonb;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(to_jsonb(all_rows) order by all_rows.created_at desc), '[]'::jsonb) into v_rows
  from (
    select c.complaint_id, c.category, left(c.description, 120) as description, c.location,
      c.district, c.dept_name, c.status, c.priority, c.created_at, c.updated_at, false as is_demo
    from public.complaints c
    union all
    select d.complaint_id, d.category, left(d.description, 120), d.location,
      d.district, d.dept_name, d.status, d.priority, d.created_at, d.updated_at, true
    from public.demo_complaints d
  ) all_rows;
  return v_rows;
end;
$$;

create or replace function public.admin_complaint_detail(p_complaint_id text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_row jsonb;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'complaint', jsonb_build_object(
      'complaint_id',c.complaint_id,'category',c.category,'description',c.description,
      'location',c.location,'district',c.district,'dept_name',c.dept_name,
      'status',c.status,'priority',c.priority,'name',c.name,
      'created_at',to_char(c.created_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS'),
      'updated_at',to_char(c.updated_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')
    ), 'updates', c.updates
  ) into v_row from public.complaints c where c.complaint_id = upper(btrim(p_complaint_id));
  if v_row is not null then return v_row; end if;

  select jsonb_build_object(
    'complaint', jsonb_build_object(
      'complaint_id',d.complaint_id,'category',d.category,'description',d.description,
      'location',d.location,'district',d.district,'dept_name',d.dept_name,
      'status',d.status,'priority',d.priority,'name','Demo citizen',
      'created_at',to_char(d.created_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS'),
      'updated_at',to_char(d.updated_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')
    ), 'updates', d.updates
  ) into v_row from public.demo_complaints d where d.complaint_id = upper(btrim(p_complaint_id));
  return v_row;
end;
$$;

revoke all on function public.submit_complaint(text,text,text,text,text,text) from public;
revoke all on function public.get_complaint_tracking(text) from public;
revoke all on function public.admin_list_complaints() from public;
revoke all on function public.admin_complaint_detail(text) from public;
grant execute on function public.submit_complaint(text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.get_complaint_tracking(text) to anon, authenticated;
grant execute on function public.admin_list_complaints() to authenticated;
grant execute on function public.admin_complaint_detail(text) to authenticated;
