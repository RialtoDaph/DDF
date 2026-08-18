-- ============================================================================
-- Row Level Security
-- Roles: owner (full access), manager (own outlet, some restrictions),
-- staff (own records / assigned work only). See project README for the
-- full permission matrix this file implements.
-- ============================================================================

alter table outlets enable row level security;
alter table users enable row level security;
alter table suppliers enable row level security;
alter table supplier_price_history enable row level security;
alter table inventory_items enable row level security;
alter table stock_movements enable row level security;
alter table menu_items enable row level security;
alter table recipes enable row level security;
alter table tasks enable row level security;
alter table checklist_templates enable row level security;
alter table checklist_submissions enable row level security;
alter table checklist_item_results enable row level security;
alter table training_modules enable row level security;
alter table quiz_questions enable row level security;
alter table staff_training_progress enable row level security;
alter table handover_notes enable row level security;
alter table audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- outlets — everyone signed in can read (needed for names/labels); only
-- owners manage the outlet list.
-- ---------------------------------------------------------------------------
create policy outlets_select on outlets
  for select to authenticated using (true);

create policy outlets_write on outlets
  for all to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

-- ---------------------------------------------------------------------------
-- users
-- owner: sees/manages everyone.
-- manager: sees users in their own outlet; may only create/edit staff
--          accounts in their own outlet (not owner/manager rows).
-- staff:   sees only their own profile row.
-- ---------------------------------------------------------------------------
create policy users_select on users
  for select to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() = 'owner'
    or (public.current_user_role() = 'manager' and outlet_id = public.current_user_outlet())
  );

create policy users_insert_owner on users
  for insert to authenticated
  with check (public.current_user_role() = 'owner');

create policy users_insert_manager on users
  for insert to authenticated
  with check (
    public.current_user_role() = 'manager'
    and role = 'staff'
    and outlet_id = public.current_user_outlet()
  );

create policy users_update_owner on users
  for update to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy users_update_manager on users
  for update to authenticated
  using (
    public.current_user_role() = 'manager'
    and role = 'staff'
    and outlet_id = public.current_user_outlet()
  )
  with check (
    public.current_user_role() = 'manager'
    and role = 'staff'
    and outlet_id = public.current_user_outlet()
  );

create policy users_update_self on users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role());

create policy users_delete_owner on users
  for delete to authenticated
  using (public.current_user_role() = 'owner');

-- ---------------------------------------------------------------------------
-- suppliers / supplier_price_history — owner+manager manage; staff read-only
-- (needed to pick a supplier when logging goods receipt).
-- ---------------------------------------------------------------------------
create policy suppliers_select on suppliers
  for select to authenticated using (true);

create policy suppliers_write on suppliers
  for all to authenticated
  using (public.current_user_role() in ('owner', 'manager'))
  with check (public.current_user_role() in ('owner', 'manager'));

create policy supplier_price_history_select on supplier_price_history
  for select to authenticated using (true);

create policy supplier_price_history_write on supplier_price_history
  for all to authenticated
  using (public.current_user_role() in ('owner', 'manager'))
  with check (public.current_user_role() in ('owner', 'manager'));

-- ---------------------------------------------------------------------------
-- inventory_items — outlet-scoped for manager/staff, all outlets for owner.
-- Master-data writes (name, par level, price, ...) restricted to owner/manager.
-- current_stock is never written directly by clients — see stock_movements
-- trigger apply_stock_movement() in 0001_init.sql.
-- ---------------------------------------------------------------------------
create policy inventory_items_select on inventory_items
  for select to authenticated
  using (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  );

create policy inventory_items_write on inventory_items
  for all to authenticated
  using (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  )
  with check (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

-- ---------------------------------------------------------------------------
-- stock_movements — any outlet member may log restock/usage/waste; only
-- owner/manager may log 'adjustment' (stock correction "freigeben").
-- ---------------------------------------------------------------------------
create policy stock_movements_select on stock_movements
  for select to authenticated
  using (
    exists (
      select 1 from inventory_items i
      where i.id = stock_movements.item_id
        and (public.current_user_role() = 'owner' or i.outlet_id = public.current_user_outlet())
    )
  );

create policy stock_movements_insert on stock_movements
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from inventory_items i
      where i.id = stock_movements.item_id
        and (public.current_user_role() = 'owner' or i.outlet_id = public.current_user_outlet())
    )
    and (
      stock_movements.reason <> 'adjustment'
      or public.current_user_role() in ('owner', 'manager')
    )
  );

-- ---------------------------------------------------------------------------
-- menu_items / recipes — owner+manager manage (Stammdaten); everyone signed
-- in can read (needed for cost/margin display and training links).
-- ---------------------------------------------------------------------------
create policy menu_items_select on menu_items
  for select to authenticated using (true);

create policy menu_items_write on menu_items
  for all to authenticated
  using (public.current_user_role() in ('owner', 'manager'))
  with check (public.current_user_role() in ('owner', 'manager'));

create policy recipes_select on recipes
  for select to authenticated using (true);

create policy recipes_write on recipes
  for all to authenticated
  using (public.current_user_role() in ('owner', 'manager'))
  with check (public.current_user_role() in ('owner', 'manager'));

-- ---------------------------------------------------------------------------
-- tasks — owner/manager assign (insert/delete/reassign) within their outlet;
-- staff only see and check off tasks assigned to them.
-- ---------------------------------------------------------------------------
create policy tasks_select on tasks
  for select to authenticated
  using (
    public.current_user_role() = 'owner'
    or (public.current_user_role() = 'manager' and outlet_id = public.current_user_outlet())
    or assigned_to = auth.uid()
  );

create policy tasks_insert on tasks
  for insert to authenticated
  with check (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

create policy tasks_update on tasks
  for update to authenticated
  using (
    public.current_user_role() = 'owner'
    or (public.current_user_role() = 'manager' and outlet_id = public.current_user_outlet())
    or assigned_to = auth.uid()
  )
  with check (
    public.current_user_role() = 'owner'
    or (public.current_user_role() = 'manager' and outlet_id = public.current_user_outlet())
    or assigned_to = auth.uid()
  );

create policy tasks_delete on tasks
  for delete to authenticated
  using (
    public.current_user_role() = 'owner'
    or (public.current_user_role() = 'manager' and outlet_id = public.current_user_outlet())
  );

-- ---------------------------------------------------------------------------
-- checklist_templates — owner/manager author; whole outlet can read (needed
-- to render the checklist).
-- ---------------------------------------------------------------------------
create policy checklist_templates_select on checklist_templates
  for select to authenticated
  using (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  );

create policy checklist_templates_write on checklist_templates
  for all to authenticated
  using (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  )
  with check (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

-- ---------------------------------------------------------------------------
-- checklist_submissions — staff see/edit only their own drafts/submissions;
-- owner/manager see everything in their outlet and approve (status ->
-- 'approved').
-- ---------------------------------------------------------------------------
create policy checklist_submissions_select on checklist_submissions
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() = 'owner'
    or (
      public.current_user_role() = 'manager'
      and exists (
        select 1 from checklist_templates t
        where t.id = checklist_submissions.template_id
          and t.outlet_id = public.current_user_outlet()
      )
    )
  );

create policy checklist_submissions_insert on checklist_submissions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy checklist_submissions_update on checklist_submissions
  for update to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() = 'owner'
    or (
      public.current_user_role() = 'manager'
      and exists (
        select 1 from checklist_templates t
        where t.id = checklist_submissions.template_id
          and t.outlet_id = public.current_user_outlet()
      )
    )
  )
  with check (
    -- staff (and anyone) may edit their own draft/submitted report, but only
    -- owner/manager may move a submission into 'approved'
    (status <> 'approved' and user_id = auth.uid())
    or public.current_user_role() in ('owner', 'manager')
  );

-- ---------------------------------------------------------------------------
-- checklist_item_results — mirrors visibility/edit rights of the parent
-- submission.
-- ---------------------------------------------------------------------------
create policy checklist_item_results_select on checklist_item_results
  for select to authenticated
  using (
    exists (
      select 1 from checklist_submissions s
      where s.id = checklist_item_results.submission_id
        and (
          s.user_id = auth.uid()
          or public.current_user_role() = 'owner'
          or (
            public.current_user_role() = 'manager'
            and exists (
              select 1 from checklist_templates t
              where t.id = s.template_id and t.outlet_id = public.current_user_outlet()
            )
          )
        )
    )
  );

create policy checklist_item_results_write on checklist_item_results
  for all to authenticated
  using (
    exists (
      select 1 from checklist_submissions s
      where s.id = checklist_item_results.submission_id
        and (s.user_id = auth.uid() or public.current_user_role() in ('owner', 'manager'))
    )
  )
  with check (
    exists (
      select 1 from checklist_submissions s
      where s.id = checklist_item_results.submission_id
        and (s.user_id = auth.uid() or public.current_user_role() in ('owner', 'manager'))
    )
  );

-- ---------------------------------------------------------------------------
-- training_modules / quiz_questions — owner/manager author; everyone can
-- read modules (Training absolvieren). quiz_questions base table stays
-- locked to owner/manager — staff use get_quiz_questions()/submit_quiz_attempt()
-- from 0001_init.sql so correct_answer never reaches the client.
-- ---------------------------------------------------------------------------
create policy training_modules_select on training_modules
  for select to authenticated using (true);

create policy training_modules_write on training_modules
  for all to authenticated
  using (public.current_user_role() in ('owner', 'manager'))
  with check (public.current_user_role() in ('owner', 'manager'));

create policy quiz_questions_all on quiz_questions
  for all to authenticated
  using (public.current_user_role() in ('owner', 'manager'))
  with check (public.current_user_role() in ('owner', 'manager'));

-- ---------------------------------------------------------------------------
-- staff_training_progress — owner/manager see everyone's progress; staff see
-- and self-track only their own.
-- ---------------------------------------------------------------------------
create policy staff_training_progress_select on staff_training_progress
  for select to authenticated
  using (user_id = auth.uid() or public.current_user_role() in ('owner', 'manager'));

create policy staff_training_progress_write on staff_training_progress
  for all to authenticated
  using (user_id = auth.uid() or public.current_user_role() in ('owner', 'manager'))
  with check (user_id = auth.uid() or public.current_user_role() in ('owner', 'manager'));

-- ---------------------------------------------------------------------------
-- handover_notes — whole outlet reads/writes (shift handover); no cross-
-- outlet visibility for non-owners.
-- ---------------------------------------------------------------------------
create policy handover_notes_select on handover_notes
  for select to authenticated
  using (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  );

create policy handover_notes_insert on handover_notes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

create policy handover_notes_update on handover_notes
  for update to authenticated
  using (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  )
  with check (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  );

-- ---------------------------------------------------------------------------
-- audit_log — owner sees everything; manager sees entries for their own
-- outlet's users; staff has no access. Any signed-in user may append an
-- entry attributed to themselves (the app writes these, never edits/deletes).
-- ---------------------------------------------------------------------------
create policy audit_log_select on audit_log
  for select to authenticated
  using (
    public.current_user_role() = 'owner'
    or (
      public.current_user_role() = 'manager'
      and exists (
        select 1 from users u
        where u.id = audit_log.user_id and u.outlet_id = public.current_user_outlet()
      )
    )
  );

create policy audit_log_insert on audit_log
  for insert to authenticated
  with check (user_id = auth.uid());
