-- ============================================================================
-- Optional volume-per-unit (in ml) for inventory items counted in bottles,
-- crates, etc. Lets stock stay counted the way staff actually count it
-- (Flaschen, Stk.) while the UI can still show the equivalent total volume
-- (e.g. "12 Flaschen ≈ 8.4 L") without staff having to do the math.
-- ============================================================================

alter table inventory_items add column unit_volume_ml numeric;
