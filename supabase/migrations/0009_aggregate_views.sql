-- Query layer, part 2 — aggregate views added after 0008 was already applied.
--
-- These belong logically with 0008 (they are the same migration's worth of
-- work: pushing per-row scans the browser used to do into Postgres), but 0008
-- had already been pushed by the time they were written. `supabase db push`
-- tracks migrations by version, not by content, so editing 0008 in place would
-- have been silently skipped. They live here instead.
--
--   inventory_status_counts     — the inventory filter chips
--   inventory_department_counts — the weekly-check landing page
--   taxonomy_usage              — the counts beside each Settings term
--
-- All three are security_invoker views over tables the caller already reads,
-- so RLS applies exactly as it would for a direct query.

-- ---------------------------------------------------------------------------
-- 3b. Status counts — the inventory filter chips
-- ---------------------------------------------------------------------------
-- The chips show an absolute count per status, independent of the active
-- filters, so they cannot be derived from a filtered page. One grouped scan,
-- cached separately from the list so paging and sorting never refetch it.
create or replace view public.inventory_status_counts
  with (security_invoker = true) as
select status, count(*)::int as count
from public.inventory_items
group by status;

grant select on public.inventory_status_counts to authenticated;

-- Per-department checkable counts, for the weekly-check landing page: it shows
-- how many items each department's walkthrough will cover, and picks a default
-- tab from the first department that has any.
create or replace view public.inventory_department_counts
  with (security_invoker = true) as
select department_id, count(*)::int as count
from public.inventory_items
where status <> 'Retired'
group by department_id;

grant select on public.inventory_department_counts to authenticated;

-- Settings shows how many items each category and unit is attached to, so the
-- user knows what a rename or delete would affect. LEFT JOINed so a taxonomy
-- row nothing uses still reports 0 rather than vanishing from the list.
create or replace view public.taxonomy_usage
  with (security_invoker = true) as
select 'category' as kind, c.name, count(i.id)::int as count
from public.categories c
left join public.inventory_items i on i.category_id = c.id
group by c.name
union all
select 'unit' as kind, u.name, count(i.id)::int as count
from public.units u
left join public.inventory_items i on i.unit_of_measure = u.name
group by u.name;

grant select on public.taxonomy_usage to authenticated;
