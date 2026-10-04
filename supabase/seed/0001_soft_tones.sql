-- ===========================================================================
-- Seed: the October 2026 launch.
--
-- Prices and stock counts here are PLACEHOLDERS, matching
-- content/placeholder-commerce.json so the live shop opens looking like the
-- preview. Set the real numbers before launch — either by editing this file
-- before running it, or in the Supabase table editor afterwards.
--
-- Christmas SKUs are seeded with purchasable = false because that collection
-- is still `upcoming`. Flip them to true when the collection goes active.
--
-- The matching editorial content (names, photography, descriptions) lives in
-- content/retail-products.json and is edited in Decap, not here.
-- ===========================================================================

insert into products_commerce (sku, price_idr, stock_quantity, reserved_quantity, active, purchasable)
values
  ('ST-01', 850000, 8, 0, true, true),
  ('ST-02', 1250000, 5, 0, true, true),
  ('ST-03', 650000, 12, 0, true, true),
  ('ST-04', 980000, 2, 0, true, true),
  ('ST-05', 1450000, 0, 0, true, true),
  ('ST-06', 450000, 6, 0, true, true),
  ('CH-01', 720000, 0, 0, true, false),
  ('CH-02', 390000, 0, 0, true, false),
  ('CH-03', 890000, 0, 0, true, false)
on conflict (sku) do update
set price_idr      = excluded.price_idr,
    stock_quantity = excluded.stock_quantity,
    active         = excluded.active,
    purchasable    = excluded.purchasable,
    updated_at     = now();
