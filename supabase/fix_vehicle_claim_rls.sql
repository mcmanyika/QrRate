-- Fix RLS policy to allow transporters to claim vehicles (update transporter_id)
-- This allows transporters to link existing vehicles to their account

-- Drop existing update policy if it exists
drop policy if exists vehicle_update_transporter on vehicle;

-- Create new update policy that allows updating transporter_id for unclaimed vehicles
create policy vehicle_update_transporter on vehicle
  for update to authenticated
  using (
    -- Allow if vehicle is already owned by transporter
    (transporter_id is not null 
     and transporter_id in (
       select id from transporter where user_id = auth.uid()
     ))
    OR
    -- Allow if vehicle is unclaimed (transporter_id is null)
    (transporter_id is null)
  )
  with check (
    -- Only allow setting transporter_id to the authenticated transporter's id
    (transporter_id is null OR transporter_id in (
      select id from transporter where user_id = auth.uid()
    ))
  );

