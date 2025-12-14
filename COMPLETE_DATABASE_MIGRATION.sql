-- ========================================
-- COMPLETE DATABASE MIGRATION - FIX ALL 404/400 ERRORS
-- ========================================
-- Run this ONE TIME in Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/sql
-- ========================================

-- ========================================
-- 1. ASSIGNMENTS TABLE (Homework Scanner)
-- ========================================

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

DROP POLICY IF EXISTS "Users can view own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can insert own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can update own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can delete own assignments" ON assignments;

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

CREATE TABLE IF NOT EXISTS calendar_activities (
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

CREATE INDEX IF NOT EXISTS idx_calendar_activities_user_id ON calendar_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_activities_date ON calendar_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_calendar_activities_user_date ON calendar_activities(user_id, activity_date);

ALTER TABLE calendar_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activities" ON calendar_activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON calendar_activities;
DROP POLICY IF EXISTS "Users can update own activities" ON calendar_activities;
DROP POLICY IF EXISTS "Users can delete own activities" ON calendar_activities;

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

CREATE TABLE IF NOT EXISTS study_sessions (
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

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON study_sessions(user_id, session_date);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can insert own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can update own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can delete own study sessions" ON study_sessions;

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
-- 4. BLOCKING_SESSIONS TABLE (Focus Mode)
-- ========================================

CREATE TABLE IF NOT EXISTS blocking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocking_list_id UUID,
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

CREATE INDEX IF NOT EXISTS idx_blocking_sessions_user_id ON blocking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_blocking_sessions_active ON blocking_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_blocking_sessions_end_time ON blocking_sessions(end_time);
CREATE INDEX IF NOT EXISTS idx_blocking_sessions_list ON blocking_sessions(blocking_list_id);

ALTER TABLE blocking_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blocking sessions" ON blocking_sessions;
DROP POLICY IF EXISTS "Users can insert own blocking sessions" ON blocking_sessions;
DROP POLICY IF EXISTS "Users can update own blocking sessions" ON blocking_sessions;
DROP POLICY IF EXISTS "Users can delete own blocking sessions" ON blocking_sessions;

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
-- 5. BLOCKING_LISTS TABLE (Focus Mode Presets)
-- ========================================

CREATE TABLE IF NOT EXISTS blocking_lists (
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

CREATE INDEX IF NOT EXISTS idx_blocking_lists_user_id ON blocking_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_blocking_lists_default ON blocking_lists(user_id, is_default);

ALTER TABLE blocking_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blocking lists" ON blocking_lists;
DROP POLICY IF EXISTS "Users can insert own blocking lists" ON blocking_lists;
DROP POLICY IF EXISTS "Users can update own blocking lists" ON blocking_lists;
DROP POLICY IF EXISTS "Users can delete own blocking lists" ON blocking_lists;

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

-- Add foreign key constraint for blocking_sessions -> blocking_lists
ALTER TABLE blocking_sessions
  DROP CONSTRAINT IF EXISTS blocking_sessions_blocking_list_id_fkey;

ALTER TABLE blocking_sessions
  ADD CONSTRAINT blocking_sessions_blocking_list_id_fkey
  FOREIGN KEY (blocking_list_id) REFERENCES blocking_lists(id) ON DELETE SET NULL;

-- ========================================
-- 6. SCHEDULED_BLOCKS TABLE (Focus Mode Scheduling)
-- ========================================

CREATE TABLE IF NOT EXISTS scheduled_blocks (
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

CREATE INDEX IF NOT EXISTS idx_scheduled_blocks_user_id ON scheduled_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_blocks_enabled ON scheduled_blocks(user_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_scheduled_blocks_list ON scheduled_blocks(blocking_list_id);

ALTER TABLE scheduled_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own scheduled blocks" ON scheduled_blocks;
DROP POLICY IF EXISTS "Users can insert own scheduled blocks" ON scheduled_blocks;
DROP POLICY IF EXISTS "Users can update own scheduled blocks" ON scheduled_blocks;
DROP POLICY IF EXISTS "Users can delete own scheduled blocks" ON scheduled_blocks;

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
-- 7. TRIGGERS FOR AUTO-UPDATING updated_at
-- ========================================

-- Assignments trigger
CREATE OR REPLACE FUNCTION update_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assignments_updated_at ON assignments;
CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignments_updated_at();

-- Calendar activities trigger
CREATE OR REPLACE FUNCTION update_calendar_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calendar_activities_updated_at ON calendar_activities;
CREATE TRIGGER calendar_activities_updated_at
  BEFORE UPDATE ON calendar_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_activities_updated_at();

-- Study sessions trigger
CREATE OR REPLACE FUNCTION update_study_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS study_sessions_updated_at ON study_sessions;
CREATE TRIGGER study_sessions_updated_at
  BEFORE UPDATE ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_study_sessions_updated_at();

-- Blocking sessions trigger
CREATE OR REPLACE FUNCTION update_blocking_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blocking_sessions_updated_at ON blocking_sessions;
CREATE TRIGGER blocking_sessions_updated_at
  BEFORE UPDATE ON blocking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_blocking_sessions_updated_at();

-- Blocking lists trigger
CREATE OR REPLACE FUNCTION update_blocking_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blocking_lists_updated_at ON blocking_lists;
CREATE TRIGGER blocking_lists_updated_at
  BEFORE UPDATE ON blocking_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_blocking_lists_updated_at();

-- Scheduled blocks trigger
CREATE OR REPLACE FUNCTION update_scheduled_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scheduled_blocks_updated_at ON scheduled_blocks;
CREATE TRIGGER scheduled_blocks_updated_at
  BEFORE UPDATE ON scheduled_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_blocks_updated_at();

-- ========================================
-- 8. VERIFICATION
-- ========================================

SELECT 'assignments' as table_name, COUNT(*) as row_count FROM assignments
UNION ALL
SELECT 'calendar_activities', COUNT(*) FROM calendar_activities
UNION ALL
SELECT 'study_sessions', COUNT(*) FROM study_sessions
UNION ALL
SELECT 'blocking_sessions', COUNT(*) FROM blocking_sessions
UNION ALL
SELECT 'blocking_lists', COUNT(*) FROM blocking_lists
UNION ALL
SELECT 'scheduled_blocks', COUNT(*) FROM scheduled_blocks;

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('assignments', 'calendar_activities', 'study_sessions', 'blocking_sessions', 'blocking_lists', 'scheduled_blocks')
ORDER BY tablename;

-- ========================================
-- SUCCESS!
-- ========================================
-- All tables created with RLS policies!
-- Fixes:
-- ✅ Homework scanner (assignments)
-- ✅ AI calendar (calendar_activities)
-- ✅ Analytics (study_sessions)
-- ✅ Focus Mode (blocking_sessions, blocking_lists, scheduled_blocks)
-- ========================================
