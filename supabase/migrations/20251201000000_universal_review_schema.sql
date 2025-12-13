-- ============================================================================
-- UNIVERSAL REVIEW APP SCHEMA
-- Convert from vehicle-specific to business-agnostic
-- ============================================================================

-- Extensions (if not already exists)
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. BUSINESSES TABLE (replaces vehicle + transporter)
-- ============================================================================
create table if not exists business (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique, -- For public URLs: yourapp.com/business/slug
  description text,
  logo_url text,
  category text, -- 'restaurant', 'vendor', 'service', 'transport', 'event', etc.
  website text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  country_code text default 'US',
  is_active boolean not null default true,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'pro', 'business', 'enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for business table
create index if not exists idx_business_owner_id on business(owner_id);
create index if not exists idx_business_slug on business(slug);
create index if not exists idx_business_category on business(category);
create index if not exists idx_business_is_active on business(is_active) where is_active = true;

-- ============================================================================
-- 2. QR CODES TABLE (separate from business for flexibility)
-- ============================================================================
create table if not exists qr_code (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business(id) on delete cascade,
  code text unique not null, -- Short unique code (e.g., "abc123")
  qr_code_svg text,
  qr_code_url text, -- Full URL: yourapp.com/review/abc123
  name text, -- Optional: "Main Entrance", "Table 5", etc.
  location text, -- Optional: "Front counter", "Booth 12"
  is_active boolean not null default true,
  scan_count integer default 0,
  created_at timestamptz not null default now()
);

-- Indexes for qr_code table
create index if not exists idx_qr_code_business_id on qr_code(business_id);
create index if not exists idx_qr_code_code on qr_code(code);
create index if not exists idx_qr_code_is_active on qr_code(is_active) where is_active = true;

-- ============================================================================
-- 3. REVIEWS TABLE (generalized from rating)
-- ============================================================================
create table if not exists review (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business(id) on delete cascade,
  qr_code_id uuid references qr_code(id) on delete set null,
  stars smallint not null check (stars between 1 and 5),
  tags text[], -- ['Friendly', 'Fast', 'Great value']
  tag_ratings jsonb, -- {"Friendly": 5, "Fast": 4} (optional, for detailed ratings)
  comment text,
  photo_urls text[], -- Array of photo URLs
  device_hash text not null, -- For anonymous reviews + spam prevention
  reviewer_name text, -- Optional: "John D." (if they want to leave name)
  reviewer_email text, -- Optional: for follow-up
  is_verified boolean default false, -- For verified purchases (future)
  is_public boolean default true,
  is_flagged boolean default false, -- For moderation
  business_response text, -- Owner's response to review
  business_response_at timestamptz,
  created_at timestamptz not null default now(),
  hour_bucket timestamptz not null default now() -- For rate limiting
);

-- Indexes for review table
create index if not exists idx_review_business_id on review(business_id);
create index if not exists idx_review_qr_code_id on review(qr_code_id);
create index if not exists idx_review_created_at on review(created_at desc);
create index if not exists idx_review_is_public on review(is_public) where is_public = true;
create index if not exists idx_review_device_hash on review(device_hash);

-- Unique constraint for rate limiting (1 review per device per business per hour)
create unique index if not exists uniq_review_device_business_hour
  on review (business_id, device_hash, hour_bucket);

-- ============================================================================
-- 4. EVENTS TABLE (for expos, farmers markets, etc.)
-- ============================================================================
create table if not exists event (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique,
  description text,
  start_date date,
  end_date date,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Indexes for event table
create index if not exists idx_event_organizer_id on event(organizer_id);
create index if not exists idx_event_slug on event(slug);
create index if not exists idx_event_is_active on event(is_active) where is_active = true;

-- ============================================================================
-- 5. EVENT BUSINESSES (junction table for events)
-- ============================================================================
create table if not exists event_business (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references event(id) on delete cascade,
  business_id uuid not null references business(id) on delete cascade,
  booth_number text,
  location_description text,
  created_at timestamptz not null default now(),
  unique(event_id, business_id)
);

-- Indexes for event_business table
create index if not exists idx_event_business_event_id on event_business(event_id);
create index if not exists idx_event_business_business_id on event_business(business_id);

-- ============================================================================
-- 6. BUSINESS SETTINGS (customizable tags, categories, etc.)
-- ============================================================================
create table if not exists business_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business(id) on delete cascade unique,
  custom_tags text[], -- Business can define their own tags
  require_photo boolean default false,
  require_comment boolean default false,
  auto_respond_message text, -- Auto-reply to reviews
  notification_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for business_settings
create index if not exists idx_business_settings_business_id on business_settings(business_id);

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Hour bucket trigger (same as rating table)
create or replace function set_review_hour_bucket()
returns trigger language plpgsql as $$
begin
  new.hour_bucket := date_trunc('hour', new.created_at);
  return new;
end;
$$;

drop trigger if exists review_set_hour_bucket on review;
create trigger review_set_hour_bucket
before insert or update of created_at on review
for each row execute function set_review_hour_bucket();

-- Daily limit trigger (max 4 reviews per day per device)
create or replace function check_daily_review_limit()
returns trigger language plpgsql as $$
declare
  daily_count integer;
begin
  select count(*) into daily_count
  from review
  where device_hash = new.device_hash
    and created_at >= date_trunc('day', now());
  
  if daily_count >= 4 then
    raise exception 'daily_review_limit_exceeded: Maximum of 4 reviews per day allowed. You have already submitted % reviews today.', daily_count
      using errcode = 'P0001';
  end if;
  
  return new;
end;
$$;

drop trigger if exists review_check_daily_limit on review;
create trigger review_check_daily_limit
before insert on review
for each row execute function check_daily_review_limit();

-- Auto-update timestamps for business
create or replace function update_business_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists business_updated_at on business;
create trigger business_updated_at
before update on business
for each row execute function update_business_updated_at();

-- Auto-update timestamps for business_settings
create or replace function update_business_settings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists business_settings_updated_at on business_settings;
create trigger business_settings_updated_at
before update on business_settings
for each row execute function update_business_settings_updated_at();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table business enable row level security;
alter table qr_code enable row level security;
alter table review enable row level security;
alter table event enable row level security;
alter table event_business enable row level security;
alter table business_settings enable row level security;

-- Business: Owners can manage their own, public can read active ones
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'business' and policyname = 'business_select_public') then
    create policy business_select_public on business
      for select using (is_active = true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'business' and policyname = 'business_all_own') then
    create policy business_all_own on business
      for all to authenticated
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;
end $$;

-- QR Codes: Public read, owners can manage
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'qr_code' and policyname = 'qr_code_select_public') then
    create policy qr_code_select_public on qr_code
      for select using (is_active = true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'qr_code' and policyname = 'qr_code_all_own') then
    create policy qr_code_all_own on qr_code
      for all to authenticated
      using (
        business_id in (select id from business where owner_id = auth.uid())
      )
      with check (
        business_id in (select id from business where owner_id = auth.uid())
      );
  end if;
end $$;

-- Reviews: Public read/write, owners can respond
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'review' and policyname = 'review_select_public') then
    create policy review_select_public on review
      for select using (is_public = true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'review' and policyname = 'review_insert_public') then
    create policy review_insert_public on review
      for insert with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'review' and policyname = 'review_update_own') then
    create policy review_update_own on review
      for update to authenticated
      using (
        business_id in (select id from business where owner_id = auth.uid())
      )
      with check (
        business_id in (select id from business where owner_id = auth.uid())
      );
  end if;
end $$;

-- Events: Organizers can manage, public can read active
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'event' and policyname = 'event_select_public') then
    create policy event_select_public on event
      for select using (is_active = true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'event' and policyname = 'event_all_own') then
    create policy event_all_own on event
      for all to authenticated
      using (organizer_id = auth.uid())
      with check (organizer_id = auth.uid());
  end if;
end $$;

-- Event Business: Public read, organizers can manage
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'event_business' and policyname = 'event_business_select_public') then
    create policy event_business_select_public on event_business
      for select using (
        event_id in (select id from event where is_active = true)
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'event_business' and policyname = 'event_business_all_own') then
    create policy event_business_all_own on event_business
      for all to authenticated
      using (
        event_id in (select id from event where organizer_id = auth.uid())
      )
      with check (
        event_id in (select id from event where organizer_id = auth.uid())
      );
  end if;
end $$;

-- Business Settings: Owners can manage
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'business_settings' and policyname = 'business_settings_all_own') then
    create policy business_settings_all_own on business_settings
      for all to authenticated
      using (
        business_id in (select id from business where owner_id = auth.uid())
      )
      with check (
        business_id in (select id from business where owner_id = auth.uid())
      );
  end if;
end $$;

-- ============================================================================
-- 9. VIEWS FOR ANALYTICS
-- ============================================================================

-- Business stats view
create or replace view business_stats as
select
  b.id as business_id,
  b.name,
  b.slug,
  count(r.id) as total_reviews,
  avg(r.stars)::numeric(4,2) as avg_rating,
  count(r.id) filter (where r.created_at >= now() - interval '7 days') as reviews_last_7d,
  count(r.id) filter (where r.created_at >= now() - interval '30 days') as reviews_last_30d,
  max(r.created_at) as last_review_at
from business b
left join review r on r.business_id = b.id and r.is_public = true
group by b.id, b.name, b.slug;

-- ============================================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- ============================================================================

comment on table business is 'Universal businesses that can receive reviews';
comment on table qr_code is 'QR codes linking to businesses (one business can have multiple)';
comment on table review is 'Customer reviews for businesses';
comment on table event is 'Events/expos where multiple businesses participate';
comment on table event_business is 'Junction table linking businesses to events';
comment on table business_settings is 'Customizable settings per business (tags, auto-responses, etc.)';

comment on column business.slug is 'URL-friendly identifier for public profile pages';
comment on column business.category is 'Business category: restaurant, vendor, service, transport, event, etc.';
comment on column qr_code.code is 'Short unique code for QR URLs (e.g., abc123)';
comment on column review.photo_urls is 'Array of photo URLs uploaded with review';
comment on column review.business_response is 'Owner response to the review';
comment on column review.device_hash is 'Opaque per-install hash used for rate limiting; no PII';

