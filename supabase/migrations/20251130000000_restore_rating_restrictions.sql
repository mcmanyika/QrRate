-- Restore 1-hour rating restriction and add daily limit (max 4 ratings per day)
-- This enforces one rating per device per vehicle per hour
-- And limits to 4 ratings per device per day

-- First, ensure hour_bucket is populated correctly for all existing records
UPDATE rating 
SET hour_bucket = date_trunc('hour', created_at)
WHERE hour_bucket IS NULL OR hour_bucket != date_trunc('hour', created_at);

-- Clean up any existing duplicates before creating the unique index
-- Keep only the earliest rating for each (vehicle_id, device_hash, hour_bucket) combination
-- Delete all but the first rating for each duplicate group
DELETE FROM rating r1
WHERE r1.id NOT IN (
  SELECT DISTINCT ON (vehicle_id, device_hash, hour_bucket) id
  FROM rating
  ORDER BY vehicle_id, device_hash, hour_bucket, created_at ASC
);

-- Restore the unique index for 1-hour restriction
-- Note: The database uses hour_bucket column (from the original migration)
DROP INDEX IF EXISTS uniq_rating_device_vehicle_hour;
CREATE UNIQUE INDEX uniq_rating_device_vehicle_hour
  ON rating (vehicle_id, device_hash, hour_bucket);

-- Function to check daily rating limit (max 4 ratings per day per device)
CREATE OR REPLACE FUNCTION check_daily_rating_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  daily_count INTEGER;
BEGIN
  -- Count ratings for this device_hash in the current day (UTC)
  SELECT COUNT(*) INTO daily_count
  FROM rating
  WHERE device_hash = NEW.device_hash
    AND created_at >= date_trunc('day', NOW());
  
  -- If already at or above the limit (4), raise an error
  IF daily_count >= 4 THEN
    RAISE EXCEPTION 'daily_rating_limit_exceeded: Maximum of 4 ratings per day allowed. You have already submitted % ratings today.', daily_count
      USING ERRCODE = 'P0001';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce daily limit before insert
DROP TRIGGER IF EXISTS rating_check_daily_limit ON rating;
CREATE TRIGGER rating_check_daily_limit
  BEFORE INSERT ON rating
  FOR EACH ROW
  EXECUTE FUNCTION check_daily_rating_limit();

-- Update comment
COMMENT ON TABLE rating IS 'Ratings table - one rating per device per vehicle per hour, max 4 ratings per device per day';
