-- HANAEats Phase 2 — Menu Management Schema

-- ─── MENU CATEGORIES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_categories (
  id            SERIAL PRIMARY KEY,
  outlet_id     INTEGER      NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  tenant_id     INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(150) NOT NULL,
  description   TEXT,
  image_url     TEXT,
  display_order INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── MENU ITEMS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id            SERIAL PRIMARY KEY,
  category_id   INTEGER      NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  outlet_id     INTEGER      NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  tenant_id     INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(150) NOT NULL,
  description   TEXT,
  sku           VARCHAR(100),
  price         NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost          NUMERIC(12,2) NOT NULL DEFAULT 0,
  image_url     TEXT,
  prep_time     INTEGER,           -- minutes
  calories      INTEGER,
  display_order INTEGER      NOT NULL DEFAULT 0,
  is_available  BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── DIETARY FLAGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_item_dietary (
  item_id       INTEGER PRIMARY KEY REFERENCES menu_items(id) ON DELETE CASCADE,
  is_vegan      BOOLEAN NOT NULL DEFAULT false,
  is_vegetarian BOOLEAN NOT NULL DEFAULT false,
  is_halal      BOOLEAN NOT NULL DEFAULT false,
  is_gluten_free BOOLEAN NOT NULL DEFAULT false,
  contains_nuts BOOLEAN NOT NULL DEFAULT false
);

-- ─── VARIANT GROUPS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_variants (
  id            SERIAL PRIMARY KEY,
  item_id       INTEGER      NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,   -- e.g. "Size", "Spice Level"
  is_required   BOOLEAN      NOT NULL DEFAULT false,
  display_order INTEGER      NOT NULL DEFAULT 0
);

-- ─── VARIANT OPTIONS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_variant_options (
  id            SERIAL PRIMARY KEY,
  variant_id    INTEGER      NOT NULL REFERENCES menu_variants(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,   -- e.g. "Small", "Medium", "Large"
  price_modifier NUMERIC(12,2) NOT NULL DEFAULT 0,
  display_order INTEGER      NOT NULL DEFAULT 0
);

-- ─── ADD-ON GROUPS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_add_on_groups (
  id            SERIAL PRIMARY KEY,
  item_id       INTEGER      NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,   -- e.g. "Toppings", "Sauces"
  is_required   BOOLEAN      NOT NULL DEFAULT false,
  max_select    INTEGER,                 -- NULL = unlimited
  display_order INTEGER      NOT NULL DEFAULT 0
);

-- ─── ADD-ONS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_add_ons (
  id            SERIAL PRIMARY KEY,
  group_id      INTEGER      NOT NULL REFERENCES menu_add_on_groups(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  price         NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_available  BOOLEAN      NOT NULL DEFAULT true,
  display_order INTEGER      NOT NULL DEFAULT 0
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_menu_categories_outlet  ON menu_categories(outlet_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_tenant  ON menu_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category     ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_outlet       ON menu_items(outlet_id);
CREATE INDEX IF NOT EXISTS idx_menu_variants_item      ON menu_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_menu_add_on_groups_item ON menu_add_on_groups(item_id);
