-- Create user profiles table with pro status
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_pro BOOLEAN DEFAULT FALSE,
  pro_expires_at TIMESTAMP WITH TIME ZONE,
  ai_chats_used_this_month INTEGER DEFAULT 0,
  ai_chats_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_pro ON user_profiles(is_pro);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to reset monthly AI usage
CREATE OR REPLACE FUNCTION reset_monthly_ai_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET
    ai_chats_used_this_month = 0,
    ai_chats_reset_date = NOW()
  WHERE ai_chats_reset_date < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to increment AI usage
CREATE OR REPLACE FUNCTION increment_ai_usage(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  new_usage INTEGER;
BEGIN
  -- Reset if needed
  UPDATE user_profiles
  SET
    ai_chats_used_this_month = 0,
    ai_chats_reset_date = NOW()
  WHERE id = user_uuid AND ai_chats_reset_date < NOW() - INTERVAL '30 days';

  -- Increment usage
  UPDATE user_profiles
  SET ai_chats_used_this_month = ai_chats_used_this_month + 1
  WHERE id = user_uuid
  RETURNING ai_chats_used_this_month INTO new_usage;

  RETURN new_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's AI limit
CREATE OR REPLACE FUNCTION get_ai_limit(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  is_pro_user BOOLEAN;
BEGIN
  SELECT is_pro INTO is_pro_user
  FROM user_profiles
  WHERE id = user_uuid;

  IF is_pro_user THEN
    RETURN 250;
  ELSE
    RETURN 3;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update updated_at on user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Set reidwcoleman@gmail.com as pro user
-- This will be executed after the user signs up
-- For now, we'll create a function to upgrade users to pro
CREATE OR REPLACE FUNCTION make_user_pro(user_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET
    is_pro = TRUE,
    pro_expires_at = NOW() + INTERVAL '1 year'
  WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Call the function to make reidwcoleman@gmail.com pro (if user exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM user_profiles WHERE email = 'reidwcoleman@gmail.com') THEN
    PERFORM make_user_pro('reidwcoleman@gmail.com');
  END IF;
END $$;
