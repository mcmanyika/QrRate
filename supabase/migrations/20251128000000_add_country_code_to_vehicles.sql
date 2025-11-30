-- Add country code support for vehicle registration plates
-- This allows the same plate number to exist in different countries

-- Add country_code column with a default value (KE = Kenya)
ALTER TABLE vehicle 
ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'KE';

-- Drop the old unique constraint on reg_number alone
-- First, check if the constraint exists and drop it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vehicle_reg_number_key' 
    AND conrelid = 'vehicle'::regclass
  ) THEN
    ALTER TABLE vehicle DROP CONSTRAINT vehicle_reg_number_key;
  END IF;
END $$;

-- Create composite unique constraint (country_code, reg_number) for active vehicles
-- This allows the same reg_number in different countries
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_country_reg_unique 
ON vehicle (country_code, reg_number) 
WHERE is_active = true;

-- Add index for faster country-based queries
CREATE INDEX IF NOT EXISTS idx_vehicle_country_code ON vehicle(country_code);

-- Drop and recreate views to include country_code
-- Use CASCADE to handle any dependencies
DROP VIEW IF EXISTS vehicle_avg_last_7d CASCADE;
CREATE VIEW vehicle_avg_last_7d AS
SELECT
  v.id as vehicle_id,
  v.reg_number,
  v.country_code,
  rte.name as route_name,
  AVG(rt.stars)::numeric(4,2) as avg_stars,
  COUNT(rt.id) as num_ratings
FROM vehicle v
LEFT JOIN route rte ON rte.id = v.route_id
LEFT JOIN rating rt ON rt.vehicle_id = v.id AND rt.created_at >= NOW() - INTERVAL '7 days'
GROUP BY v.id, v.reg_number, v.country_code, rte.name;

DROP VIEW IF EXISTS vehicle_tip_summary CASCADE;
CREATE VIEW vehicle_tip_summary AS
SELECT
  v.id as vehicle_id,
  v.reg_number,
  v.country_code,
  rte.name as route_name,
  COUNT(t.id) FILTER (WHERE t.stripe_status = 'succeeded') as total_tips,
  SUM(t.amount_cents) FILTER (WHERE t.stripe_status = 'succeeded') as total_amount_cents,
  SUM(t.platform_fee_cents) FILTER (WHERE t.stripe_status = 'succeeded') as total_platform_fee_cents,
  SUM(t.operator_amount_cents) FILTER (WHERE t.stripe_status = 'succeeded') as total_operator_amount_cents,
  AVG(t.amount_cents) FILTER (WHERE t.stripe_status = 'succeeded') as avg_tip_cents,
  MAX(t.created_at) FILTER (WHERE t.stripe_status = 'succeeded') as last_tip_at
FROM vehicle v
LEFT JOIN route rte ON rte.id = v.route_id
LEFT JOIN tip t ON t.vehicle_id = v.id
GROUP BY v.id, v.reg_number, v.country_code, rte.name;

