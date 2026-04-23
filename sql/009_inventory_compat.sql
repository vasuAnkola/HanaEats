-- Inventory compatibility migration.
-- Some databases were created from an older inventory schema. Keep this
-- idempotent so it can run after both old and current 006_inventory.sql files.

ALTER TABLE ingredient_categories
  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES ingredient_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit VARCHAR(30) NOT NULL DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold NUMERIC(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ingredients' AND column_name = 'current_stock'
  ) THEN
    UPDATE ingredients
    SET stock_quantity = current_stock
    WHERE stock_quantity = 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ingredients' AND column_name = 'reorder_level'
  ) THEN
    UPDATE ingredients
    SET low_stock_threshold = reorder_level
    WHERE low_stock_threshold = 0;
  END IF;
END $$;

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS outlet_id INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS movement_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS reference_id INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE stock_movements
  ALTER COLUMN outlet_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_movements' AND column_name = 'type'
  ) THEN
    ALTER TABLE stock_movements ALTER COLUMN type DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_movements' AND column_name = 'type'
  ) THEN
    UPDATE stock_movements
    SET movement_type = CASE type
      WHEN 'in' THEN 'purchase'
      WHEN 'out' THEN 'sale_deduction'
      WHEN 'adjust' THEN 'adjustment'
      WHEN 'waste' THEN 'wastage'
      ELSE 'adjustment'
    END
    WHERE movement_type IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_movements' AND column_name = 'note'
  ) THEN
    UPDATE stock_movements
    SET notes = note
    WHERE notes IS NULL;
  END IF;
END $$;

ALTER TABLE stock_movements
  ALTER COLUMN movement_type SET DEFAULT 'adjustment',
  ALTER COLUMN movement_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stock_movements_movement_type_check'
  ) THEN
    ALTER TABLE stock_movements
      ADD CONSTRAINT stock_movements_movement_type_check
      CHECK (movement_type IN ('purchase','adjustment','wastage','sale_deduction','opening'));
  END IF;
END $$;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS email VARCHAR(200),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS outlet_id INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS po_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS ordered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE purchase_orders
  ALTER COLUMN outlet_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'total_cost'
  ) THEN
    UPDATE purchase_orders
    SET total_amount = total_cost
    WHERE total_amount = 0;
  END IF;
END $$;

ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_qty NUMERIC(14,4) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_order_items' AND column_name = 'po_id'
  ) THEN
    ALTER TABLE purchase_order_items ALTER COLUMN po_id DROP NOT NULL;

    UPDATE purchase_order_items
    SET purchase_order_id = po_id
    WHERE purchase_order_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_order_items' AND column_name = 'quantity_ordered'
  ) THEN
    ALTER TABLE purchase_order_items ALTER COLUMN quantity_ordered DROP NOT NULL;

    UPDATE purchase_order_items
    SET quantity = quantity_ordered
    WHERE quantity = 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_order_items' AND column_name = 'quantity_received'
  ) THEN
    UPDATE purchase_order_items
    SET received_qty = quantity_received
    WHERE received_qty = 0;
  END IF;
END $$;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS yield_qty NUMERIC(10,4) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS yield_unit VARCHAR(30) NOT NULL DEFAULT 'serving',
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'outlet_id'
  ) THEN
    ALTER TABLE recipes ALTER COLUMN outlet_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'menu_item_id'
  ) THEN
    ALTER TABLE recipes ALTER COLUMN menu_item_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'yield_quantity'
  ) THEN
    UPDATE recipes
    SET yield_qty = yield_quantity
    WHERE yield_qty = 1;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'notes'
  ) THEN
    UPDATE recipes
    SET instructions = notes
    WHERE instructions IS NULL;
  END IF;
END $$;

UPDATE recipes r
SET name = COALESCE(mi.name, 'Recipe ' || r.id)
FROM menu_items mi
WHERE r.menu_item_id = mi.id
  AND r.name IS NULL;

UPDATE recipes
SET name = 'Recipe ' || id
WHERE name IS NULL;

ALTER TABLE recipes
  ALTER COLUMN name SET NOT NULL;

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit VARCHAR(30) NOT NULL DEFAULT 'kg';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipe_ingredients' AND column_name = 'quantity_used'
  ) THEN
    ALTER TABLE recipe_ingredients ALTER COLUMN quantity_used DROP NOT NULL;

    UPDATE recipe_ingredients
    SET quantity = quantity_used
    WHERE quantity = 0;
  END IF;
END $$;

ALTER TABLE wastage_logs
  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS outlet_id INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE wastage_logs
  ALTER COLUMN outlet_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wastage_logs' AND column_name = 'logged_by'
  ) THEN
    UPDATE wastage_logs
    SET created_by = logged_by
    WHERE created_by IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ingredients_tenant ON ingredients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON stock_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipes_tenant ON recipes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON recipes(menu_item_id);
