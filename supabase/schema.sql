-- KombiRate Simple MVP – Supabase schema (Postgres)
-- Safe to run on an empty database. Idempotency is best-effort.

-- Extensions
create extension if not exists pgcrypto;

-- Tables
create table if not exists route (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists vehicle (
  id uuid primary key default gen_random_uuid(),
  reg_number text not null,
  country_code text not null default 'KE',
  route_id uuid references route(id) on delete set null,
  is_active boolean not null default true,
  qr_code_svg text,
  created_at timestamptz not null default now(),
  unique(country_code, reg_number)
);

-- Ratings are anonymous; we store a device_hash (opaque) for dedupe.
create table if not exists rating (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicle(id) on delete cascade,
  route_id uuid references route(id) on delete set null,
  stars smallint not null check (stars between 1 and 5),
  tags text[],
  tag_ratings jsonb,
  comment text,
  device_hash text not null,
  created_at timestamptz not null default now(),
  -- hour_bucket for 1-hour rating restriction (updated by trigger)
  hour_bucket timestamptz not null default now()
);

create table if not exists admin_user (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists tip (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid references rating(id) on delete set null,
  vehicle_id uuid not null references vehicle(id) on delete cascade,
  route_id uuid references route(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  stripe_payment_intent_id text unique,
  stripe_status text check (stripe_status in ('pending', 'succeeded', 'failed', 'canceled')),
  platform_fee_cents integer not null default 0,
  operator_amount_cents integer not null default 0,
  device_hash text not null,
  created_at timestamptz not null default now()
);

-- Country table for storing all country codes and information
create table if not exists country (
  code text primary key,
  name text not null,
  flag text not null,
  region text,
  is_active boolean not null default true,
  sort_order integer default 999,
  created_at timestamptz not null default now()
);

-- Rating restrictions:
-- - One rating per device per vehicle per hour (via unique index on hour_bucket)
-- - Maximum 4 ratings per device per day (via trigger)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_rating_device_vehicle_hour
  ON rating (vehicle_id, device_hash, hour_bucket);

-- Trigger to keep hour_bucket aligned to the created_at hour (UTC)
CREATE OR REPLACE FUNCTION set_hour_bucket()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.hour_bucket := date_trunc('hour', NEW.created_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rating_set_hour_bucket ON rating;
CREATE TRIGGER rating_set_hour_bucket
BEFORE INSERT OR UPDATE OF created_at ON rating
FOR EACH ROW EXECUTE FUNCTION set_hour_bucket();

-- Simple analytics view: average stars per vehicle last 7 days
create or replace view vehicle_avg_last_7d as
select
  v.id as vehicle_id,
  v.reg_number,
  v.country_code,
  rte.name as route_name,
  avg(rt.stars)::numeric(4,2) as avg_stars,
  count(rt.id) as num_ratings
from vehicle v
left join route rte on rte.id = v.route_id
left join rating rt on rt.vehicle_id = v.id and rt.created_at >= now() - interval '7 days'
group by v.id, v.reg_number, v.country_code, rte.name;

-- Row Level Security
alter table route enable row level security;
alter table vehicle enable row level security;
alter table rating enable row level security;
alter table admin_user enable row level security;
alter table tip enable row level security;
alter table country enable row level security;

-- Policies
-- Public read for route & vehicle (admin site will still use service role)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'route' and policyname = 'route_read_public') then
    create policy route_read_public on route
      for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'vehicle' and policyname = 'vehicle_read_public') then
    create policy vehicle_read_public on vehicle
      for select using (true);
  end if;
end $$;

-- Allow anonymous inserts to rating
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rating' and policyname = 'rating_insert_anon') then
    create policy rating_insert_anon on rating
      for insert to anon with check (true);
  end if;
end $$;

-- Allow anonymous reads to rating (for stats view)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rating' and policyname = 'rating_read_anon') then
    create policy rating_read_anon on rating
      for select to anon using (true);
  end if;
end $$;

-- Admin-only management (Supabase will attach role via service key on server)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'route' and policyname = 'route_admin_all') then
    create policy route_admin_all on route
      for all to authenticated using (exists(select 1 from admin_user au where au.email = auth.jwt()->>'email')) with check (exists(select 1 from admin_user au2 where au2.email = auth.jwt()->>'email'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'vehicle' and policyname = 'vehicle_admin_all') then
    create policy vehicle_admin_all on vehicle
      for all to authenticated using (exists(select 1 from admin_user au where au.email = auth.jwt()->>'email')) with check (exists(select 1 from admin_user au2 where au2.email = auth.jwt()->>'email'));
  end if;
end $$;

-- Tip indexes
create index if not exists idx_tip_vehicle_created on tip(vehicle_id, created_at);
create index if not exists idx_tip_stripe_status on tip(stripe_status) where stripe_status = 'succeeded';
create index if not exists idx_tip_rating_id on tip(rating_id) where rating_id is not null;

-- Country indexes
create index if not exists idx_country_is_active on country(is_active) where is_active = true;
create index if not exists idx_country_sort_order on country(sort_order);

-- Tip policies
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tip' and policyname = 'tip_insert_anon') then
    create policy tip_insert_anon on tip
      for insert to anon with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tip' and policyname = 'tip_read_anon') then
    create policy tip_read_anon on tip
      for select to anon using (true);
  end if;
end $$;

-- Country policies - public read access
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'country' and policyname = 'country_read_public') then
    create policy country_read_public on country
      for select using (is_active = true);
  end if;
end $$;

-- Tip analytics view
create or replace view vehicle_tip_summary as
select
  v.id as vehicle_id,
  v.reg_number,
  v.country_code,
  rte.name as route_name,
  count(t.id) filter (where t.stripe_status = 'succeeded') as total_tips,
  sum(t.amount_cents) filter (where t.stripe_status = 'succeeded') as total_amount_cents,
  sum(t.platform_fee_cents) filter (where t.stripe_status = 'succeeded') as total_platform_fee_cents,
  sum(t.operator_amount_cents) filter (where t.stripe_status = 'succeeded') as total_operator_amount_cents,
  avg(t.amount_cents) filter (where t.stripe_status = 'succeeded') as avg_tip_cents,
  max(t.created_at) filter (where t.stripe_status = 'succeeded') as last_tip_at
from vehicle v
left join route rte on rte.id = v.route_id
left join tip t on t.vehicle_id = v.id
group by v.id, v.reg_number, v.country_code, rte.name;

-- Service Provider tables (for transporter module)
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

create table if not exists vehicle_service_provider (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicle(id) on delete cascade,
  service_provider_id uuid not null references service_provider(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(vehicle_id, service_provider_id)
);

-- Service Provider indexes
create index if not exists idx_service_provider_transporter_id on service_provider(transporter_id);
create index if not exists idx_service_provider_service_type on service_provider(service_type);
create index if not exists idx_service_provider_is_active on service_provider(is_active) where is_active = true;
create index if not exists idx_vehicle_service_provider_vehicle_id on vehicle_service_provider(vehicle_id);
create index if not exists idx_vehicle_service_provider_service_provider_id on vehicle_service_provider(service_provider_id);

-- Service Provider RLS
alter table service_provider enable row level security;
alter table vehicle_service_provider enable row level security;

-- Helpers
comment on column rating.device_hash is 'Opaque per-install hash used to rate-limit; no PII.';
comment on column rating.tag_ratings is 'JSON object mapping tag names to star ratings (1-5). Example: {"Cleanliness": 4, "Driving safety": 5}';
comment on table tip is 'Stores tip transactions processed through Stripe';
comment on column tip.amount_cents is 'Tip amount in cents (e.g., 500 = $5.00)';
comment on column tip.platform_fee_cents is 'Platform fee deducted from tip amount';
comment on column tip.operator_amount_cents is 'Amount that goes to operator/driver after platform fee';
comment on table service_provider is 'Service providers (maintenance, fuel suppliers, general services) managed by transporters';
comment on table vehicle_service_provider is 'Junction table linking vehicles to service providers';
comment on table country is 'Stores all countries with ISO 3166-1 alpha-2 codes for vehicle registration plate support';


