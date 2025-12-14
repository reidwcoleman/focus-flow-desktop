-- Create streak_history table to track daily logins
CREATE TABLE IF NOT EXISTS streak_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_streak_history_user_id ON streak_history(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_history_login_date ON streak_history(login_date);
CREATE INDEX IF NOT EXISTS idx_streak_history_user_date ON streak_history(user_id, login_date);

-- Add unique constraint to prevent duplicate entries for same user/date
CREATE UNIQUE INDEX IF NOT EXISTS idx_streak_history_user_date_unique
ON streak_history(user_id, login_date);

-- Enable Row Level Security
ALTER TABLE streak_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own streak history"
  ON streak_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak history"
  ON streak_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streak history"
  ON streak_history FOR DELETE
  USING (auth.uid() = user_id);
