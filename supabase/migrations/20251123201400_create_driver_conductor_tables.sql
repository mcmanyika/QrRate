-- Create driver and conductor tables
-- Drivers and conductors belong to transporters

create table if not exists driver (
  id uuid primary key default gen_random_uuid(),
  transporter_id uuid not null references transporter(id) on delete cascade,
  name text not null,
  phone text,
  license_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conductor (
  id uuid primary key default gen_random_uuid(),
  transporter_id uuid not null references transporter(id) on delete cascade,
  name text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add foreign key columns to vehicle table
alter table vehicle 
add column if not exists driver_id uuid references driver(id) on delete set null,
add column if not exists conductor_id uuid references conductor(id) on delete set null;

-- Create indexes for faster lookups
create index if not exists idx_driver_transporter_id on driver(transporter_id);
create index if not exists idx_conductor_transporter_id on conductor(transporter_id);
create index if not exists idx_vehicle_driver_id on vehicle(driver_id) where driver_id is not null;
create index if not exists idx_vehicle_conductor_id on vehicle(conductor_id) where conductor_id is not null;

-- Enable RLS
alter table driver enable row level security;
alter table conductor enable row level security;

-- RLS Policies for drivers
create policy driver_select_own on driver
  for select to authenticated
  using (
    transporter_id in (
      select id from transporter where user_id = auth.uid()
    )
  );

create policy driver_insert_own on driver
  for insert to authenticated
  with check (
    transporter_id in (
      select id from transporter where user_id = auth.uid()
    )
  );

create policy driver_update_own on driver
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

create policy driver_delete_own on driver
  for delete to authenticated
  using (
    transporter_id in (
      select id from transporter where user_id = auth.uid()
    )
  );

-- RLS Policies for conductors
create policy conductor_select_own on conductor
  for select to authenticated
  using (
    transporter_id in (
      select id from transporter where user_id = auth.uid()
    )
  );

create policy conductor_insert_own on conductor
  for insert to authenticated
  with check (
    transporter_id in (
      select id from transporter where user_id = auth.uid()
    )
  );

create policy conductor_update_own on conductor
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

create policy conductor_delete_own on conductor
  for delete to authenticated
  using (
    transporter_id in (
      select id from transporter where user_id = auth.uid()
    )
  );

