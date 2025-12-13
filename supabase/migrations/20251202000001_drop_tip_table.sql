-- ============================================================================
-- DROP TIP TABLE
-- The tip table references vehicle_id which no longer exists
-- Since tipping is disabled, we can safely drop this table
-- ============================================================================

-- Drop view that depends on tip table
drop view if exists vehicle_tip_summary cascade;

-- Drop the tip table
drop table if exists tip cascade;

