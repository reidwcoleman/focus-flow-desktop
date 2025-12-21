-- Fix assignments table to support Canvas sync with proper unique constraint
-- Drop existing constraint if it exists
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_user_id_canvas_assignment_id_key;

-- Add unique constraint on (user_id, canvas_assignment_id)
-- This allows upsert to work properly when syncing from Canvas
ALTER TABLE assignments
ADD CONSTRAINT assignments_user_id_canvas_assignment_id_key
UNIQUE (user_id, canvas_assignment_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_assignments_canvas_sync
ON assignments(user_id, canvas_assignment_id)
WHERE canvas_assignment_id IS NOT NULL;
