-- Add missing fields to user_profiles table
-- This migration adds full_name and avatar_url columns if they don't exist

-- Add full_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN full_name TEXT;
  END IF;
END $$;

-- Add avatar_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Update the handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Try to populate full_name from auth.users metadata for existing users
DO $$
DECLARE
  user_record RECORD;
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
    WHERE id = user_record.id;
  END LOOP;
END $$;
