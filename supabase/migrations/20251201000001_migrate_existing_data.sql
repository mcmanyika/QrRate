-- ============================================================================
-- DATA MIGRATION: Convert existing data to universal review schema
-- Migrates: transporter → business, vehicle → business, rating → review
-- ============================================================================

-- Helper function to generate URL-friendly slugs
create or replace function generate_slug(input_text text)
returns text language plpgsql as $$
declare
  slug text;
  counter integer := 0;
begin
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  slug := lower(regexp_replace(input_text, '[^a-z0-9]+', '-', 'g'));
  slug := trim(both '-' from slug);
  
  -- Ensure slug is not empty
  if slug = '' or slug is null then
    slug := 'business-' || substr(md5(random()::text), 1, 8);
  end if;
  
  -- Check if slug exists, append counter if needed
  while exists (select 1 from business where business.slug = slug) loop
    counter := counter + 1;
    slug := slug || '-' || counter;
  end loop;
  
  return slug;
end;
$$;

-- Helper function to generate short QR codes
create or replace function generate_qr_code()
returns text language plpgsql as $$
declare
  code text;
  counter integer := 0;
begin
  -- Generate 8-character alphanumeric code
  code := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  
  -- Ensure uniqueness
  while exists (select 1 from qr_code where qr_code.code = code) loop
    counter := counter + 1;
    code := lower(substr(md5(random()::text || clock_timestamp()::text || counter::text), 1, 8));
  end loop;
  
  return code;
end;
$$;

-- ============================================================================
-- STEP 1: Migrate transporters to businesses (only if transporter table exists and has data)
-- ============================================================================
do $$ 
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'transporter') then
    insert into business (
      owner_id,
      name,
      slug,
      description,
      logo_url,
      category,
      phone,
      email,
      country_code,
      is_active,
      subscription_tier,
      created_at,
      updated_at
    )
    select
      t.user_id as owner_id,
      coalesce(t.name, 'Transport Business') as name,
      generate_slug(coalesce(t.name, 'transport-' || t.id::text)) as slug,
      'Migrated from transporter' as description,
      t.profile_image_url as logo_url,
      'transport' as category,
      t.phone,
      t.email,
      'US' as country_code, -- Default to US, can be updated later
      t.is_active,
      'free' as subscription_tier,
      t.created_at,
      t.updated_at
    from transporter t
    where not exists (
      select 1 from business b where b.owner_id = t.user_id
    );
  end if;
end $$;

-- ============================================================================
-- STEP 2: Migrate vehicles to businesses (only if vehicle table exists and has data)
-- Strategy: If vehicle has transporter, link to transporter's business
--          If no transporter, create new business for vehicle
-- ============================================================================
do $$ 
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'vehicle') then
    -- Create businesses for vehicles without transporters
    insert into business (
      owner_id,
      name,
      slug,
      description,
      category,
      country_code,
      is_active,
      subscription_tier,
      created_at,
      updated_at
    )
    select
      gen_random_uuid() as owner_id, -- Temporary, will need to be updated when user claims
      v.reg_number as name,
      generate_slug('vehicle-' || v.reg_number || '-' || coalesce(v.country_code, 'US')) as slug,
      'Migrated vehicle: ' || v.reg_number as description,
      'transport' as category,
      coalesce(v.country_code, 'US') as country_code,
      v.is_active,
      'free' as subscription_tier,
      v.created_at,
      v.created_at as updated_at
    from vehicle v
    where (v.transporter_id is null or not exists (
      select 1 from business b 
      where b.owner_id in (select user_id from transporter where id = v.transporter_id)
    ))
      and not exists (
        select 1 from business b 
        where b.name = v.reg_number 
        and b.category = 'transport'
      );
  end if;
end $$;

-- ============================================================================
-- STEP 3: Create mapping table to track vehicle → business relationships
-- ============================================================================
create table if not exists vehicle_business_mapping (
  vehicle_id uuid primary key references vehicle(id) on delete cascade,
  business_id uuid not null references business(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Map vehicles with transporters to their transporter's business
do $$ 
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'vehicle')
     and exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'transporter') then
    insert into vehicle_business_mapping (vehicle_id, business_id)
    select
      v.id as vehicle_id,
      b.id as business_id
    from vehicle v
    inner join transporter t on t.id = v.transporter_id
    inner join business b on b.owner_id = t.user_id and b.category = 'transport'
    where v.transporter_id is not null
    on conflict (vehicle_id) do nothing;

    -- Map vehicles without transporters to their own business
    insert into vehicle_business_mapping (vehicle_id, business_id)
    select
      v.id as vehicle_id,
      b.id as business_id
    from vehicle v
    inner join business b on b.name = v.reg_number and b.category = 'transport'
    where v.transporter_id is null
      and not exists (select 1 from vehicle_business_mapping vbm where vbm.vehicle_id = v.id)
    on conflict (vehicle_id) do nothing;
  end if;
end $$;

-- ============================================================================
-- STEP 4: Migrate ratings to reviews (only if rating table exists and has data)
-- ============================================================================
do $$ 
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'rating')
     and exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'vehicle_business_mapping') then
    insert into review (
      business_id,
      stars,
      tags,
      tag_ratings,
      comment,
      device_hash,
      created_at,
      hour_bucket
    )
    select
      vbm.business_id,
      r.stars,
      r.tags,
      r.tag_ratings,
      r.comment,
      r.device_hash,
      r.created_at,
      r.hour_bucket
    from rating r
    inner join vehicle_business_mapping vbm on vbm.vehicle_id = r.vehicle_id
    where not exists (
      -- Avoid duplicates if migration is run multiple times
      select 1 from review rev 
      where rev.business_id = vbm.business_id
        and rev.device_hash = r.device_hash
        and rev.created_at = r.created_at
    );
  end if;
end $$;

-- ============================================================================
-- STEP 5: Generate QR codes for all businesses (optional - can be done later)
-- ============================================================================
-- Note: QR codes will be generated when businesses create them via the dashboard
-- This step is optional and can be skipped for new databases

-- ============================================================================
-- STEP 6: Update points_transaction to reference reviews instead of ratings
-- ============================================================================
-- Create mapping for rating_id → review_id (only if rating table exists)
do $$ 
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'rating') then
    create table if not exists rating_review_mapping (
      rating_id uuid primary key references rating(id) on delete cascade,
      review_id uuid not null references review(id) on delete cascade,
      created_at timestamptz not null default now()
    );

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'vehicle_business_mapping') then
      insert into rating_review_mapping (rating_id, review_id)
      select
        r.id as rating_id,
        rev.id as review_id
      from rating r
      inner join vehicle_business_mapping vbm on vbm.vehicle_id = r.vehicle_id
      inner join review rev on rev.business_id = vbm.business_id
        and rev.device_hash = r.device_hash
        and rev.created_at = r.created_at
        and rev.stars = r.stars
      on conflict (rating_id) do nothing;
    end if;
  end if;
end $$;

-- Update points_transaction to use review_id (only if table exists)
do $$ 
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'points_transaction') then
    alter table points_transaction 
    add column if not exists review_id uuid references review(id) on delete set null;

    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'rating_review_mapping') then
      update points_transaction pt
      set review_id = rrm.review_id
      from rating_review_mapping rrm
      where pt.rating_id = rrm.rating_id
        and pt.review_id is null;
    end if;
  end if;
end $$;

-- ============================================================================
-- STEP 7: Create business_settings for all businesses (optional - will be created on demand)
-- ============================================================================
-- Note: business_settings will be created automatically when businesses are created
-- This step is optional and can be skipped for new databases

-- ============================================================================
-- STEP 8: Cleanup temporary mapping tables (optional - keep for reference)
-- ============================================================================
-- Keep mapping tables for now in case we need to reference them
-- They can be dropped later if not needed:
-- drop table if exists vehicle_business_mapping;
-- drop table if exists rating_review_mapping;

-- ============================================================================
-- COMMENTS
-- ============================================================================
comment on table vehicle_business_mapping is 'Temporary mapping table for vehicle → business migration';
comment on table rating_review_mapping is 'Temporary mapping table for rating → review migration';

