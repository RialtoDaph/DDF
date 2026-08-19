-- ============================================================================
-- Weekly and monthly checklists.
--
-- Until now every checklist was implicitly daily: a submission was keyed by
-- the calendar date it was filled in on. That breaks for a Wochencheck — one
-- started on Tuesday and finished on Thursday would be two separate empty
-- forms, and nothing would ever count as "done for this week".
--
-- period_start names the period a submission covers (the day itself for
-- opening/closing, the Monday for weekly, the 1st for monthly), and the
-- uniqueness constraint moves onto it.
-- ============================================================================

-- Enum values are added in their own migration: Postgres will not let a value
-- be used in the same transaction that adds it.
alter type checklist_type add value if not exists 'weekly';
alter type checklist_type add value if not exists 'monthly';

alter table checklist_submissions add column if not exists period_start date;

update checklist_submissions set period_start = date where period_start is null;

alter table checklist_submissions alter column period_start set not null;
alter table checklist_submissions alter column period_start set default current_date;

drop index if exists checklist_submissions_template_user_date_key;

create unique index if not exists checklist_submissions_template_user_period_key
  on checklist_submissions (template_id, user_id, period_start);
