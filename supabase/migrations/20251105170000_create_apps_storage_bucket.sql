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
create policy if not exists "Public read access for apps bucket"
on storage.objects for select
using (bucket_id = 'apps');

-- Policy: Allow authenticated users to upload files (for admin use)
create policy if not exists "Authenticated upload access for apps bucket"
on storage.objects for insert
with check (bucket_id = 'apps' AND auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update files (for admin use)
create policy if not exists "Authenticated update access for apps bucket"
on storage.objects for update
using (bucket_id = 'apps' AND auth.role() = 'authenticated');

-- Policy: Allow authenticated users to delete files (for admin use)
create policy if not exists "Authenticated delete access for apps bucket"
on storage.objects for delete
using (bucket_id = 'apps' AND auth.role() = 'authenticated');

comment on policy "Public read access for apps bucket" on storage.objects is 'Allows anyone to download APK files from the apps bucket';
comment on policy "Authenticated upload access for apps bucket" on storage.objects is 'Allows authenticated users to upload APK files';
comment on policy "Authenticated update access for apps bucket" on storage.objects is 'Allows authenticated users to update APK files';
comment on policy "Authenticated delete access for apps bucket" on storage.objects is 'Allows authenticated users to delete APK files';

