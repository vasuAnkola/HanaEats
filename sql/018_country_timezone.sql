-- "Today" for a business check (voucher validity, promotion active-window,
-- report defaults) has to mean today in that OUTLET's own country — never the
-- server's ambient clock (arbitrary, wherever it's hosted) and never raw UTC
-- (also wrong: SEA countries are UTC+6:30 to UTC+9, so a UTC day boundary
-- lands mid-afternoon local time). This is the real source of truth.
ALTER TABLE countries ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

UPDATE countries SET timezone = 'Asia/Singapore'    WHERE code = 'SG';
UPDATE countries SET timezone = 'Asia/Kuala_Lumpur' WHERE code = 'MY';
UPDATE countries SET timezone = 'Asia/Bangkok'      WHERE code = 'TH';
UPDATE countries SET timezone = 'Asia/Jakarta'      WHERE code = 'ID';
UPDATE countries SET timezone = 'Asia/Manila'       WHERE code = 'PH';
UPDATE countries SET timezone = 'Asia/Ho_Chi_Minh'  WHERE code = 'VN';
UPDATE countries SET timezone = 'Asia/Yangon'       WHERE code = 'MM';
UPDATE countries SET timezone = 'Asia/Phnom_Penh'   WHERE code = 'KH';
UPDATE countries SET timezone = 'Asia/Vientiane'    WHERE code = 'LA';
UPDATE countries SET timezone = 'Asia/Brunei'       WHERE code = 'BN';
UPDATE countries SET timezone = 'Asia/Dili'         WHERE code = 'TL';

ALTER TABLE countries ALTER COLUMN timezone SET DEFAULT 'Asia/Singapore';
UPDATE countries SET timezone = 'Asia/Singapore' WHERE timezone IS NULL;
