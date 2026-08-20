-- ============================================================================
-- events ("Anstehende Termine"): outlet-scoped calendar notes (holidays,
-- deliveries, closures) surfaced on the Dashboard sidebar. New in the
-- redesign — not present before this migration.
-- ============================================================================

create table events (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets (id) on delete cascade,
  label text not null check (char_length(trim(label)) > 0),
  event_date date not null,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index events_outlet_date_idx on events (outlet_id, event_date);

alter table events enable row level security;

-- Whole outlet reads (Dashboard widget for everyone); only manager/owner
-- maintain the list, same split as checklist_templates.
create policy events_select on events
  for select to authenticated
  using (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  );

create policy events_write on events
  for all to authenticated
  using (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  )
  with check (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );
