-- Etikett-Foto for a wine (inventory_items, category 'wine'). Lives on the
-- item, not the slot — the label is a property of the wine itself, and a
-- bottle moving to a different slot shouldn't need a new photo.
-- Path convention: {outlet_id}/{inventory_item_id}/{filename}. Private
-- bucket, read via signed URLs, same shape as checklist-photos/training-videos.

alter table inventory_items add column label_photo_url text;

insert into storage.buckets (id, name, public, file_size_limit)
values ('wine-labels', 'wine-labels', false, 5242880) -- 5 MB
on conflict (id) do nothing;

create policy wine_labels_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wine-labels'
    and (
      public.current_user_role() = 'owner'
      or (storage.foldername(name))[1] = public.current_user_outlet()::text
    )
  );

create policy wine_labels_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wine-labels'
    and public.current_user_role() in ('owner', 'manager')
    and (
      public.current_user_role() = 'owner'
      or (storage.foldername(name))[1] = public.current_user_outlet()::text
    )
  );

create policy wine_labels_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'wine-labels'
    and public.current_user_role() in ('owner', 'manager')
    and (
      public.current_user_role() = 'owner'
      or (storage.foldername(name))[1] = public.current_user_outlet()::text
    )
  );
