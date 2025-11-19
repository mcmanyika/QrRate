-- Add tipping functionality
-- Create tip table for storing tip transactions

create table if not exists tip (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid references rating(id) on delete set null,
  vehicle_id uuid not null references vehicle(id) on delete cascade,
  route_id uuid references route(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  stripe_payment_intent_id text unique,
  stripe_status text check (stripe_status in ('pending', 'succeeded', 'failed', 'canceled')),
  platform_fee_cents integer not null default 0,
  operator_amount_cents integer not null default 0,
  device_hash text not null,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_tip_vehicle_created on tip(vehicle_id, created_at);
create index if not exists idx_tip_stripe_status on tip(stripe_status) where stripe_status = 'succeeded';
create index if not exists idx_tip_rating_id on tip(rating_id) where rating_id is not null;
create index if not exists idx_tip_stripe_payment_intent on tip(stripe_payment_intent_id) where stripe_payment_intent_id is not null;

-- Row Level Security
alter table tip enable row level security;

-- Allow anonymous users to insert tips
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tip' and policyname = 'tip_insert_anon') then
    create policy tip_insert_anon on tip
      for insert to anon with check (true);
  end if;
end $$;

-- Allow anonymous users to read tips (for stats/verification)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tip' and policyname = 'tip_read_anon') then
    create policy tip_read_anon on tip
      for select to anon using (true);
  end if;
end $$;

-- Admin can manage all tips
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tip' and policyname = 'tip_admin_all') then
    create policy tip_admin_all on tip
      for all to authenticated using (exists(select 1 from admin_user au where au.email = auth.jwt()->>'email')) 
      with check (exists(select 1 from admin_user au2 where au2.email = auth.jwt()->>'email'));
  end if;
end $$;

-- Analytics view for vehicle tip summary
create or replace view vehicle_tip_summary as
select
  v.id as vehicle_id,
  v.reg_number,
  rte.name as route_name,
  count(t.id) filter (where t.stripe_status = 'succeeded') as total_tips,
  sum(t.amount_cents) filter (where t.stripe_status = 'succeeded') as total_amount_cents,
  sum(t.platform_fee_cents) filter (where t.stripe_status = 'succeeded') as total_platform_fee_cents,
  sum(t.operator_amount_cents) filter (where t.stripe_status = 'succeeded') as total_operator_amount_cents,
  avg(t.amount_cents) filter (where t.stripe_status = 'succeeded') as avg_tip_cents,
  max(t.created_at) filter (where t.stripe_status = 'succeeded') as last_tip_at
from vehicle v
left join route rte on rte.id = v.route_id
left join tip t on t.vehicle_id = v.id
group by v.id, v.reg_number, rte.name;

-- Comments
comment on table tip is 'Stores tip transactions processed through Stripe';
comment on column tip.amount_cents is 'Tip amount in cents (e.g., 500 = $5.00)';
comment on column tip.platform_fee_cents is 'Platform fee deducted from tip amount';
comment on column tip.operator_amount_cents is 'Amount that goes to operator/driver after platform fee';
comment on column tip.stripe_payment_intent_id is 'Stripe PaymentIntent ID for tracking payment';
comment on column tip.stripe_status is 'Current status of the payment from Stripe';

