-- Link vehicles to transporters
-- Add transporter_id column to vehicle table

alter table vehicle 
add column if not exists transporter_id uuid references transporter(id) on delete set null;

-- Create index for faster lookups
create index if not exists idx_vehicle_transporter_id on vehicle(transporter_id) where transporter_id is not null;

-- Policy: Transporters can read their own vehicles
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'vehicle' 
    and policyname = 'vehicle_select_transporter'
  ) then
    create policy vehicle_select_transporter on vehicle
      for select to authenticated
      using (
        transporter_id is not null 
        and transporter_id in (
          select id from transporter where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Policy: Transporters can insert vehicles for themselves
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'vehicle' 
    and policyname = 'vehicle_insert_transporter'
  ) then
    create policy vehicle_insert_transporter on vehicle
      for insert to authenticated
      with check (
        transporter_id is not null 
        and transporter_id in (
          select id from transporter where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Policy: Transporters can update their own vehicles
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'vehicle' 
    and policyname = 'vehicle_update_transporter'
  ) then
    create policy vehicle_update_transporter on vehicle
      for update to authenticated
      using (
        transporter_id is not null 
        and transporter_id in (
          select id from transporter where user_id = auth.uid()
        )
      )
      with check (
        transporter_id is not null 
        and transporter_id in (
          select id from transporter where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Policy: Transporters can delete their own vehicles
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'vehicle' 
    and policyname = 'vehicle_delete_transporter'
  ) then
    create policy vehicle_delete_transporter on vehicle
      for delete to authenticated
      using (
        transporter_id is not null 
        and transporter_id in (
          select id from transporter where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Policy: Transporters can read ratings for their vehicles
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'rating' 
    and policyname = 'rating_select_transporter'
  ) then
    create policy rating_select_transporter on rating
      for select to authenticated
      using (
        vehicle_id in (
          select id from vehicle 
          where transporter_id in (
            select id from transporter where user_id = auth.uid()
          )
        )
      );
  end if;
end $$;

-- Policy: Transporters can read tips for their vehicles
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'tip' 
    and policyname = 'tip_select_transporter'
  ) then
    create policy tip_select_transporter on tip
      for select to authenticated
      using (
        vehicle_id in (
          select id from vehicle 
          where transporter_id in (
            select id from transporter where user_id = auth.uid()
          )
        )
      );
  end if;
end $$;

-- Comments
comment on column vehicle.transporter_id is 'References transporter.id - links vehicle to transporter/driver';

