// Common bar/hotel inventory units, offered as suggestions via a <datalist>
// rather than a rigid enum — the DB column stays free text so an unusual
// unit typed once doesn't need a migration to become allowed.
export const UNIT_SUGGESTIONS = ["cl", "ml", "l", "g", "kg", "Stk.", "Flasche", "Kiste", "Portion"];

// Units that are themselves a plain measurement (as opposed to a purchasing
// count like "Flasche" or "Kiste") — "Volumen pro Einheit" only makes sense
// for the latter, since e.g. an item already tracked in "kg" has no separate
// per-unit size to record.
const MEASUREMENT_UNITS = new Set(["ml", "cl", "l", "g", "kg"]);

export function isMeasurementUnit(unit: string): boolean {
  return MEASUREMENT_UNITS.has(unit.trim().toLowerCase());
}

// For a recipe amount stored in the ingredient's own unit, a quick-entry
// helper in a smaller, more natural unit: helperValue * factor = baseValue.
export const RECIPE_AMOUNT_HELPERS: Record<string, { label: string; factor: number }> = {
  ml: { label: "cl", factor: 10 },
  l: { label: "cl", factor: 0.01 },
  kg: { label: "g", factor: 0.001 },
};
