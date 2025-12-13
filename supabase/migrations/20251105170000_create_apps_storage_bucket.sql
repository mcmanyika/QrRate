-- Create storage bucket for app downloads (APK files)
-- This bucket will store Android APK files for public download

-- Insert the bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'apps',
  'apps',
  true, -- Public bucket so files can be downloaded
  52428800, -- 50MB limit for APK files
  ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
on conflict (id) do nothing;

-- Policy: Allow public read access to all files in the apps bucket
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
    and tablename = 'objects' 
    and policyname = 'Public read access for apps bucket'
  ) then
    create policy "Public read access for apps bucket"
    on storage.objects for select
    using (bucket_id = 'apps');
  end if;
end $$;

-- Policy: Allow authenticated users to upload files (for admin use)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
    and tablename = 'objects' 
    and policyname = 'Authenticated upload access for apps bucket'
  ) then
    create policy "Authenticated upload access for apps bucket"
    on storage.objects for insert
    with check (bucket_id = 'apps' AND auth.role() = 'authenticated');
  end if;
end $$;

-- Policy: Allow authenticated users to update files (for admin use)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
    and tablename = 'objects' 
    and policyname = 'Authenticated update access for apps bucket'
  ) then
    create policy "Authenticated update access for apps bucket"
    on storage.objects for update
    using (bucket_id = 'apps' AND auth.role() = 'authenticated');
  end if;
end $$;

-- Policy: Allow authenticated users to delete files (for admin use)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
    and tablename = 'objects' 
    and policyname = 'Authenticated delete access for apps bucket'
  ) then
    create policy "Authenticated delete access for apps bucket"
    on storage.objects for delete
    using (bucket_id = 'apps' AND auth.role() = 'authenticated');
  end if;
end $$;

-- Comments removed - require owner permissions on storage.objects

