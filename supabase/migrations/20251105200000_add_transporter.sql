-- Create transporter table
-- Links to Supabase auth.users for authentication

create table if not exists transporter (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  name text not null,
  phone text unique,
  email text unique,
  profile_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index for faster lookups
create index if not exists idx_transporter_user_id on transporter(user_id);
create index if not exists idx_transporter_phone on transporter(phone) where phone is not null;
create index if not exists idx_transporter_email on transporter(email) where email is not null;

-- Enable RLS
alter table transporter enable row level security;

-- Policy: Transporters can read their own data
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'transporter' 
    and policyname = 'transporter_select_own'
  ) then
    create policy transporter_select_own on transporter
      for select to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- Policy: Transporters can update their own data
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'transporter' 
    and policyname = 'transporter_update_own'
  ) then
    create policy transporter_update_own on transporter
      for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Policy: Transporters can insert their own record (during signup)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'transporter' 
    and policyname = 'transporter_insert_own'
  ) then
    create policy transporter_insert_own on transporter
      for insert to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Function to update updated_at timestamp
create or replace function update_transporter_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger to automatically update updated_at
drop trigger if exists transporter_updated_at on transporter;
create trigger transporter_updated_at
before update on transporter
for each row execute function update_transporter_updated_at();

-- Comments
comment on table transporter is 'Stores transporter/driver profile information linked to auth.users';
comment on column transporter.user_id is 'References auth.users.id for authentication';
comment on column transporter.phone is 'Phone number for OTP authentication (optional)';
comment on column transporter.email is 'Email address (should match auth.users.email)';

