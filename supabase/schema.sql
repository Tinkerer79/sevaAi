-- SevaManipur scheme catalog for Supabase.
-- Apply this file first, then seed.sql in the Supabase SQL Editor.

create table if not exists public.schemes (
  slug text primary key,
  name text not null,
  department text not null,
  scope text not null check (scope in ('manipur_state', 'central_in_manipur', 'other')),
  summary text not null default '',
  benefits text not null default '',
  eligibility_text text not null default '',
  eligibility_rules jsonb not null default '{}'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  application_process jsonb not null default '[]'::jsonb,
  official_link text,
  source_url text not null,
  source_note text not null default '',
  last_verified_at date not null,
  application_status text not null default 'check_with_department'
    check (application_status in ('open', 'closed', 'check_with_department', 'unknown')),
  data_status text not null default 'official_source_checked'
    check (data_status in ('official_source_checked', 'needs_confirmation', 'legacy_demo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schemes_scope_department_idx
  on public.schemes (scope, department);

create index if not exists schemes_search_idx
  on public.schemes using gin (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(eligibility_text, ''))
  );

-- This is a public-read catalog. Keep writes restricted to trusted admins/service role.
alter table public.schemes enable row level security;
drop policy if exists "Anyone can read scheme catalog" on public.schemes;
create policy "Anyone can read scheme catalog"
  on public.schemes for select
  to anon, authenticated
  using (true);
