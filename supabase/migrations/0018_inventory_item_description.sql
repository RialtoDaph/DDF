-- Wine articles need more than name/category/price to be useful behind the
-- bar: a short story of the producer/region and food-pairing notes staff can
-- read straight off the item page. Generic enough to use for other
-- categories too, but the app only surfaces the field for wine for now.
alter table inventory_items add column description text;
