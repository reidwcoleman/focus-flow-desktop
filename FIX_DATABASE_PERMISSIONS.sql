-- ========================================
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX 403 ERRORS
-- ========================================
-- Dashboard: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/sql
-- ========================================

-- ========================================
-- 1. CREATE ASSIGNMENTS TABLE
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can insert own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can update own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can delete own assignments" ON assignments;

-- Create RLS policies
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
-- 2. CREATE CALENDAR_ACTIVITIES TABLE
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_activities_user_id ON calendar_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_activities_date ON calendar_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_calendar_activities_user_date ON calendar_activities(user_id, activity_date);

-- Enable RLS
ALTER TABLE calendar_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own activities" ON calendar_activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON calendar_activities;
DROP POLICY IF EXISTS "Users can update own activities" ON calendar_activities;
DROP POLICY IF EXISTS "Users can delete own activities" ON calendar_activities;

-- Create RLS policies
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
-- 3. CREATE BLOCKING_SESSIONS TABLE (Focus Mode)
-- ========================================

CREATE TABLE IF NOT EXISTS blocking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_apps TEXT[] NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blocking_sessions_user_id ON blocking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_blocking_sessions_active ON blocking_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_blocking_sessions_end_time ON blocking_sessions(end_time);

-- Enable RLS
ALTER TABLE blocking_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own blocking sessions" ON blocking_sessions;
DROP POLICY IF EXISTS "Users can insert own blocking sessions" ON blocking_sessions;
DROP POLICY IF EXISTS "Users can update own blocking sessions" ON blocking_sessions;
DROP POLICY IF EXISTS "Users can delete own blocking sessions" ON blocking_sessions;

-- Create RLS policies
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
-- 4. CREATE TRIGGERS
-- ========================================

-- Assignments updated_at trigger
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

-- Calendar activities updated_at trigger
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

-- Blocking sessions updated_at trigger
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

-- ========================================
-- 5. VERIFICATION
-- ========================================

-- Run these queries to verify everything worked:

-- Check assignments table
SELECT COUNT(*) as assignment_count FROM assignments;

-- Check calendar_activities table
SELECT COUNT(*) as activity_count FROM calendar_activities;

-- Check blocking_sessions table
SELECT COUNT(*) as blocking_session_count FROM blocking_sessions;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('assignments', 'calendar_activities', 'blocking_sessions');

-- ========================================
-- SUCCESS!
-- ========================================
-- If no errors, all tables are created with proper RLS policies.
-- You can now use:
-- - Homework scanning
-- - AI calendar features
-- - Focus Mode app blocking
-- ========================================
