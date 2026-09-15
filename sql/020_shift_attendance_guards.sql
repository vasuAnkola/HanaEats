-- Prevent a cashier from having two simultaneously open shifts at the same
-- outlet (double-click / two tabs), and a user from having two simultaneously
-- open attendance records, at the database level rather than relying on a
-- racy check-then-insert in application code.
CREATE UNIQUE INDEX IF NOT EXISTS uq_shift_sessions_open_cashier
  ON shift_sessions (outlet_id, cashier_id) WHERE status = 'open';

CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_open_user
  ON attendance (user_id) WHERE clock_out IS NULL;
