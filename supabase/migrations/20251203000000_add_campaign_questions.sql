-- ============================================================================
-- CAMPAIGN QUESTIONS AND ANSWERS
-- Allow campaigns to have custom questions/rating criteria
-- ============================================================================

-- Add campaign_type to event table
alter table event 
  add column if not exists campaign_type text 
  check (campaign_type in ('product', 'business', 'event', 'service', 'other'));

-- Create campaign_question table
create table if not exists campaign_question (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references event(id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('rating', 'text', 'multiple_choice', 'yes_no')),
  is_required boolean default false,
  order_index integer not null default 0,
  options jsonb, -- For multiple_choice: ["Option 1", "Option 2"]
  min_rating integer default 1,
  max_rating integer default 5,
  created_at timestamptz not null default now(),
  unique(campaign_id, order_index)
);

create index if not exists idx_campaign_question_campaign_id on campaign_question(campaign_id);

-- Create campaign_review_answer table
create table if not exists campaign_review_answer (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references review(id) on delete cascade,
  question_id uuid not null references campaign_question(id) on delete cascade,
  answer_text text,
  answer_rating integer,
  answer_boolean boolean,
  created_at timestamptz not null default now(),
  unique(review_id, question_id)
);

create index if not exists idx_campaign_review_answer_review_id on campaign_review_answer(review_id);
create index if not exists idx_campaign_review_answer_question_id on campaign_review_answer(question_id);

-- Enable RLS
alter table campaign_question enable row level security;
alter table campaign_review_answer enable row level security;

-- RLS Policies for campaign_question
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'campaign_question' and policyname = 'campaign_question_select_public') then
    create policy campaign_question_select_public on campaign_question
      for select using (
        campaign_id in (select id from event where is_active = true)
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'campaign_question' and policyname = 'campaign_question_all_own') then
    create policy campaign_question_all_own on campaign_question
      for all to authenticated
      using (
        campaign_id in (select id from event where organizer_id = auth.uid())
      )
      with check (
        campaign_id in (select id from event where organizer_id = auth.uid())
      );
  end if;
end $$;

-- RLS Policies for campaign_review_answer
-- Public can insert (for anonymous reviews)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'campaign_review_answer' and policyname = 'campaign_review_answer_insert_public') then
    create policy campaign_review_answer_insert_public on campaign_review_answer
      for insert to anon, authenticated
      with check (true);
  end if;
end $$;

-- Public can read answers for public reviews
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'campaign_review_answer' and policyname = 'campaign_review_answer_select_public') then
    create policy campaign_review_answer_select_public on campaign_review_answer
      for select using (
        review_id in (select id from review where is_public = true)
      );
  end if;
end $$;

-- Campaign organizers can read all answers for their campaigns
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'campaign_review_answer' and policyname = 'campaign_review_answer_select_organizer') then
    create policy campaign_review_answer_select_organizer on campaign_review_answer
      for select to authenticated
      using (
        question_id in (
          select id from campaign_question 
          where campaign_id in (
            select id from event where organizer_id = auth.uid()
          )
        )
      );
  end if;
end $$;

