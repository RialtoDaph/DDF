-- ============================================================================
-- Storage buckets
-- checklist-photos: live camera captures for opening/closing/round-check.
--   Path convention: {outlet_id}/{submission_id}/{filename}
-- training-videos: instructional videos for training modules.
--   Path convention: {module_id}/{filename}
-- Both buckets are private; the app reads via signed URLs.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('checklist-photos', 'checklist-photos', false, 15728640) -- 15 MB
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('training-videos', 'training-videos', false, 524288000) -- 500 MB
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- checklist-photos — first path segment is the outlet id.
-- ---------------------------------------------------------------------------
create policy checklist_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'checklist-photos'
    and (
      public.current_user_role() = 'owner'
      or (storage.foldername(name))[1] = public.current_user_outlet()::text
    )
  );

create policy checklist_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'checklist-photos'
    and (
      public.current_user_role() = 'owner'
      or (storage.foldername(name))[1] = public.current_user_outlet()::text
    )
  );

create policy checklist_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'checklist-photos'
    and public.current_user_role() in ('owner', 'manager')
    and (
      public.current_user_role() = 'owner'
      or (storage.foldername(name))[1] = public.current_user_outlet()::text
    )
  );

-- ---------------------------------------------------------------------------
-- training-videos — everyone signed in can view; only owner/manager upload.
-- ---------------------------------------------------------------------------
create policy training_videos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'training-videos');

create policy training_videos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'training-videos' and public.current_user_role() in ('owner', 'manager'));

create policy training_videos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'training-videos' and public.current_user_role() in ('owner', 'manager'));
