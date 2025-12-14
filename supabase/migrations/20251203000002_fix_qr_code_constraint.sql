-- Fix constraint to ensure at least one of business_id or campaign_id is set
alter table qr_code 
  drop constraint if exists qr_code_business_or_campaign;

alter table qr_code 
  add constraint qr_code_business_or_campaign 
  check (
    (business_id is not null) or 
    (campaign_id is not null)
  );

