-- ============================================================================
-- Add dedicated inventory categories for Likör, Schnaps, Sirup, and Bitter —
-- previously all lumped into "spirits"/"mixer", which made cost/margin
-- reporting by category less useful for a bar that stocks these distinctly.
-- ============================================================================

alter type item_category add value 'liqueur';
alter type item_category add value 'schnapps';
alter type item_category add value 'syrup';
alter type item_category add value 'bitters';
