-- ========================================
-- FIX PROFILES TABLE - RUN IN SUPABASE SQL EDITOR
-- ========================================
-- This script adds missing full_name and avatar_url columns
-- to the user_profiles table and updates existing data

-- Step 1: Add full_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN full_name TEXT;
    RAISE NOTICE 'Added full_name column to user_profiles';
  ELSE
    RAISE NOTICE 'full_name column already exists';
  END IF;
END $$;

-- Step 2: Add avatar_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
    RAISE NOTICE 'Added avatar_url column to user_profiles';
  ELSE
    RAISE NOTICE 'avatar_url column already exists';
  END IF;
END $$;

-- Step 3: Update the handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Add INSERT policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles'
    AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON user_profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
    RAISE NOTICE 'Added INSERT policy for user_profiles';
  ELSE
    RAISE NOTICE 'INSERT policy already exists';
  END IF;
END $$;

-- Step 5: Try to populate full_name from auth.users metadata for existing users
DO $$
DECLARE
  user_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  FOR user_record IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    INNER JOIN user_profiles p ON u.id = p.id
    WHERE p.full_name IS NULL
  LOOP
    UPDATE user_profiles
    SET full_name = COALESCE(
      user_record.raw_user_meta_data->>'full_name',
      user_record.raw_user_meta_data->>'name'
    )
    WHERE id = user_record.id
    AND full_name IS NULL;

    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Updated % user profiles with full_name from metadata', updated_count;
END $$;

-- Step 6: Create profiles for any users that don't have one
INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 7: Verify the changes
SELECT
  COUNT(*) as total_profiles,
  COUNT(full_name) as profiles_with_name,
  COUNT(avatar_url) as profiles_with_avatar
FROM user_profiles;
