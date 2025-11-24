-- Create unified staff table (replaces separate driver and conductor tables)
-- Staff can have role: 'driver' or 'conductor'
-- Run this manually in Supabase SQL Editor

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  transporter_id uuid not null references transporter(id) on delete cascade,
  name text not null,
  phone text,
  role text not null check (role in ('driver', 'conductor')),
  license_number text, -- Only for drivers
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Update vehicle table to use staff_id instead of driver_id and conductor_id
alter table vehicle 
add column if not exists driver_staff_id uuid references staff(id) on delete set null,
add column if not exists conductor_staff_id uuid references staff(id) on delete set null;

-- Create indexes for faster lookups
create index if not exists idx_staff_transporter_id on staff(transporter_id);
create index if not exists idx_staff_role on staff(role);
create index if not exists idx_vehicle_driver_staff_id on vehicle(driver_staff_id) where driver_staff_id is not null;
create index if not exists idx_vehicle_conductor_staff_id on vehicle(conductor_staff_id) where conductor_staff_id is not null;

-- Enable RLS
alter table staff enable row level security;

-- RLS Policies for staff
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'staff' 
    and policyname = 'staff_select_own'
  ) then
    create policy staff_select_own on staff
      for select to authenticated
      using (
        transporter_id in (
          select id from transporter where user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'staff' 
    and policyname = 'staff_insert_own'
  ) then
    create policy staff_insert_own on staff
      for insert to authenticated
      with check (
        transporter_id in (
          select id from transporter where user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'staff' 
    and policyname = 'staff_update_own'
  ) then
    create policy staff_update_own on staff
      for update to authenticated
      using (
        transporter_id in (
          select id from transporter where user_id = auth.uid()
        )
      )
      with check (
        transporter_id in (
          select id from transporter where user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'staff' 
    and policyname = 'staff_delete_own'
  ) then
    create policy staff_delete_own on staff
      for delete to authenticated
      using (
        transporter_id in (
          select id from transporter where user_id = auth.uid()
        )
      );
  end if;
end $$;

