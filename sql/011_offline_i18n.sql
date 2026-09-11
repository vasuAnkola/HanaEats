-- Phase 11: Multi-Language & Offline POS support

-- Client-generated id lets an order placed offline be retried safely without
-- creating duplicates once connectivity returns.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_order_id VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_order_id ON orders(client_order_id) WHERE client_order_id IS NOT NULL;

-- Per-user dashboard language preference
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'en';
