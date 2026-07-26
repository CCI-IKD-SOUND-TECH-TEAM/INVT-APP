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
