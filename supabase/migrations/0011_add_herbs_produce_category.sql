-- ============================================================================
-- Add a dedicated inventory category for fresh herbs/produce (basil, mint,
-- citrus, etc.) used for muddling — previously lumped into "garnish", which
-- was ambiguous between decorative garnish and fresh ingredients.
-- ============================================================================

alter type item_category add value 'herbs_produce';
