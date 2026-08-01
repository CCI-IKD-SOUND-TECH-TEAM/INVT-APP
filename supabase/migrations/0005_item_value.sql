-- Estimated per-unit value of an inventory item, in Nigerian Naira (NGN).
-- Single-tenant app, single currency — no currency column.
-- Nullable: legacy rows and items without a valuation simply have no value.

alter table public.inventory_items
  add column if not exists estimated_value numeric(14,2)
    check (estimated_value is null or estimated_value >= 0);

comment on column public.inventory_items.estimated_value is
  'Estimated replacement/purchase value per unit, in NGN.';
