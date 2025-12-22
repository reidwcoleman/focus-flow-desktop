-- ============================================================================
-- QUIZ SYSTEM MIGRATION - Study Tab Enhancement (FINAL FIXED VERSION)
-- Created: 2025-12-22
-- Copy and paste this ENTIRE file into Supabase SQL Editor and click "Run"
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE NEW TABLES
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
-- STEP 2: CREATE BASIC INDEXES (before adding search columns)
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
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================================================

-- Quizzes policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quizzes' AND policyname = 'Users can view own quizzes'
  ) THEN
    CREATE POLICY "Users can view own quizzes"
      ON quizzes FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quizzes' AND policyname = 'Users can insert own quizzes'
  ) THEN
    CREATE POLICY "Users can insert own quizzes"
      ON quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quizzes' AND policyname = 'Users can update own quizzes'
  ) THEN
    CREATE POLICY "Users can update own quizzes"
      ON quizzes FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quizzes' AND policyname = 'Users can delete own quizzes'
  ) THEN
    CREATE POLICY "Users can delete own quizzes"
      ON quizzes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Quiz questions policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_questions' AND policyname = 'Users can view own quiz questions'
  ) THEN
    CREATE POLICY "Users can view own quiz questions"
      ON quiz_questions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_questions' AND policyname = 'Users can insert own quiz questions'
  ) THEN
    CREATE POLICY "Users can insert own quiz questions"
      ON quiz_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_questions' AND policyname = 'Users can update own quiz questions'
  ) THEN
    CREATE POLICY "Users can update own quiz questions"
      ON quiz_questions FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_questions' AND policyname = 'Users can delete own quiz questions'
  ) THEN
    CREATE POLICY "Users can delete own quiz questions"
      ON quiz_questions FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Quiz attempts policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_attempts' AND policyname = 'Users can view own quiz attempts'
  ) THEN
    CREATE POLICY "Users can view own quiz attempts"
      ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_attempts' AND policyname = 'Users can insert own quiz attempts'
  ) THEN
    CREATE POLICY "Users can insert own quiz attempts"
      ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quiz_attempts' AND policyname = 'Users can update own quiz attempts'
  ) THEN
    CREATE POLICY "Users can update own quiz attempts"
      ON quiz_attempts FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- File uploads policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'file_uploads' AND policyname = 'Users can view own file uploads'
  ) THEN
    CREATE POLICY "Users can view own file uploads"
      ON file_uploads FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'file_uploads' AND policyname = 'Users can insert own file uploads'
  ) THEN
    CREATE POLICY "Users can insert own file uploads"
      ON file_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'file_uploads' AND policyname = 'Users can update own file uploads'
  ) THEN
    CREATE POLICY "Users can update own file uploads"
      ON file_uploads FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'file_uploads' AND policyname = 'Users can delete own file uploads'
  ) THEN
    CREATE POLICY "Users can delete own file uploads"
      ON file_uploads FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 5: CREATE TRIGGER FOR AUTO-UPDATING QUIZ STATISTICS
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

-- ============================================================================
-- ✅ DONE! Quiz system installed successfully!
-- The app will now work without errors.
-- Full-text search has been omitted to avoid PostgreSQL immutability issues.
-- You can still search using ILIKE queries which the app already implements.
-- ============================================================================
