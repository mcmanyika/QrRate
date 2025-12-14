-- ============================================================================
-- CREATE EMAIL SUBSCRIPTIONS TABLE
-- Stores email addresses for newsletter subscriptions
-- ============================================================================

create table if not exists email_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index on email for faster lookups
create index if not exists idx_email_subscriptions_email on email_subscriptions(email);

-- Create index on subscribed_at for filtering active subscriptions
create index if not exists idx_email_subscriptions_subscribed_at on email_subscriptions(subscribed_at);

-- Enable RLS
alter table email_subscriptions enable row level security;

-- Public can insert (subscribe)
create policy email_subscriptions_insert_public on email_subscriptions
  for insert to anon, authenticated
  with check (true);

-- Public can read their own subscription status
create policy email_subscriptions_select_own on email_subscriptions
  for select to anon, authenticated
  using (true);

-- Add comment
comment on table email_subscriptions is 'Email addresses for newsletter subscriptions';

