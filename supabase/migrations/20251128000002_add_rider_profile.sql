-- Create rider profile table for storing user preferences and information
-- Supports both logged-in users (via user_id) and anonymous users (via device_hash)

CREATE TABLE IF NOT EXISTS rider_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_hash text,
  country_code text REFERENCES country(code),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  -- Either user_id or device_hash must be provided
  CONSTRAINT rider_profile_user_or_device CHECK (
    (user_id IS NOT NULL) OR (device_hash IS NOT NULL)
  )
);

-- Create unique indexes: one profile per user_id or device_hash
CREATE UNIQUE INDEX IF NOT EXISTS rider_profile_unique_user 
  ON rider_profile(user_id) WHERE user_id IS NOT NULL;
  
CREATE UNIQUE INDEX IF NOT EXISTS rider_profile_unique_device 
  ON rider_profile(device_hash) WHERE device_hash IS NOT NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_rider_profile_user_id ON rider_profile(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rider_profile_device_hash ON rider_profile(device_hash) WHERE device_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rider_profile_country_code ON rider_profile(country_code) WHERE country_code IS NOT NULL;

-- Enable RLS
ALTER TABLE rider_profile ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read their own profile (by user_id)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rider_profile' 
    AND policyname = 'rider_profile_select_own'
  ) THEN
    CREATE POLICY rider_profile_select_own ON rider_profile
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Authenticated users can update their own profile (by user_id)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rider_profile' 
    AND policyname = 'rider_profile_update_own'
  ) THEN
    CREATE POLICY rider_profile_update_own ON rider_profile
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Authenticated users can insert their own profile
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rider_profile' 
    AND policyname = 'rider_profile_insert_own'
  ) THEN
    CREATE POLICY rider_profile_insert_own ON rider_profile
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Anonymous users can read profiles (needed for device_hash lookups)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rider_profile' 
    AND policyname = 'rider_profile_anon_read'
  ) THEN
    CREATE POLICY rider_profile_anon_read ON rider_profile
      FOR SELECT TO anon
      USING (true);
  END IF;
END $$;

-- Policy: Anonymous users can insert profiles (will validate device_hash client-side)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rider_profile' 
    AND policyname = 'rider_profile_anon_insert'
  ) THEN
    CREATE POLICY rider_profile_anon_insert ON rider_profile
      FOR INSERT TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Policy: Anonymous users can update profiles (will validate device_hash client-side)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rider_profile' 
    AND policyname = 'rider_profile_anon_update'
  ) THEN
    CREATE POLICY rider_profile_anon_update ON rider_profile
      FOR UPDATE TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rider_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rider_profile_updated_at ON rider_profile;
CREATE TRIGGER rider_profile_updated_at
  BEFORE UPDATE ON rider_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_rider_profile_updated_at();

-- Add comment
COMMENT ON TABLE rider_profile IS 'Stores rider/user profile information including country preference. Supports both authenticated users (via user_id) and anonymous users (via device_hash)';

