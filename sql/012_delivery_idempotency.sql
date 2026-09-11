-- Delivery platforms retry webhooks on timeout; without this, a retry would
-- create a second order for the same external order.
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_orders_platform_external
  ON delivery_orders(platform_id, external_order_id);
