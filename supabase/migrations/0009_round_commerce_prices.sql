-- Commerce prices are quoted in whole thousands of rupiah.
-- This migration is prepared for a later database rollout; it is not needed
-- to render the bag layout and is not applied by the site build.

update public.products_commerce
   set price_idr = (round(price_idr::numeric / 1000) * 1000)::integer
 where price_idr % 1000 <> 0;

alter table public.products_commerce
  add constraint products_commerce_price_round_thousands
  check (price_idr % 1000 = 0);
