-- Create service_provider table
-- Service providers can be maintenance, fuel suppliers, or general services
-- Run this manually in Supabase SQL Editor if db push fails

create table if not exists service_provider (
  id uuid primary key default gen_random_uuid(),
  transporter_id uuid not null references transporter(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  service_type text not null check (service_type in ('maintenance', 'fuel_supplier', 'general')),
  address text,
  contact_person text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create vehicle_service_provider junction table for many-to-many relationship
create table if not exists vehicle_service_provider (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicle(id) on delete cascade,
  service_provider_id uuid not null references service_provider(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(vehicle_id, service_provider_id)
);

-- Create indexes for faster lookups
create index if not exists idx_service_provider_transporter_id on service_provider(transporter_id);
create index if not exists idx_service_provider_service_type on service_provider(service_type);
create index if not exists idx_service_provider_is_active on service_provider(is_active) where is_active = true;
create index if not exists idx_vehicle_service_provider_vehicle_id on vehicle_service_provider(vehicle_id);
create index if not exists idx_vehicle_service_provider_service_provider_id on vehicle_service_provider(service_provider_id);

-- Enable RLS
alter table service_provider enable row level security;
alter table vehicle_service_provider enable row level security;

-- RLS Policies for service_provider
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'service_provider' 
    and policyname = 'service_provider_select_own'
  ) then
    create policy service_provider_select_own on service_provider
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
    and tablename = 'service_provider' 
    and policyname = 'service_provider_insert_own'
  ) then
    create policy service_provider_insert_own on service_provider
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
    and tablename = 'service_provider' 
    and policyname = 'service_provider_update_own'
  ) then
    create policy service_provider_update_own on service_provider
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
    and tablename = 'service_provider' 
    and policyname = 'service_provider_delete_own'
  ) then
    create policy service_provider_delete_own on service_provider
      for delete to authenticated
      using (
        transporter_id in (
          select id from transporter where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- RLS Policies for vehicle_service_provider
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'vehicle_service_provider' 
    and policyname = 'vehicle_service_provider_select_own'
  ) then
    create policy vehicle_service_provider_select_own on vehicle_service_provider
      for select to authenticated
      using (
        vehicle_id in (
          select id from vehicle where transporter_id in (
            select id from transporter where user_id = auth.uid()
          )
        )
        and service_provider_id in (
          select id from service_provider where transporter_id in (
            select id from transporter where user_id = auth.uid()
          )
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'vehicle_service_provider' 
    and policyname = 'vehicle_service_provider_insert_own'
  ) then
    create policy vehicle_service_provider_insert_own on vehicle_service_provider
      for insert to authenticated
      with check (
        vehicle_id in (
          select id from vehicle where transporter_id in (
            select id from transporter where user_id = auth.uid()
          )
        )
        and service_provider_id in (
          select id from service_provider where transporter_id in (
            select id from transporter where user_id = auth.uid()
          )
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'vehicle_service_provider' 
    and policyname = 'vehicle_service_provider_delete_own'
  ) then
    create policy vehicle_service_provider_delete_own on vehicle_service_provider
      for delete to authenticated
      using (
        vehicle_id in (
          select id from vehicle where transporter_id in (
            select id from transporter where user_id = auth.uid()
          )
        )
        and service_provider_id in (
          select id from service_provider where transporter_id in (
            select id from transporter where user_id = auth.uid()
          )
        )
      );
  end if;
end $$;

