-- Allow anonymous users to read ratings for stats view
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rating' and policyname = 'rating_read_anon') then
    create policy rating_read_anon on rating
      for select to anon using (true);
  end if;
end $$;

