-- KombiRate Simple MVP – initial migration
create extension if not exists pgcrypto;

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
  created_at timestamptz not null default now()
);

create table if not exists rating (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicle(id) on delete cascade,
  route_id uuid references route(id) on delete set null,
  stars smallint not null check (stars between 1 and 5),
  tags text[],
  comment text,
  device_hash text not null,
  created_at timestamptz not null default now(),
  hour_bucket timestamptz not null default now()
);

create table if not exists admin_user (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- trigger to keep hour_bucket aligned to the created_at hour (UTC)
create or replace function set_hour_bucket()
returns trigger language plpgsql as $$
begin
  new.hour_bucket := date_trunc('hour', new.created_at);
  return new;
end;
$$;

drop trigger if exists rating_set_hour_bucket on rating;
create trigger rating_set_hour_bucket
before insert or update of created_at on rating
for each row execute function set_hour_bucket();

-- one per hour per device per vehicle via materialized hour_bucket
create unique index if not exists uniq_rating_device_vehicle_hour
  on rating (vehicle_id, device_hash, hour_bucket);

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

alter table route enable row level security;
alter table vehicle enable row level security;
alter table rating enable row level security;
alter table admin_user enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'route' and policyname = 'route_read_public') then
    create policy route_read_public on route for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'vehicle' and policyname = 'vehicle_read_public') then
    create policy vehicle_read_public on vehicle for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'vehicle' and policyname = 'vehicle_insert_anon') then
    create policy vehicle_insert_anon on vehicle for insert to anon with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rating' and policyname = 'rating_insert_anon') then
    create policy rating_insert_anon on rating for insert to anon with check (true);
  end if;
end $$;

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

comment on column rating.device_hash is 'Opaque per-install hash used to rate-limit; no PII.';


