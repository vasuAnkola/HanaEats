-- An add-on could only ever be selected once per line item (e.g. "Extra Cheese"
-- but never "2x Extra Cheese"). Add a real quantity so add-ons behave like
-- variants/items do.
ALTER TABLE order_item_addons ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
