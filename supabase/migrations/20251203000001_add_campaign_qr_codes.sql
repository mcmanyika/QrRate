-- ============================================================================
-- ADD CAMPAIGN QR CODES
-- Allow QR codes to be linked directly to campaigns (not just businesses)
-- ============================================================================

-- Add campaign_id to qr_code table
alter table qr_code 
  add column if not exists campaign_id uuid references event(id) on delete cascade;

-- Make business_id optional (for campaign-only QR codes)
alter table qr_code 
  alter column business_id drop not null;

-- Add index for campaign_id
create index if not exists idx_qr_code_campaign_id on qr_code(campaign_id);

-- Add constraint: QR code must have either business_id or campaign_id (at least one)
alter table qr_code 
  add constraint qr_code_business_or_campaign 
  check (
    (business_id is not null) or 
    (campaign_id is not null)
  );

-- Update review table to support campaign reviews
alter table review 
  add column if not exists campaign_id uuid references event(id) on delete set null;

-- Add index for campaign_id in review
create index if not exists idx_review_campaign_id on review(campaign_id);

