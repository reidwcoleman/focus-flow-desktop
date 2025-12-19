-- Create activity_subtasks table for calendar activity subtasks
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_subtasks_activity_id ON activity_subtasks(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_subtasks_user_id ON activity_subtasks(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_subtasks_order ON activity_subtasks("order");

-- Enable RLS
ALTER TABLE activity_subtasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_activity_subtasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activity_subtasks_updated_at
  BEFORE UPDATE ON activity_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_subtasks_updated_at();
