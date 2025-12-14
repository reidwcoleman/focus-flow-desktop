-- ========================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- ========================================
-- Dashboard: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/sql
-- ========================================

-- STEP 1: Create user profiles table and functions
-- Copy entire migration file: supabase/migrations/20251210_add_user_profiles_and_ai_usage.sql

-- STEP 2: After migration runs, set reidwcoleman@gmail.com as PRO
-- Run this query:

UPDATE user_profiles
SET
  is_pro = TRUE,
  pro_expires_at = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE email = 'reidwcoleman@gmail.com';

-- STEP 3: Verify pro status
-- Run this to confirm:

SELECT
  email,
  is_pro,
  ai_chats_used_this_month,
  ai_chats_reset_date,
  pro_expires_at,
  created_at
FROM user_profiles
WHERE email = 'reidwcoleman@gmail.com';

-- ========================================
-- EXPECTED RESULT:
-- email: reidwcoleman@gmail.com
-- is_pro: true
-- ai_chats_used_this_month: 0 (or current usage)
-- pro_expires_at: (1 year from now)
-- ========================================

-- TROUBLESHOOTING:
-- If user_profiles row doesn't exist yet, sign in to the app first!
-- The migration will auto-create a profile when you sign in.
-- Then run the UPDATE query above.
