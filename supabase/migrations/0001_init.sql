-- ============================================================================
-- The Logbook — internal bar management schema
-- Phase 1-3 tables per product spec. Run in order with 0002_rls.sql and
-- 0003_storage.sql.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('owner', 'manager', 'staff');
create type item_category as enum ('spirits', 'beer', 'wine', 'mixer', 'garnish', 'consumable');
create type movement_type as enum ('in', 'out');
create type movement_reason as enum ('restock', 'usage', 'waste', 'adjustment');
create type task_status as enum ('open', 'in_progress', 'done');
create type recurrence_type as enum ('daily', 'weekly', 'none');
create type checklist_type as enum ('opening', 'closing');
create type submission_status as enum ('draft', 'submitted', 'approved');
create type quiz_question_type as enum ('multiple_choice', 'short_answer');
create type training_status as enum ('not_started', 'in_progress', 'passed');

-- ---------------------------------------------------------------------------
-- outlets
-- ---------------------------------------------------------------------------
create table outlets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- users (1:1 profile on top of auth.users)
-- ---------------------------------------------------------------------------
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role user_role not null default 'staff',
  outlet_id uuid references outlets (id) on delete set null,
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index users_outlet_id_idx on users (outlet_id);

-- ---------------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------------
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  category text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- inventory_items
-- ---------------------------------------------------------------------------
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category item_category not null,
  unit text not null,
  par_level numeric not null default 0,
  current_stock numeric not null default 0,
  purchase_price numeric,
  outlet_id uuid not null references outlets (id) on delete cascade,
  is_perishable boolean not null default false,
  default_supplier_id uuid references suppliers (id) on delete set null,
  created_at timestamptz not null default now()
);

create index inventory_items_outlet_id_idx on inventory_items (outlet_id);
create index inventory_items_category_idx on inventory_items (category);

-- ---------------------------------------------------------------------------
-- supplier_price_history
-- ---------------------------------------------------------------------------
create table supplier_price_history (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id) on delete cascade,
  item_id uuid not null references inventory_items (id) on delete cascade,
  price numeric not null,
  valid_from date not null default current_date,
  created_at timestamptz not null default now()
);

create index supplier_price_history_item_id_idx on supplier_price_history (item_id, valid_from desc);

-- ---------------------------------------------------------------------------
-- stock_movements
-- ---------------------------------------------------------------------------
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items (id) on delete cascade,
  type movement_type not null,
  quantity numeric not null check (quantity > 0),
  reason movement_reason not null,
  user_id uuid not null references users (id) on delete restrict,
  date timestamptz not null default now(),
  notes text,
  expiry_date date,
  supplier_id uuid references suppliers (id) on delete set null,
  created_at timestamptz not null default now()
);

create index stock_movements_item_id_idx on stock_movements (item_id);
create index stock_movements_date_idx on stock_movements (date desc);

-- ---------------------------------------------------------------------------
-- menu_items & recipes
-- ---------------------------------------------------------------------------
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sale_price numeric not null,
  created_at timestamptz not null default now()
);

create table recipes (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items (id) on delete cascade,
  inventory_item_id uuid not null references inventory_items (id) on delete cascade,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create index recipes_menu_item_id_idx on recipes (menu_item_id);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid references users (id) on delete set null,
  status task_status not null default 'open',
  due_date date,
  recurrence recurrence_type not null default 'none',
  outlet_id uuid not null references outlets (id) on delete cascade,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index tasks_outlet_status_idx on tasks (outlet_id, status);
create index tasks_assigned_to_idx on tasks (assigned_to);

-- ---------------------------------------------------------------------------
-- checklist_templates / submissions / item_results
-- items jsonb shape: [{ text, requires_photo, category }]
-- ---------------------------------------------------------------------------
create table checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name checklist_type not null,
  outlet_id uuid not null references outlets (id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index checklist_templates_outlet_idx on checklist_templates (outlet_id, name);

create table checklist_submissions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references checklist_templates (id) on delete cascade,
  user_id uuid not null references users (id) on delete restrict,
  date date not null default current_date,
  shift text,
  cash_count numeric,
  incident_notes text,
  status submission_status not null default 'draft',
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references users (id) on delete set null
);

create index checklist_submissions_template_idx on checklist_submissions (template_id, date desc);
create index checklist_submissions_user_idx on checklist_submissions (user_id);

create table checklist_item_results (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references checklist_submissions (id) on delete cascade,
  item_text text not null,
  checked boolean not null default false,
  photo_url text,
  photo_taken_at timestamptz,
  created_at timestamptz not null default now(),
  unique (submission_id, item_text)
);

create index checklist_item_results_submission_idx on checklist_item_results (submission_id);

-- ---------------------------------------------------------------------------
-- training_modules / quiz_questions / staff_training_progress
-- ---------------------------------------------------------------------------
create table training_modules (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid references menu_items (id) on delete set null,
  title text not null,
  video_url text,
  description text,
  created_by uuid references users (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  training_module_id uuid not null references training_modules (id) on delete cascade,
  question text not null,
  type quiz_question_type not null,
  options jsonb,
  correct_answer text not null,
  created_at timestamptz not null default now()
);

create index quiz_questions_module_idx on quiz_questions (training_module_id);

create table staff_training_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  training_module_id uuid not null references training_modules (id) on delete cascade,
  status training_status not null default 'not_started',
  last_score numeric,
  passed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, training_module_id)
);

create index staff_training_progress_user_idx on staff_training_progress (user_id);

-- ---------------------------------------------------------------------------
-- handover_notes
-- ---------------------------------------------------------------------------
create table handover_notes (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets (id) on delete cascade,
  user_id uuid not null references users (id) on delete restrict,
  shift text,
  date date not null default current_date,
  content text not null,
  read_by_next_shift boolean not null default false,
  created_at timestamptz not null default now()
);

create index handover_notes_outlet_date_idx on handover_notes (outlet_id, date desc);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete set null,
  action text not null,
  related_table text,
  "timestamp" timestamptz not null default now(),
  change_detail jsonb
);

create index audit_log_timestamp_idx on audit_log ("timestamp" desc);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer to avoid RLS recursion on `users`)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.current_user_outlet()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select outlet_id from public.users where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- New auth user -> profile row (defaults to 'staff'; promote the first
-- account to 'owner' manually after signup, see README).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Stock movement -> current_stock projection (runs as definer so staff can
-- log movements without direct UPDATE rights on inventory_items).
-- ---------------------------------------------------------------------------
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'in' then
    update inventory_items
      set current_stock = current_stock + new.quantity
      where id = new.item_id;
  else
    update inventory_items
      set current_stock = greatest(current_stock - new.quantity, 0)
      where id = new.item_id;
  end if;
  return new;
end;
$$;

create trigger trg_apply_stock_movement
after insert on stock_movements
for each row execute function public.apply_stock_movement();

-- ---------------------------------------------------------------------------
-- Guard: a checklist submission cannot move to 'submitted' while any
-- photo-required item is missing a photo.
-- ---------------------------------------------------------------------------
create or replace function public.check_submission_ready()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_missing int;
begin
  if new.status = 'submitted' and old.status is distinct from 'submitted' then
    select count(*) into v_missing
    from checklist_templates t,
         jsonb_to_recordset(t.items) as x (text text, requires_photo boolean, category text)
    left join checklist_item_results r
      on r.submission_id = new.id and r.item_text = x.text
    where t.id = new.template_id
      and coalesce(x.requires_photo, false) = true
      and (r.id is null or r.photo_url is null or r.checked = false);

    if v_missing > 0 then
      raise exception 'Alle fotopflichtigen Punkte muessen erledigt sein, bevor der Bericht eingereicht werden kann.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_check_submission_ready
before update on checklist_submissions
for each row execute function public.check_submission_ready();

-- ---------------------------------------------------------------------------
-- Quiz scoring (server-side so correct_answer never reaches the client)
-- ---------------------------------------------------------------------------
create or replace function public.submit_quiz_attempt(p_module_id uuid, p_answers jsonb)
returns table (score numeric, passed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_correct int := 0;
  v_score numeric;
  v_passed boolean;
  q record;
begin
  select count(*) into v_total from quiz_questions where training_module_id = p_module_id;
  if v_total = 0 then
    raise exception 'Keine Fragen fuer dieses Modul.';
  end if;

  for q in select id, correct_answer from quiz_questions where training_module_id = p_module_id loop
    if (p_answers ->> q.id::text) = q.correct_answer then
      v_correct := v_correct + 1;
    end if;
  end loop;

  v_score := round((v_correct::numeric / v_total) * 100, 1);
  v_passed := v_score >= 80;

  insert into staff_training_progress (user_id, training_module_id, status, last_score, passed_at)
  values (
    auth.uid(),
    p_module_id,
    case when v_passed then 'passed' else 'in_progress' end,
    v_score,
    case when v_passed then now() else null end
  )
  on conflict (user_id, training_module_id) do update
    set status = excluded.status,
        last_score = excluded.last_score,
        passed_at = coalesce(excluded.passed_at, staff_training_progress.passed_at);

  return query select v_score, v_passed;
end;
$$;

-- Read-only question view for staff (never exposes correct_answer)
create or replace function public.get_quiz_questions(p_module_id uuid)
returns table (id uuid, question text, type quiz_question_type, options jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select id, question, type, options
  from quiz_questions
  where training_module_id = p_module_id;
$$;
