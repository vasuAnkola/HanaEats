-- Customer profiles
CREATE TABLE IF NOT EXISTS customers (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             VARCHAR(200) NOT NULL,
  email            VARCHAR(200),
  phone            VARCHAR(50),
  preferred_language VARCHAR(10) DEFAULT 'en',
  loyalty_points   INTEGER NOT NULL DEFAULT 0,
  total_spent      NUMERIC(12,2) NOT NULL DEFAULT 0,
  visit_count      INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Loyalty points history
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  payment_id      INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  type            VARCHAR(20) NOT NULL CHECK (type IN ('earn','redeem','manual_add','manual_deduct','expire')),
  points          INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL,
  notes           TEXT,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vouchers / coupons
CREATE TABLE IF NOT EXISTS vouchers (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code            VARCHAR(50) NOT NULL,
  name            VARCHAR(200) NOT NULL,
  discount_type   VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value  NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses        INTEGER,
  used_count      INTEGER NOT NULL DEFAULT 0,
  valid_from      DATE,
  valid_until     DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

-- Seasonal promotions
CREATE TABLE IF NOT EXISTS promotions (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  discount_type   VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value  NUMERIC(10,2) NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  festival_tag    VARCHAR(50),
  applies_to      VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','category','item')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee scheduled shifts (different from shift_sessions which is cash float)
CREATE TABLE IF NOT EXISTS scheduled_shifts (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  outlet_id       INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_date      DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  role_label      VARCHAR(100),
  notes           TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','absent')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clock-in/out attendance
CREATE TABLE IF NOT EXISTS attendance (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outlet_id       INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
  clock_in        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out       TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes           TEXT
);

-- Commission records
CREATE TABLE IF NOT EXISTS commissions (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outlet_id       INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  total_sales     NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  order_count     INTEGER NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_tenant ON vouchers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_date ON scheduled_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
