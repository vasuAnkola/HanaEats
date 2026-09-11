-- Phase 7: Delivery Platform Integration

CREATE TABLE IF NOT EXISTS delivery_platforms (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  outlet_id       INTEGER      NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  platform        VARCHAR(30)  NOT NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  api_key         VARCHAR(255),
  webhook_token   VARCHAR(64)  NOT NULL UNIQUE,
  commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_delivery_platform CHECK (platform IN ('grabfood','foodpanda','gofood')),
  UNIQUE(outlet_id, platform)
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id                 SERIAL PRIMARY KEY,
  order_id           INTEGER      NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  platform_id        INTEGER      NOT NULL REFERENCES delivery_platforms(id) ON DELETE CASCADE,
  tenant_id          INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  external_order_id  VARCHAR(100) NOT NULL,
  platform_status    VARCHAR(30)  NOT NULL DEFAULT 'accepted',
  customer_name      VARCHAR(150),
  customer_phone     VARCHAR(50),
  delivery_address   TEXT,
  raw_payload        JSONB,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_delivery_status CHECK (platform_status IN ('accepted','preparing','ready','picked_up','delivered','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_delivery_orders_order    ON delivery_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_platform ON delivery_orders(platform_id);
CREATE INDEX IF NOT EXISTS idx_delivery_platforms_outlet ON delivery_platforms(outlet_id);
