-- Individual physical units inside one item row.
--
-- Until now an item row carried a single `serial_number` and a single `status`
-- for the whole group (0002 says so explicitly: "an item row is a group with a
-- quantity (e.g. 4 identical speakers), not a single physical unit"). So two
-- speakers of the same type could not hold different serials, and one of them
-- could not be defective while the other stayed in service.
--
-- Opt-in per item. An item with no rows in item_units behaves exactly as
-- before, and consumables (50 rolls of tape) are never expected to have any.
--
-- Access model is unchanged: authenticated staff read and write everything.

-- ---------------------------------------------------------------------------
-- 1. item_units
-- ---------------------------------------------------------------------------
create table if not exists public.item_units (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid        not null references public.inventory_items (id) on delete cascade,
  -- Shown wherever a unit has to be named — "Speaker 1", "Left", "Stage Right".
  -- Not null so every picker has something to render when no serial is set.
  label         text        not null,
  serial_number text,
  -- Independently tracked, which is the whole point: one speaker can be
  -- Defective while its twin stays Available.
  status        text        not null default 'Available'
                  check (status in ('Available','In Use','Defective','Under Repair','Retired')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists item_units_item_idx on public.item_units (item_id, label);
create index if not exists item_units_status_idx on public.item_units (status);

-- Serials identify hardware, so they are unique across the whole inventory,
-- not just within one item. Partial, because a serial is optional and any
-- number of units may have none.
create unique index if not exists item_units_serial_key
  on public.item_units (serial_number)
  where serial_number is not null;

drop trigger if exists set_item_units_updated_at on public.item_units;
create trigger set_item_units_updated_at
  before update on public.item_units
  for each row execute function public.set_updated_at();

alter table public.item_units enable row level security;

drop policy if exists "authenticated read item_units" on public.item_units;
create policy "authenticated read item_units" on public.item_units
  for select to authenticated using (true);

drop policy if exists "authenticated write item_units" on public.item_units;
create policy "authenticated write item_units" on public.item_units
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 2. defects.item_unit_id — which one is broken
-- ---------------------------------------------------------------------------
-- Nullable: a defect against an item that tracks no units (or against the whole
-- group) leaves this null, so every defect logged before this migration stays
-- valid. `on delete set null` keeps the defect and its repair history when a
-- unit row is removed — the history is the audit trail.
alter table public.defects
  add column if not exists item_unit_id uuid references public.item_units (id) on delete set null;

create index if not exists defects_item_unit_idx on public.defects (item_unit_id);

-- ---------------------------------------------------------------------------
-- 3. Quantity follows the unit list
-- ---------------------------------------------------------------------------
-- Once an item tracks units, two speakers means two unit rows means quantity 2.
-- Enforced here rather than in the app so the two cannot drift: a stale
-- quantity would feed the low-stock digest and the weekly check's expected
-- count with a number nobody entered.
--
-- Retired units are excluded — a retired unit is not stock.
--
-- Removing the last unit row is the one case this trigger deliberately does not
-- answer: with nothing left to count from, there is no derived quantity, so it
-- stops writing (the `exists` guard) and the caller supplies one. updateItem
-- reconciles units before writing the item's columns precisely so that the
-- untracking path's own quantity is the last write to land.
create or replace function public.sync_item_quantity_from_units()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  live   integer;
begin
  -- NEW is unassigned on DELETE, so branch on the operation rather than
  -- coalescing the two record variables.
  if tg_op = 'DELETE' then
    target := old.item_id;
  else
    target := new.item_id;
  end if;

  select count(*) into live
  from public.item_units
  where item_id = target and status <> 'Retired';

  if exists (select 1 from public.item_units where item_id = target) then
    update public.inventory_items
       set quantity = live
     where id = target and quantity is distinct from live;
  end if;

  return null;
end;
$$;

drop trigger if exists sync_quantity_on_item_units on public.item_units;
create trigger sync_quantity_on_item_units
  after insert or update of status, item_id or delete on public.item_units
  for each row execute function public.sync_item_quantity_from_units();

-- The other direction: reject a quantity written directly to an item that
-- tracks units, whatever writes it — the item form, a bulk import, or a future
-- caller. Without this the number could still drift the moment someone edits
-- the item without touching its unit list.
create or replace function public.pin_quantity_to_units()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total integer;
  live  integer;
begin
  select
    count(*),
    count(*) filter (where status <> 'Retired')
  into total, live
  from public.item_units
  where item_id = new.id;

  -- Only pin once the item actually tracks units; otherwise the quantity is
  -- entered by hand and must be left alone.
  if total > 0 then
    new.quantity := live;
  end if;

  return new;
end;
$$;

drop trigger if exists pin_quantity_on_inventory_items on public.inventory_items;
create trigger pin_quantity_on_inventory_items
  before update of quantity on public.inventory_items
  for each row execute function public.pin_quantity_to_units();

-- ---------------------------------------------------------------------------
-- 4. Unit counts on the list view
-- ---------------------------------------------------------------------------
-- So the inventory card can say "1 of 2 defective" without a second query per
-- row. Appended to the end of the existing column list, which is the only
-- change `create or replace view` permits.
create or replace view public.inventory_items_list
  with (security_invoker = true) as
select
  i.id,
  i.item_name,
  i.category_id,
  i.department_id,
  i.quantity,
  i.minimum_stock_threshold,
  i.status,
  i.location,
  i.date_acquired,
  i.estimated_value,
  i.unit_of_measure,
  i.asset_type,
  i.is_low_stock,
  i.created_at,
  i.updated_at,
  c.name as category_name,
  d.name as department_name,
  img.url as first_image_url,
  u.unit_count,
  u.defective_unit_count
from public.inventory_items i
join public.categories c on c.id = i.category_id
join public.departments d on d.id = i.department_id
left join lateral (
  select url
  from public.item_images
  where item_id = i.id
  order by display_order
  limit 1
) img on true
left join lateral (
  select
    (count(*) filter (where status <> 'Retired'))::int as unit_count,
    (count(*) filter (where status in ('Defective','Under Repair')))::int
      as defective_unit_count
  from public.item_units
  where item_id = i.id
) u on true;

grant select on public.inventory_items_list to authenticated;
