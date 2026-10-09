-- Ciphertext is produced in the Vercel server runtime using AES-256-GCM and a
-- secret that is not stored in this database. No complaint rows existed when
-- this migration was applied, so the renamed fields begin in encrypted form.
alter table public.complaints rename column name to name_encrypted;
alter table public.complaints rename column phone to phone_encrypted;
alter table public.complaints drop constraint complaints_name_check;
alter table public.complaints drop constraint complaints_phone_check;

alter table public.ai_conversations rename column title to title_encrypted;
alter table public.ai_conversations drop constraint ai_conversations_title_check;
alter table public.ai_messages rename column content to content_encrypted;
alter table public.ai_messages drop constraint ai_messages_content_check;
alter table public.ai_messages add constraint ai_messages_content_encrypted_check
  check (char_length(content_encrypted) between 20 and 24000);

drop function if exists public.submit_complaint(text,text,text,text,text,text);
create function public.submit_complaint(
  p_category text, p_description text, p_location text, p_district text,
  p_name_encrypted text, p_phone_encrypted text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_dept text; v_id text;
begin
  if coalesce(p_category, '') not in ('road_damage','garbage_waste','streetlight','water_supply','drainage','public_infrastructure','other') then
    raise exception 'Please choose a valid category.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_description,''))) not between 10 and 2000 then
    raise exception 'Please describe the problem in 10–2000 characters.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_location,''))) not between 3 and 200 then
    raise exception 'Please enter the location (3–200 characters).' using errcode = '22023';
  end if;
  if coalesce(p_district, '') not in ('Bishnupur','Chandel','Churachandpur','Imphal East','Imphal West','Jiribam','Kakching','Kamjong','Kangpokpi','Noney','Pherzawl','Senapati','Tamenglong','Tengnoupal','Thoubal','Ukhrul') then
    raise exception 'Please choose a valid district.' using errcode = '22023';
  end if;
  if p_name_encrypted !~ '^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$'
     or p_phone_encrypted !~ '^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$' then
    raise exception 'Private fields must be encrypted before storage.' using errcode = '22023';
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
    (complaint_id,category,description,location,district,name_encrypted,phone_encrypted,dept_name,priority,updates)
  values
    (v_id,p_category,btrim(p_description),btrim(p_location),p_district,p_name_encrypted,p_phone_encrypted,v_dept,
     case when p_category = 'water_supply' then 'High' else 'Medium' end,
     jsonb_build_array(jsonb_build_object('status','Submitted','note','Complaint received by SevaManipur AI portal.','created_by','System','created_at',to_char(now() at time zone 'UTC','YYYY-MM-DD HH24:MI:SS'))));
  return jsonb_build_object('complaintId',v_id,'category',p_category,'department',v_dept);
end;
$$;
revoke all on function public.submit_complaint(text,text,text,text,text,text) from public;
grant execute on function public.submit_complaint(text,text,text,text,text,text) to anon, authenticated;

create or replace function public.admin_complaint_detail(p_complaint_id text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_row jsonb;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'complaint',jsonb_build_object('complaint_id',c.complaint_id,'category',c.category,'description',c.description,
      'location',c.location,'district',c.district,'dept_name',c.dept_name,'status',c.status,'priority',c.priority,
      'name_encrypted',c.name_encrypted,'phone_encrypted',c.phone_encrypted,
      'created_at',to_char(c.created_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS'),
      'updated_at',to_char(c.updated_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')),
    'updates',c.updates
  ) into v_row from public.complaints c where c.complaint_id=upper(btrim(p_complaint_id));
  if v_row is not null then return v_row; end if;
  select jsonb_build_object(
    'complaint',jsonb_build_object('complaint_id',d.complaint_id,'category',d.category,'description',d.description,
      'location',d.location,'district',d.district,'dept_name',d.dept_name,'status',d.status,'priority',d.priority,
      'name','Demo citizen','phone','',
      'created_at',to_char(d.created_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS'),
      'updated_at',to_char(d.updated_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')),
    'updates',d.updates
  ) into v_row from public.demo_complaints d where d.complaint_id=upper(btrim(p_complaint_id));
  return v_row;
end;
$$;
revoke all on function public.admin_complaint_detail(text) from public, anon;
grant execute on function public.admin_complaint_detail(text) to authenticated;

create or replace function public.ai_list_conversations() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_rows jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required.' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title_encrypted',c.title_encrypted,'updated_at',c.updated_at)
    order by c.updated_at desc), '[]'::jsonb)
    into v_rows from public.ai_conversations c where c.user_id=auth.uid();
  return jsonb_build_object('conversations',v_rows);
end;
$$;

create or replace function public.ai_get_conversation(p_conversation_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_conversation jsonb; v_messages jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required.' using errcode = '42501'; end if;
  select jsonb_build_object('id',c.id,'title_encrypted',c.title_encrypted,'updated_at',c.updated_at)
    into v_conversation from public.ai_conversations c where c.id=p_conversation_id and c.user_id=auth.uid();
  if v_conversation is null then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object('role',m.role,'content_encrypted',m.content_encrypted)
    order by m.created_at,m.id), '[]'::jsonb)
    into v_messages from public.ai_messages m where m.conversation_id=p_conversation_id;
  return jsonb_build_object('conversation',v_conversation,'messages',v_messages);
end;
$$;

drop function if exists public.ai_save_chat_turn(uuid,text,text);
create function public.ai_save_chat_turn(
  p_conversation_id uuid, p_title_encrypted text,
  p_user_encrypted text, p_assistant_encrypted text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required.' using errcode = '42501'; end if;
  if p_title_encrypted !~ '^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$'
    or p_user_encrypted !~ '^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$'
    or p_assistant_encrypted !~ '^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$' then
    raise exception 'Chat content must be encrypted before storage.' using errcode = '22023';
  end if;
  if p_conversation_id is null then
    insert into public.ai_conversations(user_id,title_encrypted) values(auth.uid(),p_title_encrypted) returning id into v_id;
  else
    update public.ai_conversations set updated_at=now()
      where id=p_conversation_id and user_id=auth.uid() returning id into v_id;
    if v_id is null then raise exception 'Conversation not found.' using errcode = 'P0002'; end if;
  end if;
  insert into public.ai_messages(conversation_id,role,content_encrypted)
    values(v_id,'user',p_user_encrypted),(v_id,'model',p_assistant_encrypted);
  delete from public.ai_messages where conversation_id=v_id and id not in (
    select id from public.ai_messages where conversation_id=v_id order by id desc limit 100
  );
  return jsonb_build_object('conversationId',v_id);
end;
$$;
revoke all on function public.ai_list_conversations() from public, anon;
revoke all on function public.ai_get_conversation(uuid) from public, anon;
revoke all on function public.ai_save_chat_turn(uuid,text,text,text) from public, anon;
grant execute on function public.ai_list_conversations() to authenticated;
grant execute on function public.ai_get_conversation(uuid) to authenticated;
grant execute on function public.ai_save_chat_turn(uuid,text,text,text) to authenticated;
