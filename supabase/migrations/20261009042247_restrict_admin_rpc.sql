-- Supabase's default privileges can grant new functions to anon. Admin RPCs
-- must be callable only with an authenticated JWT; each function also checks
-- the server-managed app_metadata role before returning complaint data.
revoke all on function public.admin_list_complaints() from anon;
revoke all on function public.admin_complaint_detail(text) from anon;
grant execute on function public.admin_list_complaints() to authenticated;
grant execute on function public.admin_complaint_detail(text) to authenticated;
