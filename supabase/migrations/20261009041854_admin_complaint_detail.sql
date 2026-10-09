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
revoke all on function public.admin_complaint_detail(text) from public;
grant execute on function public.admin_complaint_detail(text) to authenticated;
