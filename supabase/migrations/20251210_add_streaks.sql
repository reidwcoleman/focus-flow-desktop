-- Add streak tracking to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_date DATE;

-- Create index for efficient streak queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login
ON user_profiles(last_login_date);
