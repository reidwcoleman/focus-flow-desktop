-- Create blocked_courses table to persist deleted courses across syncs
CREATE TABLE IF NOT EXISTS blocked_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_course_id BIGINT NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, canvas_course_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blocked_courses_user_course
ON blocked_courses(user_id, canvas_course_id);

-- Add RLS policies
ALTER TABLE blocked_courses ENABLE ROW LEVEL SECURITY;

-- Users can only see their own blocked courses
CREATE POLICY "Users can view their own blocked courses"
ON blocked_courses FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own blocked courses
CREATE POLICY "Users can insert their own blocked courses"
ON blocked_courses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own blocked courses
CREATE POLICY "Users can delete their own blocked courses"
ON blocked_courses FOR DELETE
USING (auth.uid() = user_id);

COMMENT ON TABLE blocked_courses IS 'Stores courses that users have deleted/blocked from appearing in synced data';
COMMENT ON COLUMN blocked_courses.canvas_course_id IS 'The Canvas course ID that should be blocked from syncing';
