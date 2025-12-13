-- ============================================================================
-- CREATE STORAGE BUCKETS FOR REVIEW PHOTOS AND BUSINESS LOGOS
-- ============================================================================

-- ============================================================================
-- 1. REVIEW PHOTOS BUCKET
-- ============================================================================
-- Public read, authenticated write (for anonymous review submissions)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos',
  'review-photos',
  true, -- Public bucket so photos can be viewed
  10485760, -- 10MB limit per photo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Policy: Allow public read access to all review photos
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
    and tablename = 'objects' 
    and policyname = 'Public read access for review-photos bucket'
  ) then
    create policy "Public read access for review-photos bucket"
    on storage.objects for select
    using (bucket_id = 'review-photos');
  end if;
end $$;

-- Policy: Allow anyone to upload review photos (anonymous reviews)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
    and tablename = 'objects' 
    and policyname = 'Public upload access for review-photos bucket'
  ) then
    create policy "Public upload access for review-photos bucket"
    on storage.objects for insert
    with check (bucket_id = 'review-photos');
  end if;
end $$;

-- Policy: Allow authenticated users (business owners) to delete photos
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
    and tablename = 'objects' 
    and policyname = 'Authenticated delete access for review-photos bucket'
  ) then
    create policy "Authenticated delete access for review-photos bucket"
    on storage.objects for delete
    using (bucket_id = 'review-photos' AND auth.role() = 'authenticated');
  end if;
end $$;

-- ============================================================================
-- 2. BUSINESS LOGOS BUCKET
-- ============================================================================
-- Public read, authenticated write (business owners only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-logos',
  'business-logos',
  true, -- Public bucket so logos can be viewed
  5242880, -- 5MB limit per logo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Policy: Allow public read access to all business logos
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
    and tablename = 'objects' 
    and policyname = 'Public read access for business-logos bucket'
  ) then
    create policy "Public read access for business-logos bucket"
    on storage.objects for select
    using (bucket_id = 'business-logos');
  end if;
end $$;

-- Policy: Allow authenticated users (business owners) to upload logos
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
    and tablename = 'objects' 
    and policyname = 'Authenticated upload access for business-logos bucket'
  ) then
    create policy "Authenticated upload access for business-logos bucket"
    on storage.objects for insert
    with check (bucket_id = 'business-logos' AND auth.role() = 'authenticated');
  end if;
end $$;

-- Policy: Allow authenticated users (business owners) to update logos
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
    and tablename = 'objects' 
    and policyname = 'Authenticated update access for business-logos bucket'
  ) then
    create policy "Authenticated update access for business-logos bucket"
    on storage.objects for update
    using (bucket_id = 'business-logos' AND auth.role() = 'authenticated');
  end if;
end $$;

-- Policy: Allow authenticated users (business owners) to delete logos
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
    and tablename = 'objects' 
    and policyname = 'Authenticated delete access for business-logos bucket'
  ) then
    create policy "Authenticated delete access for business-logos bucket"
    on storage.objects for delete
    using (bucket_id = 'business-logos' AND auth.role() = 'authenticated');
  end if;
end $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
-- Comments removed - require owner permissions on storage.objects

