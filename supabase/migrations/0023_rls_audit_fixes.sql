-- ============================================================================
-- Fixes from a security/consistency audit:
--
-- 1. users_update_self never pinned outlet_id, so any staff account could
--    self-reassign into any outlet via a direct PostgREST call (role was
--    already pinned, outlet_id was not) — a full cross-tenant privilege
--    escalation, since current_user_outlet() drives nearly every other
--    outlet-scoped policy in the app.
-- 2. can_access_chat_channel() let a custom channel's original creator keep
--    permanent read access via created_by, even after being explicitly
--    removed from chat_channel_members — access to a private group channel
--    should end when membership ends.
-- 3. chat_channels_delete checked created_by alone, so a removed creator
--    could still delete the channel outright.
-- 4. checklist_submissions_update didn't pin approved_by to the approver,
--    so an owner/manager could (via a direct API call) forge the approval
--    record to name a different user as approver.
-- 5. A handful of foreign keys added in migrations after the 0005/0010
--    advisor-driven index pass never got a covering index.
-- ============================================================================

-- 1. Pin outlet_id on self-update, same treatment as role. IS NOT DISTINCT
-- FROM handles owner accounts with a null outlet_id (plain `=` against NULL
-- would make the whole check NULL/false and block their self-updates too).
alter policy users_update_self on users
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = public.current_user_role()
    and outlet_id is not distinct from public.current_user_outlet()
  );

-- 2. Custom-channel access is membership only — the app always adds the
-- creator as a member at creation time, so this doesn't change the normal
-- flow, it just stops stale access after removal.
create or replace function public.can_access_chat_channel(p_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_channels c
    where c.id = p_channel_id
      and (
        public.current_user_role() = 'owner'
        or (c.kind = 'outlet' and c.outlet_id = public.current_user_outlet())
        or (c.kind = 'management' and public.current_user_role() = 'manager')
        or (
          c.kind = 'custom'
          and exists (
            select 1 from public.chat_channel_members m
            where m.channel_id = c.id and m.user_id = auth.uid()
          )
        )
      )
  );
$$;

-- 3. Deleting a custom channel as its creator now also requires still being
-- a member (owner can still always delete). chat_channel_members_insert/
-- delete already route through can_access_chat_channel via their
-- cross-table subquery on chat_channels, so fix 2 alone closes those.
drop policy chat_channels_delete on chat_channels;
create policy chat_channels_delete on chat_channels
  for delete to authenticated
  using (
    public.current_user_role() = 'owner'
    or (
      kind = 'custom'
      and created_by = (select auth.uid())
      and exists (
        select 1 from public.chat_channel_members m
        where m.channel_id = id and m.user_id = (select auth.uid())
      )
    )
  );

-- 4. Pin the approver identity in the approval branch.
alter policy checklist_submissions_update on checklist_submissions
  with check (
    (status <> 'approved' and user_id = (select auth.uid()))
    or (
      public.current_user_role() in ('owner', 'manager')
      and user_id <> (select auth.uid())
      and approved_by = (select auth.uid())
    )
  );

-- 5. Missing FK indexes.
create index events_created_by_idx on events (created_by);
create index order_list_items_supplier_id_idx on order_list_items (supplier_id);
create index order_list_items_created_by_idx on order_list_items (created_by);
create index order_list_items_ordered_by_idx on order_list_items (ordered_by);
create index wine_cabinets_outlet_id_idx on wine_cabinets (outlet_id);
create index chat_channels_created_by_idx on chat_channels (created_by);
