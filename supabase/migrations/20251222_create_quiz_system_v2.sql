-- ============================================================================
-- QUIZ SYSTEM MIGRATION - Study Tab Enhancement (FIXED)
-- Created: 2025-12-22
-- ============================================================================

-- ============================================================================
-- CREATE NEW TABLES
-- ============================================================================

-- QUIZZES TABLE (Main quiz container)
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL DEFAULT 'General',
  source_file_id UUID,
  question_count INTEGER DEFAULT 0,
  best_score DECIMAL(5,2),
  is_favorite BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QUIZ QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QUIZ ATTEMPTS TABLE (Track user quiz performance)
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  answers JSONB DEFAULT '{}',
  time_spent_seconds INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- FILE UPLOADS TABLE (Track uploaded study files)
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt', 'image')),
  file_size_bytes INTEGER,
  extracted_text TEXT,
  detected_subject TEXT,
  processing_status TEXT DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Quizzes indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject);
CREATE INDEX IF NOT EXISTS idx_quizzes_updated_at ON quizzes(updated_at DESC);

-- Quiz questions indexes
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_user_id ON quiz_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(quiz_id, order_index);

-- Quiz attempts indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed ON quiz_attempts(completed_at DESC);

-- File uploads indexes
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_type ON file_uploads(file_type);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can insert own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can update own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can delete own quizzes" ON quizzes;

DROP POLICY IF EXISTS "Users can view own quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Users can insert own quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Users can update own quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Users can delete own quiz questions" ON quiz_questions;

DROP POLICY IF EXISTS "Users can view own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can update own quiz attempts" ON quiz_attempts;

DROP POLICY IF EXISTS "Users can view own file uploads" ON file_uploads;
DROP POLICY IF EXISTS "Users can insert own file uploads" ON file_uploads;
DROP POLICY IF EXISTS "Users can update own file uploads" ON file_uploads;
DROP POLICY IF EXISTS "Users can delete own file uploads" ON file_uploads;

-- Quizzes policies
CREATE POLICY "Users can view own quizzes"
  ON quizzes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quizzes"
  ON quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quizzes"
  ON quizzes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quizzes"
  ON quizzes FOR DELETE USING (auth.uid() = user_id);

-- Quiz questions policies
CREATE POLICY "Users can view own quiz questions"
  ON quiz_questions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz questions"
  ON quiz_questions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz questions"
  ON quiz_questions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quiz questions"
  ON quiz_questions FOR DELETE USING (auth.uid() = user_id);

-- Quiz attempts policies
CREATE POLICY "Users can view own quiz attempts"
  ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz attempts"
  ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz attempts"
  ON quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

-- File uploads policies
CREATE POLICY "Users can view own file uploads"
  ON file_uploads FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own file uploads"
  ON file_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own file uploads"
  ON file_uploads FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own file uploads"
  ON file_uploads FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- ADD FTS COLUMNS TO EXISTING TABLES (Safe - checks if exists first)
-- ============================================================================

-- Helper function to add column if it doesn't exist
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
  table_name TEXT,
  column_name TEXT,
  column_definition TEXT
)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = add_column_if_not_exists.table_name
      AND column_name = add_column_if_not_exists.column_name
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', table_name, column_name, column_definition);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add search_vector columns (generated columns require special handling)
DO $$
BEGIN
  -- Notes table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notes' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE notes ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(subject, '')), 'C')
    ) STORED;
  END IF;

  -- Decks table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'decks' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE decks ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(subject, '')), 'C')
    ) STORED;
  END IF;

  -- Flashcards table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flashcards' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE flashcards ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(front, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(back, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(hint, '')), 'C')
    ) STORED;
  END IF;

  -- Quizzes table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quizzes' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(subject, '')), 'C')
    ) STORED;
  END IF;
END $$;

-- Create FTS indexes
CREATE INDEX IF NOT EXISTS idx_notes_search ON notes USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_decks_search ON decks USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_flashcards_search ON flashcards USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_quizzes_search ON quizzes USING GIN(search_vector);

-- ============================================================================
-- TRIGGER TO AUTO-UPDATE QUIZ STATISTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_quiz_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update quiz statistics when an attempt is completed
  UPDATE quizzes SET
    best_score = GREATEST(
      COALESCE(best_score, 0),
      (NEW.score::DECIMAL / NEW.total_questions * 100)
    ),
    updated_at = NOW()
  WHERE id = NEW.quiz_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quiz_stats ON quiz_attempts;

CREATE TRIGGER trigger_update_quiz_stats
AFTER INSERT ON quiz_attempts
FOR EACH ROW EXECUTE FUNCTION update_quiz_stats();

-- Clean up helper function
DROP FUNCTION IF EXISTS add_column_if_not_exists(TEXT, TEXT, TEXT);

-- ============================================================================
-- DONE!
-- Your quiz system is now ready!
-- ============================================================================
