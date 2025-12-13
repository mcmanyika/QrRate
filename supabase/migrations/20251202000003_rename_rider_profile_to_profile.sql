-- ============================================================================
-- RENAME rider_profile TO profile
-- Renames the rider_profile table to simply 'profile' for the universal review app
-- ============================================================================

-- Rename the table
alter table if exists rider_profile rename to profile;

-- Rename indexes
alter index if exists rider_profile_unique_user rename to profile_unique_user;
alter index if exists rider_profile_unique_device rename to profile_unique_device;
alter index if exists idx_rider_profile_user_id rename to idx_profile_user_id;
alter index if exists idx_rider_profile_device_hash rename to idx_profile_device_hash;
alter index if exists idx_rider_profile_country_code rename to idx_profile_country_code;

-- Rename policies
drop policy if exists rider_profile_select_own on profile;
drop policy if exists rider_profile_update_own on profile;
drop policy if exists rider_profile_insert_own on profile;
drop policy if exists rider_profile_anon_read on profile;
drop policy if exists rider_profile_anon_insert on profile;
drop policy if exists rider_profile_anon_update on profile;

-- Recreate policies with new names
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'profile' 
    and policyname = 'profile_select_own'
  ) then
    create policy profile_select_own on profile
      for select to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'profile' 
    and policyname = 'profile_update_own'
  ) then
    create policy profile_update_own on profile
      for update to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'profile' 
    and policyname = 'profile_insert_own'
  ) then
    create policy profile_insert_own on profile
      for insert to authenticated
      with check (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'profile' 
    and policyname = 'profile_anon_read'
  ) then
    create policy profile_anon_read on profile
      for select to anon
      using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'profile' 
    and policyname = 'profile_anon_insert'
  ) then
    create policy profile_anon_insert on profile
      for insert to anon
      with check (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'profile' 
    and policyname = 'profile_anon_update'
  ) then
    create policy profile_anon_update on profile
      for update to anon
      using (true)
      with check (true);
  end if;
end $$;

-- Rename trigger
drop trigger if exists rider_profile_updated_at on profile;
create trigger profile_updated_at
  before update on profile
  for each row
  execute function update_rider_profile_updated_at();

-- Rename function (optional - can keep the same function name)
-- Or rename it for consistency
do $$ 
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'update_rider_profile_updated_at'
  ) then
    execute 'alter function update_rider_profile_updated_at() rename to update_profile_updated_at';
  end if;
end $$;

-- Update trigger to use renamed function (if it exists)
drop trigger if exists profile_updated_at on profile;
do $$ 
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'update_profile_updated_at'
  ) then
    execute 'create trigger profile_updated_at before update on profile for each row execute function update_profile_updated_at()';
  elsif exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'update_rider_profile_updated_at'
  ) then
    execute 'create trigger profile_updated_at before update on profile for each row execute function update_rider_profile_updated_at()';
  end if;
end $$;

-- Update comment
comment on table profile is 'Stores user profile information including country preference. Supports both authenticated users (via user_id) and anonymous users (via device_hash)';

