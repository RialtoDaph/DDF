-- ============================================================================
-- Harden SECURITY DEFINER function privileges (per Supabase security advisor).
-- Trigger functions are never meant to be called directly via REST RPC —
-- Postgres invokes them internally on the DML event regardless of grants, so
-- revoking direct EXECUTE here does not break the triggers defined in
-- 0001_init.sql. The remaining helper/RPC functions are meant for signed-in
-- app users only, so anonymous access is revoked but authenticated keeps it.
-- ============================================================================

revoke execute on function public.apply_stock_movement() from public, anon, authenticated;
revoke execute on function public.check_submission_ready() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.current_user_outlet() from public, anon;
revoke execute on function public.get_quiz_questions(uuid) from public, anon;
revoke execute on function public.submit_quiz_attempt(uuid, jsonb) from public, anon;
