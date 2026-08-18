-- ============================================================================
-- Performance + RLS correctness fixes found by `supabase advisors`:
--
-- 1. auth.uid() called bare in RLS policies gets re-evaluated per row instead
--    of once per query. Wrapping it as (select auth.uid()) lets Postgres
--    treat it as an initplan. Purely mechanical — same semantics.
-- 2. Several foreign keys have no covering index, forcing a seq scan on the
--    referenced table for every FK check / cascade / join.
-- 3. checklist_item_results_write (a `for all` policy, so it also applies to
--    SELECT) let *any* manager read/write results belonging to *any* other
--    outlet, because unlike checklist_item_results_select it never checked
--    the manager's outlet against the submission's template outlet. Fixed to
--    match the select policy's outlet scoping, then split off SELECT (now
--    covered by checklist_item_results_select alone) so the two permissive
--    policies stop being evaluated redundantly on every read.
-- 4. A handful of other tables have a `_select` policy (using true, or a
--    superset of `_write`'s condition) plus a `_write` policy declared
--    `for all`, so SELECT queries evaluate both permissive policies for no
--    behavioral benefit. Narrowed those `_write` policies to the
--    insert/update/delete actions they're actually meant to gate.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Wrap bare auth.uid() calls as (select auth.uid())
-- ---------------------------------------------------------------------------
alter policy users_select on users
  using (
    id = (select auth.uid())
    or public.current_user_role() = 'owner'
    or (public.current_user_role() = 'manager' and outlet_id = public.current_user_outlet())
  );

alter policy users_update_self on users
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = public.current_user_role());

alter policy stock_movements_insert on stock_movements
  with check (
    user_id = (select auth.uid())
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

alter policy tasks_select on tasks
  using (
    public.current_user_role() = 'owner'
    or (public.current_user_role() = 'manager' and outlet_id = public.current_user_outlet())
    or assigned_to = (select auth.uid())
  );

alter policy tasks_update on tasks
  using (
    public.current_user_role() = 'owner'
    or (public.current_user_role() = 'manager' and outlet_id = public.current_user_outlet())
    or assigned_to = (select auth.uid())
  )
  with check (
    public.current_user_role() = 'owner'
    or (public.current_user_role() = 'manager' and outlet_id = public.current_user_outlet())
    or assigned_to = (select auth.uid())
  );

alter policy checklist_submissions_select on checklist_submissions
  using (
    user_id = (select auth.uid())
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

alter policy checklist_submissions_insert on checklist_submissions
  with check (user_id = (select auth.uid()));

alter policy checklist_submissions_update on checklist_submissions
  using (
    user_id = (select auth.uid())
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
    (status <> 'approved' and user_id = (select auth.uid()))
    or public.current_user_role() in ('owner', 'manager')
  );

alter policy staff_training_progress_select on staff_training_progress
  using (user_id = (select auth.uid()) or public.current_user_role() in ('owner', 'manager'));

alter policy handover_notes_insert on handover_notes
  with check (
    user_id = (select auth.uid())
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

alter policy audit_log_insert on audit_log
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. checklist_item_results: fix the outlet-scoping gap, wrap auth.uid(),
--    and split so it no longer duplicates checklist_item_results_select.
-- ---------------------------------------------------------------------------
drop policy checklist_item_results_write on checklist_item_results;

create policy checklist_item_results_write on checklist_item_results
  for insert to authenticated
  with check (
    exists (
      select 1 from checklist_submissions s
      where s.id = checklist_item_results.submission_id
        and (
          s.user_id = (select auth.uid())
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

create policy checklist_item_results_update on checklist_item_results
  for update to authenticated
  using (
    exists (
      select 1 from checklist_submissions s
      where s.id = checklist_item_results.submission_id
        and (
          s.user_id = (select auth.uid())
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
  )
  with check (
    exists (
      select 1 from checklist_submissions s
      where s.id = checklist_item_results.submission_id
        and (
          s.user_id = (select auth.uid())
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

alter policy checklist_item_results_select on checklist_item_results
  using (
    exists (
      select 1 from checklist_submissions s
      where s.id = checklist_item_results.submission_id
        and (
          s.user_id = (select auth.uid())
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

-- ---------------------------------------------------------------------------
-- 3. Narrow `for all` write policies to insert/update/delete where the
--    matching `_select` policy already covers (or is a superset of) SELECT,
--    so the planner isn't OR-ing two permissive policies on every read.
-- ---------------------------------------------------------------------------
drop policy checklist_templates_write on checklist_templates;
create policy checklist_templates_write on checklist_templates
  for insert to authenticated
  with check (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );
create policy checklist_templates_update on checklist_templates
  for update to authenticated
  using (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  )
  with check (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );
create policy checklist_templates_delete on checklist_templates
  for delete to authenticated
  using (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

drop policy inventory_items_write on inventory_items;
create policy inventory_items_insert on inventory_items
  for insert to authenticated
  with check (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );
create policy inventory_items_update on inventory_items
  for update to authenticated
  using (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  )
  with check (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );
create policy inventory_items_delete on inventory_items
  for delete to authenticated
  using (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

drop policy menu_items_write on menu_items;
create policy menu_items_insert on menu_items for insert to authenticated
  with check (public.current_user_role() in ('owner', 'manager'));
create policy menu_items_update on menu_items for update to authenticated
  using (public.current_user_role() in ('owner', 'manager'))
  with check (public.current_user_role() in ('owner', 'manager'));
create policy menu_items_delete on menu_items for delete to authenticated
  using (public.current_user_role() in ('owner', 'manager'));

drop policy recipes_write on recipes;
create policy recipes_insert on recipes for insert to authenticated
  with check (public.current_user_role() in ('owner', 'manager'));
create policy recipes_update on recipes for update to authenticated
  using (public.current_user_role() in ('owner', 'manager'))
  with check (public.current_user_role() in ('owner', 'manager'));
create policy recipes_delete on recipes for delete to authenticated
  using (public.current_user_role() in ('owner', 'manager'));

drop policy outlets_write on outlets;
create policy outlets_insert on outlets for insert to authenticated
  with check (public.current_user_role() = 'owner');
create policy outlets_update on outlets for update to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');
create policy outlets_delete on outlets for delete to authenticated
  using (public.current_user_role() = 'owner');

drop policy supplier_price_history_write on supplier_price_history;
create policy supplier_price_history_insert on supplier_price_history for insert to authenticated
  with check (public.current_user_role() in ('owner', 'manager'));
create policy supplier_price_history_update on supplier_price_history for update to authenticated
  using (public.current_user_role() in ('owner', 'manager'))
  with check (public.current_user_role() in ('owner', 'manager'));
create policy supplier_price_history_delete on supplier_price_history for delete to authenticated
  using (public.current_user_role() in ('owner', 'manager'));

drop policy suppliers_write on suppliers;
create policy suppliers_insert on suppliers for insert to authenticated
  with check (public.current_user_role() in ('owner', 'manager'));
create policy suppliers_update on suppliers for update to authenticated
  using (public.current_user_role() in ('owner', 'manager'))
  with check (public.current_user_role() in ('owner', 'manager'));
create policy suppliers_delete on suppliers for delete to authenticated
  using (public.current_user_role() in ('owner', 'manager'));

drop policy training_modules_write on training_modules;
create policy training_modules_insert on training_modules for insert to authenticated
  with check (public.current_user_role() in ('owner', 'manager'));
create policy training_modules_update on training_modules for update to authenticated
  using (public.current_user_role() in ('owner', 'manager'))
  with check (public.current_user_role() in ('owner', 'manager'));
create policy training_modules_delete on training_modules for delete to authenticated
  using (public.current_user_role() in ('owner', 'manager'));

drop policy staff_training_progress_write on staff_training_progress;
create policy staff_training_progress_insert on staff_training_progress for insert to authenticated
  with check (user_id = (select auth.uid()) or public.current_user_role() in ('owner', 'manager'));
create policy staff_training_progress_update on staff_training_progress for update to authenticated
  using (user_id = (select auth.uid()) or public.current_user_role() in ('owner', 'manager'))
  with check (user_id = (select auth.uid()) or public.current_user_role() in ('owner', 'manager'));
create policy staff_training_progress_delete on staff_training_progress for delete to authenticated
  using (user_id = (select auth.uid()) or public.current_user_role() in ('owner', 'manager'));

-- ---------------------------------------------------------------------------
-- 4. Cover unindexed foreign keys.
-- ---------------------------------------------------------------------------
create index if not exists audit_log_user_id_idx on audit_log (user_id);
create index if not exists checklist_submissions_approved_by_idx on checklist_submissions (approved_by);
create index if not exists handover_notes_user_id_idx on handover_notes (user_id);
create index if not exists inventory_items_default_supplier_id_idx on inventory_items (default_supplier_id);
create index if not exists recipes_inventory_item_id_idx on recipes (inventory_item_id);
create index if not exists staff_training_progress_training_module_id_idx on staff_training_progress (training_module_id);
create index if not exists stock_movements_supplier_id_idx on stock_movements (supplier_id);
create index if not exists stock_movements_user_id_idx on stock_movements (user_id);
create index if not exists supplier_price_history_supplier_id_idx on supplier_price_history (supplier_id);
create index if not exists tasks_created_by_idx on tasks (created_by);
create index if not exists training_modules_created_by_idx on training_modules (created_by);
create index if not exists training_modules_menu_item_id_idx on training_modules (menu_item_id);
