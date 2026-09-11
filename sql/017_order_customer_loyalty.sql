-- CRM/Loyalty was never actually wired to a real purchase: customers existed
-- as standalone profiles, and nothing ever created a loyalty_transaction or
-- updated loyalty_points/total_spent/visit_count from an order. Orders had no
-- way to reference which customer placed them at all.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
