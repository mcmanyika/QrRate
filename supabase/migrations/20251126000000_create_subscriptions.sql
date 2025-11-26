-- Create subscription_plan table
-- Defines available subscription plans with features and pricing

create table if not exists subscription_plan (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('free', 'pro', 'enterprise')),
  display_name text not null,
  price_monthly_cents integer not null default 0,
  price_yearly_cents integer not null default 0,
  features jsonb not null default '[]'::jsonb,
  max_vehicles integer,
  max_staff integer,
  max_expenses_per_month integer,
  has_advanced_analytics boolean not null default false,
  has_api_access boolean not null default false,
  has_white_label boolean not null default false,
  has_priority_support boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create transporter_subscription table
-- Tracks active subscriptions for transporters

create table if not exists transporter_subscription (
  id uuid primary key default gen_random_uuid(),
  transporter_id uuid not null references transporter(id) on delete cascade,
  plan_id uuid not null references subscription_plan(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'canceled', 'expired')),
  stripe_subscription_id text unique,
  stripe_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes
create index if not exists idx_subscription_plan_name on subscription_plan(name);
create index if not exists idx_transporter_subscription_transporter_id on transporter_subscription(transporter_id);
create index if not exists idx_transporter_subscription_plan_id on transporter_subscription(plan_id);
create index if not exists idx_transporter_subscription_status on transporter_subscription(status);
create index if not exists idx_transporter_subscription_stripe_subscription_id on transporter_subscription(stripe_subscription_id) where stripe_subscription_id is not null;

-- Create unique partial index to ensure only one active subscription per transporter
create unique index if not exists idx_transporter_subscription_unique_active 
  on transporter_subscription(transporter_id) 
  where status = 'active';

-- Function to update updated_at timestamp
create or replace function update_subscription_plan_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function update_transporter_subscription_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers
drop trigger if exists subscription_plan_updated_at on subscription_plan;
create trigger subscription_plan_updated_at
before update on subscription_plan
for each row execute function update_subscription_plan_updated_at();

drop trigger if exists transporter_subscription_updated_at on transporter_subscription;
create trigger transporter_subscription_updated_at
before update on transporter_subscription
for each row execute function update_transporter_subscription_updated_at();

-- Enable RLS
alter table subscription_plan enable row level security;
alter table transporter_subscription enable row level security;

-- RLS Policies for subscription_plan (public read)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'subscription_plan' 
    and policyname = 'subscription_plan_read_public'
  ) then
    create policy subscription_plan_read_public on subscription_plan
      for select to authenticated
      using (true);
  end if;
end $$;

-- RLS Policies for transporter_subscription
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'transporter_subscription' 
    and policyname = 'transporter_subscription_select_own'
  ) then
    create policy transporter_subscription_select_own on transporter_subscription
      for select to authenticated
      using (
        transporter_id in (
          select id from transporter where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Seed subscription plans
insert into subscription_plan (name, display_name, price_monthly_cents, price_yearly_cents, features, max_vehicles, max_staff, max_expenses_per_month, has_advanced_analytics, has_api_access, has_white_label, has_priority_support)
values
  (
    'free',
    'Free',
    0,
    0,
    '["Up to 3 vehicles", "Basic ratings & stats", "Basic expense tracking", "Email support"]'::jsonb,
    3,
    10,
    100,
    false,
    false,
    false,
    false
  ),
  (
    'pro',
    'Pro',
    2900,
    29000,
    '["Up to 20 vehicles", "Advanced analytics & reports", "Full expense tracking with reports", "Service provider management", "Priority email support"]'::jsonb,
    20,
    100,
    1000,
    true,
    false,
    false,
    true
  ),
  (
    'enterprise',
    'Enterprise',
    9900,
    99000,
    '["Unlimited vehicles", "All Pro features", "API access", "White-label options", "Custom integrations", "Dedicated support"]'::jsonb,
    null,
    null,
    null,
    true,
    true,
    true,
    true
  )
on conflict (name) do nothing;

-- Comments
comment on table subscription_plan is 'Available subscription plans with features and pricing';
comment on table transporter_subscription is 'Active subscriptions for transporters';
comment on column transporter_subscription.stripe_subscription_id is 'Stripe subscription ID for payment processing';
comment on column transporter_subscription.stripe_customer_id is 'Stripe customer ID';
comment on column subscription_plan.max_vehicles is 'Maximum number of vehicles allowed (null = unlimited)';
comment on column subscription_plan.max_staff is 'Maximum number of staff members allowed (null = unlimited)';
comment on column subscription_plan.max_expenses_per_month is 'Maximum expenses per month (null = unlimited)';

