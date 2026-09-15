-- Persist "has this user dismissed the welcome tour" server-side instead of only
-- in localStorage, so it survives a cleared browser, a different device, or a
-- different browser — not just "seen once in this exact browser profile."
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS welcome_tour_seen_at TIMESTAMPTZ;
