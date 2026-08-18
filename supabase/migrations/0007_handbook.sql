-- ============================================================================
-- Handbuch — the reference manual staff look things up in during a shift
-- ("wie reinige ich die Zapfanlage?"), as opposed to training_modules, which
-- is material you work through once and get scored on.
--
-- Outlet-scoped like checklist_templates rather than global like
-- training_modules: house rules belong to a bar, so a second outlet must not
-- inherit this one's manual.
-- ============================================================================

create table handbook_sections (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets (id) on delete cascade,
  category text not null default 'Allgemein',
  title text not null,
  body text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references users (id) on delete set null
);

create index handbook_sections_outlet_idx on handbook_sections (outlet_id, category, sort_order);
create index handbook_sections_updated_by_idx on handbook_sections (updated_by);

alter table handbook_sections enable row level security;

-- Everyone at the outlet reads it; only owner/manager maintain it — same split
-- as the checklist templates.
create policy handbook_sections_select on handbook_sections
  for select to authenticated
  using (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  );

create policy handbook_sections_insert on handbook_sections
  for insert to authenticated
  with check (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

create policy handbook_sections_update on handbook_sections
  for update to authenticated
  using (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  )
  with check (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

create policy handbook_sections_delete on handbook_sections
  for delete to authenticated
  using (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );
