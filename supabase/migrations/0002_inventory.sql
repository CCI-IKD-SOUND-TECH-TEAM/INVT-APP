-- Inventory domain — items, defects, repair history, taxonomy, and the audit log.
--
-- Until now every entity below lived in React state (lib/store.tsx +
-- lib/mock-data.ts) and reset on refresh. This migration makes them real. Once
-- it lands, the low-stock cron (app/api/cron/low-stock/route.ts) stops returning
-- `{skipped}` — it queries `inventory_items` directly.
--
-- Access model mirrors 0001_profiles.sql: every authenticated staff member has
-- identical read + write access (the app has no roles). RLS is enabled so an
-- unauthenticated request gets nothing; there is no per-row ownership.

-- ---------------------------------------------------------------------------
-- Reusable updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Taxonomy — departments, categories, units of measure
-- ---------------------------------------------------------------------------
create table if not exists public.departments (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.units (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Inventory items
-- ---------------------------------------------------------------------------
-- Column names for item_name, quantity, minimum_stock_threshold,
-- unit_of_measure, category_id, and status must stay in sync with the cron's
-- select (app/api/cron/low-stock/route.ts).
create table if not exists public.inventory_items (
  id                      uuid primary key default gen_random_uuid(),
  item_name               text        not null,
  description             text,
  category_id             uuid        not null references public.categories (id),
  department_id           uuid        not null references public.departments (id),
  quantity                integer     not null default 0 check (quantity >= 0),
  minimum_stock_threshold integer     check (minimum_stock_threshold >= 0),
  status                  text        not null default 'Available'
                            check (status in ('Available','In Use','Defective','Under Repair','Retired')),
  location                text,
  date_acquired           date,
  remarks                 text,
  -- serial_number is optional and NOT unique: an item row is a group with a
  -- quantity (e.g. 4 identical speakers), not a single physical unit.
  serial_number           text,
  -- Denormalized name (not a units FK) so the cron and reports read it without
  -- a join; renameUnit bulk-updates this column. Mirrors the prototype shape.
  unit_of_measure         text        not null,
  asset_type              text        not null
                            check (asset_type in ('Equipment','Furniture','Consumable','Electronics','Other')),
  created_by              uuid        references public.profiles (id),
  updated_by              uuid        references public.profiles (id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists inventory_items_category_idx on public.inventory_items (category_id);
create index if not exists inventory_items_department_idx on public.inventory_items (department_id);
create index if not exists inventory_items_status_idx on public.inventory_items (status);

drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at
  before update on public.inventory_items
  for each row execute function public.set_updated_at();

-- Item photos — Cloudinary. `url` is the secure_url the UI renders; `public_id`
-- is kept for later deletion from Cloudinary (not yet wired).
create table if not exists public.item_images (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid        not null references public.inventory_items (id) on delete cascade,
  url           text        not null,
  public_id     text,
  display_order integer     not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists item_images_item_idx on public.item_images (item_id, display_order);

-- ---------------------------------------------------------------------------
-- Defects + repair history
-- ---------------------------------------------------------------------------
create table if not exists public.defects (
  id                uuid primary key default gen_random_uuid(),
  item_id           uuid        not null references public.inventory_items (id) on delete cascade,
  description       text        not null,
  date_reported     date        not null,
  reported_by       uuid        references public.profiles (id),
  severity          text        not null check (severity in ('Low','Medium','High')),
  status            text        not null default 'Open'
                      check (status in ('Open','Under Repair','Resolved','Not Repairable')),
  repair_start_date date,
  performing_party  text,
  resolution_notes  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists defects_item_idx on public.defects (item_id);
create index if not exists defects_status_idx on public.defects (status);

drop trigger if exists set_defects_updated_at on public.defects;
create trigger set_defects_updated_at
  before update on public.defects
  for each row execute function public.set_updated_at();

-- Each defect status change appends one row (the timeline in the defect drawer).
create table if not exists public.repair_events (
  id         uuid primary key default gen_random_uuid(),
  defect_id  uuid        not null references public.defects (id) on delete cascade,
  status     text        not null check (status in ('Open','Under Repair','Resolved','Not Repairable')),
  note       text,
  user_id    uuid        references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists repair_events_defect_idx on public.repair_events (defect_id, created_at);

-- ---------------------------------------------------------------------------
-- Audit log — the activity feed
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  occurred_at  timestamptz not null default now(),
  user_id      uuid        references public.profiles (id),
  action_type  text        not null
                 check (action_type in ('Create','Edit','Retire','Reactivate','Defect','Repair Status Change','Settings')),
  record_label text        not null,
  detail       text        not null
);

create index if not exists audit_log_occurred_idx on public.audit_log (occurred_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security — authenticated staff read + write everything
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'departments','categories','units','inventory_items','item_images',
    'defects','repair_events','audit_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format($f$
      drop policy if exists "authenticated read %1$s" on public.%1$I;
      create policy "authenticated read %1$s" on public.%1$I
        for select to authenticated using (true);
    $f$, t);

    execute format($f$
      drop policy if exists "authenticated write %1$s" on public.%1$I;
      create policy "authenticated write %1$s" on public.%1$I
        for all to authenticated using (true) with check (true);
    $f$, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seed reference data (taxonomy only — items/defects start empty so the app
-- shows real user input, not fixtures).
-- ---------------------------------------------------------------------------
insert into public.departments (name) values
  ('Sound'), ('Light'), ('Projection')
on conflict (name) do nothing;

insert into public.categories (name) values
  ('Speakers'),
  ('Microphones'),
  ('Mixing Consoles'),
  ('Cabling & Connectors'),
  ('Lighting Fixtures'),
  ('Lighting Controllers'),
  ('Projectors'),
  ('Screens & Mounts'),
  ('Stands & Rigging'),
  ('Power & Batteries')
on conflict (name) do nothing;

insert into public.units (name) values
  ('Piece'), ('Box'), ('Set'), ('Pair'), ('Roll')
on conflict (name) do nothing;
