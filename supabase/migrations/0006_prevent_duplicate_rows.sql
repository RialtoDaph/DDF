-- ============================================================================
-- Guard against the duplicate rows that both checklist reads assume can't
-- exist.
--
-- checklist_templates: "Standard-Vorlage anlegen" is reachable from the
--   checklist page and from settings, with nothing stopping a second insert.
--   Two 'opening' templates for one outlet made the opening/closing pages
--   fail permanently, because they resolve the template with a single-row
--   read.
--
-- checklist_submissions: getOrCreateSubmission() reads-then-inserts during
--   page render, so two overlapping requests could both create today's row
--   for the same user — same permanent failure on every later visit.
--
-- Existing duplicates are collapsed onto the oldest row first; for
-- submissions the newer duplicates are deleted, which cascades to their
-- checklist_item_results, so the surviving row keeps the results that were
-- filled in first.
-- ============================================================================

delete from checklist_templates t
where exists (
  select 1 from checklist_templates keep
  where keep.outlet_id = t.outlet_id
    and keep.name = t.name
    and (keep.created_at, keep.id) < (t.created_at, t.id)
);

create unique index if not exists checklist_templates_outlet_name_key
  on checklist_templates (outlet_id, name);

delete from checklist_submissions s
where exists (
  select 1 from checklist_submissions keep
  where keep.template_id = s.template_id
    and keep.user_id = s.user_id
    and keep.date = s.date
    and (keep.created_at, keep.id) < (s.created_at, s.id)
);

create unique index if not exists checklist_submissions_template_user_date_key
  on checklist_submissions (template_id, user_id, date);
