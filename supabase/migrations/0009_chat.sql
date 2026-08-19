-- ============================================================================
-- Internal chat: one shared channel per outlet (no DMs). Realtime-enabled so
-- messages appear live without polling.
-- ============================================================================

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index chat_messages_outlet_created_idx on chat_messages (outlet_id, created_at);

alter table chat_messages enable row level security;

-- Owner reads/writes across all outlets; manager/staff are scoped to their
-- own outlet's channel, same pattern as handover_notes.
create policy chat_messages_select on chat_messages
  for select to authenticated
  using (
    public.current_user_role() = 'owner'
    or outlet_id = public.current_user_outlet()
  );

create policy chat_messages_insert on chat_messages
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (public.current_user_role() = 'owner' or outlet_id = public.current_user_outlet())
  );

-- Messages are append-only in this first version: no update/delete policy,
-- so nobody (including owner) can edit or remove a sent message via the API.

alter publication supabase_realtime add table chat_messages;
