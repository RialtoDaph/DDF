-- ============================================================================
-- Franz: the bar's own AI assistant. One private, append-only conversation
-- per user (not shared like chat_messages) — nobody else, owner included,
-- can read another person's chat with Franz. Any write Franz performs on a
-- user's behalf goes through the app's own server actions, so it lands in
-- audit_log under that user's id like any other change; this table only
-- ever holds the natural-language back-and-forth, never a second source of
-- truth for app data.
-- ============================================================================

create table franz_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  outlet_id uuid references outlets (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index franz_messages_user_created_idx on franz_messages (user_id, created_at);

alter table franz_messages enable row level security;

-- Strictly own-rows-only — no owner-sees-all bypass here, unlike every other
-- outlet-scoped table. This is a personal assistant, not a shared channel.
create policy franz_messages_select on franz_messages
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy franz_messages_insert on franz_messages
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Append-only in this first version: no update/delete policy, so a
-- conversation can't be edited or purged via the API (matches chat_messages).
