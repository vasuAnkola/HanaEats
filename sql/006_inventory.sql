-- Phase 5: Inventory & Recipes

-- Ingredient categories
CREATE TABLE IF NOT EXISTS ingredient_categories (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ingredients (master catalog per tenant)
CREATE TABLE IF NOT EXISTS ingredients (
  id                    SERIAL PRIMARY KEY,
  tenant_id             INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id           INTEGER REFERENCES ingredient_categories(id) ON DELETE SET NULL,
  name                  VARCHAR(200) NOT NULL,
  unit                  VARCHAR(30) NOT NULL DEFAULT 'kg',   -- kg, g, L, ml, pcs, dozen, box
  cost_per_unit         NUMERIC(12,4) NOT NULL DEFAULT 0,
  stock_quantity        NUMERIC(14,4) NOT NULL DEFAULT 0,
  low_stock_threshold   NUMERIC(14,4) NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock movements (in / out / adjust / wastage)
CREATE TABLE IF NOT EXISTS stock_movements (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ingredient_id   INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  outlet_id       INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
  movement_type   VARCHAR(20) NOT NULL CHECK (movement_type IN ('purchase','adjustment','wastage','sale_deduction','opening')),
  quantity        NUMERIC(14,4) NOT NULL,   -- positive = in, negative = out
  unit_cost       NUMERIC(12,4),
  reference_id    INTEGER,                  -- purchase_order_id if applicable
  notes           TEXT,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vendors / suppliers
CREATE TABLE IF NOT EXISTS vendors (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  contact_name  VARCHAR(200),
  phone         VARCHAR(50),
  email         VARCHAR(200),
  address       TEXT,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchase orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  outlet_id       INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
  vendor_id       INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  po_number       VARCHAR(50) UNIQUE NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','received','cancelled')),
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  ordered_at      TIMESTAMPTZ,
  received_at     TIMESTAMPTZ,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchase order line items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ingredient_id     INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity          NUMERIC(14,4) NOT NULL,
  unit_cost         NUMERIC(12,4) NOT NULL,
  received_qty      NUMERIC(14,4) NOT NULL DEFAULT 0
);

-- Recipes (linked to menu items)
CREATE TABLE IF NOT EXISTS recipes (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  menu_item_id    INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
  name            VARCHAR(200) NOT NULL,
  yield_qty       NUMERIC(10,4) NOT NULL DEFAULT 1,
  yield_unit      VARCHAR(30) NOT NULL DEFAULT 'serving',
  instructions    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recipe ingredient lines
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id              SERIAL PRIMARY KEY,
  recipe_id       INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id   INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity        NUMERIC(14,4) NOT NULL,
  unit            VARCHAR(30) NOT NULL
);

-- Wastage log
CREATE TABLE IF NOT EXISTS wastage_logs (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ingredient_id   INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  outlet_id       INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
  quantity        NUMERIC(14,4) NOT NULL,
  reason          TEXT,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ingredients_tenant        ON ingredients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON stock_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant    ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipes_tenant            ON recipes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item         ON recipes(menu_item_id);
