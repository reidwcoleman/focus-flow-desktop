-- ========================================
-- XP & Gamification System
-- ========================================

-- Add XP columns to existing user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_level ON user_profiles(current_level);
CREATE INDEX IF NOT EXISTS idx_user_profiles_xp ON user_profiles(total_xp);

-- ========================================
-- XP Transactions Table (History)
-- ========================================
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'assignment_complete',
    'focus_session',
    'streak_bonus',
    'flashcard_study',
    'level_up_bonus',
    'daily_login',
    'achievement_unlocked'
  )),
  action_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for XP transactions
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_action_type ON xp_transactions(action_type);

-- Enable RLS
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for XP transactions
CREATE POLICY "Users can view their own XP transactions"
  ON xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP transactions"
  ON xp_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- User Badges Table
-- ========================================
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Indexes for badges
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);

-- Enable RLS
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badges
CREATE POLICY "Users can view their own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
  ON user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- Helper Function: Increment User XP
-- ========================================
CREATE OR REPLACE FUNCTION increment_user_xp(user_uuid UUID, xp_to_add INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_total INTEGER;
BEGIN
  UPDATE user_profiles
  SET total_xp = total_xp + xp_to_add,
      updated_at = NOW()
  WHERE id = user_uuid
  RETURNING total_xp INTO new_total;

  RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
