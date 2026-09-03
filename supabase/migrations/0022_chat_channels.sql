-- ============================================================================
-- Multi-channel team chat: chat_messages moves from one implicit channel per
-- outlet to explicit "channels" (Slack-style):
--   - kind='outlet'     one per outlet, auto-membership = staff of that outlet
--   - kind='management' a single cross-outlet channel, auto-membership =
--                        owner + manager roles
--   - kind='custom'     department/ad-hoc groups created by owner/manager,
--                        explicit membership via chat_channel_members
-- ============================================================================

create table chat_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('outlet', 'management', 'custom')),
  outlet_id uuid references outlets (id) on delete cascade,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint chat_channels_outlet_kind_check check (
    (kind = 'outlet' and outlet_id is not null) or (kind <> 'outlet' and outlet_id is null)
  )
);

-- Exactly one outlet channel per outlet, exactly one management channel overall.
create unique index chat_channels_one_per_outlet_idx on chat_channels (outlet_id) where kind = 'outlet';
create unique index chat_channels_one_management_idx on chat_channels ((true)) where kind = 'management';

create table chat_channel_members (
  channel_id uuid not null references chat_channels (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create index chat_channel_members_user_id_idx on chat_channel_members (user_id);

-- ---------------------------------------------------------------------------
-- Access check, shared by chat_channels/chat_channel_members/chat_messages
-- RLS so the "who can see this channel" rule lives in exactly one place.
-- ---------------------------------------------------------------------------
create or replace function public.can_access_chat_channel(p_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_channels c
    where c.id = p_channel_id
      and (
        public.current_user_role() = 'owner'
        or (c.kind = 'outlet' and c.outlet_id = public.current_user_outlet())
        or (c.kind = 'management' and public.current_user_role() = 'manager')
        or (
          c.kind = 'custom'
          and (
            c.created_by = auth.uid()
            or exists (
              select 1 from public.chat_channel_members m
              where m.channel_id = c.id and m.user_id = auth.uid()
            )
          )
        )
      )
  );
$$;

-- Backfill: an outlet channel for every existing outlet, plus one shared
-- management channel.
insert into chat_channels (name, kind, outlet_id)
select name, 'outlet', id from outlets;

insert into chat_channels (name, kind)
values ('Management', 'management');

-- ---------------------------------------------------------------------------
-- chat_messages: replace outlet_id scoping with channel_id.
-- ---------------------------------------------------------------------------
alter table chat_messages add column channel_id uuid references chat_channels (id) on delete cascade;

update chat_messages m
set channel_id = c.id
from chat_channels c
where c.kind = 'outlet' and c.outlet_id = m.outlet_id;

alter table chat_messages alter column channel_id set not null;

drop policy chat_messages_select on chat_messages;
drop policy chat_messages_insert on chat_messages;

alter table chat_messages drop column outlet_id;

drop index if exists chat_messages_outlet_created_idx;
create index chat_messages_channel_created_idx on chat_messages (channel_id, created_at);

create policy chat_messages_select on chat_messages
  for select to authenticated
  using (public.can_access_chat_channel(channel_id));

create policy chat_messages_insert on chat_messages
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_access_chat_channel(channel_id)
  );

-- ---------------------------------------------------------------------------
-- chat_channels RLS
-- ---------------------------------------------------------------------------
alter table chat_channels enable row level security;

create policy chat_channels_select on chat_channels
  for select to authenticated
  using (public.can_access_chat_channel(id));

create policy chat_channels_insert on chat_channels
  for insert to authenticated
  with check (
    kind = 'custom'
    and created_by = (select auth.uid())
    and public.current_user_role() in ('owner', 'manager')
  );

create policy chat_channels_delete on chat_channels
  for delete to authenticated
  using (
    kind = 'custom'
    and (created_by = (select auth.uid()) or public.current_user_role() = 'owner')
  );

-- ---------------------------------------------------------------------------
-- chat_channel_members RLS
-- ---------------------------------------------------------------------------
alter table chat_channel_members enable row level security;

create policy chat_channel_members_select on chat_channel_members
  for select to authenticated
  using (public.can_access_chat_channel(channel_id));

create policy chat_channel_members_insert on chat_channel_members
  for insert to authenticated
  with check (
    exists (
      select 1 from chat_channels c
      where c.id = channel_id
        and c.kind = 'custom'
        and (c.created_by = (select auth.uid()) or public.current_user_role() = 'owner')
    )
  );

create policy chat_channel_members_delete on chat_channel_members
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from chat_channels c
      where c.id = channel_id
        and c.kind = 'custom'
        and (c.created_by = (select auth.uid()) or public.current_user_role() = 'owner')
    )
  );

alter publication supabase_realtime add table chat_channels;
alter publication supabase_realtime add table chat_channel_members;
