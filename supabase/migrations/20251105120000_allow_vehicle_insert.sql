-- Allow anonymous users to create vehicles when entering registration numbers
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'vehicle' and policyname = 'vehicle_insert_anon') then
    create policy vehicle_insert_anon on vehicle for insert to anon with check (true);
  end if;
end $$;

