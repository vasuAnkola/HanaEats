-- HANAEats Phase 1 Schema
-- Run once against the hanaeats database

-- ─── COUNTRIES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS countries (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  code             CHAR(2)     NOT NULL UNIQUE,
  currency_code    CHAR(3)     NOT NULL,
  currency_symbol  VARCHAR(5)  NOT NULL,
  tax_name         VARCHAR(50),
  tax_rate         NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TENANTS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  slug         VARCHAR(100) NOT NULL UNIQUE,
  country_id   INTEGER      NOT NULL REFERENCES countries(id),
  email        VARCHAR(255) NOT NULL,
  phone        VARCHAR(30),
  address      TEXT,
  logo_url     TEXT,
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  plan         VARCHAR(50)  NOT NULL DEFAULT 'starter',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── OUTLETS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outlets (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(150) NOT NULL,
  address      TEXT,
  phone        VARCHAR(30),
  email        VARCHAR(255),
  outlet_type  VARCHAR(50)  NOT NULL DEFAULT 'restaurant',
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── USERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER      REFERENCES tenants(id) ON DELETE CASCADE,
  outlet_id     INTEGER      REFERENCES outlets(id) ON DELETE SET NULL,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'cashier',
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_role CHECK (role IN ('super_admin','admin','manager','cashier','waiter','kitchen'))
);

-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  tenant_id   INTEGER      REFERENCES tenants(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity      VARCHAR(100),
  entity_id   INTEGER,
  details     JSONB,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenants_country   ON tenants(country_id);
CREATE INDEX IF NOT EXISTS idx_outlets_tenant    ON outlets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant      ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_outlet      ON users(outlet_id);
CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_audit_user        ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant      ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_created     ON audit_logs(created_at DESC);
