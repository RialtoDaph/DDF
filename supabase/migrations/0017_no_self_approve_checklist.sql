-- ============================================================================
-- Close a self-approval hole: the previous with-check let any owner/manager
-- set status = 'approved' on ANY checklist_submissions row, including their
-- own — so a manager could submit their own closing checklist and then
-- immediately approve it themselves, defeating the point of a two-person
-- approval step. This is enforced app-side already (approveChecklist checks
-- submitter != approver), but RLS is the real boundary since the app isn't
-- the only way to reach the Supabase REST API with a valid session.
-- ============================================================================

alter policy checklist_submissions_update on checklist_submissions
  with check (
    (status <> 'approved' and user_id = (select auth.uid()))
    or (public.current_user_role() in ('owner', 'manager') and user_id <> (select auth.uid()))
  );
