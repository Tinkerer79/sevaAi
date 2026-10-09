-- Keep the newest 100 chat messages per thread; enough for returning to a chat,
-- with the model separately receiving only the latest relevant turns.
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
    insert into public.ai_conversations(user_id,title) values (auth.uid(),v_title) returning id into v_id;
  else
    update public.ai_conversations set updated_at = now()
      where id = p_conversation_id and user_id = auth.uid() returning id into v_id;
    if v_id is null then raise exception 'Conversation not found.' using errcode = 'P0002'; end if;
  end if;
  insert into public.ai_messages(conversation_id,role,content)
    values (v_id,'user',btrim(p_user_message)),(v_id,'model',btrim(p_assistant_message));
  delete from public.ai_messages where conversation_id=v_id and id not in (
    select id from public.ai_messages where conversation_id=v_id order by id desc limit 100
  );
  return jsonb_build_object('conversationId',v_id);
end;
$$;
revoke all on function public.ai_save_chat_turn(uuid,text,text) from public, anon;
grant execute on function public.ai_save_chat_turn(uuid,text,text) to authenticated;
