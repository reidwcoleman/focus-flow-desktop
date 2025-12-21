-- Add groq_api_key field to user_profiles table for AI Vision features
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS groq_api_key TEXT;

-- Add comment
COMMENT ON COLUMN user_profiles.groq_api_key IS 'Groq API key for AI Vision scanning features (homework, notes, flashcards)';
