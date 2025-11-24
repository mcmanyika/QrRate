-- Create expense table
-- Expenses are linked to vehicles and can be categorized

create table if not exists expense (
  id uuid primary key default gen_random_uuid(),
  transporter_id uuid not null references transporter(id) on delete cascade,
  vehicle_id uuid not null references vehicle(id) on delete cascade,
  category text not null check (category in ('fuel', 'maintenance', 'insurance', 'staff_payment', 'service_provider_payment', 'other')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'usd',
  date date not null,
  description text,
  vendor text,
  payment_method text check (payment_method in ('cash', 'card', 'bank_transfer', 'mobile_money', 'other')),
  receipt_url text,
  is_recurring boolean not null default false,
  recurring_frequency text check (recurring_frequency in ('monthly', 'quarterly', 'yearly')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  service_provider_id uuid references service_provider(id) on delete set null,
  staff_id uuid references staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create expense_approval table for approval workflow audit trail
create table if not exists expense_approval (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expense(id) on delete cascade,
  approver_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  comments text,
  created_at timestamptz not null default now()
);

-- Create indexes for faster lookups
create index if not exists idx_expense_transporter_id on expense(transporter_id);
create index if not exists idx_expense_vehicle_id on expense(vehicle_id);
create index if not exists idx_expense_category on expense(category);
create index if not exists idx_expense_date on expense(date);
create index if not exists idx_expense_status on expense(status);
create index if not exists idx_expense_service_provider_id on expense(service_provider_id) where service_provider_id is not null;
create index if not exists idx_expense_staff_id on expense(staff_id) where staff_id is not null;
create index if not exists idx_expense_approval_expense_id on expense_approval(expense_id);
create index if not exists idx_expense_approval_approver_user_id on expense_approval(approver_user_id);

-- Enable RLS
alter table expense enable row level security;
alter table expense_approval enable row level security;

-- RLS Policies for expense
create policy expense_select_own on expense
  for select to authenticated
  using (
    transporter_id in (
      select id from transporter where user_id = auth.uid()
    )
  );

create policy expense_insert_own on expense
  for insert to authenticated
  with check (
    transporter_id in (
      select id from transporter where user_id = auth.uid()
    )
  );

create policy expense_update_own on expense
  for update to authenticated
  using (
    transporter_id in (
      select id from transporter where user_id = auth.uid()
    )
  )
  with check (
    transporter_id in (
      select id from transporter where user_id = auth.uid()
    )
  );

create policy expense_delete_own on expense
  for delete to authenticated
  using (
    transporter_id in (
      select id from transporter where user_id = auth.uid()
    )
  );

-- RLS Policies for expense_approval
create policy expense_approval_select_own on expense_approval
  for select to authenticated
  using (
    expense_id in (
      select id from expense where transporter_id in (
        select id from transporter where user_id = auth.uid()
      )
    )
  );

create policy expense_approval_insert_own on expense_approval
  for insert to authenticated
  with check (
    expense_id in (
      select id from expense where transporter_id in (
        select id from transporter where user_id = auth.uid()
      )
    )
  );

