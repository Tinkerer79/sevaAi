create or replace function public.admin_update_complaint(
  p_complaint_id text, p_status text, p_priority text, p_dept_name text, p_note text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id text := upper(btrim(coalesce(p_complaint_id,'')));
  v_status text;
  v_old_status text;
  v_note text := left(btrim(coalesce(p_note,'')),500);
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('Submitted','Received','Assigned','Under Review','Resolved') then
    raise exception 'Invalid status.' using errcode = '22023';
  end if;
  if p_priority is not null and p_priority not in ('Low','Medium','High','Critical') then
    raise exception 'Invalid priority.' using errcode = '22023';
  end if;
  if p_dept_name is not null and char_length(btrim(p_dept_name)) not between 2 and 120 then
    raise exception 'Invalid department.' using errcode = '22023';
  end if;

  select status into v_old_status from public.complaints where complaint_id=v_id;
  if found then
    update public.complaints set
      status=coalesce(p_status,status),
      priority=coalesce(p_priority,priority),
      dept_name=coalesce(nullif(btrim(p_dept_name),''),dept_name),
      updated_at=now()
      where complaint_id=v_id;
    v_status := coalesce(p_status,v_old_status);
    if p_status is not null and p_status is distinct from v_old_status then
      update public.complaints set updates=updates || jsonb_build_array(jsonb_build_object(
        'status',v_status,'note',coalesce(nullif(v_note,''),'Status changed to ' || v_status || '.'),
        'created_by','Admin','created_at',to_char(now() at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')
      )) where complaint_id=v_id;
    elsif v_note <> '' then
      update public.complaints set updates=updates || jsonb_build_array(jsonb_build_object(
        'status',v_status,'note',v_note,'created_by','Admin',
        'created_at',to_char(now() at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')
      )) where complaint_id=v_id;
    end if;
  else
    select status into v_old_status from public.demo_complaints where complaint_id=v_id;
    if not found then return null; end if;
    update public.demo_complaints set
      status=coalesce(p_status,status),
      priority=coalesce(p_priority,priority),
      dept_name=coalesce(nullif(btrim(p_dept_name),''),dept_name),
      updated_at=now()
      where complaint_id=v_id;
    v_status := coalesce(p_status,v_old_status);
    if p_status is not null and p_status is distinct from v_old_status then
      update public.demo_complaints set updates=updates || jsonb_build_array(jsonb_build_object(
        'status',v_status,'note',coalesce(nullif(v_note,''),'Status changed to ' || v_status || '.'),
        'created_by','Admin','created_at',to_char(now() at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')
      )) where complaint_id=v_id;
    elsif v_note <> '' then
      update public.demo_complaints set updates=updates || jsonb_build_array(jsonb_build_object(
        'status',v_status,'note',v_note,'created_by','Admin',
        'created_at',to_char(now() at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')
      )) where complaint_id=v_id;
    end if;
  end if;
  return public.admin_complaint_detail(v_id);
end;
$$;
revoke all on function public.admin_update_complaint(text,text,text,text,text) from public, anon;
grant execute on function public.admin_update_complaint(text,text,text,text,text) to authenticated;
