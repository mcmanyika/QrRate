-- ============================================================================
-- DROP VEHICLE-RELATED TABLES
-- This migration removes all vehicle-related tables that are no longer needed
-- after migrating to the universal review system
-- ============================================================================

-- Drop dependent tables first (in reverse order of dependencies)

-- Drop vehicle_service_provider junction table
drop table if exists vehicle_service_provider cascade;

-- Drop vehicle_business_mapping (migration mapping table - no longer needed)
drop table if exists vehicle_business_mapping cascade;

-- Drop views that depend on vehicle table
drop view if exists vehicle_avg_last_7d cascade;
drop view if exists vehicle_tip_summary cascade;

-- Drop indexes on vehicle table
drop index if exists uniq_rating_device_vehicle_hour cascade;

-- Drop triggers on rating table that reference vehicle
drop trigger if exists rating_set_hour_bucket on rating cascade;
drop trigger if exists rating_check_daily_limit on rating cascade;

-- Drop tip table (references vehicle, and tipping is disabled)
drop table if exists tip cascade;

-- Drop the rating table (replaced by review table)
drop table if exists rating cascade;

-- Drop the vehicle table
drop table if exists vehicle cascade;

-- Drop the route table (no longer needed)
drop table if exists route cascade;

-- Drop functions that are no longer needed
drop function if exists set_hour_bucket() cascade;

-- Note: We keep the old 'transporter' table for now as it may have user data
-- that businesses reference via owner_id. The migration script handles
-- converting transporters to businesses, but we don't want to lose the
-- original data immediately.

