-- Add lunch number column for NCEdCloud authentication
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS ic_lunch_number TEXT;

COMMENT ON COLUMN user_profiles.ic_lunch_number IS 'Student lunch number for NCEdCloud authentication (Wake County)';
