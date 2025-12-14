-- Add mode-specific usage tracking columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ai_deep_research_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_ultrathink_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_standard_used INTEGER DEFAULT 0;

-- Create RPC function to increment Deep Research usage
CREATE OR REPLACE FUNCTION increment_ai_deep_research(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE profiles
  SET ai_deep_research_used = ai_deep_research_used + 1,
      updated_at = NOW()
  WHERE id = user_uuid;
  
  SELECT ai_deep_research_used INTO new_count
  FROM profiles
  WHERE id = user_uuid;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to increment UltraThink usage
CREATE OR REPLACE FUNCTION increment_ai_ultrathink(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE profiles
  SET ai_ultrathink_used = ai_ultrathink_used + 1,
      updated_at = NOW()
  WHERE id = user_uuid;
  
  SELECT ai_ultrathink_used INTO new_count
  FROM profiles
  WHERE id = user_uuid;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to increment Standard usage
CREATE OR REPLACE FUNCTION increment_ai_standard(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE profiles
  SET ai_standard_used = ai_standard_used + 1,
      updated_at = NOW()
  WHERE id = user_uuid;
  
  SELECT ai_standard_used INTO new_count
  FROM profiles
  WHERE id = user_uuid;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the columns
COMMENT ON COLUMN profiles.ai_deep_research_used IS 'Number of Deep Research AI queries used this month (Pro: 20/month)';
COMMENT ON COLUMN profiles.ai_ultrathink_used IS 'Number of UltraThink AI queries used this month (Pro: 50/month)';
COMMENT ON COLUMN profiles.ai_standard_used IS 'Number of Standard AI queries used this month (Pro: Unlimited)';
