-- Manual "what to buy, from where" shopping list. Kept independent from
-- inventory_items/par_level for now (deliberately manual per request) — an
-- inventory_item_id link can be added later if/when this gets an
-- auto-generate-from-low-stock mode.

create type order_item_status as enum ('open', 'ordered');

create table order_list_items (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets (id) on delete cascade,
  item_name text not null,
  quantity text,
  supplier_id uuid references suppliers (id) on delete set null,
  supplier_name text,
  notes text,
  status order_item_status not null default 'open',
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  ordered_at timestamptz,
  ordered_by uuid references users (id) on delete set null
);

create index order_list_items_outlet_status_idx on order_list_items (outlet_id, status);

alter table order_list_items enable row level security;

-- Any active staff member can read/manage their own outlet's list — this is
-- a shared working list (like Aufgaben), not scoped to whoever created each
-- row. Owners see/manage every outlet.
create policy order_list_items_select on order_list_items
  for select to authenticated
  using (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  );

create policy order_list_items_insert on order_list_items
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

create policy order_list_items_update on order_list_items
  for update to authenticated
  using (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  )
  with check (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  );

create policy order_list_items_delete on order_list_items
  for delete to authenticated
  using (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  );
