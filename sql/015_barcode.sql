-- Barcode/QR scanning for stock entry: scan a physical package's barcode to
-- find (or create) the matching ingredient instead of typing it manually.
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS barcode VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_tenant_barcode
  ON ingredients(tenant_id, barcode) WHERE barcode IS NOT NULL;
