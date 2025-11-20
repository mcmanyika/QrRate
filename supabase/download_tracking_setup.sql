-- Download Tracking Setup SQL
-- Run this SQL in your Supabase SQL Editor to set up download tracking
-- This creates the download table and all necessary policies

-- Create download table
create table if not exists download (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('ios', 'android')),
  user_agent text,
  ip_address text,
  created_at timestamptz not null default now()
);

-- Create index for querying downloads by platform and date
create index if not exists idx_download_platform_created on download(platform, created_at);

-- Enable Row Level Security
alter table download enable row level security;

-- Policy: Allow anonymous inserts for public download tracking
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'download' 
    and policyname = 'download_insert_anon'
  ) then
    create policy download_insert_anon on download
      for insert to anon with check (true);
  end if;
end $$;

-- Policy: Allow authenticated users to read all downloads (for analytics)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'download' 
    and policyname = 'download_read_authenticated'
  ) then
    create policy download_read_authenticated on download
      for select to authenticated using (true);
  end if;
end $$;

-- Add comments for documentation
comment on table download is 'Tracks app downloads from the landing page';
comment on column download.platform is 'Platform type: ios or android';
comment on column download.user_agent is 'User agent string from the browser';
comment on column download.ip_address is 'IP address of the downloader (optional, for analytics)';

-- Verify the table was created
select 'Download tracking table created successfully!' as status;

