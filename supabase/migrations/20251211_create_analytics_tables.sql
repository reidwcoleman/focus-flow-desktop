-- Analytics Tables for Real User Stats
-- Run this in Supabase SQL Editor

-- Study sessions tracking table
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

-- RLS Policies
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

-- Function to automatically track study sessions from calendar activities
CREATE OR REPLACE FUNCTION track_study_session_from_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track completed study-type activities
  IF NEW.is_completed = true AND NEW.activity_type = 'study' AND NEW.duration_minutes > 0 THEN
    INSERT INTO study_sessions (
      user_id,
      subject,
      duration_minutes,
      focus_score,
      session_date,
      session_start,
      session_end
    ) VALUES (
      NEW.user_id,
      NEW.subject,
      NEW.duration_minutes,
      85, -- Default focus score
      NEW.activity_date,
      (NEW.activity_date || ' ' || COALESCE(NEW.start_time, '00:00:00'))::TIMESTAMP,
      (NEW.activity_date || ' ' || COALESCE(NEW.end_time, '23:59:59'))::TIMESTAMP
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-track study sessions
DROP TRIGGER IF EXISTS auto_track_study_session ON calendar_activities;
CREATE TRIGGER auto_track_study_session
  AFTER UPDATE OF is_completed ON calendar_activities
  FOR EACH ROW
  EXECUTE FUNCTION track_study_session_from_activity();

-- Done!
