-- Query layer — the schema support for moving reads off the blocking layout.
--
-- Until now app/(app)/layout.tsx fetched every row of every domain table on
-- every navigation and handed it to a client store, which then filtered,
-- sorted, paginated and aggregated in the browser. This migration gives
-- Postgres what it needs to do that work instead:
--
--   1. is_low_stock   — a generated column, so the low-stock predicate is
--                       filterable and indexable rather than a JS .filter()
--   2. trigram index  — so server-side ILIKE search doesn't table-scan
--   3. list view      — category/department names and the cover image resolved
--                       in one query, so the list endpoint can sort by
--                       category name without PostgREST embed gymnastics
--   4. dashboard_stats— one RPC returning every number the dashboard renders,
--                       replacing ~900 item rows with ~1 KB of JSON
--
-- Access model is unchanged: the view is security_invoker and the function is
-- security invoker (the default), so both run under the caller's RLS context
-- exactly as a direct table read would.

-- ---------------------------------------------------------------------------
-- 1. Low-stock as a generated column
-- ---------------------------------------------------------------------------
-- Mirrors isLowStock() in lib/inventory.ts exactly: a null threshold means
-- "not tracked" and is never low, however small the quantity. Keep the two in
-- sync — this column is now the server-side source of truth for the same
-- predicate.
alter table public.inventory_items
  add column if not exists is_low_stock boolean
  generated always as (
    minimum_stock_threshold is not null
    and quantity <= minimum_stock_threshold
  ) stored;

-- Partial: the low-stock rows are the small side, and every query that touches
-- this column is looking for the true ones.
create index if not exists inventory_items_low_stock_idx
  on public.inventory_items (is_low_stock)
  where is_low_stock;

-- ---------------------------------------------------------------------------
-- 2. Trigram index for name search
-- ---------------------------------------------------------------------------
-- The inventory filter is a case-insensitive substring match, which becomes
-- `item_name ilike '%q%'` server-side. No btree can serve a leading-wildcard
-- match — without this index the search degrades to a sequential scan and ends
-- up slower than the client-side filter it replaces. gin_trgm_ops on the plain
-- column serves both LIKE and ILIKE.
create extension if not exists pg_trgm;

create index if not exists inventory_items_name_trgm_idx
  on public.inventory_items using gin (item_name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 3. List view — names and cover image resolved server-side
-- ---------------------------------------------------------------------------
-- Why a view rather than a PostgREST embed: the inventory table is sortable by
-- category name, and ordering a parent by an embedded to-one column is fragile.
-- Against a view it is plain column ordering. The lateral join supplies the one
-- image the card renders without a second round trip or an embed.
--
-- Deliberately narrower than `select *` — description, remarks, serial_number,
-- created_by and updated_by are not on the list card and shouldn't be in the
-- list payload. The detail endpoint reads the base table for those.
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
  img.url as first_image_url
from public.inventory_items i
join public.categories c on c.id = i.category_id
join public.departments d on d.id = i.department_id
left join lateral (
  select url
  from public.item_images
  where item_id = i.id
  order by display_order
  limit 1
) img on true;

grant select on public.inventory_items_list to authenticated;

-- ---------------------------------------------------------------------------
-- 4. dashboard_stats() — every dashboard number in one round trip
-- ---------------------------------------------------------------------------
-- Replaces the client-side aggregation in app/(app)/dashboard/page.tsx. Each
-- branch below is a transcription of the JS it replaces; the comments name the
-- original so divergence is easy to spot.
--
-- security invoker (the default) so RLS on inventory_items / defects /
-- repair_events applies to the caller exactly as it would for a direct read.
create or replace function public.dashboard_stats(low_stock_limit integer default 50)
returns jsonb
language sql
stable
set search_path = public
as $$
  with counts as (
    select
      -- Drives the "No inventory yet" empty state (items.length === 0).
      count(*)                                                        as total_items,
      count(*) filter (where status <> 'Retired')                     as total_assets,
      count(*) filter (where status in ('Available','In Use'))        as active_assets,
      count(*) filter (where status in ('Defective','Under Repair'))  as defective_assets,
      count(*) filter (where status <> 'Retired' and is_low_stock)    as low_stock_count
    from public.inventory_items
  ),
  low_stock as (
    -- Only the fields DashboardTabs renders: name, quantity, threshold,
    -- category. Capped — this feeds a panel, not a report.
    select coalesce(jsonb_agg(x order by x.quantity), '[]'::jsonb) as items
    from (
      select
        i.id,
        i.item_name,
        i.quantity,
        i.minimum_stock_threshold,
        i.category_id,
        c.name as category_name
      from public.inventory_items i
      join public.categories c on c.id = i.category_id
      where i.status <> 'Retired' and i.is_low_stock
      order by i.quantity
      limit low_stock_limit
    ) x
  ),
  by_category as (
    select c.name as category, count(*) as count
    from public.inventory_items i
    join public.categories c on c.id = i.category_id
    where i.status <> 'Retired'
    group by c.name
  ),
  ranked as (
    select category, count, row_number() over (order by count desc, category) as rn
    from by_category
  ),
  breakdown as (
    -- Top 7 individually; the tail collapses into "Other (n)" where n is the
    -- number of remaining categories, not items — matches the original label.
    select
      coalesce(
        (select jsonb_agg(jsonb_build_object('category', category, 'count', count) order by rn)
         from ranked where rn <= 7),
        '[]'::jsonb
      )
      ||
      coalesce(
        (select jsonb_build_array(jsonb_build_object(
           'category', 'Other (' || count(*) || ')',
           'count', sum(count)
         ))
         from ranked where rn > 7 having count(*) > 0),
        '[]'::jsonb
      ) as rows
  ),
  defect_counts as (
    -- Resolved / Not Repairable are windowed to the last 30 days by the most
    -- recent repair event, mirroring d.history[last].timestamp in the client.
    -- A defect with no history has no last event and falls outside the window.
    select
      count(*) filter (where d.status = 'Open')          as open,
      count(*) filter (where d.status = 'Under Repair')  as under_repair,
      count(*) filter (
        where d.status = 'Resolved'
          and le.last_event >= now() - interval '30 days'
      ) as resolved,
      count(*) filter (
        where d.status = 'Not Repairable'
          and le.last_event >= now() - interval '30 days'
      ) as not_repairable
    from public.defects d
    left join lateral (
      select max(created_at) as last_event
      from public.repair_events
      where defect_id = d.id
    ) le on true
  )
  select jsonb_build_object(
    'totalItems',       counts.total_items,
    'totalAssets',      counts.total_assets,
    'activeAssets',     counts.active_assets,
    'defectiveAssets',  counts.defective_assets,
    'lowStockCount',    counts.low_stock_count,
    'lowStockItems',    low_stock.items,
    'categoryBreakdown', breakdown.rows,
    'defectCounts', jsonb_build_object(
      'Open',            defect_counts.open,
      'Under Repair',    defect_counts.under_repair,
      'Resolved',        defect_counts.resolved,
      'Not Repairable',  defect_counts.not_repairable
    )
  )
  from counts, low_stock, breakdown, defect_counts;
$$;

grant execute on function public.dashboard_stats(integer) to authenticated;
