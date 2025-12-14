-- ========================================
-- Canvas Persistence Migration
-- ========================================
-- Adds Canvas-specific columns and tables for full data persistence
-- Prevents duplicate assignments and enables grade tracking

-- ========================================
-- 1. Add Canvas columns to assignments table
-- ========================================

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS canvas_assignment_id BIGINT;

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS canvas_course_id BIGINT;

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS points_possible DECIMAL(10,2);

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS submitted BOOLEAN DEFAULT FALSE;

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS grade_received TEXT;

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS score_received DECIMAL(5,2);

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS canvas_url TEXT;

-- Create unique index for Canvas deduplication (user + canvas_assignment_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_canvas_unique
ON assignments(user_id, canvas_assignment_id)
WHERE canvas_assignment_id IS NOT NULL;

-- Index for faster Canvas assignment lookups
CREATE INDEX IF NOT EXISTS idx_assignments_canvas_id
ON assignments(canvas_assignment_id)
WHERE canvas_assignment_id IS NOT NULL;

-- Index for Canvas course filtering
CREATE INDEX IF NOT EXISTS idx_assignments_canvas_course
ON assignments(canvas_course_id)
WHERE canvas_course_id IS NOT NULL;

-- ========================================
-- 2. Create canvas_courses table
-- ========================================

CREATE TABLE IF NOT EXISTS canvas_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_course_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  course_code TEXT,
  term_name TEXT,
  enrollment_type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: one course per user per canvas_course_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_canvas_courses_unique
ON canvas_courses(user_id, canvas_course_id);

CREATE INDEX IF NOT EXISTS idx_canvas_courses_user_id
ON canvas_courses(user_id);

-- Enable RLS
ALTER TABLE canvas_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own canvas courses"
  ON canvas_courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own canvas courses"
  ON canvas_courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own canvas courses"
  ON canvas_courses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own canvas courses"
  ON canvas_courses FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 3. Create course_grades table
-- ========================================

CREATE TABLE IF NOT EXISTS course_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_course_id BIGINT NOT NULL,
  course_name TEXT NOT NULL,
  current_grade TEXT,          -- Letter grade (A, B+, etc.)
  current_score DECIMAL(5,2),  -- Numeric percentage (95.50)
  final_grade TEXT,
  final_score DECIMAL(5,2),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: one grade record per user per course
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_grades_unique
ON course_grades(user_id, canvas_course_id);

CREATE INDEX IF NOT EXISTS idx_course_grades_user_id
ON course_grades(user_id);

-- Enable RLS
ALTER TABLE course_grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own course grades"
  ON course_grades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own course grades"
  ON course_grades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own course grades"
  ON course_grades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own course grades"
  ON course_grades FOR DELETE
  USING (auth.uid() = user_id);
