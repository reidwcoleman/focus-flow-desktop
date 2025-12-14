-- ========================================
-- Fix Database Errors - Run in Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/sql
-- ========================================

-- 1. Create increment RPC function (fixes 404 error)
CREATE OR REPLACE FUNCTION increment(
  table_name text,
  row_id uuid,
  column_name text,
  increment_by int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    table_name, column_name, column_name
  )
  USING increment_by, row_id;
END;
$$;

-- 2. Ensure blocking_sessions table has correct schema
-- Drop and recreate if needed
DROP TABLE IF EXISTS blocking_sessions CASCADE;

CREATE TABLE blocking_sessions (
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

-- 3. Grant execute permission on increment function
GRANT EXECUTE ON FUNCTION increment(text, uuid, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION increment(text, uuid, text, int) TO anon;

-- Done! Run this entire script in your Supabase SQL Editor
