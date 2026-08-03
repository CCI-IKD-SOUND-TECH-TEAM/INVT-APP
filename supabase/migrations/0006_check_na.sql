-- Weekly checks: 'not_applicable' result — items the department doesn't
-- actually have (e.g. imported records never physically owned). N/A completes
-- coverage without counting as missing, so it never triggers the
-- missing-items email or the "flagged" dashboard state.

-- Allow the new result value.
alter table public.check_entries drop constraint if exists check_entries_result_check;
alter table public.check_entries add constraint check_entries_result_check
  check (result in ('present','missing','issue','not_applicable'));

-- Nothing is counted for missing OR n/a entries.
alter table public.check_entries drop constraint if exists check_entries_missing_zero;
alter table public.check_entries add constraint check_entries_missing_zero
  check (result not in ('missing','not_applicable') or quantity_seen = 0);

-- Summary counter, denormalized like the others by completeCheckSession.
alter table public.check_sessions add column if not exists na_count integer;

-- item_last_confirmed intentionally unchanged: it counts present/issue only,
-- and an n/a item was not physically seen.
