-- ========================================
-- Subtasks Table Migration
-- Create subtasks table for AI task breakdown feature
-- ========================================

-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subtask details
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,

  -- AI generation metadata
  generated_by_ai BOOLEAN DEFAULT FALSE,
  ai_confidence REAL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Indexes for performance
  CONSTRAINT subtasks_order_check CHECK (order_index >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subtasks_assignment_id ON subtasks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_user_id ON subtasks(user_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_completed ON subtasks(completed);
CREATE INDEX IF NOT EXISTS idx_subtasks_order ON subtasks(assignment_id, order_index);

-- Enable Row Level Security
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Users can view their own subtasks
CREATE POLICY "Users can view their own subtasks"
  ON subtasks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own subtasks
CREATE POLICY "Users can insert their own subtasks"
  ON subtasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own subtasks
CREATE POLICY "Users can update their own subtasks"
  ON subtasks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own subtasks
CREATE POLICY "Users can delete their own subtasks"
  ON subtasks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subtasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Set completed_at when marked as completed
  IF NEW.completed = TRUE AND OLD.completed = FALSE THEN
    NEW.completed_at = NOW();
  END IF;

  -- Clear completed_at when unchecked
  IF NEW.completed = FALSE AND OLD.completed = TRUE THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_subtasks_updated_at
  BEFORE UPDATE ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_subtasks_updated_at();

-- Add computed column to assignments for subtask progress
-- This will be calculated dynamically in the service layer
COMMENT ON TABLE subtasks IS 'Subtasks for breaking down assignments into smaller actionable items. Supports AI-generated breakdown.';
