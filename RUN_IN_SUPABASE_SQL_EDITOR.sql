-- ========================================
-- Run this in your Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/sql
-- ========================================

-- 1. Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  due_date DATE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  ai_captured BOOLEAN DEFAULT FALSE,
  time_estimate TEXT,
  description TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'scanner', 'canvas')),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments"
  ON assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assignments"
  ON assignments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assignments"
  ON assignments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assignments"
  ON assignments FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignments_updated_at();

-- 2. Create calendar_activities table
CREATE TABLE IF NOT EXISTS calendar_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,
  activity_type TEXT DEFAULT 'task',
  subject TEXT,
  location TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_all_day BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_activities_user_id ON calendar_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_activities_date ON calendar_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_calendar_activities_user_date ON calendar_activities(user_id, activity_date);

ALTER TABLE calendar_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activities"
  ON calendar_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities"
  ON calendar_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities"
  ON calendar_activities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities"
  ON calendar_activities FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_calendar_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_activities_updated_at
  BEFORE UPDATE ON calendar_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_activities_updated_at();

-- 3. Create ai_chats table for storing AI conversation history
CREATE TABLE IF NOT EXISTS ai_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_chats_user_id_idx ON ai_chats(user_id);
CREATE INDEX IF NOT EXISTS ai_chats_created_at_idx ON ai_chats(created_at DESC);

ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chats"
  ON ai_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chats"
  ON ai_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
  ON ai_chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
  ON ai_chats FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_ai_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_chats_updated_at
  BEFORE UPDATE ON ai_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chats_updated_at();

-- 4. Add streak tracking to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_date DATE;

CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login
ON user_profiles(last_login_date);

-- 5. Create blocking_sessions table for Focus Mode app blocking
CREATE TABLE IF NOT EXISTS blocking_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_apps JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blocking_sessions_user_id_idx ON blocking_sessions(user_id);
CREATE INDEX IF NOT EXISTS blocking_sessions_is_active_idx ON blocking_sessions(is_active);
CREATE INDEX IF NOT EXISTS blocking_sessions_end_time_idx ON blocking_sessions(end_time);

ALTER TABLE blocking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON blocking_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON blocking_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON blocking_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON blocking_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_blocking_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blocking_sessions_updated_at
  BEFORE UPDATE ON blocking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_blocking_sessions_updated_at();

-- 6. Create study_sessions table for analytics
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  duration_minutes INTEGER NOT NULL,
  focus_score INTEGER CHECK (focus_score >= 0 AND focus_score <= 100),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_start TIMESTAMP WITH TIME ZONE,
  session_end TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON study_sessions(user_id, session_date);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own study sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study sessions"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Done! All tables and features should now be created.

-- Streak History Table
CREATE TABLE IF NOT EXISTS streak_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_streak_history_user_id ON streak_history(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_history_login_date ON streak_history(login_date);
CREATE INDEX IF NOT EXISTS idx_streak_history_user_date ON streak_history(user_id, login_date);

-- Add unique constraint to prevent duplicate entries for same user/date
CREATE UNIQUE INDEX IF NOT EXISTS idx_streak_history_user_date_unique
ON streak_history(user_id, login_date);

ALTER TABLE streak_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streak history"
  ON streak_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak history"
  ON streak_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streak history"
  ON streak_history FOR DELETE
  USING (auth.uid() = user_id);
