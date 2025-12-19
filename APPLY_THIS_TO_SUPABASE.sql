-- ============================================================================
-- RUN THIS SQL IN YOUR SUPABASE SQL EDITOR
-- This will enable subtasks and AI descriptions for calendar activities
-- ============================================================================

-- Step 1: Add ai_description and ai_generated columns to calendar_activities
ALTER TABLE calendar_activities
ADD COLUMN IF NOT EXISTS ai_description TEXT;

ALTER TABLE calendar_activities
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;

-- Step 2: Create activity_subtasks table
CREATE TABLE IF NOT EXISTS activity_subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES calendar_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_subtasks_activity_id ON activity_subtasks(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_subtasks_user_id ON activity_subtasks(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_subtasks_order ON activity_subtasks("order");

-- Step 4: Enable Row Level Security
ALTER TABLE activity_subtasks ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies
CREATE POLICY "Users can view their own activity subtasks"
  ON activity_subtasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity subtasks"
  ON activity_subtasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity subtasks"
  ON activity_subtasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity subtasks"
  ON activity_subtasks FOR DELETE
  USING (auth.uid() = user_id);

-- Step 6: Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_activity_subtasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger
DROP TRIGGER IF EXISTS update_activity_subtasks_updated_at ON activity_subtasks;
CREATE TRIGGER update_activity_subtasks_updated_at
  BEFORE UPDATE ON activity_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_subtasks_updated_at();

-- ============================================================================
-- DONE! After running this, refresh your app and try creating an activity
-- ============================================================================
