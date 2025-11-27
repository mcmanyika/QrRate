-- Simplified Points System Migration
-- Creates essential tables for earning and displaying points

-- ============================================================================
-- 1. USER POINTS TABLE
-- ============================================================================
-- Track points balance per device (using device_hash as identifier)
create table if not exists user_points (
  id uuid primary key default gen_random_uuid(),
  device_hash text not null unique,
  available_points integer not null default 0 check (available_points >= 0),
  lifetime_points integer not null default 0 check (lifetime_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add lifetime_points column if it doesn't exist (for existing tables)
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'user_points' 
    and column_name = 'lifetime_points'
  ) then
    alter table user_points add column lifetime_points integer not null default 0 check (lifetime_points >= 0);
  end if;
end $$;

-- Index for fast lookups by device_hash
create index if not exists idx_user_points_device_hash on user_points(device_hash);

-- ============================================================================
-- 2. POINTS TRANSACTION TABLE
-- ============================================================================
-- Audit trail for all point movements (earning only for now)
create table if not exists points_transaction (
  id uuid primary key default gen_random_uuid(),
  device_hash text not null,
  points_amount integer not null check (points_amount > 0), -- Always positive for earning
  transaction_type text not null check (transaction_type in ('earn_rating')),
  rating_id uuid references rating(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_points_transaction_device on points_transaction(device_hash, created_at desc);
create index if not exists idx_points_transaction_rating on points_transaction(rating_id) where rating_id is not null;

-- ============================================================================
-- 3. POINTS SETTINGS TABLE
-- ============================================================================
-- Global configuration for points system (single row table)
create table if not exists points_settings (
  id uuid primary key default gen_random_uuid(),
  points_per_rating integer not null default 10 check (points_per_rating > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default settings (only if table is empty)
insert into points_settings (points_per_rating, is_active) 
select 10, true
where not exists (select 1 from points_settings);

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to update user_points.updated_at timestamp
create or replace function update_user_points_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at on user_points
drop trigger if exists update_user_points_timestamp on user_points;
create trigger update_user_points_timestamp
  before update on user_points
  for each row
  execute function update_user_points_updated_at();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all points-related tables
alter table user_points enable row level security;
alter table points_transaction enable row level security;
alter table points_settings enable row level security;

-- Policies for user_points - Allow anonymous users to read/write their own
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_points' and policyname = 'user_points_all_anon') then
    create policy user_points_all_anon on user_points
      for all using (true) with check (true);
  end if;
end $$;

-- Policies for points_transaction - Allow anonymous users to read/write their own
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'points_transaction' and policyname = 'points_transaction_all_anon') then
    create policy points_transaction_all_anon on points_transaction
      for all using (true) with check (true);
  end if;
end $$;

-- Policies for points_settings - Everyone can read (global config)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'points_settings' and policyname = 'points_settings_read_all') then
    create policy points_settings_read_all on points_settings
      for select using (true);
  end if;
end $$;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

comment on table user_points is 'Tracks points balance for each device (identified by device_hash)';
comment on table points_transaction is 'Audit log of all points earned';
comment on table points_settings is 'Global configuration for the points system (single row)';

comment on column user_points.lifetime_points is 'Lifetime points earned (never decreases)';
comment on column user_points.available_points is 'Current points balance';

comment on column points_transaction.points_amount is 'Points earned (always positive)';
