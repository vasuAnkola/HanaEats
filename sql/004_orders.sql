-- HANAEats Phase 3 — Orders, Tables, POS Schema

-- ─── TABLE SECTIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS table_sections (
  id          SERIAL PRIMARY KEY,
  outlet_id   INTEGER      NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  tenant_id   INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── TABLES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outlet_tables (
  id           SERIAL PRIMARY KEY,
  outlet_id    INTEGER      NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  tenant_id    INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  section_id   INTEGER      REFERENCES table_sections(id) ON DELETE SET NULL,
  table_number VARCHAR(20)  NOT NULL,
  capacity     INTEGER      NOT NULL DEFAULT 4,
  status       VARCHAR(20)  NOT NULL DEFAULT 'available',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_table_status CHECK (status IN ('available','occupied','reserved','cleaning'))
);

-- ─── ORDERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              SERIAL PRIMARY KEY,
  outlet_id       INTEGER      NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  tenant_id       INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_id        INTEGER      REFERENCES outlet_tables(id) ON DELETE SET NULL,
  order_type      VARCHAR(20)  NOT NULL DEFAULT 'dine_in',
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
  order_number    VARCHAR(20)  NOT NULL,
  customer_name   VARCHAR(150),
  customer_note   TEXT,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  served_by       INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_order_type   CHECK (order_type IN ('dine_in','takeaway','delivery','drive_thru')),
  CONSTRAINT chk_order_status CHECK (status IN ('draft','pending','preparing','ready','served','closed','cancelled'))
);

-- ─── ORDER ITEMS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER      NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id     INTEGER      REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name   VARCHAR(150) NOT NULL,
  quantity    INTEGER      NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  note        TEXT,
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_item_status CHECK (status IN ('pending','preparing','ready','served','cancelled'))
);

-- ─── ORDER ITEM VARIANTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_item_variants (
  id          SERIAL PRIMARY KEY,
  order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  variant_name  VARCHAR(100) NOT NULL,
  option_name   VARCHAR(100) NOT NULL,
  price_modifier NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ─── ORDER ITEM ADD-ONS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_item_addons (
  id            SERIAL PRIMARY KEY,
  order_item_id INTEGER      NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  addon_name    VARCHAR(100) NOT NULL,
  price         NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ─── SEQUENCES FOR ORDER NUMBERS ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tables_outlet      ON outlet_tables(outlet_id);
CREATE INDEX IF NOT EXISTS idx_orders_outlet      ON orders(outlet_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created     ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order  ON order_items(order_id);
