-- ===========================================================================
-- Seed: the Mother's Day collection.
--
-- This collection began as a development prototype and is sold now, so its
-- price and stock belong in the same place as everything else that is sold:
-- here, where a quantity can be held against a concurrent order. The figures
-- below match content/retail-commerce.json, which is what answers for these
-- SKUs until this file has been run.
--
-- content/retail-commerce.json keeps answering afterwards, but only for one
-- thing: its "available" switch can take a piece off sale at any moment,
-- without a database. It can never raise a quantity, because a file in git
-- cannot hold stock and letting it try is how two customers are sold the
-- same arrangement.
--
-- Stock figures carried over from the prototype are INVENTED. Set the real
-- numbers before this collection takes an order — either by editing this
-- file before running it, or in the Supabase table editor afterwards.
--
-- The matching editorial content (names, photography, descriptions) lives in
-- content/retail-products.json and content/featured.json, edited in Decap.
-- ===========================================================================

insert into products_commerce (sku, price_idr, stock_quantity, reserved_quantity, active, purchasable)
values
  ('MD-01', 550000, 4, 0, true, true),  -- Sovereign
  ('MD-02', 350000, 6, 0, true, true),  -- Aube de Soie
  ('MD-03', 350000, 2, 0, true, true),  -- Noire Citron
  ('MD-04', 150000, 9, 0, true, true),  -- Dentelle Classique
  ('MD-05', 350000, 5, 0, true, true),  -- Aria
  ('MD-06', 200000, 7, 0, true, true),  -- Cœur
  ('MD-07', 180000, 0, 0, true, false),  -- The Heirloom
  ('MD-08', 240000, 3, 0, true, true)   -- Abundance
on conflict (sku) do update
set price_idr      = excluded.price_idr,
    stock_quantity = excluded.stock_quantity,
    active         = excluded.active,
    purchasable    = excluded.purchasable,
    updated_at     = now();
