-- ---------------------------------------------------------------------------
-- dashboard_stats v2 — context for the numbers, and the open-defect queue
-- ---------------------------------------------------------------------------
-- The dashboard moved from "a summary of state" to "a work queue": every tile
-- now carries a 30-day comparison, and the top open defects render as rows
-- instead of a count. This function is the single round trip that feeds it.
--
-- `supabase db push` tracks migrations by version, not content, so 0008 cannot
-- be edited in place — the whole body is repeated here with the new CTEs
-- appended. Same argument list as 0008, so this REPLACES that function rather
-- than creating an overload.
--
-- Additive only: every key 0008 emitted is still emitted, unchanged.
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
    -- Only the fields the low-stock surfaces render: name, quantity, threshold,
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
  ),
  -- --- new in 0012 -------------------------------------------------------
  recent_items as (
    -- "+3 added in 30 days" under the Assets tile. created_at, not
    -- date_acquired: this is "what changed in the system recently", and
    -- date_acquired is frequently backdated on import.
    select count(*) as added_30
    from public.inventory_items
    where status <> 'Retired'
      and created_at >= now() - interval '30 days'
  ),
  recent_defects as (
    -- "2 opened" under the Defective tile. date_reported is the domain date a
    -- staff member enters, which is the number they'd recognise.
    select count(*) as opened_30
    from public.defects
    where date_reported >= current_date - 30
  ),
  open_stats as (
    -- The work-queue sentence: "7 open defects, 2 high, oldest 8 days".
    -- date_reported is a date column, so the age is plain integer arithmetic.
    select
      count(*)                                        as total,
      count(*) filter (where severity = 'High')       as high,
      coalesce(max(current_date - date_reported), 0)  as oldest_days
    from public.defects
    where status = 'Open'
  ),
  open_rows as (
    -- Top 5 open defects for the dashboard table: High before Medium before
    -- Low, then oldest first. created_at is the tiebreak so the order is
    -- stable across calls when two defects share a reported date.
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',            x.id,
          'item_id',       x.item_id,
          'item_name',     x.item_name,
          'unit_label',    x.unit_label,
          'description',   x.description,
          'severity',      x.severity,
          'date_reported', x.date_reported
        )
        order by x.sev_rank, x.date_reported, x.created_at
      ),
      '[]'::jsonb
    ) as rows
    from (
      select
        d.id,
        d.item_id,
        i.item_name,
        u.label as unit_label,
        d.description,
        d.severity,
        d.date_reported,
        d.created_at,
        case d.severity when 'High' then 0 when 'Medium' then 1 else 2 end as sev_rank
      from public.defects d
      join public.inventory_items i on i.id = d.item_id
      left join public.item_units u on u.id = d.item_unit_id
      where d.status = 'Open'
      order by sev_rank, d.date_reported, d.created_at
      limit 5
    ) x
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
    ),
    'itemsAddedLast30',      recent_items.added_30,
    'defectsOpenedLast30',   recent_defects.opened_30,
    -- Deliberately the same column as defectCounts.Resolved — one definition
    -- of "resolved recently", so the tile and the summary can never disagree.
    'defectsResolvedLast30', defect_counts.resolved,
    'openDefects',           open_rows.rows,
    'openDefectsTotal',      open_stats.total,
    'highOpenCount',         open_stats.high,
    'oldestOpenDays',        open_stats.oldest_days
  )
  from counts, low_stock, breakdown, defect_counts,
       recent_items, recent_defects, open_stats, open_rows;
$$;

grant execute on function public.dashboard_stats(integer) to authenticated;
