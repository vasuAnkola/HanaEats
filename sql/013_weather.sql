-- Phase 10 gap: weather-based recommendations.
-- Coordinates default to each country's capital (good enough for a
-- weather-driven menu nudge); an outlet can override with its own.

ALTER TABLE countries ADD COLUMN IF NOT EXISTS capital_lat NUMERIC(9,6);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS capital_lng NUMERIC(9,6);
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS weather_tag VARCHAR(20)
  CHECK (weather_tag IN ('hot', 'cold', 'rainy'));

UPDATE countries SET capital_lat = 1.3521,  capital_lng = 103.8198 WHERE code = 'SG';
UPDATE countries SET capital_lat = 3.1390,  capital_lng = 101.6869 WHERE code = 'MY';
UPDATE countries SET capital_lat = 13.7563, capital_lng = 100.5018 WHERE code = 'TH';
UPDATE countries SET capital_lat = -6.2088, capital_lng = 106.8456 WHERE code = 'ID';
UPDATE countries SET capital_lat = 14.5995, capital_lng = 120.9842 WHERE code = 'PH';
UPDATE countries SET capital_lat = 21.0278, capital_lng = 105.8342 WHERE code = 'VN';
UPDATE countries SET capital_lat = 16.8409, capital_lng = 96.1735  WHERE code = 'MM';
UPDATE countries SET capital_lat = 11.5564, capital_lng = 104.9282 WHERE code = 'KH';
UPDATE countries SET capital_lat = 17.9757, capital_lng = 102.6331 WHERE code = 'LA';
UPDATE countries SET capital_lat = 4.9031,  capital_lng = 114.9398 WHERE code = 'BN';
UPDATE countries SET capital_lat = -8.5569, capital_lng = 125.5603 WHERE code = 'TL';
