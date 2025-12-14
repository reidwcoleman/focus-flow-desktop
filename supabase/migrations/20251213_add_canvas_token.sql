-- Add canvas_token to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS canvas_token TEXT;

-- Create index for better query performance on canvas_token
CREATE INDEX IF NOT EXISTS idx_user_profiles_canvas_token ON user_profiles(canvas_token) WHERE canvas_token IS NOT NULL;
