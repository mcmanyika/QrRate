-- Add tag_ratings JSONB column to store individual tag ratings
-- e.g., {"Cleanliness": 4, "Driving safety": 5, "Friendliness": 3, "Punctuality": 2}
alter table rating add column if not exists tag_ratings jsonb;

-- Add comment explaining the structure
comment on column rating.tag_ratings is 'JSON object mapping tag names to star ratings (1-5). Example: {"Cleanliness": 4, "Driving safety": 5}';

