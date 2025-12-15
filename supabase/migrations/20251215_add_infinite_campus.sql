-- ========================================
-- Infinite Campus Integration Migration
-- Add Infinite Campus OneRoster API credentials and grades table
-- ========================================

-- Add Infinite Campus credentials to user_profiles (Simple login method)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS ic_district_name TEXT,
ADD COLUMN IF NOT EXISTS ic_state TEXT,
ADD COLUMN IF NOT EXISTS ic_username TEXT,
ADD COLUMN IF NOT EXISTS ic_password TEXT;

-- Create Infinite Campus grades table
CREATE TABLE IF NOT EXISTS infinite_campus_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Grade source
  source TEXT DEFAULT 'infinite_campus',

  -- Class information
  class_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  class_code TEXT,

  -- Grade data
  current_score NUMERIC(5,2),
  letter_grade TEXT,

  -- Metadata
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(user_id, class_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_infinite_campus_grades_user_id ON infinite_campus_grades(user_id);
CREATE INDEX IF NOT EXISTS idx_infinite_campus_grades_class_id ON infinite_campus_grades(class_id);

-- Enable Row Level Security
ALTER TABLE infinite_campus_grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Users can view their own grades
CREATE POLICY "Users can view their own Infinite Campus grades"
  ON infinite_campus_grades
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own grades
CREATE POLICY "Users can insert their own Infinite Campus grades"
  ON infinite_campus_grades
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own grades
CREATE POLICY "Users can update their own Infinite Campus grades"
  ON infinite_campus_grades
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own grades
CREATE POLICY "Users can delete their own Infinite Campus grades"
  ON infinite_campus_grades
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_infinite_campus_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_infinite_campus_grades_updated_at
  BEFORE UPDATE ON infinite_campus_grades
  FOR EACH ROW
  EXECUTE FUNCTION update_infinite_campus_grades_updated_at();

COMMENT ON TABLE infinite_campus_grades IS 'Stores course grades synced from Infinite Campus student portal';
COMMENT ON COLUMN user_profiles.ic_district_name IS 'Infinite Campus district name (e.g., "Wake County")';
COMMENT ON COLUMN user_profiles.ic_state IS 'State abbreviation (e.g., "NC")';
COMMENT ON COLUMN user_profiles.ic_username IS 'Student portal username';
COMMENT ON COLUMN user_profiles.ic_password IS 'Student portal password (encrypted at rest)';
