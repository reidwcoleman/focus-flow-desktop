-- ========================================
-- FOCUS MODE - COMPLETE DATABASE SCHEMA
-- ========================================
-- Dashboard: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/sql
-- ========================================

-- ========================================
-- 1. BLOCKING_SESSIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS blocking_sessions (
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
-- 2. BLOCKING_LISTS TABLE (App Presets)
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

-- ========================================
-- 3. SCHEDULED_BLOCKS TABLE (Recurring)
-- ========================================

CREATE TABLE IF NOT EXISTS scheduled_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocking_list_id UUID REFERENCES blocking_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'daily', 'weekly')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[], -- 0=Sunday, 1=Monday, etc. NULL for daily/once
  start_date DATE, -- For 'once' type
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
-- 4. TRIGGERS
-- ========================================

-- Blocking sessions updated_at
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

-- Blocking lists updated_at
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

-- Scheduled blocks updated_at
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
-- 5. DEFAULT BLOCKING LISTS (Optional)
-- ========================================

-- Insert default lists for new users (run this manually or via trigger)
-- Example:
-- INSERT INTO blocking_lists (user_id, name, description, app_ids, icon, is_default)
-- VALUES
--   (auth.uid(), 'Social Media', 'Block all social media apps', ARRAY['instagram', 'tiktok', 'snapchat', 'twitter', 'facebook'], '📱', true),
--   (auth.uid(), 'Deep Work', 'Maximum focus mode', ARRAY['instagram', 'tiktok', 'youtube', 'netflix', 'games'], '🚀', true);

-- ========================================
-- 6. VERIFICATION
-- ========================================

SELECT COUNT(*) as blocking_sessions_count FROM blocking_sessions;
SELECT COUNT(*) as blocking_lists_count FROM blocking_lists;
SELECT COUNT(*) as scheduled_blocks_count FROM scheduled_blocks;

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('blocking_sessions', 'blocking_lists', 'scheduled_blocks');

-- ========================================
-- SUCCESS!
-- ========================================
-- All Focus Mode tables created with RLS policies
-- Ready for:
-- - One-time blocking sessions
-- - Reusable blocking lists
-- - Recurring scheduled blocks (daily/weekly)
-- ========================================
