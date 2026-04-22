-- HANAEats Seed Data

-- ─── SE ASIAN COUNTRIES ───────────────────────────────────────────────────────
INSERT INTO countries (name, code, currency_code, currency_symbol, tax_name, tax_rate) VALUES
  ('Singapore',    'SG', 'SGD', 'S$',  'GST',  9.00),
  ('Malaysia',     'MY', 'MYR', 'RM',  'SST',  8.00),
  ('Thailand',     'TH', 'THB', '฿',   'VAT',  7.00),
  ('Indonesia',    'ID', 'IDR', 'Rp',  'PPN', 11.00),
  ('Philippines',  'PH', 'PHP', '₱',   'VAT', 12.00),
  ('Vietnam',      'VN', 'VND', '₫',   'VAT', 10.00),
  ('Myanmar',      'MM', 'MMK', 'K',   NULL,   0.00),
  ('Cambodia',     'KH', 'KHR', '៛',   'VAT', 10.00),
  ('Laos',         'LA', 'LAK', '₭',   'VAT', 10.00),
  ('Brunei',       'BN', 'BND', 'B$',  NULL,   0.00)
ON CONFLICT (code) DO NOTHING;

-- ─── SUPER ADMIN USER ─────────────────────────────────────────────────────────
-- Password: admin123456
INSERT INTO users (tenant_id, name, email, password_hash, role)
VALUES (
  NULL,
  'Super Admin',
  'superadmin@hanaeats.com',
  '$2b$10$Ujl9JhwjGowb6Jhs/jUmwuLGJINpM8sAVOaNBO.bjKiEjXQACyxtS',
  'super_admin'
)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
