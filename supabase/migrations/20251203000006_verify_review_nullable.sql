-- ============================================================================
-- VERIFY AND FIX REVIEW BUSINESS_ID NULLABLE
-- Ensure business_id can be null for campaign-only reviews
-- ============================================================================

-- Check if business_id is still NOT NULL and fix it
do $$
begin
  if exists (
    select 1 
    from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'review' 
      and column_name = 'business_id' 
      and is_nullable = 'NO'
  ) then
    alter table review alter column business_id drop not null;
  end if;
end $$;

