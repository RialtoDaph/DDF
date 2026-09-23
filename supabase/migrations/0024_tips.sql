-- ============================================================================
-- Trinkgeld (tips): a manager/owner enters one total tip amount per day plus
-- who worked that day. 40% goes to a flat Kitchen pool (no per-person split
-- there — see product decision), the remaining 60% is split evenly across
-- that day's workers. A weekly view (Monday-start, matching the Wochencheck
-- convention in checklists/shared/lib.ts) sums each person's share across
-- the days they worked that week.
--
-- kitchen_share/staff_share are stored on the row (not recomputed from a
-- ratio at read time) so a later change to the split ratio never rewrites
-- history.
-- ============================================================================

create table tip_days (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets (id) on delete cascade,
  tip_date date not null,
  total_amount numeric not null check (total_amount >= 0),
  kitchen_share numeric not null check (kitchen_share >= 0),
  staff_share numeric not null check (staff_share >= 0),
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outlet_id, tip_date)
);

create index tip_days_outlet_date_idx on tip_days (outlet_id, tip_date);
create index tip_days_created_by_idx on tip_days (created_by);

create table tip_day_workers (
  tip_day_id uuid not null references tip_days (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  primary key (tip_day_id, user_id)
);

create index tip_day_workers_user_id_idx on tip_day_workers (user_id);

alter table tip_days enable row level security;
alter table tip_day_workers enable row level security;

-- Whole outlet reads (everyone should be able to see how the pool was
-- split) — owner sees every outlet. Only owner/manager enter/edit/delete,
-- same tier as checklist template management.
create policy tip_days_select on tip_days
  for select to authenticated
  using (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  );

create policy tip_days_insert on tip_days
  for insert to authenticated
  with check (
    public.current_user_role() = 'owner'
    or (public.current_user_role() = 'manager' and outlet_id = public.current_user_outlet())
  );

create policy tip_days_update on tip_days
  for update to authenticated
  using (
    public.current_user_role() = 'owner'
    or (public.current_user_role() = 'manager' and outlet_id = public.current_user_outlet())
  )
  with check (
    public.current_user_role() = 'owner'
    or (public.current_user_role() = 'manager' and outlet_id = public.current_user_outlet())
  );

create policy tip_days_delete on tip_days
  for delete to authenticated
  using (
    public.current_user_role() = 'owner'
    or (public.current_user_role() = 'manager' and outlet_id = public.current_user_outlet())
  );

-- tip_day_workers: visibility/management follow the parent tip_days row.
create policy tip_day_workers_select on tip_day_workers
  for select to authenticated
  using (
    exists (
      select 1 from tip_days d
      where d.id = tip_day_id
        and (public.current_user_role() = 'owner' or d.outlet_id = public.current_user_outlet())
    )
  );

create policy tip_day_workers_insert on tip_day_workers
  for insert to authenticated
  with check (
    exists (
      select 1 from tip_days d
      where d.id = tip_day_id
        and (
          public.current_user_role() = 'owner'
          or (public.current_user_role() = 'manager' and d.outlet_id = public.current_user_outlet())
        )
    )
  );

create policy tip_day_workers_delete on tip_day_workers
  for delete to authenticated
  using (
    exists (
      select 1 from tip_days d
      where d.id = tip_day_id
        and (
          public.current_user_role() = 'owner'
          or (public.current_user_role() = 'manager' and d.outlet_id = public.current_user_outlet())
        )
    )
  );
