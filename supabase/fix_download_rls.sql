-- Fix RLS Policy for Download Tracking
-- Run this in Supabase SQL Editor to fix the RLS policy issue

-- First, drop existing policies if they exist
drop policy if exists download_insert_anon on download;
drop policy if exists download_read_authenticated on download;

-- Create policy: Allow anonymous inserts (this is the key fix)
create policy download_insert_anon on download
  for insert
  to anon
  with check (true);

-- Create policy: Allow authenticated users to read all downloads
create policy download_read_authenticated on download
  for select
  to authenticated
  using (true);

-- Verify the policies were created
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where tablename = 'download';

