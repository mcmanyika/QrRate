-- Run this SQL in your Supabase Dashboard → SQL Editor
-- This adds the tag_ratings column to store individual tag ratings (1-5 stars per tag)

ALTER TABLE rating ADD COLUMN IF NOT EXISTS tag_ratings jsonb;

COMMENT ON COLUMN rating.tag_ratings IS 'JSON object mapping tag names to star ratings (1-5). Example: {"Cleanliness": 4, "Driving safety": 5, "Friendliness": 3, "Punctuality": 2}';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rating' AND column_name = 'tag_ratings';

