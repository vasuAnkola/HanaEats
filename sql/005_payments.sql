-- Phase 4: Payments & Receipts

CREATE TABLE IF NOT EXISTS shift_sessions (
  id            SERIAL PRIMARY KEY,
  outlet_id     INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cashier_id    INTEGER NOT NULL REFERENCES users(id),
  opening_float NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_float NUMERIC(12,2),
  opening_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closing_at    TIMESTAMPTZ,
  status        VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id             SERIAL PRIMARY KEY,
  order_id       INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  outlet_id      INTEGER NOT NULL REFERENCES outlets(id),
  tenant_id      INTEGER NOT NULL REFERENCES tenants(id),
  shift_id       INTEGER REFERENCES shift_sessions(id),
  payment_number VARCHAR(30) UNIQUE NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','voided','refunded')),
  total_amount   NUMERIC(12,2) NOT NULL,
  tax_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid    NUMERIC(12,2) NOT NULL,
  change_given   NUMERIC(12,2) NOT NULL DEFAULT 0,
  void_reason    TEXT,
  voided_at      TIMESTAMPTZ,
  voided_by      INTEGER REFERENCES users(id),
  created_by     INTEGER REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_splits (
  id          SERIAL PRIMARY KEY,
  payment_id  INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  method      VARCHAR(30) NOT NULL CHECK (method IN ('cash','card','grabpay','gcash','ovo','gopay','promptpay','zalopay','qr_generic','other')),
  amount      NUMERIC(12,2) NOT NULL,
  reference   VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_outlet_id ON payments(outlet_id);
CREATE INDEX IF NOT EXISTS idx_payments_shift_id ON payments(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_sessions_outlet_id ON shift_sessions(outlet_id);
