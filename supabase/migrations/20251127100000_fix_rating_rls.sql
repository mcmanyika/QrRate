-- Fix RLS policies for rating table to allow anonymous inserts
-- This allows users to submit ratings without being logged in

-- Drop existing restrictive policies if they exist
drop policy if exists "rating_insert_auth" on rating;
drop policy if exists "rating_insert_own" on rating;

-- Create a permissive policy that allows anyone to insert ratings
-- Since ratings are identified by device_hash, we don't need user authentication
do $$ 
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'rating' 
    and policyname = 'rating_insert_all'
  ) then
    create policy "rating_insert_all" on rating
      for insert 
      with check (true);
  end if;
end $$;

-- Also ensure read policy exists for public access
do $$ 
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'rating' 
    and policyname = 'rating_select_all'
  ) then
    create policy "rating_select_all" on rating
      for select 
      using (true);
  end if;
end $$;

