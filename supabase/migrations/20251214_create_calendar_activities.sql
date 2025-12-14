-- Create calendar_activities table
CREATE TABLE IF NOT EXISTS calendar_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,
  activity_type TEXT DEFAULT 'task', -- task, class, study, break, event, etc.
  subject TEXT,
  location TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_all_day BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_activities_user_id ON calendar_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_activities_date ON calendar_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_calendar_activities_user_date ON calendar_activities(user_id, activity_date);

-- Enable Row Level Security
ALTER TABLE calendar_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_activities
CREATE POLICY "Users can view their own activities"
  ON calendar_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities"
  ON calendar_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities"
  ON calendar_activities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities"
  ON calendar_activities FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_calendar_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_activities_updated_at
  BEFORE UPDATE ON calendar_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_activities_updated_at();
