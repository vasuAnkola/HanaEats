-- Prevent duplicate table numbers within the same outlet.
-- Dedupe any existing collisions first (keep the oldest row's number, rename later ones)
-- so the constraint can actually be added to tables that already have duplicates.
WITH ranked AS (
  SELECT id, outlet_id, table_number,
         ROW_NUMBER() OVER (PARTITION BY outlet_id, table_number ORDER BY id) AS rn
  FROM outlet_tables
)
UPDATE outlet_tables t
SET table_number = t.table_number || '-' || ranked.rn
FROM ranked
WHERE t.id = ranked.id AND ranked.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_outlet_tables_outlet_number'
  ) THEN
    ALTER TABLE outlet_tables
      ADD CONSTRAINT uq_outlet_tables_outlet_number UNIQUE (outlet_id, table_number);
  END IF;
END $$;
