-- Add fields to track which AI mode explanations have been shown to users
-- This ensures users only see each mode explanation popup once

-- Add mode explanation tracking columns
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS mode_explained_regular BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS mode_explained_ultrathink BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS mode_explained_deepresearch BOOLEAN DEFAULT FALSE;

-- Create function to mark mode as explained
CREATE OR REPLACE FUNCTION mark_mode_explained(user_uuid UUID, mode_name TEXT)
RETURNS void AS $$
BEGIN
  CASE mode_name
    WHEN 'regular' THEN
      UPDATE user_profiles SET mode_explained_regular = TRUE WHERE id = user_uuid;
    WHEN 'ultrathink' THEN
      UPDATE user_profiles SET mode_explained_ultrathink = TRUE WHERE id = user_uuid;
    WHEN 'deepresearch' THEN
      UPDATE user_profiles SET mode_explained_deepresearch = TRUE WHERE id = user_uuid;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if mode has been explained
CREATE OR REPLACE FUNCTION has_seen_mode_explanation(user_uuid UUID, mode_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_seen BOOLEAN := FALSE;
BEGIN
  CASE mode_name
    WHEN 'regular' THEN
      SELECT mode_explained_regular INTO has_seen FROM user_profiles WHERE id = user_uuid;
    WHEN 'ultrathink' THEN
      SELECT mode_explained_ultrathink INTO has_seen FROM user_profiles WHERE id = user_uuid;
    WHEN 'deepresearch' THEN
      SELECT mode_explained_deepresearch INTO has_seen FROM user_profiles WHERE id = user_uuid;
  END CASE;

  RETURN COALESCE(has_seen, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
