-- checklist_item_results stored a single photo_url/photo_taken_at pair per
-- Punkt, so a second photo (e.g. "before"/"after" for a cleaning task, or
-- retaking a shot without losing the first one) silently overwrote the
-- first. Move photos into their own child table so a Punkt can carry any
-- number of them.

create table checklist_item_photos (
  id uuid primary key default gen_random_uuid(),
  item_result_id uuid not null references checklist_item_results (id) on delete cascade,
  photo_url text not null,
  taken_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index checklist_item_photos_item_result_idx on checklist_item_photos (item_result_id);

alter table checklist_item_photos enable row level security;

-- Mirrors checklist_item_results' own visibility/edit rights (0005), just
-- one join further out through item_result_id -> submission_id.
create policy checklist_item_photos_select on checklist_item_photos
  for select to authenticated
  using (
    exists (
      select 1 from checklist_item_results r
      join checklist_submissions s on s.id = r.submission_id
      where r.id = checklist_item_photos.item_result_id
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

create policy checklist_item_photos_insert on checklist_item_photos
  for insert to authenticated
  with check (
    exists (
      select 1 from checklist_item_results r
      join checklist_submissions s on s.id = r.submission_id
      where r.id = checklist_item_photos.item_result_id
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

create policy checklist_item_photos_delete on checklist_item_photos
  for delete to authenticated
  using (
    exists (
      select 1 from checklist_item_results r
      join checklist_submissions s on s.id = r.submission_id
      where r.id = checklist_item_photos.item_result_id
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

-- Backfill existing single photos before dropping the old columns.
insert into checklist_item_photos (item_result_id, photo_url, taken_at)
select id, photo_url, coalesce(photo_taken_at, created_at)
from checklist_item_results
where photo_url is not null;

-- The submission-ready guard now checks for at least one photo row instead
-- of the old single photo_url column.
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
      and (
        r.id is null
        or r.checked = false
        or not exists (select 1 from checklist_item_photos p where p.item_result_id = r.id)
      );

    if v_missing > 0 then
      raise exception 'Alle fotopflichtigen Punkte muessen erledigt sein, bevor der Bericht eingereicht werden kann.';
    end if;
  end if;
  return new;
end;
$$;

alter table checklist_item_results drop column photo_url;
alter table checklist_item_results drop column photo_taken_at;
