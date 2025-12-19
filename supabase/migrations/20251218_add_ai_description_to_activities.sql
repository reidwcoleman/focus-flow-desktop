-- Add ai_description column to calendar_activities table
ALTER TABLE calendar_activities
ADD COLUMN IF NOT EXISTS ai_description TEXT;

-- Add ai_generated flag if it doesn't exist
ALTER TABLE calendar_activities
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;
