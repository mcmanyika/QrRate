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
  reg_number text not null unique,
  route_id uuid references route(id) on delete set null,
  is_active boolean not null default true,
  qr_code_svg text,
  created_at timestamptz not null default now()
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
  -- bucketed window start (one per hour per device per vehicle)
  window_start timestamptz generated always as (date_trunc('hour', created_at)) stored
);

create table if not exists admin_user (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Dedupe: one rating per device per vehicle per hour bucket
create unique index if not exists uniq_rating_device_vehicle_hour
  on rating (vehicle_id, device_hash, window_start);

-- Simple analytics view: average stars per vehicle last 7 days
create or replace view vehicle_avg_last_7d as
select
  v.id as vehicle_id,
  v.reg_number,
  rte.name as route_name,
  avg(rt.stars)::numeric(4,2) as avg_stars,
  count(rt.id) as num_ratings
from vehicle v
left join route rte on rte.id = v.route_id
left join rating rt on rt.vehicle_id = v.id and rt.created_at >= now() - interval '7 days'
group by v.id, v.reg_number, rte.name;

-- Row Level Security
alter table route enable row level security;
alter table vehicle enable row level security;
alter table rating enable row level security;
alter table admin_user enable row level security;

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

-- Helpers
comment on column rating.device_hash is 'Opaque per-install hash used to rate-limit; no PII.';
comment on column rating.tag_ratings is 'JSON object mapping tag names to star ratings (1-5). Example: {"Cleanliness": 4, "Driving safety": 5}';


