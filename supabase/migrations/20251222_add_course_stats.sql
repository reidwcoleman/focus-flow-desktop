-- Create course_stats table to track study/focus time per course
CREATE TABLE IF NOT EXISTS course_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  course_code TEXT,
  assignments_completed INTEGER DEFAULT 0,
  focus_sessions INTEGER DEFAULT 0,
  total_focus_minutes INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_name)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_course_stats_user
ON course_stats(user_id);

CREATE INDEX IF NOT EXISTS idx_course_stats_last_activity
ON course_stats(user_id, last_activity_at DESC);

-- Add RLS policies
ALTER TABLE course_stats ENABLE ROW LEVEL SECURITY;

-- Users can only see their own course stats
CREATE POLICY "Users can view their own course stats"
ON course_stats FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own course stats
CREATE POLICY "Users can insert their own course stats"
ON course_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own course stats
CREATE POLICY "Users can update their own course stats"
ON course_stats FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own course stats
CREATE POLICY "Users can delete their own course stats"
ON course_stats FOR DELETE
USING (auth.uid() = user_id);

COMMENT ON TABLE course_stats IS 'Tracks study time and completed assignments per course';
COMMENT ON COLUMN course_stats.assignments_completed IS 'Number of assignments completed for this course';
COMMENT ON COLUMN course_stats.focus_sessions IS 'Number of focus/study sessions for this course';
COMMENT ON COLUMN course_stats.total_focus_minutes IS 'Total minutes spent in focus sessions for this course';
