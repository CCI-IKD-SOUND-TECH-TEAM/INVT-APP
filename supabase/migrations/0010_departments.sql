-- Departments become user-managed taxonomy, and "Power" joins the seeded set.
--
-- Departments were fixed at three (Sound, Light, Projection) since 0002: seeded
-- in SQL, hardcoded as a TypeScript union, and hardcoded again in the bulk
-- importer's validation. Adding a fourth meant a migration. They now sit
-- alongside categories and units of measure as something staff manage from
-- Settings.
--
-- Access model is unchanged: authenticated staff read and write everything.

insert into public.departments (name) values ('Power')
on conflict (name) do nothing;

-- Settings shows "assigned to N items" beside every taxonomy row so the user
-- knows what a rename or delete would affect. Departments need the same count,
-- which is a third branch on the existing union — the output columns are
-- unchanged, so `create or replace view` accepts it.
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
group by u.name
union all
select 'department' as kind, d.name, count(i.id)::int as count
from public.departments d
left join public.inventory_items i on i.department_id = d.id
group by d.name;

grant select on public.taxonomy_usage to authenticated;
