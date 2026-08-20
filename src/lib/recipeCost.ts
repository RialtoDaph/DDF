/**
 * Cost of one recipe line. A recipe amount is stored in ml whenever the
 * ingredient has a known container size (unit_volume_ml) — purchase_price
 * is what one stock unit (e.g. one bottle) costs, so price-per-ml has to be
 * derived by dividing through unit_volume_ml. Otherwise amount is already
 * in the item's own unit and purchase_price applies directly.
 *
 * Used everywhere a recipe's cost is computed (menu list, menu detail,
 * reports) so the three can't drift out of sync with each other again.
 */
export function recipeLineCost(
  amount: number,
  item: { unit_volume_ml: number | null; purchase_price: number | null } | null,
): number {
  if (!item) return 0;
  const pricePerUnit = item.unit_volume_ml ? (item.purchase_price ?? 0) / item.unit_volume_ml : (item.purchase_price ?? 0);
  return amount * pricePerUnit;
}

/** Display unit for a recipe amount — "ml" once the ingredient has a known container size, else the item's own stock unit. */
export function recipeDisplayUnit(item: { unit: string; unit_volume_ml: number | null } | null): string {
  if (!item) return "";
  return item.unit_volume_ml ? "ml" : item.unit;
}
