-- Remove 1-hour rating restriction
-- This allows users to submit multiple ratings for the same vehicle without time restriction

-- Drop the unique index that enforces one rating per hour per device per vehicle
DROP INDEX IF EXISTS uniq_rating_device_vehicle_hour;

-- Optional: Drop the window_start column if it's no longer needed
-- Note: This is a generated column, so we need to check if it's used elsewhere first
-- For now, we'll keep the column but remove the constraint

COMMENT ON TABLE rating IS 'Ratings table - multiple ratings per device per vehicle are now allowed';

