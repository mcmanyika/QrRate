-- ============================================================================
-- ADD TAGS COLUMN TO EVENT TABLE
-- Allows campaigns to define custom tags for "What stood out?" section
-- ============================================================================

-- Add tags column to event table
alter table event add column if not exists tags text[];

-- Add comment
comment on column event.tags is 'Custom tags for "What stood out?" section in reviews';

