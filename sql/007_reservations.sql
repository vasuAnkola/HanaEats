-- reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  reservation_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  customer_email VARCHAR(200),
  customer_phone VARCHAR(50),
  party_size INTEGER NOT NULL DEFAULT 2,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  table_id INTEGER REFERENCES outlet_tables(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','seated','completed','cancelled','no_show')),
  special_requests TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QR sessions per table (for self-ordering)
CREATE TABLE IF NOT EXISTS qr_sessions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  table_id INTEGER NOT NULL REFERENCES outlet_tables(id) ON DELETE CASCADE,
  token VARCHAR(100) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_token ON qr_sessions(token);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_table ON qr_sessions(table_id);
