import type { InventoryItem } from "./types";

/**
 * Is this item at or below its restock threshold?
 *
 * A null/undefined threshold means "not tracked" — those items are never low,
 * however small the quantity.
 *
 * Extracted because this predicate was written out four times (dashboard KPI,
 * inventory row badge, inventory low-stock filter, reports) and the low-stock
 * digest cron would have been a fifth. Divergence between them would show the
 * user different counts on different screens.
 */
export function isLowStock(
  item: Pick<InventoryItem, "quantity" | "minimum_stock_threshold">
): boolean {
  return (
    typeof item.minimum_stock_threshold === "number" &&
    item.quantity <= item.minimum_stock_threshold
  );
}

/**
 * Pluralize a unit of measure for display next to a quantity, e.g.
 * `1 Piece` / `5 Pieces`, `1 Box` / `3 Boxes`.
 *
 * Units are free-text (user-managed in Settings), so this is a plain English
 * heuristic rather than a lookup table: singular for quantity === 1, and for
 * everything else append "es" after a sibilant ending (s/x/z/ch/sh) or "s"
 * otherwise. Units already ending in "s" are left as-is.
 */
export function formatUnit(unit: string, quantity: number): string {
  if (quantity === 1 || !unit) return unit;
  if (/s$/i.test(unit)) return unit;
  if (/(s|x|z|ch|sh)$/i.test(unit)) return `${unit}es`;
  return `${unit}s`;
}
