-- ============================================================================
-- MAKE REVIEW BUSINESS_ID NULLABLE
-- Allow reviews to be linked to campaigns only (no business required)
-- ============================================================================

-- Make business_id nullable in review table
-- Note: Foreign key constraints automatically allow nulls when column is nullable
alter table review 
  alter column business_id drop not null;

-- Drop the old unique constraint that requires business_id
drop index if exists uniq_review_device_business_hour;

-- Create separate unique constraints for business and campaign reviews
-- For business reviews: 1 review per device per business per hour
create unique index if not exists uniq_review_device_business_hour
  on review (business_id, device_hash, hour_bucket)
  where business_id is not null;

-- For campaign reviews: 1 review per device per campaign per hour
create unique index if not exists uniq_review_device_campaign_hour
  on review (campaign_id, device_hash, hour_bucket)
  where campaign_id is not null;

-- Also make stars nullable since campaign questions might not use stars
alter table review 
  alter column stars drop not null;

-- Update the stars check constraint to allow null
alter table review 
  drop constraint if exists review_stars_check;

alter table review 
  add constraint review_stars_check 
  check (stars is null or (stars between 1 and 5));

