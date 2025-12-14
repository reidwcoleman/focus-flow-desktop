# Deploy Assignments Table to Supabase

## Run This SQL in Supabase Dashboard

1. **Go to:** https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/sql
2. **Copy and paste the entire SQL below into the editor**
3. **Click "Run"**

```sql
-- ========================================
-- Assignments Table
-- ========================================
-- Stores user assignments with AI capture support

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  due_date DATE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  ai_captured BOOLEAN DEFAULT FALSE,
  time_estimate TEXT,
  description TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'scanner', 'canvas')),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- ========================================
-- Row Level Security (RLS) Policies
-- ========================================

-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own assignments
CREATE POLICY "Users can view own assignments"
  ON assignments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own assignments
CREATE POLICY "Users can insert own assignments"
  ON assignments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own assignments
CREATE POLICY "Users can update own assignments"
  ON assignments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own assignments
CREATE POLICY "Users can delete own assignments"
  ON assignments
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- Updated At Trigger
-- ========================================

CREATE OR REPLACE FUNCTION update_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignments_updated_at();
```

## Done!

After running this migration:
- ✅ Assignments will save to Supabase
- ✅ Manual creation works (green "Add" button)
- ✅ Scanner creation works (scan homework)
- ✅ User-specific assignments only (RLS enabled)
