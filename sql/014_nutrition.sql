-- Nutritional info calculation: calories per unit on the ingredient, so a
-- recipe's total (and therefore its linked menu item's) calories can be
-- derived from real composition instead of guessed by hand.
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS calories_per_unit NUMERIC(10,2);
