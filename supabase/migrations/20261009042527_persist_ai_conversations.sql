-- Store signed-in chat history in Supabase; browser roles can only use the
-- owner-checked RPCs below, not read or write these tables directly.
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_user_updated_idx
  on public.ai_conversations(user_id, updated_at desc);

create table if not exists public.ai_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'model')),
  content text not null check (char_length(content) between 1 and 12000),
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conversation_created_idx
  on public.ai_messages(conversation_id, created_at, id);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
revoke all on public.ai_conversations, public.ai_messages from anon, authenticated;

create or replace function public.ai_list_conversations() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_rows jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required.' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'updated_at',c.updated_at)
    order by c.updated_at desc), '[]'::jsonb)
    into v_rows from public.ai_conversations c where c.user_id = auth.uid();
  return jsonb_build_object('conversations', v_rows);
end;
$$;

create or replace function public.ai_get_conversation(p_conversation_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_conversation jsonb; v_messages jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required.' using errcode = '42501'; end if;
  select jsonb_build_object('id',c.id,'title',c.title,'updated_at',c.updated_at)
    into v_conversation from public.ai_conversations c
    where c.id = p_conversation_id and c.user_id = auth.uid();
  if v_conversation is null then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object('role',m.role,'content',m.content)
    order by m.created_at,m.id), '[]'::jsonb)
    into v_messages from public.ai_messages m
    where m.conversation_id = p_conversation_id;
  return jsonb_build_object('conversation',v_conversation,'messages',v_messages);
end;
$$;

create or replace function public.ai_save_chat_turn(
  p_conversation_id uuid, p_user_message text, p_assistant_message text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid; v_title text;
begin
  if auth.uid() is null then raise exception 'Sign in required.' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_user_message,''))) not between 1 and 2000
     or char_length(btrim(coalesce(p_assistant_message,''))) not between 1 and 12000 then
    raise exception 'Invalid message length.' using errcode = '22023';
  end if;
  if p_conversation_id is null then
    v_title := left(regexp_replace(btrim(p_user_message), '\s+', ' ', 'g'), 120);
    insert into public.ai_conversations(user_id,title) values (auth.uid(),v_title)
      returning id into v_id;
  else
    update public.ai_conversations set updated_at = now()
      where id = p_conversation_id and user_id = auth.uid() returning id into v_id;
    if v_id is null then raise exception 'Conversation not found.' using errcode = 'P0002'; end if;
  end if;
  insert into public.ai_messages(conversation_id,role,content)
    values (v_id,'user',btrim(p_user_message)),(v_id,'model',btrim(p_assistant_message));
  return jsonb_build_object('conversationId',v_id);
end;
$$;

create or replace function public.ai_delete_conversation(p_conversation_id uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_deleted integer;
begin
  if auth.uid() is null then raise exception 'Sign in required.' using errcode = '42501'; end if;
  delete from public.ai_conversations where id=p_conversation_id and user_id=auth.uid();
  get diagnostics v_deleted = row_count;
  return jsonb_build_object('deleted',v_deleted > 0);
end;
$$;

revoke all on function public.ai_list_conversations() from public, anon;
revoke all on function public.ai_get_conversation(uuid) from public, anon;
revoke all on function public.ai_save_chat_turn(uuid,text,text) from public, anon;
revoke all on function public.ai_delete_conversation(uuid) from public, anon;
grant execute on function public.ai_list_conversations() to authenticated;
grant execute on function public.ai_get_conversation(uuid) to authenticated;
grant execute on function public.ai_save_chat_turn(uuid,text,text) to authenticated;
grant execute on function public.ai_delete_conversation(uuid) to authenticated;
