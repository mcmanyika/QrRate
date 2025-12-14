-- ============================================================================
-- UPDATE REVIEW RLS POLICIES
-- Allow campaign organizers to respond to campaign reviews
-- ============================================================================

-- Drop the old policy that only checked business_id
drop policy if exists review_update_own on review;

-- Create new policy that supports both business and campaign reviews
create policy review_update_own on review
  for update to authenticated
  using (
    -- Allow if user owns the business
    (business_id is not null and business_id in (select id from business where owner_id = auth.uid())) or
    -- Allow if user is the campaign organizer
    (campaign_id is not null and campaign_id in (select id from event where organizer_id = auth.uid()))
  )
  with check (
    -- Allow if user owns the business
    (business_id is not null and business_id in (select id from business where owner_id = auth.uid())) or
    -- Allow if user is the campaign organizer
    (campaign_id is not null and campaign_id in (select id from event where organizer_id = auth.uid()))
  );

