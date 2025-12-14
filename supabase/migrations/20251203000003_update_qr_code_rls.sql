-- ============================================================================
-- UPDATE QR CODE RLS POLICIES
-- Allow campaign organizers to create QR codes for their campaigns
-- ============================================================================

-- Drop the old policy that only checked business_id
drop policy if exists qr_code_all_own on qr_code;

-- Create new policy that supports both business and campaign QR codes
create policy qr_code_all_own on qr_code
  for all to authenticated
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

