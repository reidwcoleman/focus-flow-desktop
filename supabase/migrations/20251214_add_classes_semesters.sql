-- ========================================
-- Classes & Semesters Migration
-- ========================================
-- Adds class and semester management for academic organization

-- ========================================
-- 1. Create semesters table
-- ========================================

CREATE TABLE IF NOT EXISTS semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  exam_period_start DATE,
  exam_period_end DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster semester queries
CREATE INDEX IF NOT EXISTS idx_semesters_user_id ON semesters(user_id);
CREATE INDEX IF NOT EXISTS idx_semesters_current ON semesters(user_id, is_current) WHERE is_current = TRUE;

-- Enable RLS
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own semesters"
  ON semesters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own semesters"
  ON semesters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own semesters"
  ON semesters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own semesters"
  ON semesters FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 2. Create semester_breaks table
-- ========================================

CREATE TABLE IF NOT EXISTS semester_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster break queries
CREATE INDEX IF NOT EXISTS idx_semester_breaks_semester_id ON semester_breaks(semester_id);

-- Enable RLS
ALTER TABLE semester_breaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view breaks for own semesters"
  ON semester_breaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM semesters
      WHERE semesters.id = semester_breaks.semester_id
      AND semesters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert breaks for own semesters"
  ON semester_breaks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM semesters
      WHERE semesters.id = semester_breaks.semester_id
      AND semesters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update breaks for own semesters"
  ON semester_breaks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM semesters
      WHERE semesters.id = semester_breaks.semester_id
      AND semesters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete breaks for own semesters"
  ON semester_breaks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM semesters
      WHERE semesters.id = semester_breaks.semester_id
      AND semesters.user_id = auth.uid()
    )
  );

-- ========================================
-- 3. Create classes table
-- ========================================

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  teacher_name TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  room TEXT,
  current_grade DECIMAL(5,2),
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster class queries
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_semester_id ON classes(semester_id);
CREATE INDEX IF NOT EXISTS idx_classes_archived ON classes(user_id, is_archived) WHERE is_archived = FALSE;

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own classes"
  ON classes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own classes"
  ON classes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own classes"
  ON classes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own classes"
  ON classes FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 4. Create class_schedule table
-- ========================================

CREATE TABLE IF NOT EXISTS class_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster schedule queries
CREATE INDEX IF NOT EXISTS idx_class_schedule_class_id ON class_schedule(class_id);
CREATE INDEX IF NOT EXISTS idx_class_schedule_day ON class_schedule(day_of_week);

-- Enable RLS
ALTER TABLE class_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view schedule for own classes"
  ON class_schedule FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_schedule.class_id
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert schedule for own classes"
  ON class_schedule FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_schedule.class_id
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update schedule for own classes"
  ON class_schedule FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_schedule.class_id
      AND classes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete schedule for own classes"
  ON class_schedule FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_schedule.class_id
      AND classes.user_id = auth.uid()
    )
  );

-- ========================================
-- 5. Add class_id to assignments table
-- ========================================

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- Index for class-based assignment queries
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);

-- ========================================
-- 6. Create calendar_connections table
-- ========================================

CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'outlook')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  calendar_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: one active connection per provider per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_connections_unique
ON calendar_connections(user_id, provider) WHERE is_active = TRUE;

-- Index for faster calendar queries
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON calendar_connections(user_id);

-- Enable RLS
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own calendar connections"
  ON calendar_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar connections"
  ON calendar_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar connections"
  ON calendar_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar connections"
  ON calendar_connections FOR DELETE
  USING (auth.uid() = user_id);
