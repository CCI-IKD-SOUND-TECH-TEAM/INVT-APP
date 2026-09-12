import type { LowStockItem } from "./api-types";
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
 * How much of the threshold is left, as a fraction — 0.2 means the item is at
 * a fifth of where it should be. A null threshold can't reach here from a
 * low-stock row (the generated column requires one), but the `|| 1` keeps the
 * function total for any caller.
 */
export function stockRatio(
  item: Pick<LowStockItem, "quantity" | "minimum_stock_threshold">
): number {
  return item.quantity / (item.minimum_stock_threshold || 1);
}

/**
 * The item furthest below its threshold — what the dashboard names when it
 * says "worst: XLR cables 1 of 5". Ratio first so a 1-of-10 beats a 4-of-5,
 * then raw quantity as the tiebreak.
 *
 * Shared so the work-queue sentence and the stat tile can't name different
 * items for the same word.
 */
export function worstLowStockItem(items: LowStockItem[]): LowStockItem | null {
  let worst: LowStockItem | null = null;
  for (const item of items) {
    if (
      !worst ||
      stockRatio(item) < stockRatio(worst) ||
      (stockRatio(item) === stockRatio(worst) && item.quantity < worst.quantity)
    ) {
      worst = item;
    }
  }
  return worst;
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
