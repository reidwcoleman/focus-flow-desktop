-- ========================================
-- COMPLETE DATABASE MIGRATION V3 - WITH STREAK HISTORY
-- ========================================
-- Run this to create ALL tables including streak tracking
-- Dashboard: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/sql
-- ========================================

-- ========================================
-- DROP AND RECREATE IN CORRECT ORDER
-- ========================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS streak_history CASCADE;
DROP TABLE IF EXISTS scheduled_blocks CASCADE;
DROP TABLE IF EXISTS blocking_sessions CASCADE;
DROP TABLE IF EXISTS blocking_lists CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS calendar_activities CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;

-- ========================================
-- 1. ASSIGNMENTS TABLE (Homework Scanner)
-- ========================================

CREATE TABLE assignments (
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

CREATE INDEX idx_assignments_user_id ON assignments(user_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments"
  ON assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assignments"
  ON assignments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assignments"
  ON assignments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assignments"
  ON assignments FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 2. CALENDAR_ACTIVITIES TABLE (AI Planner)
-- ========================================

CREATE TABLE calendar_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,
  subject TEXT,
  activity_type TEXT DEFAULT 'task',
  location TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_all_day BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_activities_user_id ON calendar_activities(user_id);
CREATE INDEX idx_calendar_activities_date ON calendar_activities(activity_date);
CREATE INDEX idx_calendar_activities_user_date ON calendar_activities(user_id, activity_date);

ALTER TABLE calendar_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities"
  ON calendar_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities"
  ON calendar_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON calendar_activities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities"
  ON calendar_activities FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 3. STUDY_SESSIONS TABLE (Analytics)
-- ========================================

CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  duration_minutes INTEGER NOT NULL,
  focus_score INTEGER CHECK (focus_score >= 0 AND focus_score <= 100),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_date ON study_sessions(session_date);
CREATE INDEX idx_study_sessions_user_date ON study_sessions(user_id, session_date);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study sessions"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 4. BLOCKING_LISTS TABLE (Create FIRST!)
-- ========================================

CREATE TABLE blocking_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  app_ids TEXT[] NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT '🎯',
  is_default BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_blocking_lists_user_id ON blocking_lists(user_id);
CREATE INDEX idx_blocking_lists_default ON blocking_lists(user_id, is_default);

ALTER TABLE blocking_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocking lists"
  ON blocking_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blocking lists"
  ON blocking_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blocking lists"
  ON blocking_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own blocking lists"
  ON blocking_lists FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 5. BLOCKING_SESSIONS TABLE (References blocking_lists)
-- ========================================

CREATE TABLE blocking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocking_list_id UUID REFERENCES blocking_lists(id) ON DELETE SET NULL,
  blocked_apps TEXT[] NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  session_type TEXT DEFAULT 'manual' CHECK (session_type IN ('manual', 'scheduled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_blocking_sessions_user_id ON blocking_sessions(user_id);
CREATE INDEX idx_blocking_sessions_active ON blocking_sessions(user_id, is_active);
CREATE INDEX idx_blocking_sessions_end_time ON blocking_sessions(end_time);
CREATE INDEX idx_blocking_sessions_list ON blocking_sessions(blocking_list_id);

ALTER TABLE blocking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocking sessions"
  ON blocking_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blocking sessions"
  ON blocking_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blocking sessions"
  ON blocking_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own blocking sessions"
  ON blocking_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 6. SCHEDULED_BLOCKS TABLE (References blocking_lists)
-- ========================================

CREATE TABLE scheduled_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocking_list_id UUID REFERENCES blocking_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'daily', 'weekly')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[],
  start_date DATE,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scheduled_blocks_user_id ON scheduled_blocks(user_id);
CREATE INDEX idx_scheduled_blocks_enabled ON scheduled_blocks(user_id, is_enabled);
CREATE INDEX idx_scheduled_blocks_list ON scheduled_blocks(blocking_list_id);

ALTER TABLE scheduled_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled blocks"
  ON scheduled_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled blocks"
  ON scheduled_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled blocks"
  ON scheduled_blocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled blocks"
  ON scheduled_blocks FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 7. STREAK_HISTORY TABLE (Daily Login Tracking)
-- ========================================

CREATE TABLE streak_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_streak_history_user_id ON streak_history(user_id);
CREATE INDEX idx_streak_history_login_date ON streak_history(login_date);
CREATE INDEX idx_streak_history_user_date ON streak_history(user_id, login_date);

-- Add unique constraint to prevent duplicate entries for same user/date
CREATE UNIQUE INDEX idx_streak_history_user_date_unique
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

-- ========================================
-- 8. TRIGGERS FOR AUTO-UPDATING updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_activities_updated_at
  BEFORE UPDATE ON calendar_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_sessions_updated_at
  BEFORE UPDATE ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocking_lists_updated_at
  BEFORE UPDATE ON blocking_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocking_sessions_updated_at
  BEFORE UPDATE ON blocking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_blocks_updated_at
  BEFORE UPDATE ON scheduled_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 9. VERIFICATION
-- ========================================

SELECT 'SUCCESS! All tables created including streak tracking!' as status;

SELECT table_name,
       (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('assignments', 'calendar_activities', 'study_sessions', 'blocking_lists', 'blocking_sessions', 'scheduled_blocks', 'streak_history')
ORDER BY table_name;

-- ========================================
-- DONE!
-- ========================================
-- All tables created in dependency order:
-- 1. assignments (homework scanner)
-- 2. calendar_activities (AI planner)
-- 3. study_sessions (analytics)
-- 4. blocking_lists (no dependencies)
-- 5. blocking_sessions (references blocking_lists)
-- 6. scheduled_blocks (references blocking_lists)
-- 7. streak_history (daily login tracking for calendar)
-- Now your streak calendar will show real data!
-- ========================================
