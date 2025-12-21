-- ============================================================================
-- RUN THIS SQL IN YOUR SUPABASE SQL EDITOR TO FIX CANVAS SYNC
-- This fixes the 400 errors when syncing Canvas assignments
-- ============================================================================

-- Step 1: Drop existing constraint if it exists
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_user_id_canvas_assignment_id_key;

-- Step 2: Add unique constraint on (user_id, canvas_assignment_id)
-- This allows upsert to work properly when syncing from Canvas
ALTER TABLE assignments
ADD CONSTRAINT assignments_user_id_canvas_assignment_id_key
UNIQUE (user_id, canvas_assignment_id);

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_assignments_canvas_sync
ON assignments(user_id, canvas_assignment_id)
WHERE canvas_assignment_id IS NOT NULL;

-- Step 4: Add course_code to course_grades if not exists
ALTER TABLE course_grades
ADD COLUMN IF NOT EXISTS course_code TEXT;

-- ============================================================================
-- DONE! After running this, go back to the app and click "Sync to App" again
-- Your Canvas assignments should now sync properly!
-- ============================================================================
