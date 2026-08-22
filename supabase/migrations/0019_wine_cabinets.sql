-- Weinschrank-Karte: a physical slot map for wine cabinets. Each cabinet has
-- a fixed template of 15 racks x 9 bottle places (135 slots), matching the
-- real pull-out slat racks. A slot optionally holds one inventory_items row
-- (category = 'wine') so placing/removing a bottle is a real stock
-- movement, not a shadow count. Vintage is deliberately not tracked here —
-- inventory_items.name is already the one product line per distinct wine,
-- same convention as everywhere else in the app.

alter table inventory_items add column wine_type text check (wine_type in ('rot', 'weiss', 'rose', 'sekt'));

create table wine_cabinets (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets (id) on delete cascade,
  name text not null,
  temperature_c numeric,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table wine_slots (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references wine_cabinets (id) on delete cascade,
  rack_number int not null check (rack_number between 1 and 15),
  slot_number int not null check (slot_number between 1 and 9),
  inventory_item_id uuid references inventory_items (id) on delete set null,
  flipped boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (cabinet_id, rack_number, slot_number)
);

create index wine_slots_cabinet_idx on wine_slots (cabinet_id);
create index wine_slots_item_idx on wine_slots (inventory_item_id);

alter table wine_cabinets enable row level security;
alter table wine_slots enable row level security;

-- Cabinets: viewing follows outlet membership. Adding/renaming/removing a
-- cabinet is master-data setup (same tier as creating a checklist template
-- or menu item) — owner/manager only.
create policy wine_cabinets_select on wine_cabinets
  for select to authenticated
  using (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  );

create policy wine_cabinets_insert on wine_cabinets
  for insert to authenticated
  with check (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

create policy wine_cabinets_update on wine_cabinets
  for update to authenticated
  using (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  )
  with check (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

create policy wine_cabinets_delete on wine_cabinets
  for delete to authenticated
  using (
    public.current_user_role() in ('owner', 'manager')
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

-- Slots: the 135 rows per cabinet are seeded once when the cabinet is
-- created (owner/manager, alongside wine_cabinets_insert) — day-to-day
-- assigning/removing a bottle or flipping its orientation is everyday
-- staff work, like recording a stock movement, so any outlet member can
-- update an existing slot.
create policy wine_slots_select on wine_slots
  for select to authenticated
  using (
    exists (
      select 1 from wine_cabinets c
      where c.id = wine_slots.cabinet_id
        and (public.current_user_role() = 'owner' or c.outlet_id = public.current_user_outlet())
    )
  );

create policy wine_slots_insert on wine_slots
  for insert to authenticated
  with check (
    exists (
      select 1 from wine_cabinets c
      where c.id = wine_slots.cabinet_id
        and public.current_user_role() in ('owner', 'manager')
        and (public.current_user_role() = 'owner' or c.outlet_id = public.current_user_outlet())
    )
  );

create policy wine_slots_update on wine_slots
  for update to authenticated
  using (
    exists (
      select 1 from wine_cabinets c
      where c.id = wine_slots.cabinet_id
        and (public.current_user_role() = 'owner' or c.outlet_id = public.current_user_outlet())
    )
  )
  with check (
    exists (
      select 1 from wine_cabinets c
      where c.id = wine_slots.cabinet_id
        and (public.current_user_role() = 'owner' or c.outlet_id = public.current_user_outlet())
    )
  );
